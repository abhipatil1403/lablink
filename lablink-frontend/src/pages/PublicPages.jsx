import {Link} from 'react-router-dom'
import {
  Activity,ArrowRight,Check,Code2,Cpu,Database,FileCode2,
  FlaskConical,GraduationCap,Network,Radio,Search,Server,
  ShieldCheck,Terminal,Users
} from 'lucide-react'
import {useAuth} from '../authContext'
import {dashboardFor} from '../workspaces'

const roles = [
  {
    id: 'student',
    name: 'Student Workspace',
    badge: 'LEARN & CODE',
    icon: GraduationCap,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: 'Solve real-world networking challenges against live, controlled socket services.',
    features: [
      'Write synchronous solutions using restricted capability APIs',
      'Test in an isolated QuickJS WebAssembly sandbox',
      'Inspect live execution logs and real network transcripts',
      'Receive instant automated scores and faculty feedback'
    ],
    primaryAction: {label: 'Sign In as Student', to: '/login/student'},
    secondaryAction: {label: 'Create student account', to: '/register'}
  },
  {
    id: 'faculty',
    name: 'Faculty Workspace',
    badge: 'TEACH & REVIEW',
    icon: Users,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    description: 'Oversee student lab progress, review network transcripts, and manage assignments.',
    features: [
      'Review student code submissions with full network evidence',
      'Assign grades (0–100) and structured faculty feedback',
      'Manage course assignments, deadlines and requirements',
      'Create and tune weighted automated test cases'
    ],
    primaryAction: {label: 'Faculty Sign In', to: '/login/faculty'},
    note: 'Requires faculty credentials provisioned by an administrator.'
  },
  {
    id: 'admin',
    name: 'Administrator Workspace',
    badge: 'SYSTEM & CONTROL',
    icon: ShieldCheck,
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    description: 'Manage users, monitor protocol servers, and inspect real-time system health.',
    features: [
      'Create and manage faculty and student accounts',
      'Monitor real-time network service ports and heartbeats',
      'Enable or disable assignment servers on demand',
      'Inspect live audit trails of all system and grading actions'
    ],
    primaryAction: {label: 'Admin Sign In', to: '/login/admin'},
    note: 'Protected administrator account required.'
  },
]

const assignments = [
  {id: 1, title: 'TCP Chat Client', protocol: 'TCP', icon: Terminal, desc: 'USER handshake, MSG exchanges, graceful QUIT and EOF detection.'},
  {id: 2, title: 'Reliable File Transfer', protocol: 'TCP', icon: FileCode2, desc: 'Chunked stream reconstruction, SHA-256 verification and local persistence.'},
  {id: 3, title: 'UDP Position Telemetry', protocol: 'UDP', icon: Radio, desc: 'Live player datagram broadcast with out-of-order sequence filtering.'},
  {id: 4, title: 'College Student API', protocol: 'HTTP', icon: Database, desc: 'REST client querying student records and handling HTTP 4xx/5xx responses.'},
  {id: 5, title: 'DNS Troubleshooting', protocol: 'DNS', icon: Search, desc: 'Investigate misconfigured loopback A records with live reachability probes.'},
  {id: 6, title: 'Network Monitoring', protocol: 'HTTP', icon: Activity, desc: 'Distinguish active HTTP servers, refused TCP ports and socket timeouts.'},
  {id: 7, title: 'Client-Server File Search', protocol: 'TCP', icon: Network, desc: 'Search document archives and download matching files over raw TCP sockets.'}
]

export function PublicHeader() {
  const {profile, loading} = useAuth()
  const dashboard = dashboardFor(profile?.role)

  return (
    <header className="public-header public-container">
      <Link to="/" className="public-brand" aria-label="LabLink home">
        <span className="public-brand-icon"><FlaskConical size={24} aria-hidden="true"/></span>
        <span>LabLink<small>Connected Virtual Laboratory</small></span>
      </Link>
      <nav className="public-nav" aria-label="Public navigation">
        <a href="#workspaces">Workspaces</a>
        <a href="#assignments">Assignments</a>
        <a href="#how-it-works">How it works</a>
        {!loading && dashboard ? (
          <Link className="public-nav-action" to={dashboard}>
            Continue to Dashboard <ArrowRight size={15} aria-hidden="true"/>
          </Link>
        ) : (
          <div className="header-auth-buttons">
            <Link className="header-link" to="/login/student">Student</Link>
            <Link className="header-link" to="/login/faculty">Faculty</Link>
            <Link className="header-link" to="/login/admin">Admin</Link>
            <Link className="public-nav-action" to="/login">Sign In <ArrowRight size={15} aria-hidden="true"/></Link>
          </div>
        )}
      </nav>
    </header>
  )
}

export function LandingPage() {
  const {profile, loading} = useAuth()
  const dashboard = dashboardFor(profile?.role)

  return (
    <div className="public-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader/>
      <main id="main-content" tabIndex={-1}>

        {/* HERO SECTION */}
        <section className="public-hero public-container" aria-labelledby="hero-title">
          <div className="public-hero-copy">
            <p className="public-eyebrow"><span/> CONNECTED VIRTUAL NETWORKING LABORATORY</p>
            <h1 id="hero-title">Networking concepts.<br/><span>Real connections.</span></h1>
            <p className="public-hero-description">
              Learn computer networking by building it. Write solutions in an isolated WebAssembly sandbox,
              communicate with live TCP, UDP, HTTP, and DNS socket services, and verify protocol behavior with real-time network evidence.
            </p>

            {/* QUICK ROLE-BASED ACCESS BUTTONS */}
            <div className="role-quick-launch">
              <span className="quick-launch-label">CHOOSE YOUR WORKSPACE:</span>
              <div className="quick-buttons-row">
                <Link to="/login/student" className="role-btn role-btn-student">
                  <GraduationCap size={18}/> Student Sign In
                </Link>
                <Link to="/login/faculty" className="role-btn role-btn-faculty">
                  <Users size={18}/> Faculty Portal
                </Link>
                <Link to="/login/admin" className="role-btn role-btn-admin">
                  <ShieldCheck size={18}/> Admin Console
                </Link>
              </div>
            </div>

            {!loading && dashboard && (
              <p className="public-session">
                Signed in as <strong>{profile.name}</strong> ({profile.role}).{' '}
                <Link to={dashboard}>Continue to Dashboard <ArrowRight size={15} aria-hidden="true"/></Link>
              </p>
            )}

            <div className="public-protocols" aria-label="Assignment protocols">
              <span>SUPPORTED PROTOCOLS</span>
              {['TCP Sockets', 'UDP Datagrams', 'HTTP REST', 'DNS Resolver', 'WebSockets'].map(p => (
                <span key={p} className="public-protocol">{p}</span>
              ))}
            </div>
          </div>

          {/* INTERACTIVE LAB PREVIEW */}
          <div className="lab-preview" aria-label="Interactive socket session preview">
            <div className="lab-preview-top">
              <span><Terminal size={17} aria-hidden="true"/> Live socket execution stream</span>
              <span className="preview-label">REAL PROTOCOL TRACE</span>
            </div>
            <div className="lab-preview-body">
              <div className="preview-heading">
                <span className="preview-step">ASSIGNMENT 01 / TCP</span>
                <h2>Bi-directional socket exchange</h2>
                <p>Synchronous guest code driving real asynchronous network I/O.</p>
              </div>
              <div className="preview-network" aria-hidden="true">
                <div><Code2 size={24}/><span>QuickJS Guest</span></div>
                <span className="preview-wire"><ArrowRight size={18}/></span>
                <div><Cpu size={24}/><span>Node Gateway</span></div>
                <span className="preview-wire"><ArrowRight size={18}/></span>
                <div><Server size={24}/><span>TCP Service</span></div>
              </div>
              <div className="preview-transcript">
                <div><span>CLIENT →</span><code>tcp.connect('chat') → socket #1 connected</code></div>
                <div><span>CLIENT →</span><code>USER Ada [handshake initiate]</code></div>
                <div><span>← SERVER</span><code>WELCOME Ada [handshake verified]</code></div>
                <div><span>CLIENT →</span><code>MSG Hello from student client</code></div>
                <div><span>← SERVER</span><code>MESSAGE RECEIVED Hello from student client</code></div>
                <div><span>CLIENT →</span><code>QUIT [graceful teardown]</code></div>
                <div><span>← SERVER</span><code>BYE [socket closed cleanly]</code></div>
              </div>
              <div className="preview-caption">
                <ShieldCheck size={16} aria-hidden="true"/>
                <span>Constrained Memory · Capability-gated sockets · Real SHA-256 validation</span>
              </div>
            </div>
          </div>
        </section>

        {/* ROLE BASED SIGN-IN CARDS SECTION */}
        <section id="workspaces" className="public-workspaces public-container" aria-labelledby="workspaces-title">
          <div className="public-section-heading">
            <div>
              <p className="public-eyebrow">ROLE-BASED WORKSPACES</p>
              <h2 id="workspaces-title">Select your role to get started</h2>
            </div>
            <p>LabLink provides dedicated workspaces tailored for students, faculty instructors, and lab administrators.</p>
          </div>

          <div className="public-workspace-grid">
            {roles.map(role => {
              const Icon = role.icon
              return (
                <article className="workspace-card" key={role.id} aria-labelledby={role.id + '-title'}>
                  <div className="workspace-card-header">
                    <span className="workspace-icon" style={{background: role.bg, color: role.color}}>
                      <Icon size={26} aria-hidden="true"/>
                    </span>
                    <span className="chip" style={{color: role.color, background: role.bg, borderColor: role.border}}>
                      {role.badge}
                    </span>
                  </div>
                  <h3 id={role.id + '-title'}>{role.name}</h3>
                  <p className="workspace-description">{role.description}</p>
                  <ul>
                    {role.features.map(item => (
                      <li key={item}><Check size={16} aria-hidden="true"/>{item}</li>
                    ))}
                  </ul>

                  <div className="workspace-card-actions">
                    <Link
                      to={role.primaryAction.to}
                      className={`workspace-action workspace-action-${role.id}`}
                    >
                      <span>{role.primaryAction.label}</span>
                      <ArrowRight size={17} aria-hidden="true"/>
                    </Link>
                    <div className="workspace-footer-meta">
                      {role.secondaryAction ? (
                        <Link to={role.secondaryAction.to} className="workspace-secondary-action">
                          {role.secondaryAction.label}
                        </Link>
                      ) : role.note ? (
                        <span className="workspace-note">{role.note}</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* ASSIGNMENTS CATALOG PREVIEW */}
        <section id="assignments" className="public-container" style={{paddingBlock: '60px 40px'}}>
          <div className="public-section-heading">
            <div>
              <p className="public-eyebrow">SEVEN PRACTICAL ASSIGNMENTS</p>
              <h2>Hands-on networking curriculum</h2>
            </div>
            <p>Every assignment challenges students to build working network programs using actual protocol exchanges.</p>
          </div>
          <div className="landing-assignment-grid">
            {assignments.map(a => {
              const Icon = a.icon
              return (
                <div key={a.id} className="landing-assignment-card">
                  <div className="assignment-card-top">
                    <span className="assignment-num">0{a.id}</span>
                    <span className="chip">{a.protocol}</span>
                  </div>
                  <h4><Icon size={18} style={{marginRight: '6px', verticalAlign: 'middle'}}/>{a.title}</h4>
                  <p>{a.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="public-how" aria-labelledby="how-title">
          <div className="public-container">
            <div className="public-section-heading">
              <div>
                <p className="public-eyebrow">AUTOMATED EXECUTION PIPELINE</p>
                <h2 id="how-title">How LabLink evaluates your code</h2>
              </div>
              <p>Trusted evaluation happens on the server against real network services, never on client-reported output.</p>
            </div>
            <ol className="public-steps">
              {[
                ['1. Launch your attempt', 'Pick an assignment. A fresh numbered attempt is registered with a snapshot of enabled test cases.'],
                ['2. Execute against live sockets', 'Your JavaScript runs in QuickJS WebAssembly inside a constrained worker with capability-controlled sockets.'],
                ['3. Real-time verdict & evidence', 'The gateway evaluates your result against live network packets, streaming output and scores back over WebSocket.']
              ].map(([title, text], index) => (
                <li key={title}>
                  <span className="public-step-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

      </main>

      <footer className="public-footer">
        <div className="public-container">
          <div>
            <strong>LabLink</strong> · Connected Virtual Laboratory
            <p style={{margin: '4px 0 0', color: '#6b7a90'}}>Computer Network Technology · Educational Virtual Lab Platform</p>
          </div>
          <div className="footer-links">
            <Link to="/login/student">Student Login</Link>
            <Link to="/login/faculty">Faculty Login</Link>
            <Link to="/login/admin">Admin Login</Link>
            <Link to="/register">Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function NotFoundPage() {
  const {profile} = useAuth()
  const dashboard = dashboardFor(profile?.role)
  return (
    <div className="public-page">
      <PublicHeader/>
      <main className="public-not-found">
        <p className="public-eyebrow">404 · PAGE NOT FOUND</p>
        <h1>This page isn’t in the laboratory.</h1>
        <p>Check the address or choose a workspace from the homepage.</p>
        <Link className="public-button" to="/">Back to homepage <ArrowRight size={18} aria-hidden="true"/></Link>
        {dashboard && <Link to={dashboard}>Continue to Dashboard</Link>}
      </main>
    </div>
  )
}
