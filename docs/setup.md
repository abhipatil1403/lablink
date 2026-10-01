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
5. Follow the local backend configuration below to reference that external JSON file.

To provision the first faculty or admin account, create the account through Firebase Authentication, then create or update `users/{uid}` in Firestore with its `name`, `email`, `role` (`FACULTY` or `ADMIN`), `status: ACTIVE`, and `createdAt`. This bootstrap action is intentionally outside the public registration flow.

## Environment files

Copy each example file to `.env` in the same service directory. The backend reads its `.env` on startup. Keep real values private.

```cmd
copy lablink-backend\.env.example lablink-backend\.env
copy lablink-frontend\.env.example lablink-frontend\.env
copy lablink-network-service\.env.example lablink-network-service\.env
```

Edit `lablink-backend/.env` and use a Firebase JSON file outside the repository. Use forward slashes in the Windows path:

```env
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
GOOGLE_APPLICATION_CREDENTIALS=C:/LabLinkSecrets/firebase-service-account.json
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_PROJECT_ID=your-firebase-project-id
TCP_HOST=127.0.0.1
TCP_PORT=9001
NETWORK_SERVICE_URL=http://localhost:3001
GATEWAY_SHARED_SECRET=replace-with-a-long-random-value
```

The backend and WebSocket gateway read their local `.env` files at startup. Leave `FIREBASE_SERVICE_ACCOUNT_JSON` empty locally; it is only for a Render secret environment value. Copy the same `GATEWAY_SHARED_SECRET` into `lablink-network-service/.env`. The backend accepts Vite from `FRONTEND_ORIGIN=http://localhost:5173`; leave that value unless the frontend uses a different origin.

## Start the services

Install Node dependencies once in each Node service, then open four Command Prompt windows from the repository root:

```cmd
:: Terminal 1 - TCP experiment server
cd lablink-tcp-server
npm install
npm start

:: Terminal 2 - Spring Boot API
cd lablink-backend
.\mvnw.cmd spring-boot:run

:: Terminal 3 - WebSocket gateway
cd lablink-network-service
npm install
npm start

:: Terminal 4 - React frontend
cd lablink-frontend
npm install
npm run dev
```

Open `http://localhost:5173`. If the browser reports a CORS preflight error after updating the code, stop and restart the Spring Boot command so it loads the current CORS filter.

## Render and Vercel deployment

1. In Render, create a Blueprint from this repository's `render.yaml`. It creates the API and WebSocket gateway as web services plus a private TCP service.
2. When Render prompts for variables, provide `FIREBASE_PROJECT_ID`, the complete service-account JSON in `FIREBASE_SERVICE_ACCOUNT_JSON`, and the same final Vercel origin for `FRONTEND_ORIGIN` on both public Render services. Do not add the JSON to Git.
3. In Vercel, import this repository and set the project **Root Directory** to `lablink-frontend`. Vercel uses `vercel.json` to route direct browser visits back to the React app.
4. Set these Vercel production environment variables from your Firebase Web App configuration: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.
5. Set `VITE_API_BASE_URL=https://lablink-api.onrender.com` and `VITE_NETWORK_WS_URL=wss://lablink-network-service.onrender.com/ws`, using the actual Render service URLs if Render assigns different names.
6. Redeploy the Vercel project after changing its build-time variables. Copy its final `https://...vercel.app` URL into both Render `FRONTEND_ORIGIN` variables, then redeploy the API and gateway.
