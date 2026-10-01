# Assignment programming and network protocols

Implement synchronous JavaScript `function solve(input) { ... }` using the provided capability API. Calls suspend the guest interpreter while the worker performs actual asynchronous network I/O. Return the documented JSON result.

## Capability API

| Function | Meaning |
| --- | --- |
| tcp.connect(service) | Open a real socket to chat, file, search or the unavailable offline target; return a socket ID |
| tcp.send(id,line) | Send a single newline-framed command |
| tcp.read(id) | Receive the next complete line; return null after disconnect |
| tcp.close(id) | Close the socket gracefully |
| udp.exchange(updates) | Send real player datagrams and receive broadcasts, including a stale update |
| http.request(path,method) | Request the controlled HTTP API; returns status, body and measured latencyMs |
| http.probe(name) | Probe lab, file, database, web, slow, portal or resolved; returns status/latency/error |
| dns.lookup(name) | Perform an actual UDP DNS A query; returns name, address and rcode |
| decodeBase64(text) | Decode a file data chunk |
| save(name,content) | Write and read back a file in this execution's isolated scratch directory |
| sha256(content) | Calculate the actual SHA-256 digest |
| print(value) | Append text/JSON to execution output |

There is no arbitrary host/port parameter.

## Assignment contracts

### TCP Chat Client

Connect to input.service. Send USER followed by the username; expect WELCOME. For every input.messages item, send MSG and receive MESSAGE RECEIVED. QUIT returns BYE and the server closes. Read null and close your side. Return welcome, replies and closed=true. On an unavailable target, catch the actual connection failure and return error=true.

### Reliable File Transfer

Connect to file and send GET plus input.filename. The first line is a JSON header containing name, bytes and sha256. Each following DATA line contains a base64 chunk. Reassemble all chunks until END, verify the digest and save the file.

Return name, content, sha256 and saved=true. A missing file returns ERROR NOT_FOUND. The interrupted fixture closes before END; treat missing completion or bad integrity as error=true. Available files are welcome.txt and networks.txt.

### UDP Multiplayer Position & Telemetry System

Send input.updates through udp.exchange. Each update contains player, x, y and seq. The UDP service sends broadcast position datagrams; an earlier sequence is deliberately re-sent through the real socket. Keep the highest sequence per player. Return positions keyed by player, each containing x, y and seq.

### College Student Information API Client

GET input.path through http.request. A successful student record contains name, rollNumber, department and attendance. Parse and return those fields. For non-success status, return error=true and the actual status. The controlled API includes /students/42, /students/missing and /failure.

### DNS Troubleshooting Challenge

Investigate portal.lablink.edu and compare it with working.lablink.edu. Use actual DNS answers plus probes of resolved and portal. The controlled resolver's portal A record points to an unreachable loopback address while the real web endpoint is reachable.

Return observations, dnsInformation, evidence, rootCause and recommendedFix. Include the queried address in DNS information and the correct reachable address in the recommended repair. The UI provides a separate investigation notebook; its notes become part of the submitted solution.

### Network Monitoring System

Probe every name in input.servers. Report name, ONLINE/OFFLINE status, actual latencyMs and a reason for failures. database has a refused TCP connection, slow exceeds the probe timeout, and lab/file/web respond over HTTP. Return servers as an array. Do not invent latency or availability.

### Client-Server File Search

Connect to search. SEARCH plus input.query returns a JSON array of matching filenames. GET plus input.select returns a JSON object with name, content and sha256, or a NOT_FOUND error. Save a valid selected file and return results, name, content and saved=true. Return an empty results array for no matches, or results and error=true for an invalid selection.

## Automated evaluation

The gateway runs student source separately for each stored test input and checks both returned data and network evidence. A correct output without matching real operations fails. Runtime exceptions receive ERROR; unmet behavior receives FAILED. The backend calculates earned weights divided by total enabled weights, multiplied by 100.

The optional lablink-tcp-server directory contains a standalone chat server for direct socket demonstrations. Normal application startup uses the gateway's integrated services.
