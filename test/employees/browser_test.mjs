// Real Chromium -> built Nuxt -> authenticated BFF, controlled C++ API-contract fixture.
import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {blankEmployee} from '../../frontend/app/features/employees/fields.ts'
const require=createRequire((process.env.EMPLOYEE_TEST_DEPS||'/tmp/employee-tools')+'/package.json')
const {chromium}=require('playwright-core'),module=require('@sparticuz/chromium'),binary=module.default||module
let employee={...blankEmployee(),id:'e0190000-0000-4000-8000-000000000001',version:1,employeeIdentifier:'DEMO-EMP-001',firstName:'Ama',lastName:'Mensah',dateOfBirth:'1992-03-12',dateAppointed:'2024-01-15',departmentName:'Finance',createdAt:'2026-10-22T12:00:00Z',lastModifiedAt:null}
let extra=null,writes=0,checks=0,conflict=false,canWrite=true
const seen=[],check=(value,message)=>{assert.ok(value,message);checks++}
const summary=e=>Object.fromEntries(['id','version','employeeIdentifier','firstName','otherName','lastName','departmentName','categoryName','status'].map(k=>[k,e[k]]))
const upstream=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture'),p=url.pathname,token=req.headers.authorization
 let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):null;seen.push({p,token,body,method:req.method})
 const send=(code,result,error)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({success:code<300,result,error}))}
 if(p==='/api/v1/auth/me')return token==='Bearer tenant-token'?send(200,{userId:'20000000-0000-4000-8000-000000000001',username:'admin',accountId:'acme'}):send(401,null,{code:'unauthorized'})
 if(p==='/api/v1/account/entitlements')return send(200,{modules:{gl:true,payroll:true}})
 if(p==='/api/v1/preferences')return send(200,{settings:{},version:1})
 if(token!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 if(p==='/api/v1/shared/employees'&&req.method==='GET'){
  let rows=[employee,extra].filter(Boolean);const q=(url.searchParams.get('query')||'').toLowerCase();if(q)rows=rows.filter(e=>`${e.employeeIdentifier} ${e.firstName} ${e.lastName}`.toLowerCase().includes(q))
  return send(200,{data:rows.map(summary),totalCount:rows.length,capabilities:{canWrite}})
 }
 if(p==='/api/v1/shared/employees'&&req.method==='POST'){
  writes++;extra={...blankEmployee(),...body,id:'e0190000-0000-4000-8000-000000000002',version:1,createdAt:'2026-10-22T12:00:00Z',lastModifiedAt:null};return send(201,extra)
 }
 if(p===`/api/v1/shared/employees/${employee.id}`&&req.method==='PUT'){
  if(conflict)return send(409,null,{code:'conflict',message:'Record changed'})
  writes++;employee={...employee,...body,version:employee.version+1};return send(200,employee)
 }
 if(p===`/api/v1/shared/employees/${extra?.id}`&&req.method==='DELETE'){
  if(body.version!==extra.version)return send(409,null,{code:'conflict'})
  writes++;const id=extra.id;extra=null;return send(200,{id})
 }
 if(p===`/api/v1/shared/employees/${employee.id}`)return send(200,employee)
 if(extra&&p===`/api/v1/shared/employees/${extra.id}`)return send(200,extra)
 send(404,null,{code:'not_found'})
})
await new Promise(r=>upstream.listen(0,'127.0.0.1',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),HOST:'0.0.0.0',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
let browser
try {
 browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 const context=await browser.newContext();await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}])
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
 await page.goto(base+'/ledger/shared-config/employees');await page.getByText('Ama Mensah',{exact:true}).waitFor();check(await page.getByText('DEMO-EMP-001',{exact:true}).isVisible(),'live directory renders')
 await page.getByRole('button',{name:'View Ama Mensah',exact:true}).click();check(await page.getByLabel('Date of birth',{exact:true}).isDisabled(),'view is read-only');await page.getByRole('button',{name:'Close dialog',exact:true}).click()
 await page.getByRole('button',{name:'New employee',exact:true}).click();await page.getByLabel('Employee identifier',{exact:true}).fill('EMP-BROWSER-002');await page.getByLabel('First name',{exact:true}).fill('Browser');await page.getByLabel('Last name',{exact:true}).fill('Employee');await page.getByLabel('Date of birth',{exact:true}).fill('1990-01-01');await page.getByLabel('Date appointed',{exact:true}).fill('2024-01-01');await page.getByLabel('Languages',{exact:true}).fill('English\nTwi');await page.getByLabel('Medical expenses limit',{exact:true}).fill('12345.123456');await page.getByRole('button',{name:'Save employee',exact:true}).click();await page.getByText('Employee saved.',{exact:true}).waitFor()
 check(extra?.languages.join(',')==='English,Twi'&&extra.medicalExpensesLimit==='12345.123456','create sends arrays and exact decimals through BFF')
 check(!seen.find(x=>x.method==='POST'&&x.p==='/api/v1/shared/employees').body.tenantId,'client does not supply tenant/audit scope')
 await page.getByRole('button',{name:'Edit Ama Mensah',exact:true}).click();await page.getByLabel('Department name',{exact:true}).fill('Treasury');await page.getByRole('button',{name:'Save employee',exact:true}).click();await page.getByRole('cell',{name:'Treasury',exact:true}).waitFor();check(employee.version===2&&employee.departmentName==='Treasury','update forwards current version and refreshes directory')
 conflict=true;await page.getByRole('button',{name:'Edit Ama Mensah',exact:true}).click();await page.getByRole('button',{name:'Save employee',exact:true}).click();await page.getByRole('alert').filter({hasText:'Employee changed'}).waitFor();check(await page.getByRole('dialog').count()===1,'stale conflict leaves form open with recoverable error');await page.getByRole('button',{name:'Close dialog',exact:true}).click();conflict=false
 await page.getByRole('button',{name:'Delete Browser Employee',exact:true}).click();await page.getByRole('button',{name:'Delete employee',exact:true}).click();await page.getByText('Employee deleted.',{exact:true}).waitFor();check(extra===null&&writes===3,'delete confirmation forwards record version')
 await page.getByLabel('Search employees',{exact:true}).fill('nobody-matches');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('No employees found',{exact:true}).waitFor();check(true,'search empty state renders')
 await page.goto(base+'/payroll/people/employee-bio-data');await page.getByRole('heading',{name:'Employee biodata',exact:true}).waitFor();await page.getByRole('button',{name:'View Ama Mensah',exact:true}).waitFor();check(await page.getByRole('table').count()===1,'payroll biodata route uses same live directory rather than preview')
 canWrite=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'New employee',exact:true}).waitFor({state:'hidden'});check(await page.getByRole('button',{name:'Edit Ama Mensah',exact:true}).count()===0,'read-only role hides write controls')
 const csrf=await fetch(base+'/api/shared/employees',{method:'POST',headers:{cookie:'bd_access=tenant-token',origin:'https://untrusted.invalid','content-type':'application/json'},body:'{}'});check(csrf.status===403&&writes===3,'cross-origin write rejected before upstream')
 const anonymous=await fetch(base+'/api/shared/employees');check(anonymous.status===401,'missing session rejected')
 const badId=await fetch(base+'/api/shared/employees/not-a-uuid',{headers:{cookie:'bd_access=tenant-token'}});check(badId.status===400,'malformed record ID rejected at BFF')
 const response=await fetch(base+'/api/shared/employees',{headers:{cookie:'bd_access=tenant-token'}});check(response.headers.get('cache-control')==='no-store','employee data responses are not cached')
 check(seen.filter(x=>x.p.startsWith('/api/v1/shared/employees')).every(x=>x.token==='Bearer tenant-token'),'every upstream CRUD request carries tenant bearer token')
 check(errors.length===0,`no browser runtime errors: ${errors.join(';')}`)
 console.log(`${checks} employee browser/BFF checks passed`)
}finally{if(browser)await browser.close();app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
