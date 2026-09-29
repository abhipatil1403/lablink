import net from 'node:net'
import { fileURLToPath } from 'node:url'

export function handleCommand(line, now = new Date()) {
  const command = line.trim()
  if (command === 'ping') return 'PONG'
  if (command === 'time') return now.toISOString()
  if (command === 'help') return 'Commands: ping, time, help, echo <message>'
  if (command.startsWith('echo ') && command.slice(5).trim()) return `ECHO: ${command.slice(5)}`
  return 'ERROR: Unknown command'
}

export function createTcpServer() {
  return net.createServer(socket => {
    console.log(`TCP client connected ${socket.remoteAddress}:${socket.remotePort}`)
    socket.setEncoding('utf8')
    socket.setTimeout(60_000)
    let buffer = ''

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
        socket.write(`${handleCommand(line)}\n`)
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
