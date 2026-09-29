# Setup

## Prerequisites

- Java 17
- Node.js 20 or later
- A Firebase project with Authentication and Cloud Firestore enabled

## Firebase

1. In Firebase Authentication, enable **Email/Password** sign-in.
2. Create a Cloud Firestore database in the Firebase project.
3. Add a Web App in Firebase and copy its public configuration into `lablink-frontend/.env`, created from `.env.example`.
4. In Firebase project settings, create a service account key and save it outside this repository.
5. Set `GOOGLE_APPLICATION_CREDENTIALS` to that external JSON file and `FIREBASE_PROJECT_ID` to the Firebase project ID before starting the backend.

To provision the first faculty or admin account, create the account through Firebase Authentication, then create or update `users/{uid}` in Firestore with its `name`, `email`, `role` (`FACULTY` or `ADMIN`), `status: ACTIVE`, and `createdAt`. This bootstrap action is intentionally outside the public registration flow.

## Environment files

Copy each example file to `.env` in the same service directory. Keep real values private.

```powershell
Copy-Item lablink-frontend/.env.example lablink-frontend/.env
Copy-Item lablink-network-service/.env.example lablink-network-service/.env
```

Set backend variables in the terminal that starts Spring Boot. Example:

```powershell
$env:FIREBASE_PROJECT_ID = "your-project-id"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\secure\\firebase-service-account.json"
$env:GATEWAY_SHARED_SECRET = "a-long-random-secret-shared-with-the-gateway"
```

Put that same `GATEWAY_SHARED_SECRET` in `lablink-network-service/.env`. The backend accepts Vite from `FRONTEND_ORIGIN=http://localhost:5173`; leave that value unless the frontend uses a different origin.

## Start the services

Install Node dependencies once in each Node service, then use four terminals:

```powershell
cd lablink-tcp-server; npm install; npm start
cd lablink-backend; .\\mvnw.cmd spring-boot:run
cd lablink-network-service; npm install; npm start
cd lablink-frontend; npm install; npm run dev
```

Open `http://localhost:5173`. If the browser reports a CORS preflight error after updating the code, stop and restart the Spring Boot command so it loads the current CORS filter.
