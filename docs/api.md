# REST API

JSON requests use Authorization: Bearer <JWT>. Public endpoints are health, registration and login. The gateway heartbeat is authenticated by its shared secret. Browser CORS origins must match configured exact origins.

Errors include message and status. Missing/invalid/revoked tokens return 401; authenticated role/ownership violations return 403; missing records return 404; invalid fields return 400; conflicting lifecycle operations return 409.

## Authentication

| Method / path | Behavior |
| --- | --- |
| POST /api/auth/register | name, email, password → STUDENT account, JWT and profile |
| POST /api/auth/login | email, password → JWT and database profile |
| GET /api/auth/me | Current safe profile |
| POST /api/auth/logout | Revoke this user's existing JWTs; 204 |

Passwords are 8–72 characters for registration/faculty creation, with BCrypt's 72-byte limit. Roles are never accepted from public registration.

## Assignments and student work

| Method / path | Access |
| --- | --- |
| GET /api/assignments | Authenticated catalog |
| GET /api/assignments/{id} | Authenticated details and public evaluation criteria |
| POST /api/sessions | Student; body assignmentId creates a numbered attempt |
| GET /api/sessions | Student's own attempts |
| GET /api/sessions/{id} | Student's own work |
| POST /api/sessions/{id}/submit | Freeze evaluated attempt; no client score accepted |
| GET /api/submissions | Student's submissions |
| GET /api/submissions/{id} | Student's submission with grade/review history |

Attempt states: STARTING, RUNNING, TESTED, FAILED, SUBMITTED. Submission states: SUBMITTED, REVIEWED, RETURNED, REJECTED.

## Faculty

| Method / path | Behavior |
| --- | --- |
| GET /api/faculty/dashboard | SQL counts, recent attempts and pending submissions |
| GET /api/faculty/students | Student profiles |
| GET /api/faculty/sessions | Attempts; filters assignmentId, status, date |
| GET /api/faculty/sessions/{id} | Code, output, network evidence and results |
| GET /api/faculty/submissions | Student submissions |
| GET /api/faculty/submissions/{id} | Submission and review history |
| PATCH /api/faculty/submissions/{id}/review | grade (0–100), feedback, status |
| GET /api/faculty/assignments | Catalog management |
| PUT /api/faculty/assignments/{id} | Metadata, requirements, constraints, instructions, concepts, difficulty, deadline |
| PATCH /api/faculty/assignments/{id}/status | ACTIVE/INACTIVE |
| GET /api/faculty/assignments/{id}/tests | Test configurations |
| POST /api/faculty/assignments/{id}/tests | Add weighted test |
| PUT /api/faculty/assignments/{id}/tests/{testId} | Edit or disable test |

The equivalent assignment management paths under /api/admin/assignments are admin-only. Exactly seven assignment definitions are maintained; additional evaluation cases can be created.

## Admin

| Method / path | Behavior |
| --- | --- |
| GET /api/admin/dashboard | SQL totals and live gateway health |
| GET /api/admin/system-status | System overview/status |
| GET /api/admin/users | search, role and status filters |
| GET /api/admin/users/{id} | Safe user details |
| POST /api/admin/faculty | Create BCrypt-hashed FACULTY account |
| PATCH /api/admin/users/{id}/status | ACTIVE/INACTIVE/SUSPENDED; revoke tokens |
| GET /api/admin/servers | Ports, health, access state, active sessions and heartbeat |
| PATCH /api/admin/servers/{id}/status | Enable/disable execution |
| GET /api/admin/audit | Recent audit records |

Admins cannot deactivate themselves or other admins through this user-management endpoint.

## Gateway persistence

The following require both a student JWT and X-LabLink-Gateway-Key:

- GET /api/internal/sessions/{id}/validate
- POST /api/internal/sessions/{id}/begin: solution; returns captured evaluationTests
- POST /api/internal/sessions/{id}/complete: mode, output, networkLog, results
- POST /api/internal/sessions/{id}/failure: message

Result items contain testCaseId, passed, status and output. Every snapshotted enabled test must have exactly one result. The API computes the score and enforces attempt ownership/state.

POST /api/internal/services/heartbeat requires the gateway key and its actual endpoint port map; no user JWT is needed. GET /api/health is public.

## WebSocket

Connect to /ws with an allowed browser Origin. First send authenticate with token and sessionId. After READY, send execute with mode=run or test and code. The gateway emits status, testResult, complete or error. Run executes one input from the highest-weight case; test executes the full captured test plan.
