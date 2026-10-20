// Built Nuxt + strict mock upstream; production SQL is covered by the PostgreSQL suite.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
const header=await readFile(new URL('../../dto/DefaultGlFields.h',import.meta.url),'utf8')
const fields=[...header.matchAll(/\{"([^"]+)","([^"]+)","([^"]+)"\}/g)].map(m=>m[1])
const unit='30000000-0000-4000-8000-000000000001',unit2='30000000-0000-4000-8000-000000000002',account='50000000-0000-4000-8000-000000000001',bank='60000000-0000-4000-8000-000000000001',category='70000000-0000-4000-8000-000000000001'
const options={account:[{value:account,label:'100 · Cash'}],bank:[{value:bank,label:'Bank · 123'}],category:[{value:category,label:'Travel'}]}
let rows=new Map(),next=0,checks=0,failure=false
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test'),token=req.headers.authorization,u=url.searchParams.get('accountingUnitId')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token,body,unit:u})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:body.accountId==='other'?'other-token':'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/me')return ['Bearer tenant-token','Bearer other-token'].includes(token)?send(200,{userId:account,username:'tenant',accountId:'acme'}):send(401,null)
 if(token!=='Bearer tenant-token')return send(404,null)
 if(url.pathname==='/api/v1/ledger/accounting-units')return send(200,{data:[{id:unit,code:'HQ',name:'Head Office',isActive:true},{id:unit2,code:'BR',name:'Branch',isActive:true}],totalPages:1,totalCount:2})
 if(!url.pathname.startsWith('/api/v1/ledger/default-gl-numbers'))return send(404,null)
 if(failure)return send(503,null,{message:'PRIVATE SQL error'})
 if(![unit,unit2].includes(u))return send(404,null)
 if(url.pathname.endsWith('/options'))return send(200,options)
 const id=url.pathname.split('/')[5],row=rows.get(u)
 if(req.method==='GET')return id?(row?.id===id?send(200,row):send(404,null)):send(200,{data:row?[row]:[],totalCount:row?1:0})
 if(req.method==='DELETE'){if(row?.id!==id)return send(404,null);rows.delete(u);return send(200,{id,isDeleted:true})}
 if(!body||body.accountingUnitId!==u||Object.keys(body).some(k=>!['accountingUnitId','vatRate',...fields].includes(k)))return send(400,null,{code:'validation_error',message:'PRIVATE scope error'})
 if(req.method==='POST'&&row)return send(409,null,{code:'conflict'})
 if(req.method==='PUT'&&row?.id!==id)return send(404,null)
 const saved={...Object.fromEntries(fields.map(k=>[k,null])),vatRate:0,...row,...body,id:row?.id||`a0000000-0000-4000-8000-${String(++next).padStart(12,'0')}`}
 rows.set(u,saved);return send(req.method==='POST'?201:200,saved)
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
 let r=await call('/api/ledger/default-gl-numbers');check(r.response.status===401,'anonymous denied')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'})
 const cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 const query=`?accountingUnitId=${unit}`
 r=await call('/api/ledger/default-gl-numbers','GET',undefined,cookie);check(r.response.status===400,'unit required')
 r=await call('/api/ledger/default-gl-numbers'+query,'GET',undefined,cookie);check(r.response.status===200&&r.body.data.length===0,'empty list')
 r=await call('/api/ledger/default-gl-numbers/options'+query,'GET',undefined,cookie);check(r.body.account[0].value===account&&r.body.bank[0].value===bank&&r.body.category[0].value===category,'all three reference lookup types')
 const input={accountingUnitId:unit,salesRevenueAccountId:account,accountPayablesBankAccountId:bank,imprestCategoryId:category,vatRate:0.15}
 r=await call('/api/ledger/default-gl-numbers','POST',input,cookie);check(r.response.status===200&&r.body.vatRate===0.15,'create persists VAT fraction')
 const id=r.body.id;check(r.response.headers.get('cache-control')==='no-store','not cached')
 r=await call('/api/ledger/default-gl-numbers','POST',input,cookie);check(r.response.status===409,'one configuration per unit')
 r=await call(`/api/ledger/default-gl-numbers/${id}`+query,'GET',undefined,cookie);check(r.response.status===200&&r.body.id===id,'read detail')
 r=await call(`/api/ledger/default-gl-numbers/${id}`,'PUT',{accountingUnitId:unit,vatRate:0.2},cookie);check(r.body.vatRate===0.2&&r.body.salesRevenueAccountId===account,'partial update')
 r=await call(`/api/ledger/default-gl-numbers/${id}?accountingUnitId=${unit2}`,'GET',undefined,cookie);check(r.response.status===404,'wrong unit denied')
 r=await call(`/api/ledger/default-gl-numbers/${id}`,'PUT',{...input,tenantId:unit},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'forged tenant rejected with sanitized error')
 r=await call('/api/ledger/default-gl-numbers','POST',input,cookie,'https://attacker.example');check(r.response.status===403,'cross-origin mutation denied')
 failure=true;r=await call('/api/ledger/default-gl-numbers'+query,'GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'upstream SQL failure sanitized');failure=false
 r=await call(`/api/ledger/default-gl-numbers/${id}`+query,'DELETE',undefined,cookie);check(r.response.status===200&&!rows.has(unit),'delete')
 r=await call('/api/ledger/default-gl-numbers','POST',input,cookie);check(r.response.status===200&&r.body.id!==id,'recreate after deletion')
 const otherLogin=await call('/api/auth/login','POST',{accountId:'other',usernameOrEmail:'tenant',password:'test-only'}),otherCookie=otherLogin.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/ledger/default-gl-numbers'+query,'GET',undefined,otherCookie);check(r.response.status===404,'foreign tenant cannot access defaults')
 check(seen.filter(x=>x.path.startsWith('/api/v1/ledger/default-gl-numbers')).every(x=>['Bearer tenant-token','Bearer other-token'].includes(x.token)),'bearer forwarded on every CRUD and lookup call')
 r=await call('/ledger/default-gl-numbers');check(r.response.status===302,'page login protected')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true});rows=new Map()
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1100}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/ledger/default-gl-numbers');await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit)
   await page.getByRole('heading',{name:'No default GL numbers saved'}).waitFor()
   check(!(await page.locator('body').innerText()).includes('Preview mode:'),'demo preview removed')
   await page.getByRole('button',{name:'Set up defaults',exact:true}).first().click();const modal=page.getByRole('dialog');await modal.waitFor()
   await modal.getByLabel('Accounts Payable bank account',{exact:false}).selectOption(bank);await modal.getByLabel('Default imprest category',{exact:false}).selectOption(category);await modal.getByLabel('Sales revenue',{exact:false}).selectOption(account);await modal.getByLabel('VAT rate (%)',{exact:true}).fill('12.3456')
   await modal.getByRole('button',{name:'Save defaults',exact:true}).click();await modal.waitFor({state:'hidden'})
   check(rows.get(unit).vatRate===0.123456&&rows.get(unit).salesRevenueAccountId===account&&rows.get(unit).accountPayablesBankAccountId===bank&&rows.get(unit).imprestCategoryId===category,'browser saves all reference types and VAT conversion')
   await page.getByRole('button',{name:'Edit defaults',exact:true}).click();await modal.getByLabel('VAT rate (%)',{exact:true}).fill('20');await modal.getByRole('button',{name:'Cancel',exact:true}).click();check(rows.get(unit).vatRate===0.123456,'cancel leaves server configuration unchanged')
   await page.getByRole('button',{name:'Edit defaults',exact:true}).click();await modal.getByLabel('VAT rate (%)',{exact:true}).fill('20');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows.get(unit).vatRate===0.2,'browser update persisted')
   await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit2);await page.getByRole('heading',{name:'No default GL numbers saved'}).waitFor();check(await page.getByRole('button',{name:'Edit defaults',exact:true}).count()===0,'unit switch clears previous defaults')
   await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit);await page.getByRole('button',{name:'Edit defaults',exact:true}).waitFor()
   await page.getByRole('button',{name:'Delete',exact:true}).click();await modal.getByRole('button',{name:'Delete defaults',exact:true}).click();await modal.waitFor({state:'hidden'});await page.getByRole('heading',{name:'No default GL numbers saved'}).waitFor();check(!rows.has(unit),'browser soft-delete action reaches API')
   await page.getByRole('button',{name:'Set up defaults',exact:true}).first().click();await modal.getByRole('button',{name:'Save defaults',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows.has(unit),'browser recreation works with unconfigured nullable mappings')
   check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 console.log(`${checks} default GL HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
