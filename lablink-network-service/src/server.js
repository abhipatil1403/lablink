import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'
import { startServices } from './services.js'
import { runSolution } from './runner.js'
import { evaluate } from './evaluate.js'

export async function createNetworkServer({apiBaseUrl,gatewayKey,frontendOrigin}) {
  if (!gatewayKey || gatewayKey.length<32) throw new Error('GATEWAY_SHARED_SECRET requires at least 32 characters')
  const suite=await startServices()
  const origins=frontendOrigin.split(',').map(s=>s.trim())
  const busyAttempts=new Set()
  async function heartbeat() {
    await fetch(apiBaseUrl+'/api/internal/services/heartbeat',{
      method:'POST',signal:AbortSignal.timeout(5000),
      headers:{'Content-Type':'application/json','X-LabLink-Gateway-Key':gatewayKey},
      body:JSON.stringify({endpoints:suite.endpoints})
    }).catch(()=>{})
  }
  await heartbeat()
  const heartbeatTimer=setInterval(heartbeat,30000)
  heartbeatTimer.unref()
  const server=http.createServer((request,response)=>{
    if (request.url==='/health') {
      response.writeHead(200,{'Content-Type':'application/json'})
      response.end(JSON.stringify({status:'ONLINE',services:Object.keys(suite.endpoints).filter(s=>s!=='offline'),activeRuns:busyAttempts.size}))
    } else response.writeHead(404).end()
  })
  const wss=new WebSocketServer({noServer:true,maxPayload:40000})
  server.on('upgrade',(request,socket,head)=>{
    if (request.url!=='/ws' || !origins.includes(request.headers.origin) || wss.clients.size>=100) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return
    }
    wss.handleUpgrade(request,socket,head,client=>wss.emit('connection',client))
  })
  wss.on('connection',ws=>{
    let token,id,ready=false,busy=false
    const send=value=>{if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(value))}
    const timer=setTimeout(()=>ws.close(1008,'Authentication timeout'),10000)
    async function api(suffix,body) {
      const response=await fetch(apiBaseUrl+'/api/internal/sessions/'+id+'/'+suffix,{
        method:body?'POST':'GET',signal:AbortSignal.timeout(5000),
        headers:{Authorization:'Bearer '+token,'X-LabLink-Gateway-Key':gatewayKey,...(body?{'Content-Type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{})
      })
      const data=await response.json().catch(()=>({}))
      if (!response.ok) throw new Error(data.message || 'Backend unavailable ('+response.status+')')
      return data
    }
    ws.on('message',async raw=>{
      let message
      try {message=JSON.parse(raw.toString())} catch {send({type:'error',message:'Invalid message'});return}
      if (!ready) {
        if (message.type!=='authenticate' || typeof message.token!=='string' || message.token.length>4096 ||
            !/^[a-f0-9-]{36}$/i.test(message.sessionId)) {ws.close(1008,'Invalid authentication');return}
        token=message.token;id=message.sessionId;clearTimeout(timer)
        try {await api('validate');ready=true;send({type:'status',status:'READY'})}
        catch(error) {send({type:'error',message:error.message});ws.close(1008,'Authentication failed')}
        return
      }
      if (message.type!=='execute' || !['run','test'].includes(message.mode) || typeof message.code!=='string' ||
          !message.code.trim() || message.code.length>32768) {send({type:'error',message:'Invalid execution request'});return}
      if (busy || busyAttempts.has(id) || busyAttempts.size>=4) {send({type:'error',message:'An execution is running; try again shortly'});return}
      busy=true;busyAttempts.add(id)
      try {
        const assignment=await api('validate')
        const tests=assignment.evaluationTests
        if (!tests?.length) throw new Error('No enabled assignment tests')
        await api('begin',{solution:message.code})
        send({type:'status',status:'RUNNING'})
        const selected=message.mode==='test'?tests:tests.slice(0,1)
        const reports=[],network=[],output=[]
        for (const test of selected) {
          const run=await runSolution(message.code,test.configuration.input,suite.endpoints)
          const verdict=evaluate(test.type,test.configuration.input,run,suite.documents,test.configuration)
          reports.push({testCaseId:test.id,...verdict})
          network.push(...run.network.map(entry=>({...entry,testCaseId:test.id})))
          output.push('Test '+test.id+'\n'+(run.output || '')+'\nResult: '+JSON.stringify(run.value || {})+'\n'+verdict.output)
          send({type:'testResult',testCaseId:test.id,...verdict})
        }
        // PostgreSQL owns the score, using the current stored weights.
        const completed=await api('complete',{mode:message.mode,output:output.join('\n\n').slice(0,65000),
          networkLog:JSON.stringify(network).slice(0,130000),results:message.mode==='test'?reports:[]})
        send({type:'complete',attempt:completed})
      } catch(error) {
        await api('failure',{message:error.message.slice(0,2000)}).catch(()=>{})
        send({type:'error',message:error.message})
      } finally {busy=false;busyAttempts.delete(id)}
    })
    ws.on('close',()=>clearTimeout(timer))
    ws.on('error',()=>{})
  })
  return {server,wss,suite,async close(){
    clearInterval(heartbeatTimer)
    for(const client of wss.clients) client.terminate()
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections()})
    wss.close();await suite.close()
  }}
}

if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  try {process.loadEnvFile()} catch(error) {if(error.code!=='ENOENT') throw error}
  const gateway=await createNetworkServer({
    apiBaseUrl:process.env.API_BASE_URL || 'http://localhost:8080',
    gatewayKey:process.env.GATEWAY_SHARED_SECRET,
    frontendOrigin:process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  })
  gateway.server.listen(Number(process.env.PORT || process.env.WS_PORT || 3001),'0.0.0.0',()=>console.log('LabLink network gateway and seven assignment services ready'))
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>gateway.close().then(()=>process.exit(0)))
}
