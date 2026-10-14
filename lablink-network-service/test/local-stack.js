// Verify already-running local services and retain evidence in the actual application database.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {parseEnv} from 'node:util'
import {randomBytes,randomUUID} from 'node:crypto'
import {spawn,spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {WebSocket} from 'ws'
import {solutions} from './solutions.js'

const root=new URL('../../',import.meta.url)
const env=async file=>parseEnv(await readFile(new URL(file,root),'utf8'))
const frontend=await env('lablink-frontend/.env'), backend=await env('lablink-backend/.env')
const base=frontend.VITE_API_BASE_URL, websocket=frontend.VITE_NETWORK_WS_URL
const origin=backend.CORS_ALLOWED_ORIGINS?.split(',')[0]
for(const address of [base,websocket,origin,backend.DATABASE_URL.replace(/^jdbc:/,'')]) {
  const url=new URL(address)
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Local verification requires loopback URLs')
}
const credentialsPath=new URL('lablink-backend/.env.local-accounts.json',root)
const credentials=JSON.parse(await readFile(credentialsPath,'utf8'))
assert.ok(credentials.admin?.email&&credentials.admin?.password,'Configure an ignored local admin credential file first')
const report={startedAt:new Date().toISOString(),api:base,frontend:origin,websocket,assignments:[],checks:[]}
function verifySql(evidence) {
  const database=new URL(backend.DATABASE_URL.replace(/^jdbc:/,''))
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(database.hostname),'SQL verification requires a local database')
  assert.match(evidence.studentId,/^[a-f0-9-]{36}$/)
  const query=`SELECT json_build_object('database',current_database(),
    'migrations',(SELECT count(*) FROM flyway_schema_history WHERE success),
    'bcryptOnly',(SELECT bool_and(password_hash LIKE '$2%') FROM users),
    'assignments',(SELECT count(*) FROM assignments),
    'submissions',(SELECT json_agg(json_build_object('id',s.id,'title',a.title,'score',s.automated_score,
      'grade',s.faculty_grade,'results',(SELECT count(*) FROM submission_test_results r WHERE r.submission_id=s.id),
      'events',jsonb_array_length(s.network_log::jsonb->'entries'),
      'reviews',(SELECT count(*) FROM faculty_reviews f WHERE f.submission_id=s.id)))
      FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE s.student_id='${evidence.studentId}'));`
  const result=spawnSync(process.platform==='win32'?'psql.exe':'psql',[
    '-X','-w','-h',database.hostname,'-p',database.port||'5432','-U',backend.DATABASE_USERNAME,
    '-d',database.pathname.slice(1),'-At','-v','ON_ERROR_STOP=1'],{
    input:query,encoding:'utf8',windowsHide:true,env:{...process.env,PGPASSWORD:backend.DATABASE_PASSWORD}})
  assert.equal(result.status,0,'Independent psql query failed; check local database and psql availability')
  const data=JSON.parse(result.stdout)
  assert.equal(data.assignments,7);assert.equal(data.bcryptOnly,true);assert.equal(data.migrations,5)
  assert.equal(data.submissions.length,7)
  data.submissions.sort((a,b)=>a.id.localeCompare(b.id))
  for(const submission of data.submissions){
    assert.equal(submission.score,100)
    assert.ok(submission.grade>=90&&submission.reviews===1&&submission.events>0&&submission.results>=3)
  }
  return data
}
async function api(path,token,body,method,expected) {
  const response=await fetch(base+path,{method:method || (body?'POST':'GET'),signal:AbortSignal.timeout(15000),
    headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})})
  if(expected)assert.equal(response.status,expected,path+' HTTP status')
  else assert.ok(response.ok,path+' HTTP '+response.status)
  return response.status===204?null:response.json()
}
async function login(account) {return (await api('/api/auth/login',null,account)).token}
async function execute(id,token,code,mode) {
  const ws=new WebSocket(websocket,{origin})
  try {return await new Promise((resolve,reject)=>{
    const finish=(error,value)=>{clearTimeout(timer);error?reject(error):resolve(value)}
    const timer=setTimeout(()=>finish(new Error('Assignment execution timed out')),90000)
    ws.on('open',()=>ws.send(JSON.stringify({type:'authenticate',sessionId:id,token})))
    ws.on('message',raw=>{
      const message=JSON.parse(raw.toString())
      if(message.status==='READY')ws.send(JSON.stringify({type:'execute',mode,code}))
      if(message.type==='complete')finish(null,message.attempt)
      if(message.type==='error')finish(new Error(message.message))
    })
    ws.on('error',error=>finish(error))
    ws.on('close',()=>finish(new Error('Gateway closed before completing execution')))
  })}finally{ws.terminate()}
}
const secret=()=>randomBytes(24).toString('hex')
const suffix=randomUUID().slice(0,8)
if(process.argv.includes('--persistence-only')) {
  const previous=JSON.parse(await readFile(new URL('../target/local-verification.json',import.meta.url),'utf8'))
  const baseline=JSON.parse(await readFile(new URL('../target/sql-verification.json',import.meta.url),'utf8'))
  baseline.submissions.sort((a,b)=>a.id.localeCompare(b.id))
  assert.deepEqual(verifySql(previous),baseline,'Stored SQL results must survive service/database restarts')
  for(const role of ['admin','faculty','student']) {
    const accessToken=await login(credentials[role])
    assert.equal((await api('/api/auth/me',accessToken)).role,role.toUpperCase())
    if(role==='student')for(const assignment of previous.assignments){
      const stored=await api('/api/submissions/'+assignment.submissionId,accessToken)
      assert.equal(stored.automatedScore,100);assert.equal(stored.facultyGrade,assignment.facultyGrade)
      assert.ok(stored.facultyFeedback?.length>0&&stored.reviews.length===1)
    }
  }
  await writeFile(new URL('../target/local-persistence.json',import.meta.url),JSON.stringify({
    verifiedAt:new Date().toISOString(),status:'PASS',studentId:previous.studentId,
    unchangedSubmissions:7,roles:['ADMIN','FACULTY','STUDENT'],independentSql:true},null,2)+'\n')
  console.log('PASS persistence after restart: three role logins, seven unchanged SQL submissions, scores, grades, feedback, results and network logs.')
  process.exit(0)
}
const admin=await login(credentials.admin)
const health=await api('/api/health')
assert.equal(health.database,'ONLINE')
assert.equal((await fetch(origin)).status,200)
const gatewayHealth=await (await fetch(new URL('/health',websocket.replace(/^ws/,'http')))).json()
assert.equal(gatewayHealth.status,'ONLINE')
assert.equal(Object.keys(gatewayHealth.services).length,7)
assert.ok(Object.values(gatewayHealth.services).every(status=>status==='ONLINE'))
report.services=gatewayHealth.services
report.checks.push('React HTTP, Spring Boot database query, seven protocol health checks')
const preflight=await fetch(base+'/api/sessions',{method:'OPTIONS',headers:{Origin:origin,
  'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}})
assert.equal(preflight.headers.get('access-control-allow-origin'),origin)
const facultyAccount={email:'local-faculty-'+suffix+'@lablink.local',password:secret()}
const studentAccount={email:'local-student-'+suffix+'@lablink.local',password:secret()}
const otherAccount={email:'local-other-'+suffix+'@lablink.local',password:secret()}
await api('/api/admin/faculty',admin,{...facultyAccount,name:'Local Verification Faculty'})
const studentUser=await api('/api/auth/register',null,{...studentAccount,name:'Local Verification Student'})
const otherUser=await api('/api/auth/register',null,{...otherAccount,name:'Ownership Verification',role:'ADMIN'})
assert.equal(otherUser.user.role,'STUDENT')
const faculty=await login(facultyAccount), student=await login(studentAccount), other=await login(otherAccount)
credentials.faculty=facultyAccount;credentials.student=studentAccount
await writeFile(credentialsPath,JSON.stringify(credentials,null,2)+'\n',{mode:0o600})
report.studentId=studentUser.user.id
await api('/api/auth/me',null,null,'GET',401)
await api('/api/auth/login',null,{email:studentAccount.email,password:'incorrect-password'},'POST',401)
await api('/api/admin/users',student,null,'GET',403)
await api('/api/faculty/submissions',student,null,'GET',403)
await api('/api/admin/users',faculty,null,'GET',403)
await api('/api/faculty/submissions',admin,null,'GET',403)
report.checks.push('Three role logins, invalid credentials, public role restriction, backend RBAC, CORS')
const catalog=await api('/api/assignments',student)
assert.equal(catalog.length,7)
const required={
  'tcp-chat':['tcp.connect','tcp.send','tcp.read','tcp.close'],
  'file-transfer':['tcp.connect','tcp.read','sha256','save'],
  'udp-telemetry':['udp.exchange'],'http-api':['http.request'],
  'dns-troubleshooting':['dns.lookup','http.probe'],'network-monitor':['http.probe'],
  'file-search':['tcp.connect','tcp.send','tcp.read','save'],
}
for(const [index,assignment] of catalog.entries()) {
  assert.equal(assignment.status,'ACTIVE')
  const attempt=await api('/api/sessions',student,{assignmentId:assignment.id})
  await api('/api/sessions/'+attempt.id,other,null,'GET',403)
  if(index===0){
    const failed=await execute(attempt.id,student,'function solve(){throw new Error("Verification failure")}', 'test')
    assert.equal(failed.automatedScore,0)
    assert.ok(failed.testResults.every(result=>result.status==='ERROR'))
    report.checks.push('Actual code errors produce ERROR outcomes and zero score')
  }
  const ran=await execute(attempt.id,student,solutions[assignment.assignmentType],'run')
  assert.equal(ran.automatedScore,null)
  await api('/api/sessions/'+attempt.id+'/submit',student,{},'POST',409)
  const evaluated=await execute(attempt.id,student,solutions[assignment.assignmentType],'test')
  assert.equal(evaluated.automatedScore,100,assignment.title+' evaluation')
  assert.ok(evaluated.testResults.length>0&&evaluated.testResults.every(result=>result.status==='PASSED'))
  const transcript=JSON.parse(evaluated.networkLog)
  const operations=[...new Set(transcript.entries.map(entry=>entry.op))]
  for(const operation of required[assignment.assignmentType])assert.ok(operations.includes(operation),assignment.title+' requires '+operation)
  const submission=await api('/api/sessions/'+attempt.id+'/submit',student,{})
  await api('/api/submissions/'+submission.id,other,null,'GET',403)
  const grade=90+index,feedback='Local end-to-end verification: '+assignment.title
  await api('/api/faculty/submissions/'+submission.id+'/review',faculty,{grade,feedback,status:'REVIEWED'},'PATCH')
  const stored=await api('/api/submissions/'+submission.id,student)
  assert.equal(stored.facultyGrade,grade)
  assert.equal(stored.facultyFeedback,feedback)
  assert.equal(stored.solution,solutions[assignment.assignmentType])
  assert.equal(stored.automatedScore,100)
  assert.equal(stored.testResults.length,evaluated.testResults.length)
  report.assignments.push({title:assignment.title,type:assignment.assignmentType,attemptId:attempt.id,
    submissionId:submission.id,tests:evaluated.testResults.length,automatedScore:stored.automatedScore,
    facultyGrade:stored.facultyGrade,operations,status:'PASS'})
  console.log('PASS '+assignment.title+': Run, Test, actual '+operations.join(', ')+', persisted submission, grade and feedback')
}
const denied=await api('/api/auth/me',other)
await api('/api/admin/users/'+denied.id+'/status',admin,{status:'SUSPENDED'},'PATCH')
await api('/api/auth/me',other,null,'GET',401)
await api('/api/admin/users/'+denied.id+'/status',admin,{status:'ACTIVE'},'PATCH')
const freshOther=await login(otherAccount)
await api('/api/auth/logout',freshOther,null,'POST',204)
await api('/api/auth/me',freshOther,null,'GET',401)
report.checks.push('Attempt/submission ownership, suspension, session revocation and logout')
if(process.env.LABLINK_UI_SMOKE==='1') {
  const ui=spawn(process.execPath,[fileURLToPath(new URL('lablink-frontend/test/ui-smoke.mjs',root))],{
    windowsHide:true,stdio:'inherit',env:{...process.env,UI_API_BASE_URL:base,UI_TEST_PASSWORD:secret(),
      UI_WS_URL:websocket,UI_FRONTEND_URL:origin,UI_REUSE_FRONTEND:'1',
      UI_ADMIN_EMAIL:credentials.admin.email,UI_ADMIN_PASSWORD:credentials.admin.password}})
  const status=await new Promise((resolve,reject)=>{ui.once('exit',resolve);ui.once('error',reject)})
  assert.equal(status,0,'Browser verification against the configured frontend')
  report.checks.push('Browser: seven assignments, file download, mobile layout, all role logins, admin management, faculty grading, student feedback')
}
report.finishedAt=new Date().toISOString();report.status='PASS'
await mkdir(new URL('../target/',import.meta.url),{recursive:true})
await writeFile(new URL('../target/sql-verification.json',import.meta.url),JSON.stringify(verifySql(report),null,2)+'\n')
report.checks.push('Independent PostgreSQL query: migrations, BCrypt hashes, seven submissions, grades, reviews, test results and network logs')
await writeFile(new URL('../target/local-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log('PASS local stack. Evidence: lablink-network-service/target/local-verification.json; credentials remain in ignored local files.')
