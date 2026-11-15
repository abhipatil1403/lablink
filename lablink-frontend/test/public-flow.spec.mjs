import {test,expect} from '@playwright/test'

const assignment={id:'chat',title:'TCP Chat Client',assignmentType:'tcp-chat',protocol:'TCP',difficulty:'EASY',status:'ACTIVE',description:'Practice a TCP conversation.',networkingConcepts:['TCP'],requirements:['Use a real socket'],constraints:['Isolated execution'],instructions:['Write solve(input)'],testCases:[{id:'test',name:'Handshake',weight:100}],expectedBehavior:'Return the recorded replies.',starterCode:'function solve(input) { return {}; }',capabilityApi:'tcp.connect, tcp.send, tcp.read, tcp.close',objective:'Build a client.',serverRequirement:'Controlled chat service'}
const attempt={id:'attempt-fixture',assignment,assignmentTitle:assignment.title,attemptNumber:1,status:'STARTING',testResults:[],startedAt:'2026-01-01T00:00:00Z',solution:''}
const submission={id:'submission-fixture',assignmentId:'chat',assignmentTitle:assignment.title,status:'SUBMITTED',automatedScore:100,reviews:[],testResults:[],submittedAt:'2026-01-01T00:00:00Z'}
const headings={student:'Welcome, Test',faculty:'Laboratory overview',admin:'System overview'}

// These deterministic browser tests mock HTTP responses. Real authentication and
// authorization are covered separately by Spring Boot and the local browser smoke.
async function mockApi(page,{role='student',authenticated=false,loginRole=role,expired=false,failLogin=false}={}){
  const requests=[]
  if(authenticated)await page.addInitScript(()=>sessionStorage.setItem('lablink-token','browser-test-token'))
  let currentRole=role
  const profile=()=>({id:'user-fixture',name:'Test User',email:'test@example.test',status:'ACTIVE',role:currentRole.toUpperCase()})
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname
    requests.push({path,method:request.method(),body:request.postDataJSON()})
    const json=data=>route.fulfill({json:data})
    if(path==='/api/auth/login'){
      if(failLogin)return route.fulfill({status:401,json:{message:'Invalid email or password'}})
      currentRole=loginRole;return json({token:'browser-test-token',user:profile()})
    }
    if(path==='/api/auth/me')return expired?route.fulfill({status:401,json:{message:'Session expired'}}):json(profile())
    if(path==='/api/auth/logout')return route.fulfill({status:204})
    if(path==='/api/assignments')return json([assignment])
    if(path==='/api/assignments/chat')return json(assignment)
    if(path==='/api/sessions'&&request.method()==='POST')return json(attempt)
    if(path==='/api/sessions')return json([attempt])
    if(path==='/api/sessions/attempt-fixture')return json(attempt)
    if(path==='/api/submissions')return json([submission])
    if(path==='/api/submissions/submission-fixture')return json(submission)
    if(path==='/api/faculty/dashboard')return json({pendingSubmissions:[],recentSessions:[]})
    if(path==='/api/admin/dashboard')return json({systemStatus:{api:'ONLINE',database:'ONLINE',networkService:'ONLINE'}})
    return route.fulfill({status:404,json:{message:'Unexpected browser fixture request: '+path}})
  })
  await page.routeWebSocket('**/ws',ws=>ws.onMessage(raw=>{
    if(JSON.parse(raw).type==='authenticate')ws.send(JSON.stringify({type:'status',status:'READY'}))
  }))
  return requests
}

test('public homepage explains the lab, has all workspace destinations and supports keyboard/mobile use',async({page},testInfo)=>{
  const requests=await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading',{level:1})).toHaveText('Networking concepts.Real connections.')
  await expect(page.locator('.sidebar')).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'A lab you can learn by doing.'})).toBeVisible()
  await expect(page.locator('.public-feature-grid article')).toHaveCount(4)
  for(const role of ['Student','Faculty','Admin'])await expect(page.getByRole('link',{name:'Enter '+role+' workspace'})).toHaveAttribute('href','/login/'+role.toLowerCase())
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.locator('#main-content').evaluate(element=>element.blur())
  await page.screenshot({path:testInfo.outputPath('landing-desktop.png'),fullPage:true})
  for(const width of [768,390,320]){
    await page.setViewportSize({width,height:844})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
    for(const role of ['Student','Faculty','Admin'])await expect(page.getByRole('link',{name:'Enter '+role+' workspace'})).toBeVisible()
  }
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:testInfo.outputPath('landing-mobile.png'),fullPage:true})
  expect(requests).toHaveLength(0)
})

for(const role of ['student','faculty','admin']){
  const name=role[0].toUpperCase()+role.slice(1)
  test(name+' workspace card opens its labelled login and supports refresh and homepage return',async({page},testInfo)=>{
    await mockApi(page)
    await page.goto('/')
    await page.getByRole('link',{name:'Enter '+name+' workspace'}).click()
    await expect(page).toHaveURL('/login/'+role)
    await expect(page.getByRole('heading',{name:name+' login',exact:true})).toBeVisible()
    await expect(page.getByRole('navigation',{name:'Choose login workspace'}).getByRole('link',{name,exact:true})).toHaveAttribute('aria-current','page')
    if(role==='student')await expect(page.getByRole('link',{name:'Create student account'})).toBeVisible()
    else{
      await expect(page.getByRole('link',{name:'Create student account'})).toHaveCount(0)
      await expect(page.locator('.auth-account-note')).toContainText(role==='faculty'?'created by your LabLink administrator':'provisioned administrator')
    }
    await page.reload()
    await expect(page.getByRole('heading',{name:name+' login',exact:true})).toBeVisible()
    await page.setViewportSize({width:320,height:844})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
    await page.screenshot({path:testInfo.outputPath(role+'-login-mobile.png'),fullPage:true})
    await page.getByRole('link',{name:'Back to homepage'}).click()
    await expect(page).toHaveURL('/')
  })

  test(name+' dashboard is determined by the backend profile, even from another workspace login',async({page})=>{
    // Neither the selected workspace nor the query string can override /me.
    const requests=await mockApi(page,{loginRole:role})
    const selected=role==='student'?'admin':'student'
    await page.goto('/login/'+selected+'?role=ADMIN')
    await page.getByLabel('Email address').fill('test@example.test')
    await page.getByLabel('Password',{exact:true}).fill('BrowserTestPassword')
    await page.getByRole('button',{name:'Log in',exact:true}).click()
    await expect(page).toHaveURL('/'+role)
    await expect(page.getByRole('heading',{name:headings[role],exact:true})).toBeVisible()
    expect(requests.find(r=>r.path==='/api/auth/login').body).toEqual({email:'test@example.test',password:'BrowserTestPassword'})
    expect(requests.some(r=>r.path==='/api/auth/me')).toBe(true)
    await page.reload()
    await expect(page.getByRole('heading',{name:headings[role],exact:true})).toBeVisible()
    await page.goto('/')
    await expect(page.locator('.public-session').getByRole('link',{name:'Continue to Dashboard'})).toHaveAttribute('href','/'+role)
    await expect(page.locator('.workspace-card')).toHaveCount(3)
    await page.goto('/login/admin')
    await expect(page).toHaveURL('/'+role)
    await page.getByRole('button',{name:'Log out',exact:true}).click()
    await expect(page).toHaveURL('/login/'+role)
    expect(await page.evaluate(()=>sessionStorage.getItem('lablink-token'))).toBeNull()
  })

  test('unauthenticated '+name+' deep link uses the correct login flow',async({page})=>{
    await mockApi(page)
    await page.goto('/'+role+'/profile')
    await expect(page).toHaveURL('/login/'+role)
    await expect(page.locator('.sidebar')).toHaveCount(0)
  })
}

test('authenticated roles cannot render another role workspace or request its protected data',async({page})=>{
  const requests=await mockApi(page,{role:'student',authenticated:true})
  for(const path of ['/faculty','/faculty/submissions','/admin','/admin/users']){
    await page.goto(path)
    await expect(page).toHaveURL('/student')
    await expect(page.getByRole('heading',{name:'Welcome, Test'})).toBeVisible()
  }
  expect(requests.some(r=>/^\/api\/(faculty|admin)\//.test(r.path))).toBe(false)
})

test('Student catalog, assignment, editor, attempts, submissions and profile routes are preserved',async({page})=>{
  await mockApi(page,{authenticated:true})
  await page.goto('/student/assignments')
  await page.getByRole('link',{name:'View assignment',exact:true}).click()
  await expect(page).toHaveURL('/assignment/chat')
  await expect(page.getByRole('heading',{name:'TCP Chat Client',exact:true})).toBeVisible()
  await page.reload()
  await page.getByRole('button',{name:'Start assignment',exact:true}).click()
  await expect(page).toHaveURL('/attempt/attempt-fixture')
  await expect(page.getByLabel('Solution code')).toBeVisible()
  await expect(page.getByRole('button',{name:'Test all',exact:true})).toBeEnabled()
  await page.goto('/student/attempts')
  await expect(page.getByRole('link',{name:'TCP Chat Client'})).toHaveAttribute('href','/attempt/attempt-fixture')
  await page.goto('/student/submissions')
  await page.getByRole('link',{name:'TCP Chat Client'}).click()
  await expect(page.getByRole('heading',{name:'Faculty review',exact:true})).toBeVisible()
  await page.goto('/student/profile')
  await expect(page.getByRole('heading',{name:'My profile',exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Homepage',exact:true}).click()
  await expect(page).toHaveURL('/')
})

test('expired sessions return to login without a redirect loop',async({page})=>{
  await mockApi(page,{authenticated:true,expired:true})
  await page.goto('/admin')
  await expect(page).toHaveURL('/login/admin')
  await expect(page.getByRole('button',{name:'Log in',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>sessionStorage.getItem('lablink-token'))).toBeNull()
})

test('failed credentials stay on the selected login without granting access',async({page})=>{
  await mockApi(page,{failLogin:true})
  await page.goto('/login/admin')
  await page.getByLabel('Email address').fill('test@example.test')
  await page.getByLabel('Password',{exact:true}).fill('wrong-password')
  await page.getByRole('button',{name:'Log in',exact:true}).click()
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password')
  await expect(page).toHaveURL('/login/admin')
  expect(await page.evaluate(()=>sessionStorage.getItem('lablink-token'))).toBeNull()
})

test('shared login can switch workspaces and unknown URLs show a useful 404',async({page})=>{
  await mockApi(page)
  await page.goto('/login')
  await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible()
  await page.getByRole('navigation',{name:'Choose login workspace'}).getByRole('link',{name:'Faculty',exact:true}).click()
  await expect(page).toHaveURL('/login/faculty')
  for(const path of ['/missing-page','/login/owner','/login/constructor','/login/__proto__']){
    await page.goto(path)
    await expect(page.getByRole('heading',{name:'This page isn’t in the laboratory.'})).toBeVisible()
    await page.getByRole('link',{name:'Back to homepage'}).click()
    await expect(page).toHaveURL('/')
  }
})
