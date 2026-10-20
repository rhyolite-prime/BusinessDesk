// Built Nuxt integration with strict fake upstream. Not a live PostgreSQL test.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
const id='a0000000-0000-4000-8000-000000000001'
let row={id,code:'GHS',name:'Ghana cedi',decimalPlaces:2,isActive:true},checks=0,hostAllowed=true
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
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'})
 const tenantCookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 let r=await call('/api/shared/currencies');check(r.response.status===401,'anonymous currency list denied')
 r=await call('/api/shared/currencies?pageNo=1&pageSize=20&query=GHS','GET',undefined,tenantCookie);check(r.response.status===200&&r.body.data[0].code==='GHS','tenant shared catalog live list')
 check(r.response.headers.get('cache-control')==='no-store','currency responses not cached')
 r=await call(`/api/shared/currencies/${id}`,'GET',undefined,tenantCookie);check(r.response.status===200&&r.body.decimalPlaces===2,'tenant single currency read')
 r=await call('/api/host/currencies','GET',undefined,tenantCookie);check(r.response.status===401,'tenant session is not a host session')
 r=await call('/api/host/currencies','GET',undefined,'bd_host_access=tenant-token');check(r.response.status===401,'copying tenant JWT into host cookie does not elevate privilege')
 const body={code:' usd ',name:' US dollar ',decimalPlaces:2,isActive:true}
 r=await call('/api/shared/currencies','POST',body,tenantCookie);check(r.response.status>=400,'tenant currency mutation route not exposed')
 r=await call('/api/host/login','POST',{usernameOrEmail:'admin',password:'invalid'});check(r.response.status===401&&!JSON.stringify(r.body).includes('PRIVATE'),'invalid host login sanitized')
 r=await call('/api/host/login','POST',{usernameOrEmail:'ordinary',password:'test-only'});check(r.response.status===403&&!r.response.headers.getSetCookie().some(c=>c.startsWith('bd_host_access=ordinary')),'ordinary host cannot open management session')
 const hostLogin=await call('/api/host/login','POST',{usernameOrEmail:'admin',password:'test-only'})
 check(hostLogin.response.status===200&&!JSON.stringify(hostLogin.body).includes('host-token'),'host login never exposes JWT in body')
 const cookieHeader=hostLogin.response.headers.getSetCookie().find(c=>c.startsWith('bd_host_access=')),hostCookie=cookieHeader.split(';')[0]
 check(cookieHeader.includes('HttpOnly')&&cookieHeader.includes('Secure')&&cookieHeader.includes('SameSite=Strict'),'host credential cookie protected')
 check(!hostLogin.response.headers.getSetCookie().some(c=>c.startsWith('bd_access=')),'host login does not overwrite tenant session')
 r=await call('/api/host/me','GET',undefined,hostCookie);check(r.response.status===200&&r.body.canManageCurrencies,'live host privilege verified')
 r=await call('/api/host/currencies','GET',undefined,hostCookie);check(r.response.status===200&&r.body.totalCount===1,'host list unwraps envelope')
 r=await call('/api/host/currencies','POST',body,hostCookie);check(r.response.status===200&&r.body.code==='USD'&&r.body.name==='US dollar','host currency create trims and normalizes')
 r=await call(`/api/host/currencies/${id}`,'GET',undefined,hostCookie);check(r.response.status===200&&r.body.id===id,'host currency detail loaded')
 r=await call(`/api/host/currencies/${id}`,'PUT',{...body,isActive:false},hostCookie);check(r.response.status===200&&!r.body.isActive,'host currency update status')
 r=await call(`/api/host/currencies/${id}`,'DELETE',undefined,hostCookie);check(r.response.status===200&&r.body.deleted,'host currency delete')
 const hostCalls=seen.filter(r=>r.path.startsWith('/api/v1/host/currencies'))
 check(hostCalls.length===5&&hostCalls.every(r=>r.token==='Bearer host-token'),'host JWT forwarded on every CRUD request')
 check(seen.filter(r=>r.path.startsWith('/api/v1/shared/')).every(r=>r.token==='Bearer tenant-token'),'tenant JWT forwarded on every catalog read')
 const before=seen.length
 for(const invalid of [{...body,tenantId:'forged'},{...body,createdByUserId:id},{...body,code:'US1'},{...body,name:' '},{...body,decimalPlaces:7},{...body,decimalPlaces:1.5},{...body,isActive:'true'}]){
  r=await call('/api/host/currencies','POST',invalid,hostCookie);check(r.response.status===400&&seen.length===before,'invalid currency body blocked before upstream')
 }
 r=await call('/api/host/currencies/not-uuid','DELETE',undefined,hostCookie);check(r.response.status===400,'currency UUID validated')
 r=await call('/api/host/currencies?query=conflict','GET',undefined,hostCookie);check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'currency constraint conflict sanitized')
 r=await call('/api/host/currencies','POST',body,hostCookie,'https://attacker.example');check(r.response.status===403,'cross-origin currency write denied')
 r=await call('/api/host/login','POST',{usernameOrEmail:'admin',password:'test-only'},'', 'https://attacker.example');check(r.response.status===403,'cross-origin host login denied')
 r=await call('/host/currencies');check(r.response.status===302&&r.response.headers.get('location')==='/host/login','host page requires host login')
 r=await call('/host/currencies','GET',undefined,hostCookie);check(r.response.status===200&&String(r.body).includes('Host Administration'),'host-only management page renders without tenant session')
 r=await call('/ledger/shared-config/currencies','GET',undefined,hostCookie);check(r.response.status===302,'host-only cookie does not grant tenant workspace access')
 r=await call('/ledger/shared-config/currencies','GET',undefined,tenantCookie);check(r.response.status===200&&String(r.body).includes('read-only for tenants'),'tenant currency page renders read-only')
 check(['Shared config','Company profile','Cost Centers','Currencies','Banks and branches','System numbers','Default GL Numbers'].every(label=>String(r.body).includes(label)),'Shared config menu contains all six child menus')

 hostAllowed=false;r=await call('/api/host/currencies','GET',undefined,hostCookie);check(r.response.status===403,'live host-admin revocation prevents later requests');hostAllowed=true
 r=await call('/api/host/logout','POST',undefined,`${hostCookie}; ${tenantCookie}`);check(r.response.status===200&&r.response.headers.getSetCookie().some(c=>c.startsWith('bd_host_access=;')),'host logout clears host cookie')
 check(!r.response.headers.getSetCookie().some(c=>c.startsWith('bd_access=')),'host logout leaves tenant session intact')
 console.log(`${checks} shared-currency HTTP checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
