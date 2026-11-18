-- ==============================================================================
-- LabLink: Collaborative Computer Networks Virtual Laboratory Platform
-- Relational Database Schema & Comprehensive Seed Data (MySQL 8.0 / MariaDB)
-- Course: Computer Networks Technology (CNT) Lab Project
-- Institution: Vishwakarma Institute of Technology (VIT)
-- Author: Abhishek Patil (abhipatil1403@gmail.com)
-- ==============================================================================

DROP DATABASE IF EXISTS lablink_db;
CREATE DATABASE lablink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lablink_db;

-- ------------------------------------------------------------------------------
-- 1. Table: users
-- Stores registered identities with Role-Based Access Control (RBAC)
-- Roles: STUDENT, FACULTY, ADMIN
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('STUDENT', 'FACULTY', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 2. Table: experiment_servers
-- Active controlled network service instances monitored by the gateway
-- ------------------------------------------------------------------------------
CREATE TABLE experiment_servers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    service VARCHAR(60) NOT NULL,
    address VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    port INT NOT NULL,
    protocol VARCHAR(32) NOT NULL,
    supported_protocols VARCHAR(120) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    health ENUM('HEALTHY', 'DEGRADED', 'UNREACHABLE') NOT NULL DEFAULT 'HEALTHY',
    active_sessions INT NOT NULL DEFAULT 0,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_srv_service (service),
    INDEX idx_srv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 3. Table: assignments
-- Computer Networks programming lab assignments
-- ------------------------------------------------------------------------------
CREATE TABLE assignments (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    protocol VARCHAR(32) NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    description TEXT NOT NULL,
    objective TEXT NOT NULL,
    expected_behavior TEXT NOT NULL,
    server_requirement VARCHAR(160) NOT NULL,
    networking_concepts JSON NOT NULL,
    requirements JSON NOT NULL,
    constraints JSON NOT NULL,
    instructions JSON NOT NULL,
    starter_code MEDIUMTEXT NOT NULL,
    capability_api TEXT NOT NULL,
    deadline TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assign_slug (slug),
    INDEX idx_assign_protocol (protocol),
    INDEX idx_assign_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 4. Table: test_cases
-- Automated evaluation test cases with weights and input configurations
-- ------------------------------------------------------------------------------
CREATE TABLE test_cases (
    id VARCHAR(64) PRIMARY KEY,
    assignment_id VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    type VARCHAR(64) NOT NULL,
    weight INT NOT NULL DEFAULT 20,
    configuration JSON NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_test_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_tc_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 5. Table: student_attempts
-- Execution workspace attempts run by students
-- ------------------------------------------------------------------------------
CREATE TABLE student_attempts (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL,
    assignment_id VARCHAR(64) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    status ENUM('STARTING', 'RUNNING', 'TESTED', 'SUBMITTED', 'FAILED') NOT NULL DEFAULT 'STARTING',
    solution MEDIUMTEXT NOT NULL,
    automated_score INT NULL DEFAULT NULL,
    test_results JSON NULL DEFAULT NULL,
    execution_output MEDIUMTEXT NULL,
    network_log MEDIUMTEXT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempt_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_attempt_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_att_student (student_id),
    INDEX idx_att_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 6. Table: submissions
-- Frozen evaluated submissions submitted for formal faculty grading
-- ------------------------------------------------------------------------------
CREATE TABLE submissions (
    id VARCHAR(64) PRIMARY KEY,
    attempt_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    student_name VARCHAR(120) NOT NULL,
    student_email VARCHAR(160) NOT NULL,
    assignment_id VARCHAR(64) NOT NULL,
    assignment_title VARCHAR(160) NOT NULL,
    assignment_slug VARCHAR(120) NOT NULL,
    solution MEDIUMTEXT NOT NULL,
    automated_score INT NOT NULL DEFAULT 0,
    test_results JSON NOT NULL,
    execution_output MEDIUMTEXT NOT NULL,
    network_log MEDIUMTEXT NOT NULL,
    faculty_grade DECIMAL(5,2) NULL DEFAULT NULL,
    faculty_feedback TEXT NULL DEFAULT NULL,
    status ENUM('SUBMITTED', 'REVIEWED', 'RETURNED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_sub_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_sub_student (student_id),
    INDEX idx_sub_assignment (assignment_id),
    INDEX idx_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 7. Table: submission_reviews
-- Formal faculty feedback and evaluation audit trail
-- ------------------------------------------------------------------------------
CREATE TABLE submission_reviews (
    id VARCHAR(64) PRIMARY KEY,
    submission_id VARCHAR(64) NOT NULL,
    faculty_id VARCHAR(64) NULL,
    faculty_name VARCHAR(120) NOT NULL,
    grade DECIMAL(5,2) NOT NULL,
    feedback TEXT NOT NULL,
    status ENUM('REVIEWED', 'RETURNED', 'REJECTED') NOT NULL DEFAULT 'REVIEWED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rev_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    INDEX idx_rev_submission (submission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 8. Table: audit_logs
-- Administrative and security audit history
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor VARCHAR(160) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- POPULATE PRODUCTION SEED DATA (EXACT MATCH WITH APPLICATION DATABASE)
-- ==============================================================================

-- 1. Insert Users (Password: 12345678, BCrypt-hashed: $2a$10$e8k... or plain for verification)
INSERT INTO users (id, name, email, password_hash, role, status, created_at) VALUES
('usr-student-1', 'Abhishek Patil', 'abhipatil1403@gmail.com', '$2a$10$wT0XkL8qK9fTz1u/M1nQWeA5QJt5sB6hR1oW0.P8l8s2nJ5v2f3bW', 'STUDENT', 'ACTIVE', '2026-11-15 10:00:00'),
('usr-faculty-1', 'Prof. Abhishek Patil', 'abhipersonal1403@gmail.com', '$2a$10$wT0XkL8qK9fTz1u/M1nQWeA5QJt5sB6hR1oW0.P8l8s2nJ5v2f3bW', 'FACULTY', 'ACTIVE', '2026-11-15 10:00:00'),
('usr-admin-1', 'System Administrator', 'admin@gmail.com', '$2a$10$wT0XkL8qK9fTz1u/M1nQWeA5QJt5sB6hR1oW0.P8l8s2nJ5v2f3bW', 'ADMIN', 'ACTIVE', '2026-11-15 10:00:00');

-- 2. Insert Network Servers (Matching System Status and Admin Workspace)
INSERT INTO experiment_servers (id, name, service, address, port, protocol, supported_protocols, status, health, active_sessions, last_heartbeat) VALUES
('srv-1', 'TCP Chat Server', 'chat', '127.0.0.1', 9001, 'TCP', 'TCP', 'ACTIVE', 'HEALTHY', 1, NOW()),
('srv-2', 'Reliable File Server', 'file', '127.0.0.1', 9002, 'TCP', 'TCP', 'ACTIVE', 'HEALTHY', 0, NOW()),
('srv-3', 'UDP Telemetry Server', 'udp', '127.0.0.1', 9003, 'UDP', 'UDP', 'ACTIVE', 'HEALTHY', 2, NOW()),
('srv-4', 'Student Information REST API', 'http', '127.0.0.1', 8080, 'HTTP', 'HTTP, REST', 'ACTIVE', 'HEALTHY', 1, NOW()),
('srv-5', 'DNS Resolver Service', 'dns', '127.0.0.1', 5353, 'DNS', 'DNS, UDP', 'ACTIVE', 'HEALTHY', 0, NOW()),
('srv-6', 'Network Health Monitor', 'monitor', '127.0.0.1', 9006, 'HTTP', 'HTTP', 'ACTIVE', 'HEALTHY', 1, NOW()),
('srv-7', 'Document Archive Search Server', 'search', '127.0.0.1', 9007, 'TCP', 'TCP', 'ACTIVE', 'HEALTHY', 0, NOW());

-- 3. Insert Assignments (All 7 CNT Lab Programming Challenges)
INSERT INTO assignments (
    id, title, slug, protocol, difficulty, status, description, objective,
    expected_behavior, server_requirement, networking_concepts, requirements,
    constraints, instructions, starter_code, capability_api
) VALUES
(
    '00000000-0000-4000-8000-000000000001',
    'TCP Chat Client',
    'tcp-chat',
    'TCP',
    'EASY',
    'ACTIVE',
    'Build a college messaging client with a username handshake, multiple messages and graceful disconnection.',
    'Build a college messaging client with a username handshake, multiple messages and graceful disconnection.',
    'Return {welcome, replies, closed:true} for input.username/messages. On input.service=\'offline\', return {error:true}. Treat QUIT as a server disconnect and close your socket.',
    'Controlled TCP tcp-chat service',
    '["TCP", "Sockets", "Connection lifecycle"]',
    '["Handshake with USER <name>", "Send MSG <text> and read each reply", "QUIT gracefully; catch connection failures"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var socket = tcp.connect(input.service);\n  if (input.service === "offline") {\n    tcp.close(socket);\n    return { error: true };\n  }\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}',
    'tcp.connect(\'chat\'|\'file\'|\'search\'|\'offline\'), tcp.send(id,line), tcp.read(id), tcp.close(id); print(value).'
),
(
    '00000000-0000-4000-8000-000000000002',
    'Reliable File Transfer',
    'file-transfer',
    'TCP',
    'MEDIUM',
    'ACTIVE',
    'Receive, save and verify a requested file through a real TCP stream.',
    'Receive, save and verify a requested file through a real TCP stream.',
    'Server lines: {name,bytes,sha256}, DATA <base64>, END. Errors: ERROR NOT_FOUND. An interrupted transfer closes before END. Return {name,content,sha256,saved:true}; errors {error:true}. Use save(name,content) and sha256(content).',
    'Controlled TCP file-transfer service',
    '["Streams", "Buffering", "Integrity"]',
    '["Send GET <filename>", "Parse JSON header and all DATA chunks until END", "Save the reconstructed file and verify SHA-256", "Handle missing and interrupted transfers"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var id = tcp.connect("file");\n  tcp.send(id, "GET " + input.filename);\n  var first = tcp.read(id);\n  if (first === "ERROR NOT_FOUND") { tcp.close(id); return { error: true }; }\n  var header = JSON.parse(first);\n  var content = "", line;\n  while ((line = tcp.read(id)) !== null && line !== "END") {\n    content += decodeBase64(line.slice(5));\n  }\n  tcp.close(id);\n  if (line !== "END" || sha256(content) !== header.sha256) return { error: true };\n  save(input.filename, content);\n  return { name: input.filename, content: content, sha256: sha256(content), saved: true };\n}',
    'tcp.connect(\'file\'), tcp.send(id,line), tcp.read(id), tcp.close(id); save(name,content); sha256(content); decodeBase64(str).'
),
(
    '00000000-0000-4000-8000-000000000003',
    'UDP Multiplayer Position & Telemetry System',
    'udp-telemetry',
    'UDP',
    'MEDIUM',
    'ACTIVE',
    'Send player coordinates and process broadcast updates while rejecting stale packets.',
    'Send player coordinates and process broadcast updates while rejecting stale packets.',
    'Send each input update with udp.exchange(updates). Maintain the latest position per player, ignoring updates with sequence numbers lower than or equal to what has already been recorded.',
    'Controlled UDP telemetry service',
    '["Datagrams", "Packet loss", "Sequence numbers"]',
    '["Send UDP datagrams using udp.exchange", "Track positions for every player", "Keep only the highest sequence for each player"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var positions = {};\n  var rec = udp.exchange(input.updates);\n  for (var i = 0; i < rec.length; i++) {\n    var u = rec[i];\n    if (!positions[u.player] || u.seq > positions[u.player].seq) {\n      positions[u.player] = { x: u.x, y: u.y, seq: u.seq };\n    }\n  }\n  return { positions: positions };\n}',
    'udp.exchange([{player,x,y,seq}]).'
),
(
    '00000000-0000-4000-8000-000000000004',
    'HTTP Student Information API Client',
    'http-api',
    'HTTP',
    'EASY',
    'ACTIVE',
    'Query the campus directory REST service and handle standard HTTP status codes.',
    'Query the campus directory REST service and handle standard HTTP status codes.',
    'Return parsed JSON from http.request(path, "GET") when status is 200. On 404 or 503, return {error:true, status}.',
    'Controlled HTTP rest service',
    '["REST", "Status codes", "Payloads"]',
    '["Query GET /students/42", "Handle 404 Not Found and 503 Unavailable", "Parse JSON responses cleanly"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var res = http.request(input.path, "GET");\n  if (res.status !== 200) return { error: true, status: res.status };\n  return JSON.parse(res.body);\n}',
    'http.request(path, method, body).'
),
(
    '00000000-0000-4000-8000-000000000005',
    'DNS Resolution & Service Diagnosis',
    'dns-troubleshooting',
    'DNS',
    'HARD',
    'ACTIVE',
    'Diagnose an unreachable college service through DNS lookup records and probe responses.',
    'Diagnose an unreachable college service through DNS lookup records and probe responses.',
    'Perform dns.lookup(name) and http.probe("resolved"). Compare against dns.lookup(comparison) and http.probe("portal"). Return structured diagnosis object with observations, dnsInformation, evidence, rootCause, and recommendedFix.',
    'Controlled DNS resolver service',
    '["A records", "Resolution", "Diagnosis"]',
    '["Resolve target domain via dns.lookup", "Probe endpoint reachability with http.probe", "Identify stale A-record misconfiguration"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var bad = dns.lookup(input.name);\n  var good = dns.lookup(input.comparison);\n  var failing = http.probe("resolved");\n  var working = http.probe("portal");\n  return {\n    observations: "The resolved endpoint fails while portal is reachable",\n    dnsInformation: "portal.lablink.edu resolves to " + bad.address + " while " + input.comparison + " resolves to " + good.address,\n    evidence: "Endpoint probe for resolved returned status " + failing.status + ", whereas portal returned status " + working.status,\n    rootCause: "Incorrect DNS A record address pointing to stale server",\n    recommendedFix: "Update the A record to correct reachable address " + good.address\n  };\n}',
    'dns.lookup(hostname); http.probe(endpoint).'
),
(
    '00000000-0000-4000-8000-000000000006',
    'Network Health Monitor & SLA Verification',
    'network-monitor',
    'HTTP',
    'HARD',
    'ACTIVE',
    'Poll college infrastructure endpoints and compile an SLA report with latency.',
    'Poll college infrastructure endpoints and compile an SLA report with latency.',
    'Iterate over input.servers, call http.probe(serverName), and return an array of {name, status: "ONLINE"|"OFFLINE", latencyMs, reason}.',
    'Controlled HTTP telemetry service',
    '["Probing", "Latency", "Availability"]',
    '["Probe all infrastructure endpoints", "Calculate round-trip latency", "Report availability status and failure reasons"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var list = input.servers.map(function(name) {\n    var r = http.probe(name);\n    var online = r.status >= 200 && r.status < 300;\n    return {\n      name: name,\n      status: online ? "ONLINE" : "OFFLINE",\n      latencyMs: r.latencyMs,\n      reason: r.error || (r.status >= 400 ? "HTTP " + r.status : (online ? "" : "OFFLINE"))\n    };\n  });\n  return { servers: list };\n}',
    'http.probe(name).'
),
(
    '00000000-0000-4000-8000-000000000007',
    'Document Archive Search & TCP Fetcher',
    'file-search',
    'TCP',
    'HARD',
    'ACTIVE',
    'Search the campus archive using SEARCH query, select the matching document, and download it.',
    'Search the campus archive using SEARCH query, select the matching document, and download it.',
    'Send SEARCH <query>, parse JSON array of document names. If matches found, send GET <select> to receive JSON document. Save the file and return {results, name, content, saved:true}.',
    'Controlled TCP search service',
    '["Search", "Pipelines", "Integrity"]',
    '["Send SEARCH <query> over TCP stream", "Parse array of matching document identifiers", "Fetch document payload and persist to scratch storage"]',
    '["JavaScript solve(input) runs in an isolated interpreter", "15 seconds per test, 16 MiB memory, 60 network operations", "Only the supplied LabLink network services are accessible"]',
    '["Read the protocol and capability API", "Implement solve(input) for every test input", "Run to inspect output, then Test before submitting"]',
    'function solve(input) {\n  var id = tcp.connect("search");\n  tcp.send(id, "SEARCH " + input.query);\n  var results = JSON.parse(tcp.read(id));\n  if (!results.length) { tcp.close(id); return { results: results }; }\n  tcp.send(id, "GET " + input.select);\n  var file = JSON.parse(tcp.read(id));\n  tcp.close(id);\n  if (file.error) return { results: results, error: true };\n  save(file.name, file.content);\n  return { results: results, name: file.name, content: file.content, saved: true };\n}',
    'tcp.connect(\'search\'), tcp.send(id,line), tcp.read(id), tcp.close(id); save(name,content).'
);

-- 4. Insert Test Cases (All automated verification test suites)
INSERT INTO test_cases (id, assignment_id, name, type, weight, configuration, enabled) VALUES
('tc-1-1', '00000000-0000-4000-8000-000000000001', 'Handshake and message', 'tcp-chat', 35, '{"input":{"service":"chat","username":"Ada","messages":["Hello"]}}', TRUE),
('tc-1-2', '00000000-0000-4000-8000-000000000001', 'Multiple messages and disconnect', 'tcp-chat', 40, '{"input":{"service":"chat","username":"Lin","messages":["first","second","third"]}}', TRUE),
('tc-1-3', '00000000-0000-4000-8000-000000000001', 'Connection failure', 'tcp-chat', 25, '{"input":{"service":"offline","username":"Test","messages":[]}}', TRUE),

('tc-2-1', '00000000-0000-4000-8000-000000000002', 'Complete small file', 'file-transfer', 30, '{"input":{"filename":"welcome.txt"}}', TRUE),
('tc-2-2', '00000000-0000-4000-8000-000000000002', 'Stream reconstruction and integrity', 'file-transfer', 40, '{"input":{"filename":"networks.txt"}}', TRUE),
('tc-2-3', '00000000-0000-4000-8000-000000000002', 'Missing file', 'file-transfer', 15, '{"input":{"filename":"missing.txt"}}', TRUE),
('tc-2-4', '00000000-0000-4000-8000-000000000002', 'Interrupted transfer', 'file-transfer', 15, '{"input":{"filename":"interrupted.txt"}}', TRUE),

('tc-3-1', '00000000-0000-4000-8000-000000000003', 'Sequential position updates', 'udp-telemetry', 35, '{"input":{"updates":[{"player":"p1","x":10,"y":20,"seq":1},{"player":"p1","x":12,"y":24,"seq":2}]}}', TRUE),
('tc-3-2', '00000000-0000-4000-8000-000000000003', 'Out-of-order sequence rejection', 'udp-telemetry', 35, '{"input":{"updates":[{"player":"p1","x":50,"y":50,"seq":5},{"player":"p1","x":10,"y":10,"seq":2}]}}', TRUE),
('tc-3-3', '00000000-0000-4000-8000-000000000003', 'Multiplayer concurrent telemetry', 'udp-telemetry', 30, '{"input":{"updates":[{"player":"p1","x":1,"y":1,"seq":1},{"player":"p2","x":5,"y":5,"seq":1},{"player":"p1","x":2,"y":2,"seq":2}]}}', TRUE),

('tc-4-1', '00000000-0000-4000-8000-000000000004', 'Successful student record query (200 OK)', 'http-api', 50, '{"input":{"path":"/students/42"}}', TRUE),
('tc-4-2', '00000000-0000-4000-8000-000000000004', 'Resource not found (404 Not Found)', 'http-api', 25, '{"input":{"path":"/students/missing"}}', TRUE),
('tc-4-3', '00000000-0000-4000-8000-000000000004', 'Upstream failure (503 Service Unavailable)', 'http-api', 25, '{"input":{"path":"/failure"}}', TRUE),

('tc-5-1', '00000000-0000-4000-8000-000000000005', 'DNS resolution and reachability diagnosis', 'dns-troubleshooting', 100, '{"input":{"name":"portal.lablink.edu","comparison":"portal.vit.edu"}}', TRUE),

('tc-6-1', '00000000-0000-4000-8000-000000000006', 'All infrastructure nodes responsive', 'network-monitor', 50, '{"input":{"servers":["lab","file","web"]}}', TRUE),
('tc-6-2', '00000000-0000-4000-8000-000000000006', 'High latency and service outage detection', 'network-monitor', 50, '{"input":{"servers":["slow","database"]}}', TRUE),

('tc-7-1', '00000000-0000-4000-8000-000000000007', 'Search and download archive document', 'file-search', 50, '{"input":{"query":"network","select":"networks.txt"}}', TRUE),
('tc-7-2', '00000000-0000-4000-8000-000000000007', 'No matching documents query', 'file-search', 25, '{"input":{"query":"absent","select":null}}', TRUE),
('tc-7-3', '00000000-0000-4000-8000-000000000007', 'Invalid document selection error handling', 'file-search', 25, '{"input":{"query":"welcome","select":"missing.txt"}}', TRUE);

-- 5. Insert Student Attempts (Real Attempt Records)
INSERT INTO student_attempts (id, student_id, assignment_id, attempt_number, status, solution, automated_score, test_results, execution_output, network_log, started_at) VALUES
(
    'att-001',
    'usr-student-1',
    '00000000-0000-4000-8000-000000000001',
    1,
    'SUBMITTED',
    'function solve(input) {\n  var socket = tcp.connect(input.service);\n  if (input.service === "offline") {\n    tcp.close(socket);\n    return { error: true };\n  }\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}',
    100,
    '[{"testCaseId":"tc-1-1","name":"Handshake and message","weight":35,"passed":true,"status":"PASSED"},{"testCaseId":"tc-1-2","name":"Multiple messages and disconnect","weight":40,"passed":true,"status":"PASSED"},{"testCaseId":"tc-1-3","name":"Connection failure","weight":25,"passed":true,"status":"PASSED"}]',
    '=== Handshake and message ===\nReturn: {"welcome":"WELCOME Ada","replies":["MESSAGE RECEIVED Hello"],"closed":true}\n\n=== Multiple messages and disconnect ===\nReturn: {"welcome":"WELCOME Lin","replies":["MESSAGE RECEIVED first","MESSAGE RECEIVED second","MESSAGE RECEIVED third"],"closed":true}\n\n=== Connection failure ===\nReturn: {"error":true}',
    '=== Handshake and message ===\n[tcp.connect] (chat) → {"connected":true}\n[tcp.send] (1, USER Ada)\n[tcp.read] (1) → WELCOME Ada\n[tcp.send] (1, MSG Hello)\n[tcp.read] (1) → MESSAGE RECEIVED Hello\n[tcp.send] (1, QUIT)\n[tcp.read] (1) → BYE\n[tcp.read] (1) → null\n[tcp.close] (1)\n\n=== Connection failure ===\n[tcp.connect] (offline) → {"error":true}\n[tcp.close] (1)',
    '2026-11-19 01:10:00'
),
(
    'att-002',
    'usr-student-1',
    '00000000-0000-4000-8000-000000000002',
    1,
    'SUBMITTED',
    'function solve(input) {\n  var id = tcp.connect("file");\n  tcp.send(id, "GET " + input.filename);\n  var first = tcp.read(id);\n  if (first === "ERROR NOT_FOUND") { tcp.close(id); return { error: true }; }\n  var header = JSON.parse(first);\n  var content = "", line;\n  while ((line = tcp.read(id)) !== null && line !== "END") {\n    content += decodeBase64(line.slice(5));\n  }\n  tcp.close(id);\n  if (line !== "END" || sha256(content) !== header.sha256) return { error: true };\n  save(input.filename, content);\n  return { name: input.filename, content: content, sha256: sha256(content), saved: true };\n}',
    100,
    '[{"testCaseId":"tc-2-1","name":"Complete small file","weight":30,"passed":true,"status":"PASSED"},{"testCaseId":"tc-2-2","name":"Stream reconstruction and integrity","weight":40,"passed":true,"status":"PASSED"},{"testCaseId":"tc-2-3","name":"Missing file","weight":15,"passed":true,"status":"PASSED"},{"testCaseId":"tc-2-4","name":"Interrupted transfer","weight":15,"passed":true,"status":"PASSED"}]',
    '=== Complete small file ===\nResult: {"name":"welcome.txt","content":"Welcome to the LabLink college document server.","saved":true}\nReturn: {"name":"welcome.txt","content":"Welcome to the LabLink college document server.","sha256":"5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03","saved":true}',
    '=== Complete small file ===\n[tcp.connect] (file) → {"connected":true}\n[tcp.send] (1, GET welcome.txt)\n[tcp.read] (1) → {"name":"welcome.txt","bytes":47,"sha256":"5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03"}\n[tcp.read] (1) → DATA V2VsY29tZSB0byB0aGUgTGFiTGluayBjb2xsZWdlIGRvY3VtZW50IHNlcnZlci4=\n[tcp.read] (1) → END\n[tcp.close] (1)\n[save] (welcome.txt)',
    '2026-11-19 01:25:00'
);

-- 6. Insert Submissions (Matching Student & Faculty Workspaces)
INSERT INTO submissions (
    id, attempt_id, student_id, student_name, student_email,
    assignment_id, assignment_title, assignment_slug, solution,
    automated_score, test_results, execution_output, network_log,
    faculty_grade, faculty_feedback, status, submitted_at, reviewed_at
) VALUES
(
    'sub-001',
    'att-001',
    'usr-student-1',
    'Abhishek Patil',
    'abhipatil1403@gmail.com',
    '00000000-0000-4000-8000-000000000001',
    'TCP Chat Client',
    'tcp-chat',
    'function solve(input) {\n  var socket = tcp.connect(input.service);\n  if (input.service === "offline") {\n    tcp.close(socket);\n    return { error: true };\n  }\n  tcp.send(socket, "USER " + input.username);\n  var welcome = tcp.read(socket);\n  var replies = [];\n  for (var i = 0; i < input.messages.length; i++) {\n    tcp.send(socket, "MSG " + input.messages[i]);\n    replies.push(tcp.read(socket));\n  }\n  tcp.send(socket, "QUIT");\n  var disconnect = tcp.read(socket);\n  var closed = tcp.read(socket) === null;\n  tcp.close(socket);\n  return { welcome: welcome, replies: replies, closed: closed };\n}',
    100,
    '[{"testCaseId":"tc-1-1","name":"Handshake and message","weight":35,"passed":true,"status":"PASSED"},{"testCaseId":"tc-1-2","name":"Multiple messages and disconnect","weight":40,"passed":true,"status":"PASSED"},{"testCaseId":"tc-1-3","name":"Connection failure","weight":25,"passed":true,"status":"PASSED"}]',
    '=== Handshake and message ===\nReturn: {"welcome":"WELCOME Ada","replies":["MESSAGE RECEIVED Hello"],"closed":true}\n\n=== Multiple messages and disconnect ===\nReturn: {"welcome":"WELCOME Lin","replies":["MESSAGE RECEIVED first","MESSAGE RECEIVED second","MESSAGE RECEIVED third"],"closed":true}\n\n=== Connection failure ===\nReturn: {"error":true}',
    '=== Handshake and message ===\n[tcp.connect] (chat) → {"connected":true}\n[tcp.send] (1, USER Ada)\n[tcp.read] (1) → WELCOME Ada\n[tcp.send] (1, MSG Hello)\n[tcp.read] (1) → MESSAGE RECEIVED Hello\n[tcp.send] (1, QUIT)\n[tcp.read] (1) → BYE\n[tcp.read] (1) → null\n[tcp.close] (1)\n\n=== Connection failure ===\n[tcp.connect] (offline) → {"error":true}\n[tcp.close] (1)',
    95.00,
    'Excellent protocol implementation! Handshake and clean socket termination verified against network capture.',
    'REVIEWED',
    '2026-11-19 01:13:19',
    '2026-11-19 01:40:00'
),
(
    'sub-002',
    'att-002',
    'usr-student-1',
    'Abhishek Patil',
    'abhipatil1403@gmail.com',
    '00000000-0000-4000-8000-000000000002',
    'Reliable File Transfer',
    'file-transfer',
    'function solve(input) {\n  var id = tcp.connect("file");\n  tcp.send(id, "GET " + input.filename);\n  var first = tcp.read(id);\n  if (first === "ERROR NOT_FOUND") { tcp.close(id); return { error: true }; }\n  var header = JSON.parse(first);\n  var content = "", line;\n  while ((line = tcp.read(id)) !== null && line !== "END") {\n    content += decodeBase64(line.slice(5));\n  }\n  tcp.close(id);\n  if (line !== "END" || sha256(content) !== header.sha256) return { error: true };\n  save(input.filename, content);\n  return { name: input.filename, content: content, sha256: sha256(content), saved: true };\n}',
    100,
    '[{"testCaseId":"tc-2-1","name":"Complete small file","weight":30,"passed":true,"status":"PASSED"},{"testCaseId":"tc-2-2","name":"Stream reconstruction and integrity","weight":40,"passed":true,"status":"PASSED"},{"testCaseId":"tc-2-3","name":"Missing file","weight":15,"passed":true,"status":"PASSED"},{"testCaseId":"tc-2-4","name":"Interrupted transfer","weight":15,"passed":true,"status":"PASSED"}]',
    '=== Complete small file ===\nResult: {"name":"welcome.txt","content":"Welcome to the LabLink college document server.","saved":true}\nReturn: {"name":"welcome.txt","content":"Welcome to the LabLink college document server.","sha256":"5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03","saved":true}',
    '=== Complete small file ===\n[tcp.connect] (file) → {"connected":true}\n[tcp.send] (1, GET welcome.txt)\n[tcp.read] (1) → {"name":"welcome.txt","bytes":47,"sha256":"5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03"}\n[tcp.read] (1) → DATA V2VsY29tZSB0byB0aGUgTGFiTGluayBjb2xsZWdlIGRvY3VtZW50IHNlcnZlci4=\n[tcp.read] (1) → END\n[tcp.close] (1)\n[save] (welcome.txt)',
    NULL,
    NULL,
    'SUBMITTED',
    '2026-11-19 01:28:45',
    NULL
);

-- 7. Insert Submission Reviews
INSERT INTO submission_reviews (id, submission_id, faculty_id, faculty_name, grade, feedback, status, created_at) VALUES
('rev-001', 'sub-001', 'usr-faculty-1', 'Prof. Abhishek Patil', 95.00, 'Excellent protocol implementation! Handshake and clean socket termination verified against network capture.', 'REVIEWED', '2026-11-19 01:40:00');

-- 8. Insert Audit Logs (Matching Admin History)
INSERT INTO audit_logs (id, actor, action, resource, details, created_at) VALUES
('aud-001', 'System', 'BOOTSTRAP', 'SYSTEM', 'Laboratory services online. Database schema initialized.', '2026-11-15 10:00:00'),
('aud-002', 'admin@gmail.com', 'STATUS_SERVER', 'SERVER', 'Verified all 7 experiment gateway daemons healthy.', '2026-11-15 10:05:00'),
('aud-003', 'abhipatil1403@gmail.com', 'LOGIN', 'AUTH', 'User signed in to STUDENT workspace.', '2026-11-19 01:00:00'),
('aud-004', 'abhipatil1403@gmail.com', 'START_ATTEMPT', 'ASSIGNMENT', 'Started attempt 1 on TCP Chat Client.', '2026-11-19 01:10:00'),
('aud-005', 'abhipatil1403@gmail.com', 'SUBMIT', 'ASSIGNMENT', 'Submitted assignment TCP Chat Client (Score: 100/100).', '2026-11-19 01:13:19'),
('aud-006', 'abhipersonal1403@gmail.com', 'LOGIN', 'AUTH', 'User signed in to FACULTY workspace.', '2026-11-19 01:35:00'),
('aud-007', 'abhipersonal1403@gmail.com', 'REVIEW', 'SUBMISSION', 'Reviewed submission sub-001 with grade 95.00.', '2026-11-19 01:40:00');

-- ==============================================================================
-- HANDY VERIFICATION QUERIES FOR PRESENTATION & VIVA
-- ==============================================================================
-- 1. Check all users:
--    SELECT id, name, email, role, status FROM users;
--
-- 2. Check all assignments with their protocols:
--    SELECT id, title, protocol, difficulty, status FROM assignments;
--
-- 3. Check active experiment servers & listening ports:
--    SELECT name, service, address, port, protocol, status, health FROM experiment_servers;
--
-- 4. Check student submissions and faculty grades:
--    SELECT id, student_name, assignment_title, automated_score, faculty_grade, status FROM submissions;
-- ==============================================================================
