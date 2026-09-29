# REST API

All `/api` endpoints except `GET /api/health` require `Authorization: Bearer <Firebase ID token>`. Browser requests may originate from the configured `FRONTEND_ORIGIN` (default `http://localhost:5173`). JSON error responses include `success`, `message`, and `status`.

| Method and path | Role | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | API availability |
| `POST /api/users/register` | Authenticated | Create or recover the caller's student profile |
| `GET /api/users/me` | Authenticated | Current profile |
| `GET /api/experiments` | Authenticated | Catalog |
| `GET /api/experiments/{id}` | Authenticated | Experiment details |
| `POST /api/sessions` | Student | Start an active TCP session with `{ "experimentId" }` |
| `GET /api/sessions/{id}` | Session owner | Read a session |
| `POST /api/sessions/{id}/submit` | Session owner | Submit `{ "result" }` after a real server response |
| `GET /api/submissions` | Student | Caller submission history |
| `GET /api/submissions/{id}` | Student owner | Submission details |
| `GET /api/faculty/dashboard` | Faculty | Counts and current activity |
| `GET /api/faculty/sessions` | Faculty | Student sessions |
| `GET /api/faculty/submissions` | Faculty | Submissions awaiting review |
| `GET /api/faculty/submissions/{id}` | Faculty | Submission and transcript |
| `PATCH /api/faculty/submissions/{id}/review` | Faculty | Record grade and feedback |
| `POST /api/experiments` | Faculty | Add an experiment catalog item |
| `PUT /api/experiments/{id}` | Faculty | Update an experiment |
| `PATCH /api/experiments/{id}/status` | Faculty | Set `ACTIVE`, `INACTIVE`, or `COMING_SOON` |
| `GET /api/admin/dashboard` | Admin | Platform counts |
| `GET /api/admin/users` | Admin | User list |
| `PATCH /api/admin/users/{uid}/status` | Admin | Enable or disable an account |
| `PATCH /api/admin/users/{uid}/role` | Admin | Assign a trusted role |
| `GET /api/admin/servers` | Admin | Registered experiment server data |
| `GET /api/admin/experiments` | Admin | Full catalog |
| `PATCH /api/admin/experiments/{id}/status` | Admin | Change catalog availability |

## Gateway-only endpoints

`/api/internal/sessions/{id}/validate`, `/state`, and `/log` are called by the WebSocket gateway. They require both the student's Firebase bearer token and the `X-LabLink-Gateway-Key` header. They are not browser APIs.
