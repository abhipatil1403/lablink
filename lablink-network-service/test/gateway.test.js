import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { after, before, test } from 'node:test'
import { WebSocket } from 'ws'
import { createTcpServer } from '../../lablink-tcp-server/src/server.js'
import { createNetworkServer } from '../src/server.js'

const sessionId = '00000000-0000-4000-8000-000000000001'
let api
let tcp
let gateway
let wsUrl
const states = []

before(async () => {
  tcp = createTcpServer()
  await new Promise(resolve => tcp.listen(0, '127.0.0.1', resolve))
  api = http.createServer((request, response) => {
    if (request.headers.authorization !== 'Bearer valid-token' || request.headers['x-lablink-gateway-key'] !== 'test-secret'
        || !request.url.includes(sessionId)) {
      response.writeHead(401).end()
      return
    }
    if (request.method === 'POST') {
      let body = ''
      request.on('data', chunk => { body += chunk })
      request.on('end', () => { states.push(JSON.parse(body).status); response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}') })
    } else {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: sessionId, experimentId: 'tcp-client-server', status: 'STARTING' }))
    }
  })
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve))
  gateway = createNetworkServer({
    apiBaseUrl: `http://127.0.0.1:${api.address().port}`,
    gatewayKey: 'test-secret',
    tcpHost: '127.0.0.1',
    tcpPort: tcp.address().port,
    frontendOrigin: 'http://localhost:5173',
  })
  await new Promise(resolve => gateway.server.listen(0, '127.0.0.1', resolve))
  wsUrl = `ws://127.0.0.1:${gateway.server.address().port}/ws`
})

after(async () => {
  for (const ws of gateway.wss.clients) ws.terminate()
  await Promise.all([
    new Promise(resolve => gateway.server.close(resolve)),
    new Promise(resolve => api.close(resolve)),
    new Promise(resolve => tcp.close(resolve)),
  ])
})

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { origin: 'http://localhost:5173' })
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
  })
}

function next(ws) {
  return new Promise(resolve => ws.once('message', raw => resolve(JSON.parse(raw.toString()))))
}

async function authenticate(ws, token = 'valid-token') {
  const response = next(ws)
  ws.send(JSON.stringify({ type: 'authenticate', sessionId, token }))
  return response
}

test('invalid token never opens a TCP session', async () => {
  const ws = await connect()
  try {
    const result = await authenticate(ws, 'invalid-token')
    assert.equal(result.type, 'error')
    assert.equal(states.length, 0)
  } finally { ws.terminate() }
})

test('two authenticated WebSockets receive independent TCP responses', async () => {
  const [a, b] = await Promise.all([connect(), connect()])
  try {
    const [readyA, readyB] = await Promise.all([authenticate(a), authenticate(b)])
    assert.equal(readyA.status, 'CONNECTED')
    assert.equal(readyB.status, 'CONNECTED')
    assert.equal(states.filter(state => state === 'RUNNING').length, 2)
    const responseA = next(a)
    const responseB = next(b)
    a.send(JSON.stringify({ type: 'command', command: 'ping' }))
    b.send(JSON.stringify({ type: 'command', command: 'echo B only' }))
    assert.deepEqual(await responseA, { type: 'response', text: 'PONG' })
    assert.deepEqual(await responseB, { type: 'response', text: 'ECHO: B only' })
  } finally { a.terminate(); b.terminate() }
})

test('unavailable TCP server reports an error and fails the session', async () => {
  const vacant = net.createServer()
  await new Promise(resolve => vacant.listen(0, '127.0.0.1', resolve))
  const vacantPort = vacant.address().port
  await new Promise(resolve => vacant.close(resolve))
  const failedGateway = createNetworkServer({
    apiBaseUrl: `http://127.0.0.1:${api.address().port}`,
    gatewayKey: 'test-secret',
    tcpHost: '127.0.0.1',
    tcpPort: vacantPort,
    frontendOrigin: 'http://localhost:5173',
  })
  await new Promise(resolve => failedGateway.server.listen(0, '127.0.0.1', resolve))
  const ws = await new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${failedGateway.server.address().port}/ws`, { origin: 'http://localhost:5173' })
    socket.once('open', () => resolve(socket))
    socket.once('error', reject)
  })
  try {
    const result = await authenticate(ws)
    assert.deepEqual(result, { type: 'error', message: 'Experiment server is unavailable.' })
    for (let i = 0; i < 20 && !states.includes('FAILED'); i++) await new Promise(resolve => setTimeout(resolve, 25))
    assert.ok(states.includes('FAILED'))
  } finally {
    ws.terminate()
    await new Promise(resolve => failedGateway.server.close(resolve))
  }
})
