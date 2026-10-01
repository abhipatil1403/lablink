import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {chromium,expect} from '@playwright/test'
import {solutions} from '../../lablink-network-service/test/solutions.js'

const base='http://localhost:5175',api=process.env.UI_API_BASE_URL,password=process.env.UI_TEST_PASSWORD
if(!api||!password)throw new Error('Run through npm run test:ui:full-stack from the network service')
const project=fileURLToPath(new URL('../',import.meta.url))
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','localhost','--port','5175','--strictPort'],{
  cwd:project,windowsHide:true,stdio:'ignore',env:{...process.env,VITE_API_BASE_URL:api,VITE_NETWORK_WS_URL:process.env.UI_WS_URL}})
let browser
const issues=[]
try {
  for(let i=0;i<80;i++){
    if(vite.exitCode!==null)throw new Error('Vite could not start on test port 5175')
    try{const response=await fetch(base);if(response.ok)break}catch{ /* Wait for the development server to listen. */ }
    if(i===79)throw new Error('Vite startup timed out')
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  browser=await chromium.launch({headless:true})
  const page=await browser.newPage({viewport:{width:1440,height:1000}})
  page.on('pageerror',error=>issues.push(error.message))
  const artifacts=project+'target/ui'
  await mkdir(artifacts,{recursive:true})
  const email='ui-'+Date.now()+'@test.example'
  await page.goto(base+'/register')
  await page.getByLabel('Full name').fill('UI Student')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password',{exact:true}).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button',{name:'Create account',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Welcome, UI'})).toBeVisible({timeout:15000})
  assert.equal(await page.locator('.experiment-card').count(),7)
  await page.screenshot({path:artifacts+'/student-dashboard.png',fullPage:true})
  await page.goto(base+'/admin')
  await expect(page.getByRole('heading',{name:'Welcome, UI'})).toBeVisible()
  const token=await page.evaluate(()=>sessionStorage.getItem('lablink-token'))
  const assignments=await (await page.request.get(api+'/api/assignments',{headers:{Authorization:'Bearer '+token}})).json()
  let firstSubmission
  for(const assignment of assignments){
    await page.goto(base+'/assignment/'+assignment.id)
    await page.getByRole('button',{name:'Start assignment',exact:true}).click()
    await expect(page.getByLabel('Solution code')).toBeVisible({timeout:15000})
    await page.getByLabel('Solution code').fill(solutions[assignment.assignmentType])
    await expect(page.getByRole('button',{name:'Test all',exact:true})).toBeEnabled({timeout:10000})
    await page.getByRole('button',{name:'Test all',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Automated evaluation · 100 / 100',exact:true})).toBeVisible({timeout:90000})
    if(!firstSubmission){
      await page.screenshot({path:artifacts+'/assignment-workspace.png',fullPage:true})
      await page.setViewportSize({width:390,height:844})
      await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0)
      await page.getByRole('button',{name:'Open navigation',exact:true}).click()
      await expect(page.locator('.sidebar')).toHaveClass('sidebar sidebar-open')
      await page.locator('.mobile-close').click()
      await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0)
      await page.screenshot({path:artifacts+'/assignment-mobile.png',fullPage:true})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile workspace must not overflow horizontally')
      await page.setViewportSize({width:1440,height:1000})
    }
    await expect(page.getByRole('button',{name:'Submit assignment',exact:true})).toBeEnabled()
    await page.getByRole('button',{name:'Submit assignment',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Faculty review',exact:true})).toBeVisible({timeout:10000})
    firstSubmission ||= page.url().split('/').at(-1)
    console.log('PASS browser editor, tests and submission: '+assignment.title)
  }
  async function logout(){await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible()}
  async function login(email){
    await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password)
    await page.getByRole('button',{name:'Log in',exact:true}).click()
  }
  await logout();await login('admin@e2e.example')
  await expect(page.getByRole('heading',{name:'System overview'})).toBeVisible({timeout:10000})
  await page.getByRole('link',{name:'Users',exact:true}).click()
  await page.getByRole('button',{name:'Create Faculty',exact:true}).click()
  const facultyEmail='ui-faculty-'+Date.now()+'@test.example'
  await page.getByLabel('Full name').fill('UI Faculty')
  await page.getByLabel('Email',{exact:true}).fill(facultyEmail)
  await page.getByLabel('Temporary password').fill(password)
  await page.getByRole('button',{name:'Create account',exact:true}).click()
  await expect(page.getByRole('cell',{name:facultyEmail,exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Servers',exact:true}).click()
  await page.getByRole('button',{name:'Disable',exact:true}).first().click()
  await expect(page.getByRole('button',{name:'Enable',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Enable',exact:true}).click()
  await expect(page.getByRole('button',{name:'Disable',exact:true})).toHaveCount(7)
  await page.getByRole('link',{name:'Audit history',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Audit history'})).toBeVisible()
  await logout();await login(facultyEmail)
  await expect(page.getByRole('heading',{name:'Laboratory overview'})).toBeVisible({timeout:10000})
  await page.goto(base+'/faculty/submissions/'+firstSubmission)
  await page.getByLabel('Grade out of 100').fill('96')
  await page.getByLabel('Feedback',{exact:true}).fill('Browser workflow verified')
  await page.getByRole('button',{name:'Save review',exact:true}).click()
  await expect(page.getByText('Review saved.',{exact:true})).toBeVisible()
  const httpAssignment=assignments.find(a=>a.assignmentType==='http-api')
  await page.goto(base+'/faculty/assignments/'+httpAssignment.id+'/edit')
  await page.getByRole('button',{name:'Add test case',exact:true}).click()
  await page.getByLabel('Test name').fill('Browser-created 404 test')
  await page.getByLabel('Test configuration JSON').fill(JSON.stringify({input:{path:'/students/missing'}}))
  await page.getByRole('button',{name:'Save test case',exact:true}).click()
  await expect(page.getByRole('cell',{name:'Browser-created 404 test',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Save assignment',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Manage assignments'})).toBeVisible()
  await logout();await login(email)
  await expect(page.getByRole('heading',{name:'Welcome, UI'})).toBeVisible({timeout:10000})
  await page.goto(base+'/student/submissions/'+firstSubmission)
  await expect(page.getByText('Browser workflow verified',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('Grade: 96 / 100',{exact:true})).toBeVisible()
  assert.deepEqual(issues,[],'No uncaught browser errors')
  console.log('PASS browser logout, role guards, faculty creation, service management, test editing, grading and student feedback')
}finally{
  await browser?.close()
  vite.kill()
  await new Promise(resolve=>{if(vite.exitCode!==null)resolve();else vite.once('exit',resolve)})
}
