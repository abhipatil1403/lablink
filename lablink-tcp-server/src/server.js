import net from 'node:net'

const port = Number(process.env.TCP_PORT || 9001)
const host = process.env.TCP_HOST || '127.0.0.1'
const server = net.createServer(socket => socket.end('Experiment server not configured yet\n'))
server.listen(port, host, () => console.log(`LabLink TCP server listening on ${host}:${port}`))
