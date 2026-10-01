// Full stack check: real Spring Boot, PostgreSQL, WebSocket runner and all network services.
// Requires a disposable PostgreSQL database in TEST_DATABASE_URL (default local test cluster).
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {randomBytes,randomUUID} from 'node:crypto'
import {createWriteStream} from 'node:fs'
import net from 'node:net'
import {fileURLToPath} from 'node:url'
import {WebSocket} from 'ws'
import {createNetworkServer} from '../src/server.js'
import {solutions} from './solutions.js'

const vacant=net.createServer()
await new Promise(resolve=>vacant.listen(0,'127.0.0.1',resolve))
const port=vacant.address().port
await new Promise(resolve=>vacant.close(resolve))
const key=randomBytes(32).toString('hex'), password=randomBytes(16).toString('hex')
const schema='e2e_'+randomUUID().replaceAll('-','')
const backendPath=fileURLToPath(new URL('../../lablink-backend/',import.meta.url))
const output=createWriteStream(new URL('../../lablink-backend/target/e2e.log',import.meta.url))
const backend=spawn('java',['-jar','target/lablink-backend-0.1.0.jar','--spring.config.import=',
  '--spring.flyway.schemas='+schema,'--spring.jpa.properties.hibernate.default_schema='+schema],{
  cwd:backendPath,windowsHide:true,
  env:{...process.env,PORT:String(port),DATABASE_URL:process.env.TEST_DATABASE_URL || 'jdbc:postgresql://127.0.0.1:55432/lablink_test',
    DATABASE_USERNAME:process.env.TEST_DATABASE_USERNAME || 'lablink_test',DATABASE_PASSWORD:process.env.TEST_DATABASE_PASSWORD || '',
    JWT_SECRET:randomBytes(32).toString('hex'),GATEWAY_SHARED_SECRET:key,INITIAL_ADMIN_EMAIL:'admin@e2e.example',
    INITIAL_ADMIN_PASSWORD:password,FRONTEND_ORIGIN:'http://localhost:5173'}
})
backend.stdout.pipe(output);backend.stderr.pipe(output)
let gateway
const base='http://127.0.0.1:'+port
async function api(path,token,body,method) {
  const response=await fetch(base+path,{method:method || (body?'POST':'GET'),headers:{
    ...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})})
  const data=await response.json().catch(()=>({}))
  assert.ok(response.ok,path+': '+response.status+' '+JSON.stringify(data))
  return data
}
try {
  for(let i=0;i<100;i++){
    if(backend.exitCode!==null)throw new Error('Backend failed; inspect lablink-backend/target/e2e.log')
    try{await api('/api/health');break}catch(e){if(i===99)throw e;await new Promise(resolve=>setTimeout(resolve,500))}
  }
  gateway=await createNetworkServer({apiBaseUrl:base,gatewayKey:key,frontendOrigin:'http://localhost:5173'})
  await new Promise(resolve=>gateway.server.listen(0,'127.0.0.1',resolve))
  const login=await api('/api/auth/login',null,{email:'admin@e2e.example',password})
  const admin=login.token
  const professor=await api('/api/admin/faculty',admin,{name:'E2E Faculty',email:'faculty@e2e.example',password})
  assert.equal(professor.role,'FACULTY')
  const faculty=(await api('/api/auth/login',null,{email:'faculty@e2e.example',password})).token
  const student=(await api('/api/auth/register',null,{name:'E2E Student',email:'student@e2e.example',password})).token
  const catalog=await api('/api/assignments',student)
  assert.equal(catalog.length,7)
  for(const assignment of catalog){
    const attempt=await api('/api/sessions',student,{assignmentId:assignment.id})
    const ws=new WebSocket('ws://127.0.0.1:'+gateway.server.address().port+'/ws',{origin:'http://localhost:5173'})
    const completed=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Execution timed out for '+assignment.title)),90000)
      ws.on('open',()=>ws.send(JSON.stringify({type:'authenticate',token:student,sessionId:attempt.id})))
      ws.on('message',raw=>{
        const message=JSON.parse(raw.toString())
        if(message.status==='READY')ws.send(JSON.stringify({type:'execute',mode:'test',code:solutions[assignment.assignmentType]}))
        if(message.type==='complete'){clearTimeout(timer);resolve(message.attempt)}
        if(message.type==='error'){clearTimeout(timer);reject(new Error(message.message))}
      })
      ws.on('error',reject)
    })
    let tested
    try {tested=await completed}finally{ws.terminate()}
    assert.equal(tested.automatedScore,100,assignment.title+': '+JSON.stringify(tested.testResults))
    assert.equal(tested.status,'TESTED')
    assert.ok(tested.networkLog.length>10)
    const submission=await api('/api/sessions/'+attempt.id+'/submit',student,{},'POST')
    await api('/api/faculty/submissions/'+submission.id+'/review',faculty,{grade:94,feedback:'Verified by full stack integration',status:'REVIEWED'},'PATCH')
    const reviewed=await api('/api/submissions/'+submission.id,student)
    assert.equal(reviewed.grade,94);assert.equal(reviewed.reviews.length,1)
    console.log('PASS '+assignment.title+': real network, score 100, persisted submission and faculty grade')
  }
  const servers=await api('/api/admin/servers',admin)
  assert.equal(servers.length,7)
  assert.ok(servers.every(server=>server.port>0&&server.lastHeartbeat))
  console.log('PASS admin faculty creation, seven SQL assignments, service heartbeats and grading workflow')
}finally{
  if(gateway)await gateway.close()
  backend.kill()
  await new Promise(resolve=>{if(backend.exitCode!==null)resolve();else backend.once('exit',resolve)})
  output.end()
}
