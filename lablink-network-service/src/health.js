import { capabilities } from './capabilities.js'

/** Probe the actual protocols, including responses, without executing student code. */
export async function probeServices(endpoints) {
  const checks = {
    chat: async call => {
      const socket = await call('tcp.connect',['chat'])
      await call('tcp.send',[socket,'USER health'])
      return await call('tcp.read',[socket]) === 'WELCOME health'
    },
    file: async call => {
      const socket = await call('tcp.connect',['file'])
      await call('tcp.send',[socket,'GET welcome.txt'])
      const header = JSON.parse(await call('tcp.read',[socket]))
      let line, data = false
      while ((line = await call('tcp.read',[socket])) !== null) {
        if (line === 'END') return header.name === 'welcome.txt' && header.bytes > 0 && data
        if (line.startsWith('DATA ')) data = true
      }
      return false
    },
    search: async call => {
      const socket = await call('tcp.connect',['search'])
      await call('tcp.send',[socket,'SEARCH welcome'])
      return JSON.parse(await call('tcp.read',[socket])).includes('welcome.txt')
    },
    udp: async call => (await call('udp.exchange',[[{player:'health',x:1,y:2,seq:1}]]))
      .some(packet => packet.player === 'health' && packet.x === 1 && packet.y === 2),
    http: async call => {
      const response = await call('http.request',['/students/42','GET'])
      return response.status === 200 && JSON.parse(response.body).rollNumber === 'CNT042'
    },
    dns: async call => {
      const response = await call('dns.lookup',['working.lablink.edu'])
      return response.rcode === 0 && response.address === '127.0.0.1'
    },
    monitor: async call => (await call('http.request',['/probe/lab','GET'])).status === 200,
  }
  return Object.fromEntries(await Promise.all(Object.entries(checks).map(async ([name,check]) => {
    const client = capabilities(endpoints)
    try { return [name, await check(client.call) ? 'ONLINE' : 'OFFLINE'] }
    catch { return [name,'OFFLINE'] }
    finally { client.close() }
  })))
}
