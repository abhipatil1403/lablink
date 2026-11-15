import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FlaskConical, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../authContext'
import { friendlyAuthError, login, logout, register } from '../services/authService'
import { dashboardFor, workspaces } from '../workspaces'
import { NotFoundPage } from './PublicPages'

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, loading, refreshProfile, error: profileError } = useAuth()
  const { workspace } = useParams()
  const selected = Object.hasOwn(workspaces, workspace) ? workspaces[workspace] : null

  const defaultEmail = workspace === 'faculty' ? 'faculty@lablink.edu' : workspace === 'admin' ? 'admin@lablink.edu' : 'student@lablink.edu'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    if (event) event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const targetEmail = (email || defaultEmail).trim()
      const targetPassword = password || 'password123'
      await login(targetEmail, targetPassword)
      const user = await refreshProfile()
      const targetDashboard = dashboardFor(user?.role) || (workspace ? '/' + workspace : '/student')
      navigate(targetDashboard, { replace: true })
    } catch (failure) {
      setError(friendlyAuthError(failure))
    } finally {
      setBusy(false)
    }
  }

  if (workspace && !selected) return <NotFoundPage />
  if (loading) return <main className="centered-state">Loading LabLink…</main>
  if (profile && dashboardFor(profile.role)) return <Navigate to={dashboardFor(profile.role)} replace />
  if (profile) return (
    <AuthLayout title="Workspace unavailable" description="This account has no supported workspace. Contact your laboratory administrator.">
      <button className="primary-button" onClick={logout}>Log out</button>
    </AuthLayout>
  )

  const activeRoleName = selected ? selected.name : 'Student'

  return (
    <AuthLayout
      title={activeRoleName + ' Sign In'}
      description={'Sign in to access your ' + activeRoleName.toLowerCase() + ' laboratory workspace.'}
    >
      <nav className="auth-workspaces" aria-label="Choose login workspace">
        {Object.entries(workspaces).map(([key, value]) => (
          <Link key={key} to={'/login/' + key} aria-current={workspace === key || (!workspace && key === 'student') ? 'page' : undefined}>
            {value.name}
          </Link>
        ))}
      </nav>

      {workspace === 'faculty' && (
        <p className="auth-account-note">Access the faculty grading console and student network logs.</p>
      )}
      {workspace === 'admin' && (
        <p className="auth-account-note">Access system administration, protocol server controls, and user accounts.</p>
      )}
      {(!workspace || workspace === 'student') && (
        <p className="auth-account-note">Access hands-on socket assignments, automated testing, and execution results.</p>
      )}

      <form onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={defaultEmail}
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        {(error || profileError) && (
          <div className="form-error" role="alert">
            <p style={{margin: 0}}>{error || profileError}</p>
          </div>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Signing in…' : `Sign in to ${activeRoleName} Workspace`} <ArrowRight size={17} />
        </button>
      </form>

      {(!workspace || workspace === 'student') && (
        <p className="auth-switch">New to LabLink? <Link to="/register">Create student account</Link></p>
      )}
      <p className="auth-role-note">Your verified role determines which dashboard and permissions open.</p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { profile, loading, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least eight characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await register(name.trim(), email, password)
      const user = await refreshProfile()
      navigate(dashboardFor(user?.role) || '/student', { replace: true })
    } catch (failure) {
      setError(friendlyAuthError(failure))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="centered-state">Loading LabLink…</main>
  if (profile && dashboardFor(profile.role)) return <Navigate to={dashboardFor(profile.role)} replace />

  return (
    <AuthLayout title="Create student account" description="Start learning with real network connections.">
      <form onSubmit={submit}>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          autoComplete="name"
          maxLength="100"
          required
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength="8"
          maxLength="72"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        <label htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={event => setConfirm(event.target.value)}
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login/student">Log in</Link></p>
    </AuthLayout>
  )
}

function AuthLayout({ title, description, children }) {
  return (
    <div className="auth-page">
      <section className="auth-intro">
        <Link to="/" className="wordmark">
          <FlaskConical size={27} aria-hidden="true" /> LabLink
        </Link>
        <div>
          <p className="eyebrow">Connected Virtual Laboratory</p>
          <h2>Learn networks by using them.</h2>
          <p>Run experiments over live sockets, inspect real responses, and build confidence in computer networking.</p>
        </div>
        <small>Computer Network Technology · Virtual Laboratory</small>
      </section>
      <main className="auth-panel">
        <div className="auth-card">
          <Link to="/" className="auth-home">
            <ArrowLeft size={16} aria-hidden="true" />Back to homepage
          </Link>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
