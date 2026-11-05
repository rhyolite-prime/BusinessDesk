// Built Nuxt integration with strict fake upstream. Not a live PostgreSQL test.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const id='a0000000-0000-4000-8000-000000000001'
let row={id,code:'GHS',name:'Ghana cedi',decimalPlaces:2,isActive:true},checks=0,hostAllowed=true
const copyId='b0000000-0000-4000-8000-000000000001'
const fields={moduleId:1,itemName:'Journal',key:'JOURNAL',prefix:'JV-',suffix:'',formatPattern:'{PREFIX}{NO}{SUFFIX}',padding:5,lastNo:10}
let hostRow={...fields,id},tenantRow={...fields,id:copyId},deleted=false
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token:req.headers.authorization,body,query:Object.fromEntries(url.searchParams)})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/host-login'){
  if(body.password==='invalid')return send(401,null,{message:'PRIVATE credentials'})
  return send(200,{token:body.usernameOrEmail==='ordinary'?'ordinary-host-token':'host-token',expiresIn:3600})
 }
 if(url.pathname==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:id,username:'tenant',accountId:'acme'}):send(401,null)
 if(url.pathname==='/api/v1/host/currency-session'){
  if(req.headers.authorization==='Bearer ordinary-host-token'||!hostAllowed)return send(403,null,{message:'PRIVATE host details'})
  if(req.headers.authorization!=='Bearer host-token')return send(401,null)
  return send(200,{userId:id,username:'host-admin',canManageCurrencies:true})
 }
 if(url.pathname.startsWith('/api/v1/host/')&&req.headers.authorization!=='Bearer host-token')return send(401,null)
 if(url.pathname.startsWith('/api/v1/shared/')&&req.headers.authorization!=='Bearer tenant-token')return send(401,null)
 if(url.searchParams.get('query')==='conflict')return send(409,null,{message:'PRIVATE SQL',detail:'PRIVATE table values'})
 if(url.pathname==='/api/v1/host/currencies'||url.pathname==='/api/v1/shared/currencies'){
  if(req.method==='GET')return send(200,{data:[row],totalCount:1,totalPages:1,pageNo:1,pageSize:20})
  if(req.method==='POST'&&url.pathname.includes('/host/')){row={...body,id};return send(201,row)}
 }
 if(url.pathname===`/api/v1/host/currencies/${id}`||url.pathname===`/api/v1/shared/currencies/${id}`){
  if(req.method==='GET')return send(200,row)
  if(req.method==='PUT'&&url.pathname.includes('/host/')){row={...body,id};return send(200,row)}
  if(req.method==='DELETE'&&url.pathname.includes('/host/'))return send(200,{id,deleted:true})
 }
 if(url.pathname.includes('/system-numbers')){
  const host=url.pathname.includes('/host/'),detail=url.pathname.split('/').length===6,current=host?hostRow:tenantRow
  if(url.searchParams.get('query')==='failure')return send(503,null,{message:'PRIVATE database details'})
  if(host&&!hostAllowed)return send(403,null)
  if(req.method==='GET')return detail?(host&&deleted?send(404,null):send(200,current)):send(200,{data:host&&deleted?[]:[current],totalCount:host&&deleted?0:1,totalPages:1})
  if(!host&&req.method!=='PUT')return send(403,null)
  if(req.method==='DELETE'){deleted=true;return send(200,{id,isDeleted:true})}
  if(Object.keys(body||{}).length!==8||body.tenantId||!Number.isInteger(body.lastNo))return send(400,null,{message:'PRIVATE validation'})
  if(host){hostRow={...body,id};deleted=false}else tenantRow={...body,id:copyId}
  return send(req.method==='POST'?201:200,host?hostRow:tenantRow)
 }
 return send(404,null)
})
await new Promise(resolve=>upstream.listen(0,'0.0.0.0',resolve))
const reserve=http.createServer();await new Promise(resolve=>reserve.listen(0,'0.0.0.0',resolve));const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',data=>{log+=data})
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',data=>{log+=data;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exited ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='',origin=base){
 const response=await fetch(base+path,{method,headers:{'content-type':'application/json',origin,cookie},body:body?JSON.stringify(body):undefined,redirect:'manual'})
 const text=await response.text();let result;try{result=JSON.parse(text)}catch{result=text}
 return {response,body:result}
}
try{
 let r=await call('/api/shared/system-numbers');check(r.response.status===401,'anonymous tenant list denied')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'})
 const tenantCookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 const loginHost=await call('/api/host/login','POST',{usernameOrEmail:'admin',password:'test-only'})
 const hostCookie=loginHost.response.headers.getSetCookie().find(c=>c.startsWith('bd_host_access=')).split(';')[0]
 r=await call('/api/host/system-numbers','GET',undefined,tenantCookie);check(r.response.status===401,'tenant session cannot manage host templates')
 r=await call('/api/shared/system-numbers','GET',undefined,hostCookie);check(r.response.status===401,'host session cannot impersonate tenant')
 for(const [scope,cookie,rowId] of [['host',hostCookie,id],['shared',tenantCookie,copyId]]){
  const base=`/api/${scope}/system-numbers`
  r=await call(base+'?pageNo=1&pageSize=20&query=journal','GET',undefined,cookie);check(r.response.status===200&&r.body.data[0].id===rowId,'scoped list unwraps result')
  check(r.response.headers.get('cache-control')==='no-store','no cached numbering settings')
  check(seen.at(-1).query.query==='journal','search forwarded')
  r=await call(`${base}/${rowId}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.lastNo===10,'detail API')
  r=await call(`${base}/${rowId}`,'PUT',{...fields,prefix:scope+'-'},cookie);check(r.response.status===200&&r.body.prefix===scope+'-','scoped update')
  r=await call(`${base}/${rowId}`,'PUT',{...fields,tenantId:id},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'scope field validation sanitized')
  r=await call(base+'?query=failure','GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'DB error sanitized')
  r=await call(`${base}/invalid`,'GET',undefined,cookie);check(r.response.status===400,'UUID validation')
  const count=seen.length;r=await call(`${base}/${rowId}`,'PUT',fields,cookie,'https://attacker.example');check(r.response.status===403&&seen.length===count,'cross-origin mutation denied before upstream')
 }
 for(const method of ['POST','DELETE']){const count=seen.filter(x=>x.path.includes('/system-numbers')).length;r=await call('/api/shared/system-numbers'+(method==='DELETE'?`/${copyId}`:''),method,fields,tenantCookie);check(r.response.status===403&&seen.filter(x=>x.path.includes('/system-numbers')).length===count,'tenant create/delete blocked at BFF')}
 r=await call('/api/host/system-numbers','POST',fields,hostCookie);check(r.response.status===200&&r.body.id===id,'host template create')
 r=await call(`/api/host/system-numbers/${id}`,'DELETE',undefined,hostCookie);check(r.response.status===200&&r.body.isDeleted,'host template delete')
 check(tenantRow.prefix==='shared-','host mutations leave tenant copy unchanged')
 check(seen.filter(x=>x.path.includes('/shared/system-numbers')).every(x=>x.token==='Bearer tenant-token'),'tenant JWT on all requests')
 check(seen.filter(x=>x.path.includes('/host/system-numbers')).every(x=>x.token==='Bearer host-token'),'host JWT on all requests')
 hostAllowed=false;r=await call('/api/host/system-numbers','GET',undefined,hostCookie);check(r.response.status===403,'host privilege revocation checked');hostAllowed=true
 r=await call('/host/system-numbers');check(r.response.status===302,'host page protected')
 r=await call('/host/system-numbers','GET',undefined,hostCookie);check(r.response.status===200&&String(r.body).includes('Add system number'),'host CRUD screen SSR')
 r=await call('/ledger/shared-config/system-numbers','GET',undefined,tenantCookie);check(r.response.status===200&&String(r.body).includes('Tenant copies cannot be created or deleted')&&!String(r.body).includes('Add system number'),'tenant edit-only SSR')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true})
  deleted=false;hostRow={...fields,id};tenantRow={...fields,id:copyId}
  try{
   const context=await browser.newContext();await context.addCookies([{name:'bd_host_access',value:'host-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/host/system-numbers');await page.getByRole('button',{name:'Edit Journal',exact:true}).waitFor()
   await page.getByRole('button',{name:'Add system number',exact:true}).click();let dialog=page.getByRole('dialog')
   await dialog.getByLabel('Item name',{exact:true}).fill('Voucher');await dialog.getByLabel('Key',{exact:true}).fill('VOUCHER');await dialog.getByLabel('Prefix',{exact:true}).fill('PV-')
   await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'});await page.getByRole('button',{name:'Edit Voucher',exact:true}).click()
   dialog=page.getByRole('dialog');await dialog.getByLabel('Last number',{exact:true}).fill('42');await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'});check(hostRow.lastNo===42,'host create/edit through browser')
   await page.getByRole('button',{name:'Delete Voucher',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Delete template',exact:true}).click();await dialog.waitFor({state:'hidden'});check(deleted,'host delete through browser')
   await page.close();const tenantContext=context;await tenantContext.clearCookies();await tenantContext.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const tenantPage=await tenantContext.newPage();tenantPage.on('pageerror',e=>errors.push(e.message))
   await tenantPage.goto(base+'/ledger/shared-config/system-numbers');await tenantPage.getByRole('button',{name:'Edit Journal',exact:true}).waitFor()
   check(await tenantPage.getByRole('button',{name:'Add system number'}).count()===0&&await tenantPage.getByRole('button',{name:'Delete Journal'}).count()===0,'tenant browser has no create or delete controls')
   await tenantPage.getByRole('button',{name:'Edit Journal',exact:true}).click();dialog=tenantPage.getByRole('dialog');await dialog.getByLabel('Prefix',{exact:true}).fill('TEN-');await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'});check(tenantRow.prefix==='TEN-'&&hostRow.prefix==='PV-','tenant browser edit isolated from host')
   check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 console.log(`${checks} system-number HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
