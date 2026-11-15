# TCP Chat Client: failure diagnosis and verified solution

## Evidence from the actual local assignment

SQL test `5f31b3c1-bc96-4cdc-bc06-3433d1158cbf` is **Multiple messages and disconnect**, enabled, weight 40. Its input is:

```json
{"service":"chat","username":"Lin","messages":["first","second","third"]}
```

The saved evaluation plan and execution log for attempt `37a6d62f-b328-4936-9d62-db62c40f4dfa` agree with this configuration. The saved result matches the expected welcome/replies/closed fields. Its network transcript ends with:

```text
tcp.send(1, "QUIT") -> true
tcp.read(1)         -> "BYE"
tcp.close(1)        -> true
```

`lablink-network-service/src/evaluate.js` additionally requires a recorded `tcp.read` whose response is `null`. All other online predicates pass for that saved transcript. The first read after QUIT consumes BYE; a second read is required to observe EOF. Assigning `closed:true` does not record EOF.

`src/services.js` implements QUIT as `socket.end('BYE\n')`. In `src/capabilities.js`:

- `tcp.connect(service)` records the service and numeric socket handle, or an error response before throwing when the connection fails.
- `tcp.send(id,line)` writes a newline framed command and records `true`.
- `tcp.read(id)` records one buffered line, or `null` after closure with no buffered lines remaining.
- `tcp.close(id)` calls the local socket's `end()` and records `true`. It does not record a read or EOF. Automatic worker cleanup does not record a close operation either.

## Offline case

SQL test `85745931-17ad-48c6-b5b9-fdf53ce41d3e` is **Connection failure**, weight 25:

```json
{"service":"offline","username":"Test","messages":[]}
```

Expected return: `{"error":true}` **and** an actual failed `tcp.connect('offline')` recorded in the transcript. The reported solution returns early for this input, producing the expected object but no network events. This fails the offline predicate.

## Solution fix

The corrected, copyable solution is [tcp-chat.js](../lablink-network-service/examples/tcp-chat.js). Paste its complete contents into the TCP Chat Client editor and select **Test**.

The changes to the reported solution are:

1. Remove the offline shortcut and call `tcp.connect(input.service)` inside the existing try/catch.
2. Validate BYE, then read again and derive `closed` from `tcp.read(socket) === null`.
3. Keep the explicit `tcp.close(socket)` and existing failure cleanup.

The evaluator, capabilities, protocol server and database test expectations were not changed for this fix. The original failing attempt was preserved. The integration checks use the corrected example directly, avoiding a separate test-only copy of the fix.

## Actual verification results

From `lablink-network-service`:

```powershell
node --test --test-name-pattern='TCP Chat regression' test/network.test.js
npm test
```

- Before the solution fix: the regression reproduced the exact reported transcript; the corrected-solution assertion failed (`false !== true`).
- After the fix: **2/2 targeted regression tests passed**. These cover the missing EOF and offline shortcut, and verify that removing BYE, EOF or close evidence still causes rejection.
- Complete network-service suite: **16/16 passed**, including all seven assignments and WebSocket/security/runtime checks.
- Live local React-configured WebSocket gateway / Spring Boot / PostgreSQL check: in a separate verification attempt, the reported source scored **0/100** across the three TCP tests; rerunning with the corrected file scored **100/100**. The exact requested test UUID passed.
- Verification attempt: `def52a3d-5d8b-44fe-b75e-9df39f853a5a`. API readback confirmed the solution, network log and score persisted. Independent `psql` readback confirmed **3 passing test results, score 100 and 23 recorded network events**.

Local-only evidence and the integration harness are under ignored `lablink-network-service/target/tcp-chat-local-*`. The harness uses the existing ignored local verification account file without printing credentials. It can be rerun while the application services are running:

```powershell
node target/tcp-chat-local-check.mjs
```

No production diagnostic logging was added. No commit or push was performed.
