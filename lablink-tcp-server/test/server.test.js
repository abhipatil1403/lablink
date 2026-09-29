import assert from 'node:assert/strict'
import net from 'node:net'
import { after, before, test } from 'node:test'
import { createTcpServer, handleCommand } from '../src/server.js'

let server
let port

before(async () => {
  server = createTcpServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  port = server.address().port
})

after(async () => { await new Promise(resolve => server.close(resolve)) })

function client() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port }, () => resolve(socket))
    socket.once('error', reject)
  })
}

function command(socket, text) {
  return new Promise((resolve, reject) => {
    socket.once('data', data => resolve(data.toString().trim()))
    socket.once('error', reject)
    socket.write(`${text}\n`)
  })
}

test('predefined commands return real protocol responses', async () => {
  const socket = await client()
  try {
    assert.equal(await command(socket, 'ping'), 'PONG')
    assert.match(await command(socket, 'time'), /^\d{4}-\d\d-\d\dT/)
    assert.equal(await command(socket, 'help'), 'Commands: ping, time, help, echo <message>')
    assert.equal(await command(socket, 'echo Hello LabLink'), 'ECHO: Hello LabLink')
    assert.equal(await command(socket, 'rm -rf /'), 'ERROR: Unknown command')
  } finally { socket.destroy() }
})

test('simultaneous clients keep responses separate', async () => {
  const [a, b] = await Promise.all([client(), client()])
  try {
    const [responseA, responseB] = await Promise.all([command(a, 'ping'), command(b, 'echo B only')])
    assert.equal(responseA, 'PONG')
    assert.equal(responseB, 'ECHO: B only')
    assert.equal(await command(a, 'echo A only'), 'ECHO: A only')
  } finally { a.destroy(); b.destroy() }
})

test('handler never executes unsupported commands', () => {
  assert.equal(handleCommand('whoami'), 'ERROR: Unknown command')
  assert.equal(handleCommand('echo '), 'ERROR: Unknown command')
})
