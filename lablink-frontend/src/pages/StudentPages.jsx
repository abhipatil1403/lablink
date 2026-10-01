import {useState} from 'react'
import {Link,useNavigate,useParams} from 'react-router-dom'
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ClipboardList,Clock3,Wifi} from 'lucide-react'
import {useAuth} from '../authContext'
import {useRemote} from '../hooks/useRemote'
import {getExperiment,listExperiments} from '../services/experimentService'
import {createSession,getSession,getSubmission,listSubmissions,listAttempts} from '../services/sessionService'
import {AssignmentWorkspace} from '../AssignmentWorkspace'
import {DataState,Header,Status,WorkEvidence} from './Common'

const loadDashboard=()=>Promise.all([listExperiments(),listSubmissions()])
function AssignmentCard({assignment}) {
  return <article className="experiment-card"><div className="card-top"><span className="protocol-icon"><Wifi size={21}/></span><Status value={assignment.status}/></div><div className="chip-row"><span className="chip">{assignment.protocol}</span><span className="chip">{assignment.difficulty}</span></div><h3>{assignment.title}</h3><p>{assignment.description}</p><div className="chip-row">{assignment.networkingConcepts.map(concept=><span className="chip" key={concept}>{concept}</span>)}</div><p className="subtle-note">{assignment.attempts??0} attempts · {assignment.submissionStatus?.replaceAll('_',' ')}{assignment.deadline?' · Due '+new Date(assignment.deadline).toLocaleString():''}</p><Link className="card-link" to={'/assignment/'+assignment.id}>View assignment <ArrowRight size={16}/></Link></article>
}
export function StudentDashboard() {
  const {profile}=useAuth()
  const {data,loading,error}=useRemote(loadDashboard)
  const [assignments,submissions]=data||[[],[]]
  const metrics=[
    ['Available assignments',assignments.filter(a=>a.status==='ACTIVE').length,BookOpen],
    ['Submitted assignments',new Set(submissions.map(s=>s.assignmentId)).size,CheckCircle2],
    ['Pending reviews',submissions.filter(s=>s.status==='SUBMITTED').length,Clock3],
    ['Total submissions',submissions.length,ClipboardList]
  ]
  return <><Header eyebrow="STUDENT DASHBOARD" title={'Welcome, '+profile.name.split(' ')[0]} description="Solve seven networking assignments using actual network services."/><DataState loading={loading} error={error}><div className="metric-grid">{metrics.map(([label,value,Icon])=><article key={label} className="metric-card"><span className="metric-icon"><Icon size={22}/></span><strong>{value}</strong><span>{label}</span></article>)}</div><div className="section-heading"><h2>Assignments</h2><Link className="text-link" to="/student/assignments">View all <ArrowRight size={16}/></Link></div><div className="experiment-grid">{assignments.map(a=><AssignmentCard key={a.id} assignment={a}/>)}</div></DataState></>
}
export function ExperimentCatalog() {
  const {data,loading,error}=useRemote(listExperiments)
  return <><Header eyebrow="ASSIGNMENTS" title="Assignment catalog" description="TCP, UDP, HTTP, DNS and network monitoring programming challenges."/><DataState loading={loading} error={error}><div className="experiment-grid">{data?.map(a=><AssignmentCard key={a.id} assignment={a}/>)}</div></DataState></>
}
export function ExperimentDetails() {
  const {id}=useParams(),navigate=useNavigate()
  const {data:a,loading,error}=useRemote(getExperiment,id)
  const [busy,setBusy]=useState(false),[failure,setFailure]=useState('')
  async function start(){
    setBusy(true);setFailure('')
    try{const attempt=await createSession(id);navigate('/attempt/'+attempt.id)}catch(e){setFailure(e.message)}finally{setBusy(false)}
  }
  return <><Link className="back-link" to="/student/assignments"><ArrowLeft size={16}/> All assignments</Link><DataState loading={loading} error={error}>{a&&<><Header eyebrow={a.protocol+' · '+a.difficulty} title={a.title} description={a.description}/><div className="detail-grid"><div className="detail-main"><section className="content-card"><h2>Objective</h2><p>{a.objective}</p></section>{[['Requirements',a.requirements],['Constraints',a.constraints],['Instructions',a.instructions]].map(([label,values])=><section className="content-card" key={label}><h2>{label}</h2><ol>{values?.map(value=><li key={value}>{value}</li>)}</ol></section>)}<section className="content-card"><h2>Expected behavior</h2><p>{a.expectedBehavior}</p></section></div><aside className="detail-side"><section className="content-card"><h2>Networking concepts</h2><div className="chip-row">{a.networkingConcepts.map(c=><span key={c} className="chip">{c}</span>)}</div><p>{a.serverRequirement}</p><Status value={a.status}/><p>{a.deadline?'Due '+new Date(a.deadline).toLocaleString():'No deadline set'}</p></section><section className="content-card"><h2>Evaluation</h2><ul>{a.testCases.map(t=><li key={t.id}>{t.name} ({t.weight} weight)</li>)}</ul></section><button className="primary-button" onClick={start} disabled={busy||a.status!=='ACTIVE'}>{busy?'Starting…':'Start assignment'}<ArrowRight size={16}/></button>{failure&&<p className="form-error" role="alert">{failure}</p>}</aside></div></>}</DataState></>
}
export function SessionDetails() {
  const {id}=useParams()
  const {data,loading,error}=useRemote(getSession,id)
  return <DataState loading={loading} error={error}>{data&&(data.status==='SUBMITTED'?<section className="content-card"><h1>Assignment submitted</h1><Link to="/student/submissions">View your submissions</Link></section>:<AssignmentWorkspace key={data.id} session={data}/>)}</DataState>
}
export function StudentAttempts() {
  const {data,loading,error}=useRemote(listAttempts)
  return <><Header title="Assignment attempts" description="Resume your work or inspect a previous attempt."/><DataState loading={loading} error={error}>{data?.length?<div className="table-wrap"><table><thead><tr><th>Assignment</th><th>Attempt</th><th>Status</th><th>Started</th><th>Score</th></tr></thead><tbody>{data.map(a=><tr key={a.id}><td><Link to={'/attempt/'+a.id}>{a.assignmentTitle}</Link></td><td>{a.attemptNumber}</td><td><Status value={a.status}/></td><td>{new Date(a.startedAt).toLocaleString()}</td><td>{a.automatedScore??'—'}</td></tr>)}</tbody></table></div>:<div className="state-card">Start an assignment to record your first attempt.</div>}</DataState></>
}
export function SubmissionHistory() {
  const {data,loading,error}=useRemote(listSubmissions)
  return <><Header title="Submission history" description="Track automated scores, faculty grades and feedback."/><DataState loading={loading} error={error}>{data?.length?<div className="table-wrap"><table><thead><tr><th>Assignment</th><th>Submitted</th><th>Status</th><th>Automated</th><th>Faculty grade</th><th>Feedback</th></tr></thead><tbody>{data.map(s=><tr key={s.id}><td><Link to={'/student/submissions/'+s.id}>{s.assignmentTitle}</Link></td><td>{new Date(s.submittedAt).toLocaleString()}</td><td><Status value={s.status}/></td><td>{s.automatedScore}</td><td>{s.facultyGrade??'—'}</td><td>{s.facultyFeedback||'—'}</td></tr>)}</tbody></table></div>:<div className="state-card">No submissions yet. Complete the automated tests before submitting.</div>}</DataState></>
}
export function SubmissionDetails() {
  const {id}=useParams()
  const {data:s,loading,error}=useRemote(getSubmission,id)
  return <><Link className="back-link" to="/student/submissions"><ArrowLeft size={16}/> Submission history</Link><DataState loading={loading} error={error}>{s&&<><Header title={s.assignmentTitle} description={'Submitted '+new Date(s.submittedAt).toLocaleString()}/><div className="detail-grid"><div className="detail-main"><WorkEvidence work={s}/></div><aside className="detail-side"><section className="content-card"><h2>Faculty review</h2><Status value={s.status}/><p>Grade: {s.facultyGrade??'Pending'} / 100</p><p>{s.facultyFeedback||'Feedback will appear after faculty review.'}</p>{s.status==='RETURNED'&&<Link to={'/assignment/'+s.assignmentId}>Start a revised attempt</Link>}</section>{s.reviews.map((r,i)=><section className="content-card" key={i}><strong>{r.facultyName} · {r.status}</strong><p>{r.feedback}</p><small>{new Date(r.createdAt).toLocaleString()}</small></section>)}</aside></div></>}</DataState></>
}
export function StudentProfile() {
  const {profile}=useAuth()
  return <><Header title="My profile" description="Your laboratory account."/><section className="content-card profile-card"><dl>{['name','email','role','status'].map(key=><div key={key}><dt>{key}</dt><dd>{profile[key]}</dd></div>)}</dl></section></>
}
