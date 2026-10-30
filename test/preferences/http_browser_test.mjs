// Real Nuxt HTTP/Chromium transport checks; SQL/destructive behavior has separate real PG tests.
import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
let checks=0,admin=true,schemaMissing=false,stale=false,version=0,resetCount=0
let settings={locale:'en-GH',timeZone:'Africa/Accra',dateStyle:'medium',timeFormat:'24h',moneyDecimals:2,useGrouping:true,paperSize:'A4',orientation:'portrait'}
const tables=[{table:'core_system_numbers',module:'Configuration'},{table:'gl_journal_batches',module:'Ledger transactions and cash'},{table:'gl_journal_lines',module:'Ledger transactions and cash'},{table:'gl_account_balances',module:'Ledger transactions and cash'}]
let events=[],plans=new Map(),counter=0
const seen=[],check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const body=raw?JSON.parse(raw):null,path=new URL(req.url,'http://fixture').pathname
 seen.push({path,method:req.method,body,token:req.headers.authorization})
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',requiresTwoFactorAuth:false,expiresIn:3600})
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:'20000000-0000-4000-8000-000000000001',username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 if(!path.startsWith('/api/v1/preferences'))return send(404,null)
 if(schemaMissing)return send(503,null,{code:'schema_not_ready',message:'PRIVATE SQL'})
 if(req.method==='GET'&&path==='/api/v1/preferences')return send(200,{settings,version,canManage:admin,accountId:'acme',tables:admin?tables:[]})
 if(!admin)return send(403,null,{code:'forbidden'})
 if(path.endsWith('/history'))return send(200,{items:events})
 if(path==='/api/v1/preferences'&&req.method==='PUT'){
  if(Object.keys(body).some(k=>!['settings','version'].includes(k)))return send(400,null,{code:'validation_error'})
  if(body.version!==version)return send(409,null,{code:'conflict'})
  settings={...body.settings};version++;return send(200,{settings,version})
 }
 if(path.endsWith('/preview')){
  if(Object.keys(body).some(k=>!['scope','tables'].includes(k)))return send(400,null,{code:'validation_error'})
  if(body.tables.includes('users')||body.tables.includes('core_company_profiles'))return send(409,{blocked:['Preserved table cannot be selected.']},{code:'conflict',message:'PRIVATE SQL'})
  let included=body.scope==='all'?tables:tables.filter(t=>body.tables.includes(t.table))
  if(body.scope!=='all'&&included.some(t=>t.table.startsWith('gl_')))included=tables.filter(t=>t.table.startsWith('gl_'))
  const plan={planId:`90000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`,expiresAt:new Date(Date.now()+300000).toISOString(),confirmation:'RESET acme',items:included.map(t=>({...t,rows:4})),allTenant:body.scope==='all'};plans.set(plan.planId,plan);return send(200,plan)
 }
 if(path.endsWith('/execute')){
  if(body.password!=='current-password')return send(401,null,{code:'reauthentication_failed'})
  const plan=plans.get(body.planId)
  if(!plan||stale){stale=false;return send(409,null,{code:'conflict'})}
  if(body.confirmation!=='RESET acme'||!body.reason.trim())return send(400,null,{code:'validation_error'})
  plans.delete(body.planId);resetCount++;events=[{id:String(resetCount),status:'completed',reason:body.reason,details:{items:plan.items},createdAt:new Date().toISOString(),actorFullName:'Ada Mensah',actorEmail:'ada@example.test'},...events]
  return send(200,{deletedRows:plan.items.reduce((n,t)=>n+t.rows,0),planId:body.planId})
 }
 send(404,null)
})
await new Promise(r=>upstream.listen(0,'0.0.0.0',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='',origin=base){const response=await fetch(base+path,{method,headers:{origin,cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()}}
try{
 let r=await call('/api/preferences');check(r.response.status===401,'preferences require a validated session')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'admin',password:'test-only'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/preferences','GET',undefined,cookie);check(r.response.status===200&&r.body.accountId==='acme'&&r.response.headers.get('cache-control')==='no-store','tenant preferences proxy is authenticated and not cached')
 r=await call('/api/preferences','PUT',{version,settings},cookie,'https://attacker.example');check(r.response.status===403,'preference writes enforce same-origin protection')
 r=await call('/api/preferences/reset/preview','POST',{scope:'all',tables:[]},cookie,'https://attacker.example');check(r.response.status===403,'reset preview enforces same origin')
 r=await call('/api/preferences/reset/execute','POST',{},cookie,'https://attacker.example');check(r.response.status===403,'destructive endpoint enforces same origin')
 schemaMissing=true;r=await call('/api/preferences','GET',undefined,cookie);check(r.response.status===503&&r.body.statusMessage.includes('015_tenant_preferences.sql')&&!JSON.stringify(r.body).includes('PRIVATE'),'missing migration produces actionable sanitized error');schemaMissing=false
 r=await call('/api/preferences/reset/preview','POST',{scope:'selected',tables:['core_company_profiles']},cookie);check(r.response.status===409&&r.body.data.blocked[0].includes('Preserved')&&!JSON.stringify(r.body).includes('PRIVATE'),'safe dependency blocker messages survive proxy sanitization')
 admin=false;r=await call('/api/preferences/reset/preview','POST',{scope:'all',tables:[]},cookie);check(r.response.status===403,'non-admin reset blocked by backend');admin=true
 const require=createRequire((process.env.JOURNAL_BROWSER_DEPS||'/tmp/journal-browser')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true})
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base+'/preferences');await page.getByRole('heading',{name:'Operating and display defaults',exact:true}).waitFor()
  check(await page.getByRole('link',{name:'Preferences',exact:true}).count()>0,'Preferences is linked from application setup navigation')
  await page.getByLabel('Display locale',{exact:true}).selectOption('fr-FR');await page.getByLabel('Currency display decimals',{exact:false}).selectOption('3');await page.getByLabel('Print orientation',{exact:true}).selectOption('landscape');await page.getByRole('button',{name:'Save preferences',exact:true}).click();await page.getByText('Tenant preferences saved. Shared formatters and print defaults now use these settings.',{exact:true}).waitFor()
  check(settings.locale==='fr-FR'&&settings.moneyDecimals===3&&settings.orientation==='landscape'&&version===1,'preferences persist through real Nuxt proxy')
  check(await page.locator('head').evaluate(el=>el.textContent.includes('A4 landscape')),'saved print defaults are consumed by application print stylesheet')
  await page.getByRole('button',{name:'Reload preferences',exact:true}).click();await page.getByRole('button',{name:'Save preferences',exact:true}).waitFor({state:'visible'});check(await page.getByLabel('Display locale',{exact:true}).inputValue()==='fr-FR','saved settings reload rather than resetting to defaults')
  check(await page.getByRole('button',{name:'Preview initialization',exact:true}).isDisabled(),'preview requires an explicit selection')
  await page.getByLabel('gl_journal_lines',{exact:true}).check();await page.getByRole('button',{name:'Preview initialization',exact:true}).click();await page.getByRole('heading',{name:'Reset preview · 12 records across 3 tables',exact:true}).waitFor();check(await page.getByText('Added dependency',{exact:true}).count()===2,'expanded dependencies are visible before destructive confirmation')
  const execute=page.getByRole('button',{name:'Permanently initialize selected data',exact:true});check(await execute.isDisabled(),'reset disabled without password, reason and exact tenant confirmation')
  await page.getByLabel('Reason',{exact:true}).fill('Clear training journals');await page.getByLabel('Typed confirmation',{exact:false}).fill('RESET other');await page.getByLabel('Current administrator password',{exact:false}).fill('current-password');check(await execute.isDisabled(),'wrong tenant confirmation keeps reset disabled')
  await page.getByLabel('Typed confirmation',{exact:false}).fill('RESET acme');await page.getByLabel('Current administrator password',{exact:false}).fill('wrong-password');await execute.click();await page.getByText('Current password is incorrect. No data was changed.',{exact:true}).waitFor();check(resetCount===0&&await page.getByLabel('Current administrator password',{exact:false}).inputValue()==='','wrong password leaves data intact and clears password field')
  await page.getByLabel('Current administrator password',{exact:false}).fill('current-password');stale=true;await execute.click();await page.getByText('The preview is blocked, expired, already used or out of date. Review dependencies and preview again.',{exact:true}).waitFor();check(resetCount===0,'stale preview is rejected without resetting')
  await page.getByRole('button',{name:'Preview initialization',exact:true}).click();await page.getByRole('heading',{name:'Reset preview · 12 records across 3 tables',exact:true}).waitFor();await page.getByLabel('Typed confirmation',{exact:false}).fill('RESET acme');await page.getByLabel('Current administrator password',{exact:false}).fill('current-password');await execute.click();await page.getByText('Cleared 12 business records. Company profile, users, security, preferences and reset history were retained.',{exact:true}).waitFor();check(resetCount===1,'confirmed reset completes once through proxy')
  await page.getByText('Ada Mensah · ada@example.test',{exact:true}).waitFor();check(await page.getByText('Clear training journals',{exact:true}).count()===1,'reset audit shows actor and reason without password')
  await page.getByLabel('Entire tenant business database (preserved data excluded)',{exact:true}).check();await page.getByRole('button',{name:'Preview initialization',exact:true}).click();await page.getByRole('heading',{name:'Reset preview · 16 records across 4 tables',exact:true}).waitFor();check(await execute.isDisabled(),'whole-tenant preview still requires fresh confirmation and password')
  await page.getByRole('button',{name:'Cancel preview',exact:true}).click();check(await execute.count()===0,'preview can be cancelled without mutation')
  await page.setViewportSize({width:375,height:850});await page.waitForFunction(()=>{const e=document.querySelector('main select');return e&&e.getBoundingClientRect().right<=innerWidth});check(await page.getByLabel('Time zone',{exact:false}).evaluate(el=>el.getBoundingClientRect().right<=innerWidth),'preferences controls fit mobile viewport')
  if(process.env.PREFERENCES_SCREENSHOT)await page.screenshot({path:process.env.PREFERENCES_SCREENSHOT,fullPage:true})
  admin=false;await page.goto(base+'/preferences');await page.getByText('These settings apply to your tenant. Only tenant administrators can change them or initialize business data.',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Save preferences',exact:true}).count()===0&&await page.getByRole('button',{name:'Preview initialization',exact:true}).count()===0,'ordinary tenant users cannot see destructive controls')
  check(errors.length===0,'no browser runtime errors')
 }finally{await browser.close()}
 check(seen.filter(x=>x.path.startsWith('/api/v1/preferences')).every(x=>x.token==='Bearer tenant-token'),'every preferences and reset request forwards bearer authentication')
 console.log(`${checks} preferences HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
