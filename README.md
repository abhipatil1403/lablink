# LabLink — Connected Virtual Laboratory

A college networking laboratory with seven working programming assignments, separate student/faculty/admin workspaces, and PostgreSQL persistence.

## Stack

React + Vite, Spring Boot + Spring Security + BCrypt/JWT, PostgreSQL + Flyway/JPA, Node.js + WebSocket/TCP/UDP/HTTP/DNS. Student JavaScript runs in a separate QuickJS WebAssembly interpreter inside a constrained worker; network operations use real sockets against controlled services.

## Start locally

Follow [the setup guide](docs/setup.md). Start PostgreSQL, then run these in three terminals:

```powershell
cd lablink-backend
.\mvnw.cmd spring-boot:run
```

```powershell
cd lablink-network-service
npm ci
npm start
```

```powershell
cd lablink-frontend
npm ci
npm run dev
```

Open http://localhost:5173. The network gateway starts all assignment servers automatically.

## Assignments

1. TCP Chat Client
2. Reliable File Transfer
3. UDP Multiplayer Position & Telemetry System
4. College Student Information API Client
5. DNS Troubleshooting Challenge
6. Network Monitoring System
7. Client-Server File Search

Students edit `solve(input)`, run/test their code, and submit stored code, output, network evidence and computed test scores. Faculty edit assignment metadata/test cases and review, return or reject submissions. Admins create faculty, manage account access, control services and inspect actual system health and audit history.

## Documentation

- [Setup and Render/Vercel deployment](docs/setup.md)
- [Architecture and execution boundaries](docs/architecture.md)
- [Relational model and ER diagram](docs/database.md)
- [Networking protocols and programming contracts](docs/networking.md)
- [REST API](docs/api.md)
- [Demonstration and test commands](docs/demo.md)

`render.yaml` prepares two public Render web services. The backend uses Docker; the Node gateway contains all controlled network servers. Configure an existing PostgreSQL database and the final frontend origin before deploying. Secrets belong in local ignored environment files or hosting environment settings.
