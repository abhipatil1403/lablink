import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardList, Clock3, Server, Wifi } from 'lucide-react'
import { useAuth } from '../authContext'
import { getExperiment, listExperiments } from '../services/experimentService'
import { createSession, getSession, getSubmission, listSubmissions } from '../services/sessionService'
import { TcpTerminal } from '../TcpTerminal'

function useData(load, key) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    load(key).then(value => { if (active) setData(value) }).catch(failure => { if (active) setError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load, key])
  return { data, loading, error }
}

function State({ loading, error, empty, children }) {
  if (loading) return <div className="state-card" role="status">Loading LabLink data…</div>
  if (error) return <div className="state-card state-error" role="alert">{error}</div>
  if (empty) return <div className="state-card">No records available yet.</div>
  return children
}

const loadDashboard = () => Promise.all([listExperiments(), listSubmissions()])
const loadExperiments = () => listExperiments()
const loadHistory = () => Promise.all([listSubmissions(), listExperiments()])

export function StudentDashboard() {
  const { profile } = useAuth()
  const { data, loading, error } = useData(loadDashboard)
  const [experiments, submissions] = data || [[], []]
  const available = experiments.filter(item => item.status === 'ACTIVE')
  const metrics = [
    { label: 'Available experiments', value: available.length, icon: BookOpen },
    { label: 'Completed experiments', value: new Set(submissions.map(item => item.experimentId)).size, icon: CheckCircle2 },
    { label: 'Pending reviews', value: submissions.filter(item => item.status === 'SUBMITTED').length, icon: Clock3 },
    { label: 'Total submissions', value: submissions.length, icon: ClipboardList },
  ]
  return <><div className="page-heading"><p className="eyebrow">STUDENT DASHBOARD</p><h1>Welcome, {profile.name?.split(' ')[0]}</h1><p>Choose an experiment and learn from real network responses.</p></div><State loading={loading} error={error}>
    <section className="metric-grid" aria-label="Student statistics">{metrics.map(({ label, value, icon: Icon }) => <article className="metric-card" key={label}><span className="metric-icon"><Icon size={22} /></span><strong>{value}</strong><span>{label}</span></article>)}</section>
    <div className="section-heading"><div><p className="eyebrow">LABORATORY</p><h2>Available experiments</h2></div><Link to="/student/experiments" className="text-link">View all <ArrowRight size={16} /></Link></div>
    {available.length ? <div className="experiment-grid">{available.map(item => <ExperimentCard key={item.id} experiment={item} />)}</div> : <div className="state-card">No active experiments are available.</div>}
  </State></>
}

export function ExperimentCatalog() {
  const { data, loading, error } = useData(loadExperiments)
  return <><div className="page-heading"><p className="eyebrow">EXPLORE</p><h1>Experiment catalog</h1><p>Browse current and upcoming computer networking labs.</p></div><State loading={loading} error={error} empty={data?.length === 0}><div className="experiment-grid">{data?.map(item => <ExperimentCard key={item.id} experiment={item} />)}</div></State></>
}

function ExperimentCard({ experiment }) {
  return <article className="experiment-card"><div className="card-top"><span className="protocol-icon"><Wifi size={21} /></span><span className={`badge ${experiment.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>{experiment.status === 'ACTIVE' ? 'Available' : 'Coming soon'}</span></div><div className="chip-row"><span className="chip">{experiment.protocol}</span><span className="chip">{experiment.difficulty}</span></div><h3>{experiment.title}</h3><p>{experiment.description}</p><Link to={`/experiment/${experiment.id}`} className="card-link">View experiment <ArrowRight size={16} /></Link></article>
}

export function ExperimentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: experiment, loading, error } = useData(getExperiment, id)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const available = experiment?.status === 'ACTIVE' && experiment?.experimentType === 'tcp-client-server'
  async function start() {
    setStarting(true)
    setStartError('')
    try { const session = await createSession(id); navigate(`/session/${session.id}`) }
    catch (failure) { setStartError(failure.message); setStarting(false) }
  }
  return <><Link className="back-link" to="/student/experiments"><ArrowLeft size={16} /> All experiments</Link><State loading={loading} error={error}>
    {experiment && <><div className="page-heading detail-heading"><div className="chip-row"><span className="chip">{experiment.protocol}</span><span className="chip">{experiment.difficulty}</span><span className={`badge ${experiment.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>{experiment.status === 'ACTIVE' ? 'Available' : 'Coming soon'}</span></div><h1>{experiment.title}</h1><p>{experiment.description}</p></div><div className="detail-grid"><div className="detail-main"><section className="content-card"><h2>Objective</h2><p>{experiment.objective}</p></section><section className="content-card"><h2>Instructions</h2><ol>{experiment.instructions?.map(step => <li key={step}>{step}</li>)}</ol></section><section className="content-card"><h2>Expected output</h2><p>{experiment.expectedOutput}</p></section></div><aside className="detail-side"><section className="content-card"><h2>Networking concepts</h2><div className="chip-row">{experiment.networkingConcepts?.map(concept => <span className="chip" key={concept}>{concept}</span>)}</div></section><section className="content-card"><h2>Server requirement</h2><p className="server-line"><Server size={18} />{experiment.serverRequirement}</p></section><button className="primary-button" disabled={!available || starting} onClick={start}>{starting ? 'Starting…' : 'Start experiment'} <ArrowRight size={17} /></button>{startError && <p className="form-error" role="alert">{startError}</p>}{!available && <p className="subtle-note">This experiment is not available yet.</p>}</aside></div></>}
  </State></>
}

export function SubmissionHistory() {
  const { data, loading, error } = useData(loadHistory)
  const [submissions, experiments] = data || [[], []]
  const titles = Object.fromEntries(experiments.map(item => [item.id, item.title]))
  return <><div className="page-heading"><p className="eyebrow">YOUR WORK</p><h1>Submission history</h1><p>Track reviews, grades, and feedback from faculty.</p></div><State loading={loading} error={error} empty={submissions.length === 0}><div className="table-wrap"><table><thead><tr><th>Experiment</th><th>Submitted</th><th>Status</th><th>Grade</th><th>Feedback</th></tr></thead><tbody>{submissions.map(item => <tr key={item.id}><td><Link to={`/student/submissions/${item.id}`}>{titles[item.experimentId] || item.experimentId}</Link></td><td>{new Date(item.submittedAt).toLocaleString()}</td><td><span className={`badge ${item.status === 'REVIEWED' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td><td>{item.grade ?? '—'}</td><td>{item.feedback || '—'}</td></tr>)}</tbody></table></div></State></>
}

export function SubmissionDetails() {
  const { id } = useParams()
  const { data: submission, loading, error } = useData(getSubmission, id)
  return <><Link className="back-link" to="/student/submissions"><ArrowLeft size={16} /> Submission history</Link><State loading={loading} error={error}>
    {submission && <><div className="page-heading"><p className="eyebrow">SUBMISSION #{submission.id.slice(0, 8)}</p><h1>Experiment result</h1><p>Submitted {new Date(submission.submittedAt).toLocaleString()}</p></div><div className="detail-grid"><div className="detail-main"><section className="content-card"><h2>Your observation</h2><p>{submission.result}</p></section><section className="content-card"><h2>Session transcript</h2><div className="submission-logs">{submission.logs?.map((entry, index) => <div key={`${entry.at}-${index}`}><strong>{entry.direction === 'STUDENT' ? 'student>' : 'server>'}</strong><code>{entry.text}</code></div>)}</div></section></div><aside className="detail-side"><section className="content-card"><h2>Review</h2><p><span className={`badge ${submission.status === 'REVIEWED' ? 'badge-success' : 'badge-warning'}`}>{submission.status}</span></p><dl className="review-summary"><dt>Grade</dt><dd>{submission.grade ?? 'Pending review'}</dd><dt>Feedback</dt><dd>{submission.feedback || 'Faculty feedback will appear here.'}</dd></dl></section></aside></div></>}
  </State></>
}

export function StudentProfile() {
  const { profile } = useAuth()
  return <><div className="page-heading"><p className="eyebrow">ACCOUNT</p><h1>My profile</h1><p>Your account details and laboratory access.</p></div><section className="content-card profile-card"><dl><div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Role</dt><dd>{profile.role}</dd></div><div><dt>Status</dt><dd><span className="badge badge-success">{profile.status}</span></dd></div></dl></section></>
}

export function SessionDetails() {
  const { id } = useParams()
  const { data: session, loading, error } = useData(getSession, id)
  return <State loading={loading} error={error}>{session && (session.status === 'COMPLETED'
    ? <section className="content-card"><h1>Session submitted</h1><p>Your work is available in <Link to="/student/submissions">submission history</Link>.</p></section>
    : <TcpTerminal key={session.id} session={session} />)}</State>
}
