# LabLink network service

This is the network service tracked by the LabLink Git repository. It contains the QuickJS execution runtime, the seven controlled networking services and the real test suite.

## Use the repository copy

On the configured workstation, the correct directory is:

```text
F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-network-service
```

The separate directory at CP\lablink-network-service is an unversioned prototype with a default failing npm test script. It uses a different WebSocket protocol and has no assignment runner. Its matching package name does not make it part of this repository. Preserve it as separate user work; do not copy its package.json, lockfile or source into this service.

Confirm your location before installing or starting:

```powershell
Set-Location 'F:\ALL\ABHI\VIT\TY SEM 1\CNT\LAB\CP\lablink\lablink-network-service'
git rev-parse --show-toplevel
npm prefix
npm pkg get version scripts
```

Git must report the parent lablink checkout. This package is version 0.1.0 and has test, test:full-stack, test:local and test:local:persistence scripts.

## Install and start

```powershell
npm ci
npm start
```

Stop a running gateway before npm ci replaces its dependencies. The configured backend is http://localhost:8081, gateway port is 3001 and allowed browser origin is http://localhost:5173. The active .env contains the backend URL, origin and rotated gateway key. Keep it ignored and do not print it. All raw assignment servers start automatically on loopback ports.

Clients connect to /ws and send an authenticate JSON message containing their student JWT and attempt ID, then execute with mode=run or test and source code. The gateway authenticates internal API calls with the student JWT and X-LabLink-Gateway-Key. Tokens are not passed in WebSocket URLs. PostgreSQL calculates weighted grades from the captured test plan.

## Verification

```powershell
npm test
```

This executes test/network.test.js: real TCP/UDP/HTTP/DNS evaluators, sandbox limits, file isolation/cleanup, origin/authentication checks and malformed/duplicate request handling.

The existing isolated integration mode requires the packaged backend and the disposable PostgreSQL test database. It does not use the development lablink database:

```powershell
$env:LABLINK_UI_SMOKE = '1'
npm run test:full-stack
Remove-Item Env:LABLINK_UI_SMOKE
```

For the already configured local installation, test:local:persistence checks the previously recorded submissions and role logins. The separate test:local command creates verification accounts/submissions in the development database; it is not a read-only check.

See [setup](../docs/setup.md), [recovery findings](../docs/network-recovery.md), [local verification](../docs/local-verification.md) and [networking contracts](../docs/networking.md).
