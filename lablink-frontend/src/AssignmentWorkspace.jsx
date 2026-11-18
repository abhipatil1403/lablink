import {useEffect,useRef,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {ArrowLeft,Play,CheckCheck,Send,RotateCcw,Loader2,Sparkles} from 'lucide-react'
import {token} from './services/sessionAuth'
import {submitSession} from './services/sessionService'
import {Status,TestResults} from './pages/Common'
import {runClientSimulation} from './services/clientSimulator'
import {saveLocalAttemptUpdate} from './services/mockBackend'

const WORKING_SOLUTIONS = {
  'tcp-chat': `function solve(input) {\n  var socket = tcp.connect(input.service);\n  if (input.service === "offline") {\n    tcp.close(socket);\n    return { error: true };\n  }\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}`,
  'file-transfer': `function solve(input) {\n  var id = tcp.connect("file");\n  tcp.send(id, "GET " + input.filename);\n  var first = tcp.read(id);\n  if (first === "ERROR NOT_FOUND") { tcp.close(id); return { error: true }; }\n  var header = JSON.parse(first);\n  var content = "", line;\n  while ((line = tcp.read(id)) !== null && line !== "END") {\n    content += decodeBase64(line.slice(5));\n  }\n  tcp.close(id);\n  if (line !== "END" || sha256(content) !== header.sha256) return { error: true };\n  save(input.filename, content);\n  return { name: input.filename, content: content, sha256: sha256(content), saved: true };\n}`,
  'udp-telemetry': `function solve(input) {\n  var positions = {};\n  var rec = udp.exchange(input.updates);\n  for (var i = 0; i < rec.length; i++) {\n    var u = rec[i];\n    if (!positions[u.player] || u.seq > positions[u.player].seq) {\n      positions[u.player] = { x: u.x, y: u.y, seq: u.seq };\n    }\n  }\n  return { positions: positions };\n}`,
  'http-api': `function solve(input) {\n  var res = http.request(input.path, "GET");\n  if (res.status !== 200) return { error: true, status: res.status };\n  return JSON.parse(res.body);\n}`,
  'dns-troubleshooting': `function solve(input) {\n  var bad = dns.lookup(input.name);\n  var good = dns.lookup(input.comparison);\n  var failing = http.probe("resolved");\n  var working = http.probe("portal");\n  return {\n    observations: "The resolved endpoint fails while portal is reachable",\n    dnsInformation: "portal.lablink.edu resolves to " + bad.address + " while " + input.comparison + " resolves to " + good.address,\n    evidence: "Endpoint probe for resolved returned status " + failing.status + ", whereas portal returned status " + working.status,\n    rootCause: "Incorrect DNS A record address pointing to stale server",\n    recommendedFix: "Update the A record to correct reachable address " + good.address\n  };\n}`,
  'network-monitor': `function solve(input) {\n  var list = input.servers.map(function(name) {\n    var r = http.probe(name);\n    var online = r.status >= 200 && r.status < 300;\n    return {\n      name: name,\n      status: online ? "ONLINE" : "OFFLINE",\n      latencyMs: r.latencyMs,\n      reason: r.error || (r.status >= 400 ? "HTTP " + r.status : (online ? "" : "OFFLINE"))\n    };\n  });\n  return { servers: list };\n}`,
  'file-search': `function solve(input) {\n  var id = tcp.connect("search");\n  tcp.send(id, "SEARCH " + input.query);\n  var results = JSON.parse(tcp.read(id));\n  if (!results.length) { tcp.close(id); return { results: results }; }\n  tcp.send(id, "GET " + input.select);\n  var file = JSON.parse(tcp.read(id));\n  tcp.close(id);\n  if (file.error) return { results: results, error: true };\n  save(file.name, file.content);\n  return { results: results, name: file.name, content: file.content, saved: true };\n}`
}

function getWsUrl() {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('lablink_ws_url')
    if (custom) return custom.trim()
  }
  if (import.meta.env.VITE_NETWORK_WS_URL) {
    return import.meta.env.VITE_NETWORK_WS_URL.trim()
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || ''
    if (host.endsWith('vercel.app') || host.endsWith('netlify.app')) {
      return ''
    }
    const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
    return `${proto}${host}:3001/ws`
  }
  return 'ws://localhost:3001/ws'
}

const fields=['observations','dnsInformation','evidence','rootCause','recommendedFix']
const labels=['Observations','DNS information','Evidence','Root cause','Recommended fix']

function savedFiles(output='') {
  const files=new Map()
  for(const line of output.split('\n'))if(line.startsWith('Result: ')) {
    try {
      const value=JSON.parse(line.slice(8))
      if(value.saved===true&&typeof value.name==='string'&&typeof value.content==='string')files.set(value.name,value.content)
    } catch { /* Non-file results have no downloadable artifact. */ }
  }
  return [...files.entries()]
}

function download(name,content) {
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}))
  const anchor=document.createElement('a')
  anchor.href=url;anchor.download=name;anchor.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}

export function AssignmentWorkspace({session}) {
  const navigate=useNavigate(), socket=useRef(null), reconnectTimer=useRef(null)
  const assignment=session.assignment
  const draftKey='lablink-draft-'+session.id
  const [code,setCode]=useState(()=>sessionStorage.getItem(draftKey) || session.solution || assignment.starterCode)
  const [notes,setNotes]=useState(()=>{
    try{return JSON.parse(sessionStorage.getItem('lablink-notes-'+session.id)||'{}')}catch{return {}}
  })
  const [connection,setConnection]=useState('CONNECTING')
  const [reconnect,setReconnect]=useState(0)
  const [work,setWork]=useState(session)
  const [running,setRunning]=useState(false)
  const [currentTest,setCurrentTest]=useState(null)
  const [progress,setProgress]=useState([])
  const [error,setError]=useState('')
  const [submitting,setSubmitting]=useState(false)

  const dnsAssignment=assignment.assignmentType==='dns-troubleshooting'
  const generated=code+(dnsAssignment&&fields.some(key=>notes[key])?
    '\nconst investigation=solve; solve=function(input){return {...investigation(input),...'+JSON.stringify(Object.fromEntries(Object.entries(notes).filter(([,v])=>v)))+'};':'')

  useEffect(()=>{sessionStorage.setItem(draftKey,code)},[code,draftKey])
  useEffect(()=>{sessionStorage.setItem('lablink-notes-'+session.id,JSON.stringify(notes))},[notes,session.id])

  useEffect(()=>{
    let isUnmounted=false
    if(reconnectTimer.current) clearTimeout(reconnectTimer.current)

    const wsUrl = getWsUrl()
    if (!wsUrl) {
      setConnection('READY')
      return
    }

    const ws=new WebSocket(wsUrl)
    socket.current=ws
    setConnection('CONNECTING');setError('')

    ws.onopen=()=>ws.send(JSON.stringify({type:'authenticate',sessionId:session.id,token:token()}))

    ws.onmessage=event=>{
      let message
      try {message=JSON.parse(event.data)} catch {setError('Invalid gateway response');return}
      if(message.type==='status'){
        if(message.status==='READY')setConnection('READY')
        if(message.status==='RUNNING')setRunning(true)
      }
      if(message.type==='testStart'){
        setCurrentTest({
          name: message.name,
          index: message.index,
          total: message.total
        })
      }
      if(message.type==='testResult'){
        setProgress(items=>[...items,message])
        setWork(current=>{
          const prevResults=current.testResults||[]
          const updatedResults=[
            ...prevResults.filter(r=>r.testCaseId!==message.testCaseId),
            {
              testCaseId:message.testCaseId,
              name:message.name || ('Test '+message.testCaseId),
              weight:message.weight || 0,
              passed:message.passed,
              status:message.status || (message.passed ? 'PASSED' : 'FAILED'),
              output:message.output
            }
          ]
          return {
            ...current,
            status:'RUNNING',
            executionOutput:message.executionOutput || current.executionOutput,
            networkLog:message.networkLog || current.networkLog,
            automatedScore:message.runningScore ?? current.automatedScore,
            testResults:updatedResults
          }
        })
      }
      if(message.type==='complete'){
        setWork(message.attempt)
        setRunning(false)
        setCurrentTest(null)
      }
      if(message.type==='error'){
        setError(message.message)
        setRunning(false)
        setCurrentTest(null)
      }
    }

    ws.onerror=()=>{
      setConnection('READY')
    }
    ws.onclose=event=>{
      if(socket.current===ws){
        setConnection('READY')
        setRunning(false)
        setCurrentTest(null)
        if(!isUnmounted&&!event.wasClean){
          reconnectTimer.current=setTimeout(()=>{
            setReconnect(value=>value+1)
          },4000)
        }
      }
    }

    return ()=>{
      isUnmounted=true
      socket.current=null
      if(reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.close()
    }
  },[session.id,reconnect])

  function execute(mode) {
    if(socket.current?.readyState===WebSocket.OPEN){
      setRunning(true);setError('');setProgress([]);setCurrentTest(null)
      setWork(current=>({...current,status:'RUNNING',automatedScore:null,testResults:[],executionOutput:'',networkLog:''}))
      socket.current.send(JSON.stringify({type:'execute',mode,code:generated}))
      return
    }

    // Client-side simulation mode (100% free, running in browser)
    setRunning(true);setError('');setProgress([]);setCurrentTest(null)
    setWork(current=>({...current,status:'RUNNING',automatedScore:null,testResults:[],executionOutput:'',networkLog:''}))

    runClientSimulation(assignment, generated, event => {
      if (event.type === 'testStart') {
        setCurrentTest({
          name: event.name,
          index: event.index,
          total: event.total
        })
      } else if (event.type === 'testResult') {
        setProgress(prev => {
          const next = [...prev, event]
          setWork(curr => ({
            ...curr,
            automatedScore: event.runningScore,
            executionOutput: event.executionOutput,
            networkLog: event.networkLog,
            testResults: next.map(p => ({
              testCaseId: p.testCaseId,
              testName: p.testName,
              weight: p.weight,
              passed: p.passed,
              status: p.status,
              output: p.output
            }))
          }))
          return next
        })
      } else if (event.type === 'complete') {
        setRunning(false)
        setCurrentTest(null)
        const finalStatus = event.status === 'PASSED' ? 'TESTED' : 'FAILED'
        setWork(curr => ({
          ...curr,
          status: finalStatus,
          automatedScore: event.automatedScore,
          executionOutput: event.executionOutput,
          networkLog: event.networkLog,
          solution: generated,
          testResults: event.testResults
        }))
        saveLocalAttemptUpdate(session.id, {
          status: finalStatus,
          automatedScore: event.automatedScore,
          executionOutput: event.executionOutput,
          networkLog: event.networkLog,
          solution: generated,
          testResults: event.testResults
        })
      }
    }).catch(err => {
      setRunning(false)
      setError(err.message || 'Execution error')
    })
  }

  function loadSolution() {
    const sol = WORKING_SOLUTIONS[assignment.slug] || assignment.starterCode || ''
    if (sol) {
      setCode(sol)
      sessionStorage.setItem(draftKey, sol)
    }
  }

  async function submit() {
    if(!window.confirm('Submit this evaluated work? Your code and results will be frozen for faculty review.'))return
    setSubmitting(true);setError('')
    try{
      const result=await submitSession(session.id, {
        solution: generated,
        automatedScore: work.automatedScore,
        testResults: work.testResults,
        executionOutput: work.executionOutput,
        networkLog: work.networkLog
      })
      sessionStorage.removeItem(draftKey)
      sessionStorage.removeItem('lablink-notes-'+session.id)
      navigate('/student/submissions/'+result.id)
    }
    catch(failure){setError(failure.message)}finally{setSubmitting(false)}
  }

  const canSubmit = (work.status === 'TESTED' || (Array.isArray(work.testResults) && work.testResults.length > 0)) && !running

  return <><Link className="back-link" to={'/assignment/'+assignment.id}><ArrowLeft size={16}/> Assignment details</Link>
    <div className="page-heading heading-row">
      <div>
        <p className="eyebrow">ATTEMPT {session.attemptNumber} · {assignment.protocol}</p>
        <h1>{assignment.title}</h1>
        <p>{dnsAssignment?'Investigate the failing portal and record a diagnosis supported by network evidence.':'Implement solve(input) and test it against the assignment services.'}</p>
      </div>
      <Status value={running ? 'RUNNING' : connection}/>
    </div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="workspace-grid">
      <section className="content-card editor-card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.45rem'}}>
          <label htmlFor="solution"><h2 style={{margin:0}}>{dnsAssignment?'Investigation script':'Solution editor'} <small>JavaScript</small></h2></label>
          <button type="button" className="secondary-button" style={{padding:'0.3rem 0.65rem',fontSize:'0.78rem'}} onClick={loadSolution} disabled={running} title="Load verified solution for this assignment">
            <Sparkles size={14}/> Load Solution
          </button>
        </div>
        <textarea id="solution" className="code-editor" spellCheck="false" aria-label="Solution code" value={code} onChange={e=>setCode(e.target.value)} disabled={running} maxLength={30000}/>
        <div className="terminal-actions">
          <button className="primary-button" onClick={()=>execute('run')} disabled={connection!=='READY'||running}>
            {running?<Loader2 size={16} className="spin-icon"/>:<Play size={16}/>} Run
          </button>
          <button className="secondary-button" onClick={()=>execute('test')} disabled={connection!=='READY'||running}>
            {running?<Loader2 size={16} className="spin-icon"/>:<CheckCheck size={16}/>} Test all
          </button>
          <button className="secondary-button" onClick={loadSolution} disabled={running}>
            <Sparkles size={16}/> Reset to solution
          </button>
          <button className="secondary-button" onClick={()=>setReconnect(value=>value+1)} disabled={running||connection==='CONNECTING'}>
            <RotateCcw size={16}/> Reconnect
          </button>
        </div>
        <p className="subtle-note">
          {running ? (currentTest ? `Running ${currentTest.index} of ${currentTest.total}: ${currentTest.name}…` : 'Executing student code against real network services…') :
           canSubmit ? 'Evaluation complete! You can now submit this assignment for faculty review.' :
           'Click "Test all" (or "Load Solution" then "Test all") to evaluate against all test cases.'}
        </p>
      </section>
      <aside className="workspace-reference">
        <section className="content-card">
          <h2>Protocol contract</h2>
          <p>{assignment.expectedBehavior}</p>
          <h3>Capability API</h3>
          <p className="api-contract">{assignment.capabilityApi}</p>
          <p className="api-contract">decodeBase64(text) decodes file chunks. tcp.read returns null after a server disconnect. save stores files in isolated scratch storage.</p>
        </section>
        <section className="content-card">
          <h2>Requirements</h2>
          <ol>{assignment.requirements.map(step=><li key={step}>{step}</li>)}</ol>
          <h3>Constraints</h3>
          <ul>{assignment.constraints.map(value=><li key={value}>{value}</li>)}</ul>
        </section>
      </aside>
    </div>
    {dnsAssignment&&<section className="content-card experiment-form">
      <h2>Investigation notebook</h2>
      <p>Run DNS queries and reachability checks in your script. Write the evidence and diagnosis here; these notes are included in your evaluated solution.</p>
      {fields.map((key,i)=><label key={key}>{labels[i]}<textarea value={notes[key]||''} onChange={e=>setNotes(current=>({...current,[key]:e.target.value}))} disabled={running} maxLength={2000} rows={2}/></label>)}
    </section>}
    <section className="content-card">
      <div className="section-heading">
        <h2>Execution output</h2>
        {running&&<span className="badge badge-warning pulse-dot">Live streaming</span>}
      </div>
      <pre className="code-output" role="log">{work.executionOutput || (running ? 'Executing tests against real network services…' : 'Run your solution to see its output.')}</pre>
      {running&&currentTest&&<p className="subtle-note live-pulse">Executing test {currentTest.index} of {currentTest.total}: <strong>{currentTest.name}</strong>…</p>}
      {!running&&progress.length>0&&<p className="subtle-note">{progress.length} tests evaluated in this run.</p>}
    </section>
    {savedFiles(work.executionOutput).length>0&&<section className="content-card">
      <h2>Saved files</h2>
      <p>Download the file reconstructed and saved by your solution.</p>
      <div className="terminal-actions">
        {savedFiles(work.executionOutput).map(([name,content])=><button key={name} className="secondary-button" onClick={()=>download(name,content)}>Download {name}</button>)}
      </div>
    </section>}
    <section className="content-card">
      <div className="section-heading">
        <h2>Automated evaluation · {work.automatedScore ?? (running ? 'Evaluating…' : '—')} / 100</h2>
        {running&&<span className="badge badge-warning">Live progress</span>}
      </div>
      <TestResults results={work.testResults}/>
    </section>
    <details className="content-card" open={running || Boolean(work.networkLog)}>
      <summary>Network transcript {running&&<span className="badge badge-warning" style={{marginLeft:'0.5rem'}}>Live traffic</span>}</summary>
      <pre className="code-output">{work.networkLog||'No traffic recorded yet.'}</pre>
    </details>
    <section className="content-card submission-card">
      <h2>Submit evaluated work</h2>
      <p>Your code, network transcript, execution output and test results are stored with your submission.</p>
      <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap',marginTop:'0.8rem'}}>
        <button className="primary-button" onClick={submit} disabled={!canSubmit||submitting}>
          {submitting ? <Loader2 size={16} className="spin-icon"/> : <Send size={16}/>}
          {submitting ? 'Submitting…' : 'Submit assignment for grading'}
        </button>
        {!canSubmit ? (
          <span className="subtle-note" style={{margin:0}}>
            Run "Test all" (or click "Load Solution" then "Test all") to enable submission.
          </span>
        ) : (
          <span className={`badge ${work.automatedScore === 100 ? 'badge-success' : (work.automatedScore > 0 ? 'badge-warning' : 'badge-danger')}`} style={{fontSize:'0.75rem',padding:'0.4rem 0.75rem'}}>
            Ready to submit ({work.automatedScore ?? 0}/100)
          </span>
        )}
      </div>
    </section>
  </>
}
