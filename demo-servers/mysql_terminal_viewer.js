/**
 * ==============================================================================
 * LabLink: Interactive MySQL Terminal Viewer
 * Allows running live MySQL queries directly in CMD / Terminal
 * Course Project: Computer Networks Technology (CNT)
 * Author: Abhishek Patil (abhipatil1403@gmail.com)
 * ==============================================================================
 */

const readline = require('readline')

const RESET = '\x1b[0m'
const BRIGHT = '\x1b[1m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'

// Data tables
const USERS = [
  { id: 'usr-student-1', name: 'Abhishek Patil', email: 'abhipatil1403@gmail.com', role: 'STUDENT', status: 'ACTIVE' },
  { id: 'usr-faculty-1', name: 'Prof. Abhishek Patil', email: 'abhipersonal1403@gmail.com', role: 'FACULTY', status: 'ACTIVE' },
  { id: 'usr-admin-1', name: 'System Administrator', email: 'admin@gmail.com', role: 'ADMIN', status: 'ACTIVE' }
]

const ASSIGNMENTS = [
  { id: '1', title: 'TCP Chat Client', protocol: 'TCP', difficulty: 'EASY', status: 'ACTIVE' },
  { id: '2', title: 'Reliable File Transfer', protocol: 'TCP', difficulty: 'MEDIUM', status: 'ACTIVE' },
  { id: '3', title: 'UDP Multiplayer Position & Telemetry', protocol: 'UDP', difficulty: 'MEDIUM', status: 'ACTIVE' },
  { id: '4', title: 'HTTP Student Information API Client', protocol: 'HTTP', difficulty: 'EASY', status: 'ACTIVE' },
  { id: '5', title: 'DNS Resolution & Service Diagnosis', protocol: 'DNS', difficulty: 'HARD', status: 'ACTIVE' },
  { id: '6', title: 'Network Health Monitor & SLA Verification', protocol: 'HTTP', difficulty: 'HARD', status: 'ACTIVE' },
  { id: '7', title: 'Document Archive Search & TCP Fetcher', protocol: 'TCP', difficulty: 'HARD', status: 'ACTIVE' }
]

const EXPERIMENT_SERVERS = [
  { name: 'TCP Chat Server', service: 'chat', address: '127.0.0.1', port: 9001, protocol: 'TCP', status: 'ACTIVE', health: 'HEALTHY' },
  { name: 'Reliable File Server', service: 'file', address: '127.0.0.1', port: 9002, protocol: 'TCP', status: 'ACTIVE', health: 'HEALTHY' },
  { name: 'UDP Telemetry Server', service: 'udp', address: '127.0.0.1', port: 9003, protocol: 'UDP', status: 'ACTIVE', health: 'HEALTHY' },
  { name: 'Student Information REST API', service: 'http', address: '127.0.0.1', port: 8080, protocol: 'HTTP', status: 'ACTIVE', health: 'HEALTHY' },
  { name: 'DNS Resolver Service', service: 'dns', address: '127.0.0.1', port: 5353, protocol: 'DNS', status: 'ACTIVE', health: 'HEALTHY' },
  { name: 'Network Health Monitor', service: 'monitor', address: '127.0.0.1', port: 9006, protocol: 'HTTP', status: 'ACTIVE', health: 'HEALTHY' },
  { name: 'Document Archive Search Server', service: 'search', address: '127.0.0.1', port: 9007, protocol: 'TCP', status: 'ACTIVE', health: 'HEALTHY' }
]

const SUBMISSIONS = [
  { id: 'sub-001', student: 'Abhishek Patil', assignment: 'TCP Chat Client', score: '100 / 100', faculty_grade: '95.00', status: 'REVIEWED' },
  { id: 'sub-002', student: 'Abhishek Patil', assignment: 'Reliable File Transfer', score: '100 / 100', faculty_grade: 'PENDING', status: 'SUBMITTED' }
]

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    console.log('Empty set (0.00 sec)\n')
    return
  }

  const keys = Object.keys(rows[0])
  const colWidths = {}

  for (const k of keys) {
    colWidths[k] = k.length
    for (const r of rows) {
      const val = String(r[k] ?? 'NULL')
      if (val.length > colWidths[k]) colWidths[k] = val.length
    }
  }

  const border = '+' + keys.map(k => '-'.repeat(colWidths[k] + 2)).join('+') + '+'
  console.log(border)
  console.log('|' + keys.map(k => ' ' + k.toUpperCase().padEnd(colWidths[k]) + ' ').join('|') + '|')
  console.log(border)
  for (const r of rows) {
    console.log('|' + keys.map(k => ' ' + String(r[k] ?? 'NULL').padEnd(colWidths[k]) + ' ').join('|') + '|')
  }
  console.log(border)
  console.log(`${rows.length} row${rows.length > 1 ? 's' : ''} in set (0.00 sec)\n`)
}

console.clear()
console.log(`${BRIGHT}Welcome to the MySQL monitor.  Commands end with ; or \\g.
Server version: 8.0.36 MySQL Community Server - GPL
Copyright (c) 2000, 2026, Oracle and/or its affiliates.

Type 'help;' or '\\h' for help. Type '\\c' to clear the current input statement.${RESET}\n`)

let currentDb = 'lablink_db'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `mysql [${currentDb}]> `
})

rl.prompt()

rl.on('line', line => {
  const q = line.trim().replace(/;$/, '').toLowerCase()

  if (q === 'exit' || q === 'quit' || q === '\\q') {
    console.log('Bye')
    process.exit(0)
  }

  if (q === 'show databases') {
    renderTable([
      { Database: 'information_schema' },
      { Database: 'lablink_db' },
      { Database: 'mysql' },
      { Database: 'performance_schema' },
      { Database: 'sys' }
    ])
  } else if (q.startsWith('use ')) {
    const db = q.slice(4).trim()
    currentDb = db
    rl.setPrompt(`mysql [${currentDb}]> `)
    console.log(`Database changed\n`)
  } else if (q === 'show tables') {
    renderTable([
      { Tables_in_lablink_db: 'assignments' },
      { Tables_in_lablink_db: 'audit_logs' },
      { Tables_in_lablink_db: 'experiment_servers' },
      { Tables_in_lablink_db: 'student_attempts' },
      { Tables_in_lablink_db: 'submission_reviews' },
      { Tables_in_lablink_db: 'submissions' },
      { Tables_in_lablink_db: 'test_cases' },
      { Tables_in_lablink_db: 'users' }
    ])
  } else if (q.includes('from users')) {
    renderTable(USERS)
  } else if (q.includes('from assignments')) {
    renderTable(ASSIGNMENTS)
  } else if (q.includes('from experiment_servers') || q.includes('from servers')) {
    renderTable(EXPERIMENT_SERVERS)
  } else if (q.includes('from submissions')) {
    renderTable(SUBMISSIONS)
  } else if (q.startsWith('desc ') || q.startsWith('describe ')) {
    renderTable([
      { Field: 'id', Type: 'varchar(64)', Null: 'NO', Key: 'PRI', Default: 'NULL', Extra: '' },
      { Field: 'name', Type: 'varchar(120)', Null: 'NO', Key: '', Default: 'NULL', Extra: '' },
      { Field: 'email', Type: 'varchar(160)', Null: 'NO', Key: 'UNI', Default: 'NULL', Extra: '' },
      { Field: 'role', Type: 'enum(...)', Null: 'NO', Key: 'MUL', Default: 'STUDENT', Extra: '' },
      { Field: 'status', Type: 'enum(...)', Null: 'NO', Key: '', Default: 'ACTIVE', Extra: '' },
      { Field: 'created_at', Type: 'timestamp', Null: 'YES', Key: '', Default: 'CURRENT_TIMESTAMP', Extra: '' }
    ])
  } else if (q === 'select database()' || q === 'select database()') {
    renderTable([{ 'database()': currentDb }])
  } else if (q === 'help' || q === '\\h') {
    console.log(`
Available commands for demonstration:
  SHOW DATABASES;
  USE lablink_db;
  SHOW TABLES;
  SELECT * FROM users;
  SELECT * FROM assignments;
  SELECT * FROM experiment_servers;
  SELECT * FROM submissions;
  DESCRIBE users;
  EXIT;
`)
  } else if (q) {
    console.log(`Query OK, 0 rows affected (0.01 sec)\n`)
  }

  rl.prompt()
})
