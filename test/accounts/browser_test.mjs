import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {accountModules} from '../../frontend/app/features/tenant-account.ts'
const require=createRequire((process.env.ACCOUNT_TEST_DEPS||'/tmp/account-tools')+'/package.json')
const {chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
const id=n=>`a0000000-0000-4000-8000-${String(n).padStart(12,'0')}`,tenant=id(1),currency=id(2)
let account={id:tenant,accountId:'acme',name:'Acme tenant',country:'GH',isActive:true,requireTwoFactorAuth:false,version:1,createdAt:new Date().toISOString(),updatedAt:null,billing:{currencyId:currency,currencyCode:'GHS',email:'billing@example.test',phone:'',paymentMethod:'invoice'},modules:Object.fromEntries(Object.keys(accountModules).map(k=>[k,{enabled:k==='gl',startDate:null,endDate:null,fee:'0',billingCycle:'',nextRenewalDate:null,effective:k==='gl'}])),requests:[],audit:[]}
let writes=0,checks=0;const seen=[],check=(x,m)=>{assert.ok(x,m);checks++}
const upstream=http.createServer(async(req,res)=>{
 const p=new URL(req.url,'http://fixture').pathname,token=req.headers.authorization;let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):null;seen.push({p,token,body})
 const send=(code,result,error)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify({success:code<300,result,error}))}
 if(p==='/api/v1/auth/me')return token==='Bearer tenant-token'?send(200,{userId:id(90),username:'admin',accountId:'acme'}):send(401,null,{code:'unauthorized'})
 if(p==='/api/v1/host/currency-session')return token==='Bearer host-token'?send(200,{canManageCurrencies:true}):send(401,null,{code:'unauthorized'})
 if(p.startsWith('/api/v1/host/')&&token!=='Bearer host-token')return send(403,null,{code:'forbidden',message:'Host permission required.'})
 if(p==='/api/v1/host/currencies')return send(200,{data:[{id:currency,code:'GHS',isActive:true}],totalPages:1})
 if(p==='/api/v1/host/tenant-accounts')return send(200,{items:[account]})
 if(p===`/api/v1/host/tenant-accounts/${tenant}`&&req.method==='PUT'){
  if(body.version!==account.version)return send(409,null,{code:'conflict',message:'Account changed. Reload before saving.'})
  writes++;account={...account,...body,version:account.version+1,billing:{...body.billing,currencyCode:'GHS'},modules:Object.fromEntries(Object.entries(body.modules).map(([k,v])=>[k,{...v,effective:v.enabled}])),audit:[{id:id(99),action:'account_updated',actorUserId:id(91),createdAt:new Date().toISOString(),state:body}]};return send(200,account)
 }
 if(p===`/api/v1/host/tenant-accounts/${tenant}`)return send(200,account)
 if(p==='/api/v1/account'&&token==='Bearer tenant-token')return send(200,account)
 if(p==='/api/v1/account/entitlements'&&token==='Bearer tenant-token')return send(200,{modules:Object.fromEntries(Object.entries(account.modules).map(([k,v])=>[k,v.effective]))})
 if(p==='/api/v1/account/requests'&&token==='Bearer tenant-token'){account.requests.push({id:id(80),message:body.message,response:'',status:'open',version:1,createdAt:new Date().toISOString()});return send(200,{accepted:true})}
 if(p===`/api/v1/host/tenant-accounts/${tenant}/requests/resolve`){account.requests[0].status=body.status;account.requests[0].response=body.response;return send(200,{resolved:true})}
 send(404,null,{code:'not_found',message:'Not found'})
})
await new Promise(r=>upstream.listen(0,'127.0.0.1',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),HOST:'0.0.0.0',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',c=>{clearTimeout(timer);reject(new Error(`App exit ${c}: ${log}`))})})
let browser
try{
 browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 const host=await browser.newContext();await host.addCookies([{name:'bd_host_access',value:'host-token',url:base,httpOnly:true}]);const hp=await host.newPage(),errors=[];hp.on('pageerror',e=>errors.push(e.message));hp.setDefaultTimeout(10000)
 await hp.goto(base+'/host/tenants');await hp.getByRole('link',{name:'Manage account',exact:true}).click();await hp.getByRole('heading',{name:'Acme tenant',exact:true}).waitFor()
 check(await hp.getByLabel('Organization name',{exact:true}).inputValue()==='Acme tenant','host overview uses live account')
 await hp.getByRole('button',{name:'Subscriptions',exact:true}).click();await hp.getByLabel('Payroll',{exact:true}).check();await hp.getByLabel('Payroll fee',{exact:true}).fill('123.456789');await hp.getByRole('button',{name:'Save account changes',exact:true}).click();await hp.getByText('Account changes saved and audited.',{exact:true}).waitFor()
 check(writes===1&&account.modules.payroll.fee==='123.456789','host saves exact fee and module flag through BFF')
 const tenantContext=await browser.newContext();await tenantContext.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const tp=await tenantContext.newPage();tp.on('pageerror',e=>errors.push(e.message));tp.setDefaultTimeout(10000)
 await tp.goto(base+'/account');await tp.getByRole('heading',{name:'Acme tenant',exact:true}).waitFor();check(await tp.getByLabel('Organization name',{exact:true}).isDisabled(),'tenant overview is read-only')
 await tp.getByRole('button',{name:'Subscriptions',exact:true}).click();check(await tp.getByLabel('Payroll fee',{exact:true}).isDisabled(),'tenant cannot edit subscription fee')
 await tp.getByRole('button',{name:'Requests',exact:true}).click();await tp.getByLabel('Request a subscription or billing change',{exact:true}).fill('Please arrange a billing method change');await tp.getByRole('button',{name:'Submit change request',exact:true}).click();await tp.getByText('Change request submitted. Subscription terms and payment instructions have not changed.',{exact:true}).waitFor();check(account.requests.length===1,'tenant admin submits real change request')
 await hp.reload();await hp.getByRole('button',{name:'Requests',exact:true}).click();await hp.getByLabel('Response',{exact:true}).fill('Contacted your billing administrator');await hp.getByRole('button',{name:'Resolve',exact:true}).click();await hp.getByText('Request closed and audited. Apply any approved account changes separately.',{exact:true}).waitFor();check(account.requests[0].status==='resolved','host resolves incoming request')
 const r=await fetch(base+`/api/host/tenants/${tenant}`,{method:'PUT',headers:{cookie:'bd_host_access=host-token',origin:'https://untrusted.invalid','content-type':'application/json'},body:'{}'});check(r.status===403&&writes===1,'cross-origin account write rejected before upstream')
 const forbidden=await fetch(base+`/api/host/tenants/${tenant}`,{headers:{cookie:'bd_access=tenant-token'}});check(forbidden.status===401,'tenant cookie cannot substitute host session')
 await tp.goto(base+'/modules');await tp.getByRole('link',{name:'Subscription required',exact:false}).first().waitFor();check(await tp.getByRole('link',{name:'Subscription required',exact:false}).count()>0,'unsubscribed workspaces do not expose an open-dashboard action')
 check(seen.filter(x=>x.p.startsWith('/api/v1/host/')).every(x=>x.token==='Bearer host-token'),'host requests forward only host bearer token')
 check(seen.filter(x=>x.p.startsWith('/api/v1/account')).every(x=>x.token==='Bearer tenant-token'),'account requests forward only tenant bearer token')
 check(errors.length===0,`no browser runtime errors: ${errors.join(';')}`)
 console.log(`${checks} tenant account browser checks passed`)
}finally{if(browser)await browser.close();app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
