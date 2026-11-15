import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FlaskConical, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../authContext'
import { friendlyAuthError, login, logout, register } from '../services/authService'
import { dashboardFor, workspaces } from '../workspaces'
import { NotFoundPage } from './PublicPages'

const MAIN_CREDENTIALS = {
  student: {
    name: 'Student',
    email: 'abhipatil1403@gmail.com',
    password: '12345678',
    note: 'Access hands-on socket assignments, automated testing, and execution results.'
  },
  faculty: {
    name: 'Faculty',
    email: 'abhipersonal1403@gmail.com',
    password: '12345678',
    note: 'Access the faculty grading console and student network logs.'
  },
  admin: {
    name: 'Admin',
    email: 'admin@gmail.com',
    password: '12345678',
    note: 'Access system administration, protocol server controls, and user accounts.'
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const { profile, loading, refreshProfile, error: profileError } = useAuth()
  const { workspace } = useParams()
  const selected = Object.hasOwn(workspaces, workspace) ? workspaces[workspace] : null

  const activeKey = workspace && MAIN_CREDENTIALS[workspace] ? workspace : 'student'
  const activeCreds = MAIN_CREDENTIALS[activeKey]

  const [email, setEmail] = useState(activeCreds.email)
  const [password, setPassword] = useState(activeCreds.password)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Synchronize inputs when user switches role tabs
  useEffect(() => {
    setEmail(activeCreds.email)
    setPassword(activeCreds.password)
    setError('')
  }, [workspace, activeCreds.email, activeCreds.password])

  async function submit(event) {
    if (event) event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const targetEmail = (email || activeCreds.email).trim()
      const targetPassword = password || activeCreds.password
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

  function handleQuickFill() {
    setEmail(activeCreds.email)
    setPassword(activeCreds.password)
    setError('')
  }

  if (workspace && !selected) return <NotFoundPage />
  if (loading) return <main className="centered-state">Loading LabLink…</main>
  if (profile && dashboardFor(profile.role)) return <Navigate to={dashboardFor(profile.role)} replace />
  if (profile) return (
    <AuthLayout title="Workspace unavailable" description="This account has no supported workspace. Contact your laboratory administrator.">
      <button className="primary-button" onClick={logout}>Log out</button>
    </AuthLayout>
  )

  return (
    <AuthLayout
      title={activeCreds.name + ' Sign In'}
      description={'Sign in to access your ' + activeCreds.name.toLowerCase() + ' laboratory workspace.'}
    >
      <nav className="auth-workspaces" aria-label="Choose login workspace">
        {Object.entries(workspaces).map(([key, value]) => (
          <Link key={key} to={'/login/' + key} aria-current={workspace === key || (!workspace && key === 'student') ? 'page' : undefined}>
            {value.name}
          </Link>
        ))}
      </nav>

      <p className="auth-account-note">{activeCreds.note}</p>

      <div className="credentials-quick-box">
        <div className="credentials-quick-header">
          <span className="credentials-quick-title">Main {activeCreds.name} Credentials</span>
          <span className="credentials-quick-badge">Default</span>
        </div>
        <div className="credentials-quick-fields">
          <div className="credentials-field">
            <span className="credentials-field-label">Email:</span>
            <span className="credentials-field-value">{activeCreds.email}</span>
          </div>
          <div className="credentials-field">
            <span className="credentials-field-label">Password:</span>
            <span className="credentials-field-value">12345678</span>
          </div>
        </div>
        <button
          type="button"
          className="credentials-quick-btn"
          onClick={handleQuickFill}
          title="Click to auto-fill these credentials into the form"
        >
          <Sparkles size={14} aria-hidden="true" /> Auto-fill {activeCreds.name} Credentials
        </button>
      </div>

      <form onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={activeCreds.email}
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="12345678"
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        {(error || profileError) && (
          <div className="form-error" role="alert">
            <p style={{margin: 0}}>{error || profileError}</p>
          </div>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Signing in…' : `Sign in to ${activeCreds.name} Workspace`} <ArrowRight size={17} />
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
    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
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
      await register(name.trim(), email.trim(), password)
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
    <AuthLayout title="Create student account" description="Register any name and email to access your student laboratory workspace.">
      <form onSubmit={submit}>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          autoComplete="name"
          placeholder="e.g. John Doe"
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
          placeholder="e.g. yourname@gmail.com"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimum 8 characters (e.g. 12345678)"
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
          placeholder="Re-enter your password"
          required
          value={confirm}
          onChange={event => setConfirm(event.target.value)}
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account & start lab'} <ArrowRight size={17} />
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
