import {useEffect,useMemo,useState} from 'react'
import {Link,useNavigate,useParams} from 'react-router-dom'
import {ArrowLeft,ArrowRight,BookOpen,ClipboardCheck,Clock3,Users} from 'lucide-react'
import {useAuth} from '../authContext'
import {useRemote} from '../hooks/useRemote'
import {getExperiment,listExperiments} from '../services/experimentService'
import {assignmentTests,facultyDashboard,facultySession,facultySessions,facultyStudents,facultySubmission,facultySubmissions,reviewSubmission,saveTest,setExperimentStatus,updateExperiment} from '../services/facultyService'
import {DataState,Header,Status,WorkEvidence} from './Common'

export function FacultyDashboard() {
  const {data,loading,error}=useRemote(facultyDashboard)
  const metrics=data?[
    ['Assignments',data.totalExperiments,BookOpen],['Active assignments',data.activeExperiments,BookOpen],
    ['Active attempts',data.activeSessions,Users],['Pending reviews',data.pendingReviews,Clock3],['Submissions',data.totalSubmissions,ClipboardCheck]
  ]:[]
  return <><Header eyebrow="FACULTY DASHBOARD" title="Laboratory overview" description="Monitor student work and review networking solutions."/><DataState loading={loading} error={error}><div className="metric-grid faculty-metrics">{metrics.map(([label,value,Icon])=><article className="metric-card" key={label}><span className="metric-icon"><Icon size={22}/></span><strong>{value}</strong><span>{label}</span></article>)}</div><div className="section-heading"><h2>Pending reviews</h2><Link to="/faculty/submissions">All submissions <ArrowRight size={16}/></Link></div><SubmissionsTable data={data?.pendingSubmissions}/><div className="section-heading"><h2>Recent attempts</h2></div><AttemptsTable data={data?.recentSessions}/></DataState></>
}
export function FacultyExperiments() {
  const {profile}=useAuth()
  const role=profile.role.toLowerCase()
  const {data,loading,error,reload}=useRemote(listExperiments)
  const [failure,setFailure]=useState(''),[busy,setBusy]=useState('')
  async function toggle(item) {
    setBusy(item.id);setFailure('')
    try{await setExperimentStatus(item.id,item.status==='ACTIVE'?'INACTIVE':'ACTIVE',role);reload()}catch(e){setFailure(e.message)}finally{setBusy('')}
  }
  return <><Header eyebrow={profile.role} title="Manage assignments" description="Manage the seven course assignments, deadlines and automated test cases."/>{failure&&<p className="form-error" role="alert">{failure}</p>}<DataState loading={loading} error={error}><div className="table-wrap"><table><thead><tr><th>Assignment</th><th>Protocol</th><th>Difficulty</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data?.map(a=><tr key={a.id}><td>{a.title}</td><td>{a.protocol}</td><td>{a.difficulty}</td><td>{a.deadline?new Date(a.deadline).toLocaleString():'None'}</td><td><Status value={a.status}/></td><td className="table-actions"><Link to={'/'+role+'/assignments/'+a.id+'/edit'}>Edit / tests</Link><button disabled={busy===a.id} onClick={()=>toggle(a)}>{a.status==='ACTIVE'?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div></DataState></>
}
export function FacultyExperimentForm() {
  const {id}=useParams(),navigate=useNavigate(),{profile}=useAuth()
  const role=profile.role.toLowerCase()
  const {data,loading,error}=useRemote(getExperiment,id)
  const testKey=useMemo(()=>({id,role}),[id,role])
  const {data:tests,reload}=useRemote(assignmentTests,testKey)
  const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[failure,setFailure]=useState('')
  const [testForm,setTestForm]=useState(null),[testError,setTestError]=useState(''),[testBusy,setTestBusy]=useState(false)
  useEffect(()=>{if(data)setForm({...data,...Object.fromEntries(['instructions','requirements','constraints','networkingConcepts'].map(key=>[key,data[key].join('\n')])),deadline:data.deadline?new Date(data.deadline).toISOString().slice(0,16):''})},[data])
  function change(e){setForm(current=>({...current,[e.target.name]:e.target.value}))}
  async function submit(e){
    e.preventDefault();setBusy(true);setFailure('')
    const payload={...form,...Object.fromEntries(['instructions','requirements','constraints','networkingConcepts'].map(key=>[key,form[key].split('\n').map(s=>s.trim()).filter(Boolean)])),deadline:form.deadline?new Date(form.deadline+'Z').toISOString():null}
    try{await updateExperiment(id,payload,role);navigate('/'+role+'/assignments')}catch(e){setFailure(e.message)}finally{setBusy(false)}
  }
  async function testSubmit(e){
    e.preventDefault();setTestBusy(true);setTestError('')
    try{
      const configuration=JSON.parse(testForm.configuration)
      await saveTest(id,{...testForm,weight:Number(testForm.weight),configuration},role)
      setTestForm(null);reload()
    }catch(e){setTestError(e.message)}finally{setTestBusy(false)}
  }
  const editTest=test=>{setTestError('');setTestForm({...test,configuration:JSON.stringify(test.configuration,null,2)})}
  return <><Link className="back-link" to={'/'+role+'/assignments'}><ArrowLeft size={16}/> Assignments</Link><Header title="Edit assignment and evaluation" description="Changes are stored in PostgreSQL and applied to future executions."/><DataState loading={loading} error={error}>{form&&<form className="content-card experiment-form" onSubmit={submit}>
    <label>Title<input required name="title" maxLength={160} value={form.title} onChange={change}/></label>
    {['description','objective','expectedBehavior','requirements','constraints','instructions','networkingConcepts'].map(key=><label key={key}>{({expectedBehavior:'Expected behavior',networkingConcepts:'Networking concepts'})[key]||key[0].toUpperCase()+key.slice(1)}{['requirements','constraints','instructions','networkingConcepts'].includes(key)&&<small>One item per line</small>}<textarea required name={key} value={form[key]} onChange={change} rows={3} maxLength={10000}/></label>)}
    <div className="form-row"><label>Difficulty<select name="difficulty" value={form.difficulty} onChange={change}>{['EASY','MEDIUM','HARD'].map(value=><option key={value}>{value}</option>)}</select></label><label>Deadline (UTC)<input type="datetime-local" name="deadline" value={form.deadline} onChange={change}/></label></div>
    {failure&&<p className="form-error" role="alert">{failure}</p>}<button className="primary-button" disabled={busy}>{busy?'Saving…':'Save assignment'}</button>
  </form>}</DataState>
  <section className="content-card"><div className="section-heading"><h2>Automated test cases</h2><button className="secondary-button" onClick={()=>editTest({name:'',weight:10,enabled:true,configuration:{input:{}}})}>Add test case</button></div><p>Input JSON is passed to solve(input). Each verdict is verified against actual network traffic. The final score uses the enabled test weights.</p><div className="table-wrap"><table><thead><tr><th>Name</th><th>Weight</th><th>Status</th><th>Configuration</th><th></th></tr></thead><tbody>{tests?.map(t=><tr key={t.id}><td>{t.name}</td><td>{t.weight}</td><td>{t.enabled?'Enabled':'Disabled'}</td><td><code>{JSON.stringify(t.configuration)}</code></td><td><button onClick={()=>editTest(t)}>Edit test</button></td></tr>)}</tbody></table></div>
  {testForm&&<form className="experiment-form test-editor" onSubmit={testSubmit}><h3>{testForm.id?'Edit test case':'New test case'}</h3><label>Test name<input required maxLength={255} value={testForm.name} onChange={e=>setTestForm({...testForm,name:e.target.value})}/></label><label>Weight<input type="number" min={1} max={100} required value={testForm.weight} onChange={e=>setTestForm({...testForm,weight:e.target.value})}/></label><label>Test configuration JSON<textarea className="code-editor" rows={6} required value={testForm.configuration} onChange={e=>setTestForm({...testForm,configuration:e.target.value})}/></label><label className="checkbox-label"><input type="checkbox" checked={testForm.enabled} onChange={e=>setTestForm({...testForm,enabled:e.target.checked})}/> Enabled</label>{testError&&<p className="form-error" role="alert">{testError}</p>}<div className="terminal-actions"><button className="primary-button" disabled={testBusy}>{testBusy?'Saving…':'Save test case'}</button><button type="button" className="secondary-button" onClick={()=>setTestForm(null)}>Cancel</button></div></form>}
  </section></>
}
function AttemptsTable({data=[]}) {
  return data.length?<div className="table-wrap"><table><thead><tr><th>Student</th><th>Assignment</th><th>Attempt</th><th>Status</th><th>Started</th><th>Score</th><th></th></tr></thead><tbody>{data.map(a=><tr key={a.id}><td>{a.studentName}</td><td>{a.assignmentTitle}</td><td>{a.attemptNumber}</td><td><Status value={a.status}/></td><td>{new Date(a.startedAt).toLocaleString()}</td><td>{a.automatedScore??'—'}</td><td><Link to={'/faculty/sessions/'+a.id}>Inspect work</Link></td></tr>)}</tbody></table></div>:<div className="state-card">No attempts found.</div>
}
export function FacultySessions() {
  const [filters,setFilters]=useState({assignmentId:'',status:'',date:''}),[query,setQuery]=useState('')
  const {data,loading,error,reload}=useRemote(facultySessions,query)
  const {data:assignments}=useRemote(listExperiments)
  return <><Header title="Student attempts" description="Inspect student code, execution output and network evidence." action={<button className="secondary-button" onClick={reload}>Refresh</button>}/><form className="filter-bar" onSubmit={e=>{e.preventDefault();setQuery(new URLSearchParams(Object.entries(filters).filter(([,v])=>v)).toString())}}><select aria-label="Assignment filter" value={filters.assignmentId} onChange={e=>setFilters({...filters,assignmentId:e.target.value})}><option value="">All assignments</option>{assignments?.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select><select aria-label="Status filter" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All statuses</option>{['STARTING','RUNNING','TESTED','SUBMITTED','FAILED'].map(s=><option key={s}>{s}</option>)}</select><input type="date" aria-label="Start date filter" value={filters.date} onChange={e=>setFilters({...filters,date:e.target.value})}/><button className="secondary-button">Apply filters</button></form><DataState loading={loading} error={error}><AttemptsTable data={data}/></DataState></>
}
export function FacultyAttempt() {
  const {id}=useParams()
  const {data,loading,error}=useRemote(facultySession,id)
  return <><Link className="back-link" to="/faculty/sessions">All attempts</Link><DataState loading={loading} error={error}>{data&&<><Header title={data.assignmentTitle} description={data.studentName+' · Attempt '+data.attemptNumber}/><Status value={data.status}/><WorkEvidence work={data}/></>}</DataState></>
}
const loadStudents=()=>Promise.all([facultyStudents(),facultySessions()])
const loadStudentDetails=()=>Promise.all([facultyStudents(),facultySessions(),facultySubmissions()])
export function FacultyStudentDetails() {
  const {id}=useParams()
  const {data,loading,error}=useRemote(loadStudentDetails)
  const [students,attempts,submissions]=data||[[],[],[]]
  const student=students.find(s=>s.id===id)
  return <><Link className="back-link" to="/faculty/students">All students</Link><DataState loading={loading} error={error}>{student?<><Header title={student.name} description={student.email+' · '+student.status}/><h2>Assignment attempts</h2><AttemptsTable data={attempts.filter(a=>a.studentId===id)}/><h2>Submissions and grades</h2><SubmissionsTable data={submissions.filter(s=>s.studentId===id)}/></>:<div className="state-card">Student not found.</div>}</DataState></>
}
export function FacultyStudents() {
  const {data,loading,error}=useRemote(loadStudents)
  const [students,attempts]=data||[[],[]]
  return <><Header title="Students" description="Registered students and their assignment activity."/><DataState loading={loading} error={error}><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Attempts</th><th>Latest score</th></tr></thead><tbody>{students.map(s=>{const work=attempts.filter(a=>a.studentId===s.id);return <tr key={s.id}><td><Link to={'/faculty/students/'+s.id}>{s.name}</Link></td><td>{s.email}</td><td><Status value={s.status}/></td><td>{work.length}</td><td>{work[0]?.automatedScore??'—'}</td></tr>})}</tbody></table></div></DataState></>
}
function SubmissionsTable({data=[]}) {
  return data.length?<div className="table-wrap"><table><thead><tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Status</th><th>Automated</th><th>Faculty</th><th></th></tr></thead><tbody>{data.map(s=><tr key={s.id}><td>{s.studentName}</td><td>{s.assignmentTitle}</td><td>{new Date(s.submittedAt).toLocaleString()}</td><td><Status value={s.status}/></td><td>{s.automatedScore}</td><td>{s.facultyGrade??'—'}</td><td><Link to={'/faculty/submissions/'+s.id}>Review</Link></td></tr>)}</tbody></table></div>:<div className="state-card">No submissions found.</div>
}
export function FacultySubmissions() {
  const {data,loading,error,reload}=useRemote(facultySubmissions)
  return <><Header title="Student submissions" description="Review actual solution code, test results and transcripts." action={<button className="secondary-button" onClick={reload}>Refresh</button>}/><DataState loading={loading} error={error}><SubmissionsTable data={data}/></DataState></>
}
export function FacultyReview() {
  const {id}=useParams()
  const {data,loading,error,reload}=useRemote(facultySubmission,id)
  const [grade,setGrade]=useState(''),[feedback,setFeedback]=useState(''),[status,setStatus]=useState('REVIEWED')
  const [busy,setBusy]=useState(false),[failure,setFailure]=useState(''),[saved,setSaved]=useState(false)
  useEffect(()=>{if(data){setGrade(data.facultyGrade??'');setFeedback(data.facultyFeedback||'')}},[data])
  async function submit(e){e.preventDefault();setBusy(true);setFailure('');setSaved(false);try{await reviewSubmission(id,grade,feedback,status);setSaved(true);reload()}catch(e){setFailure(e.message)}finally{setBusy(false)}}
  return <><Link className="back-link" to="/faculty/submissions">All submissions</Link><DataState loading={loading} error={error}>{data&&<><Header title={data.assignmentTitle} description={data.studentName+' · Submitted '+new Date(data.submittedAt).toLocaleString()}/><div className="detail-grid"><div className="detail-main"><WorkEvidence work={data}/></div><aside className="detail-side"><form className="content-card experiment-form" onSubmit={submit}><h2>Faculty review</h2><Status value={data.status}/><label>Grade out of 100<input type="number" min={0} max={100} step="0.01" required value={grade} onChange={e=>setGrade(e.target.value)}/></label><label>Feedback<textarea rows={6} required maxLength={10000} value={feedback} onChange={e=>setFeedback(e.target.value)}/></label><label>Decision<select value={status} onChange={e=>setStatus(e.target.value)}>{['REVIEWED','RETURNED','REJECTED'].map(s=><option key={s}>{s}</option>)}</select></label>{failure&&<p className="form-error" role="alert">{failure}</p>}{saved&&<p className="success-note" role="status">Review saved.</p>}<button className="primary-button" disabled={busy}>{busy?'Saving…':'Save review'}</button></form>{data.reviews.map((r,i)=><section className="content-card" key={i}><strong>{r.facultyName} · {r.status}</strong><p>{r.feedback}</p><small>{new Date(r.createdAt).toLocaleString()}</small></section>)}</aside></div></>}</DataState></>
}
