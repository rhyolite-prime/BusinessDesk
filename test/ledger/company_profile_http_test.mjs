// Built Nuxt transport/SSR/browser checks with a strict fake upstream. Real SQL/crypto has a separate PG suite.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=await readFile(new URL('../../frontend/app/features/ledger/company-profile-fields.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {companyProfileFields,emptyCompanyProfile}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const id='a0000000-0000-4000-8000-000000000001',currencyId='b0000000-0000-4000-8000-000000000001'
let profiles=new Map(),checks=0,failure=false
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test'),token=req.headers.authorization
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token,body})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:body.accountId==='other'?'other-token':'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/me')return ['Bearer tenant-token','Bearer other-token'].includes(token)?send(200,{userId:id,username:'tenant',accountId:'acme'}):send(401,null)
 if(!['Bearer tenant-token','Bearer other-token'].includes(token))return send(401,null)
 if(url.pathname==='/api/v1/shared/currencies')return send(200,{data:[{id:currencyId,code:'GHS',name:'Ghana cedi',isActive:true}],totalPages:1,totalCount:1})
 if(url.pathname!=='/api/v1/shared/company-profile')return send(404,null)
 if(failure)return send(503,null,{message:'PRIVATE SQL error and password'})
 const current=profiles.get(token)
 // Deliberate upstream secret fields prove the BFF's positive response allowlist.
 const publicResult=row=>({...row,emailPassword:'LEAK-plaintext',email_password_encrypted:'LEAK-ciphertext',unexpectedSecret:'LEAK-new-field'})
 if(req.method==='GET')return current?send(200,publicResult(current)):send(404,null)
 if(req.method==='DELETE')return send(403,null)
 if(!body||Object.keys(body).some(k=>!['emailPassword','clearEmailPassword',...companyProfileFields.map(f=>f.key)].includes(k)))return send(400,null,{code:'validation_error',message:'PRIVATE unexpected field'})
 if(req.method==='POST'&&current)return send(409,null,{code:'conflict',message:'PRIVATE singleton'})
 if(req.method==='PUT'&&!current)return send(404,null)
 const row={...emptyCompanyProfile(),...current,...body,id,hasEmailPassword:body.clearEmailPassword?false:!!body.emailPassword||!!current?.hasEmailPassword};delete row.emailPassword;delete row.clearEmailPassword
 if(!row.companyName?.trim())return send(400,null,{code:'validation_error'})
 profiles.set(token,row);return send(req.method==='POST'?201:200,publicResult(row))
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
 let r=await call('/api/shared/company-profile');check(r.response.status===401,'anonymous profile denied')
 r=await call('/api/shared/company-profile','GET',undefined,'bd_host_access=host-token');check(r.response.status===401,'host cookie not tenant access')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'})
 const cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/shared/company-profile','GET',undefined,cookie);check(r.response.status===404,'missing singleton reported')
 const body={companyName:'Test Company',emailPassword:'test-only-smtp-password'}
 r=await call('/api/shared/company-profile','POST',body,cookie);check(r.response.status===200&&r.body.companyName==='Test Company'&&r.body.hasEmailPassword,'create singleton')
 check(r.response.headers.get('cache-control')==='no-store','profile not cached')
 check(!JSON.stringify(r.body).includes('LEAK')&&!JSON.stringify(r.body).includes('test-only-smtp-password'),'proxy positive allowlist excludes plaintext and ciphertext')
 check(seen.at(-1).body.emailPassword==='test-only-smtp-password','write-only password forwarded to trusted backend')
 r=await call('/api/shared/company-profile','GET',undefined,cookie);check(r.response.status===200&&r.body.hasEmailPassword&&!JSON.stringify(r.body).includes('LEAK'),'read contains only safe fields')
 r=await call('/api/shared/company-profile','POST',body,cookie);check(r.response.status===409&&!JSON.stringify(r.body).includes('PRIVATE'),'singleton conflict sanitized')
 r=await call('/api/shared/company-profile','PUT',{cityName:'Accra'},cookie);check(r.response.status===200&&r.body.cityName==='Accra'&&r.body.companyName==='Test Company','update preserves omitted fields')
 r=await call('/api/shared/company-profile','PUT',{tenantId:id},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'scope override rejected')
 const before=seen.filter(x=>x.path.endsWith('/company-profile')).length;r=await call('/api/shared/company-profile','DELETE',undefined,cookie);check(r.response.status===403&&seen.filter(x=>x.path.endsWith('/company-profile')).length===before,'delete denied before profile upstream')
 r=await call('/api/shared/company-profile','PUT',{companyName:'Bad'},cookie,'https://attacker.example');check(r.response.status===403,'cross-origin profile write blocked')
 failure=true;r=await call('/api/shared/company-profile','GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'DB/config errors sanitized');failure=false
 const loginOther=await call('/api/auth/login','POST',{accountId:'other',usernameOrEmail:'tenant',password:'test-only'})
 const otherCookie=loginOther.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/shared/company-profile','GET',undefined,otherCookie);check(r.response.status===404,'other tenant has no access to first singleton')
 check(seen.filter(x=>x.path.endsWith('/company-profile')).every(x=>['Bearer tenant-token','Bearer other-token'].includes(x.token)),'tenant bearer on every upstream request')
 r=await call('/ledger/shared-config/company-profile');check(r.response.status===302,'page requires tenant sign-in')
 r=await call('/ledger/shared-config/company-profile','GET',undefined,cookie);check(r.response.status===200&&String(r.body).includes('Company profile')&&!String(r.body).includes('not implemented yet'),'profile page SSR replaces placeholder')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true})
  profiles=new Map()
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1100}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/ledger/shared-config/company-profile');await page.getByRole('button',{name:'Create company profile',exact:true}).waitFor()
   await page.getByLabel('Company name',{exact:false}).fill('Browser Company');await page.getByLabel('City name',{exact:true}).fill('Accra');await page.getByLabel('First month of fiscal year',{exact:false}).selectOption('4');await page.getByLabel('Default currency',{exact:false}).selectOption(currencyId)
   await page.getByLabel('Monetary display decimal places',{exact:false}).selectOption('4');
   await page.getByLabel('Pay social security fund',{exact:true}).check();await page.getByLabel('Social security fund employee rate',{exact:true}).fill('5.5');await page.getByLabel('Social security fund employer rate',{exact:true}).fill('13')
   await page.getByLabel('Mail host name',{exact:true}).fill('smtp.example.test');await page.getByLabel('Port number',{exact:true}).fill('587');await page.getByLabel('Primary email address',{exact:true}).fill('mail@example.test');await page.getByLabel('New SMTP password',{exact:true}).fill('browser-test-password')
   await page.getByRole('button',{name:'Create company profile',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor()
   const saved=profiles.get('Bearer tenant-token');check(saved.displayDecimals===4&&saved.companyName==='Browser Company'&&saved.firstMonthOfFiscalYear===4&&saved.defaultCurrencyId===currencyId&&saved.socialSecurityFundEmployeeRate===5.5&&saved.paySocialSecurityFund,'browser form saves grouped model fields')
   check(await page.getByLabel('Company name',{exact:false}).isDisabled(),'saved profile defaults to view mode')
   check(!(await page.locator('body').innerText()).includes('browser-test-password')&&!await page.getByLabel('New SMTP password',{exact:true}).count(),'saved password never redisplayed')
   check(await page.getByRole('button',{name:/delete/i}).count()===0,'no delete UI')
   await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('Company name',{exact:false}).fill('Discard me');await page.getByRole('button',{name:'Cancel',exact:true}).click()
   check(await page.getByLabel('Company name',{exact:false}).inputValue()==='Browser Company','cancel restores saved profile')
   await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('Address',{exact:true}).fill('Accra, Ghana');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor();check(profiles.get('Bearer tenant-token').address==='Accra, Ghana'&&profiles.get('Bearer tenant-token').hasEmailPassword,'browser update retains configured password')
   await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('Remove saved SMTP password',{exact:true}).check();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor();check(!profiles.get('Bearer tenant-token').hasEmailPassword,'browser explicit password removal')
   check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 console.log(`${checks} company profile HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
