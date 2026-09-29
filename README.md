# LabLink

LabLink is a connected virtual laboratory for a Computer Network Technology course. Students use a browser terminal to send commands through a WebSocket gateway to a real TCP server. Faculty review submissions, and administrators manage users and inspect service health.

## Quick start

1. Complete the Firebase and environment setup in [docs/setup.md](docs/setup.md).
2. Start the TCP server, backend, WebSocket gateway, then the frontend using the commands in that guide.
3. Open `http://localhost:5173`, register a student account, and start **TCP Client Server Communication**.

For production deployment, use the repository's Render Blueprint and the Vercel configuration described in [Setup](docs/setup.md#render-and-vercel-deployment).

The browser calls the API at `http://localhost:8080`. The backend explicitly accepts the Vite development origin `http://localhost:5173`; after pulling an update, restart the Spring Boot process to load the CORS configuration.

## Documentation

- [Architecture](docs/architecture.md)
- [Firestore data model](docs/database.md)
- [REST API](docs/api.md)
- [Network service](docs/networking.md)
- [Setup and Firebase configuration](docs/setup.md)
- [Demo flow and test checklist](docs/demo.md)

Firebase web values belong in `lablink-frontend/.env`, copied from its example. Backend privileges come from Application Default Credentials: set `GOOGLE_APPLICATION_CREDENTIALS` to a service account file outside the repository and `FIREBASE_PROJECT_ID` to the same project. Credentials and actual `.env` files are ignored by Git.
