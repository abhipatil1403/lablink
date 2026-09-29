# Demo flow and test checklist

## Demonstration

1. Start all four services as described in [setup.md](setup.md).
2. Register a student and sign in.
3. Open the active TCP experiment, start a session, then run `help`, `ping`, `time`, and `echo LabLink`.
4. Submit a short result. The submission includes the gateway-recorded transcript.
5. Sign in with a provisioned faculty account to review the transcript, add feedback, and grade it.
6. Sign in with a provisioned admin account to view users, experiment catalog status, and server information.

## Automated checks

Run these from their service directories:

```powershell
cd lablink-backend; .\\mvnw.cmd package
cd lablink-tcp-server; npm test
cd lablink-network-service; npm test
cd lablink-frontend; npm run build
cd lablink-frontend; npx eslint src
```

The backend tests cover authentication failures, CORS preflight, Firestore seed idempotence, session ownership and submission conditions, faculty review authorization, and admin safety restrictions. The network tests verify per-client TCP isolation, rejected invalid connections, and transcript recording. Browser and Firebase end-to-end checks require a configured Firebase project and are performed with the demonstration flow above.
