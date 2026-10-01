# Demonstration and verification

## Demonstration

1. Start the database, API, gateway and React using setup.md.
2. Log in as the initial admin. Inspect PostgreSQL/system health and all seven network service heartbeats.
3. Create a faculty account from Users. Register a separate student account.
4. As student, open the seven-card assignment catalog. Start an assignment and implement solve(input) using its protocol contract.
5. Run a solution, inspect the real network transcript, then Test all. Incorrect code gets failed/error results; valid implementations earn their computed weighted score.
6. Submit evaluated work. Inspect stored code, output, trace and test results in submission history.
7. As faculty, open Students → student → attempt, or Submissions → Review. Enter a grade and feedback; review, return or reject.
8. As student, view the actual faculty grade and feedback. Returned work can be revised in a new attempt.
9. As admin, filter users, change access, enable/disable a service, inspect active sessions and audit history.

## Local checks

Frontend:

```powershell
cd lablink-frontend
npm ci
npm run lint
npm run build
```

Network service (uses real local sockets):

```powershell
cd lablink-network-service
npm ci
npm test
```

Backend integration tests require a **disposable** PostgreSQL database. They create test users and attempts. Configure TEST_DATABASE_URL, TEST_DATABASE_USERNAME and TEST_DATABASE_PASSWORD for that database; default is jdbc:postgresql://127.0.0.1:55432/lablink_test with local trust authentication.

```powershell
cd lablink-backend
.\mvnw.cmd clean verify
```

### Optional isolated PostgreSQL test cluster

When PostgreSQL tools are on PATH, from the repository root:

```powershell
initdb -D .lablink-test-db -U lablink_test -A trust --encoding=UTF8 --no-locale
pg_ctl -D .lablink-test-db -l .lablink-test-db/server.log -o "-p 55432 -h 127.0.0.1" -w start
psql -h 127.0.0.1 -p 55432 -U lablink_test -d postgres -c "CREATE DATABASE lablink_test;"
```

Use initdb/CREATE DATABASE only once. The cluster binds loopback and is ignored by Git. Stop it after testing:

```powershell
pg_ctl -D .lablink-test-db -w stop
```

### Full stack and browser checks

Build the backend jar first. Full-stack checks start an isolated Spring Boot process, apply migrations in a unique test schema, bootstrap generated test credentials, and run all seven assignments through the actual gateway. They also verify submissions, faculty grades and service heartbeat persistence.

```powershell
cd lablink-network-service
npm run test:full-stack
```

For headless browser workflows, install the browser once:

```powershell
cd lablink-frontend
npx playwright install chromium
```

Then:

```powershell
cd lablink-network-service
$env:LABLINK_UI_SMOKE = "1"
npm run test:full-stack
Remove-Item Env:LABLINK_UI_SMOKE
```

Browser checks cover registration, all seven editors/tests/submissions, ownership route guards, responsive navigation, logout, admin faculty creation/service management, test-case editing and faculty grading. Screenshots are generated in lablink-frontend/target/ui; backend process logs are in lablink-backend/target/e2e.log. Generated test schemas are isolated from application data.

GitHub Actions repeats the same gates against a disposable PostgreSQL 17 service. Docker image publication and actual Render/Vercel provisioning require hosting configuration; this repository's checks do not create hosting resources.
