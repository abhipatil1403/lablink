import {useState} from 'react'
import {Link,useNavigate,useParams} from 'react-router-dom'
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,Code2,Compass,FileCheck,Globe,Network,Radio,Server,Zap} from 'lucide-react'
import {useAuth} from '../authContext'
import {useRemote} from '../hooks/useRemote'
import {getExperiment,listExperiments} from '../services/experimentService'
import {createSession,getSession,getSubmission,listSubmissions,listAttempts} from '../services/sessionService'
import {AssignmentWorkspace} from '../AssignmentWorkspace'
import {DataState,Header,Status,WorkEvidence} from './Common'

const loadDashboard=()=>Promise.all([listExperiments(),listSubmissions()])

function getProtocolIcon(protocol) {
  switch ((protocol || '').toUpperCase()) {
    case 'TCP': return <Network size={20} />
    case 'UDP': return <Radio size={20} />
    case 'HTTP':
    case 'REST': return <Globe size={20} />
    case 'DNS': return <Compass size={20} />
    case 'WEBSOCKET': return <Zap size={20} />
    default: return <Server size={20} />
  }
}

function AssignmentCard({assignment}) {
  const concepts = assignment.networkingConcepts || assignment.concepts || []
  const submissionStatus = assignment.submissionStatus || 'NOT_STARTED'
  const statusFormatted = typeof submissionStatus === 'string' ? submissionStatus.replaceAll('_', ' ') : 'NOT STARTED'
  const attemptCount = assignment.attempts ?? 0

  return (
    <article className="experiment-card">
      <div className="card-top">
        <span className="protocol-icon" title={assignment.protocol + ' Protocol'}>
          {getProtocolIcon(assignment.protocol)}
        </span>
        <Status value={assignment.status || 'ACTIVE'}/>
      </div>
      <div className="chip-row">
        <span className="chip">{assignment.protocol}</span>
        <span className="chip">{assignment.difficulty}</span>
      </div>
      <h3>{assignment.title}</h3>
      <p>{assignment.description}</p>
      <div className="chip-row">
        {concepts.map(concept => <span className="chip" key={concept}>{concept}</span>)}
      </div>
      <p className="subtle-note">
        {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'} · {statusFormatted}
        {assignment.latestScore !== null && assignment.latestScore !== undefined ? ` · Score: ${assignment.latestScore}/100` : ''}
        {assignment.deadline && !isNaN(new Date(assignment.deadline).getTime()) ? ' · Due ' + new Date(assignment.deadline).toLocaleString() : ''}
      </p>
      <Link className="card-link" to={'/assignment/' + assignment.id}>
        View assignment <ArrowRight size={16}/>
      </Link>
    </article>
  )
}

export function StudentDashboard() {
  const {profile} = useAuth()
  const {data,loading,error} = useRemote(loadDashboard, null, {interval: 4000})
  const [assignments,submissions] = Array.isArray(data) ? data : [[],[]]
  const validAssignments = Array.isArray(assignments) ? assignments : []
  const validSubmissions = Array.isArray(submissions) ? submissions : []

  const metrics = [
    ['Available assignments', validAssignments.filter(a => a.status === 'ACTIVE').length, Code2],
    ['Submitted assignments', new Set(validSubmissions.map(s => s.assignmentId)).size, CheckCircle2],
    ['Pending reviews', validSubmissions.filter(s => s.status === 'SUBMITTED').length, Clock3],
    ['Total submissions', validSubmissions.length, FileCheck]
  ]

  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Student'

  return (
    <>
      <Header
        eyebrow="STUDENT DASHBOARD"
        title={'Welcome, ' + firstName}
        description="Solve seven networking assignments using actual network services."
      />
      <DataState loading={loading} error={error}>
        <div className="metric-grid">
          {metrics.map(([label,value,Icon]) => (
            <article key={label} className="metric-card">
              <span className="metric-icon"><Icon size={22}/></span>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
        <div className="section-heading">
          <h2>Assignments</h2>
          <Link className="text-link" to="/student/assignments">View all <ArrowRight size={16}/></Link>
        </div>
        <div className="experiment-grid">
          {validAssignments.map(a => <AssignmentCard key={a.id} assignment={a}/>)}
        </div>
      </DataState>
    </>
  )
}

export function ExperimentCatalog() {
  const {data,loading,error} = useRemote(listExperiments, null, {interval: 5000})
  const list = Array.isArray(data) ? data : []
  return (
    <>
      <Header
        eyebrow="ASSIGNMENTS"
        title="Assignment catalog"
        description="TCP, UDP, HTTP, DNS and network monitoring programming challenges."
      />
      <DataState loading={loading} error={error}>
        <div className="experiment-grid">
          {list.map(a => <AssignmentCard key={a.id} assignment={a}/>)}
        </div>
      </DataState>
    </>
  )
}

export function ExperimentDetails() {
  const {id} = useParams()
  const navigate = useNavigate()
  const {data: a, loading, error} = useRemote(getExperiment, id, {interval: 5000})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  async function start() {
    setBusy(true)
    setFailure('')
    try {
      const attempt = await createSession(id)
      navigate('/attempt/' + attempt.id)
    } catch(e) {
      setFailure(e.message)
    } finally {
      setBusy(false)
    }
  }

  const concepts = a?.networkingConcepts || a?.concepts || []
  const testCases = Array.isArray(a?.testCases) ? a.testCases : []

  return (
    <>
      <Link className="back-link" to="/student/assignments"><ArrowLeft size={16}/> All assignments</Link>
      <DataState loading={loading} error={error}>
        {a && (
          <>
            <Header eyebrow={a.protocol + ' · ' + a.difficulty} title={a.title} description={a.description}/>
            <div className="detail-grid">
              <div className="detail-main">
                <section className="content-card">
                  <h2>Objective</h2>
                  <p>{a.objective || a.description}</p>
                </section>
                {[
                  ['Requirements', a.requirements || []],
                  ['Constraints', a.constraints || []],
                  ['Instructions', a.instructions || []]
                ].map(([label, values]) => (
                  <section className="content-card" key={label}>
                    <h2>{label}</h2>
                    <ol>{(values || []).map(value => <li key={value}>{value}</li>)}</ol>
                  </section>
                ))}
                <section className="content-card">
                  <h2>Expected behavior</h2>
                  <p>{a.expectedBehavior || a.description}</p>
                </section>
              </div>
              <aside className="detail-side">
                <section className="content-card">
                  <h2>Networking concepts</h2>
                  <div className="chip-row">
                    {concepts.map(c => <span key={c} className="chip">{c}</span>)}
                  </div>
                  <p>{a.serverRequirement || 'Controlled network service'}</p>
                  <Status value={a.status || 'ACTIVE'}/>
                  <p>{a.deadline && !isNaN(new Date(a.deadline).getTime()) ? 'Due ' + new Date(a.deadline).toLocaleString() : 'No deadline set'}</p>
                  {a.attempts != null && (
                    <p className="subtle-note" style={{marginTop: '0.6rem'}}>
                      <strong>Your status:</strong> {typeof a.submissionStatus === 'string' ? a.submissionStatus.replaceAll('_', ' ') : 'NOT STARTED'} ({a.attempts} {a.attempts === 1 ? 'attempt' : 'attempts'})
                      {a.latestScore != null ? ` · Score: ${a.latestScore}/100` : ''}
                    </p>
                  )}
                </section>
                <section className="content-card">
                  <h2>Evaluation</h2>
                  <ul>
                    {testCases.map(t => <li key={t.id}>{t.name} ({t.weight} weight)</li>)}
                  </ul>
                </section>
                {a.latestAttemptId && a.submissionStatus !== 'SUBMITTED' && a.submissionStatus !== 'REVIEWED' && (
                  <Link
                    to={'/attempt/' + a.latestAttemptId}
                    className="secondary-button"
                    style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none', marginBottom: '0.6rem'}}
                  >
                    Resume ongoing attempt <ArrowRight size={16}/>
                  </Link>
                )}
                {a.latestSubmissionId && (
                  <Link
                    to={'/student/submissions/' + a.latestSubmissionId}
                    className="secondary-button"
                    style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none', marginBottom: '0.6rem'}}
                  >
                    View latest submission <ArrowRight size={16}/>
                  </Link>
                )}
                <button className="primary-button" onClick={start} disabled={busy || a.status !== 'ACTIVE'}>
                  {busy ? 'Starting…' : (a.attempts > 0 ? 'Start new attempt' : 'Start assignment')} <ArrowRight size={16}/>
                </button>
                {failure && <p className="form-error" role="alert">{failure}</p>}
              </aside>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}

export function SessionDetails() {
  const {id} = useParams()
  const {data, loading, error} = useRemote(getSession, id, {interval: 3000})
  return (
    <DataState loading={loading} error={error}>
      {data && (data.status === 'SUBMITTED' ? (
        <section className="content-card">
          <h1>Assignment submitted</h1>
          <Link to="/student/submissions">View your submissions</Link>
        </section>
      ) : (
        <AssignmentWorkspace key={data.id} session={data}/>
      ))}
    </DataState>
  )
}

export function StudentAttempts() {
  const {data, loading, error} = useRemote(listAttempts, null, {interval: 3000})
  const list = Array.isArray(data) ? data : []
  return (
    <>
      <Header title="Assignment attempts" description="Resume your work or inspect a previous attempt."/>
      <DataState loading={loading} error={error}>
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Attempt</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={a.id}>
                    <td><Link to={'/attempt/' + a.id}>{a.assignmentTitle}</Link></td>
                    <td>{a.attemptNumber}</td>
                    <td><Status value={a.status}/></td>
                    <td>{new Date(a.startedAt).toLocaleString()}</td>
                    <td>{a.automatedScore ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="state-card">Start an assignment to record your first attempt.</div>
        )}
      </DataState>
    </>
  )
}

export function SubmissionHistory() {
  const {data, loading, error} = useRemote(listSubmissions, null, {interval: 3000})
  const list = Array.isArray(data) ? data : []
  return (
    <>
      <Header title="Submission history" description="Track automated scores, faculty grades and feedback."/>
      <DataState loading={loading} error={error}>
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Automated</th>
                  <th>Faculty grade</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.id}>
                    <td><Link to={'/student/submissions/' + s.id}>{s.assignmentTitle}</Link></td>
                    <td>{new Date(s.submittedAt).toLocaleString()}</td>
                    <td><Status value={s.status}/></td>
                    <td>{s.automatedScore}</td>
                    <td>{s.facultyGrade ?? '—'}</td>
                    <td>{s.facultyFeedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="state-card">No submissions yet. Complete the automated tests before submitting.</div>
        )}
      </DataState>
    </>
  )
}

export function SubmissionDetails() {
  const {id} = useParams()
  const {data: s, loading, error} = useRemote(getSubmission, id, {interval: 3000})
  const reviews = Array.isArray(s?.reviews) ? s.reviews : []
  return (
    <>
      <Link className="back-link" to="/student/submissions"><ArrowLeft size={16}/> Submission history</Link>
      <DataState loading={loading} error={error}>
        {s && (
          <>
            <Header title={s.assignmentTitle} description={'Submitted ' + new Date(s.submittedAt).toLocaleString()}/>
            <div className="detail-grid">
              <div className="detail-main">
                <WorkEvidence work={s}/>
              </div>
              <aside className="detail-side">
                <section className="content-card">
                  <h2>Faculty review</h2>
                  <Status value={s.status}/>
                  <p>Grade: {s.facultyGrade ?? 'Pending'} / 100</p>
                  <p>{s.facultyFeedback || 'Feedback will appear after faculty review.'}</p>
                  {s.status === 'RETURNED' && <Link to={'/assignment/' + s.assignmentId}>Start a revised attempt</Link>}
                </section>
                {reviews.map((r, i) => (
                  <section className="content-card" key={i}>
                    <strong>{r.facultyName} · {r.status}</strong>
                    <p>{r.feedback}</p>
                    <small>{new Date(r.createdAt).toLocaleString()}</small>
                  </section>
                ))}
              </aside>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}

export function StudentProfile() {
  const {profile} = useAuth()
  return (
    <>
      <Header title="My profile" description="Your laboratory account."/>
      <section className="content-card profile-card">
        <dl>
          {['name', 'email', 'role', 'status'].map(key => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{profile?.[key] || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
