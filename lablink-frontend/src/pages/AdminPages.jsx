import { useState } from 'react'
import { Activity, BookOpen, ClipboardList, Server, Users } from 'lucide-react'
import { useAuth } from '../authContext'
import { useRemote } from '../hooks/useRemote'
import { adminDashboard, adminExperiments, adminServers, adminUsers, setAdminExperimentStatus, setUserRole, setUserStatus } from '../services/adminService'

function Header({ title, description }) {
  return <div className="page-heading"><p className="eyebrow">ADMINISTRATION</p><h1>{title}</h1><p>{description}</p></div>
}

function DataState({ loading, error, children }) {
  if (loading) return <div className="state-card" role="status">Loading LabLink data…</div>
  if (error) return <div className="state-card state-error" role="alert">{error}</div>
  return children
}

function Status({ value }) {
  return <span className={`badge ${value === 'ONLINE' || value === 'ACTIVE' ? 'badge-success' : value === 'OFFLINE' || value === 'DISABLED' ? 'badge-warning' : 'badge-muted'}`}>{value || 'UNKNOWN'}</span>
}

export function AdminDashboard() {
  const { data, loading, error } = useRemote(adminDashboard)
  const metrics = data ? [
    ['Total users', data.totalUsers, Users], ['Students', data.students, Users], ['Faculty', data.faculty, Users],
    ['Experiments', data.experiments, BookOpen], ['Active experiments', data.activeExperiments, BookOpen],
    ['Active sessions', data.activeSessions, Activity], ['Submissions', data.submissions, ClipboardList],
    ['Experiment servers', data.experimentServers, Server],
  ] : []
  const statuses = data?.systemStatus ? [
    ['REST API', data.systemStatus.api], ['Firestore database', data.systemStatus.database],
    ['Network service', data.systemStatus.networkService], ['TCP server', data.systemStatus.tcpServer],
  ] : []
  return <><Header title="System overview" description="Real account, experiment, session, and service data." /><DataState loading={loading} error={error}>
    <section className="metric-grid admin-metrics">{metrics.map(([label, value, Icon]) => <article className="metric-card" key={label}><span className="metric-icon"><Icon size={20} /></span><strong>{value}</strong><span>{label}</span></article>)}</section>
    <div className="section-heading"><h2>System status</h2></div><div className="system-grid">{statuses.map(([label, value]) => <article className="content-card system-card" key={label}><strong>{label}</strong><Status value={value} /></article>)}</div>
  </DataState></>
}

export function AdminUsers() {
  const { profile } = useAuth()
  const { data, loading, error, reload } = useRemote(adminUsers)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState('')
  async function change(uid, action) {
    setActionError('')
    setBusy(uid)
    try { await action(); reload() }
    catch (failure) { setActionError(failure.message) }
    finally { setBusy('') }
  }
  return <><Header title="Users" description="Manage account roles and access. Passwords are never displayed." />{actionError && <p className="form-error" role="alert">{actionError}</p>}<DataState loading={loading} error={error}>{data?.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{data.map(user => <tr key={user.uid}><td><strong>{user.name}</strong></td><td>{user.email}</td><td><select aria-label={`Role for ${user.name}`} value={user.role} disabled={busy === user.uid || user.uid === profile.uid} onChange={event => change(user.uid, () => setUserRole(user.uid, event.target.value))}>{['STUDENT', 'FACULTY', 'ADMIN'].map(role => <option key={role}>{role}</option>)}</select></td><td><Status value={user.status} /></td><td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td><td><button className="table-button" disabled={busy === user.uid || user.uid === profile.uid} onClick={() => change(user.uid, () => setUserStatus(user.uid, user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'))}>{user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div> : <div className="state-card">No users found.</div>}</DataState></>
}

export function AdminExperiments() {
  const { data, loading, error, reload } = useRemote(adminExperiments)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState('')
  async function toggle(item) {
    setBusy(item.id)
    setActionError('')
    try { await setAdminExperimentStatus(item.id, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'); reload() }
    catch (failure) { setActionError(failure.message) }
    finally { setBusy('') }
  }
  return <><Header title="Experiments" description="Inspect and control experiment availability." />{actionError && <p className="form-error" role="alert">{actionError}</p>}<DataState loading={loading} error={error}>{data?.length ? <div className="table-wrap"><table><thead><tr><th>Experiment</th><th>Protocol</th><th>Difficulty</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.map(item => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.protocol}</td><td>{item.difficulty}</td><td><Status value={item.status} /></td><td><button className="table-button" disabled={busy === item.id || (item.status !== 'ACTIVE' && item.experimentType !== 'tcp-client-server')} onClick={() => toggle(item)}>{item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div> : <div className="state-card">No experiments found.</div>}</DataState></>
}

export function AdminServers() {
  const { data, loading, error } = useRemote(adminServers)
  return <><Header title="Experiment servers" description="Live TCP reachability is checked when this page loads." /><DataState loading={loading} error={error}>{data?.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>IP / Host</th><th>Port</th><th>Protocols</th><th>Status</th><th>Last heartbeat</th></tr></thead><tbody>{data.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td><code>{item.address}</code></td><td>{item.port}</td><td>{item.supportedProtocols?.join(', ')}</td><td><Status value={item.status} /></td><td>{item.lastHeartbeat ? new Date(item.lastHeartbeat).toLocaleString() : 'Unknown'}</td></tr>)}</tbody></table></div> : <div className="state-card">No experiment servers configured.</div>}</DataState></>
}
