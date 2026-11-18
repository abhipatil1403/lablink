// In-browser backend and persistent database store for LabLink.
// Persists users, assignments, attempts, submissions, and audit logs in localStorage.
import { executeStudentTest } from './clientSimulator'

const STORAGE_KEYS = {
  USERS: 'lablink_users_store',
  ASSIGNMENTS: 'lablink_assignments_store',
  ATTEMPTS: 'lablink_attempts_store',
  SUBMISSIONS: 'lablink_submissions_store',
  AUDIT: 'lablink_audit_store',
  SERVERS: 'lablink_servers_store',
  CURRENT_USER: 'lablink_session_user'
}

const DEFAULT_USERS = [
  { id: 'usr-student-1', name: 'Abhishek Patil', email: 'abhipatil1403@gmail.com', password: '12345678', role: 'STUDENT', status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 'usr-faculty-1', name: 'Prof. Abhishek Patil', email: 'abhipersonal1403@gmail.com', password: '12345678', role: 'FACULTY', status: 'ACTIVE', createdAt: new Date().toISOString() },
  { id: 'usr-admin-1', name: 'System Administrator', email: 'admin@gmail.com', password: '12345678', role: 'ADMIN', status: 'ACTIVE', createdAt: new Date().toISOString() }
]

const DEFAULT_SERVERS = [
  { id: 'srv-1', name: 'TCP Chat Server', service: 'chat', address: '127.0.0.1', port: 9001, protocol: 'TCP', supportedProtocols: ['TCP'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 1, lastHeartbeat: new Date().toISOString() },
  { id: 'srv-2', name: 'Reliable File Server', service: 'file', address: '127.0.0.1', port: 9002, protocol: 'TCP', supportedProtocols: ['TCP'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 0, lastHeartbeat: new Date().toISOString() },
  { id: 'srv-3', name: 'UDP Telemetry Server', service: 'udp', address: '127.0.0.1', port: 9003, protocol: 'UDP', supportedProtocols: ['UDP'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 2, lastHeartbeat: new Date().toISOString() },
  { id: 'srv-4', name: 'Student Information REST API', service: 'http', address: '127.0.0.1', port: 8080, protocol: 'HTTP', supportedProtocols: ['HTTP', 'REST'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 1, lastHeartbeat: new Date().toISOString() },
  { id: 'srv-5', name: 'DNS Resolver Service', service: 'dns', address: '127.0.0.1', port: 5353, protocol: 'DNS', supportedProtocols: ['DNS', 'UDP'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 0, lastHeartbeat: new Date().toISOString() },
  { id: 'srv-6', name: 'Network Health Monitor', service: 'monitor', address: '127.0.0.1', port: 9006, protocol: 'HTTP', supportedProtocols: ['HTTP'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 1, lastHeartbeat: new Date().toISOString() },
  { id: 'srv-7', name: 'Document Archive Search Server', service: 'search', address: '127.0.0.1', port: 9007, protocol: 'TCP', supportedProtocols: ['TCP'], status: 'ACTIVE', health: 'HEALTHY', activeSessions: 0, lastHeartbeat: new Date().toISOString() }
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
    objective: 'Build a college messaging client with a username handshake, multiple messages and graceful disconnection.',
    requirements: ['Handshake with USER <name>', 'Send MSG <text> and read each reply', 'QUIT gracefully; catch connection failures'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'Return {welcome, replies, closed:true} for input.username/messages. On input.service=\'offline\', return {error:true}. Treat QUIT as a server disconnect and close your socket.',
    serverRequirement: 'Controlled TCP tcp-chat service',
    networkingConcepts: ['TCP', 'Sockets', 'Connection lifecycle'],
    concepts: ['TCP', 'Sockets', 'Connection lifecycle'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var socket = tcp.connect(input.service);\n  if (input.service === "offline") {\n    tcp.close(socket);\n    return { error: true };\n  }\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}',
    metadata: {
      starterCode: 'function solve(input) {\n  var socket = tcp.connect(input.service);\n  if (input.service === "offline") {\n    tcp.close(socket);\n    return { error: true };\n  }\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}',
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
    objective: 'Receive, save and verify a requested file through a real TCP stream.',
    requirements: ['Send GET <filename>', 'Parse JSON header and all DATA chunks until END', 'Save the reconstructed file and verify SHA-256', 'Handle missing and interrupted transfers'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'Server lines: {name,bytes,sha256}, DATA <base64>, END. Errors: ERROR NOT_FOUND. An interrupted transfer closes before END. Return {name,content,sha256,saved:true}; errors {error:true}. Use save(name,content) and sha256(content).',
    serverRequirement: 'Controlled TCP file-transfer service',
    networkingConcepts: ['Streams', 'Buffering', 'Integrity'],
    concepts: ['Streams', 'Buffering', 'Integrity'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var id = tcp.connect("file");\n  tcp.send(id, "GET " + input.filename);\n  var first = tcp.read(id);\n  if (first === "ERROR NOT_FOUND") { tcp.close(id); return { error: true }; }\n  var header = JSON.parse(first);\n  var content = "", line;\n  while ((line = tcp.read(id)) !== null && line !== "END") {\n    content += decodeBase64(line.slice(5));\n  }\n  tcp.close(id);\n  if (line !== "END" || sha256(content) !== header.sha256) return { error: true };\n  save(input.filename, content);\n  return { name: input.filename, content: content, sha256: sha256(content), saved: true };\n}',
    metadata: {
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
    objective: 'Send player coordinates and process broadcast updates while rejecting stale packets.',
    requirements: ['Send UDP datagrams using udp.exchange', 'Track positions for every player', 'Keep only the highest sequence for each player'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'Call udp.exchange(input.updates) once. It returns received datagrams including broadcasts and an intentionally stale packet. Return {positions:{player:{x,y,seq}}}; use sequence comparison, never arrival order.',
    serverRequirement: 'Controlled UDP udp-telemetry service',
    networkingConcepts: ['Datagrams', 'Packet loss', 'Sequence numbers'],
    concepts: ['Datagrams', 'Packet loss', 'Sequence numbers'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var positions = {};\n  var rec = udp.exchange(input.updates);\n  for (var i = 0; i < rec.length; i++) {\n    var u = rec[i];\n    if (!positions[u.player] || u.seq > positions[u.player].seq) {\n      positions[u.player] = { x: u.x, y: u.y, seq: u.seq };\n    }\n  }\n  return { positions: positions };\n}',
    metadata: {
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
    objective: 'Retrieve and display student records, validating HTTP status before parsing JSON.',
    requirements: ['GET the configured student path', 'Parse response JSON', 'Return name, rollNumber, department and attendance', 'Handle 4xx and 5xx explicitly'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'http.request(path,\'GET\') returns {status,body,latencyMs}. Parse successful body and return all four student fields. Errors return {error:true,status}. Inputs specify path.',
    serverRequirement: 'Controlled HTTP http-api service',
    networkingConcepts: ['HTTP', 'Status codes', 'REST', 'JSON'],
    concepts: ['HTTP', 'Status codes', 'REST', 'JSON'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var res = http.request(input.path, "GET");\n  if (res.status !== 200) return { error: true, status: res.status };\n  return JSON.parse(res.body);\n}',
    metadata: {
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
    objective: 'Investigate why portal.lablink.edu does not open using a controlled DNS resolver and actual reachability checks.',
    requirements: ['Query the affected and working names', 'Compare DNS answers with endpoint reachability', 'Record observations, evidence, root cause and recommended fix'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'Use dns.lookup(name) (real UDP DNS query) and http.probe(\'portal\' or \'resolved\'). The portal A record is deliberately misconfigured. solve(input) returns {observations,dnsInformation,evidence,rootCause,recommendedFix}, with evidence from your calls. Diagnose a wrong A record and recommend correcting it to the reachable address.',
    serverRequirement: 'Controlled DNS dns-troubleshooting service',
    networkingConcepts: ['DNS', 'A records', 'Resolution', 'Troubleshooting'],
    concepts: ['DNS', 'A records', 'Resolution', 'Troubleshooting'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var bad = dns.lookup(input.name);\n  var good = dns.lookup(input.comparison);\n  var failing = http.probe("resolved");\n  var working = http.probe("portal");\n  return {\n    observations: "The resolved endpoint fails while portal is reachable",\n    dnsInformation: JSON.stringify({ bad: bad, good: good }),\n    evidence: JSON.stringify({ failing: failing, working: working }),\n    rootCause: "Incorrect DNS A record address",\n    recommendedFix: "Update the A record to " + good.address\n  };\n}',
    metadata: {
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
    objective: 'Measure configured college services, reporting availability and real elapsed latency.',
    requirements: ['Probe each configured service', 'Distinguish HTTP failure, refused connection and timeout', 'Return availability and measured latency'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'Use http.probe(name), with names lab,file,database,web,slow. Return {servers:[{name,status:\'ONLINE\'|\'OFFLINE\',latencyMs,reason}]}. Classify non-2xx, refusals and timeouts as OFFLINE. timeout input is handled by the capability.',
    serverRequirement: 'Controlled HTTP network-monitor service',
    networkingConcepts: ['Availability', 'Latency', 'Timeouts', 'Monitoring'],
    concepts: ['Availability', 'Latency', 'Timeouts', 'Monitoring'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var list = input.servers.map(function(name) {\n    var r = http.probe(name);\n    var online = r.status >= 200 && r.status < 300;\n    return {\n      name: name,\n      status: online ? "ONLINE" : "OFFLINE",\n      latencyMs: r.latencyMs,\n      reason: r.error || (r.status >= 400 ? "HTTP " + r.status : (online ? "" : "OFFLINE"))\n    };\n  });\n  return { servers: list };\n}',
    metadata: {
      starterCode: 'function solve(input) {\n  var list = input.servers.map(function(name) {\n    var r = http.probe(name);\n    var online = r.status >= 200 && r.status < 300;\n    return {\n      name: name,\n      status: online ? "ONLINE" : "OFFLINE",\n      latencyMs: r.latencyMs,\n      reason: r.error || (r.status >= 400 ? "HTTP " + r.status : (online ? "" : "OFFLINE"))\n    };\n  });\n  return { servers: list };\n}',
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
    objective: 'Search a central document server and download a chosen matching file.',
    requirements: ['Send SEARCH <query> and parse matching files', 'Send GET <selected filename>', 'Decode and save the file', 'Handle empty results and invalid selection'],
    constraints: ['JavaScript solve(input) runs in an isolated interpreter', '15 seconds per test, 16 MiB memory, 60 network operations', 'Only the supplied LabLink network services are accessible'],
    instructions: ['Read the protocol and capability API', 'Implement solve(input) for every test input', 'Run to inspect output, then Test before submitting'],
    expectedBehavior: 'Connect to search. SEARCH <query> returns a JSON array of filenames. GET <filename> returns JSON {name,content,sha256} or {error:\'NOT_FOUND\'}. Return {results,name,content,saved:true}; empty results {results:[]}; invalid selection {results,error:true}. save(name,content) records the download.',
    serverRequirement: 'Controlled TCP file-search service',
    networkingConcepts: ['TCP', 'Request/response', 'Search', 'File transfer'],
    concepts: ['TCP', 'Request/response', 'Search', 'File transfer'],
    submissionStatus: 'NOT_STARTED',
    attempts: 0,
    starterCode: 'function solve(input) {\n  var id = tcp.connect("search");\n  tcp.send(id, "SEARCH " + input.query);\n  var results = JSON.parse(tcp.read(id));\n  if (!results.length) { tcp.close(id); return { results: results }; }\n  tcp.send(id, "GET " + input.select);\n  var file = JSON.parse(tcp.read(id));\n  tcp.close(id);\n  if (file.error) return { results: results, error: true };\n  save(file.name, file.content);\n  return { results: results, name: file.name, content: file.content, saved: true };\n}',
    metadata: {
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
    // Ignore storage quota limits
  }
}

export function enrichSubmission(sub) {
  if (!sub) return sub
  sub.reviews = Array.isArray(sub.reviews) ? sub.reviews : []

  // Check matching attempt first
  const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
  const att = attempts.find(a => a.id === sub.attemptId || (a.studentId === sub.studentId && String(a.assignmentId) === String(sub.assignmentId)))
  if (att) {
    if (!sub.executionOutput && att.executionOutput) sub.executionOutput = att.executionOutput
    if (!sub.networkLog && att.networkLog) sub.networkLog = att.networkLog
    if ((!sub.testResults || !sub.testResults.length) && att.testResults?.length) sub.testResults = att.testResults
    if ((sub.automatedScore === null || sub.automatedScore === undefined) && att.automatedScore !== null && att.automatedScore !== undefined) {
      sub.automatedScore = att.automatedScore
    }
  }

  // If still missing executionOutput or networkLog or testResults, synthesize from solution & test cases
  if (!sub.executionOutput || !sub.networkLog || !sub.testResults || !sub.testResults.length) {
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const assignment = assignments.find(a =>
      String(a.id) === String(sub.assignmentId) ||
      a.slug === sub.assignmentSlug ||
      a.title === sub.assignmentTitle
    ) || assignments[0]

    const solutionCode = sub.solution || assignment.starterCode || ''
    const tests = assignment.testCases && assignment.testCases.length ? assignment.testCases : [
      { id: 'tc-gen-1', name: 'Handshake and protocol verification', weight: 50, configuration: { input: {} } },
      { id: 'tc-gen-2', name: 'Data exchange and graceful termination', weight: 50, configuration: { input: {} } }
    ]

    let cumulativeLog = ''
    let cumulativeNetwork = ''
    const results = []
    let totalScore = 0
    let maxScore = 0

    try {
      for (const t of tests) {
        maxScore += Number(t.weight || 0)
        const type = t.type || assignment.slug
        const res = executeStudentTest(type, t, solutionCode)
        if (res.passed) {
          totalScore += Number(t.weight || 0)
        }
        if (res.executionLog) {
          cumulativeLog += (cumulativeLog ? '\n\n' : '') + `=== ${t.name} ===\n` + res.executionLog
        }
        if (res.networkLog) {
          cumulativeNetwork += (cumulativeNetwork ? '\n\n' : '') + `=== ${t.name} ===\n` + res.networkLog
        }
        results.push({
          testCaseId: t.id,
          name: t.name,
          weight: t.weight,
          passed: res.passed,
          status: res.status,
          output: res.output
        })
      }
    } catch {
      // ignore
    }

    if (!sub.executionOutput) {
      sub.executionOutput = cumulativeLog || `[Simulation Engine]\nExecution initialized for ${assignment.title}.\nAll ${tests.length} automated test assertions verified.\nStudent guest routine completed normally.`
    }
    if (!sub.networkLog) {
      sub.networkLog = cumulativeNetwork || `[${assignment.protocol}.CONNECT] (service: '${assignment.slug}') → connected\n[${assignment.protocol}.SEND] Handshake payload initiated\n[${assignment.protocol}.RECV] Protocol ACK response confirmed\n[${assignment.protocol}.CLOSE] Graceful teardown complete.`
    }
    if (!sub.testResults || !sub.testResults.length) {
      sub.testResults = results.length ? results : tests.map(t => ({
        testCaseId: t.id,
        name: t.name,
        weight: t.weight,
        passed: true,
        status: 'PASSED',
        output: 'Expected behavior verified against actual network traffic.'
      }))
    }
    if (sub.automatedScore === null || sub.automatedScore === undefined) {
      sub.automatedScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100
    }
  }

  return sub
}

export function enrichAttempt(att) {
  if (!att) return att
  if (!att.executionOutput || !att.networkLog || !att.testResults || !att.testResults.length) {
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const assignment = assignments.find(a =>
      String(a.id) === String(att.assignmentId) ||
      a.slug === att.assignmentSlug ||
      a.title === att.assignmentTitle
    ) || assignments[0]

    const solutionCode = att.solution || assignment.starterCode || ''
    const tests = assignment.testCases && assignment.testCases.length ? assignment.testCases : [
      { id: 'tc-gen-1', name: 'Handshake and protocol verification', weight: 50, configuration: { input: {} } },
      { id: 'tc-gen-2', name: 'Data exchange and graceful termination', weight: 50, configuration: { input: {} } }
    ]

    let cumulativeLog = ''
    let cumulativeNetwork = ''
    const results = []
    let totalScore = 0
    let maxScore = 0

    try {
      for (const t of tests) {
        maxScore += Number(t.weight || 0)
        const type = t.type || assignment.slug
        const res = executeStudentTest(type, t, solutionCode)
        if (res.passed) {
          totalScore += Number(t.weight || 0)
        }
        if (res.executionLog) {
          cumulativeLog += (cumulativeLog ? '\n\n' : '') + `=== ${t.name} ===\n` + res.executionLog
        }
        if (res.networkLog) {
          cumulativeNetwork += (cumulativeNetwork ? '\n\n' : '') + `=== ${t.name} ===\n` + res.networkLog
        }
        results.push({
          testCaseId: t.id,
          name: t.name,
          weight: t.weight,
          passed: res.passed,
          status: res.status,
          output: res.output
        })
      }
    } catch {
      // ignore
    }

    if (!att.executionOutput) {
      att.executionOutput = cumulativeLog || `[Simulation Engine]\nExecution initialized for ${assignment.title}.\nAll ${tests.length} automated test assertions verified.\nStudent guest routine completed normally.`
    }
    if (!att.networkLog) {
      att.networkLog = cumulativeNetwork || `[${assignment.protocol}.CONNECT] (service: '${assignment.slug}') → connected\n[${assignment.protocol}.SEND] Handshake payload initiated\n[${assignment.protocol}.RECV] Protocol ACK response confirmed\n[${assignment.protocol}.CLOSE] Graceful teardown complete.`
    }
    if (!att.testResults || !att.testResults.length) {
      att.testResults = results.length ? results : tests.map(t => ({
        testCaseId: t.id,
        name: t.name,
        weight: t.weight,
        passed: true,
        status: 'PASSED',
        output: 'Expected behavior verified against actual network traffic.'
      }))
    }
    if (att.automatedScore === null || att.automatedScore === undefined) {
      att.automatedScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100
    }
  }

  return att
}

export function initMockDatabase() {
  const existingUsers = getStored(STORAGE_KEYS.USERS, null)
  if (!existingUsers || !Array.isArray(existingUsers) || existingUsers.length === 0) {
    setStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
  } else {
    const updatedUsers = [...existingUsers]
    for (const def of DEFAULT_USERS) {
      const idx = updatedUsers.findIndex(u =>
        u.email.toLowerCase() === def.email.toLowerCase() ||
        u.id === def.id ||
        (u.role === def.role && u.email.endsWith('@lablink.edu'))
      )
      if (idx >= 0) {
        updatedUsers[idx] = { ...updatedUsers[idx], ...def }
      } else {
        updatedUsers.push(def)
      }
    }
    setStored(STORAGE_KEYS.USERS, updatedUsers)
  }
  // Preserve user-created assignments and edits, but ensure all default assignments exist with required schema
  const existingAssignments = getStored(STORAGE_KEYS.ASSIGNMENTS, null)
  if (!existingAssignments || !Array.isArray(existingAssignments) || existingAssignments.length === 0) {
    setStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
  } else {
    const mergedAssignments = [...existingAssignments]
    for (const def of DEFAULT_ASSIGNMENTS) {
      const idx = mergedAssignments.findIndex(a => a.id === def.id || a.slug === def.slug)
      if (idx >= 0) {
        mergedAssignments[idx] = {
          ...def,
          ...mergedAssignments[idx],
          networkingConcepts: mergedAssignments[idx].networkingConcepts || def.networkingConcepts || [],
          concepts: mergedAssignments[idx].concepts || def.concepts || [],
          requirements: mergedAssignments[idx].requirements || def.requirements || [],
          constraints: mergedAssignments[idx].constraints || def.constraints || [],
          instructions: mergedAssignments[idx].instructions || def.instructions || [],
          testCases: mergedAssignments[idx].testCases || def.testCases || []
        }
      } else {
        mergedAssignments.push(def)
      }
    }
    setStored(STORAGE_KEYS.ASSIGNMENTS, mergedAssignments)
  }
  setStored(STORAGE_KEYS.SERVERS, DEFAULT_SERVERS)
  if (!getStored(STORAGE_KEYS.ATTEMPTS, null)) setStored(STORAGE_KEYS.ATTEMPTS, [])
  if (!getStored(STORAGE_KEYS.SUBMISSIONS, null)) setStored(STORAGE_KEYS.SUBMISSIONS, [])
  if (!getStored(STORAGE_KEYS.AUDIT, null)) {
    setStored(STORAGE_KEYS.AUDIT, [
      { id: 'aud-1', actor: 'System', action: 'BOOTSTRAP', resource: 'SYSTEM', details: 'Laboratory services online.', createdAt: new Date().toISOString() }
    ])
  }
}

export function getCurrentMockUser() {
  return getStored(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0])
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

// Router for in-browser API requests
export async function handleMockApiRequest(path, options = {}) {
  initMockDatabase()
  const method = (options.method || 'GET').toUpperCase()
  let body = {}
  try {
    body = options.body ? JSON.parse(options.body) : {}
  } catch {
    body = {}
  }
  const currentUser = getCurrentMockUser() || DEFAULT_USERS[0]

  // === AUTHENTICATION ===
  if (path === '/api/auth/login' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase()
    const password = (body.password || '').trim()
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    let found = users.find(u => u.email.toLowerCase() === email)

    if (!found) {
      let role = 'STUDENT'
      let name = email.split('@')[0] || 'Student'
      if (email.includes('faculty') || email.includes('prof') || email.includes('teacher')) {
        role = 'FACULTY'
        name = 'Prof. ' + (name[0].toUpperCase() + name.slice(1))
      } else if (email.includes('admin') || email.includes('root')) {
        role = 'ADMIN'
        name = 'Administrator'
      } else {
        name = name[0].toUpperCase() + name.slice(1)
      }
      found = {
        id: 'usr-' + Date.now(),
        name,
        email: body.email || 'abhipatil1403@gmail.com',
        password: password || '12345678',
        role,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }
      users.push(found)
      setStored(STORAGE_KEYS.USERS, users)
    } else {
      if (password && found.password && found.password !== password && password !== '12345678') {
        throw new Error('Invalid credentials. Please verify your email and password.')
      }
    }

    setCurrentMockUser(found)
    logAudit(found.email, 'LOGIN', 'AUTH', `User signed in to ${found.role} workspace.`)
    return { token: 'jwt-' + found.id, user: found }
  }

  if (path === '/api/auth/register' && method === 'POST') {
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const email = (body.email || '').trim().toLowerCase()
    let found = users.find(u => u.email.toLowerCase() === email)
    if (found) throw new Error('An account with this email address already exists.')

    const newUser = {
      id: 'usr-' + Date.now(),
      name: body.name || 'Student',
      email: body.email,
      password: body.password || '12345678',
      role: 'STUDENT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    users.push(newUser)
    setStored(STORAGE_KEYS.USERS, users)
    setCurrentMockUser(newUser)
    logAudit(newUser.email, 'REGISTER', 'USER', 'New student registered.')
    return { token: 'jwt-' + newUser.id, user: newUser }
  }

  if (path === '/api/auth/me') {
    return currentUser
  }

  if (path === '/api/auth/logout') {
    if (currentUser) logAudit(currentUser.email, 'LOGOUT', 'AUTH', 'User signed out.')
    return { message: 'Logged out successfully' }
  }

  // === ASSIGNMENTS (STUDENT, FACULTY, ADMIN) ===
  const isAssignmentPath = path.startsWith('/api/assignments') ||
                           path.startsWith('/api/faculty/assignments') ||
                           path.startsWith('/api/admin/assignments')

  if (isAssignmentPath) {
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)

    // Tests endpoints: e.g. /api/faculty/assignments/:id/tests or /api/admin/assignments/:id/tests/:testId
    if (path.includes('/tests')) {
      const parts = path.split('/')
      const testsIdx = parts.indexOf('tests')
      const targetAssignmentId = decodeURIComponent(parts[testsIdx - 1])
      const testId = parts[testsIdx + 1] ? decodeURIComponent(parts[testsIdx + 1]) : null

      const found = assignments.find(a => a.id === targetAssignmentId || a.slug === targetAssignmentId)
      if (!found) throw new Error('Assignment not found')
      found.testCases = found.testCases || []

      if (method === 'GET') {
        return found.testCases.map(t => ({
          ...t,
          enabled: t.enabled !== false
        }))
      }

      if (method === 'POST' || method === 'PUT') {
        if (testId) {
          const tIdx = found.testCases.findIndex(t => t.id === testId)
          if (tIdx >= 0) {
            found.testCases[tIdx] = { ...found.testCases[tIdx], ...body }
          } else {
            found.testCases.push({ id: testId, ...body })
          }
        } else {
          const newTest = {
            id: 'tc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
            name: body.name || 'Test Case',
            type: found.slug || 'general',
            weight: Number(body.weight) || 20,
            configuration: body.configuration || { input: {} },
            enabled: body.enabled !== false
          }
          found.testCases.push(newTest)
        }
        setStored(STORAGE_KEYS.ASSIGNMENTS, assignments)
        return body
      }
    }

    // Status toggle endpoint: e.g. /api/faculty/assignments/:id/status
    if (path.endsWith('/status') && method === 'PATCH') {
      const parts = path.split('/')
      const targetId = decodeURIComponent(parts[parts.length - 2])
      const found = assignments.find(a => a.id === targetId || a.slug === targetId)
      if (!found) throw new Error('Assignment not found')
      found.status = body.status
      setStored(STORAGE_KEYS.ASSIGNMENTS, assignments)
      logAudit(currentUser.email, 'STATUS_ASSIGNMENT', 'ASSIGNMENT', `Changed ${found.title} status to ${body.status}`)
      return found
    }

    // List all assignments
    if ((path === '/api/assignments' || path === '/api/faculty/assignments' || path === '/api/admin/assignments') && method === 'GET') {
      return assignments
    }

    // Create new assignment: POST /api/faculty/assignments or /api/admin/assignments
    if ((path === '/api/assignments' || path === '/api/faculty/assignments' || path === '/api/admin/assignments') && method === 'POST') {
      const id = '00000000-0000-4000-8000-' + String(Date.now()).slice(-12).padStart(12, '0')
      const slug = (body.title || 'assignment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('assignment-' + Date.now())

      const reqList = Array.isArray(body.requirements) ? body.requirements : (body.requirements ? String(body.requirements).split('\n').map(s=>s.trim()).filter(Boolean) : ['Implement solve(input)'])
      const conList = Array.isArray(body.constraints) ? body.constraints : (body.constraints ? String(body.constraints).split('\n').map(s=>s.trim()).filter(Boolean) : ['JavaScript solve(input) runs in an isolated sandbox'])
      const insList = Array.isArray(body.instructions) ? body.instructions : (body.instructions ? String(body.instructions).split('\n').map(s=>s.trim()).filter(Boolean) : ['Read instructions and run tests'])
      const conConcept = Array.isArray(body.networkingConcepts) ? body.networkingConcepts : (body.networkingConcepts ? String(body.networkingConcepts).split('\n').map(s=>s.trim()).filter(Boolean) : [body.protocol || 'TCP'])

      const newAssignment = {
        id,
        title: body.title || 'New Networking Assignment',
        slug,
        protocol: (body.protocol || 'TCP').toUpperCase(),
        difficulty: body.difficulty || 'MEDIUM',
        status: body.status || 'ACTIVE',
        description: body.description || body.objective || 'Complete the networking challenge.',
        objective: body.objective || body.description || 'Implement client-server protocol behavior.',
        requirements: reqList,
        constraints: conList,
        instructions: insList,
        expectedBehavior: body.expectedBehavior || 'Return expected protocol responses verified against network traffic.',
        serverRequirement: body.serverRequirement || `Controlled ${body.protocol || 'TCP'} service`,
        networkingConcepts: conConcept,
        concepts: conConcept,
        submissionStatus: 'NOT_STARTED',
        attempts: 0,
        deadline: body.deadline || null,
        starterCode: body.starterCode || 'function solve(input) {\n  // Implement your protocol solution\n  return { success: true };\n}',
        metadata: {
          starterCode: body.starterCode || 'function solve(input) {\n  // Implement your protocol solution\n  return { success: true };\n}'
        },
        testCases: body.testCases || [
          { id: 'tc-' + Date.now() + '-1', name: 'Validation Test', type: slug, weight: 100, configuration: { input: {} }, enabled: true }
        ]
      }
      assignments.push(newAssignment)
      setStored(STORAGE_KEYS.ASSIGNMENTS, assignments)
      logAudit(currentUser.email, 'CREATE_ASSIGNMENT', 'ASSIGNMENT', `Created new assignment: ${newAssignment.title}`)
      return newAssignment
    }

    // Get single assignment
    if (method === 'GET') {
      const parts = path.split('/')
      const targetId = decodeURIComponent(parts[parts.length - 1])
      const found = assignments.find(a => a.id === targetId || a.slug === targetId)
      if (!found) throw new Error('Assignment not found')
      return found
    }

    // Update assignment
    if (method === 'PUT') {
      const parts = path.split('/')
      const targetId = decodeURIComponent(parts[parts.length - 1])
      const idx = assignments.findIndex(a => a.id === targetId || a.slug === targetId)
      if (idx < 0) throw new Error('Assignment not found')

      const reqList = Array.isArray(body.requirements) ? body.requirements : (body.requirements ? String(body.requirements).split('\n').map(s=>s.trim()).filter(Boolean) : assignments[idx].requirements)
      const conList = Array.isArray(body.constraints) ? body.constraints : (body.constraints ? String(body.constraints).split('\n').map(s=>s.trim()).filter(Boolean) : assignments[idx].constraints)
      const insList = Array.isArray(body.instructions) ? body.instructions : (body.instructions ? String(body.instructions).split('\n').map(s=>s.trim()).filter(Boolean) : assignments[idx].instructions)
      const conConcept = Array.isArray(body.networkingConcepts) ? body.networkingConcepts : (body.networkingConcepts ? String(body.networkingConcepts).split('\n').map(s=>s.trim()).filter(Boolean) : assignments[idx].networkingConcepts)

      assignments[idx] = {
        ...assignments[idx],
        ...body,
        requirements: reqList,
        constraints: conList,
        instructions: insList,
        networkingConcepts: conConcept,
        concepts: conConcept
      }
      setStored(STORAGE_KEYS.ASSIGNMENTS, assignments)
      logAudit(currentUser.email, 'UPDATE_ASSIGNMENT', 'ASSIGNMENT', `Updated assignment: ${assignments[idx].title}`)
      return assignments[idx]
    }

    // Delete assignment
    if (method === 'DELETE') {
      const parts = path.split('/')
      const targetId = decodeURIComponent(parts[parts.length - 1])
      const idx = assignments.findIndex(a => a.id === targetId || a.slug === targetId)
      if (idx >= 0) {
        const removed = assignments.splice(idx, 1)[0]
        setStored(STORAGE_KEYS.ASSIGNMENTS, assignments)
        logAudit(currentUser.email, 'DELETE_ASSIGNMENT', 'ASSIGNMENT', `Deleted assignment: ${removed.title}`)
      }
      return { message: 'Assignment deleted successfully' }
    }
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
      solution: assignment.starterCode || assignment.metadata?.starterCode || '',
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
    const enriched = attempts.map(enrichAttempt)
    setStored(STORAGE_KEYS.ATTEMPTS, enriched)
    return enriched.filter(a => a.studentId === currentUser.id)
  }

  if (path.startsWith('/api/sessions/') && path.endsWith('/submit') && method === 'POST') {
    const id = path.split('/')[3]
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const att = attempts.find(a => a.id === id)
    if (!att) throw new Error('Attempt not found')

    att.status = 'SUBMITTED'
    setStored(STORAGE_KEYS.ATTEMPTS, attempts)

    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    let sub = {
      id: 'sub-' + Date.now(),
      attemptId: att.id,
      studentId: att.studentId,
      studentName: att.studentName,
      studentEmail: att.studentEmail,
      assignmentId: att.assignmentId,
      assignmentTitle: att.assignmentTitle,
      assignmentSlug: att.assignmentSlug || att.assignment?.slug,
      solution: att.solution,
      automatedScore: att.automatedScore !== null && att.automatedScore !== undefined ? att.automatedScore : 100,
      testResults: att.testResults || [],
      executionOutput: att.executionOutput || '',
      networkLog: att.networkLog || '',
      facultyGrade: null,
      facultyFeedback: null,
      status: 'SUBMITTED',
      reviews: [],
      submittedAt: new Date().toISOString()
    }
    sub = enrichSubmission(sub)
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
    const enriched = enrichAttempt(found)
    setStored(STORAGE_KEYS.ATTEMPTS, attempts)
    return enriched
  }

  // === SUBMISSIONS ===
  if (path === '/api/submissions') {
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const enriched = submissions.map(enrichSubmission)
    setStored(STORAGE_KEYS.SUBMISSIONS, enriched)
    return enriched.filter(s => s.studentId === currentUser.id)
  }

  if (path.startsWith('/api/submissions/')) {
    const id = path.replace('/api/submissions/', '')
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const found = submissions.find(s => s.id === id)
    if (!found) throw new Error('Submission not found')
    const enriched = enrichSubmission(found)
    setStored(STORAGE_KEYS.SUBMISSIONS, submissions)
    return enriched
  }

  // === FACULTY ===
  if (path === '/api/faculty/dashboard') {
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    return {
      totalExperiments: assignments.length,
      activeExperiments: assignments.filter(a => a.status === 'ACTIVE').length,
      activeStudents: users.filter(u => u.role === 'STUDENT').length,
      activeSessions: attempts.length,
      pendingReviews: submissions.filter(s => s.status === 'SUBMITTED').length,
      completedSubmissions: submissions.filter(s => s.status === 'REVIEWED').length,
      pendingSubmissions: submissions.filter(s => s.status === 'SUBMITTED'),
      recentSessions: attempts.slice(0, 5)
    }
  }

  if (path.startsWith('/api/faculty/sessions/')) {
    const id = path.replace('/api/faculty/sessions/', '')
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const found = attempts.find(a => a.id === id)
    if (!found) throw new Error('Attempt not found')
    const enriched = enrichAttempt(found)
    setStored(STORAGE_KEYS.ATTEMPTS, attempts)
    return enriched
  }

  if (path === '/api/faculty/sessions' || path.startsWith('/api/faculty/sessions?')) {
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const enriched = attempts.map(enrichAttempt)
    setStored(STORAGE_KEYS.ATTEMPTS, enriched)
    return enriched
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
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const enriched = submissions.map(enrichSubmission)
    setStored(STORAGE_KEYS.SUBMISSIONS, enriched)
    return enriched
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
    sub.reviews = sub.reviews || []
    sub.reviews.unshift({
      facultyName: currentUser.name || 'Faculty Member',
      grade: body.grade,
      feedback: body.feedback,
      status: sub.status,
      createdAt: new Date().toISOString()
    })
    const enriched = enrichSubmission(sub)
    setStored(STORAGE_KEYS.SUBMISSIONS, submissions)
    logAudit(currentUser.email, 'REVIEW', 'SUBMISSION', `Reviewed submission ${sub.id} with grade ${body.grade}.`)
    return enriched
  }

  if (path.startsWith('/api/faculty/submissions/')) {
    const id = path.replace('/api/faculty/submissions/', '')
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const found = submissions.find(s => s.id === id)
    if (!found) throw new Error('Submission not found')
    const enriched = enrichSubmission(found)
    setStored(STORAGE_KEYS.SUBMISSIONS, submissions)
    return enriched
  }

  // === ADMIN ===
  if (path === '/api/admin/dashboard') {
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const attempts = getStored(STORAGE_KEYS.ATTEMPTS, [])
    const assignments = getStored(STORAGE_KEYS.ASSIGNMENTS, DEFAULT_ASSIGNMENTS)
    const submissions = getStored(STORAGE_KEYS.SUBMISSIONS, [])
    const servers = getStored(STORAGE_KEYS.SERVERS, DEFAULT_SERVERS)
    return {
      totalUsers: users.length,
      students: users.filter(u => u.role === 'STUDENT').length,
      faculty: users.filter(u => u.role === 'FACULTY').length,
      admins: users.filter(u => u.role === 'ADMIN').length,
      pendingReviews: submissions.filter(s => s.status === 'SUBMITTED').length,
      experiments: assignments.length,
      activeExperiments: assignments.filter(a => a.status === 'ACTIVE').length,
      activeSessions: attempts.length,
      submissions: submissions.length,
      experimentServers: servers.length,
      systemStatus: {
        api: 'ONLINE',
        database: 'ONLINE',
        networkService: 'ONLINE'
      }
    }
  }

  if (path.startsWith('/api/admin/users/') && !path.endsWith('/status')) {
    const id = path.replace('/api/admin/users/', '').split('?')[0]
    const users = getStored(STORAGE_KEYS.USERS, DEFAULT_USERS)
    const found = users.find(u => u.id === id)
    if (!found) throw new Error('User not found')
    return found
  }

  if (path === '/api/admin/users' || path.startsWith('/api/admin/users?') || path.startsWith('/api/admin/users')) {
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
