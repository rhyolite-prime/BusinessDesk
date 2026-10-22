// Built Nuxt HTTP integration with a strict test upstream. No live PostgreSQL.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
const unit='a0000000-0000-4000-8000-000000000001', id='a0000000-0000-4000-8000-000000000002'
let row={id,name:'Assets',parentId:null,accountType:0,isActive:true,accountingUnitId:unit}, checks=0
const seen=[], check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null
 const url=new URL(req.url,'http://test')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:'test-auth-token',expiresIn:3600,requiresTwoFactorAuth:false})
 seen.push({path:url.pathname,method:req.method,token:req.headers.authorization,body,query:Object.fromEntries(url.searchParams)})
 if(req.headers.authorization!=='Bearer test-auth-token')return send(401,null)
 if(url.pathname==='/api/v1/auth/me')return send(200,{userId:id,username:'admin',accountId:'acme'})
 if(url.pathname==='/api/v1/ledger/accounting-unit-currencies')return send(200,[{id:unit,code:'GHS',name:'Ghana cedi'}])
 if(url.pathname==='/api/v1/ledger/accounting-units'&&req.method==='GET')return send(200,{data:[row],totalCount:1,totalPages:1,pageNo:1,pageSize:20})
 if(url.pathname==='/api/v1/ledger/accounting-units'&&req.method==='POST'){row={...body,id};return send(201,row)}
 if(url.pathname===`/api/v1/ledger/accounting-units/${id}`&&req.method==='GET')return send(200,row)
 if(url.pathname===`/api/v1/ledger/accounting-units/${id}`&&req.method==='PUT'){row={...body,id};return send(200,row)}
 if(url.pathname===`/api/v1/ledger/accounting-units/${id}`&&req.method==='DELETE')return send(200,{id,deleted:true})
 if(url.pathname==='/api/v1/ledger/account-head-units')return send(200,[{id:unit,name:'Head office',code:'HQ'}])
 if(url.searchParams.get('query')==='conflict')return send(409,null,{detail:'PRIVATE SQL VALUES',message:'PRIVATE DATABASE MESSAGE'})
 if(url.pathname==='/api/v1/ledger/accounts'&&req.method==='GET')return send(200,{data:[row],totalCount:1,totalPages:1,pageNo:1,pageSize:200})
 if(url.pathname==='/api/v1/ledger/accounts'&&req.method==='POST'){row={...body,id,accountType:3,accountGroupId:unit};return send(201,row)}
 if(url.pathname===`/api/v1/ledger/accounts/${id}`&&req.method==='GET')return send(200,row)
 if(url.pathname===`/api/v1/ledger/accounts/${id}`&&req.method==='PUT'){row={...body,id};return send(200,row)}
 if(url.pathname===`/api/v1/ledger/accounts/${id}`&&req.method==='DELETE')return send(200,{id,deleted:true})
 if(url.pathname==='/api/v1/ledger/account-controls'&&req.method==='GET')return send(200,{data:[row],totalCount:1,totalPages:1,pageNo:1,pageSize:200})
 if(url.pathname==='/api/v1/ledger/account-controls'&&req.method==='POST'){row={...body,id};return send(201,row)}
 if(url.pathname===`/api/v1/ledger/account-controls/${id}`&&req.method==='GET')return send(200,row)
 if(url.pathname===`/api/v1/ledger/account-controls/${id}`&&req.method==='PUT'){row={...body,id};return send(200,row)}
 if(url.pathname===`/api/v1/ledger/account-controls/${id}`&&req.method==='DELETE')return send(200,{id,deleted:true})
 if(url.pathname==='/api/v1/ledger/account-heads'&&req.method==='GET')return send(200,{data:[row],totalCount:1,totalPages:1,pageNo:1,pageSize:200})
 if(url.pathname==='/api/v1/ledger/account-heads'&&req.method==='POST'){row={...body,id};return send(201,row)}
 if(url.pathname===`/api/v1/ledger/account-heads/${id}`&&req.method==='GET')return send(200,row)
 if(url.pathname===`/api/v1/ledger/account-heads/${id}`&&req.method==='PUT'){row={...body,id};return send(200,row)}
 if(url.pathname===`/api/v1/ledger/account-heads/${id}`&&req.method==='DELETE')return send(200,{id,deleted:true})
 return send(404,null)
})
await new Promise(resolve=>upstream.listen(0,'0.0.0.0',resolve))
const portServer=http.createServer();await new Promise(resolve=>portServer.listen(0,'0.0.0.0',resolve));const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve))
const base=`http://127.0.0.1:${port}`, backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log=''
app.stderr.on('data',data=>{log+=data})
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',data=>{log+=data;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exited ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='') {
 const response=await fetch(base+path,{method,headers:{'content-type':'application/json',origin:base,cookie},body:body?JSON.stringify(body):undefined,redirect:'manual'})
 return {response,body:await response.json()}
}
try {
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'admin',password:'test-only'})
 const cookie=login.response.headers.getSetCookie().find(value=>value.startsWith('bd_access=')).split(';')[0]
 let r=await call('/api/ledger/account-head-units');check(r.response.status===401,'no cookie cannot list heads units')
 r=await call('/api/ledger/account-head-units','GET',undefined,cookie);check(r.response.status===200&&r.body[0].id===unit,'tenant unit choices loaded')
 r=await call(`/api/ledger/account-heads?accountingUnitId=${unit}`,'GET',undefined,cookie)
 check(r.response.status===200&&r.body.data[0].name==='Assets','list unwraps backend envelope')
 check(r.response.headers.get('cache-control')==='no-store','head responses not cached')
 r=await call(`/api/ledger/account-heads/${id}?accountingUnitId=${unit}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.id===id,'read single persisted head')
 const body={accountingUnitId:unit,name:'  New asset  ',parentId:null,accountType:0,isActive:false}
 r=await call('/api/ledger/account-heads','POST',body,cookie);check(r.response.status===200&&r.body.name==='New asset'&&r.body.isActive===false,'create trims name and forwards inactive flag')
 r=await call(`/api/ledger/account-heads/${id}`,'PUT',{...body,name:'Renamed',isActive:true},cookie);check(r.response.status===200&&r.body.name==='Renamed','PUT persists edits')
 r=await call(`/api/ledger/account-heads/${id}?accountingUnitId=${unit}`,'DELETE',undefined,cookie);check(r.response.status===200&&r.body.deleted,'delete unwraps success')
 const ledgerCalls=seen.filter(req=>req.path.startsWith('/api/v1/ledger/'))
 check(ledgerCalls.length===6&&ledgerCalls.every(req=>req.token==='Bearer test-auth-token'),'JWT forwarded on units/list/detail/create/update/delete')
 check(ledgerCalls.filter(req=>['GET','DELETE'].includes(req.method)&&!req.path.endsWith('account-head-units')).every(req=>req.query.accountingUnitId===unit),'reads and delete forward accounting unit scope')
 const before=seen.length
 r=await call('/api/ledger/account-heads','POST',{...body,tenantId:'forged'},cookie);check(r.response.status===400&&seen.length===before,'caller cannot supply tenant identity')
 r=await call('/api/ledger/account-heads','POST',{...body,isActive:'false'},cookie);check(r.response.status===400,'boolean flag validated')
 r=await call('/api/ledger/account-heads','POST',{...body,accountType:5},cookie);check(r.response.status===400,'standard account type validated')
 r=await call('/api/ledger/account-heads/no-id?accountingUnitId='+unit,'DELETE',undefined,cookie);check(r.response.status===400,'malformed IDs blocked before upstream')
 r=await call(`/api/ledger/account-heads?accountingUnitId=${unit}&query=conflict`,'GET',undefined,cookie)
 check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'conflicts retained, database details not leaked')
 const denied=await fetch(base+'/api/ledger/account-heads',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example',cookie},body:JSON.stringify(body)})
 check(denied.status===403,'cross-origin mutation rejected')
 check(seen.every(req=>!JSON.stringify(req.body).includes('test-auth-token')),'JWT is a header, never a CRUD body field')
 // Accounting Units: every route must forward the same authenticated bearer.
 const unitBody={code:' HQ ',name:' Head office ',baseCurrencyId:unit,timeZone:'Africa/Accra',fiscalYearStartMonth:1,isActive:true}
 r=await call('/api/ledger/accounting-units');check(r.response.status===401,'anonymous units denied')
 r=await call('/api/ledger/accounting-unit-currencies','GET',undefined,cookie);check(r.response.status===200&&r.body[0].code==='GHS','real currency choices forwarded')
 r=await call('/api/ledger/accounting-units?pageNo=1&pageSize=20&query=HQ','GET',undefined,cookie);check(r.response.status===200&&r.body.totalCount===1,'unit list pagination envelope')
 r=await call('/api/ledger/accounting-units','POST',unitBody,cookie);check(r.response.status===200&&r.body.code==='HQ'&&r.body.name==='Head office','unit create trimmed')
 r=await call(`/api/ledger/accounting-units/${id}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.timeZone==='Africa/Accra','unit detail loaded')
 r=await call(`/api/ledger/accounting-units/${id}`,'PUT',{...unitBody,isActive:false},cookie);check(r.response.status===200&&!r.body.isActive,'unit edit deactivation forwarded')
 r=await call(`/api/ledger/accounting-units/${id}`,'DELETE',undefined,cookie);check(r.response.status===200&&r.body.deleted,'unit delete forwarded')
 const unitCalls=seen.filter(req=>req.path.includes('/ledger/accounting-unit'))
 check(unitCalls.length===6&&unitCalls.every(req=>req.token==='Bearer test-auth-token'),'JWT on all six unit routes')
 const count=seen.length
 for(const invalid of [{...unitBody,tenantId:'forged'},{...unitBody,fiscalYearStartMonth:13},{...unitBody,isActive:'true'},{...unitBody,timeZone:'Mars/Invalid'}]) {
   r=await call('/api/ledger/accounting-units','POST',invalid,cookie);check(r.response.status===400&&seen.length===count,'unit invalid payload rejected locally')
 }
 r=await call('/api/ledger/accounting-units/not-a-uuid','DELETE',undefined,cookie);check(r.response.status===400,'unit invalid UUID rejected')
 const crossOrigin=await fetch(base+'/api/ledger/accounting-units',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example',cookie},body:JSON.stringify(unitBody)})
 check(crossOrigin.status===403,'unit cross-origin mutation denied')
 // Account Controls: real CRUD adapter, scope, validation and bearer forwarding.
 const controlBody={accountingUnitId:unit,accountGroupId:id,parentAccountHeaderId:null,accountHeaderName:' Cash and bank ',minAccount:1000,maxAccount:1999,isActive:true}
 r=await call(`/api/ledger/account-controls?accountingUnitId=${unit}`);check(r.response.status===401,'anonymous control list denied')
 r=await call(`/api/ledger/account-controls?accountingUnitId=${unit}&pageNo=1&pageSize=200&query=cash`,'GET',undefined,cookie);check(r.response.status===200&&r.body.totalCount===1,'control list envelope unwrapped')
 check(r.response.headers.get('cache-control')==='no-store','control responses not cached')
 r=await call('/api/ledger/account-controls','POST',controlBody,cookie);check(r.response.status===200&&r.body.accountHeaderName==='Cash and bank','control create trims name')
 r=await call(`/api/ledger/account-controls/${id}?accountingUnitId=${unit}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.minAccount===1000,'control single detail forwarded')
 r=await call(`/api/ledger/account-controls/${id}`,'PUT',{...controlBody,isActive:false},cookie);check(r.response.status===200&&!r.body.isActive,'control update status forwarded')
 r=await call(`/api/ledger/account-controls/${id}?accountingUnitId=${unit}`,'DELETE',undefined,cookie);check(r.response.status===200&&r.body.deleted,'control delete forwarded')
 const controlCalls=seen.filter(req=>req.path.includes('/ledger/account-controls'))
 check(controlCalls.length===5&&controlCalls.every(req=>req.token==='Bearer test-auth-token'),'JWT forwarded on all five control operations')
 check(controlCalls.filter(req=>['GET','DELETE'].includes(req.method)).every(req=>req.query.accountingUnitId===unit),'control read/delete scoped to selected unit')
 check(controlCalls.find(req=>req.method==='POST').body.accountingUnitId===unit,'control write unit scope in body')
 const beforeControls=seen.length
 for(const invalid of [{...controlBody,tenantId:'forged'},{...controlBody,createdByUserId:id},{...controlBody,minAccount:-1},{...controlBody,minAccount:1.5},{...controlBody,maxAccount:2147483648},{...controlBody,maxAccount:999},{...controlBody,isActive:'false'},{...controlBody,parentAccountHeaderId:'bad'},{...controlBody,accountGroupId:'bad'},{...controlBody,accountHeaderName:'   '}]) {
   r=await call('/api/ledger/account-controls','POST',invalid,cookie);check(r.response.status===400&&seen.length===beforeControls,'control invalid fields blocked locally')
 }
 r=await call('/api/ledger/account-controls','GET',undefined,cookie);check(r.response.status===400,'control list requires accounting unit')
 r=await call(`/api/ledger/account-controls/invalid?accountingUnitId=${unit}`,'DELETE',undefined,cookie);check(r.response.status===400,'control invalid ID rejected')
 r=await call(`/api/ledger/account-controls?accountingUnitId=${unit}&query=conflict`,'GET',undefined,cookie);check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'control conflict is sanitized')
 const deniedControl=await fetch(base+'/api/ledger/account-controls',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example',cookie},body:JSON.stringify(controlBody)})
 check(deniedControl.status===403,'cross-origin control mutation blocked')
 // Account Details: canonical live CRUD, no demo or browser-supplied head/type.
 const detailBody={accountingUnitId:unit,accountHeaderId:id,accountNumber:'001150',accountName:' Software sales ',currencyId:unit,status:'active',allowManualPosting:true,isControlAccount:false}
 r=await call(`/api/ledger/accounts?accountingUnitId=${unit}`);check(r.response.status===401,'anonymous account detail list denied')
 r=await call(`/api/ledger/accounts?accountingUnitId=${unit}&pageNo=1&pageSize=200`,'GET',undefined,cookie);check(r.response.status===200&&r.body.totalCount===1,'account list envelope unwrapped')
 check(r.response.headers.get('cache-control')==='no-store','account detail responses not cached')
 r=await call('/api/ledger/accounts','POST',detailBody,cookie);check(r.response.status===200&&r.body.accountNumber==='1150'&&r.body.accountName==='Software sales','account create normalized and trimmed')
 r=await call(`/api/ledger/accounts/${id}?accountingUnitId=${unit}`,'GET',undefined,cookie);check(r.response.status===200&&r.body.accountType===3,'account get inherits backend classification')
 r=await call(`/api/ledger/accounts/${id}`,'PUT',{...detailBody,status:'inactive',allowManualPosting:false},cookie);check(r.response.status===200&&r.body.status==='inactive'&&!r.body.allowManualPosting,'account update status and flag forwarded')
 r=await call(`/api/ledger/accounts/${id}`,'PATCH',{...detailBody,currencyId:null},cookie);check(r.response.status===200&&r.body.currencyId===null,'legacy PATCH method validates full object and forwards PUT')
 r=await call(`/api/ledger/accounts/${id}?accountingUnitId=${unit}`,'DELETE',undefined,cookie);check(r.response.status===200&&r.body.deleted,'account soft delete forwarded')
 const detailCalls=seen.filter(req=>req.path.startsWith('/api/v1/ledger/accounts'))
 check(detailCalls.length===6&&detailCalls.every(req=>req.token==='Bearer test-auth-token'),'JWT forwarded on every account detail request')
 check(detailCalls.filter(req=>['GET','DELETE'].includes(req.method)).every(req=>req.query.accountingUnitId===unit),'account reads and deletion retain selected unit')
 const beforeDetails=seen.length
 for(const invalid of [{...detailBody,tenantId:'forged'},{...detailBody,createdByUserId:id},{...detailBody,accountGroupId:id},{...detailBody,accountType:3},{...detailBody,accountNumber:'-1'},{...detailBody,accountNumber:'1.2'},{...detailBody,accountNumber:'2147483648'},{...detailBody,accountNumber:1150},{...detailBody,accountName:'   '},{...detailBody,status:'Active'},{...detailBody,status:['active']},{...detailBody,allowManualPosting:'true'},{...detailBody,isControlAccount:'false'},{...detailBody,currencyId:''},{...detailBody,accountHeaderId:'bad'}]) {
   r=await call('/api/ledger/accounts','POST',invalid,cookie);check(r.response.status===400&&seen.length===beforeDetails,'invalid account detail payload blocked locally')
 }
 r=await call('/api/ledger/accounts','GET',undefined,cookie);check(r.response.status===400,'account list requires explicit unit')
 r=await call(`/api/ledger/accounts/invalid?accountingUnitId=${unit}`,'DELETE',undefined,cookie);check(r.response.status===400,'account invalid UUID rejected')
 r=await call(`/api/ledger/accounts?accountingUnitId=${unit}&query=conflict`,'GET',undefined,cookie);check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'account conflict sanitized')
 const deniedDetail=await fetch(base+'/api/ledger/accounts',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.example',cookie},body:JSON.stringify(detailBody)})
 check(deniedDetail.status===403,'cross-origin account write denied')
 console.log(`${checks} ledger setup HTTP checks passed`)
} finally {app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
