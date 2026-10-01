import {useEffect,useRef,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {ArrowLeft,Play,CheckCheck,Send,RotateCcw} from 'lucide-react'
import {token} from './services/sessionAuth'
import {submitSession} from './services/sessionService'
import {Status,TestResults} from './pages/Common'

const wsUrl=import.meta.env.VITE_NETWORK_WS_URL || 'ws://localhost:3001/ws'
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
  const navigate=useNavigate(), socket=useRef(null)
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
  const [progress,setProgress]=useState([])
  const [error,setError]=useState('')
  const [submitting,setSubmitting]=useState(false)
  const dnsAssignment=assignment.assignmentType==='dns-troubleshooting'
  const generated=code+(dnsAssignment&&fields.some(key=>notes[key])?
    '\nconst investigation=solve; solve=function(input){return {...investigation(input),...'+JSON.stringify(Object.fromEntries(Object.entries(notes).filter(([,v])=>v)))+'};':'')
  useEffect(()=>{sessionStorage.setItem(draftKey,code)},[code,draftKey])
  useEffect(()=>{sessionStorage.setItem('lablink-notes-'+session.id,JSON.stringify(notes))},[notes,session.id])
  useEffect(()=>{
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
      if(message.type==='testResult')setProgress(items=>[...items,message])
      if(message.type==='complete'){setWork(message.attempt);setRunning(false)}
      if(message.type==='error'){setError(message.message);setRunning(false)}
    }
    ws.onerror=()=>setError('Network service unavailable. Start the gateway, then reconnect.')
    ws.onclose=()=>{if(socket.current===ws){setConnection('DISCONNECTED');setRunning(false)}}
    return ()=>{socket.current=null;ws.close()}
  },[session.id,reconnect])
  function execute(mode) {
    if(socket.current?.readyState!==WebSocket.OPEN)return
    setRunning(true);setError('');setProgress([])
    // Any execution clears the previous evaluated state until the backend completes it.
    setWork(current=>({...current,status:'RUNNING',automatedScore:null,testResults:[]}))
    socket.current.send(JSON.stringify({type:'execute',mode,code:generated}))
  }
  async function submit() {
    setSubmitting(true);setError('')
    try{const result=await submitSession(session.id);sessionStorage.removeItem(draftKey);sessionStorage.removeItem('lablink-notes-'+session.id);navigate('/student/submissions/'+result.id)}
    catch(failure){setError(failure.message)}finally{setSubmitting(false)}
  }
  const canSubmit=work.status==='TESTED'&&work.solution===generated&&!running
  return <><Link className="back-link" to={'/assignment/'+assignment.id}><ArrowLeft size={16}/> Assignment details</Link>
    <div className="page-heading heading-row"><div><p className="eyebrow">ATTEMPT {session.attemptNumber} · {assignment.protocol}</p><h1>{assignment.title}</h1><p>{dnsAssignment?'Investigate the failing portal and record a diagnosis supported by network evidence.':'Implement solve(input) and test it against the assignment services.'}</p></div><Status value={connection}/></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="workspace-grid"><section className="content-card editor-card"><label htmlFor="solution"><h2>{dnsAssignment?'Investigation script':'Solution editor'} <small>JavaScript</small></h2></label>
      <textarea id="solution" className="code-editor" spellCheck="false" aria-label="Solution code" value={code} onChange={e=>setCode(e.target.value)} disabled={running} maxLength={30000}/>
      <div className="terminal-actions"><button className="primary-button" onClick={()=>execute('run')} disabled={connection!=='READY'||running}><Play size={16}/> Run</button><button className="secondary-button" onClick={()=>execute('test')} disabled={connection!=='READY'||running}><CheckCheck size={16}/> Test all</button><button className="secondary-button" onClick={()=>setReconnect(value=>value+1)} disabled={running||connection==='CONNECTING'}><RotateCcw size={16}/> Reconnect</button></div>
      <p className="subtle-note">{running?'Executing student code against real network services…':canSubmit?'The current solution has been evaluated and can be submitted.':'Run shows one test input. Test all evaluates every enabled test. Test after editing before you submit.'}</p>
    </section><aside className="workspace-reference"><section className="content-card"><h2>Protocol contract</h2><p>{assignment.expectedBehavior}</p><h3>Capability API</h3><p className="api-contract">{assignment.capabilityApi}</p><p className="api-contract">decodeBase64(text) decodes file chunks. tcp.read returns null after a server disconnect. save stores files in isolated scratch storage.</p></section><section className="content-card"><h2>Requirements</h2><ol>{assignment.requirements.map(step=><li key={step}>{step}</li>)}</ol><h3>Constraints</h3><ul>{assignment.constraints.map(value=><li key={value}>{value}</li>)}</ul></section></aside></div>
    {dnsAssignment&&<section className="content-card experiment-form"><h2>Investigation notebook</h2><p>Run DNS queries and reachability checks in your script. Write the evidence and diagnosis here; these notes are included in your evaluated solution.</p>{fields.map((key,i)=><label key={key}>{labels[i]}<textarea value={notes[key]||''} onChange={e=>setNotes(current=>({...current,[key]:e.target.value}))} disabled={running} maxLength={2000} rows={2}/></label>)}</section>}
    <section className="content-card"><h2>Execution output</h2><pre className="code-output" role="log">{work.executionOutput || 'Run your solution to see its output.'}</pre>{progress.length>0&&running&&<p>{progress.length} tests completed…</p>}</section>
    {savedFiles(work.executionOutput).length>0&&<section className="content-card"><h2>Saved files</h2><p>Download the file reconstructed and saved by your solution.</p><div className="terminal-actions">{savedFiles(work.executionOutput).map(([name,content])=><button key={name} className="secondary-button" onClick={()=>download(name,content)}>Download {name}</button>)}</div></section>}
    <section className="content-card"><h2>Automated evaluation · {work.automatedScore??'—'} / 100</h2><TestResults results={work.testResults}/></section>
    <details className="content-card"><summary>Network transcript</summary><pre className="code-output">{work.networkLog||'No traffic recorded yet.'}</pre></details>
    <section className="content-card submission-card"><h2>Submit evaluated work</h2><p>Your code, network transcript, execution output and test results are stored with your submission.</p><button className="primary-button" onClick={submit} disabled={!canSubmit||submitting}><Send size={16}/>{submitting?'Submitting…':'Submit assignment'}</button></section>
  </>
}
