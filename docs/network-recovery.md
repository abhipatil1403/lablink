# Network service recovery and verification — 15 October 2026

## Root cause and source of truth

The Git root is F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink, branch main, HEAD 7e28016 at the start of this recovery. Its working tree was clean.

The failing npm command was being run from the separate sibling directory F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink-network-service. That folder is not a Git repository. It contains a version 1.0.0 npm package with the default failing test command, dotenv/ws dependencies and a legacy TCP passthrough server. It authenticates using URL query parameters, has no gateway-key header and targets a different backend port. It has no QuickJS runner or test directory.

The intended service is **inside the Git checkout**, at lablink\lablink-network-service. Its tracked version 0.1.0 package already contains all required source files, fixtures, test files and scripts, including QuickJS, all seven evaluators and authenticated internal API reporting. Git history confirms the implementation in bc23b9d and the local verification extensions in 7e28016. No tracked implementation was missing; restoring files or replacing either package was unnecessary.

The sibling prototype, its manifest/lockfile, source, configuration and dependencies were left untouched. No files were deleted, reset, moved or overwritten from that copy. Assignment/test IDs, migrations, frontend contracts and grading weights were preserved.

## Repairs

- The gateway now requires a string session ID before UUID validation. Crafted JSON objects, arrays, null and numeric IDs close with WebSocket code 1008 rather than reaching JavaScript coercion.
- File-transfer/search lookups check that requested names are actual fixture keys. Requests such as GET __proto__, GET constructor and GET toString return NOT_FOUND instead of accessing inherited JavaScript properties. The file-transfer evaluator applies the same own-key rule.
- Missing internal gateway headers now return 403 for session operations and heartbeats. Valid request schemas and authentication headers are unchanged.
- Regression checks cover malformed authentication, duplicate execution, duplicate test-result IDs, duplicate completion, output limits, concurrent storage isolation and scratch-directory removal after success, guest errors and watchdog termination.
- Existing saved-filename validation and the five-file limit were retained. The tests verify that __proto__ is rejected as a saved filename and that an allowed filename such as constructor still counts toward the storage limit.
- Setup documentation and a network-service README now identify the correct checkout and explain the incompatible sibling package.

## Dependency and secret handling

npm ci --no-audit --no-fund completed in the tracked service. npm ls --depth=0 resolved quickjs-emscripten 0.31.0 and ws 8.22.0 from the existing lockfile. The manifest and lockfile match and were not rewritten.

A new random 32-byte gateway key was written consistently to the ignored backend and network-service .env files. No key value was printed. The services were restarted with the new configuration. A live authenticated probe confirmed:

- Retired gateway key: HTTP 403.
- Missing gateway key: HTTP 403.
- New gateway key: authentication accepted, followed by HTTP 404 for the deliberately nonexistent session.

The active API URL is http://localhost:8081, WebSocket URL ws://localhost:3001/ws and allowed frontend origin http://localhost:5173. No manual rotation is required for these active local services. Legacy copies were not given the new key.

## Executed verification

| Check | Actual result |
| --- | --- |
| Network dependency installation/integrity | npm ci and npm ls --depth=0 succeeded; manifest/lock unchanged |
| Network/security suite | npm test: 14 passed, zero failures |
| Seven assignment evaluators | Real TCP chat/file/search, UDP telemetry, HTTP API, DNS and monitoring cases passed |
| Sandbox/resource checks | No process/require/unrestricted fetch; unknown network destinations and path traversal rejected; loop/memory/output/operation limits and storage isolation passed |
| Scratch cleanup | No new scratch directories left after success, guest exception or parent watchdog termination |
| Gateway requests | Malformed authentication rejected; duplicate execute produced only one begin/complete; disallowed browser origin returned 403 |
| Backend tests/package | Java 17, .\mvnw.cmd -q verify: 12 passed; package succeeded |
| Backend trust/reporting | Missing/wrong keys rejected; duplicate result IDs returned 400 without changing the running attempt/score; repeated completion returned 409 |
| Frontend | npm run lint and npm run build succeeded |
| Isolated end-to-end | All seven actual executions, SQL submissions, faculty grades, heartbeats and browser role/assignment workflows passed |
| Existing local data | npm run test:local:persistence passed: seven unchanged SQL submissions and all three role logins |
| Live malformed request | Crafted non-string session ID closed with 1008; gateway remained healthy |
| Actual local gateway integration | All seven advertised live ports passed protocol probes; fresh authenticated heartbeats and WebSocket-to-backend authenticated lookup passed |

Backend tests used only the disposable lablink_test database at 127.0.0.1:55432. Full-stack integration used a unique schema in that test database. No development schema/data was reset or reseeded, and test cases were not edited to force a pass. The local persistence check compared existing assignment records without creating new attempts or submissions. Normal logins/heartbeats update their usual activity metadata.

Local evidence remains in ignored files: backend target/surefire-reports and target/e2e.log, frontend target/ui screenshots, network-service target/key-rotation-verification.json, target/live-recovery-verification.json and target/local-persistence.json.

## Start the intended project

The configured local services were restarted during recovery. If switching from the current background processes to your own terminals, run scripts/stop-local-background.ps1 from the Git root first. Keep the local PostgreSQL cluster running on 5432.

In three separate PowerShell terminals:

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-backend'
java -jar target/lablink-backend-0.1.0.jar
```

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-network-service'
npm start
```

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-frontend'
npm run dev
```

Open http://localhost:5173. The backend development alternative is .\mvnw.cmd spring-boot:run. Do not package the same JAR while it is running on Windows.

## Review state

No outstanding failed or blocked checks remain. The existing PostgreSQL 18/Flyway compatibility advisory is unchanged; all migrations and tests passed. No deployment was performed. Changes are intentionally uncommitted and unstaged, with no push, per the recovery request. Review the working-tree diff and the two new documentation files before deciding to commit.
