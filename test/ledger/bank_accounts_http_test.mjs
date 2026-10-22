// Built Nuxt transport/browser tests with a mock upstream, not a live Drogon/JWT deployment.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const unit='30000000-0000-4000-8000-000000000001',unit2='30000000-0000-4000-8000-000000000002',account='50000000-0000-4000-8000-000000000001',bank='80000000-0000-4000-8000-000000000001',branch='90000000-0000-4000-8000-000000000001',currency='40000000-0000-4000-8000-000000000001'
const choices={banks:[{id:bank,name:'Live Bank'}],branches:[{id:branch,bankId:bank,name:'Accra'}],accounts:[{id:account,accountNumber:'100',name:'Cash',currencyId:currency}],currencies:[{id:currency,code:'GHS',name:'Cedi'}]}
const fields=['bankId','bankBranchId','accountId','currencyId','accountNumber','accountType','dateOpened','address','location','contactPerson','contactNumber','chequeBookStart','chequeBookEnd','isActive']
let rows=[],next=0,checks=0,failure=false,used=false
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
 if(!url.pathname.startsWith('/api/v1/ledger/bank-accounts'))return send(404,null)
 if(failure)return send(503,null,{message:'PRIVATE SQL error'})
 if(![unit,unit2].includes(u))return send(404,null)
 if(url.pathname.endsWith('/options'))return send(200,choices)
 const id=url.pathname.split('/')[5],row=rows.find(r=>r.accountingUnitId===u&&r.id===id)
 if(req.method==='GET')return id?(row?send(200,row):send(404,null)):send(200,{data:rows.filter(r=>r.accountingUnitId===u),totalCount:rows.filter(r=>r.accountingUnitId===u).length})
 if(req.method==='DELETE'){if(!row)return send(404,null);if(used)return send(409,null,{code:'conflict'});rows=rows.filter(r=>r!==row);return send(200,{id,isDeleted:true})}
 if(!body||body.accountingUnitId!==u||Object.keys(body).some(k=>!['accountingUnitId',...fields].includes(k)))return send(400,null,{code:'validation_error',message:'PRIVATE field error'})
 if(req.method==='PUT'&&!row)return send(404,null)
 const saved={...Object.fromEntries(fields.map(f=>[f,''])),isActive:true,...row,...body,bankName:'Live Bank',bankBranchName:'Accra',accountName:'Cash',currencyCode:'GHS',currencyName:'Cedi',id:row?.id||`a0000000-0000-4000-8000-${String(++next).padStart(12,'0')}`}
 if(rows.some(r=>r!==row&&r.accountingUnitId===u&&r.accountNumber.toLowerCase()===saved.accountNumber.toLowerCase()))return send(409,null,{code:'conflict'})
 rows=[saved,...rows.filter(r=>r!==row)];return send(req.method==='POST'?201:200,saved)
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
 let r=await call('/api/ledger/bank-accounts');check(r.response.status===401,'anonymous denied')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0],query=`?accountingUnitId=${unit}`
 r=await call('/api/ledger/bank-accounts','GET',undefined,cookie);check(r.response.status===400,'unit required')
 r=await call('/api/ledger/bank-accounts/options'+query,'GET',undefined,cookie);check(r.body.banks[0].id===bank&&r.body.accounts[0].id===account&&r.body.currencies[0].id===currency,'real lookup forwarding')
 const input={accountingUnitId:unit,bankId:bank,bankBranchId:branch,accountId:account,currencyId:currency,accountNumber:'123',accountType:'Current',dateOpened:'2024-02-29'}
 r=await call('/api/ledger/bank-accounts','POST',input,cookie);check(r.response.status===200&&r.body.bankName==='Live Bank','create with derived names');const id=r.body.id
 check(r.response.headers.get('cache-control')==='no-store','no caching')
 r=await call('/api/ledger/bank-accounts','POST',input,cookie);check(r.response.status===409,'duplicate conflict')
 r=await call(`/api/ledger/bank-accounts/${id}`+query,'GET',undefined,cookie);check(r.response.status===200&&r.body.accountNumber==='123','get record')
 r=await call(`/api/ledger/bank-accounts/${id}`,'PUT',{accountingUnitId:unit,address:'Accra'},cookie);check(r.body.address==='Accra'&&r.body.accountNumber==='123','partial update')
 r=await call(`/api/ledger/bank-accounts/${id}?accountingUnitId=${unit2}`,'GET',undefined,cookie);check(r.response.status===404,'wrong unit denied')
 r=await call(`/api/ledger/bank-accounts/${id}`,'PUT',{...input,tenantId:unit},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'tenant override denied and errors sanitized')
 r=await call('/api/ledger/bank-accounts','POST',input,cookie,'https://attacker.example');check(r.response.status===403,'cross-origin write denied')
 used=true;r=await call(`/api/ledger/bank-accounts/${id}`+query,'DELETE',undefined,cookie);check(r.response.status===409,'used-bank deletion conflict');used=false
 failure=true;r=await call('/api/ledger/bank-accounts'+query,'GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'SQL errors sanitized');failure=false
 r=await call(`/api/ledger/bank-accounts/${id}`+query,'DELETE',undefined,cookie);check(r.response.status===200&&rows.length===0,'delete')
 r=await call('/api/ledger/bank-accounts','POST',input,cookie);check(r.response.status===200&&r.body.id!==id,'recreate number')
 const otherLogin=await call('/api/auth/login','POST',{accountId:'other',usernameOrEmail:'tenant',password:'test-only'}),otherCookie=otherLogin.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/ledger/bank-accounts'+query,'GET',undefined,otherCookie);check(r.response.status===404,'other tenant denied')
 check(seen.filter(x=>x.path.startsWith('/api/v1/ledger/bank-accounts')).every(x=>['Bearer tenant-token','Bearer other-token'].includes(x.token)),'bearer on every CRUD and lookup call')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true});rows=[]
  try{
   const context=await browser.newContext({viewport:{width:1280,height:800}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/ledger/bank-accounts');await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit)
   const add=page.getByRole('button',{name:'Add bank account',exact:true});await add.waitFor();await add.click();const modal=page.getByRole('dialog');await modal.waitFor()
   await modal.getByLabel('Bank name',{exact:false}).selectOption(bank);await modal.getByLabel('Bank branch',{exact:false}).selectOption(branch);await modal.getByLabel('GL account',{exact:false}).selectOption(account)
   check(await modal.getByLabel('Currency',{exact:false}).inputValue()===currency,'explicit GL currency prefilled')
   await modal.getByLabel('Account number',{exact:true}).fill('BROWSER-001');await modal.getByLabel('Date opened',{exact:true}).fill('2024-02-29');await modal.getByLabel('Contact number',{exact:true}).fill('0201234567')
   await page.setViewportSize({width:390,height:640});const scroller=modal.locator('form > div').first();await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight});check(await scroller.evaluate(el=>el.scrollTop>0),'mobile modal can scroll')
   await modal.getByRole('button',{name:'Save bank account',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows[0].accountNumber==='BROWSER-001'&&rows[0].bankId===bank&&rows[0].bankBranchId===branch,'browser persisted create, no demo data')
   await page.setViewportSize({width:1280,height:800});await page.getByRole('button',{name:'Edit bank account',exact:true}).click();await modal.getByLabel('Location',{exact:true}).fill('Tema');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows[0].location==='Tema','browser edit')
   await page.getByRole('button',{name:'Edit bank account',exact:true}).click();await modal.getByLabel('Location',{exact:true}).fill('Discard');await modal.getByRole('button',{name:'Cancel',exact:true}).click();check(rows[0].location==='Tema','cancel does not write')
   await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit2);await page.getByText('No bank accounts found',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Edit bank account',exact:true}).count()===0,'unit switch clears old records')
   await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit);await page.getByRole('button',{name:'Edit bank account',exact:true}).waitFor();await page.getByRole('button',{name:'Delete bank account',exact:true}).click();await page.getByRole('button',{name:'Remove account',exact:true}).click();await page.getByText('No bank accounts found',{exact:true}).waitFor();check(rows.length===0,'browser delete')
   check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 console.log(`${checks} bank account HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
