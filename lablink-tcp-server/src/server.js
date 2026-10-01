import net from 'node:net'
import { fileURLToPath } from 'node:url'

export function handleChatMessage(line, state) {
  const command = line.trim()
  if (!state.username) {
    if (!command.startsWith('USER ') || !command.slice(5).trim()) return 'ERROR: Send USER <username> first'
    state.username = command.slice(5).trim()
    return `WELCOME ${state.username}`
  }
  if (command === 'QUIT') return 'BYE'
  if (command.startsWith('MSG ') && command.slice(4).trim()) return `MESSAGE RECEIVED: ${command.slice(4).trim()}`
  return 'ERROR: Send MSG <message> or QUIT'
}

export function createTcpServer() {
  return net.createServer(socket => {
    console.log(`TCP client connected ${socket.remoteAddress}:${socket.remotePort}`)
    socket.setEncoding('utf8')
    socket.setTimeout(60_000)
    let buffer = ''
    const state = { username: null }

    socket.on('data', chunk => {
      buffer += chunk
      if (buffer.length > 4096) {
        socket.end('ERROR: Command too long\n')
        return
      }
      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (line.length > 1024) {
          socket.end('ERROR: Command too long\n')
          return
        }
        const response = handleChatMessage(line, state)
        socket.write(`${response}\n`)
        if (line.trim() === 'QUIT' && state.username) socket.end()
        newline = buffer.indexOf('\n')
      }
    })
    socket.on('timeout', () => socket.end('ERROR: Connection timed out\n'))
    socket.on('error', error => console.error(`TCP socket error: ${error.message}`))
    socket.on('close', () => console.log(`TCP client disconnected ${socket.remoteAddress}:${socket.remotePort}`))
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.TCP_PORT || 9001)
  const host = process.env.TCP_HOST || '0.0.0.0'
  const server = createTcpServer()
  server.on('error', error => { console.error(`TCP server error: ${error.message}`); process.exitCode = 1 })
  server.listen(port, host, () => console.log(`LabLink TCP server listening on ${host}:${port}`))
}
