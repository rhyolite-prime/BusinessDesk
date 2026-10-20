// Built Nuxt/BFF + Chromium checks against a strict mock upstream, not live Drogon/JWT.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const unit='30000000-0000-4000-8000-000000000001',unit2='30000000-0000-4000-8000-000000000002',account='50000000-0000-4000-8000-000000000001',center='a0000000-0000-4000-8000-000000000001'
const choices={accounts:[{id:account,accountNumber:'100',name:'Cash'}],costCenters:[{id:center,name:'Live center'}]}
let rows=[],next=0,checks=0,failure=false,used=false
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const decimal=value=>{const [w,f='']=value.split('.');return w+'.'+f.padEnd(6,'0')}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test'),token=req.headers.authorization,u=url.searchParams.get('accountingUnitId')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token,body,unit:u})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:body.accountId==='other'?'other-token':'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/me')return ['Bearer tenant-token','Bearer other-token'].includes(token)?send(200,{userId:account,username:'tenant',accountId:'acme'}):send(401,null)
 if(token!=='Bearer tenant-token')return send(404,null)
 if(url.pathname==='/api/v1/ledger/accounting-units')return send(200,{data:[{id:unit,code:'HQ',name:'Head Office',isActive:true},{id:unit2,code:'BR',name:'Branch',isActive:true}],totalPages:1,totalCount:2})
 if(!url.pathname.startsWith('/api/v1/ledger/budgets'))return send(404,null)
 if(failure)return send(503,null,{message:'PRIVATE SQL error'})
 if(![unit,unit2].includes(u))return send(404,null)
 if(url.pathname.endsWith('/options'))return send(200,choices)
 const id=url.pathname.split('/')[5],row=rows.find(r=>r.accountingUnitId===u&&r.id===id)
 if(req.method==='GET')return id?(row?send(200,row):send(404,null)):send(200,{data:rows.filter(r=>r.accountingUnitId===u),totalCount:rows.filter(r=>r.accountingUnitId===u).length})
 if(req.method==='DELETE'){if(!row)return send(404,null);if(used||row.status!=='draft')return send(409,null,{code:'conflict'});rows=rows.filter(r=>r!==row);return send(200,{id,isDeleted:true})}
 if(!body||body.accountingUnitId!==u||Object.keys(body).some(k=>!['accountingUnitId','accountId','costCenterId','organizationUnitId','beginDate','endDate','details','status'].includes(k)))return send(400,null,{code:'validation_error',message:'PRIVATE field error'})
 if(req.method==='PUT'&&!row)return send(404,null)
 if(row&&(used||row.status!=='draft'))return send(409,null,{code:'conflict'})
 if(body.details?.some(d=>typeof d.budgetAmount!=='string'||typeof d.revisedAmount!=='string'||d.id))return send(400,null,{code:'validation_error'})
 const saved={costCenterId:null,organizationUnitId:null,organizationUnitName:'',status:'draft',...row,...body,accountNumber:'100',accountName:'Cash',id:row?.id||`a0000000-0000-4000-8000-${String(++next).padStart(12,'0')}`}
 saved.costCenterName=saved.costCenterId?'Live center':''
 saved.details=saved.details.map((d,i)=>({...d,id:d.id||`b0000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,budgetAmount:decimal(d.budgetAmount),revisedAmount:decimal(d.revisedAmount)}))
 if(rows.some(r=>r!==row&&r.accountingUnitId===u&&r.accountId===saved.accountId&&r.costCenterId===saved.costCenterId&&r.beginDate===saved.beginDate&&r.endDate===saved.endDate))return send(409,null,{code:'conflict'})
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
}try{
 let r=await call('/api/ledger/budgets');check(r.response.status===401,'anonymous denied')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0],query=`?accountingUnitId=${unit}`
 r=await call('/api/ledger/budgets','GET',undefined,cookie);check(r.response.status===400,'unit required')
 r=await call('/api/ledger/budgets/options'+query,'GET',undefined,cookie);check(r.body.accounts[0].id===account&&r.body.costCenters[0].id===center,'real scoped lookups forwarded')
 const input={accountingUnitId:unit,accountId:account,beginDate:'2026-01-01',endDate:'2026-01-01',details:[{year:2026,month:1,budgetAmount:'99999999999999.999999',revisedAmount:'0.000001'}]}
 r=await call('/api/ledger/budgets','POST',input,cookie);check(r.response.status===200&&r.body.accountName==='Cash'&&r.body.details[0].budgetAmount==='99999999999999.999999','persist header/details with exact string transport');const id=r.body.id
 check(r.response.headers.get('cache-control')==='no-store','no caching')
 r=await call('/api/ledger/budgets','POST',input,cookie);check(r.response.status===409,'duplicate conflict')
 r=await call(`/api/ledger/budgets/${id}`+query,'GET',undefined,cookie);check(r.response.status===200&&r.body.details[0].revisedAmount==='0.000001','get details')
 r=await call(`/api/ledger/budgets/${id}`,'PUT',{accountingUnitId:unit,costCenterId:center},cookie);check(r.body.costCenterId===center&&r.body.details[0].budgetAmount==='99999999999999.999999','partial update retains amounts')
 r=await call(`/api/ledger/budgets/${id}?accountingUnitId=${unit2}`,'GET',undefined,cookie);check(r.response.status===404,'wrong unit denied')
 r=await call(`/api/ledger/budgets/${id}?accountingUnitId=${unit2}`,'PUT',{accountingUnitId:unit},cookie);check(r.response.status===400,'body/query mismatch denied')
 r=await call('/api/ledger/budgets/not-a-uuid'+query,'DELETE',undefined,cookie);check(r.response.status===400,'invalid record ID denied')
 r=await call(`/api/ledger/budgets/${id}`,'PUT',{...input,tenantId:unit},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'scope spoof denied and errors sanitized')
 r=await call('/api/ledger/budgets','POST',input,cookie,'https://attacker.example');check(r.response.status===403,'cross-origin write denied')
 used=true;r=await call(`/api/ledger/budgets/${id}`+query,'DELETE',undefined,cookie);check(r.response.status===409,'composite deletion conflict');used=false
 failure=true;r=await call('/api/ledger/budgets'+query,'GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'SQL errors sanitized');failure=false
 r=await call(`/api/ledger/budgets/${id}`+query,'DELETE',undefined,cookie);check(r.response.status===200&&rows.length===0,'delete')
 const otherLogin=await call('/api/auth/login','POST',{accountId:'other',usernameOrEmail:'tenant',password:'test-only'}),otherCookie=otherLogin.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/ledger/budgets'+query,'GET',undefined,otherCookie);check(r.response.status===404,'other tenant denied')
 if(process.env.BANK_BROWSER_DEPS){
  const require=createRequire(`${process.env.BANK_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true});rows=[]
  try{
   const context=await browser.newContext({viewport:{width:1280,height:800}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/ledger/budgets');await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit)
   const add=page.getByRole('button',{name:'Create budget',exact:true});await add.click();const modal=page.getByRole('dialog');await modal.waitFor()
   await modal.getByLabel('GL account',{exact:false}).selectOption(account);await modal.getByLabel('Begin month',{exact:true}).fill('2026-01');await modal.getByLabel('End month',{exact:true}).fill('2026-03')
   await modal.getByLabel('Allocation amount',{exact:true}).fill('0.01');await modal.getByLabel('Allocation method',{exact:true}).selectOption('total');await modal.getByRole('button',{name:'Apply allocation',exact:true}).click()
   check(await modal.getByLabel('Budget amount 2026-01',{exact:true}).inputValue()==='0.003334'&&await modal.getByLabel('Budget amount 2026-03',{exact:true}).inputValue()==='0.003333','tiny total allocated exactly, never negative')
   await modal.getByLabel('Revised amount 2026-01',{exact:true}).fill('99999999999999.999999')
   await page.setViewportSize({width:390,height:640});const scroller=modal.getByTestId('budget-form-scroll');await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight});check(await scroller.evaluate(el=>el.scrollTop>0),'mobile modal scrolls independently of footer')
   await modal.getByRole('button',{name:'Save budget',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows.length===1&&rows[0].details.length===3&&rows[0].details[0].revisedAmount==='99999999999999.999999','browser persists exact header/details')
   check((await page.getByText('99,999,999,999,999.999999',{exact:true}).count())>0,'large monetary display preserves six decimals')
   await page.setViewportSize({width:1280,height:800});await page.getByRole('button',{name:'Edit budget',exact:true}).click();await modal.getByLabel('Cost center',{exact:false}).selectOption(center);await modal.getByLabel('Budget amount 2026-01',{exact:true}).fill('12.345678')
   used=true;await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.getByRole('alert').waitFor();check(rows[0].costCenterId===null&&await modal.isVisible(),'failed save keeps editor and does not mutate local persisted row');used=false
   await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows[0].costCenterId===center&&rows[0].details[0].budgetAmount==='12.345678'&&rows[0].details[0].revisedAmount==='99999999999999.999999','browser update preserves other exact amounts')
   await page.reload();await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit);await page.getByRole('button',{name:'Edit budget',exact:true}).waitFor();check(await page.getByText('12.352344',{exact:true}).count()>0,'persisted schedule survives reload')
   await page.getByRole('button',{name:'Edit budget',exact:true}).click();await modal.getByLabel('Budget amount 2026-01',{exact:true}).fill('999');await modal.getByRole('button',{name:'Cancel',exact:true}).click();check(rows[0].details[0].budgetAmount==='12.345678','cancel never writes')
   await page.getByLabel('Search budgets',{exact:true}).fill('missing');await page.getByText('No budgets found',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Edit budget',exact:true}).count()===0,'search filters persisted rows');await page.getByLabel('Search budgets',{exact:true}).fill('')
   await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit2);await page.getByText('No budgets found',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Edit budget',exact:true}).count()===0,'unit switch clears old rows');await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit);await page.getByRole('button',{name:'Edit budget',exact:true}).waitFor()
   rows[0].status='approved';await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('table').first().getByText('approved',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Edit budget',exact:true}).isDisabled()&&await page.getByRole('button',{name:'Delete budget',exact:true}).isDisabled(),'approved schedules read-only')
   await page.getByRole('button',{name:'Copy budget',exact:true}).click();check(await modal.getByRole('button',{name:'Save budget',exact:true}).isVisible(),'approved schedule can be copied as new draft');await modal.getByRole('button',{name:'Cancel',exact:true}).click()
   rows[0].status='draft';await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('table').first().getByText('draft',{exact:true}).waitFor()
   await page.getByRole('button',{name:'Delete budget',exact:true}).click();used=true;await page.getByRole('button',{name:'Delete schedule',exact:true}).click();await page.getByRole('alertdialog').getByRole('alert').waitFor();check(rows.length===1,'deletion conflict retains row');used=false
   await page.getByRole('button',{name:'Delete schedule',exact:true}).click();await page.getByText('No budgets found',{exact:true}).waitFor();check(rows.length===0,'browser deletes persisted schedule')
   failure=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('alert').waitFor();check(await add.isDisabled(),'load failure disables creation without demo fallback');failure=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await add.waitFor()
   check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 check(seen.filter(x=>x.path.startsWith('/api/v1/ledger/budgets')).every(x=>['Bearer tenant-token','Bearer other-token'].includes(x.token)),'bearer forwarded on all API operations including lookups')
 console.log(`${checks} budget HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
