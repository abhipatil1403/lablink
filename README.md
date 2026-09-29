# LabLink

LabLink is a connected virtual laboratory for a Computer Network Technology course. Students use a browser terminal to send commands through a WebSocket gateway to a real TCP server. Faculty review submissions, and administrators manage users and inspect service health.

## Implementation plan

1. Establish the architecture and safe repository defaults.
2. Scaffold the React, Spring Boot, Node WebSocket, TCP, and UDP service directories.
3. Configure Firebase Authentication and Firestore, then implement role based REST APIs.
4. Build the student flow, TCP server, WebSocket gateway, and submission history.
5. Add faculty and admin screens and APIs, security checks, automated tests, and setup/demo documentation.

Each implementation phase is tested, reviewed, committed, and pushed before the next begins. See [architecture](docs/architecture.md) for the service boundaries.
