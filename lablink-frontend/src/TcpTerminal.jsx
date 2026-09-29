import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlugZap, Send, Square, RotateCcw } from 'lucide-react'
import { auth } from './services/firebase'
import { submitSession } from './services/sessionService'

const wsUrl = import.meta.env.VITE_NETWORK_WS_URL || 'ws://localhost:3001/ws'

function savedLogs(id) {
  try {
    const value = JSON.parse(sessionStorage.getItem(`lablink-logs-${id}`) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export function TcpTerminal({ session }) {
  const navigate = useNavigate()
  const socket = useRef(null)
  const output = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [connection, setConnection] = useState('CONNECTING')
  const [error, setError] = useState('')
  const [command, setCommand] = useState('')
  const [logs, setLogs] = useState(() => savedLogs(session.id))
  const [result, setResult] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { sessionStorage.setItem(`lablink-logs-${session.id}`, JSON.stringify(logs)); if (output.current) output.current.scrollTop = output.current.scrollHeight }, [logs, session.id])

  useEffect(() => {
    let cancelled = false
    setConnection('CONNECTING')
    setError('')
    async function connect() {
      try {
        if (!auth?.currentUser) throw new Error('Please log in again.')
        const token = await auth.currentUser.getIdToken()
        if (cancelled) return
        const ws = new WebSocket(wsUrl)
        socket.current = ws
        ws.onopen = () => ws.send(JSON.stringify({ type: 'authenticate', sessionId: session.id, token }))
        ws.onmessage = event => {
          let message
          try { message = JSON.parse(event.data) } catch { setError('Invalid gateway response.'); setConnection('ERROR'); return }
          if (message.type === 'status' && message.status === 'CONNECTED') { setConnection('CONNECTED'); setError('') }
          if (message.type === 'response') setLogs(current => [...current, { direction: 'SERVER', text: message.text, at: new Date().toISOString() }])
          if (message.type === 'error') {
            setError(message.message)
            if (message.message !== 'Command is unavailable or invalid.') setConnection('ERROR')
          }
        }
        ws.onerror = () => { setError(current => current || 'Unable to connect to the network service.'); setConnection('ERROR') }
        ws.onclose = () => { if (socket.current === ws) setConnection(current => current === 'ERROR' ? 'ERROR' : 'DISCONNECTED') }
      } catch (failure) { if (!cancelled) { setError(failure.message); setConnection('ERROR') } }
    }
    connect()
    return () => { cancelled = true; socket.current?.close(); socket.current = null }
  }, [session.id, attempt])

  function send(event) {
    event.preventDefault()
    const text = command.trim()
    if (!text || connection !== 'CONNECTED' || socket.current?.readyState !== WebSocket.OPEN) return
    if (text.length > 1024 || /[\r\n]/.test(text)) { setError('Command must be a single line under 1024 characters.'); return }
    setLogs(current => [...current, { direction: 'STUDENT', text, at: new Date().toISOString() }])
    setError('')
    socket.current.send(JSON.stringify({ type: 'command', command: text }))
    setCommand('')
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await submitSession(session.id, logs, result)
      sessionStorage.removeItem(`lablink-logs-${session.id}`)
      socket.current?.close()
      navigate('/student/submissions')
    } catch (failure) { setError(failure.message) }
    finally { setSubmitting(false) }
  }

  return <><Link className="back-link" to={`/experiment/${session.experimentId}`}><ArrowLeft size={16} /> Experiment details</Link><div className="page-heading"><p className="eyebrow">LIVE NETWORK SESSION</p><h1>TCP Client-Server Experiment</h1><p>Send commands through WebSocket to a real TCP experiment server.</p></div>
    <section className="terminal-card"><div className="terminal-head"><div><strong>Session #{session.id.slice(0, 8)}</strong><small>Server {session.serverAddress}</small></div><span className={`terminal-status status-${connection.toLowerCase()}`}>{connection}</span></div>
      <div className="terminal-output" ref={output} role="log" aria-live="polite"><p className="terminal-hint">Use ping, time, help, or echo &lt;message&gt; to explore TCP communication.</p>{logs.map((entry, index) => <div key={`${entry.at}-${index}`} className={`terminal-line ${entry.direction === 'STUDENT' ? 'terminal-student' : 'terminal-server'}`}><span>{entry.direction === 'STUDENT' ? 'student>' : 'server>'}</span><code>{entry.text}</code></div>)}</div>
      <form className="terminal-input" onSubmit={send}><label htmlFor="command">Command</label><input id="command" autoComplete="off" value={command} onChange={event => setCommand(event.target.value)} disabled={connection !== 'CONNECTED'} placeholder={connection === 'CONNECTED' ? 'Type a command…' : 'Waiting for connection…'} /><button className="primary-button" disabled={connection !== 'CONNECTED' || !command.trim()}><Send size={17} /> Send</button></form></section>
    {error && <p className="form-error session-error" role="alert">{error}</p>}
    <div className="terminal-actions"><button className="secondary-button" disabled={connection !== 'CONNECTED'} onClick={() => socket.current?.close()}><Square size={16} /> Disconnect</button><button className="secondary-button" disabled={connection === 'CONNECTING' || connection === 'CONNECTED'} onClick={() => setAttempt(value => value + 1)}><RotateCcw size={16} /> Reconnect</button></div>
    <section className="content-card submission-card"><div className="submission-title"><PlugZap size={20} /><div><h2>Submit your result</h2><p>Describe what you observed. The terminal log is included with your submission.</p></div></div><form onSubmit={submit}><label htmlFor="result">Your observation</label><textarea id="result" value={result} onChange={event => setResult(event.target.value)} required maxLength="2000" rows="4" placeholder="Describe the TCP connection and server responses…" /><button className="primary-button" disabled={submitting || logs.length === 0 || !result.trim() || connection === 'ERROR'}>{submitting ? 'Submitting…' : 'Submit result'} <Send size={17} /></button></form></section>
  </>
}
