// In-browser network execution and protocol simulation engine.
// Allows LabLink to run completely client-side without any paid cloud servers.

export function sha256(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)) }
  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  let lengthProperty = 'length'
  let i, j
  let result = ''
  const words = []
  const asciiBitLength = ascii[lengthProperty] * 8
  let hash = []
  const k = []
  let primeCounter = 0
  const isComposite = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }
  hash = hash.slice(0, 8)
  ascii += '\x80'
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00'
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i)
    words[i >> 2] |= j << ((3 - i) % 4) * 8
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0)
  words[words[lengthProperty]] = (asciiBitLength | 0)
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16)
    const oldHash = hash
    hash = hash.slice(0, 8)
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6])
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2])
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0)
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj
      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]]
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0
  }
  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255
      result += (byte < 16 ? '0' : '') + byte.toString(16)
    }
  }
  return result
}

export function decodeBase64(str) {
  try {
    return atob(str)
  } catch {
    return ''
  }
}

// Generate the 100-packet networks.txt fixture
const networksLines = []
for (let i = 1; i <= 100; i++) {
  networksLines.push(`Packet ${i}: TCP delivers an ordered stream; clients must buffer and verify the complete file.`)
}
const NETWORKS_TXT = networksLines.join('\n')

const VIRTUAL_DOCUMENTS = {
  'welcome.txt': 'Welcome to the LabLink college document server.',
  'networks.txt': NETWORKS_TXT
}

function deepEqual(a, b) {
  if (a === b) return true
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false
  const keysA = Object.keys(a), keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) return false
  }
  return true
}

export function executeStudentTest(type, testCase, studentCode) {
  const input = testCase.configuration?.input || {}
  const config = testCase.configuration || {}
  const events = []
  const outputs = []
  const savedFiles = {}

  function log(msg) {
    outputs.push(typeof msg === 'object' ? JSON.stringify(msg) : String(msg))
  }

  // Simulated TCP services
  let socketCounter = 0
  const openSockets = new Map()

  const tcp = {
    connect(serviceName) {
      socketCounter++
      const sockId = socketCounter
      events.push({ op: 'tcp.connect', args: [serviceName], response: serviceName === 'offline' ? { error: true } : { connected: true } })
      
      if (serviceName === 'offline') {
        openSockets.set(sockId, { service: 'offline', buffer: ['ERROR CONNECTION_REFUSED'], state: {} })
        return sockId
      }

      openSockets.set(sockId, { service: serviceName, buffer: [], state: {} })
      return sockId
    },
    send(id, line) {
      events.push({ op: 'tcp.send', args: [id, line] })
      const sock = openSockets.get(id)
      if (!sock) return

      const cleanLine = String(line).replace(/\r?\n$/, '')

      if (sock.service === 'chat') {
        if (!sock.state.user) {
          if (cleanLine.startsWith('USER ')) {
            sock.state.user = cleanLine.slice(5)
            sock.buffer.push('WELCOME ' + sock.state.user)
          } else {
            sock.buffer.push('ERROR USER_REQUIRED')
          }
        } else if (cleanLine === 'QUIT') {
          sock.buffer.push('BYE')
          sock.buffer.push(null)
        } else if (cleanLine.startsWith('MSG ')) {
          sock.buffer.push('MESSAGE RECEIVED ' + cleanLine.slice(4))
        } else {
          sock.buffer.push('ERROR INVALID_COMMAND')
        }
      } else if (sock.service === 'file') {
        if (cleanLine.startsWith('GET ')) {
          const filename = cleanLine.slice(4)
          const interrupted = filename === 'interrupted.txt'
          const content = interrupted ? VIRTUAL_DOCUMENTS['networks.txt'] : VIRTUAL_DOCUMENTS[filename]
          if (content === undefined) {
            sock.buffer.push('ERROR NOT_FOUND')
          } else {
            const header = { name: filename, bytes: content.length, sha256: sha256(content) }
            sock.buffer.push(JSON.stringify(header))
            const chunkSize = 256
            const limit = interrupted ? Math.floor(content.length / 2) : content.length
            for (let offset = 0; offset < limit; offset += chunkSize) {
              const chunk = content.slice(offset, Math.min(offset + chunkSize, limit))
              sock.buffer.push('DATA ' + btoa(chunk))
            }
            if (!interrupted) {
              sock.buffer.push('END')
            } else {
              sock.buffer.push(null)
            }
          }
        }
      } else if (sock.service === 'search') {
        if (cleanLine.startsWith('SEARCH ')) {
          const q = cleanLine.slice(7).toLowerCase()
          const matched = Object.keys(VIRTUAL_DOCUMENTS).filter(name => name.toLowerCase().includes(q)).sort()
          sock.buffer.push(JSON.stringify(matched))
        } else if (cleanLine.startsWith('GET ')) {
          const sel = cleanLine.slice(4)
          const content = VIRTUAL_DOCUMENTS[sel]
          if (content === undefined) {
            sock.buffer.push(JSON.stringify({ error: 'NOT_FOUND' }))
          } else {
            sock.buffer.push(JSON.stringify({ name: sel, content, sha256: sha256(content) }))
          }
        }
      }
    },
    read(id) {
      const sock = openSockets.get(id)
      const res = sock && sock.buffer.length > 0 ? sock.buffer.shift() : null
      events.push({ op: 'tcp.read', args: [id], response: res })
      return res
    },
    close(id) {
      events.push({ op: 'tcp.close', args: [id] })
      openSockets.delete(id)
    }
  }

  // Simulated UDP
  const udp = {
    exchange(updates) {
      const received = (updates || []).map(u => ({ player: u.player, x: u.x, y: u.y, seq: u.seq }))
      events.push({ op: 'udp.exchange', args: [updates], response: received })
      return received
    }
  }

  // Simulated HTTP
  const http = {
    request(path, method = 'GET') {
      let status = 404
      let body = JSON.stringify({ error: 'NOT_FOUND' })
      if (path === '/students/42') {
        status = 200
        body = JSON.stringify({ name: 'Asha Patil', rollNumber: 'CNT042', department: 'Computer Engineering', attendance: 91 })
      } else if (path === '/failure') {
        status = 503
        body = JSON.stringify({ error: 'SERVICE_UNAVAILABLE' })
      } else if (path === '/students/missing') {
        status = 404
        body = JSON.stringify({ error: 'NOT_FOUND' })
      }
      const res = { status, body, latencyMs: 12 }
      events.push({ op: 'http.request', args: [path, method], response: res })
      return res
    },
    probe(name) {
      let status = 200
      let error = null
      let latencyMs = 15
      if (name === 'slow') {
        latencyMs = 620
      } else if (name === 'database') {
        status = 0
        error = 'ECONNREFUSED'
      } else if (name === 'resolved') {
        status = 0
        error = 'ECONNREFUSED'
      } else if (['lab', 'file', 'web', 'portal'].includes(name)) {
        status = 200
      } else {
        status = 404
        error = 'NOT_FOUND'
      }
      const res = { status, latencyMs, error }
      events.push({ op: 'http.probe', args: [name], response: res })
      return res
    }
  }

  // Simulated DNS
  const dns = {
    lookup(name) {
      const address = name === 'working.lablink.edu' ? '127.0.0.1' : '127.0.0.99'
      const res = { address, name }
      events.push({ op: 'dns.lookup', args: [name], response: res })
      return res
    }
  }

  function save(name, content) {
    events.push({ op: 'save', args: [name] })
    savedFiles[name] = content
    log(`Result: ${JSON.stringify({ name, content, saved: true })}`)
  }

  function guestPrint(...args) {
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    log(text)
  }

  let studentResult = null
  let executionError = null

  try {
    // Construct execution sandbox
    const sandboxFn = new Function(
      'input', 'tcp', 'udp', 'http', 'dns', 'sha256', 'decodeBase64', 'save', 'print',
      `${studentCode}\n;if (typeof solve !== 'function') throw new Error('solve(input) function is not defined.');\nreturn solve(input);`
    )
    studentResult = sandboxFn(input, tcp, udp, http, dns, sha256, decodeBase64, save, guestPrint)
    if (studentResult !== undefined) {
      log(`Return: ${typeof studentResult === 'object' ? JSON.stringify(studentResult) : String(studentResult)}`)
    }
  } catch (err) {
    executionError = err.message || String(err)
    log(`Execution error: ${executionError}`)
  }

  // Evaluate result and network evidence
  const verdict = evaluateVerdict(type, input, { value: studentResult, error: executionError, network: events, files: savedFiles }, VIRTUAL_DOCUMENTS, config)

  const networkLog = events.map(e => {
    const argsStr = (e.args || []).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(', ')
    const respStr = e.response !== undefined ? ` → ${typeof e.response === 'object' ? JSON.stringify(e.response) : String(e.response)}` : ''
    return `[${e.op}] (${argsStr})${respStr}`
  }).join('\n')

  return {
    passed: verdict.passed,
    status: verdict.status,
    output: verdict.output,
    executionLog: outputs.join('\n'),
    networkLog,
    studentResult,
    savedFiles
  }
}

function evaluateVerdict(type, input, run, documents, configuration) {
  if (run.error) return { passed: false, status: 'ERROR', output: 'Runtime exception: ' + run.error }
  const value = run.value, events = run.network || []
  const seen = (op, pred = () => true) => events.some(e => e.op === op && pred(e))
  let passed = false

  if (type === 'tcp-chat') {
    if (input.service === 'offline') {
      passed = value?.error === true && seen('tcp.connect', e => e.args[0] === 'offline')
    } else {
      passed = value?.welcome === 'WELCOME ' + input.username &&
        deepEqual(value?.replies, (input.messages || []).map(m => 'MESSAGE RECEIVED ' + m)) &&
        value?.closed === true &&
        seen('tcp.connect', e => e.args[0] === 'chat') &&
        seen('tcp.send', e => e.args[1] === 'USER ' + input.username) &&
        (input.messages || []).every(m => seen('tcp.send', e => e.args[1] === 'MSG ' + m)) &&
        seen('tcp.read', e => e.response === 'BYE') &&
        seen('tcp.read', e => e.response === null) &&
        seen('tcp.close')
    }
  } else if (type === 'file-transfer') {
    const expected = documents[input.filename]
    const requested = seen('tcp.send', e => e.args[1] === 'GET ' + input.filename) && seen('tcp.connect', e => e.args[0] === 'file')
    if (expected === undefined) {
      passed = requested && value?.error === true &&
        seen('tcp.read', e => input.filename === 'interrupted.txt' ? e.response === null : e.response === 'ERROR NOT_FOUND')
    } else {
      passed = requested && value?.name === input.filename && value?.content === expected &&
        value?.sha256 === sha256(expected) && value?.saved === true && run.files[input.filename] === expected &&
        seen('tcp.read', e => e.response === 'END')
    }
  } else if (type === 'udp-telemetry') {
    const latest = {}
    for (const u of (input.updates || [])) {
      if (!latest[u.player] || latest[u.player].seq < u.seq) latest[u.player] = { x: u.x, y: u.y, seq: u.seq }
    }
    passed = seen('udp.exchange') &&
      Object.keys(latest).every(player => deepEqual(value?.positions?.[player], latest[player])) &&
      Object.keys(value?.positions || {}).length === Object.keys(latest).length
  } else if (type === 'http-api') {
    const event = events.find(e => e.op === 'http.request' && e.args[0] === input.path && e.args[1] === 'GET')
    if (event) {
      const response = event.response
      passed = response.status === 200 ? deepEqual(value, JSON.parse(response.body)) : value?.error === true && value.status === response.status
    }
  } else if (type === 'dns-troubleshooting') {
    const bad = events.find(e => e.op === 'dns.lookup' && e.args[0] === input.name)
    const good = events.find(e => e.op === 'dns.lookup' && e.args[0] === input.comparison)
    const probe = events.find(e => e.op === 'http.probe' && e.args[0] === 'resolved')
    const reachable = events.find(e => e.op === 'http.probe' && e.args[0] === 'portal')
    const lookup = !!bad?.response?.address && !!good?.response?.address &&
      bad.response.address !== good.response.address && String(value?.dnsInformation).includes(bad.response.address)
    const reach = probe?.response?.status === 0 && reachable?.response?.status === 200 &&
      String(value?.evidence || '').length >= 10 && String(value?.observations || '').length >= 10
    const diagnosis = /wrong|incorrect|misconfig|stale/i.test(value?.rootCause || '') &&
      /record|address|DNS/i.test(value?.rootCause || '') &&
      /correct|update|replace|change/i.test(value?.recommendedFix || '') &&
      String(value?.recommendedFix || '').includes(good?.response?.address || 'unavailable')
    passed = configuration.name?.includes('investigation') ? lookup : configuration.name?.includes('evidence') ? lookup && reach : lookup && reach && diagnosis
  } else if (type === 'network-monitor') {
    passed = Array.isArray(value?.servers) && value.servers.length === (input.servers || []).length &&
      (input.servers || []).every(name => {
        const event = events.find(e => e.op === 'http.probe' && e.args[0] === name)
        const item = value.servers.find(s => s.name === name)
        if (!event || !item) return false
        const online = event.response.status >= 200 && event.response.status < 300
        return item.status === (online ? 'ONLINE' : 'OFFLINE') && typeof item.latencyMs === 'number' &&
          (online || (typeof item.reason === 'string' && item.reason.length > 0))
      })
  } else if (type === 'file-search') {
    const expected = Object.keys(documents).filter(name => name.includes((input.query || '').toLowerCase())).sort()
    const searched = seen('tcp.connect', e => e.args[0] === 'search') && seen('tcp.send', e => e.args[1] === 'SEARCH ' + input.query)
    if (!expected.length) {
      passed = searched && deepEqual(value?.results, [])
    } else if (!expected.includes(input.select)) {
      passed = searched && value?.error === true && seen('tcp.send', e => e.args[1] === 'GET ' + input.select)
    } else {
      passed = searched && deepEqual([...(value?.results || [])].sort(), expected) && value?.name === input.select &&
        value?.content === documents[input.select] && value?.saved === true && run.files[input.select] === documents[input.select] &&
        seen('tcp.send', e => e.args[1] === 'GET ' + input.select)
    }
  }

  return {
    passed,
    status: passed ? 'PASSED' : 'FAILED',
    output: passed ? 'Expected behavior verified against actual network traffic.' : 'The returned result or recorded network behavior did not meet the assignment contract.'
  }
}

export async function runClientSimulation(assignment, code, onEvent) {
  const tests = assignment.testCases || []
  let cumulativeLog = ''
  let cumulativeNetwork = ''
  let totalScore = 0
  let maxScore = 0
  const testResults = []

  for (let idx = 0; idx < tests.length; idx++) {
    const t = tests[idx]
    maxScore += Number(t.weight || 0)

    if (onEvent) {
      onEvent({
        type: 'testStart',
        name: t.name,
        index: idx + 1,
        total: tests.length
      })
    }

    // Small delay to simulate realistic streaming and network latency
    await new Promise(r => setTimeout(r, 220))

    const res = executeStudentTest(t.type || assignment.slug, t, code)

    if (res.passed) {
      totalScore += Number(t.weight || 0)
    }

    if (res.executionLog) {
      cumulativeLog += (cumulativeLog ? '\n' : '') + `=== ${t.name} ===\n` + res.executionLog
    }
    if (res.networkLog) {
      cumulativeNetwork += (cumulativeNetwork ? '\n' : '') + `=== ${t.name} ===\n` + res.networkLog
    }

    const testItem = {
      testCaseId: t.id,
      testName: t.name,
      weight: t.weight,
      passed: res.passed,
      status: res.status,
      output: res.output
    }
    testResults.push(testItem)

    if (onEvent) {
      onEvent({
        type: 'testResult',
        testName: t.name,
        weight: t.weight,
        passed: res.passed,
        status: res.status,
        output: res.output,
        executionOutput: cumulativeLog,
        networkLog: cumulativeNetwork,
        runningScore: Math.round((totalScore / maxScore) * 100),
        currentScore: totalScore,
        maxScore
      })
    }
  }

  const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const finalStatus = testResults.every(r => r.passed) ? 'PASSED' : 'FAILED'

  const finalPayload = {
    type: 'complete',
    status: finalStatus,
    automatedScore: finalScore,
    testResults,
    executionOutput: cumulativeLog,
    networkLog: cumulativeNetwork
  }

  if (onEvent) {
    onEvent(finalPayload)
  }

  return finalPayload
}
