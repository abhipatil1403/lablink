import assert from 'node:assert/strict'
import http from 'node:http'
import {before,after,test} from 'node:test'
import {WebSocket} from 'ws'
import {startServices} from '../src/services.js'
import {runSolution} from '../src/runner.js'
import {evaluate} from '../src/evaluate.js'
import {createNetworkServer} from '../src/server.js'
import {solutions} from './solutions.js'

const assignments=[{"type":"tcp-chat","cases":[{"name":"Handshake and message","weight":35,"input":{"service":"chat","username":"Ada","messages":["Hello"]}},{"name":"Multiple messages and disconnect","weight":40,"input":{"service":"chat","username":"Lin","messages":["first","second","third"]}},{"name":"Connection failure","weight":25,"input":{"service":"offline","username":"Test","messages":[]}}]},{"type":"file-transfer","cases":[{"name":"Complete small file","weight":30,"input":{"filename":"welcome.txt"}},{"name":"Stream reconstruction and integrity","weight":40,"input":{"filename":"networks.txt"}},{"name":"Missing file","weight":15,"input":{"filename":"missing.txt"}},{"name":"Interrupted transfer","weight":15,"input":{"filename":"interrupted.txt"}}]},{"type":"udp-telemetry","cases":[{"name":"Position exchange","weight":30,"input":{"updates":[{"player":"alice","x":2,"y":3,"seq":1}]}},{"name":"Multiple players","weight":30,"input":{"updates":[{"player":"alice","x":4,"y":5,"seq":2},{"player":"bob","x":7,"y":8,"seq":1}]}},{"name":"Out of order updates","weight":40,"input":{"updates":[{"player":"alice","x":8,"y":9,"seq":5},{"player":"alice","x":0,"y":0,"seq":2},{"player":"bob","x":3,"y":2,"seq":3}]}}]},{"type":"http-api","cases":[{"name":"Student record and JSON","weight":50,"input":{"path":"/students/42"}},{"name":"Not found","weight":25,"input":{"path":"/students/missing"}},{"name":"Service failure","weight":25,"input":{"path":"/failure"}}]},{"type":"dns-troubleshooting","cases":[{"name":"DNS investigation","weight":35,"input":{"name":"portal.lablink.edu","comparison":"working.lablink.edu"}},{"name":"Reachability evidence","weight":30,"input":{"name":"portal.lablink.edu","comparison":"working.lablink.edu"}},{"name":"Diagnosis and repair recommendation","weight":35,"input":{"name":"portal.lablink.edu","comparison":"working.lablink.edu"}}]},{"type":"network-monitor","cases":[{"name":"Online endpoints","weight":35,"input":{"servers":["lab","file","web"]}},{"name":"Unavailable database","weight":30,"input":{"servers":["lab","database"]}},{"name":"Timeout handling","weight":35,"input":{"servers":["slow","web"]}}]},{"type":"file-search","cases":[{"name":"Search and download","weight":50,"input":{"query":"network","select":"networks.txt"}},{"name":"No matching documents","weight":25,"input":{"query":"absent","select":null}},{"name":"Invalid selection","weight":25,"input":{"query":"welcome","select":"missing.txt"}}]}]
let suite
before(async()=>{suite=await startServices()})
after(async()=>{await suite.close()})
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
  const blocked=await runSolution('function solve(input){return tcp.connect("example.com")}',{},suite.endpoints)
  assert.match(blocked.error,/Unknown TCP service/)
})
test('infinite loops, excess memory, output and operation counts are constrained',async()=>{
  const loop=await runSolution('function solve(){while(true){}}',{},suite.endpoints,{deadlineMs:100,timeoutMs:3000})
  assert.match(loop.error,/interrupt|time limit/i)
  const memory=await runSolution('function solve(){return new Array(10000000).fill("x")}',{},suite.endpoints)
  assert.ok(memory.error)
  const operations=await runSolution('function solve(){for(let i=0;i<100;i++)sha256("x");return {}}',{},suite.endpoints)
  assert.match(operations.error,/operation limit/)
})
test('concurrent clients have isolated output and storage',async()=>{
  const [a,b]=await Promise.all(['A','B'].map(name=>runSolution('function solve(input){save("output.txt",input.name);return input}',{name},suite.endpoints)))
  assert.equal(a.files['output.txt'],'A');assert.equal(b.files['output.txt'],'B')
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
        response.end(JSON.stringify({id,status:'TESTED',testResults:JSON.parse(raw).results || []}))
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
    const denied=await connect();let pending=next(denied)
    denied.send(JSON.stringify({type:'authenticate',sessionId:id,token:'invalid'}))
    assert.equal((await pending).type,'error');denied.terminate();assert.equal(stored.length,0)
    const ws=await connect();pending=next(ws)
    ws.send(JSON.stringify({type:'authenticate',sessionId:id,token:'valid-token'}))
    assert.equal((await pending).status,'READY')
    const complete=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Execution timeout')),10000)
      ws.on('message',raw=>{const value=JSON.parse(raw.toString());if(value.type==='complete'){clearTimeout(timer);resolve(value)};if(value.type==='error'){clearTimeout(timer);reject(new Error(value.message))}})
    })
    ws.send(JSON.stringify({type:'execute',mode:'test',code:solutions['http-api']}))
    await complete
    assert.equal(stored.find(s=>s.path.endsWith('/complete')).body.results[0].passed,true)
    assert.match(stored.find(s=>s.path.endsWith('/complete')).body.networkLog,/http.request/)
    ws.terminate()
    await new Promise(resolve=>{
      const invalid=new WebSocket(url,{origin:'http://malicious.example'})
      invalid.on('unexpected-response',(_q,r)=>{assert.equal(r.statusCode,403);r.resume();invalid.terminate();resolve()})
      invalid.on('error',()=>{})
    })
  }finally{await gateway.close();await new Promise(resolve=>api.close(resolve))}
})
