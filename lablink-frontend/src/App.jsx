import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './authContext'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { logout } from './services/authService'
import { AppLayout, StudentLayout } from './StudentLayout'
import { ExperimentCatalog, ExperimentDetails, SessionDetails, StudentDashboard, StudentProfile, SubmissionDetails, SubmissionHistory } from './pages/StudentPages'
import { FacultyDashboard, FacultyExperimentForm, FacultyExperiments, FacultyReview, FacultySessions, FacultySubmissions } from './pages/FacultyPages'
import { BookOpen, ClipboardCheck, LayoutDashboard, Users } from 'lucide-react'

const facultyLinks = [
  { to: '/faculty', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/faculty/experiments', label: 'Experiments', icon: BookOpen },
  { to: '/faculty/sessions', label: 'Student sessions', icon: Users },
  { to: '/faculty/submissions', label: 'Submissions', icon: ClipboardCheck },
]

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
    <Route element={<Protected role="STUDENT"><StudentLayout /></Protected>}>
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/experiments" element={<ExperimentCatalog />} />
      <Route path="/student/submissions" element={<SubmissionHistory />} />
      <Route path="/student/submissions/:id" element={<SubmissionDetails />} />
      <Route path="/student/profile" element={<StudentProfile />} />
      <Route path="/experiment/:id" element={<ExperimentDetails />} />
      <Route path="/session/:id" element={<SessionDetails />} />
    </Route>
    <Route element={<Protected role="FACULTY"><AppLayout role="FACULTY" links={facultyLinks} /></Protected>}>
      <Route path="/faculty" element={<FacultyDashboard />} />
      <Route path="/faculty/experiments" element={<FacultyExperiments />} />
      <Route path="/faculty/experiments/new" element={<FacultyExperimentForm />} />
      <Route path="/faculty/experiments/:id/edit" element={<FacultyExperimentForm />} />
      <Route path="/faculty/sessions" element={<FacultySessions />} />
      <Route path="/faculty/submissions" element={<FacultySubmissions />} />
      <Route path="/faculty/submissions/:id" element={<FacultyReview />} />
    </Route>
    <Route path="/admin" element={<Protected role="ADMIN"><RoleHome role="ADMIN" /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}
