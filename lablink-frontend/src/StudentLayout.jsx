import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { BookOpen, ClipboardList, FlaskConical, LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useAuth } from './authContext'
import { logout } from './services/authService'

const studentLinks = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/assignments', label: 'Assignments', icon: BookOpen },
  { to: '/student/attempts', label: 'Attempts', icon: ClipboardList },
  { to: '/student/submissions', label: 'Submissions', icon: ClipboardList },
  { to: '/student/profile', label: 'My profile', icon: UserRound },
]

export function StudentLayout() {
  return <AppLayout role="STUDENT" links={studentLinks} />
}

export function AppLayout({ role, links }) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  return <div className="app-frame">
    {open && <button aria-label="Close navigation" className="drawer-scrim" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Link to={`/${role.toLowerCase()}`} onClick={() => setOpen(false)}><FlaskConical size={25} /> LabLink</Link><button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={22} /></button></div>
      <div className="sidebar-caption">{role} WORKSPACE</div>
      <nav aria-label="Student navigation">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={19} />{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-user"><span className="avatar">{profile.name?.slice(0, 1).toUpperCase()}</span><span><strong>{profile.name}</strong><small>{role[0] + role.slice(1).toLowerCase()}</small></span></div><button className="side-link logout-link" onClick={() => logout()}><LogOut size={18} /> Log out</button></div>
    </aside>
    <div className="app-main"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={23} /></button><span>Connected Virtual Laboratory</span><div className="topbar-user"><span className="avatar avatar-small">{profile.name?.slice(0, 1).toUpperCase()}</span><strong>{profile.name}</strong></div></header><div className="page-content"><Outlet /></div></div>
  </div>
}
