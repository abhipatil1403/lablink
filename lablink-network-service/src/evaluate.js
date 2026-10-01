import { digest } from './services.js'
import { isDeepStrictEqual } from 'node:util'

/** Each verdict requires observed network I/O as well as the student's computed result. */
export function evaluate(type, input, run, documents, configuration = {}) {
  if (run.error) return {passed:false,output:run.error}
  const value = run.value, events = run.network || []
  const seen = (op, predicate = () => true) => events.some(e => e.op === op && predicate(e))
  const equal = isDeepStrictEqual
  let passed = false
  if (type === 'tcp-chat') {
    if (input.service === 'offline') passed = value?.error === true && seen('tcp.connect', e => e.args[0] === 'offline' && e.response?.error)
    else passed = value?.welcome === 'WELCOME ' + input.username &&
      equal(value?.replies,input.messages.map(message=>'MESSAGE RECEIVED '+message)) && value.closed === true &&
      seen('tcp.connect',e=>e.args[0]==='chat') && seen('tcp.send',e=>e.args[1]==='USER '+input.username) &&
      input.messages.every(message=>seen('tcp.send',e=>e.args[1]==='MSG '+message)) &&
      seen('tcp.read',e=>e.response==='BYE') && seen('tcp.read',e=>e.response===null) && seen('tcp.close')
  } else if (type === 'file-transfer') {
    const expected = documents[input.filename]
    const requested = seen('tcp.send',e=>e.args[1]==='GET '+input.filename) && seen('tcp.connect',e=>e.args[0]==='file')
    if (expected === undefined) passed = requested && value?.error === true &&
      seen('tcp.read',e=>input.filename==='interrupted.txt' ? e.response===null : e.response==='ERROR NOT_FOUND')
    else passed = requested && value?.name===input.filename && value.content===expected &&
      value.sha256===digest(expected) && value.saved===true && run.files[input.filename]===expected &&
      seen('tcp.read',e=>e.response==='END') && seen('sha256')
  } else if (type === 'udp-telemetry') {
    const latest={}
    for (const u of input.updates) if (!latest[u.player] || latest[u.player].seq<u.seq) latest[u.player]={x:u.x,y:u.y,seq:u.seq}
    passed = seen('udp.exchange',e=>equal(e.args[0],input.updates) && e.response.length>0) &&
      Object.keys(latest).every(player=>equal(value?.positions?.[player],latest[player])) &&
      Object.keys(value?.positions || {}).length===Object.keys(latest).length
  } else if (type === 'http-api') {
    const event=events.find(e=>e.op==='http.request' && e.args[0]===input.path && e.args[1]==='GET')
    if (event) {
      const response=event.response
      passed=response.status===200 ? equal(value,JSON.parse(response.body)) : value?.error===true && value.status===response.status
    }
  } else if (type === 'dns-troubleshooting') {
    const bad=events.find(e=>e.op==='dns.lookup' && e.args[0]===input.name)
    const good=events.find(e=>e.op==='dns.lookup' && e.args[0]===input.comparison)
    const probe=events.find(e=>e.op==='http.probe' && e.args[0]==='resolved')
    const reachable=events.find(e=>e.op==='http.probe' && e.args[0]==='portal')
    const lookup=!!bad?.response?.address && !!good?.response?.address &&
      bad.response.address!==good.response.address && String(value?.dnsInformation).includes(bad.response.address)
    const reach=probe?.response?.status===0 && reachable?.response?.status===200 &&
      String(value?.evidence).length>=10 && String(value?.observations).length>=10
    const diagnosis=/wrong|incorrect|misconfig|stale/i.test(value?.rootCause || '') &&
      /record|address|DNS/i.test(value?.rootCause || '') &&
      /correct|update|replace|change/i.test(value?.recommendedFix || '') &&
      String(value?.recommendedFix).includes(good?.response?.address || 'unavailable')
    passed = configuration.check==='lookup' ? lookup : configuration.check==='probe' ? lookup && reach : lookup && reach && diagnosis
  } else if (type === 'network-monitor') {
    passed = Array.isArray(value?.servers) && value.servers.length===input.servers.length &&
      input.servers.every(name=>{
        const event=events.find(e=>e.op==='http.probe' && e.args[0]===name)
        const item=value.servers.find(s=>s.name===name)
        if (!event || !item) return false
        const online=event.response.status>=200 && event.response.status<300
        return item.status===(online?'ONLINE':'OFFLINE') && typeof item.latencyMs==='number' &&
          Math.abs(item.latencyMs-event.response.latencyMs)<1 && (online || typeof item.reason==='string' && item.reason.length>0)
      })
  } else if (type === 'file-search') {
    const expected=Object.keys(documents).filter(name=>name.includes(input.query.toLowerCase())).sort()
    const searched=seen('tcp.connect',e=>e.args[0]==='search') && seen('tcp.send',e=>e.args[1]==='SEARCH '+input.query) &&
      seen('tcp.read',e=>typeof e.response==='string' && equal(JSON.parse(e.response),expected))
    if (!expected.length) passed=searched && equal(value?.results,[])
    else if (!expected.includes(input.select)) passed=searched && value?.error===true &&
      seen('tcp.send',e=>e.args[1]==='GET '+input.select)
    else passed=searched && equal([...value?.results || []].sort(),expected) && value.name===input.select &&
      value.content===documents[input.select] && value.saved===true && run.files[input.select]===documents[input.select] &&
      seen('tcp.send',e=>e.args[1]==='GET '+input.select)
  }
  return {passed,output:passed?'Expected behavior verified against actual network traffic.':'The returned result or recorded network behavior did not meet the assignment contract.'}
}
