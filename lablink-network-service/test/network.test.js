import assert from 'node:assert/strict'
import http from 'node:http'
import {readdir,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {before,after,test} from 'node:test'
import {WebSocket} from 'ws'
import {startServices} from '../src/services.js'
import {runSolution} from '../src/runner.js'
import {evaluate} from '../src/evaluate.js'
import {createNetworkServer} from '../src/server.js'
import {probeServices} from '../src/health.js'
import {solutions} from './solutions.js'

const assignments=[{"type":"tcp-chat","cases":[{"name":"Handshake and message","weight":35,"input":{"service":"chat","username":"Ada","messages":["Hello"]}},{"name":"Multiple messages and disconnect","weight":40,"input":{"service":"chat","username":"Lin","messages":["first","second","third"]}},{"name":"Connection failure","weight":25,"input":{"service":"offline","username":"Test","messages":[]}}]},{"type":"file-transfer","cases":[{"name":"Complete small file","weight":30,"input":{"filename":"welcome.txt"}},{"name":"Stream reconstruction and integrity","weight":40,"input":{"filename":"networks.txt"}},{"name":"Missing file","weight":15,"input":{"filename":"missing.txt"}},{"name":"Interrupted transfer","weight":15,"input":{"filename":"interrupted.txt"}}]},{"type":"udp-telemetry","cases":[{"name":"Position exchange","weight":30,"input":{"updates":[{"player":"alice","x":2,"y":3,"seq":1}]}},{"name":"Multiple players","weight":30,"input":{"updates":[{"player":"alice","x":4,"y":5,"seq":2},{"player":"bob","x":7,"y":8,"seq":1}]}},{"name":"Out of order updates","weight":40,"input":{"updates":[{"player":"alice","x":8,"y":9,"seq":5},{"player":"alice","x":0,"y":0,"seq":2},{"player":"bob","x":3,"y":2,"seq":3}]}}]},{"type":"http-api","cases":[{"name":"Student record and JSON","weight":50,"input":{"path":"/students/42"}},{"name":"Not found","weight":25,"input":{"path":"/students/missing"}},{"name":"Service failure","weight":25,"input":{"path":"/failure"}}]},{"type":"dns-troubleshooting","cases":[{"name":"DNS investigation","weight":35,"input":{"name":"portal.lablink.edu","comparison":"working.lablink.edu"}},{"name":"Reachability evidence","weight":30,"input":{"name":"portal.lablink.edu","comparison":"working.lablink.edu"}},{"name":"Diagnosis and repair recommendation","weight":35,"input":{"name":"portal.lablink.edu","comparison":"working.lablink.edu"}}]},{"type":"network-monitor","cases":[{"name":"Online endpoints","weight":35,"input":{"servers":["lab","file","web"]}},{"name":"Unavailable database","weight":30,"input":{"servers":["lab","database"]}},{"name":"Timeout handling","weight":35,"input":{"servers":["slow","web"]}}]},{"type":"file-search","cases":[{"name":"Search and download","weight":50,"input":{"query":"network","select":"networks.txt"}},{"name":"No matching documents","weight":25,"input":{"query":"absent","select":null}},{"name":"Invalid selection","weight":25,"input":{"query":"welcome","select":"missing.txt"}}]}]
let suite
before(async()=>{suite=await startServices()})
after(async()=>{await suite.close()})
// Input verified against local SQL test 5f31b3c1-bc96-4cdc-bc06-3433d1158cbf.
const chatInput={service:'chat',username:'Lin',messages:['first','second','third']}
test('TCP Chat regression: the reported solution reads BYE but never observes EOF',async()=>{
  const source=await readFile(new URL('./fixtures/tcp-chat-reported.js',import.meta.url),'utf8')
  const run=await runSolution(source,chatInput,suite.endpoints)
  assert.equal(run.error,undefined)
  assert.deepEqual(run.value,{welcome:'WELCOME Lin',replies:chatInput.messages.map(m=>'MESSAGE RECEIVED '+m),closed:true})
  assert.deepEqual(run.network.map(({op,args,response})=>({op,args,response})),[
    {op:'tcp.connect',args:['chat'],response:1},
    {op:'tcp.send',args:[1,'USER Lin'],response:true},
    {op:'tcp.read',args:[1],response:'WELCOME Lin'},
    ...chatInput.messages.flatMap(m=>[
      {op:'tcp.send',args:[1,'MSG '+m],response:true},
      {op:'tcp.read',args:[1],response:'MESSAGE RECEIVED '+m}
    ]),
    {op:'tcp.send',args:[1,'QUIT'],response:true},
    {op:'tcp.read',args:[1],response:'BYE'},
    {op:'tcp.close',args:[1],response:true}
  ])
  assert.equal(evaluate('tcp-chat',chatInput,run,suite.documents).passed,false)
  const offline={service:'offline',username:'Test',messages:[]}
  const skipped=await runSolution(source,offline,suite.endpoints)
  assert.deepEqual(skipped.value,{error:true})
  assert.deepEqual(skipped.network,[])
  assert.equal(evaluate('tcp-chat',offline,skipped,suite.documents).passed,false)
})
test('TCP Chat regression: corrected solution observes EOF and attempts the offline service',async()=>{
  const source=await readFile(new URL('../examples/tcp-chat.js',import.meta.url),'utf8')
  const run=await runSolution(source,chatInput,suite.endpoints)
  assert.equal(run.error,undefined)
  assert.equal(evaluate('tcp-chat',chatInput,run,suite.documents).passed,true)
  assert.deepEqual(run.network.slice(-3).map(({op,response})=>({op,response})),[
    {op:'tcp.read',response:'BYE'},{op:'tcp.read',response:null},{op:'tcp.close',response:true}
  ])
  // The return value must never compensate for missing network evidence.
  for(const missing of [e=>e.op==='tcp.read'&&e.response==='BYE',e=>e.op==='tcp.read'&&e.response===null,e=>e.op==='tcp.close']){
    assert.equal(evaluate('tcp-chat',chatInput,{...run,network:run.network.filter(e=>!missing(e))},suite.documents).passed,false)
  }
  const offline={service:'offline',username:'Test',messages:[]}
  const refused=await runSolution(source,offline,suite.endpoints)
  assert.equal(refused.error,undefined)
  assert.deepEqual(refused.value,{error:true})
  assert.equal(refused.network.length,1)
  assert.deepEqual(refused.network[0].args,['offline'])
  assert.equal(refused.network[0].response.error,'ECONNREFUSED')
  assert.equal(evaluate('tcp-chat',offline,refused,suite.documents).passed,true)
})
test('protocol health checks distinguish live responses from unavailable or wrong services',async()=>{
  const healthy=await probeServices(suite.endpoints)
  assert.equal(Object.keys(healthy).length,7)
  assert.ok(Object.values(healthy).every(status=>status==='ONLINE'))
  const unavailable=Object.fromEntries(Object.keys(suite.endpoints).map(name=>[name,suite.endpoints.offline]))
  // A listening TCP port alone is insufficient: this is the wrong application protocol.
  unavailable.chat=suite.endpoints.search
  const failed=await probeServices(unavailable)
  assert.ok(Object.values(failed).every(status=>status==='OFFLINE'),JSON.stringify(failed))
})
for(const assignment of assignments) {
  test(assignment.type+' executes the student solution through real sockets',async()=>{
    for(const sample of assignment.cases) {
      const run=await runSolution(solutions[assignment.type],sample.input,suite.endpoints)
      const verdict=evaluate(assignment.type,sample.input,run,suite.documents)
      assert.equal(verdict.passed,true,sample.name+': '+JSON.stringify(run))
      assert.ok(run.network.length>0)
      const forged={...run,network:[]}
      assert.equal(evaluate(assignment.type,sample.input,forged,suite.documents).passed,false,'Must reject results without network evidence')
    }
  })
}
test('wrong solutions fail and the runtime exposes no host capabilities',async()=>{
  const run=await runSolution('function solve(input) { return {host:typeof process,fs:typeof require,fetch:typeof fetch}; }',{},suite.endpoints)
  assert.deepEqual(run.value,{host:'undefined',fs:'undefined',fetch:'undefined'})
  const bad=await runSolution('function solve(input) {return {}}',{path:'/students/42'},suite.endpoints)
  assert.equal(evaluate('http-api',{path:'/students/42'},bad,suite.documents).passed,false)
  assert.equal(evaluate('http-api',{path:'/students/42'},{error:'Expected execution failure'},suite.documents).status,'ERROR')
  const blocked=await runSolution('function solve(input){return tcp.connect("example.com")}',{},suite.endpoints)
  assert.match(blocked.error,/Unknown TCP service/)
  const path=await runSolution('function solve(){save("../escape.txt","x");return {}}',{},suite.endpoints)
  assert.match(path.error,/Invalid sandbox filename/)
})
test('infinite loops, excess memory, output and operation counts are constrained',async()=>{
  const loop=await runSolution('function solve(){while(true){}}',{},suite.endpoints,{deadlineMs:100,timeoutMs:3000})
  assert.match(loop.error,/interrupt|time limit/i)
  const memory=await runSolution('function solve(){return new Array(10000000).fill("x")}',{},suite.endpoints)
  assert.ok(memory.error)
  const operations=await runSolution('function solve(){for(let i=0;i<100;i++)sha256("x");return {}}',{},suite.endpoints)
  assert.match(operations.error,/operation limit/)
  const output=await runSolution('function solve(){print("x".repeat(17000));return {}}',{},suite.endpoints)
  assert.match(output.error,/Output limit/)
})

test('scratch directories are removed after success, guest errors and watchdog termination',async()=>{
  const before=new Set((await readdir(tmpdir())).filter(name=>name.startsWith('lablink-run-')))
  const success=await runSolution('function solve(){save("check.txt","success");return {ok:true}}',{},suite.endpoints)
  assert.equal(success.files['check.txt'],'success')
  const failed=await runSolution('function solve(){save("check.txt","failed");throw new Error("Expected failure")}',{},suite.endpoints)
  assert.match(failed.error,/Expected failure/)
  const timed=await runSolution('function solve(){save("check.txt","timeout");while(true){}}',{},suite.endpoints,{deadlineMs:15000,timeoutMs:4000})
  assert.match(timed.error,/time limit/)
  const remaining=(await readdir(tmpdir())).filter(name=>name.startsWith('lablink-run-')&&!before.has(name))
  assert.deepEqual(remaining,[],'Executions must not leave scratch directories behind')
})
test('concurrent clients have isolated output and storage',async()=>{
  const [a,b]=await Promise.all(['A','B'].map(name=>runSolution('function solve(input){save("output.txt",input.name);return input}',{name},suite.endpoints)))
  assert.equal(a.files['output.txt'],'A');assert.equal(b.files['output.txt'],'B')
})

test('prototype property filenames cannot crash services or bypass the saved-file limit',async()=>{
  for(const service of ['file','search'])for(const name of ['__proto__','constructor','toString']){
    const run=await runSolution('function solve(input){const id=tcp.connect(input.service);tcp.send(id,"GET "+input.name);const reply=tcp.read(id);tcp.close(id);return {reply}}',{service,name},suite.endpoints)
    assert.equal(run.error,undefined)
    if(service==='file')assert.equal(run.value.reply,'ERROR NOT_FOUND')
    else assert.deepEqual(JSON.parse(run.value.reply),{error:'NOT_FOUND'})
  }
  const invalid=await runSolution('function solve(){save("__proto__","blocked");return {}}',{},suite.endpoints)
  assert.match(invalid.error,/Invalid sandbox filename/)
  const stored=await runSolution('function solve(){save("constructor","safe");for(let i=0;i<4;i++)save("file"+i,"x");try{save("extra","x");return {limited:false}}catch{return {limited:true}}}',{},suite.endpoints)
  assert.equal(stored.error,undefined)
  assert.equal(stored.files.constructor,'safe')
  assert.equal(Object.keys(stored.files).length,5)
  assert.equal(stored.value.limited,true)
})

test('WebSocket gateway authenticates before execution and stores computed results',async()=>{
  const id='00000000-0000-4000-8000-000000000001', key='gateway-test-secret-at-least-thirty-two-characters'
  const stored=[]
  const api=http.createServer((request,response)=>{
    if(request.headers.authorization!=='Bearer valid-token' || request.headers['x-lablink-gateway-key']!==key){
      response.writeHead(401,{'Content-Type':'application/json'}).end('{"message":"Unauthorized"}');return
    }
    if(request.method==='POST'){
      let raw='';request.on('data',c=>raw+=c);request.on('end',()=>{
        stored.push({path:request.url,body:JSON.parse(raw)})
        response.setHeader('Content-Type','application/json')
        response.end(JSON.stringify({id,status:'TESTED',testResults:JSON.parse(raw).results || [],
          evaluationTests:[{id:'test-1',type:'http-api',configuration:{input:{path:'/students/42'}}}]}))
      })
    }else{
      response.setHeader('Content-Type','application/json')
      response.end(JSON.stringify({id,evaluationTests:[{id:'test-1',type:'http-api',configuration:{input:{path:'/students/42'}}}]}))
    }
  })
  await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve))
  const gateway=await createNetworkServer({apiBaseUrl:'http://127.0.0.1:'+api.address().port,gatewayKey:key,frontendOrigin:'http://localhost:5173'})
  await new Promise(resolve=>gateway.server.listen(0,'127.0.0.1',resolve))
  const url='ws://127.0.0.1:'+gateway.server.address().port+'/ws'
  const connect=()=>new Promise((resolve,reject)=>{
    const ws=new WebSocket(url,{origin:'http://localhost:5173'});ws.once('open',()=>resolve(ws));ws.once('error',reject)
  })
  const next=ws=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('WebSocket message timeout')),10000)
    ws.once('message',raw=>{clearTimeout(timer);resolve(JSON.parse(raw.toString()))})
  })
  try {
    const healthResponse=await fetch('http://127.0.0.1:'+gateway.server.address().port+'/health')
    assert.equal(healthResponse.status,200)
    const health=await healthResponse.json()
    assert.equal(health.status,'ONLINE')
    assert.equal(Object.keys(health.services).length,7)
    assert.ok(Object.values(health.services).every(status=>status==='ONLINE'))
    for(const sessionId of [{toString:null,valueOf:null},[id],null,42]) {
      const malformed=await connect()
      const closed=new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{malformed.terminate();reject(new Error('Malformed authentication was not closed'))},5000)
        malformed.once('close',code=>{clearTimeout(timer);resolve(code)})
      })
      malformed.send(JSON.stringify({type:'authenticate',sessionId,token:'valid-token'}))
      assert.equal(await closed,1008)
    }
    const denied=await connect();let pending=next(denied)
    denied.send('null')
    assert.equal((await pending).message,'Invalid message')
    pending=next(denied)
    denied.send('[]')
    assert.equal((await pending).message,'Invalid message')
    pending=next(denied)
    denied.send(JSON.stringify({type:'authenticate',sessionId:id,token:'invalid'}))
    assert.equal((await pending).type,'error');denied.terminate();assert.equal(stored.length,0)
    const ws=await connect();pending=next(ws)
    ws.send(JSON.stringify({type:'authenticate',sessionId:id,token:'valid-token'}))
    assert.equal((await pending).status,'READY')
    let duplicateRejected=false
    const complete=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Execution timeout')),10000)
      ws.on('message',raw=>{const value=JSON.parse(raw.toString());if(value.type==='complete'){clearTimeout(timer);resolve(value)};if(value.type==='error'){
        if(value.message.startsWith('An execution is running'))duplicateRejected=true
        else {clearTimeout(timer);reject(new Error(value.message))}
      }})
    })
    ws.send(JSON.stringify({type:'execute',mode:'test',code:solutions['http-api']}))
    ws.send(JSON.stringify({type:'execute',mode:'test',code:solutions['http-api']}))
    await complete
    assert.equal(duplicateRejected,true)
    assert.equal(stored.filter(s=>s.path.endsWith('/begin')).length,1)
    assert.equal(stored.filter(s=>s.path.endsWith('/complete')).length,1)
    assert.equal(stored.find(s=>s.path.endsWith('/complete')).body.results[0].passed,true)
    assert.match(stored.find(s=>s.path.endsWith('/complete')).body.networkLog,/http.request/)
    ws.terminate()
    await new Promise(resolve=>{
      const invalid=new WebSocket(url,{origin:'http://malicious.example'})
      invalid.on('unexpected-response',(_q,r)=>{assert.equal(r.statusCode,403);r.resume();invalid.terminate();resolve()})
      invalid.on('error',()=>{})
    })
    gateway.suite.endpoints.http=gateway.suite.endpoints.offline
    await new Promise(resolve=>setTimeout(resolve,5100))
    const degradedResponse=await fetch('http://127.0.0.1:'+gateway.server.address().port+'/health')
    assert.equal(degradedResponse.status,503)
    const degraded=await degradedResponse.json()
    assert.equal(degraded.status,'DEGRADED')
    assert.equal(degraded.services.http,'OFFLINE')
    assert.equal(degraded.services.monitor,'OFFLINE')
    assert.equal(degraded.services.chat,'ONLINE')
  }finally{await gateway.close();await new Promise(resolve=>api.close(resolve))}
})
