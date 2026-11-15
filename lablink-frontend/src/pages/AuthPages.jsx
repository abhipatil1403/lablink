import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FlaskConical, ArrowLeft, ArrowRight, Settings2 } from 'lucide-react'
import { useAuth } from '../authContext'
import { friendlyAuthError, getApiBaseUrl, login, logout, register, setCustomApiBaseUrl } from '../services/authService'
import { dashboardFor, workspaces } from '../workspaces'
import { NotFoundPage } from './PublicPages'

export function LoginPage() {
  const { profile, loading, refreshProfile, error: profileError } = useAuth()
  const { workspace } = useParams()
  const selected = Object.hasOwn(workspaces, workspace) ? workspaces[workspace] : null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const currentApi = getApiBaseUrl()
  const [showServerConfig, setShowServerConfig] = useState(!currentApi)
  const [serverUrl, setServerUrl] = useState(currentApi || '')
  const [serverSavedMsg, setServerSavedMsg] = useState('')

  function handleSaveServer(e) {
    e.preventDefault()
    setCustomApiBaseUrl(serverUrl)
    setServerSavedMsg('Backend URL updated! Try logging in.')
    setError('')
    setTimeout(() => setServerSavedMsg(''), 4000)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      await refreshProfile()
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

  return (
    <AuthLayout
      title={selected ? selected.name + ' login' : 'Welcome back'}
      description={selected ? 'Sign in to continue to the ' + selected.name + ' workspace.' : 'Choose a workspace or sign in to your connected laboratory.'}
    >
      <nav className="auth-workspaces" aria-label="Choose login workspace">
        {Object.entries(workspaces).map(([key, value]) => (
          <Link key={key} to={'/login/' + key} aria-current={workspace === key ? 'page' : undefined}>
            {value.name}
          </Link>
        ))}
      </nav>
      {workspace === 'faculty' && (
        <p className="auth-account-note">Use the faculty account created by your LabLink administrator. If you don’t have one, ask them to provision it.</p>
      )}
      {workspace === 'admin' && (
        <p className="auth-account-note">Use a provisioned administrator account. Initial admin access is configured by the person running LabLink.</p>
      )}

      {!currentApi && (
        <div className="sandbox-badge-box">
          <span className="chip" style={{background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0', fontSize: '0.72rem'}}>
            ⚡ STANDALONE CLIENT MODE
          </span>
          <p style={{margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#475569'}}>
            Running 100% in-browser. All features (real-time testing, protocol emulation, submission review) are active.
          </p>
        </div>
      )}

      {/* QUICK ROLE DEMO BUTTONS */}
      <div className="demo-roles-row">
        <span className="demo-roles-label">Quick 1-Click Demo Login:</span>
        <div style={{display: 'flex', gap: '0.4rem', flexWrap: 'wrap'}}>
          <button
            type="button"
            className="demo-role-btn"
            onClick={async () => {
              setEmail('student@lablink.edu')
              setPassword('student123')
              setBusy(true)
              try {
                await login('student@lablink.edu', 'student123')
                await refreshProfile()
              } catch(e) {
                setError(friendlyAuthError(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Student
          </button>
          <button
            type="button"
            className="demo-role-btn"
            onClick={async () => {
              setEmail('faculty@lablink.edu')
              setPassword('faculty123')
              setBusy(true)
              try {
                await login('faculty@lablink.edu', 'faculty123')
                await refreshProfile()
              } catch(e) {
                setError(friendlyAuthError(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Faculty
          </button>
          <button
            type="button"
            className="demo-role-btn"
            onClick={async () => {
              setEmail('admin@lablink.edu')
              setPassword('admin123')
              setBusy(true)
              try {
                await login('admin@lablink.edu', 'admin123')
                await refreshProfile()
              } catch(e) {
                setError(friendlyAuthError(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Admin
          </button>
        </div>
      </div>

      <form onSubmit={submit}>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        {(error || profileError) && (
          <div className="form-error" role="alert">
            <p style={{margin: 0}}>{error || profileError}</p>
            {(!currentApi || (error && error.includes('backend'))) && (
              <button
                type="button"
                className="server-error-btn"
                onClick={() => setShowServerConfig(true)}
              >
                Configure Backend URL
              </button>
            )}
          </div>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'} <ArrowRight size={17} />
        </button>
      </form>

      {showServerConfig && (
        <div className="server-config-box">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem'}}>
            <label htmlFor="backend-url" style={{fontSize: '0.78rem', fontWeight: 700, color: '#334155'}}>
              Backend API Server URL
            </label>
            <button
              type="button"
              onClick={() => setShowServerConfig(false)}
              style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem'}}
            >
              ✕
            </button>
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input
              id="backend-url"
              type="url"
              placeholder="https://your-backend.onrender.com"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              style={{margin: 0, minHeight: '38px', fontSize: '0.8rem', flex: 1}}
            />
            <button
              type="button"
              onClick={handleSaveServer}
              className="server-save-btn"
            >
              Save & Connect
            </button>
          </div>
          {serverSavedMsg && (
            <small style={{color: '#15803d', display: 'block', marginTop: '0.4rem', fontWeight: 600}}>
              ✓ {serverSavedMsg}
            </small>
          )}
          <small style={{display: 'block', marginTop: '0.4rem', color: '#64748b', fontSize: '0.7rem', lineHeight: 1.4}}>
            Tip: For permanent setup, add <code>VITE_API_BASE_URL</code> to your Vercel Project Settings → Environment Variables.
          </small>
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'center', marginTop: '0.8rem'}}>
        <button
          type="button"
          className="server-config-toggle"
          onClick={() => setShowServerConfig(prev => !prev)}
        >
          <Settings2 size={13} aria-hidden="true" />
          {showServerConfig ? 'Hide connection settings' : 'Backend connection settings'}
        </button>
      </div>

      {(!workspace || workspace === 'student') && (
        <p className="auth-switch">New to LabLink? <Link to="/register">Create student account</Link></p>
      )}
      <p className="auth-role-note">Your account’s verified role determines which dashboard opens.</p>
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
      navigate(dashboardFor(user?.role) || '/login/student', { replace: true })
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
