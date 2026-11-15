# Public homepage and workspace navigation

## Routes and authentication

| Route | Behavior |
| --- | --- |
| `/` | Public LabLink homepage, including platform introduction, lab workflow, supported features and three workspace cards. No workspace sidebar. Signed-in visitors also see Continue to Dashboard. |
| `/login` | Shared login, with Student/Faculty/Admin workspace links. |
| `/login/student` | Student-labelled login and a Create student account link. |
| `/login/faculty` | Faculty-labelled login with account provisioning guidance. |
| `/login/admin` | Admin-labelled login with account provisioning guidance. |
| `/register` | Existing student registration. Existing authenticated accounts return to their authorized dashboard. |
| `/student`, `/faculty`, `/admin` | Existing dashboards, protected by their corresponding account roles. |
| Unknown URLs or invalid login workspaces | Helpful page-not-found screen with a homepage link. |

Choosing a card changes navigation only. Login still posts **only email and password** to `/api/auth/login`, then refreshes the profile from `/api/auth/me`. The profile role determines the dashboard. Choosing Admin and logging in with a Student account opens `/student`.

Anonymous deep links go to the appropriate role login. Authenticated cross-role navigation redirects to the account's own dashboard before mounting another role's page. The existing Spring Security/JWT/ownership checks remain authoritative for API access. Unsupported account roles receive a workspace-unavailable message instead of a redirect loop. Expired credentials return to login; login failure displays the backend error without granting access.

Logout keeps the existing backend token revocation and local session cleanup, then the protected route returns to its role login. Login and registration have visible homepage links. Every workspace sidebar also includes Homepage.

Existing Student routes are preserved: `/student/dashboard`, `/student/assignments`, `/student/experiments`, `/student/attempts`, `/student/submissions`, `/student/submissions/:id`, `/student/profile`, `/assignment/:id`, `/experiment/:id`, `/attempt/:id`, and `/session/:id`. Faculty and Admin dashboard aliases and child routes are preserved too.

Vite serves direct navigations locally. The existing frontend `vercel.json` rewrites support SPA refreshes when deployed. Other static hosts need an equivalent fallback to `index.html`. No deployment was performed.

## Supported capabilities and scope

The homepage describes the existing controlled TCP/UDP/HTTP/DNS assignment services, isolated code execution, automated evaluation using both results and network evidence, recorded network transcripts, saved attempts/submissions, and faculty grading/feedback. Faculty assignment/test management and Admin account/service/status/audit pages already exist and are reused.

The hero transcript is explicitly labelled **Illustrative session**. It is not a live service-health display. Packet capture, animated packet visualization, public guest assignment execution, and public Faculty/Admin self-registration are not offered. No institution or contact details were invented.

The new frontend uses the existing React Router, Lucide icons and CSS. There are no new dependencies. Public grids have separate selectors so they do not change the assignment editor layout. The responsive layout supports narrow screens, visible keyboard focus, semantic headings/navigation and a skip-to-content link.

## Faculty and Admin account setup

- **Student:** register through `/register` or sign in with an existing student account. Backend registration always creates a Student.
- **Admin:** on a fresh database, configure `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in the private backend environment and start Spring Boot. The password must contain 12–72 characters. Bootstrap only creates an administrator when none exists. Remove the bootstrap password after successful initialization. On an existing database, use its already-provisioned administrator account.
- **Faculty:** an authenticated Admin opens **Users → Create Faculty** (`/admin/users`) and provisions the account. Faculty then sign in at `/login/faculty`. There is no public faculty registration endpoint.

Changing a role URL does not create an account or change its permissions. No credentials or environment files are included in this change.

## Verification commands

From `lablink-frontend`:

```powershell
npm run lint
npm run build
npx playwright install chromium  # Only if the browser is not installed yet.
npm test
```

The public-flow browser suite uses deterministic API/WebSocket fixtures on a dedicated Vite server at port 5176. It covers homepage rendering, all three card destinations, role-labelled login/refresh/homepage return, backend-profile dashboard selection, role guards, logout, expired sessions, invalid credentials, unknown routes, existing Student routes, keyboard navigation and mobile overflow at widths 320, 390 and 768. Screenshots/traces are written under ignored `lablink-frontend/target/public-flow`.

With a disposable integration PostgreSQL database available (default port 55432), from `lablink-backend`:

```powershell
.\mvnw.cmd test
```

The backend suite checks actual authentication, JWT revocation, Student-only registration, authorization, assignment ownership and SQL workflows. Added assertions ensure selecting Admin through a login query/body cannot elevate a Student account.

With the backend JAR built and the disposable database available, from `lablink-network-service`:

```powershell
$env:LABLINK_UI_SMOKE='1'
npm run test:full-stack
Remove-Item Env:LABLINK_UI_SMOKE
```

This existing integration harness starts a real backend and gateway with generated test credentials in an isolated SQL schema. Its browser smoke now enters through the public homepage and the actual Student/Admin/Faculty login cards. It exercises real registration, seven assignment executions/submissions, admin faculty provisioning, role guards, faculty reviews and Student feedback. It does not use the deterministic browser fixtures or modify the application's regular database.

CI runs the public-flow suite alongside the existing lint/build/backend/network/full-stack gates. Local execution does not imply a remote CI run or deployment.

## Results and change inventory

Verified locally:

- Frontend ESLint: passed.
- Vite production build: passed.
- Public-flow Playwright suite: 15 passed; HTTP/WebSocket fixture scope described above.
- Maven backend suite: 12 tests, zero failures/errors/skips, including the expanded role-boundary assertions.
- Real full-stack integration with `LABLINK_UI_SMOKE=1`: all seven assignments scored 100 with persisted submissions and faculty grades; all seven browser editor/test/submission flows passed. Public entry, Student registration, Admin/Faculty login navigation, account provisioning, role guards, service management, test editing, reviews and Student feedback passed.
- Desktop/mobile homepage screenshots were visually reviewed. No deployment or remote CI run was performed.

Files changed for this request (previous unrelated working-tree changes were retained):

| File | Change |
| --- | --- |
| `lablink-frontend/src/pages/PublicPages.jsx` | Public landing page, header and useful not-found page. |
| `lablink-frontend/src/workspaces.js` | Allowlisted workspace labels and profile-role dashboard destinations. |
| `lablink-frontend/src/App.jsx` | Public root, role-labelled login routes, retained protected routes and fallback handling. |
| `lablink-frontend/src/pages/AuthPages.jsx` | Role navigation, provisioning states, homepage return and backend-profile redirects. |
| `lablink-frontend/src/StudentLayout.jsx` | Homepage link and correct navigation labels for all roles. |
| `lablink-frontend/src/style.css` | Responsive public/auth styling, scoped grids and focus states. |
| `lablink-frontend/package.json` | Frontend test command using the already-installed Playwright dependency. |
| `lablink-frontend/playwright.config.mjs` | Dedicated deterministic browser-test server and artifacts. |
| `lablink-frontend/test/public-flow.spec.mjs` | Public navigation, authentication, authorization, refresh, Student-route and responsive regressions. |
| `lablink-frontend/test/ui-smoke.mjs` | Real browser workflow enters through homepage and role cards. |
| `lablink-backend/src/test/java/edu/lablink/SqlWorkflowTest.java` | Additional role-boundary and untrusted role-selection assertions. No backend production changes. |
| `.github/workflows/verify.yml` | Run public-flow tests and retain their artifacts in the existing verification workflow. |
| `docs/setup.md` | New homepage/login entry instructions. |
| `docs/public-entry.md` | Route, account, capability, verification and change documentation. |

Nothing was committed or pushed. Environment files and credentials were preserved.
