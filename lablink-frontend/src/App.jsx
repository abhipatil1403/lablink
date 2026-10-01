import {BrowserRouter,Navigate,Route,Routes} from 'react-router-dom'
import {AuthProvider} from './AuthProvider'
import {useAuth} from './authContext'
import {LoginPage,RegisterPage} from './pages/AuthPages'
import {logout} from './services/authService'
import {AppLayout,StudentLayout} from './StudentLayout'
import {ExperimentCatalog,ExperimentDetails,SessionDetails,StudentAttempts,StudentDashboard,StudentProfile,SubmissionDetails,SubmissionHistory} from './pages/StudentPages'
import {FacultyAttempt,FacultyDashboard,FacultyExperimentForm,FacultyExperiments,FacultyReview,FacultySessions,FacultyStudentDetails,FacultyStudents,FacultySubmissions} from './pages/FacultyPages'
import {AdminAudit,AdminDashboard,AdminServers,AdminSystemStatus,AdminUsers} from './pages/AdminPages'
import {BookOpen,ClipboardCheck,LayoutDashboard,Server,Users,Activity,UserRound} from 'lucide-react'

const facultyLinks=[
  {to:'/faculty',label:'Dashboard',icon:LayoutDashboard,end:true},
  {to:'/faculty/assignments',label:'Assignments',icon:BookOpen},
  {to:'/faculty/students',label:'Students',icon:Users},
  {to:'/faculty/sessions',label:'Student attempts',icon:Activity},
  {to:'/faculty/submissions',label:'Submissions',icon:ClipboardCheck},
  {to:'/faculty/profile',label:'Profile',icon:UserRound},
]
const adminLinks=[
  {to:'/admin',label:'Dashboard',icon:LayoutDashboard,end:true},
  {to:'/admin/users',label:'Users',icon:Users},
  {to:'/admin/assignments',label:'Assignments',icon:BookOpen},
  {to:'/admin/servers',label:'Servers',icon:Server},
  {to:'/admin/status',label:'System status',icon:Activity},
  {to:'/admin/audit',label:'Audit history',icon:Activity},
  {to:'/admin/profile',label:'Profile',icon:UserRound},
]
function Protected({role,children}) {
  const {profile,loading,error}=useAuth()
  if(loading)return <main className="centered-state">Loading LabLink…</main>
  if(error)return <main className="centered-state"><p role="alert">{error}</p><button onClick={logout}>Log out</button></main>
  if(!profile)return <Navigate to="/login" replace/>
  if(profile.role!==role)return <Navigate to={'/'+profile.role.toLowerCase()} replace/>
  return children
}
function Start() {
  const {profile,loading}=useAuth()
  if(loading)return <main className="centered-state">Loading LabLink…</main>
  return <Navigate to={profile?'/'+profile.role.toLowerCase():'/login'} replace/>
}
export function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<Start/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route element={<Protected role="STUDENT"><StudentLayout/></Protected>}>
      <Route path="/student" element={<StudentDashboard/>}/>
      <Route path="/student/dashboard" element={<Navigate to="/student" replace/>}/>
      <Route path="/student/assignments" element={<ExperimentCatalog/>}/>
      <Route path="/student/experiments" element={<Navigate to="/student/assignments" replace/>}/>
      <Route path="/student/attempts" element={<StudentAttempts/>}/>
      <Route path="/student/submissions" element={<SubmissionHistory/>}/>
      <Route path="/student/submissions/:id" element={<SubmissionDetails/>}/>
      <Route path="/student/profile" element={<StudentProfile/>}/>
      <Route path="/assignment/:id" element={<ExperimentDetails/>}/>
      <Route path="/experiment/:id" element={<ExperimentDetails/>}/>
      <Route path="/attempt/:id" element={<SessionDetails/>}/>
      <Route path="/session/:id" element={<SessionDetails/>}/>
    </Route>
    <Route element={<Protected role="FACULTY"><AppLayout role="FACULTY" links={facultyLinks}/></Protected>}>
      <Route path="/faculty" element={<FacultyDashboard/>}/>
      <Route path="/faculty/dashboard" element={<Navigate to="/faculty" replace/>}/>
      <Route path="/faculty/assignments" element={<FacultyExperiments/>}/>
      <Route path="/faculty/experiments" element={<Navigate to="/faculty/assignments" replace/>}/>
      <Route path="/faculty/assignments/:id/edit" element={<FacultyExperimentForm/>}/>
      <Route path="/faculty/students" element={<FacultyStudents/>}/>
      <Route path="/faculty/students/:id" element={<FacultyStudentDetails/>}/>
      <Route path="/faculty/profile" element={<StudentProfile/>}/>
      <Route path="/faculty/sessions" element={<FacultySessions/>}/>
      <Route path="/faculty/sessions/:id" element={<FacultyAttempt/>}/>
      <Route path="/faculty/submissions" element={<FacultySubmissions/>}/>
      <Route path="/faculty/submissions/:id" element={<FacultyReview/>}/>
    </Route>
    <Route element={<Protected role="ADMIN"><AppLayout role="ADMIN" links={adminLinks}/></Protected>}>
      <Route path="/admin" element={<AdminDashboard/>}/>
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace/>}/>
      <Route path="/admin/users" element={<AdminUsers/>}/>
      <Route path="/admin/assignments" element={<FacultyExperiments/>}/>
      <Route path="/admin/assignments/:id/edit" element={<FacultyExperimentForm/>}/>
      <Route path="/admin/experiments" element={<Navigate to="/admin/assignments" replace/>}/>
      <Route path="/admin/servers" element={<AdminServers/>}/>
      <Route path="/admin/status" element={<AdminSystemStatus/>}/>
      <Route path="/admin/profile" element={<StudentProfile/>}/>
      <Route path="/admin/audit" element={<AdminAudit/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></AuthProvider></BrowserRouter>
}
