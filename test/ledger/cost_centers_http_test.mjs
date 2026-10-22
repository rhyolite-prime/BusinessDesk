// Built Nuxt/strict fake upstream; real service SQL has separate PostgreSQL tests.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const id='a0000000-0000-4000-8000-000000000001',childId='b0000000-0000-4000-8000-000000000001'
let records=new Map([[id,{id,name:'Operations',parentId:null}],[childId,{id:childId,name:'Finance',parentId:id}]]),checks=0,counter=0,failure=false
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token:req.headers.authorization,body})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:id,username:'tenant',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null)
 if(!url.pathname.startsWith('/api/v1/shared/cost-centers'))return send(404,null)
 if(failure)return send(503,null,{message:'PRIVATE SQL error'})
 const recordId=url.pathname.split('/')[5],current=records.get(recordId)
 if(req.method==='GET')return recordId?(current?send(200,current):send(404,null)):send(200,{data:[...records.values()],totalCount:records.size})
 if(req.method==='DELETE'){
  if(!current)return send(404,null)
  if([...records.values()].some(row=>row.parentId===recordId))return send(409,null,{code:'conflict',message:'PRIVATE child detail'})
  records.delete(recordId);return send(200,{id:recordId,isDeleted:true})
 }
 if(!body||Object.keys(body).some(k=>!['name','parentId'].includes(k))||typeof body.name!=='string'||!body.name.trim()||body.name.length>160)return send(400,null,{code:'validation_error',message:'PRIVATE validation'})
 const parentId=body.parentId||null
 if(parentId&&!records.has(parentId))return send(400,null,{code:'validation_error'})
 if([...records.values()].some(row=>row.id!==recordId&&row.parentId===parentId&&row.name.toLowerCase()===body.name.trim().toLowerCase()))return send(409,null,{code:'conflict'})
 let parent=parentId;while(parent){if(parent===recordId)return send(400,null,{code:'validation_error'});parent=records.get(parent)?.parentId}
 if(req.method==='PUT'&&!current)return send(404,null)
 const newId=recordId||`c0000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`,row={id:newId,name:body.name.trim(),parentId};records.set(newId,row);return send(req.method==='POST'?201:200,row)
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
 let r=await call('/api/shared/cost-centers');check(r.response.status===401,'anonymous list denied')
 r=await call('/api/shared/cost-centers','GET',undefined,'bd_host_access=host-token');check(r.response.status===401,'host cookie cannot impersonate tenant')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'})
 const cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/shared/cost-centers','GET',undefined,cookie);check(r.response.status===200&&r.body.data.length===2,'complete hierarchy list')
 check(r.response.headers.get('cache-control')==='no-store','cost center responses not cached')
 r=await call(`/api/shared/cost-centers/${id}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.parentId===null,'root detail')
 r=await call('/api/shared/cost-centers','POST',{name:'New',parentId:id},cookie);check(r.response.status===200&&r.body.parentId===id,'child create');const created=r.body.id
 r=await call(`/api/shared/cost-centers/${created}`,'PUT',{name:'Moved',parentId:null},cookie);check(r.response.status===200&&r.body.parentId===null,'update and move to root')
 r=await call(`/api/shared/cost-centers/${created}`,'DELETE',undefined,cookie);check(r.response.status===200&&r.body.isDeleted,'leaf delete')
 r=await call(`/api/shared/cost-centers/${id}`,'DELETE',undefined,cookie);check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'child conflict sanitized')
 r=await call('/api/shared/cost-centers','POST',{name:'Bad',tenantId:id},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'scope overrides rejected')
 r=await call('/api/shared/cost-centers/invalid','GET',undefined,cookie);check(r.response.status===400,'UUID validation')
 const before=seen.length;r=await call('/api/shared/cost-centers','POST',{name:'Bad',parentId:null},cookie,'https://attacker.example');check(r.response.status===403&&seen.length===before,'cross-origin mutation blocked')
 failure=true;r=await call('/api/shared/cost-centers','GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'DB failure sanitized');failure=false
 check(seen.filter(x=>x.path.includes('/shared/cost-centers')).every(x=>x.token==='Bearer tenant-token'),'tenant bearer forwarded on all operations')
 r=await call('/ledger/shared-config/cost-centers');check(r.response.status===302,'page protected')
 r=await call('/ledger/shared-config/cost-centers','GET',undefined,cookie);check(r.response.status===200&&String(r.body).includes('Add cost center')&&String(r.body).includes('Top-level centers')&&!String(r.body).includes('not implemented yet'),'live hierarchical page SSR')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true})
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/ledger/shared-config/cost-centers');await page.getByRole('button',{name:'Edit Finance',exact:true}).waitFor()
   check(await page.getByRole('button',{name:'Delete Operations',exact:true}).isDisabled(),'parent delete disabled in UI')
   const childRow=page.getByRole('button',{name:'Edit Finance',exact:true}).locator('xpath=ancestor::tr[1]')
   check(await childRow.locator('td').first().locator('div').evaluate(el=>el.style.paddingLeft)==='22px','child hierarchy indented like Account Heads')
   await page.getByRole('searchbox',{name:'Search cost centers'}).fill('Finance');check(await page.getByRole('button',{name:'Edit Operations',exact:true}).isVisible(),'search keeps ancestor context');await page.getByRole('searchbox',{name:'Search cost centers'}).fill('')
   await page.getByRole('button',{name:'Edit Operations',exact:true}).click();let dialog=page.getByRole('dialog')
   await dialog.getByLabel('Parent cost center').waitFor();check(await dialog.getByLabel('Parent cost center').locator('option').count()===1,'parent options exclude self and descendants');await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
   await page.getByRole('button',{name:'Add cost center',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Name',{exact:true}).fill('IT');await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   await page.getByRole('button',{name:'Add child to IT',exact:true}).click();dialog=page.getByRole('dialog');const itId=[...records.values()].find(row=>row.name==='IT').id
   check(await dialog.getByLabel('Parent cost center').inputValue()===itId,'add-child preselects parent');await dialog.getByLabel('Name',{exact:true}).fill('Support');await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   await page.getByRole('button',{name:'Edit Support',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Name',{exact:true}).fill('Helpdesk');await dialog.getByLabel('Parent cost center').selectOption('');await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   check([...records.values()].some(row=>row.name==='Helpdesk'&&row.parentId===null),'browser edits and reparents cost center')
   await page.getByRole('button',{name:'Delete Helpdesk',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Delete cost center',exact:true}).click();await dialog.waitFor({state:'hidden'})
   check(![...records.values()].some(row=>row.name==='Helpdesk'),'browser delete refreshes hierarchy');check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 console.log(`${checks} cost center HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
