import net from 'node:net'
import http from 'node:http'
import dgram from 'node:dgram'
import { randomUUID, randomInt } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { digest } from './services.js'

export function capabilities(endpoints, directory) {
  const sockets = new Map(), files = {}, log = []
  let calls = 0, nextId = 1, logSize = 0
  function record(op, args, response) {
    const compact = value => typeof value === 'string' && value.length > 1024
      ? { bytes: Buffer.byteLength(value), sha256: digest(value), preview: value.slice(0,80) } : value
    const entry = { at: new Date().toISOString(), op, args: args.map(compact), response: compact(response) }
    const size = JSON.stringify(entry).length
    if (logSize + size > 100000) throw new Error('Network log limit exceeded')
    logSize += size; log.push(entry)
  }
  function text(value, max = 1024) {
    if (typeof value !== 'string' || value.length > max) throw new Error('Invalid string argument')
    return value
  }
  function httpGet(address, path, method, timeout = 800) {
    return new Promise(resolve => {
      const start = performance.now()
      const finish = data => resolve({ ...data, latencyMs: Math.round((performance.now() - start) * 100) / 100 })
      const req = http.request({ host: address, port: endpoints.http, path, method, agent: false }, res => {
        let body = ''
        res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; if (body.length > 32768) req.destroy(new Error('Oversized response')) })
        res.on('end', () => finish({ status: res.statusCode, body }))
      })
      const timer = setTimeout(() => req.destroy(new Error('TIMEOUT')), timeout)
      req.on('close', () => clearTimeout(timer))
      req.on('error', e => finish({ status: 0, body: '', error: e.message }))
      req.end()
    })
  }
  async function call(op, args) {
    if (++calls > 60) throw new Error('Network operation limit exceeded')
    let response
    if (op === 'tcp.connect') {
      const service = text(args[0])
      if (!['chat','file','search','offline'].includes(service)) throw new Error('Unknown TCP service')
      const socket = net.createConnection({ host: '127.0.0.1', port: endpoints[service] })
      const id = nextId++; let buffer = ''
      const state = { socket, lines: [], waiting: null, closed: false }
      socket.setEncoding('utf8'); socket.setTimeout(3000, () => socket.destroy(new Error('TIMEOUT')))
      socket.on('data', chunk => {
        buffer += chunk
        if (buffer.length > 65536) return socket.destroy(new Error('Oversized stream'))
        let end
        while ((end = buffer.indexOf('\n')) !== -1) {
          state.lines.push(buffer.slice(0,end).replace(/\r$/, '')); buffer = buffer.slice(end+1)
        }
        if (state.waiting && state.lines.length) { state.waiting(state.lines.shift()); state.waiting = null }
      })
      socket.on('close', () => { state.closed = true; if (state.waiting) { state.waiting(null); state.waiting = null } })
      socket.on('error', () => {})
      try {
        await new Promise((resolve,reject) => { socket.once('connect',resolve); socket.once('error',reject) })
        sockets.set(id,state); response = id
      } catch (e) { record(op,args,{error:e.code || e.message}); throw new Error('Connection failed: ' + (e.code || e.message)) }
    } else if (op.startsWith('tcp.')) {
      const state = sockets.get(args[0])
      if (!state) throw new Error('Unknown socket')
      if (op === 'tcp.send') {
        const line = text(args[1])
        if (/[\r\n]/.test(line) || state.closed) throw new Error('Invalid line or disconnected socket')
        state.socket.write(line + '\n'); response = true
      } else if (op === 'tcp.read') {
        response = state.lines.length ? state.lines.shift() : state.closed ? null :
          await new Promise(resolve => { state.waiting = resolve })
      } else if (op === 'tcp.close') { state.socket.end(); response = true }
      else throw new Error('Unknown TCP operation')
    } else if (op === 'udp.exchange') {
      const updates = args[0]
      if (!Array.isArray(updates) || updates.length < 1 || updates.length > 12 ||
          updates.some(u => !u || typeof u.player !== 'string' || u.player.length > 32 || ![u.x,u.y,u.seq].every(Number.isFinite)))
        throw new Error('Invalid telemetry updates')
      response = await new Promise((resolve,reject) => {
        const client = dgram.createSocket('udp4'), received = [], room = randomUUID()
        let idle
        const finish = () => { clearTimeout(timer); clearTimeout(idle); client.close(); resolve(received) }
        const timer = setTimeout(finish,1500)
        client.on('error', e => { clearTimeout(timer); clearTimeout(idle); client.close(); reject(e) })
        client.on('message', data => {
          if (received.length < 200) received.push(JSON.parse(data.toString()))
          clearTimeout(idle); idle = setTimeout(finish,100)
        })
        client.bind(0,'127.0.0.1',() => {
          for (const u of updates) client.send(Buffer.from(JSON.stringify({...u,room})),endpoints.udp,'127.0.0.1')
          // Re-send an earlier datagram to exercise sequence filtering over the actual UDP socket.
          const first = updates[0]
          client.send(Buffer.from(JSON.stringify({...first,seq:Math.max(0,first.seq-1),x:-99,y:-99,room})),endpoints.udp,'127.0.0.1')
        })
      })
    } else if (op === 'http.request') {
      const path = text(args[0]), method = text(args[1] || 'GET')
      if (!/^\/[A-Za-z0-9/_-]*$/.test(path) || !['GET','POST'].includes(method)) throw new Error('Invalid HTTP request')
      response = await httpGet('127.0.0.1',path,method)
    } else if (op === 'http.probe') {
      const name = text(args[0])
      if (!['lab','file','database','web','slow','portal','resolved'].includes(name)) throw new Error('Unknown monitored endpoint')
      if (name === 'database') {
        const start = performance.now()
        response = await new Promise(resolve => {
          const socket = net.createConnection({host:'127.0.0.1',port:endpoints.offline})
          const finish = reason => { socket.destroy(); resolve({status:0,error:reason,latencyMs:Math.round(performance.now()-start)}) }
          socket.setTimeout(200,() => finish('TIMEOUT')); socket.once('error',e => finish(e.code)); socket.once('connect',() => finish('Unexpected service'))
        })
      } else response = await httpGet(name === 'resolved' ? '127.0.0.2' : '127.0.0.1',
        ['portal','resolved'].includes(name) ? '/portal' : '/probe/' + name,'GET',200)
    } else if (op === 'dns.lookup') {
      const name = text(args[0])
      if (!/^[a-z0-9.-]{1,100}$/.test(name)) throw new Error('Invalid DNS name')
      response = await new Promise((resolve,reject) => {
        const client = dgram.createSocket('udp4'), id = randomInt(1,65535)
        const header = Buffer.alloc(12); header.writeUInt16BE(id,0); header.writeUInt16BE(0x0100,2); header.writeUInt16BE(1,4)
        const parts = name.split('.').flatMap(label => [Buffer.from([label.length]),Buffer.from(label)])
        const query = Buffer.concat([header,...parts,Buffer.from([0,0,1,0,1])])
        let timer, attempts=0
        const send = () => {
          if (++attempts>3) { client.close(); reject(new Error('DNS timeout')); return }
          client.send(query,endpoints.dns,'127.0.0.1')
          timer=setTimeout(send,1000)
        }
        client.on('error',e => {clearTimeout(timer); client.close(); reject(e)})
        client.on('message',packet => {
          if (packet.length < 12 || packet.readUInt16BE(0) !== id) return
          clearTimeout(timer); client.close()
          resolve({name,address:packet.readUInt16BE(6) ? [...packet.subarray(-4)].join('.') : null,rcode:packet.readUInt16BE(2)&15})
        })
        client.bind(0,'127.0.0.1',send)
      })
    } else if (op === 'save') {
      const name = text(args[0],64), content = text(args[1],32768)
      if (!directory || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name) || name.endsWith('.') ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) || Object.keys(files).length >= 5)
        throw new Error('Invalid sandbox filename or storage limit')
      const target=join(directory,name)
      await writeFile(target,content,'utf8')
      files[name] = await readFile(target,'utf8'); response = true
    } else if (op === 'sha256') response = digest(text(args[0],32768))
    else if (op === 'decodeBase64') response = Buffer.from(text(args[0],32768),'base64').toString('utf8')
    else throw new Error('Unknown capability')
    record(op,args,response)
    return response
  }
  return {call,log,files, close() {for (const s of sockets.values()) s.socket.destroy()} }
}
