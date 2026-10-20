// Built Nuxt transport/SSR integration with a strict fake upstream; service SQL has a separate live-PG test.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const id='a0000000-0000-4000-8000-000000000001',branchId='b0000000-0000-4000-8000-000000000001'
let bank={id,name:'Test Bank',bankCode:'TST',contactPerson:'Jane',contactNo:'+233200000000',email:'bank@example.test'}
let child={id:branchId,bankId:id,name:'Accra',contactPerson:'Ama',contactNo:'',email:''},checks=0
let bankDeleted=false,childDeleted=false
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token:req.headers.authorization,body,query:Object.fromEntries(url.searchParams)})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:id,username:'tenant',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null)
 if(url.searchParams.get('query')==='conflict')return send(409,null,{code:'conflict',message:'PRIVATE SQL'})
 const parts=url.pathname.split('/').filter(Boolean),branch=parts.includes('branches'),detail=parts.length===(branch?7:5)
 if(!url.pathname.startsWith('/api/v1/shared/banks'))return send(404,null)
 if(req.method==='GET'){const deleted=branch?childDeleted:bankDeleted;if(detail&&deleted)return send(404,null);return send(200,detail?(branch?child:bank):{data:deleted?[]:[branch?child:bank],totalCount:deleted?0:1,totalPages:deleted?0:1,pageNo:1,pageSize:20})}
 if(req.method==='POST'||req.method==='PUT'){
  const allowed=['name','contactPerson','contactNo','email',...(branch?[]:['bankCode'])]
  if(!body||Object.keys(body).some(k=>!allowed.includes(k))||!body.name||(!branch&&!body.bankCode))return send(400,null,{code:'validation_error',message:'PRIVATE SQL validation'})
  if(branch){child={...body,id:branchId,bankId:id};childDeleted=false}else{bank={...body,id};bankDeleted=false}
  return send(req.method==='POST'?201:200,branch?child:bank)
 }
 if(req.method==='DELETE'){if(branch)childDeleted=true;else bankDeleted=true;return send(200,{id:branch?branchId:id,isDeleted:true})}
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
 let r=await call('/api/shared/banks');check(r.response.status===401,'anonymous bank list denied')
 r=await call('/api/shared/banks','GET',undefined,'bd_host_access=host-token');check(r.response.status===401,'host cookie is not tenant authorization')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'})
 const cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 const bankBody={name:'Test Bank',bankCode:'TST',contactPerson:'Jane',contactNo:'+233200000000',email:'bank@example.test'}
 const branchBody={name:'Accra',contactPerson:'Ama',contactNo:'',email:''}
 for(const branch of [false,true]){
  const root=branch?`/api/shared/banks/${id}/branches`:'/api/shared/banks',recordId=branch?branchId:id,body=branch?branchBody:bankBody
  r=await call(root+'?pageNo=2&pageSize=10&query=Accra','GET',undefined,cookie);check(r.response.status===200&&r.body.totalCount===1,'list connected')
  check(r.response.headers.get('cache-control')==='no-store','no bank response cache')
  check(seen.at(-1).query.pageNo==='2'&&seen.at(-1).query.pageSize==='10'&&seen.at(-1).query.query==='Accra','search and pagination forwarded')
  r=await call(root,'POST',body,cookie);check(r.response.status===200&&r.body.id===recordId,'create connected')
  check(JSON.stringify(seen.at(-1).body)===JSON.stringify(body),'editable fields forwarded unchanged')
  r=await call(`${root}/${recordId}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.id===recordId,'detail connected')
  r=await call(`${root}/${recordId}`,'PUT',{...body,name:'Renamed'},cookie);check(r.response.status===200&&r.body.name==='Renamed','update connected')
  r=await call(`${root}/${recordId}`,'DELETE',undefined,cookie);check(r.response.status===200&&r.body.isDeleted,'delete connected')
  r=await call(root,'POST',{...body,tenantId:'forged'},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'backend validation propagated safely')
  const count=seen.length
  r=await call(root,'POST',body,cookie,'https://attacker.example');check(r.response.status===403&&seen.length===count,'cross-origin mutation blocked before upstream')
  r=await call(root+'?query=conflict','GET',undefined,cookie);check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'conflict sanitized')
 }
 for(const path of ['/api/shared/banks/not-a-uuid',`/api/shared/banks/invalid/branches`,`/api/shared/banks/${id}/branches/invalid`]){
  r=await call(path,'GET',undefined,cookie);check(r.response.status===400,'malformed parent/child IDs rejected')
 }
 check(seen.filter(x=>x.path.startsWith('/api/v1/shared/banks')).every(x=>x.token==='Bearer tenant-token'),'every bank/branch request carries tenant JWT')
 r=await call('/ledger/shared-config/banks-and-branches');check(r.response.status===302,'bank workspace requires tenant login')
 r=await call('/ledger/shared-config/banks-and-branches','GET',undefined,cookie)
 check(r.response.status===200,'bank workspace renders on SSR')
 check(['Banks &amp; Branches','Banks header table','Bank Name','Contact Person','Contact No','Email','Bank Code','Add bank','Expand branches'].every(label=>String(r.body).includes(label)),'reference-style header grid and toolbar render')
 check(!String(r.body).includes('This setup screen is not implemented yet'),'bank placeholder replaced by real screen')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default || require('@sparticuz/chromium')
  bankDeleted=false;childDeleted=false;bank={...bankBody,id};child={...branchBody,id:branchId,bankId:id}
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true})
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}})
   await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}])
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/ledger/shared-config/banks-and-branches')
   await page.getByRole('button',{name:'Select bank Test Bank',exact:true}).waitFor()
   check(await page.getByRole('button',{name:'Edit bank',exact:true}).isDisabled(),'bank toolbar edit requires selection')
   await page.getByRole('button',{name:'Expand branches for Test Bank',exact:true}).click()
   await page.getByRole('button',{name:'Select branch Accra',exact:true}).waitFor()
   check(await page.getByRole('region',{name:'Bank branches child table'}).count()===1,'child grid expands inside bank row')
   await page.getByRole('button',{name:'Select branch Accra',exact:true}).click()
   await page.getByRole('button',{name:'Edit branch',exact:true}).click()
   let dialog=page.getByRole('dialog');await dialog.getByLabel('Name', {exact:false}).first().fill('Tema')
   await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   await page.getByRole('button',{name:'Select branch Tema',exact:true}).waitFor()
   check(child.name==='Tema','branch edit toolbar saves to API and refreshes child grid')
   await page.getByRole('button',{name:'Add branch',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Name', {exact:false}).first().fill('New branch')
   await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   await page.getByRole('button',{name:'Select branch New branch',exact:true}).click()
   check(child.name==='New branch','nested add branch connects to selected bank')
   await page.getByRole('button',{name:'Delete branch',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Delete',exact:true}).click();await dialog.waitFor({state:'hidden'})
   await page.getByText('No branches found.',{exact:false}).waitFor();check(childDeleted,'branch delete refreshes empty child grid')
   await page.getByRole('button',{name:'Edit bank',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Name', {exact:false}).first().fill('Edited Bank')
   await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   await page.getByRole('button',{name:'Select bank Edited Bank',exact:true}).waitFor();check(bank.name==='Edited Bank','bank edit toolbar saves and refreshes header')
   await page.getByRole('button',{name:'Collapse branches for Edited Bank',exact:true}).click()
   check(await page.getByRole('region',{name:'Bank branches child table'}).count()===0,'bank row collapses child grid')
   await page.getByRole('button',{name:'Add bank',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Name', {exact:false}).first().fill('New Bank');await dialog.getByLabel('Bank code').fill('NEW')
   await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'})
   await page.getByRole('button',{name:'Select bank New Bank',exact:true}).waitFor();check(bank.name==='New Bank','bank creation saves and refreshes without 503')
   await page.getByRole('button',{name:'Expand view',exact:true}).click();check(await page.getByRole('button',{name:'Exit expanded view',exact:true}).count()===1,'expand view control works')
   await page.getByRole('button',{name:'Exit expanded view',exact:true}).click()
   await page.screenshot({path:'/tmp/banks-branches-redesign.png',fullPage:true})
   await page.getByRole('button',{name:'Delete bank',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Delete',exact:true}).click();await dialog.waitFor({state:'hidden'})
   await page.getByText('No banks found.',{exact:false}).waitFor();check(bankDeleted,'bank deletion refreshes empty header')
   check(errors.length===0,`no browser runtime errors: ${errors.join(', ')}`)
  }finally{await browser.close()}
 }
 console.log(`${checks} bank/branch HTTP${process.env.BANK_BROWSER_DEPS?' and browser':''} checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
