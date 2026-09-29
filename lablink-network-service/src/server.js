import { WebSocketServer } from 'ws'

const port = Number(process.env.WS_PORT || 3001)
const server = new WebSocketServer({ port })
server.on('connection', socket => socket.close(1013, 'Gateway not configured yet'))
console.log(`LabLink WebSocket gateway listening on ${port}`)
