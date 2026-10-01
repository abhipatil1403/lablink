import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FlaskConical, ArrowRight } from 'lucide-react'
import { useAuth } from '../authContext'
import { friendlyAuthError, login, register } from '../services/authService'

export function LoginPage() {
  const { profile, refreshProfile, error: profileError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await login(email, password); await refreshProfile() }
    catch (failure) { setError(friendlyAuthError(failure)) }
    finally { setBusy(false) }
  }

  if (profile) return <Navigate to={`/${profile.role.toLowerCase()}`} replace />
  return <AuthLayout title="Welcome back" description="Sign in to your connected laboratory.">
    <form onSubmit={submit}>
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
      {(error || profileError) && <p className="form-error" role="alert">{error || profileError}</p>}
      <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Log in'} <ArrowRight size={17} /></button>
    </form>
    <p className="auth-switch">New to LabLink? <Link to="/register">Create student account</Link></p>
  </AuthLayout>
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (password.length < 8) { setError('Password must be at least eight characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    setError('')
    try { await register(name.trim(), email, password); await refreshProfile(); navigate('/student') }
    catch (failure) { setError(friendlyAuthError(failure)) }
    finally { setBusy(false) }
  }

  return <AuthLayout title="Create student account" description="Start learning with real network connections.">
    <form onSubmit={submit}>
      <label htmlFor="name">Full name</label>
      <input id="name" autoComplete="name" maxLength="100" required value={name} onChange={event => setName(event.target.value)} />
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="new-password" minLength="8" maxLength="72" required value={password} onChange={event => setPassword(event.target.value)} />
      <label htmlFor="confirm">Confirm password</label>
      <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={event => setConfirm(event.target.value)} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>{busy ? 'Creating account…' : 'Create account'} <ArrowRight size={17} /></button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
  </AuthLayout>
}

function AuthLayout({ title, description, children }) {
  return <div className="auth-page">
    <section className="auth-intro"><div className="wordmark"><FlaskConical size={27} /> LabLink</div><div><p className="eyebrow">Connected Virtual Laboratory</p><h1>Learn networks by using them.</h1><p>Run experiments over live sockets, inspect real responses, and build confidence in computer networking.</p></div><small>Computer Network Technology · Virtual Laboratory</small></section>
    <main className="auth-panel"><div className="auth-card"><h2>{title}</h2><p>{description}</p>{children}</div></main>
  </div>
}
