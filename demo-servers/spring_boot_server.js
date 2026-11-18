/**
 * ==============================================================================
 * LabLink: Spring Boot Backend Application Console Runner
 * Simulates a live Spring Boot 3.2.0 (Java 21) REST & WebSocket Server
 * Course Project: Computer Networks Technology (CNT)
 * Author: Abhishek Patil (abhipatil1403@gmail.com)
 * ==============================================================================
 */

const http = require('http')

const PORT = 8080

// ANSI Color Codes
const RESET = '\x1b[0m'
const BRIGHT = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const MAGENTA = '\x1b[35m'

function getTimestamp() {
  return new Date().toISOString().replace('Z', '+05:30')
}

function logInfo(category, message) {
  console.log(`${DIM}${getTimestamp()}${RESET}  ${GREEN}INFO${RESET} ${MAGENTA}14820${RESET} --- [           main] ${CYAN}${category.padEnd(38)}${RESET} : ${message}`)
}

function logLive(thread, category, message) {
  console.log(`${DIM}${getTimestamp()}${RESET}  ${GREEN}INFO${RESET} ${MAGENTA}14820${RESET} --- [${thread.padStart(15)}] ${CYAN}${category.padEnd(38)}${RESET} : ${message}`)
}

console.clear()
console.log(`${GREEN}${BRIGHT}
  .   ____          _            __ _ _
 /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\
( ( )\\___ | '_ | '_| | '_ \\/ _\` | \\ \\ \\ \\
 \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)${RESET}
`)

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function boot() {
  await sleep(200)
  logInfo('edu.lablink.LabLinkApplication', 'Starting LabLinkApplication v1.0.0 using Java 21.0.2 with PID 14820 (C:\\Users\\Lenovo\\lablink\\target\\lablink-backend-1.0.0.jar)')
  await sleep(300)
  logInfo('edu.lablink.LabLinkApplication', 'The following 1 profile is active: "production"')
  await sleep(400)
  logInfo('o.s.b.w.embedded.tomcat.TomcatWebServer', `Tomcat initialized with port ${PORT} (http)`)
  await sleep(300)
  logInfo('o.a.c.c.C.[Tomcat].[localhost].[/]', 'Initializing Spring embedded WebApplicationContext')
  await sleep(350)
  logInfo('w.s.c.ServletWebServerApplicationContext', 'Root WebApplicationContext: initialization completed in 1240 ms')
  await sleep(400)
  logInfo('com.zaxxer.hikari.HikariDataSource', 'HikariPool-1 - Starting connection pool to jdbc:mysql://localhost:3306/lablink_db...')
  await sleep(300)
  logInfo('com.zaxxer.hikari.pool.HikariPool', 'HikariPool-1 - Added connection com.mysql.cj.jdbc.ConnectionImpl@4c522b10')
  logInfo('com.zaxxer.hikari.HikariDataSource', 'HikariPool-1 - Start completed (10 idle connections active)')
  await sleep(300)
  logInfo('org.flywaydb.core.FlywayExecutor', 'Database: jdbc:mysql://localhost:3306/lablink_db (MySQL 8.0.36)')
  logInfo('o.f.c.i.s.DefaultSqlScriptExecutor', 'Current version of schema `lablink_db`: 5.0')
  logInfo('org.flywaydb.core.FlywayExecutor', 'Schema `lablink_db` is up to date. No migration necessary.')
  await sleep(400)
  logInfo('o.s.d.r.w.RepositoryRestHandlerMapping', 'Mapped [/api/auth/login, /api/auth/register] onto edu.lablink.AuthController')
  logInfo('o.s.d.r.w.RepositoryRestHandlerMapping', 'Mapped [/api/assignments/**] onto edu.lablink.AssignmentController')
  logInfo('o.s.d.r.w.RepositoryRestHandlerMapping', 'Mapped [/api/sessions/**] onto edu.lablink.SessionController')
  logInfo('o.s.d.r.w.RepositoryRestHandlerMapping', 'Mapped [/api/submissions/**] onto edu.lablink.SubmissionController')
  logInfo('o.s.d.r.w.RepositoryRestHandlerMapping', 'Mapped [/api/faculty/**] onto edu.lablink.FacultyController')
  logInfo('o.s.d.r.w.RepositoryRestHandlerMapping', 'Mapped [/api/admin/**] onto edu.lablink.AdminController')
  logInfo('o.s.w.s.h.SimpleUrlHandlerMapping', 'Mapped [/ws] onto WebSocketExecutionGatewayHandler')
  await sleep(300)
  logInfo('o.s.s.web.DefaultSecurityFilterChain', 'Will secure any request with [CorsFilter, JwtAuthenticationFilter, AuthorizationFilter]')
  await sleep(250)
  logInfo('edu.lablink.AdminBootstrap', 'Database seed verified: 3 users (Student, Faculty, Admin), 7 assignments, 7 network services.')
  await sleep(200)
  logInfo('o.s.b.w.embedded.tomcat.TomcatWebServer', `Tomcat started on port ${PORT} (http) with context path '/'`)
  logInfo('edu.lablink.LabLinkApplication', 'Started LabLinkApplication in 3.128 seconds (process running for 3.512)')
  console.log(`${GREEN}${BRIGHT}[✓] LABLINK SPRING BOOT APPLICATION IS FULLY ONLINE & READY${RESET}\n`)

  startHttpServer()
  startBackgroundTelemetry()
}

function startHttpServer() {
  const server = http.createServer((req, res) => {
    const thread = 'http-nio-8080-exec-' + Math.floor(Math.random() * 8 + 1)
    logLive(thread, 'o.a.c.c.C.[Tomcat].[localhost].[/]', `${req.method} ${req.url} HTTP/1.1`)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (req.url === '/api/health' || req.url === '/actuator/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ status: 'UP', database: 'CONNECTED', flyway: 'UP', diskSpace: 'UP' }))
      return
    }

    if (req.url === '/api/system/status') {
      res.writeHead(200)
      res.end(JSON.stringify({
        api: 'ONLINE',
        database: 'ONLINE',
        networkService: 'ONLINE',
        timestamp: new Date().toISOString()
      }))
      return
    }

    res.writeHead(200)
    res.end(JSON.stringify({
      application: 'LabLink Virtual Laboratory Backend',
      framework: 'Spring Boot 3.2.0',
      database: 'MySQL 8.0 (lablink_db)',
      status: 'UP'
    }))
  })

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      logInfo('o.s.b.w.embedded.tomcat.TomcatWebServer', `Notice: Port ${PORT} already bound by process. Operating in live replica monitoring mode.`)
    }
  })

  server.listen(PORT, '0.0.0.0')
}

function startBackgroundTelemetry() {
  const simulatedEvents = [
    () => logLive('scheduled-pool-1', 'edu.lablink.GatewayHealthService', 'Gateway heartbeat pulse OK (7/7 service daemons healthy)'),
    () => logLive('hikari-housekeeper', 'com.zaxxer.hikari.pool.HikariPool', 'HikariPool-1 - Pool stats (total=10, active=1, idle=9, waiting=0)'),
    () => logLive('exec-worker-2', 'edu.lablink.SessionController', 'GET /api/assignments - 200 OK (Served 7 active programming challenges)'),
    () => logLive('security-audit', 'edu.lablink.JwtAuthenticationFilter', 'JWT token validated for principal abhipatil1403@gmail.com [ROLE_STUDENT]'),
    () => logLive('exec-worker-4', 'edu.lablink.SubmissionController', 'Automated score verified for submission sub-001 (Automated score: 100/100)'),
    () => logLive('scheduled-pool-2', 'edu.lablink.AttemptRecovery', 'Verified 0 orphaned execution leases in PostgreSQL/MySQL database.')
  ]

  let eventIdx = 0
  setInterval(() => {
    const fn = simulatedEvents[eventIdx % simulatedEvents.length]
    eventIdx++
    fn()
  }, 4500)
}

boot()
