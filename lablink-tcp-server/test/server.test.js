import assert from 'node:assert/strict'
import net from 'node:net'
import { after, before, test } from 'node:test'
import { createTcpServer, handleChatMessage } from '../src/server.js'

let server
let port
before(async () => { server = createTcpServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port })
after(async () => { await new Promise(resolve => server.close(resolve)) })
function client() { return new Promise((resolve, reject) => { const socket = net.createConnection({ host: '127.0.0.1', port }, () => resolve(socket)); socket.once('error', reject) }) }
function command(socket, text) { return new Promise((resolve, reject) => { socket.once('data', data => resolve(data.toString().trim())); socket.once('error', reject); socket.write(`${text}\n`) }) }

test('chat server requires a username, accepts messages, and disconnects gracefully', async () => {
  const socket = await client()
  try {
    assert.equal(await command(socket, 'MSG too early'), 'ERROR: Send USER <username> first')
    assert.equal(await command(socket, 'USER Ada'), 'WELCOME Ada')
    assert.equal(await command(socket, 'MSG hello LabLink'), 'MESSAGE RECEIVED: hello LabLink')
    assert.equal(await command(socket, 'QUIT'), 'BYE')
  } finally { socket.destroy() }
})
test('multiple chat clients retain independent identities', async () => {
  const [a, b] = await Promise.all([client(), client()])
  try {
    await command(a, 'USER A'); await command(b, 'USER B')
    const [messageA, messageB] = await Promise.all([command(a, 'MSG one'), command(b, 'MSG two')])
    assert.equal(messageA, 'MESSAGE RECEIVED: one'); assert.equal(messageB, 'MESSAGE RECEIVED: two')
  } finally { a.destroy(); b.destroy() }
})
test('chat parser rejects malformed messages', () => {
  assert.equal(handleChatMessage('USER ', { username: null }), 'ERROR: Send USER <username> first')
  assert.equal(handleChatMessage('MSG ', { username: 'Ada' }), 'ERROR: Send MSG <message> or QUIT')
})
