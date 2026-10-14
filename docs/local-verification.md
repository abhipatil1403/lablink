# Local setup and verification — 15 October 2026

## Result

The complete application was verified locally using the configured .env files and the persistent **lablink** PostgreSQL database. React, Spring Boot, WebSocket execution and all seven controlled services are running. No hosting deployment was performed. Application components were preserved; the changes add a verification command, reusable browser checks, a background-process stop helper and documentation.

## Workstation configuration

| Component | Verified configuration |
| --- | --- |
| Java | Microsoft OpenJDK 17.0.14 |
| Maven wrapper | Maven 3.9.16 with Java 17 |
| Node.js / npm | 22.16.0 / 9.9.4 |
| PostgreSQL | 18.1; SCRAM password authentication; application role lablink_app |
| Application database | lablink on 127.0.0.1:5432 |
| PostgreSQL data | %LOCALAPPDATA%\LabLink\postgres, outside Git |
| Spring Boot | http://localhost:8081 |
| React | http://localhost:5173 |
| Gateway / WebSocket | http://localhost:3001/health / ws://localhost:3001/ws |

Apache occupies 8080. The pre-existing PostgreSQL Windows service uses 5434. Both were left unchanged. The LabLink database is a separate cluster owned by the current Windows account, bound to loopback.

Backend, gateway and frontend environment files were configured with matching URLs/origins and an identical gateway secret. Independent JWT, gateway, database and account passwords were generated without printing them. Obsolete provider/TCP configuration was removed from the active .env files. Previous files were retained as ignored .env.before-local-setup backups. Secret files are restricted to the current Windows account and SYSTEM.

The initial admin was created from environment settings. INITIAL_ADMIN_PASSWORD was then removed from the runtime .env, and the same admin successfully logged in after restart. Admin, student and faculty login details are available **only locally** in the ignored **lablink-backend/.env.local-accounts.json** file. Open that file yourself when logging in; do not paste its contents into logs, chats or Git.

## Exact start commands

The services are already running in the background. To switch to your own terminal sessions, first run this from the repository root:

```powershell
.\scripts\stop-local-background.ps1
```

This helper checks saved process names and start times before stopping the three agent-started application processes. It leaves PostgreSQL running. A read-only check is available with -CheckOnly. Terminal sessions that you start yourself should be stopped with Ctrl+C.

### Terminal 1 — PostgreSQL

```powershell
pg_ctl -D "$env:LOCALAPPDATA\LabLink\postgres" status
if ($LASTEXITCODE -ne 0) {
    pg_ctl -D "$env:LOCALAPPDATA\LabLink\postgres" -l "$env:LOCALAPPDATA\LabLink\postgres\server.log" -o "-p 5432 -h 127.0.0.1" -w start
}
```

This reuses the configured database. Do not run initdb or CREATE DATABASE again.

### Terminal 2 — Spring Boot

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-backend'
java -jar target/lablink-backend-0.1.0.jar
```

This is the already verified JAR; it reads .env from the backend working directory. The development alternative is .\mvnw.cmd spring-boot:run. Do not run Maven clean/package/verify on the same JAR while it is running on Windows.

### Terminal 3 — networking services

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-network-service'
npm start
```

TCP chat, TCP file transfer/search, UDP telemetry, controlled DNS and HTTP/monitoring endpoints start together. Their raw ports are assigned on loopback and appear in Admin → Servers. Separate legacy TCP/UDP processes are unnecessary.

### Terminal 4 — React

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-frontend'
npm run dev
```

Open http://localhost:5173. Dependencies and the browser needed for verification are already installed on this workstation.

To stop the dedicated database after stopping the API:

```powershell
pg_ctl -D "$env:LOCALAPPDATA\LabLink\postgres" -w stop
```

## Verified results

| Check | Actual result |
| --- | --- |
| Backend tests and package | .\mvnw.cmd -q verify, Java 17: 12 tests, zero failures/errors; package successful |
| Real networking tests | npm test: 12 tests, zero failures |
| Frontend | npm run lint and npm run build: both exit 0 |
| Existing isolated end-to-end mode | LABLINK_UI_SMOKE=1 npm run test:full-stack: seven API workflows and all browser role/assignment checks passed |
| Running React | HTTP 200 on 5173; browser registration, navigation and editors verified |
| Running API/database | /api/health HTTP 200, database ONLINE; five migrations applied |
| Gateway | /health HTTP 200; all seven service response checks ONLINE |
| WebSocket | Authenticated executions against ws://localhost:3001/ws for all seven assignments |
| Browser role workflows | Student registration/login; admin login/faculty creation; faculty login, grading and feedback; student sees faculty feedback |
| Authorization | Unauthenticated 401; student/faculty/admin boundaries 403; another student's attempts/submissions 403 |
| Session controls | Suspension invalidates an existing JWT; reactivation permits fresh login; logout revokes the token |
| Submission controls | Run alone cannot submit; Test required; code errors yield ERROR/zero score; confirmation cancellation leaves work unsubmitted |
| Administration | User details, account status changes, service disable/enable, assignment deactivation/reactivation, audit history |
| Responsive/files | Mobile navigation and horizontal overflow check; reconstructed welcome.txt downloaded and content checked |
| Database persistence | Independent psql query checks SQL rows, not only API responses; all seven graded submissions survive API and PostgreSQL restarts |
| Credentials | All application password hashes are BCrypt; no plaintext application passwords in the users table; secrets remain in ignored local files |

### Individual assignments — latest complete local run

| Assignment | Passing cases | Automated score | Faculty grade | Actual recorded operations |
| --- | --- | --- | --- | --- |
| TCP Chat Client | 3 | 100 | 90 | TCP connect/send/read/close; username, messages, disconnection and refused connection |
| Reliable File Transfer | 4 | 100 | 91 | TCP stream, chunk decoding, SHA-256, actual scratch-file save; missing/interrupted file cases |
| UDP Telemetry | 3 | 100 | 92 | Actual UDP datagrams; multiple players and out-of-order update handling |
| HTTP API Client | 4 | 100 | 93 | HTTP GET/JSON; successful response, 404 and 503 handling |
| DNS Troubleshooting | 3 | 100 | 94 | Actual DNS queries and HTTP reachability; observations, evidence, diagnosis and fix stored |
| Network Monitoring | 3 | 100 | 95 | Real endpoint checks, measured latency, unavailable target and timeout |
| Client-Server File Search | 3 | 100 | 96 | TCP query/results, selected-file transfer/save, empty results and invalid selection |

Every row completed Run → Test → Submit → Faculty review → Student feedback in the application database. The latest API verification student has seven submissions, **23** stored PASSED results, seven faculty reviews and **151** recorded network events. The first run had the original 22 cases; faculty test management created one additional HTTP 404 case. Repeated browser verification edits/reuses that case and retains exactly seven assignments.

Verification uses reference student implementations from lablink-network-service/test/solutions.js. Those sources execute in the same isolated runtime used by the student editor; they are not sent to the production UI. These results establish the tested scenarios, not correctness of every possible student solution.

## Reproduce verification against these running services

These commands intentionally create verification users, attempts, submissions and reviews in the local application database. Those records remain visible for inspection. They do not target hosted services and do not change the .env configuration.

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-network-service'
$env:LABLINK_UI_SMOKE = '1'
npm run test:local
Remove-Item Env:LABLINK_UI_SMOKE
```

The command attaches to the existing API, gateway and React instance, verifies all seven assignments and role workflows, and independently queries PostgreSQL through psql. It creates fresh local student/faculty credentials and updates their entries in the ignored local account file; the admin credential is preserved.

After restarting the API and database, verify that the most recent results survived, without creating new records:

```powershell
npm run test:local:persistence
```

### Local evidence

- lablink-network-service/target/local-verification.json: individual assignment IDs, test counts, operations, scores, grades and timestamps.
- lablink-network-service/target/sql-verification.json: independent SQL results and snapshot used for persistence comparison.
- lablink-network-service/target/local-persistence.json: post-restart SQL equality and all three role logins.
- lablink-frontend/target/ui/: browser screenshots, including the assignment editor, mobile view and admin user details.
- lablink-backend/target/surefire-reports/: all 12 backend test results.
- Component target/local-*.log files: local application logs. PostgreSQL logs are in its data directory.

Generated evidence/logs are ignored. This document records the verified outcomes without passwords or tokens.

## Issue found and corrected

After activating the new local .env files, the existing isolated browser test on port 5175 failed registration. A direct preflight check reproduced HTTP 403. Its backend process set the legacy FRONTEND_ORIGIN fallback, while the local CORS_ALLOWED_ORIGINS setting restricted the application to 5173. The isolated test now explicitly supplies its own CORS_ALLOWED_ORIGINS and asserts both the preflight status and allow-origin header. The complete isolated browser suite passed after this change. The running local application's allowed origin remains http://localhost:5173.

The browser verifier can now attach to the existing frontend and use separately supplied admin credentials. Fresh faculty display names and reuse of its generated HTTP test case allow repeated checks against a persistent local database.

## Remaining items

- Local setup and the requested automated end-to-end checks: complete.
- Render/Vercel deployment: deliberately not performed.
- Verification accounts/data are retained locally; use the ignored credential file to inspect each role.
- Flyway emits an advisory that its bundled version formally supports PostgreSQL through 17. PostgreSQL 18.1 was used here, and all five migrations, relational tests and persistence checks passed. This advisory was observed and not suppressed.
