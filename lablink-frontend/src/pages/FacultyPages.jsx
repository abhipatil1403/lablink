import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, Clock3, Plus, Users } from 'lucide-react'
import { useRemote } from '../hooks/useRemote'
import { getExperiment, listExperiments } from '../services/experimentService'
import { createExperiment, facultyDashboard, facultySessions, facultySubmission, facultySubmissions, reviewSubmission, setExperimentStatus, updateExperiment } from '../services/facultyService'

function DataState({ loading, error, children }) {
  if (loading) return <div className="state-card" role="status">Loading LabLink data…</div>
  if (error) return <div className="state-card state-error" role="alert">{error}</div>
  return children
}

function Header({ eyebrow, title, description, action }) {
  return <div className="page-heading heading-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

export function FacultyDashboard() {
  const { data, loading, error } = useRemote(facultyDashboard)
  const metrics = data ? [
    ['Total experiments', data.totalExperiments, BookOpen],
    ['Active experiments', data.activeExperiments, BookOpen],
    ['Active sessions', data.activeSessions, Users],
    ['Pending reviews', data.pendingReviews, Clock3],
    ['Total submissions', data.totalSubmissions, ClipboardCheck],
  ] : []
  return <><Header eyebrow="FACULTY DASHBOARD" title="Laboratory overview" description="Monitor student activity and review submitted work." /><DataState loading={loading} error={error}>
    <div className="metric-grid faculty-metrics">{metrics.map(([label, value, Icon]) => <article className="metric-card" key={label}><span className="metric-icon"><Icon size={21} /></span><strong>{value}</strong><span>{label}</span></article>)}</div>
    <div className="section-heading"><h2>Pending reviews</h2><Link className="text-link" to="/faculty/submissions">View all <ArrowRight size={16} /></Link></div>
    {data?.pendingSubmissions?.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Experiment</th><th>Submitted</th><th></th></tr></thead><tbody>{data.pendingSubmissions.map(item => <tr key={item.id}><td>{item.studentName}</td><td>{item.experimentTitle}</td><td>{new Date(item.submittedAt).toLocaleString()}</td><td><Link to={`/faculty/submissions/${item.id}`}>Review</Link></td></tr>)}</tbody></table></div> : <div className="state-card">No submissions are waiting for review.</div>}
    <div className="section-heading"><h2>Recent sessions</h2><Link className="text-link" to="/faculty/sessions">View all <ArrowRight size={16} /></Link></div>
    {data?.recentSessions?.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Experiment</th><th>Status</th><th>Started</th></tr></thead><tbody>{data.recentSessions.map(item => <tr key={item.id}><td>{item.studentName}</td><td>{item.experimentTitle}</td><td><span className="badge badge-muted">{item.status}</span></td><td>{new Date(item.startTime).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="state-card">No student sessions yet.</div>}
  </DataState></>
}

export function FacultyExperiments() {
  const { data, loading, error, reload } = useRemote(listExperiments)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState('')
  async function toggle(item) {
    setBusyId(item.id)
    setActionError('')
    try { await setExperimentStatus(item.id, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); reload() }
    catch (failure) { setActionError(failure.message) }
    finally { setBusyId('') }
  }
  return <><Header eyebrow="FACULTY" title="Manage experiments" description="Create labs and control which TCP experiments students can start." action={<Link className="primary-button button-link" to="/faculty/experiments/new"><Plus size={17} /> New experiment</Link>} />
    {actionError && <p className="form-error" role="alert">{actionError}</p>}<DataState loading={loading} error={error}>{data?.length ? <div className="table-wrap"><table><thead><tr><th>Title</th><th>Protocol</th><th>Difficulty</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.map(item => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.protocol}</td><td>{item.difficulty}</td><td><span className={`badge ${item.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>{item.status}</span></td><td className="table-actions"><Link to={`/faculty/experiments/${item.id}/edit`}>Edit</Link><button disabled={busyId === item.id || (item.status !== 'ACTIVE' && item.experimentType !== 'tcp-client-server')} onClick={() => toggle(item)}>{item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div> : <div className="state-card">No experiments found.</div>}</DataState>
  </>
}

const emptyExperiment = { title: '', description: '', objective: '', instructions: '', protocol: 'TCP', difficulty: 'EASY', expectedOutput: '', serverRequirement: '', networkingConcepts: '' }
const loadEdit = id => id ? getExperiment(id) : Promise.resolve(null)

export function FacultyExperimentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: existing, loading, error } = useRemote(loadEdit, id)
  const [form, setForm] = useState(emptyExperiment)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  useEffect(() => { if (existing) setForm({ ...existing, instructions: existing.instructions?.join('\n') || '', networkingConcepts: existing.networkingConcepts?.join(', ') || '' }) }, [existing])
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = {
      title: form.title, description: form.description, objective: form.objective,
      instructions: form.instructions.split('\n').map(line => line.trim()).filter(Boolean),
      protocol: form.protocol, difficulty: form.difficulty, expectedOutput: form.expectedOutput,
      serverRequirement: form.serverRequirement,
      networkingConcepts: form.networkingConcepts.split(',').map(item => item.trim()).filter(Boolean),
    }
    try { if (id) await updateExperiment(id, payload); else await createExperiment(payload); navigate('/faculty/experiments') }
    catch (failure) { setSaveError(failure.message) }
    finally { setSaving(false) }
  }
  return <><Link className="back-link" to="/faculty/experiments"><ArrowLeft size={16} /> Experiments</Link><Header eyebrow="FACULTY" title={id ? 'Edit experiment' : 'Create experiment'} description="Add clear learning objectives and instructions for students." /><DataState loading={loading} error={error}><form className="content-card experiment-form" onSubmit={submit}>
    <label>Title<input name="title" required maxLength="120" value={form.title} onChange={change} /></label>
    <label>Short description<textarea name="description" required maxLength="500" rows="2" value={form.description} onChange={change} /></label>
    <label>Objective<textarea name="objective" required maxLength="1000" rows="3" value={form.objective} onChange={change} /></label>
    <label>Instructions <small>One step per line</small><textarea name="instructions" required rows="5" value={form.instructions} onChange={change} /></label>
    <div className="form-row"><label>Protocol<select name="protocol" value={form.protocol} onChange={change}>{['TCP', 'UDP', 'DNS', 'HTTP', 'ICMP'].map(value => <option key={value}>{value}</option>)}</select></label><label>Difficulty<select name="difficulty" value={form.difficulty} onChange={change}>{['EASY', 'MEDIUM', 'HARD'].map(value => <option key={value}>{value}</option>)}</select></label></div>
    <label>Expected output<textarea name="expectedOutput" required maxLength="500" rows="2" value={form.expectedOutput} onChange={change} /></label>
    <label>Server requirement<input name="serverRequirement" required maxLength="200" value={form.serverRequirement} onChange={change} /></label>
    <label>Networking concepts <small>Comma separated</small><input name="networkingConcepts" value={form.networkingConcepts} onChange={change} /></label>
    {saveError && <p className="form-error" role="alert">{saveError}</p>}<button className="primary-button" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create experiment'}</button>
  </form></DataState></>
}

export function FacultySessions() {
  const [filters, setFilters] = useState({ experimentId: '', status: '', date: '' })
  const [query, setQuery] = useState('')
  const { data, loading, error } = useRemote(facultySessions, query)
  const { data: experiments } = useRemote(listExperiments)
  function apply(event) {
    event.preventDefault()
    setQuery(new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString())
  }
  return <><Header eyebrow="FACULTY" title="Student sessions" description="Monitor experiment activity and connection states." /><form className="filter-bar" onSubmit={apply}><select aria-label="Filter by experiment" value={filters.experimentId} onChange={event => setFilters(current => ({ ...current, experimentId: event.target.value }))}><option value="">All experiments</option>{experiments?.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select aria-label="Filter by status" value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{['STARTING', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED'].map(value => <option key={value}>{value}</option>)}</select><input type="date" aria-label="Filter by date" value={filters.date} onChange={event => setFilters(current => ({ ...current, date: event.target.value }))} /><button className="secondary-button">Apply filters</button></form><DataState loading={loading} error={error}>{data?.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Experiment</th><th>Session ID</th><th>Status</th><th>Start</th><th>End</th></tr></thead><tbody>{data.map(item => <tr key={item.id}><td>{item.studentName}</td><td>{item.experimentTitle}</td><td><code>{item.id.slice(0, 8)}</code></td><td><span className="badge badge-muted">{item.status}</span></td><td>{new Date(item.startTime).toLocaleString()}</td><td>{item.endTime ? new Date(item.endTime).toLocaleString() : '—'}</td></tr>)}</tbody></table></div> : <div className="state-card">No sessions match these filters.</div>}</DataState></>
}

export function FacultySubmissions() {
  const { data, loading, error } = useRemote(facultySubmissions)
  return <><Header eyebrow="FACULTY" title="Student submissions" description="Review experiment logs, observations, and grades." /><DataState loading={loading} error={error}>{data?.length ? <div className="table-wrap"><table><thead><tr><th>Student</th><th>Experiment</th><th>Submitted</th><th>Status</th><th>Grade</th><th></th></tr></thead><tbody>{data.map(item => <tr key={item.id}><td>{item.studentName}</td><td>{item.experimentTitle}</td><td>{new Date(item.submittedAt).toLocaleString()}</td><td><span className={`badge ${item.status === 'REVIEWED' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td><td>{item.grade ?? '—'}</td><td><Link to={`/faculty/submissions/${item.id}`}>Review</Link></td></tr>)}</tbody></table></div> : <div className="state-card">No student submissions yet.</div>}</DataState></>
}

export function FacultyReview() {
  const { id } = useParams()
  const { data, loading, error, reload } = useRemote(facultySubmission, id)
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (data) { setGrade(data.grade ?? ''); setFeedback(data.feedback || '') } }, [data])
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    try { await reviewSubmission(id, grade, feedback); setSaved(true); reload() }
    catch (failure) { setSaveError(failure.message) }
    finally { setSaving(false) }
  }
  return <><Link className="back-link" to="/faculty/submissions"><ArrowLeft size={16} /> Submissions</Link><DataState loading={loading} error={error}>{data && <><Header eyebrow={`SESSION #${data.sessionId.slice(0, 8)}`} title={data.experimentTitle} description={`${data.studentName} · Submitted ${new Date(data.submittedAt).toLocaleString()}`} /><div className="detail-grid"><div className="detail-main"><section className="content-card"><h2>Student observation</h2><p>{data.result}</p></section><section className="content-card"><h2>Network transcript</h2><div className="submission-logs">{data.logs?.map((entry, index) => <div key={`${entry.at}-${index}`}><strong>{entry.direction === 'STUDENT' ? 'student>' : 'server>'}</strong><code>{entry.text}</code></div>)}</div></section></div><aside className="detail-side"><form className="content-card experiment-form" onSubmit={submit}><h2>Grade and feedback</h2><label>Grade out of 100<input type="number" min="0" max="100" required value={grade} onChange={event => setGrade(event.target.value)} /></label><label>Feedback<textarea required maxLength="2000" rows="6" value={feedback} onChange={event => setFeedback(event.target.value)} /></label>{saveError && <p className="form-error" role="alert">{saveError}</p>}{saved && <p className="success-note" role="status">Review saved successfully.</p>}<button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save review'}</button></form></aside></div></>}</DataState></>
}
