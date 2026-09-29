import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './authContext'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { logout } from './services/authService'

function Protected({ role, children }) {
  const { user, profile, loading, error } = useAuth()
  if (loading) return <main className="centered-state">Loading LabLink…</main>
  if (!user) return <Navigate to="/login" replace />
  if (error) return <main className="centered-state"><p role="alert">{error}</p><button onClick={() => logout()}>Log out</button></main>
  if (!profile || profile.role !== role) return <Navigate to={`/${profile?.role?.toLowerCase() || 'login'}`} replace />
  return children
}

function RoleHome({ role }) {
  const { profile } = useAuth()
  return <main className="shell"><p className="eyebrow">{role} workspace</p><h1>Welcome, {profile.name}</h1><p>Your laboratory workspace is being connected.</p><button onClick={() => logout()}>Log out</button></main>
}

function Start() {
  const { profile, loading } = useAuth()
  if (loading) return <main className="centered-state">Loading LabLink…</main>
  return <Navigate to={profile ? `/${profile.role.toLowerCase()}` : '/login'} replace />
}

export function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<Start />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    {['STUDENT', 'FACULTY', 'ADMIN'].map(role => <Route key={role} path={`/${role.toLowerCase()}`} element={<Protected role={role}><RoleHome role={role} /></Protected>} />)}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
