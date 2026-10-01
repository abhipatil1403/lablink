import net from 'node:net'
import http from 'node:http'
import dgram from 'node:dgram'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

export const digest = text => createHash('sha256').update(text).digest('hex')
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => resolve(server.address().port))
})
const bind = socket => new Promise((resolve, reject) => {
  socket.once('error', reject)
  socket.bind(0, '127.0.0.1', () => resolve(socket.address().port))
})

/** Real loopback services. Only their fixed capabilities are exposed to student programs. */
export async function startServices() {
  const documents = Object.fromEntries(await Promise.all(['welcome.txt', 'networks.txt'].map(async name =>
    [name, await readFile(new URL('../fixtures/' + name, import.meta.url), 'utf8')])))
  const live = new Set()
  function lineServer(handler) {
    return net.createServer(socket => {
      live.add(socket)
      socket.on('close', () => live.delete(socket))
      socket.on('error', () => {})
      socket.setTimeout(8000, () => socket.destroy())
      socket.setEncoding('utf8')
      let buffer = ''; const state = {}
      socket.on('data', chunk => {
        buffer += chunk
        if (buffer.length > 65536) return socket.destroy()
        let end
        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, end).replace(/\r$/, '')
          buffer = buffer.slice(end + 1)
          handler(line, socket, state)
        }
      })
    })
  }
  const chat = lineServer((line, socket, state) => {
    if (!state.user) {
      if (!/^USER [A-Za-z0-9_-]{1,32}$/.test(line)) return socket.end('ERROR USER_REQUIRED\n')
      state.user = line.slice(5); socket.write('WELCOME ' + state.user + '\n')
    } else if (line === 'QUIT') socket.end('BYE\n')
    else if (line.startsWith('MSG ') && line.length <= 1024) socket.write('MESSAGE RECEIVED ' + line.slice(4) + '\n')
    else socket.write('ERROR INVALID_COMMAND\n')
  })
  const file = lineServer((line, socket) => {
    const name = line.startsWith('GET ') ? line.slice(4) : ''
    const interrupted = name === 'interrupted.txt'
    const content = interrupted ? documents['networks.txt'] : documents[name]
    if (content === undefined) return socket.end('ERROR NOT_FOUND\n')
    socket.write(JSON.stringify({ name, bytes: Buffer.byteLength(content), sha256: digest(content) }) + '\n')
    const data = Buffer.from(content)
    const limit = interrupted ? Math.floor(data.length / 2) : data.length
    for (let offset = 0; offset < limit; offset += 512) socket.write('DATA ' + data.subarray(offset, Math.min(offset + 512, limit)).toString('base64') + '\n')
    socket.end(interrupted ? '' : 'END\n')
  })
  const search = lineServer((line, socket) => {
    if (line.startsWith('SEARCH ')) {
      const query = line.slice(7).toLowerCase()
      socket.write(JSON.stringify(Object.keys(documents).filter(name => name.toLowerCase().includes(query))) + '\n')
    } else if (line.startsWith('GET ')) {
      const name = line.slice(4), content = documents[name]
      socket.write(JSON.stringify(content === undefined ? { error: 'NOT_FOUND' } : { name, content, sha256: digest(content) }) + '\n')
    } else socket.write(JSON.stringify({ error: 'INVALID_QUERY' }) + '\n')
  })
  const web = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json')
    if (request.method !== 'GET') response.writeHead(405).end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }))
    else if (request.url === '/students/42') response.end(JSON.stringify({ name: 'Asha Patil', rollNumber: 'CNT042', department: 'Computer Engineering', attendance: 91 }))
    else if (request.url === '/failure') response.writeHead(503).end(JSON.stringify({ error: 'SERVICE_UNAVAILABLE' }))
    else if (request.url === '/probe/slow') setTimeout(() => { if (!response.destroyed) response.end('{"status":"ONLINE"}') }, 600).unref()
    else if (['/probe/lab','/probe/file','/probe/web','/portal'].includes(request.url)) response.end('{"status":"ONLINE"}')
    else response.writeHead(404).end(JSON.stringify({ error: 'NOT_FOUND' }))
  })
  const udp = dgram.createSocket('udp4')
  const rooms = new Map()
  udp.on('message', (raw, sender) => {
    try {
      const packet = JSON.parse(raw.toString())
      if (typeof packet.room !== 'string' || !/^[a-f0-9-]{36}$/.test(packet.room) ||
          typeof packet.player !== 'string' || packet.player.length > 32 ||
          ![packet.x, packet.y, packet.seq].every(Number.isFinite)) return
      if (rooms.size > 256) rooms.clear()
      const room = rooms.get(packet.room) || { peers: new Map(), positions: new Map() }
      rooms.set(packet.room, room); room.peers.set(sender.port, sender)
      room.positions.set(packet.player, { player: packet.player, x: packet.x, y: packet.y, seq: packet.seq })
      for (const peer of room.peers.values()) for (const position of room.positions.values())
        udp.send(Buffer.from(JSON.stringify(position)), peer.port, peer.address)
    } catch { /* Ignore malformed datagrams. */ }
  })
  const dns = dgram.createSocket('udp4')
  dns.on('message', (query, sender) => {
    try {
      if (query.length < 17) return
      let offset = 12; const labels = []
      while (query[offset]) {
        const length = query[offset++]
        if (length > 63 || offset + length >= query.length) return
        labels.push(query.subarray(offset, offset + length).toString('ascii')); offset += length
      }
      offset += 5
      if (offset > query.length) return
      const name = labels.join('.')
      const address = name === 'portal.lablink.edu' ? [127,0,0,2] : name === 'working.lablink.edu' ? [127,0,0,1] : null
      const header = Buffer.alloc(12); query.copy(header,0,0,2)
      header.writeUInt16BE(address ? 0x8180 : 0x8183,2); header.writeUInt16BE(1,4); header.writeUInt16BE(address ? 1 : 0,6)
      const answer = address ? Buffer.from([0xc0,0x0c,0,1,0,1,0,0,0,60,0,4,...address]) : Buffer.alloc(0)
      dns.send(Buffer.concat([header,query.subarray(12,offset),answer]),sender.port,sender.address)
    } catch { /* Ignore invalid DNS packets. */ }
  })
  const vacant = net.createServer()
  const offline = await listen(vacant); await new Promise(resolve => vacant.close(resolve))
  const endpoints = {
    chat: await listen(chat), file: await listen(file), search: await listen(search),
    http: await listen(web), udp: await bind(udp), dns: await bind(dns), offline,
  }
  return { endpoints, documents, async close() {
    for (const socket of live) socket.destroy()
    await Promise.all([chat,file,search,web].map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections?.() })))
    udp.close(); dns.close()
  } }
}
