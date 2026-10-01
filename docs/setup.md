# LabLink setup

## Prerequisites

- Java 17 or later.
- Node.js 22 or later.
- PostgreSQL 17 or later; the integration suite was also verified against PostgreSQL 18.
- Three terminals for the API, gateway and frontend.

## 1. Create the application database

Start your PostgreSQL service. Open `psql` with your existing PostgreSQL administrator account:

```powershell
psql -U postgres -d postgres
```

At the psql prompt:

```sql
CREATE USER lablink_app WITH LOGIN;
\password lablink_app
CREATE DATABASE lablink OWNER lablink_app;
\q
```

The password command prompts securely. Keep the password for the backend environment file. If this user/database already exists, reuse it.

## 2. Configure environment files

From the repository root, copy examples **only when the corresponding .env does not already exist**:

```powershell
if (!(Test-Path lablink-backend/.env)) { Copy-Item lablink-backend/.env.example lablink-backend/.env }
if (!(Test-Path lablink-network-service/.env)) { Copy-Item lablink-network-service/.env.example lablink-network-service/.env }
if (!(Test-Path lablink-frontend/.env)) { Copy-Item lablink-frontend/.env.example lablink-frontend/.env }
```

For an existing installation, update its files to the variables below. Remove obsolete authentication provider configuration. Backend .env files use Java properties syntax: one unquoted value per line.

### Backend: lablink-backend/.env

| Variable | Local value |
| --- | --- |
| PORT | 8080 |
| DATABASE_URL | jdbc:postgresql://localhost:5432/lablink |
| DATABASE_USERNAME | lablink_app |
| DATABASE_PASSWORD | Password chosen with psql |
| JWT_SECRET | Independently generated random secret, at least 32 bytes |
| INITIAL_ADMIN_EMAIL | Your initial administrator email |
| INITIAL_ADMIN_PASSWORD | Your initial administrator password, 12–72 characters |
| CORS_ALLOWED_ORIGINS | http://localhost:5173 |
| NETWORK_SERVICE_URL | http://localhost:3001 |
| GATEWAY_SHARED_SECRET | Another random secret, at least 32 characters |

Generate a secret with this command; run it separately for JWT and gateway secrets:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Bootstrap creates an admin only when none exists. Registration always creates students. After the first successful boot, remove INITIAL_ADMIN_PASSWORD from your local/hosting configuration. Faculty are created by that admin through **Users → Create Faculty**.

### Network gateway: lablink-network-service/.env

| Variable | Local value |
| --- | --- |
| WS_PORT | 3001 |
| API_BASE_URL | http://localhost:8080 |
| CORS_ALLOWED_ORIGINS | http://localhost:5173 |
| GATEWAY_SHARED_SECRET | Exactly the same gateway secret as the backend |

FRONTEND_ORIGIN remains a compatibility fallback on both services. CORS_ALLOWED_ORIGINS takes priority and accepts comma-separated exact origins. Do not add a trailing slash.

### Frontend: lablink-frontend/.env

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_NETWORK_WS_URL=ws://localhost:3001/ws
```

These two frontend variables are public URLs. Restart Vite after changing them.

## 3. Start the backend

In terminal 1:

```powershell
cd lablink-backend
.\mvnw.cmd spring-boot:run
```

Running .\mvnw.cmd alone fails because Maven requires a goal. Flyway applies migrations; Hibernate validates the resulting schema.

Health URL: http://localhost:8080/api/health.

## 4. Start all network services

In terminal 2:

```powershell
cd lablink-network-service
npm ci
npm start
```

The gateway starts chat/file/search TCP servers, a UDP telemetry server, a DNS resolver, an HTTP student API and monitoring endpoints. Their ports are assigned automatically on loopback. No separate TCP or UDP process is needed.

Health URL: http://localhost:3001/health. Public gateway URL: ws://localhost:3001/ws.

## 5. Start React

In terminal 3:

```powershell
cd lablink-frontend
npm ci
npm run dev
```

Open http://localhost:5173. Log in with the bootstrap admin; create faculty. Students register through the public registration page.

## Ports

| Component | Port |
| --- | --- |
| PostgreSQL | 5432 |
| Spring Boot API | 8080 |
| WebSocket gateway and health HTTP | 3001 |
| Vite frontend | 5173 |
| Assignment TCP/UDP/DNS/HTTP servers | Assigned loopback ports, visible to admin |
| Disposable integration PostgreSQL | 55432 by default |
| Browser integration frontend | 5175 |

Stop the old application processes before restarting the updated application. If Vite chooses a different port, add its exact origin to both backend and gateway CORS settings.

## Render backend and gateway

Use the **existing Git repository** as the source. Select a PostgreSQL provider/database first; render.yaml deliberately does not provision a billable database.

### Backend web service

- Root directory: lablink-backend.
- Runtime: **Docker**.
- Dockerfile: Dockerfile in that directory.
- Start command: supplied by Dockerfile (`java -jar app.jar`). A Docker Command override is unnecessary.
- Health check: /api/health.
- DATABASE_URL: provider PostgreSQL URI (`postgresql://...`) or a JDBC URL.
- The backend extracts credentials from a provider URI. For JDBC URLs, set DATABASE_USERNAME and DATABASE_PASSWORD separately.
- JWT_SECRET and GATEWAY_SHARED_SECRET: independent generated secret values.
- INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD: bootstrap configuration as above.
- CORS_ALLOWED_ORIGINS: final Vercel origin.
- NETWORK_SERVICE_URL: actual gateway HTTPS URL.

This configuration follows [Render's Docker deployment documentation](https://render.com/docs/docker). The database URI format is documented in [Render's Blueprint reference](https://render.com/docs/blueprint-spec).

### Network gateway web service

- Root directory: lablink-network-service.
- Runtime: Node.
- Build command: npm ci.
- Start command: npm start.
- Health check: /health.
- NODE_VERSION: 22.
- API_BASE_URL: actual backend HTTPS URL.
- GATEWAY_SHARED_SECRET: same value as backend.
- CORS_ALLOWED_ORIGINS: same final Vercel origin.

Render supplies PORT automatically; the gateway binds 0.0.0.0 and uses it. All raw assignment sockets stay inside the gateway process on loopback, so a separate private TCP deployment is unnecessary. Public WebSockets use `wss://<actual-gateway-host>/ws`, as described in [Render's WebSocket documentation](https://render.com/docs/websocket).

Free web services can sleep after inactivity and require a cold start; see [Render's free service limits](https://render.com/docs/free). Inspect the selected hosting/database plan before creating resources.

## Vercel frontend

- Import the same Git repository.
- Root directory: lablink-frontend.
- Framework preset: Vite.
- Install command: npm ci.
- Build command: npm run build.
- Output directory: dist.
- VITE_API_BASE_URL: actual Render backend HTTPS URL.
- VITE_NETWORK_WS_URL: actual gateway WSS URL ending in /ws.

Redeploy after changing frontend variables because Vite embeds them during the build. vercel.json handles browser route refreshes. See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

## Troubleshooting

- **Database connection refused:** start PostgreSQL and check DATABASE_URL/credentials.
- **JWT_SECRET/gateway secret error:** fill both required secrets before starting services.
- **401:** log in again; logout and account suspension revoke existing tokens.
- **403:** check the user's database role or attempt ownership.
- **CORS error:** match the exact browser origin in both services, then restart them.
- **WebSocket failed:** check the gateway /health endpoint, origin and WS/WSS URL.
- **Run failed:** inspect the stored test error and network transcript; follow each assignment's return contract.
- **Stale RUNNING attempt after a gateway crash:** the backend recovers it after its ten-minute execution lease expires; reconnect and retry.
