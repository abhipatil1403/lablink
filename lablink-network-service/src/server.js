import http from 'node:http'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'

export function createNetworkServer(options) {
  const { apiBaseUrl, gatewayKey, tcpHost, tcpPort, frontendOrigin } = options
  if (!gatewayKey) throw new Error('GATEWAY_SHARED_SECRET is required')

  const server = http.createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ status: 'ONLINE' }))
    } else {
      response.writeHead(404)
      response.end()
    }
  })
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 })
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws' || request.headers.origin !== frontendOrigin) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client))
  })
  wss.on('connection', ws => bridge(ws, { apiBaseUrl, gatewayKey, tcpHost, tcpPort }))
  return { server, wss }
}

function bridge(ws, options) {
  let status = 'AUTHENTICATING'
  let tcp = null
  let token = null
  let sessionId = null
  let validated = false
  let buffer = ''
  const timer = setTimeout(() => stop('Authentication timed out.'), 10_000)
  const send = message => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)) }

  async function api(path, method = 'GET', body) {
    const response = await fetch(`${options.apiBaseUrl}${path}`, {
      method,
      signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${token}`, 'X-LabLink-Gateway-Key': options.gatewayKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw new Error(`API validation failed (${response.status})`)
    return response.json()
  }

  function stop(message) {
    if (status === 'CLOSED' || status === 'ERROR') return
    const shouldFailSession = validated && (status === 'CONNECTED' || status === 'CONNECTING')
    status = 'ERROR'
    clearTimeout(timer)
    if (tcp) tcp.destroy()
    send({ type: 'error', message })
    if (sessionId && token && shouldFailSession) api(`/api/internal/sessions/${encodeURIComponent(sessionId)}/state`, 'POST', { status: 'FAILED' }).catch(() => {})
    ws.close(1011, 'Connection failed')
  }

  ws.on('message', async raw => {
    let message
    try { message = JSON.parse(raw.toString()) } catch { stop('Invalid WebSocket message.'); return }
    if (status === 'AUTHENTICATING') {
      if (message.type !== 'authenticate' || typeof message.token !== 'string' || typeof message.sessionId !== 'string'
          || message.token.length > 4096 || !/^[a-f0-9-]{36}$/i.test(message.sessionId)) {
        stop('Invalid session credentials.')
        return
      }
      token = message.token
      sessionId = message.sessionId
      status = 'VALIDATING'
      clearTimeout(timer)
      try {
        await api(`/api/internal/sessions/${encodeURIComponent(sessionId)}/validate`)
      } catch {
        stop('Session authentication failed or LabLink API is unavailable.')
        return
      }
      if (status !== 'VALIDATING') return
      validated = true
      status = 'CONNECTING'
      tcp = net.createConnection({ host: options.tcpHost, port: options.tcpPort })
      tcp.setEncoding('utf8')
      tcp.setTimeout(60_000)
      tcp.on('connect', async () => {
        if (status !== 'CONNECTING') return
        try { await api(`/api/internal/sessions/${encodeURIComponent(sessionId)}/state`, 'POST', { status: 'RUNNING' }) }
        catch { stop('Unable to start the experiment session.'); return }
        if (status !== 'CONNECTING') return
        status = 'CONNECTED'
        console.log(`TCP session connected ${sessionId}`)
        send({ type: 'status', status: 'CONNECTED', server: `${options.tcpHost}:${options.tcpPort}` })
      })
      tcp.on('data', chunk => {
        buffer += chunk
        if (buffer.length > 8192) { stop('Experiment server sent an oversized response.'); return }
        let newline = buffer.indexOf('\n')
        while (newline !== -1) {
          send({ type: 'response', text: buffer.slice(0, newline).replace(/\r$/, '') })
          buffer = buffer.slice(newline + 1)
          newline = buffer.indexOf('\n')
        }
      })
      tcp.on('timeout', () => stop('Experiment server timed out.'))
      tcp.on('error', error => { console.error(`TCP session error ${sessionId}: ${error.message}`); stop('Experiment server is unavailable.') })
      tcp.on('close', () => { if (status === 'CONNECTED') stop('Experiment server disconnected.') })
      return
    }
    if (status !== 'CONNECTED' || message.type !== 'command' || typeof message.command !== 'string'
        || !message.command.trim() || message.command.length > 1024 || /[\r\n]/.test(message.command)) {
      send({ type: 'error', message: 'Command is unavailable or invalid.' })
      return
    }
    tcp.write(`${message.command}\n`)
  })
  ws.on('close', () => {
    clearTimeout(timer)
    const wasConnected = status === 'CONNECTED'
    status = 'CLOSED'
    if (tcp) tcp.destroy()
    if (wasConnected) api(`/api/internal/sessions/${encodeURIComponent(sessionId)}/state`, 'POST', { status: 'STOPPED' }).catch(() => {})
    console.log(`WebSocket disconnected ${sessionId || 'unauthenticated'}`)
  })
  ws.on('error', error => console.error(`WebSocket error: ${error.message}`))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.WS_PORT || 3001)
  const { server } = createNetworkServer({
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
    gatewayKey: process.env.GATEWAY_SHARED_SECRET,
    tcpHost: process.env.TCP_HOST || '127.0.0.1',
    tcpPort: Number(process.env.TCP_PORT || 9001),
    frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  })
  server.on('error', error => { console.error(`Gateway error: ${error.message}`); process.exitCode = 1 })
  server.listen(port, '0.0.0.0', () => console.log(`LabLink WebSocket gateway listening on ${port}`))
}
