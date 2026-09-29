# Firestore data model

LabLink uses Firebase Authentication for identity and Cloud Firestore for application data. The Spring Boot API is the only application service that reads or writes Firestore. Browser clients never receive service-account credentials.

| Collection | Document ID | Core fields |
| --- | --- | --- |
| `users` | Firebase UID | `name`, `email`, `role`, `status`, `createdAt` |
| `experiments` | UUID or seeded ID | `title`, `protocol`, `experimentType`, `status`, `instructions`, `objective` |
| `experimentServers` | server ID | `type`, `address`, `port`, `status`, `lastHeartbeat` |
| `sessions` | UUID | `studentId`, `experimentId`, `status`, `startTime`, `endTime`, `logs` |
| `submissions` | session ID | `studentId`, `experimentId`, `logs`, `result`, `grade`, `feedback`, `status` |

## Roles and status

`STUDENT` is assigned when a user registers through the application. `FACULTY` and `ADMIN` are trusted roles and must be provisioned by an administrator. `ACTIVE` users may use the service; `DISABLED` users are refused at token verification.

## Session transcript

The WebSocket gateway appends each student command and TCP-server response to `sessions/{sessionId}.logs`. A submission copies that server-recorded transcript. The browser display is not trusted as a source for marks. Each transcript line has `id`, `direction` (`STUDENT` or `SERVER`), `text`, and `at`.

## Seeded catalog

Startup seeding creates the TCP Client Server Communication experiment as `ACTIVE`. UDP, DNS, HTTP, ICMP, and file-transfer catalog entries are `COMING_SOON` until a corresponding live service exists.
