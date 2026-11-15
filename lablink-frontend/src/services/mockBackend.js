// In-browser mock backend and database service.
// Persists users, assignments, attempts, submissions, and audit logs in localStorage.
// Eliminates the need for external paid backend, database, or gateway hosting.

const STORAGE_KEYS = {
  USERS: 'lablink_mock_users',
  ASSIGNMENTS: 'lablink_mock_assignments',
  ATTEMPTS: 'lablink_mock_attempts',
  SUBMISSIONS: 'lablink_mock_submissions',
  AUDIT: 'lablink_mock_audit',
  SERVERS: 'lablink_mock_servers',
  CURRENT_USER: 'lablink_mock_current_user'
}

const DEFAULT_USERS = [
  { id: 'usr-student-1', name: 'Demo Student', email: 'student@lablink.edu', role: 'STUDENT', status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 'usr-faculty-1', name: 'Prof. Sharma', email: 'faculty@lablink.edu', role: 'FACULTY', status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 'usr-admin-1', name: 'Lab Administrator', email: 'admin@lablink.edu', role: 'ADMIN', status: 'ACTIVE', createdAt: new Date().toISOString() }
]

const DEFAULT_SERVERS = [
  { id: 'srv-1', name: 'TCP Chat Server', service: 'chat', address: '127.0.0.1', port: 9001, protocol: 'TCP', status: 'ACTIVE', health: 'HEALTHY' },
  { id: 'srv-2', name: 'Reliable File Server', service: 'file', address: '127.0.0.1', port: 9002, protocol: 'TCP', status: 'ACTIVE', health: 'HEALTHY' },
  { id: 'srv-3', name: 'UDP Telemetry Server', service: 'udp', address: '127.0.0.1', port: 9003, protocol: 'UDP', status: 'ACTIVE', health: 'HEALTHY' },
  { id: 'srv-4', name: 'Student Information REST API', service: 'http', address: '127.0.0.1', port: 8080, protocol: 'HTTP', status: 'ACTIVE', health: 'HEALTHY' },
  { id: 'srv-5', name: 'DNS Resolver Service', service: 'dns', address: '127.0.0.1', port: 5353, protocol: 'DNS', status: 'ACTIVE', health: 'HEALTHY' },
  { id: 'srv-6', name: 'Network Health Monitor', service: 'monitor', address: '127.0.0.1', port: 9006, protocol: 'HTTP', status: 'ACTIVE', health: 'HEALTHY' },
  { id: 'srv-7', name: 'Document Archive Search Server', service: 'search', address: '127.0.0.1', port: 9007, protocol: 'TCP', status: 'ACTIVE', health: 'HEALTHY' }
]

const DEFAULT_ASSIGNMENTS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'TCP Chat Client',
    slug: 'tcp-chat',
    protocol: 'TCP',
    difficulty: 'EASY',
    status: 'ACTIVE',
    description: 'Build a college messaging client with a username handshake, multiple messages and graceful disconnection.',
    requirements: ['Handshake with USER <name>', 'Send MSG <text> and read each reply', 'QUIT gracefully; catch connection failures'],
    concepts: ['TCP', 'Sockets', 'Connection lifecycle'],
    metadata: {
      objective: 'Build a college messaging client with a username handshake, multiple messages and graceful disconnection.',
      starterCode: 'function solve(input) {\n  var socket = tcp.connect(input.service);\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}',
      capabilityApi: 'tcp.connect(\'chat\'|\'file\'|\'search\'|\'offline\'), tcp.send(id,line), tcp.read(id), tcp.close(id); print(value).'
    },
    testCases: [
      { id: 'tc-1-1', name: 'Handshake and message', type: 'tcp-chat', weight: 35, configuration: { input: { service: 'chat', username: 'Ada', messages: ['Hello'] } } },
      { id: 'tc-1-2', name: 'Multiple messages and disconnect', type: 'tcp-chat', weight: 40, configuration: { input: { service: 'chat', username: 'Lin', messages: ['first', 'second', 'third'] } } },
      { id: 'tc-1-3', name: 'Connection failure', type: 'tcp-chat', weight: 25, configuration: { input: { service: 'offline', username: 'Test', messages: [] } } }
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Reliable File Transfer',
    slug: 'file-transfer',
    protocol: 'TCP',
    difficulty: 'MEDIUM',
    status: 'ACTIVE',
    description: 'Receive, save and verify a requested file through a real TCP stream.',
    requirements: ['Send GET <filename>', 'Parse JSON header and all DATA chunks until END', 'Save the reconstructed file and verify SHA-256', 'Handle missing and interrupted transfers'],
    concepts: ['Streams', 'Buffering', 'Integrity'],
    metadata: {
      objective: 'Receive, save and verify a requested file through a real TCP stream.',
      starterCode: 'function solve(input) {\n  var id = tcp.connect("file");\n  tcp.send(id, "GET " + input.filename);\n  var first = tcp.read(id);\n  if (first === "ERROR NOT_FOUND") { tcp.close(id); return { error: true }; }\n  var header = JSON.parse(first);\n  var content = "", line;\n  while ((line = tcp.read(id)) !== null && line !== "END") {\n    content += decodeBase64(line.slice(5));\n  }\n  tcp.close(id);\n  if (line !== "END" || sha256(content) !== header.sha256) return { error: true };\n  save(input.filename, content);\n  return { name: input.filename, content: content, sha256: sha256(content), saved: true };\n}',
      capabilityApi: 'tcp.connect(\'file\'), tcp.send(id,line), tcp.read(id), tcp.close(id); save(name,content); sha256(content); decodeBase64(str).'
    },
    testCases: [
      { id: 'tc-2-1', name: 'Complete small file', type: 'file-transfer', weight: 30, configuration: { input: { filename: 'welcome.txt' } } },
      { id: 'tc-2-2', name: 'Stream reconstruction and integrity', type: 'file-transfer', weight: 40, configuration: { input: { filename: 'networks.txt' } } },
      { id: 'tc-2-3', name: 'Missing file', type: 'file-transfer', weight: 15, configuration: { input: { filename: 'missing.txt' } } },
      { id: 'tc-2-4', name: 'Interrupted transfer', type: 'file-transfer', weight: 15, configuration: { input: { filename: 'interrupted.txt' } } }
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'UDP Multiplayer Position & Telemetry System',
    slug: 'udp-telemetry',
    protocol: 'UDP',
    difficulty: 'MEDIUM',
    status: 'ACTIVE',
    description: 'Send player coordinates and process broadcast updates while rejecting stale packets.',
    requirements: ['Send UDP datagrams using udp.exchange', 'Track positions for every player', 'Keep only the highest sequence for each player'],
    concepts: ['Datagrams', 'Packet loss', 'Sequence numbers'],
    metadata: {
      objective: 'Send player coordinates and process broadcast updates while rejecting stale packets.',
      starterCode: 'function solve(input) {\n  var positions = {};\n  var rec = udp.exchange(input.updates);\n  for (var i = 0; i < rec.length; i++) {\n    var u = rec[i];\n    if (!positions[u.player] || u.seq > positions[u.player].seq) {\n      positions[u.player] = { x: u.x, y: u.y, seq: u.seq };\n    }\n  }\n  return { positions: positions };\n}',
      capabilityApi: 'udp.exchange(updates); print(value).'
    },
    testCases: [
      { id: 'tc-3-1', name: 'Position exchange', type: 'udp-telemetry', weight: 30, configuration: { input: { updates: [{ player: 'alice', x: 2, y: 3, seq: 1 }] } } },
      { id: 'tc-3-2', name: 'Multiple players', type: 'udp-telemetry', weight: 30, configuration: { input: { updates: [{ player: 'alice', x: 4, y: 5, seq: 2 }, { player: 'bob', x: 7, y: 8, seq: 1 }] } } },
      { id: 'tc-3-3', name: 'Out of order updates', type: 'udp-telemetry', weight: 40, configuration: { input: { updates: [{ player: 'alice', x: 8, y: 9, seq: 5 }, { player: 'alice', x: 0, y: 0, seq: 2 }, { player: 'bob', x: 3, y: 2, seq: 3 }] } } }
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    title: 'College Student Information API Client',
    slug: 'http-api',
    protocol: 'HTTP',
    difficulty: 'EASY',
    status: 'ACTIVE',
    description: 'Retrieve and display student records, validating HTTP status before parsing JSON.',
    requirements: ['GET the configured student path', 'Parse response JSON', 'Return name, rollNumber, department and attendance', 'Handle 4xx and 5xx explicitly'],
    concepts: ['HTTP', 'Status codes', 'REST', 'JSON'],
    metadata: {
      objective: 'Retrieve and display student records, validating HTTP status before parsing JSON.',
      starterCode: 'function solve(input) {\n  var res = http.request(input.path, "GET");\n  if (res.status !== 200) return { error: true, status: res.status };\n  return JSON.parse(res.body);\n}',
      capabilityApi: 'http.request(path, method); print(value).'
    },
    testCases: [
      { id: 'tc-4-1', name: 'Student record and JSON', type: 'http-api', weight: 50, configuration: { input: { path: '/students/42' } } },
      { id: 'tc-4-2', name: 'Not found', type: 'http-api', weight: 25, configuration: { input: { path: '/students/missing' } } },
      { id: 'tc-4-3', name: 'Service failure', type: 'http-api', weight: 25, configuration: { input: { path: '/failure' } } }
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    title: 'DNS Troubleshooting Challenge',
    slug: 'dns-troubleshooting',
    protocol: 'DNS',
    difficulty: 'MEDIUM',
    status: 'ACTIVE',
    description: 'Investigate why portal.lablink.edu does not open using a controlled DNS resolver and actual reachability checks.',
    requirements: ['Query the affected and working names', 'Compare DNS answers with endpoint reachability', 'Record observations, evidence, root cause and recommended fix'],
    concepts: ['DNS', 'A records', 'Resolution', 'Troubleshooting'],
    metadata: {
      objective: 'Investigate why portal.lablink.edu does not open using a controlled DNS resolver and actual reachability checks.',
      starterCode: 'function solve(input) {\n  var bad = dns.lookup(input.name);\n  var good = dns.lookup(input.comparison);\n  var failing = http.probe("resolved");\n  var working = http.probe("portal");\n  return {\n    observations: "The resolved endpoint fails while portal is reachable",\n    dnsInformation: JSON.stringify({ bad: bad, good: good }),\n    evidence: JSON.stringify({ failing: failing, working: working }),\n    rootCause: "Incorrect DNS A record address",\n    recommendedFix: "Update the A record to " + good.address\n  };\n}',
      capabilityApi: 'dns.lookup(name); http.probe(name); print(value).'
    },
    testCases: [
      { id: 'tc-5-1', name: 'DNS investigation', type: 'dns-troubleshooting', weight: 35, configuration: { input: { name: 'portal.lablink.edu', comparison: 'working.lablink.edu' } } },
      { id: 'tc-5-2', name: 'Reachability evidence', type: 'dns-troubleshooting', weight: 30, configuration: { input: { name: 'portal.lablink.edu', comparison: 'working.lablink.edu' } } },
      { id: 'tc-5-3', name: 'Diagnosis and repair recommendation', type: 'dns-troubleshooting', weight: 35, configuration: { input: { name: 'portal.lablink.edu', comparison: 'working.lablink.edu' } } }
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    title: 'Network Monitoring System',
    slug: 'network-monitor',
    protocol: 'HTTP',
    difficulty: 'MEDIUM',
    status: 'ACTIVE',
    description: 'Measure configured college services, reporting availability and real elapsed latency.',
    requirements: ['Probe each configured service', 'Distinguish HTTP failure, refused connection and timeout', 'Return availability and measured latency'],
    concepts: ['Availability', 'Latency', 'Timeouts', 'Monitoring'],
    metadata: {
      objective: 'Measure configured college services, reporting availability and real elapsed latency.',
      starterCode: 'function solve(input) {\n  var list = input.servers.map(function(name) {\n    var r = http.probe(name);\n    var online = r.status >= 200 && r.status < 300;\n    return {\n      name: name,\n      status: online ? "ONLINE" : "OFFLINE",\n      latencyMs: r.latencyMs,\n      reason: r.error || (r.status >= 400 ? "HTTP " + r.status : "")\n    };\n  });\n  return { servers: list };\n}',
      capabilityApi: 'http.probe(name); print(value).'
    },
    testCases: [
      { id: 'tc-6-1', name: 'Online endpoints', type: 'network-monitor', weight: 35, configuration: { input: { servers: ['lab', 'file', 'web'] } } },
      { id: 'tc-6-2', name: 'Unavailable database', type: 'network-monitor', weight: 30, configuration: { input: { servers: ['lab', 'database'] } } },
      { id: 'tc-6-3', name: 'Timeout handling', type: 'network-monitor', weight: 35, configuration: { input: { servers: ['slow', 'web'] } } }
    ]
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    title: 'Client-Server File Search',
    slug: 'file-search',
    protocol: 'TCP',
    difficulty: 'MEDIUM',
    status: 'ACTIVE',
    description: 'Search a central document server and download a chosen matching file.',
    requirements: ['Send SEARCH <query> and parse matching files', 'Send GET <selected filename>', 'Decode and save the file', 'Handle empty results and invalid selection'],
    concepts: ['TCP', 'Request/response', 'Search', 'File transfer'],
    metadata: {
      objective: 'Search a central document server and download a chosen matching file.',
      starterCode: 'function solve(input) {\n  var id = tcp.connect("search");\n  tcp.send(id, "SEARCH " + input.query);\n  var results = JSON.parse(tcp.read(id));\n  if (!results.length) { tcp.close(id); return { results: results }; }\n  tcp.send(id, "GET " + input.select);\n  var file = JSON.parse(tcp.read(id));\n  tcp.close(id);\n  if (file.error) return { results: results, error: true };\n  save(file.name, file.content);\n  return { results: results, name: file.name, content: file.content, saved: true };\n}',
      capabilityApi: 'tcp.connect(\'search\'), tcp.send(id,line), tcp.read(id), tcp.close(id); save(name,content); print(value).'
    },
    testCases: [
      { id: 'tc-7-1', name: 'Search and download', type: 'file-search', weight: 50, configuration: { input: { query: 'network', select: 'networks.txt' } } },
      { id: 'tc-7-2', name: 'No matching documents', type: 'file-search', weight: 25, configuration: { input: { query: 'absent', select: null } } },
      { id: 'tc-7-3', name: 'Invalid selection', type: 'file-search', weight: 25, configuration: { input: { query: 'welcome', select: 'missing.txt' } } }
    ]
  }
]

function getStored(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setStored(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota errors
  }
}

// Ensure initial database seeds exist
export function initMockDatabase() {
  if (!getStored(STORAGE_KEYS.USERS, null)) setStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
  if (!getStored(STORAGE_KEYS.ASSIGNMENTS, null)) setStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
  if (!getStored(STORAGE_KEYS.SERVERS, null)) setStored(STORAGE_KEYS.SERVERS, DEFAULT_SERVERS)
  if (!getStored(STORAGE_KEYS.ATTEMPTS, null)) setStored(STORAGE_KEYS.ATTEMPTS, [])
  if (!getStored(STORAGE_KEYS.SUBMISSIONS, null)) setStored(STORAGE_KEYS.SUBMISSIONS, [])
  if (!getStored(STORAGE_KEYS.AUDIT, null)) {
    setStored(STORAGE_KEYS.AUDIT, [
      { id: 'aud-1', actor: 'System', action: 'BOOTSTRAP', resource: 'SYSTEM', details: 'Client-side virtual laboratory initialized.', createdAt: new Date().toISOString() }
    ])
  }
}

export function getCurrentMockUser() {
  return getStored(STORAGE_KEYS.CURRENT_USER, null)
}

export function setCurrentMockUser(user) {
  setStored(STORAGE_KEYS.CURRENT_USER, user)
}

function logAudit(actor, action, resource, details) {
  const audit = getStored(STORAGE_KEYS.AUDIT, [])
  audit.unshift({
    id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    actor: actor || 'User',
    action,
    resource,
    details,
    createdAt: new Date().toISOString()
  })
  setStored(STORAGE_KEYS.AUDIT, audit.slice(0, 50))
}

// Router for mock API requests
export async function handleMockApiRequest(path, options = {}) {
  initMockDatabase()
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}
  const currentUser = getCurrentMockUser() || DEFAULT_USERS[0]

  // === AUTHENTICATION ===
  if (path === '/api/auth/login' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase()
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    let found = users.find(u => u.email.toLowerCase() === email)

    if (!found) {
      // Auto-detect role from email or allow flexible sign-in so no user is blocked
      let role = 'STUDENT'
      let name = email.split('@')[0] || 'User'
      if (email.includes('faculty') || email.includes('prof') || email.includes('teacher')) {
        role = 'FACULTY'
        name = 'Faculty Member'
      } else if (email.includes('admin') || email.includes('root')) {
        role = 'ADMIN'
        name = 'System Administrator'
      }
      found = {
        id: 'usr-' + Date.now(),
        name,
        email,
        role,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }
      users.push(found)
      setStored(STORAGE_KEYS.USERS, users)
    }

    setCurrentMockUser(found)
    logAudit(found.email, 'LOGIN', 'AUTH', `User logged in as ${found.role}.`)
    return { token: 'mock-jwt-' + found.id, user: found }
  }

  if (path === '/api/auth/register' && method === 'POST') {
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const email = (body.email || '').trim().toLowerCase()
    let found = users.find(u => u.email.toLowerCase() === email)
    if (found) throw new Error('An account with this email address already exists.')

    const newUser = {
      id: 'usr-' + Date.now(),
      name: body.name || 'Student',
      email,
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    users.push(newUser)
    setStored(STORAGE_KEYS.USERS, users)
    setCurrentMockUser(newUser)
    logAudit(newUser.email, 'REGISTER', 'USER', 'New student registered.')
    return { token: 'mock-jwt-' + newUser.id, user: newUser }
  }

  if (path === '/api/auth/me') {
    return currentUser
  }

  if (path === '/api/auth/logout') {
    if (currentUser) logAudit(currentUser.email, 'LOGOUT', 'AUTH', 'User signed out.')
    setCurrentMockUser(null)
    return { message: 'Logged out successfully' }
  }

  // === ASSIGNMENTS ===
  if (path === '/api/assignments' || path === '/api/admin/assignments') {
    return getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
  }

  if (path.startsWith('/api/assignments/')) {
    const id = path.replace('/api/assignments/', '')
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const found = assignments.find(a => a.id === id || a.slug === id)
    if (!found) throw new Error('Assignment not found')
    return found
  }

  // === SESSIONS / ATTEMPTS ===
  if (path === '/api/sessions' && method === 'POST') {
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const assignment = assignments.find(a => a.id === body.assignmentId || a.slug === body.assignmentId) || assignments[0]
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const existing = attempts.filter(a => a.studentId === currentUser.id && a.assignmentId === assignment.id)

    const newAttempt = {
      id: 'att-' + Date.now(),
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      assignmentSlug: assignment.slug,
      assignment,
      attemptNumber: existing.length + 1,
      status: 'STARTING',
      solution: assignment.metadata?.starterCode || '',
      automatedScore: null,
      testResults: [],
      executionOutput: '',
      networkLog: '',
      startedAt: new Date().toISOString()
    }
    attempts.unshift(newAttempt)
    setStored(STORAGE_KEYS.ATTEMPTS, attempts)
    return newAttempt
  }

  if (path === '/api/sessions' && method === 'GET') {
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    return attempts.filter(a => a.studentId === currentUser.id)
  }

  if (path.startsWith('/api/sessions/') && path.endsWith('/submit') && method === 'POST') {
    const id = path.split('/')[3]
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const att = attempts.find(a => a.id === id)
    if (!att) throw new Error('Attempt not found')

    att.status = 'SUBMITTED'
    setStored(STORAGE_KEYS.ATTEMPTS, attempts)

    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const sub = {
      id: 'sub-' + Date.now(),
      attemptId: att.id,
      studentId: att.studentId,
      studentName: att.studentName,
      studentEmail: att.studentEmail,
      assignmentId: att.assignmentId,
      assignmentTitle: att.assignmentTitle,
      solution: att.solution,
      automatedScore: att.automatedScore || 0,
      facultyGrade: null,
      facultyFeedback: null,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString()
    }
    submissions.unshift(sub)
    setStored(STORAGE_KEYS.SUBMISSIONS, submissions)
    logAudit(currentUser.email, 'SUBMIT', 'ASSIGNMENT', `Submitted assignment ${att.assignmentTitle}.`)
    return sub
  }

  if (path.startsWith('/api/sessions/') && method === 'GET') {
    const id = path.replace('/api/sessions/', '')
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const found = attempts.find(a => a.id === id)
    if (!found) throw new Error('Attempt not found')
    return found
  }

  // === SUBMISSIONS ===
  if (path === '/api/submissions') {
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    return submissions.filter(s => s.studentId === currentUser.id)
  }

  if (path.startsWith('/api/submissions/')) {
    const id = path.replace('/api/submissions/', '')
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const found = submissions.find(s => s.id === id)
    if (!found) throw new Error('Submission not found')
    return found
  }

  // === FACULTY ===
  if (path === '/api/faculty/dashboard') {
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const students = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS).filter(u => u.role === 'STUDENT')
    return {
      totalSubmissions: submissions.length,
      pendingReviews: submissions.filter(s => s.status === 'SUBMITTED').length,
      reviewedSubmissions: submissions.filter(s => s.status === 'REVIEWED').length,
      activeStudents: students.length
    }
  }

  if (path.startsWith('/api/faculty/sessions')) {
    return getStored(STORAGE_KEYS.ATTEMPTS, [])
  }

  if (path === '/api/faculty/students') {
    const students = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS).filter(u => u.role === 'STUDENT')
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    return students.map(s => ({
      ...s,
      submissionsCount: submissions.filter(sub => sub.studentId === s.id).length
    }))
  }

  if (path === '/api/faculty/submissions') {
    return getStored(STORAGE_KEYS.SUBMISSIONS, [])
  }

  if (path.startsWith('/api/faculty/submissions/') && path.endsWith('/review') && method === 'PATCH') {
    const id = path.split('/')[4]
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const sub = submissions.find(s => s.id === id)
    if (!sub) throw new Error('Submission not found')

    sub.facultyGrade = body.grade
    sub.facultyFeedback = body.feedback
    sub.status = body.status || 'REVIEWED'
    sub.reviewedAt = new Date().toISOString()
    setStored(STORAGE_KEYS.SUBMISSIONS, submissions)
    logAudit(currentUser.email, 'REVIEW', 'SUBMISSION', `Reviewed submission ${sub.id} with grade ${body.grade}.`)
    return sub
  }

  if (path.startsWith('/api/faculty/submissions/')) {
    const id = path.replace('/api/faculty/submissions/', '')
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const found = submissions.find(s => s.id === id)
    if (!found) throw new Error('Submission not found')
    return found
  }

  // === ADMIN ===
  if (path === '/api/admin/dashboard') {
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const audit = getStored(STORAGE_KEYS.AUDIT, [])
    return {
      totalStudents: users.filter(u => u.role === 'STUDENT').length,
      totalFaculty: users.filter(u => u.role === 'FACULTY').length,
      activeAssignments: assignments.filter(a => a.status === 'ACTIVE').length,
      totalAttempts: attempts.length,
      recentAudits: audit.slice(0, 5)
    }
  }

  if (path.startsWith('/api/admin/users')) {
    return getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
  }

  if (path === '/api/admin/faculty' && method === 'POST') {
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const newFaculty = {
      id: 'usr-' + Date.now(),
      name: body.name || 'Faculty Member',
      email: body.email,
      role: 'FACULTY',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    users.push(newFaculty)
    setStored(STORAGE_KEYS.USERS, users)
    logAudit(currentUser.email, 'CREATE_FACULTY', 'USER', `Created faculty account ${body.email}.`)
    return newFaculty
  }

  if (path.startsWith('/api/admin/users/') && path.endsWith('/status') && method === 'PATCH') {
    const id = path.split('/')[4]
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const u = users.find(user => user.id === id)
    if (u) {
      u.status = body.status
      setStored(STORAGE_KEYS.USERS, users)
      logAudit(currentUser.email, 'SET_STATUS', 'USER', `Updated user ${u.email} status to ${body.status}.`)
    }
    return u
  }

  if (path === '/api/admin/servers') {
    return getStored(STORAGE_KEYS.SERVERS, DEFAULT_SERVERS)
  }

  if (path.startsWith('/api/admin/servers/') && path.endsWith('/status') && method === 'PATCH') {
    const id = path.split('/')[4]
    const servers = getStored(STORAGE_KEYS.SERVERS, DEFAULT_SERVERS)
    const s = servers.find(srv => srv.id === id)
    if (s) {
      s.status = body.status
      setStored(STORAGE_KEYS.SERVERS, servers)
    }
    return s
  }

  if (path === '/api/admin/audit') {
    return getStored(STORAGE_KEYS.AUDIT, [])
  }

  // Fallback for unknown path
  return { status: 'OK', path }
}

export function saveLocalAttemptUpdate(attemptId, updates) {
  const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
  const att = attempts.find(a => a.id === attemptId)
  if (att) {
    Object.assign(att, updates)
    setStored(STORAGE_KEYS.ATTEMPTS, attempts)
  }
}
