// Transport/browser tests use a mock upstream; production SQL has its own PG suite.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import {parseLedgerAmount as amount,parseLedgerRate as rate,convertLedgerAmount as convert,formatLedgerAmount as fmt} from '../../frontend/app/features/ledger/money.ts'
const unit='30000000-0000-4000-8000-000000000001',unit2='30000000-0000-4000-8000-000000000002',account='50000000-0000-4000-8000-000000000001',account2='50000000-0000-4000-8000-000000000002',foreign='50000000-0000-4000-8000-000000000003',currency='40000000-0000-4000-8000-000000000001',usd='40000000-0000-4000-8000-000000000002',period='60000000-0000-4000-8000-000000000001'
const center='70000000-0000-4000-8000-000000000001',center2='70000000-0000-4000-8000-000000000002',inactive='40000000-0000-4000-8000-000000000003'
const choices={baseCurrencyId:currency,accounts:[{id:account,accountNumber:'100',name:'Cash',currencyId:currency},{id:account2,accountNumber:'200',name:'Capital',currencyId:currency},{id:foreign,accountNumber:'101',name:'USD cash',currencyId:usd}],currencies:[{id:currency,code:'GHS',name:'Cedi'},{id:usd,code:'USD',name:'US dollar'}],costCenters:[{id:center,name:'Head office'},{id:center2,name:'Branch'}],periods:[{id:period,period:202610,beginDate:'2026-10-01',endDate:'2026-10-31'}]}
let rows=[],next=0,checks=0,failure=false,schemaMissing=false,posts=0
const seen=[],check=(ok,label)=>{assert.ok(ok,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://test'),token=req.headers.authorization,u=url.searchParams.get('accountingUnitId')
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 seen.push({path:url.pathname,method:req.method,token,body,unit:u})
 if(url.pathname==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',expiresIn:3600,requiresTwoFactorAuth:false})
 if(url.pathname==='/api/v1/auth/me')return token==='Bearer tenant-token'?send(200,{userId:account,username:'tenant',accountId:'acme'}):send(401,null)
 if(token!=='Bearer tenant-token')return send(404,null)
 if(url.pathname==='/api/v1/ledger/accounting-units')return send(200,{data:[{id:unit,code:'HQ',name:'Head Office',isActive:true},{id:unit2,code:'BR',name:'Branch',isActive:true}],totalPages:1,totalCount:2})
 if(url.pathname==='/api/v1/shared/currencies')return send(200,{data:url.searchParams.get('pageNo')==='2'?[{id:usd,code:'USD',name:'US dollar from Shared Config',isActive:true}]:[{id:currency,code:'GHS',name:'Cedi from Shared Config',isActive:true},{id:inactive,code:'ZZZ',name:'Inactive currency',isActive:false}],totalPages:2,totalCount:3})
 if(!url.pathname.startsWith('/api/v1/ledger/journals'))return send(404,null)
 if(schemaMissing)return send(503,null,{code:'schema_not_ready',message:'PRIVATE schema'})
 if(failure)return send(503,null,{message:'PRIVATE SQL'})
 if(![unit,unit2].includes(u))return send(404,null)
 if(url.pathname.endsWith('/options'))return send(200,choices)
 if(url.pathname.endsWith('/next-number'))return send(200,{batchNumber:'GJ-preview',reserved:false})
 const id=url.pathname.split('/')[5],row=rows.find(r=>r.accountingUnitId===u&&r.id===id)
 if(req.method==='GET')return id?(row?send(200,row):send(404,null)):send(200,{items:rows.filter(r=>r.accountingUnitId===u),total:rows.filter(r=>r.accountingUnitId===u).length})
 if(url.pathname.endsWith('/post')){if(!row)return send(404,null);if(row.status==='posted')return send(200,row);if(row.status!=='draft'||row.version!==body.version)return send(409,null,{code:'conflict'});if(!body.periodId||row.totalDebit!==row.totalCredit)return send(400,null,{code:'validation_error'});row.status='posted';row.version++;posts++;return send(200,row)}
 if(req.method==='DELETE'){if(!row)return send(404,null);if(row.status!=='draft'||String(row.version)!==url.searchParams.get('version'))return send(409,null,{code:'conflict'});rows=rows.filter(r=>r!==row);return send(200,{id,isDeleted:true})}
 if(!body||body.accountingUnitId!==u||Object.keys(body).some(k=>!['accountingUnitId','batchDate','description','isMultiCurrency','periodId','lines','version'].includes(k)))return send(400,null,{code:'validation_error',message:'PRIVATE field'})
 if(req.method==='PUT'&&(!row||row.status!=='draft'||row.version!==body.version))return send(409,null,{code:'conflict'})
 if(!body.lines||body.lines.some(l=>Object.keys(l).some(k=>!['id','accountId','currencyId','costCenterId','exchangeRate','debit','credit','description','referenceNumber','chequeNumber','transactionDate'].includes(k))))return send(400,null,{code:'validation_error'})
 const lines=body.lines.map((l,i)=>({...l,id:l.id||`b0000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,accountName:choices.accounts.find(a=>a.id===l.accountId)?.name,accountNumber:'100',currencyCode:l.currencyId===usd?'USD':'GHS',baseDebit:fmt(convert(amount(l.debit),rate(l.exchangeRate))),baseCredit:fmt(convert(amount(l.credit),rate(l.exchangeRate)))}))
 const saved={...body,id:row?.id||`a0000000-0000-4000-8000-${String(++next).padStart(12,'0')}`,batchNumber:row?.batchNumber||`GJ-${next}`,status:'draft',version:(row?.version||0)+1,lines,totalDebit:fmt(lines.reduce((s,l)=>s+amount(l.baseDebit),0n)),totalCredit:fmt(lines.reduce((s,l)=>s+amount(l.baseCredit),0n))}
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
 let r=await call('/api/ledger/journals');check(r.response.status===401,'anonymous denied')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'tenant',password:'test-only'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0],query=`?accountingUnitId=${unit}`
 r=await call('/api/ledger/journals/exchange-rate?from=GHS&to=GHS');check(r.response.status===401,'rate lookup requires authentication')
 r=await call('/api/ledger/journals/exchange-rate?from=GHS&to=GHS','GET',undefined,cookie);check(r.response.status===200&&r.body.rate==='1'&&r.body.from==='GHS','authenticated same-currency lookup returns exactly 1')
 r=await call('/api/ledger/journals/exchange-rate?from=USD%2Fevil&to=GHS','GET',undefined,cookie);check(r.response.status===400,'rate lookup rejects non-symbol input')
 r=await call('/api/ledger/journals','GET',undefined,cookie);check(r.response.status===400,'unit required')
 r=await call('/api/ledger/journals/options'+query,'GET',undefined,cookie);check(r.body.baseCurrencyId===currency&&r.body.accounts.length===3,'real options')
 schemaMissing=true;r=await call('/api/ledger/journals'+query,'GET',undefined,cookie);check(r.response.status===503&&r.body.statusMessage.includes('012_journals.sql')&&!JSON.stringify(r.body).includes('PRIVATE'),'actionable migration error');schemaMissing=false
 failure=true;r=await call('/api/ledger/journals'+query,'GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'sanitized DB failure');failure=false
 const input={accountingUnitId:unit,batchDate:'2026-10-20',description:'Local API',isMultiCurrency:false,lines:[{accountId:account,currencyId:currency,exchangeRate:'1',debit:'1.123456',credit:'0'},{accountId:account2,currencyId:currency,exchangeRate:'1',debit:'0',credit:'1.123456'}]}
 r=await call('/api/ledger/journals','POST',input,cookie);check(r.response.status===200&&r.body.totalDebit==='1.123456','create decimal strings');const id=r.body.id
 check(r.response.headers.get('cache-control')==='no-store','no cache')
 r=await call(`/api/ledger/journals/${id}`+query,'GET',undefined,cookie);check(r.body.id===id,'get')
 r=await call(`/api/ledger/journals/${id}`,'PUT',{...input,version:1,description:'Updated'},cookie);check(r.body.version===2&&r.body.description==='Updated','update')
 r=await call(`/api/ledger/journals/${id}`,'PUT',{...input,version:1},cookie);check(r.response.status===409,'stale version conflict')
 r=await call('/api/ledger/journals','POST',input,cookie,'https://attacker.example');check(r.response.status===403,'mutation origin enforced')
 r=await call('/api/ledger/journals','POST',{...input,tenantId:unit},cookie);check(r.response.status===400&&!JSON.stringify(r.body).includes('PRIVATE'),'scope override rejected')
 r=await call(`/api/ledger/journals/${id}/post`,'POST',{accountingUnitId:unit,version:2,periodId:period},cookie);check(r.body.status==='posted'&&posts===1,'post action')
 r=await call(`/api/ledger/journals/${id}/post`,'POST',{accountingUnitId:unit,version:2,periodId:period},cookie);check(r.body.status==='posted'&&posts===1,'repeat post idempotent')
 r=await call(`/api/ledger/journals/${id}`+query+'&version=3','DELETE',undefined,cookie);check(r.response.status===409,'posted delete blocked')
 if(process.env.JOURNAL_BROWSER_DEPS){
  const require=createRequire(`${process.env.JOURNAL_BROWSER_DEPS}/package.json`),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
  const browser=await chromium.launch({args:binary.args,executablePath:await binary.executablePath(),headless:true});rows=[]
  try{
   const context=await browser.newContext({viewport:{width:1280,height:800}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
   let quoteMode='failure';const quoteCalls=[],pendingQuotes=[]
   await page.route('**/api/ledger/journals/exchange-rate?**',async route=>{
    const mode=quoteMode,url=new URL(route.request().url());quoteCalls.push(url)
    if(mode==='delayed')await new Promise(resolve=>pendingQuotes.push(resolve))
    await route.fulfill({status:mode==='failure'?503:200,contentType:'application/json',body:JSON.stringify(mode==='failure'?{statusMessage:'Unavailable'}:{from:url.searchParams.get('from'),to:url.searchParams.get('to'),rate:'12.5000000000',date:'2026-10-21',source:'Fawaz Ahmed Currency API'})})
   })
   await page.addInitScript(()=>{
    window.journalScrollCalls=[]
    const original=Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView=function(options){window.journalScrollCalls.push({label:this.getAttribute('aria-label'),behavior:options?.behavior});return original.call(this,options)}
   })
   await page.goto(base+'/ledger/journals');await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit);await page.getByRole('link',{name:'New journal',exact:true}).click()
   check((await page.getByLabel('Description',{exact:true}).inputValue()).includes('Local journal'),'new header description is automatically populated')
   await page.getByLabel('Batch date',{exact:true}).fill('2026-10-21')
   check((await page.getByLabel('Description',{exact:true}).inputValue()).includes('2026-10-21'),'suggested header description follows the batch date')
   const headerBoxes=await Promise.all(['Batch number','Header currency','Batch date','Description'].map(name=>page.getByLabel(name,{exact:name!=='Header currency'}).boundingBox()))
   check(Math.max(...headerBoxes.map(r=>r.y))-Math.min(...headerBoxes.map(r=>r.y))<2,'batch number, currency, date and description occupy one desktop row')
   await page.getByLabel('Description',{exact:true}).fill('Browser local');await page.getByLabel('Batch date',{exact:true}).fill('2026-10-20')
   check(await page.getByLabel('Batch number',{exact:true}).inputValue()==='GJ-preview'&&await page.getByLabel('Batch number',{exact:true}).evaluate(el=>el.readOnly),'header displays unreserved read-only batch preview')
   check((await page.getByLabel('Header currency',{exact:false}).locator(`option[value="${usd}"]`).textContent()).includes('from Shared Config')&&await page.getByLabel('Header currency',{exact:false}).locator(`option[value="${inactive}"]`).count()===0,'currency dropdown uses all Shared Config pages and excludes inactive rows')
   let first=page.getByRole('article',{name:'Journal line 1',exact:true}),second=page.getByRole('article',{name:'Journal line 2',exact:true})
   await first.getByLabel('GL account',{exact:false}).selectOption(account);await second.getByLabel('GL account',{exact:false}).selectOption(account2)
   check((await first.getByLabel('Line description',{exact:true}).inputValue()).includes('Cash'),'line description follows the selected GL account')
   await first.getByLabel('Reference',{exact:true}).fill('REF-KEEP')
   check((await first.getByLabel('Line description',{exact:true}).inputValue()).includes('REF-KEEP'),'suggested line description includes transaction reference')
   await first.getByLabel('Line description',{exact:true}).fill('Manual narration')
   await page.getByLabel('Header cost center',{exact:false}).selectOption(center)
   check(await first.getByLabel('Cost center',{exact:false}).inputValue()===center&&await second.getByLabel('Cost center',{exact:false}).inputValue()===center,'header cost center updates every existing line')
   await page.getByLabel('Header cost center',{exact:false}).selectOption({label:'Not configured'})
   check((await first.getByLabel('Cost center',{exact:false}).locator('option:checked').textContent()).trim()==='Not configured'&&(await second.getByLabel('Cost center',{exact:false}).locator('option:checked').textContent()).trim()==='Not configured','clearing header clears all line cost centers')
   await page.getByLabel('Header cost center',{exact:false}).selectOption(center)
   check(await first.getByText('Base debit:',{exact:false}).evaluate(el=>Number(getComputedStyle(el).fontWeight)>=700),'base debit labels and values are bold')
   check(await first.getByLabel('Currency',{exact:false}).evaluate(el=>el.tagName)==='SELECT','currency is a live catalog dropdown')
   check(await first.getByLabel('Currency',{exact:false}).locator(`option[value="${usd}"]`).count()===1&&await first.getByLabel('Currency',{exact:false}).isDisabled(),'local line currency uses Shared Config and follows the header')
   const amountFields=['Transaction date','Currency','Exchange rate','Debit','Credit']
   const amountBoxes=await Promise.all(amountFields.map(name=>first.getByLabel(name,{exact:name!=='Currency'}).boundingBox()))
   check(Math.max(...amountBoxes.map(r=>r.y))-Math.min(...amountBoxes.map(r=>r.y))<2,'date/currency/rate/debit/credit fit one desktop row')
   const detailBoxes=await Promise.all(['Cost center','Reference','Cheque number','Line description'].map(name=>first.getByLabel(name,{exact:name!=='Cost center'}).boundingBox()))
   check(Math.max(...detailBoxes.map(r=>r.y))-Math.min(...detailBoxes.map(r=>r.y))<2&&detailBoxes[0].y>amountBoxes[0].y,'detail controls share the next desktop row')
   await first.getByLabel('Debit',{exact:true}).fill('100');await second.getByLabel('Credit',{exact:true}).fill('25');await page.getByRole('button',{name:'Add line',exact:true}).click()
   let third=page.getByRole('article',{name:'Journal line 3',exact:true})
   check((await second.getByLabel('Line description',{exact:true}).inputValue()).includes('Credit'),'line description follows credit-side transaction keywords')
   check(await first.getByLabel('Line description',{exact:true}).inputValue()==='Manual narration'&&await page.getByLabel('Description',{exact:true}).inputValue()==='Browser local','manual header/detail descriptions survive other field changes')
   check(await page.evaluate(()=>window.journalScrollCalls.some(c=>c.label==='Journal line 3'&&c.behavior==='smooth')),'Add line requests smooth scrolling to the new row')
   await page.waitForFunction(()=>{const row=document.querySelector('article[aria-label="Journal line 3"]');const r=row?.getBoundingClientRect();return r&&r.top>=0&&r.top<window.innerHeight-40})
   check(await third.evaluate(el=>el.contains(document.activeElement)),'new row receives keyboard focus without an additional jump')

   check(await third.getByLabel('Cost center',{exact:false}).inputValue()===center,'new journal line inherits header cost center')
   check(await third.getByLabel('Credit',{exact:true}).inputValue()==='75.000000'&&await third.getByLabel('Debit',{exact:true}).inputValue()==='0.000000','add line fills missing credit exactly')
   await page.getByLabel('Multi-currency journal',{exact:true}).check();await third.getByLabel('Currency',{exact:false}).selectOption(usd)
   check(await third.getByLabel('GL account',{exact:false}).inputValue()===''&&await third.getByLabel('Credit',{exact:true}).inputValue()==='0','currency change waits for an explicit FX rate')
   await third.getByLabel('GL account',{exact:false}).selectOption(foreign);await third.getByLabel('Exchange rate',{exact:true}).fill('12.5')
   check(await third.getByLabel('Credit',{exact:true}).inputValue()==='6.000000','FX suggestion converts base deficit to transaction currency')
   await third.getByLabel('Currency',{exact:false}).selectOption(currency)
   check(await third.getByLabel('GL account',{exact:false}).inputValue()===''&&await third.getByLabel('Credit',{exact:true}).inputValue()==='75.000000','currency change clears incompatible GL and returns suggestion to base currency')
   await third.getByLabel('Currency',{exact:false}).selectOption(usd);await third.getByLabel('Exchange rate',{exact:true}).fill('12.5');await third.getByLabel('GL account',{exact:false}).selectOption(foreign)
   check(await third.getByLabel('Exchange rate',{exact:true}).inputValue()==='12.5','matching GL selection preserves an explicitly entered rate')
   await third.getByLabel('Credit',{exact:true}).fill('7');await third.getByLabel('Exchange rate',{exact:true}).fill('15');check(await third.getByLabel('Credit',{exact:true}).inputValue()==='7','manual amount edit disables further automatic replacement')
   await page.getByRole('button',{name:'Remove line 3',exact:true}).click();await page.getByLabel('Multi-currency journal',{exact:true}).uncheck()
   await page.emulateMedia({reducedMotion:'reduce'})
   await first.getByLabel('Debit',{exact:true}).fill('25');await second.getByLabel('Credit',{exact:true}).fill('100');await page.getByRole('button',{name:'Add line',exact:true}).click();third=page.getByRole('article',{name:'Journal line 3',exact:true})
   check(await third.getByLabel('Debit',{exact:true}).inputValue()==='75.000000'&&await third.getByLabel('Credit',{exact:true}).inputValue()==='0.000000','add line fills missing debit exactly');check(await page.evaluate(()=>window.journalScrollCalls.filter(c=>c.label==='Journal line 3').at(-1)?.behavior==='instant'),'reduced-motion preference disables smooth animation');await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Remove line 3',exact:true}).click()
   await first.getByLabel('Debit',{exact:true}).fill('100');await page.getByRole('button',{name:'Add line',exact:true}).click();third=page.getByRole('article',{name:'Journal line 3',exact:true})
   check(await third.getByLabel('Debit',{exact:true}).inputValue()==='0'&&await third.getByLabel('Credit',{exact:true}).inputValue()==='0','balanced journal adds an empty amount row');await page.getByRole('button',{name:'Remove line 3',exact:true}).click()
   for(const line of [first,second])await line.getByLabel('Transaction date',{exact:true}).fill('2026-10-20')
   await first.getByLabel('Debit',{exact:true}).fill('12.345678');await second.getByLabel('Credit',{exact:true}).fill('12.345678');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForURL(base+'/ledger/journals')
   check(rows.length===1&&rows[0].totalDebit==='12.345678','browser persisted local draft')
   await page.getByRole('link',{name:'Edit draft',exact:true}).click();check(await page.getByLabel('Batch number',{exact:true}).inputValue()===rows[0].batchNumber&&await page.getByLabel('Header cost center',{exact:false}).inputValue()===center,'edit header derives saved batch and common dimensions');await page.getByRole('article',{name:'Journal line 2',exact:true}).getByLabel('Cost center',{exact:false}).selectOption(center2);await page.getByLabel('Description',{exact:true}).fill('Edited in browser');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.waitForURL(base+'/ledger/journals');check(rows[0].description==='Edited in browser'&&rows[0].version===2,'browser edit draft')
   await page.getByRole('link',{name:'Edit draft',exact:true}).click();check(await page.getByLabel('Header cost center',{exact:false}).inputValue()==='__mixed__'&&await page.getByRole('article',{name:'Journal line 1',exact:true}).getByLabel('Cost center',{exact:false}).inputValue()===center,'mixed saved cost centers reopen without overwriting lines');await page.getByLabel('Header cost center',{exact:false}).selectOption(center2);await page.getByLabel('Description',{exact:true}).fill('Discarded');await page.getByRole('link',{name:'Cancel',exact:true}).click();check(rows[0].description==='Edited in browser','cancel does not write')
   await page.getByRole('button',{name:'Post journal',exact:true}).click();await page.getByRole('dialog').getByLabel('Posting period',{exact:false}).selectOption(period);await page.getByRole('button',{name:'Confirm final posting',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});check(rows[0].status==='posted','browser final posting');check(await page.getByRole('button',{name:'Delete journal',exact:true}).isDisabled(),'posted delete disabled')
   await page.getByRole('link',{name:'View',exact:true}).click();check(await page.getByRole('button',{name:'Save changes',exact:true}).count()===0,'posted editor read-only');await page.getByRole('link',{name:'Back to journals',exact:true}).click()
   await page.getByRole('link',{name:'New journal',exact:true}).click();await page.getByLabel('Description',{exact:true}).fill('FX draft');await page.getByLabel('Batch date',{exact:true}).fill('2026-10-20');await page.getByLabel('Multi-currency journal',{exact:true}).check()
   first=page.getByRole('article',{name:'Journal line 1',exact:true});second=page.getByRole('article',{name:'Journal line 2',exact:true});await first.getByLabel('GL account',{exact:false}).selectOption(foreign);await second.getByLabel('GL account',{exact:false}).selectOption(account2)
   check(await first.getByLabel('Exchange rate',{exact:true}).inputValue()==='','no fabricated FX rate')
   await first.getByText('Daily rate unavailable. Enter an exchange rate manually.',{exact:true}).waitFor();check(true,'failed rate lookup displays a manual-entry warning')
   await first.getByLabel('Exchange rate',{exact:true}).fill('12.5');await first.getByLabel('Debit',{exact:true}).fill('2.000001');await second.getByLabel('Credit',{exact:true}).fill('25.000013')
   await page.getByLabel('Header currency',{exact:false}).selectOption(usd)
   check(await first.getByLabel('Currency',{exact:false}).inputValue()===usd&&await second.getByLabel('Currency',{exact:false}).inputValue()===currency&&await first.getByLabel('Exchange rate',{exact:true}).inputValue()==='12.5','multi-currency header change preserves existing line currencies and rates')
   await page.getByLabel('Header cost center',{exact:false}).selectOption(center2)
   check(await first.getByLabel('Cost center',{exact:false}).inputValue()===center2&&await second.getByLabel('Cost center',{exact:false}).inputValue()===center2,'cost center propagates even in multi-currency mode')
   await page.getByRole('button',{name:'Add line',exact:true}).click();third=page.getByRole('article',{name:'Journal line 3',exact:true})
   check(await third.getByLabel('Currency',{exact:false}).inputValue()===usd&&await third.getByLabel('Cost center',{exact:false}).inputValue()===center2&&await third.getByLabel('Exchange rate',{exact:true}).inputValue()==='','new FX line inherits header defaults without a fabricated rate')
   await page.getByRole('button',{name:'Remove line 3',exact:true}).click()
   for(const line of [first,second])await line.getByLabel('Transaction date',{exact:true}).fill('2026-10-20')
   await page.setViewportSize({width:390,height:640});await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForURL(base+'/ledger/journals');check(rows[0].isMultiCurrency&&rows[0].totalDebit==='25.000013'&&rows[0].lines[0].currencyId===usd,'mobile FX draft exact')
   await page.getByRole('button',{name:'Delete journal',exact:true}).first().click();await page.getByRole('dialog').getByRole('button',{name:'Delete draft',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});check(rows.length===1&&rows[0].status==='posted','browser draft deletion')
   quoteMode='success';await page.setViewportSize({width:1280,height:800});await page.getByRole('link',{name:'New journal',exact:true}).click()
   first=page.getByRole('article',{name:'Journal line 1',exact:true});second=page.getByRole('article',{name:'Journal line 2',exact:true})
   await page.getByLabel('Header currency',{exact:false}).selectOption(usd)
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('article input[inputmode="decimal"]')).filter(el=>el.value==='12.5000000000').length===2)
   check(await first.getByLabel('Currency',{exact:false}).inputValue()===usd&&await second.getByLabel('Currency',{exact:false}).inputValue()===usd,'single-currency header selection sets all line currencies and fetched rates')
   check(await first.getByLabel('Currency',{exact:false}).isDisabled()&&await first.getByLabel('Currency',{exact:false}).locator(`option[value="${usd}"]`).count()===1&&await first.getByLabel('Currency',{exact:false}).locator(`option[value="${inactive}"]`).count()===0,'local line currency follows header and displays active Shared Config catalog')
   check((await first.getByRole('status').textContent()).includes('2026-10-21')&&(await first.getByRole('status').textContent()).includes('USD'),'quote source date and direction are visible')
   for(const line of [first,second]){await line.getByLabel('GL account',{exact:false}).selectOption(foreign);await line.getByLabel('Exchange rate',{exact:true}).fill('14');await line.getByLabel('Transaction date',{exact:true}).fill('2026-10-20')}
   await first.getByLabel('Debit',{exact:true}).fill('2');await second.getByLabel('Credit',{exact:true}).fill('2')
   await page.getByRole('button',{name:'Add line',exact:true}).click();third=page.getByRole('article',{name:'Journal line 3',exact:true});await page.waitForFunction(()=>document.querySelector('article[aria-label="Journal line 3"] input[inputmode="decimal"]').value==='12.5000000000');check(await third.getByLabel('Currency',{exact:false}).inputValue()===usd,'new row inherits header currency and fetches its suggested rate');await page.getByRole('button',{name:'Remove line 3',exact:true}).click()
   await page.getByLabel('Batch date',{exact:true}).fill('2026-10-20');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForURL(base+'/ledger/journals');check(rows[0].isMultiCurrency===false&&rows[0].totalDebit==='28.000000'&&rows[0].lines.every(l=>l.currencyId===usd&&l.exchangeRate==='14.0000000000'),'single foreign currency draft persists manual rate overrides')
   const beforeReopen=quoteCalls.length;await page.getByRole('link',{name:'Edit draft',exact:true}).click();first=page.getByRole('article',{name:'Journal line 1',exact:true});check(await first.getByLabel('Exchange rate',{exact:true}).inputValue()==='14.0000000000'&&quoteCalls.length===beforeReopen,'reopening draft does not overwrite saved rates with daily quotes');await page.getByRole('link',{name:'Cancel',exact:true}).click()
   await page.getByRole('link',{name:'New journal',exact:true}).click();await page.getByLabel('Multi-currency journal',{exact:true}).check();first=page.getByRole('article',{name:'Journal line 1',exact:true})
   quoteMode='delayed';const pendingRequest=page.waitForRequest(request=>request.url().includes('/exchange-rate?'));await first.getByLabel('Currency',{exact:false}).selectOption(usd);await pendingRequest
   await first.getByLabel('Exchange rate',{exact:true}).fill('13.75');let response=page.waitForResponse(response=>response.url().includes('/exchange-rate?'));pendingQuotes.splice(0).forEach(resolve=>resolve());await (await response).finished();check(await first.getByLabel('Exchange rate',{exact:true}).inputValue()==='13.75','manual edit wins over an in-flight quote')
   const nextRequest=page.waitForRequest(request=>request.url().includes('/exchange-rate?'));await first.getByLabel('Currency',{exact:false}).selectOption(usd);await nextRequest;await first.getByLabel('Currency',{exact:false}).selectOption(currency);response=page.waitForResponse(response=>response.url().includes('/exchange-rate?'));pendingQuotes.splice(0).forEach(resolve=>resolve());await (await response).finished();check(await first.getByLabel('Exchange rate',{exact:true}).inputValue()==='1'&&await first.getByLabel('Currency',{exact:false}).inputValue()===currency,'late foreign quote cannot overwrite a newer base currency selection')
   check(quoteCalls.every(url=>url.searchParams.get('from')==='USD'&&url.searchParams.get('to')==='GHS'),'all lookup requests convert transaction currency to accounting unit base')
   await page.getByRole('link',{name:'Cancel',exact:true}).click()
   await page.getByLabel('Accounting unit',{exact:false}).selectOption(unit2);await page.getByText('No journals found',{exact:true}).waitFor();check(await page.getByRole('link',{name:'View',exact:true}).count()===0,'scope switch clears records')
   check(errors.length===0,'no browser runtime errors')
  }finally{await browser.close()}
 }
 check(seen.some(x=>x.path==='/api/v1/shared/currencies')&&seen.filter(x=>x.path==='/api/v1/shared/currencies').every(x=>x.token==='Bearer tenant-token'),'Shared Config catalog requests forward bearer authentication')
 check(seen.filter(x=>x.path.startsWith('/api/v1/ledger/journals')).every(x=>x.token==='Bearer tenant-token'),'bearer on every CRUD/lookup/post request')
 console.log(`${checks} journal HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(resolve=>upstream.close(resolve))}
