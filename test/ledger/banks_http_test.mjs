// Built Nuxt transport/SSR integration with a strict fake upstream; service SQL has a separate live-PG test.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
const id='a0000000-0000-4000-8000-000000000001',branchId='b0000000-0000-4000-8000-000000000001'
let bank={id,name:'Test Bank',bankCode:'TST',contactPerson:'Jane',contactNo:'+233200000000',email:'bank@example.test'}
let child={id:branchId,bankId:id,name:'Accra',contactPerson:'Ama',contactNo:'',email:''},checks=0
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
 if(req.method==='GET')return send(200,detail?(branch?child:bank):{data:[branch?child:bank],totalCount:1,totalPages:1,pageNo:1,pageSize:20})
 if(req.method==='POST'||req.method==='PUT'){
  const allowed=['name','contactPerson','contactNo','email',...(branch?[]:['bankCode'])]
  if(!body||Object.keys(body).some(k=>!allowed.includes(k))||!body.name||(!branch&&!body.bankCode))return send(400,null,{code:'validation_error',message:'PRIVATE SQL validation'})
  if(branch)child={...body,id:branchId,bankId:id};else bank={...body,id}
  return send(req.method==='POST'?201:200,branch?child:bank)
 }
 if(req.method==='DELETE')return send(200,{id:branch?branchId:id,isDeleted:true})
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
 check(['Banks and branches','Header table','Child table','Bank code','Contact person','Contact number','Email','Add bank','Add branch'].every(label=>String(r.body).includes(label)),'header and child tables, model fields and create controls render')
 check(!String(r.body).includes('This setup screen is not implemented yet'),'bank placeholder replaced by real screen')
 console.log(`${checks} bank/branch HTTP checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
