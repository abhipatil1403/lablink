# Network service

The live TCP experiment consists of two separate services.

1. The browser connects to `ws://localhost:3001/ws` with a Firebase token and session ID.
2. The Node gateway calls the backend to validate ownership, role, session state, and its shared gateway secret.
3. The gateway opens one raw `net.Socket` to `127.0.0.1:9001` for that browser session.
4. Browser command frames are recorded and written to the TCP socket. TCP responses are recorded and forwarded as WebSocket frames.
5. Closing either side closes the paired connection and changes the session state.

The TCP server accepts UTF-8 line commands:

| Command | Response |
| --- | --- |
| `help` | Supported commands |
| `ping` | `PONG` |
| `time` | Current server time |
| `echo <message>` | The supplied message |

The gateway is intentionally restricted to the predefined TCP experiment. It does not accept arbitrary host or port values from the browser. Concurrent students receive independent TCP sockets.

`GATEWAY_SHARED_SECRET` must have the same long random value in the backend environment and `lablink-network-service/.env`. Do not expose it in the frontend or commit it.
