import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {calculateVoucher} from '../../frontend/app/features/ledger/voucher-tax.ts'
let checks=0,fail=false,failEmployees=false,failCustomers=false
let stored=null, savedInput=null, catalogMode=false, catalogRows=[]
const seen=[],check=(v,label)=>{assert.ok(v,label);checks++}
const id=n=>`90000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const unit=id(1),bank=id(2),debit=id(3),supplier=id(4),center=id(5),usd=id(6),eur=id(7)
const upstream=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture'),p=url.pathname;seen.push({p,query:url.search,token:req.headers.authorization})
 const send=(code,result)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify({success:code<300,result,error:code>=300?{code:'database_error'}:undefined}))}
 if(p==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',requiresTwoFactorAuth:false,expiresIn:3600})
 if(p==='/api/v1/auth/me')return send(200,{userId:id(99),username:'admin',accountId:'acme'})
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null)
 if(p==='/api/v1/ledger/journals/options')return send(200,{periods:[{id:id(20),period:202610,beginDate:'2026-10-01',endDate:'2026-10-31'}]})
 if(p==='/api/v1/ledger/vouchers'&&req.method==='POST'){
  let raw='';for await(const chunk of req)raw+=chunk;savedInput=JSON.parse(raw)
  const summary=calculateVoucher(savedInput)
  stored={...savedInput,id:id(21),voucherNumber:savedInput.type==='customer-receipt'?'CRV-TEST':savedInput.type==='employee-payment'?'EPV-TEST':'SPV-TEST',batchNumber:savedInput.type==='customer-receipt'?'CRV-TEST':savedInput.type==='employee-payment'?'EPV-TEST':'SPV-TEST',payeeName:'API Supplier',version:1,status:'Draft',baseCurrencyCode:'USD',taxSummary:summary,totalAmount:summary.gross,netAmount:summary.net,retentionsTotal:summary.retained,foreignTotal:'96.000000',preparer:'Admin',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  return send(201,stored)
 }
 if(p===`/api/v1/ledger/vouchers/${id(21)}`&&req.method==='GET')return send(200,stored)
 if(p===`/api/v1/ledger/vouchers/${id(63)}`&&req.method==='GET')return send(200,{
  ...stored,id:id(63),type:'employee-payment',payeeId:id(61),currencyCode:'USD',exchangeRate:'1.0000000000',multiCurrency:false,
  lines:[{id:id(64),invoiceNumber:'',referenceNumber:'',accountId:debit,description:'Employee allocation',organizationUnitId:center,localAmount:'100.000000',foreignAmount:'0.000000',isWithhold:true}],
  retentions:[{id:id(65),accountId:debit,description:'Legacy retention',value:'25',isPercentage:false}],
 })
 if(p==='/api/v1/ledger/vouchers'&&req.method==='GET')return send(200,{items:stored?[stored]:[],total:stored?1:0})
 if(p===`/api/v1/ledger/vouchers/${id(21)}/post`){if(!stored)return send(404,null);stored={...stored,status:'Posted',version:stored.version+1,journalId:id(22)};return send(200,stored)}
 const paged=(data,totalPages=1)=>send(200,{data,totalPages,totalCount:data.length})
 if(p==='/api/v1/ledger/accounting-units')return paged([{id:unit,name:'USD office',code:'USD-HQ',baseCurrencyId:usd,isActive:true}])
 if(p==='/api/v1/shared/currencies')return paged([{id:usd,name:'US dollar',code:'USD',isActive:true},{id:eur,name:'Euro',code:'EUR',isActive:true}])
 if(p.startsWith('/api/v1/shared/customers/')&&catalogMode){
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw)
  if(req.method==='PUT'){catalogRows=catalogRows.map(c=>({...c,...body,version:2}));return send(200,catalogRows[0])}
  if(req.method==='DELETE'){catalogRows=[];return send(200,{deleted:true})}
 }
 if(p==='/api/v1/shared/customers'){
  if(catalogMode){
    if(req.method==='POST') { let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);catalogRows.push({...body,id:id(80),currencyCode:'USD',version:1});return send(201,catalogRows.at(-1)) }
    return send(200,{data:catalogRows,totalPages:1,totalCount:catalogRows.length})
  }
  if(failCustomers)return send(503,null)
  return send(200,{data:url.searchParams.get('pageNo')==='2'?[{id:id(71),name:'Live Customer',accountNumber:'DB-CUS-001',accountingUnitId:unit,receivableAccountId:debit,currencyId:usd,currencyCode:'USD',isActive:true,version:1},{id:id(72),name:'Inactive Customer',accountNumber:'OFF',accountingUnitId:unit,receivableAccountId:debit,currencyId:usd,currencyCode:'USD',isActive:false,version:1}]:[{id:id(73),name:'Other Unit Customer',accountNumber:'OTHER',accountingUnitId:id(74),receivableAccountId:debit,currencyId:usd,currencyCode:'USD',isActive:true,version:1}],totalPages:2,totalCount:3})
 }
 if(p==='/api/v1/shared/employees/options'){
  if(failEmployees)return send(503,null)
  return send(200,{data:url.searchParams.get('pageNo')==='2'?[{id:id(62),name:'Database Employee Two',employeeIdentifier:'DB-EMP-002',status:0}]:[{id:id(61),name:'Database Employee One',employeeIdentifier:'DB-EMP-001',status:0}],totalCount:2})
 }
 if(p==='/api/v1/shared/cost-centers')return send(200,{data:[{id:center,name:'API Operations',parentId:null}]})
 if(p==='/api/v1/shared/suppliers')return paged(url.searchParams.get('pageNo')==='2'?[{id:supplier,name:'API Supplier',accountNumber:'API-S001',accountingUnitId:unit,creditAccountId:debit,statusId:'active',currencyCode:'EUR'}]:[{id:id(40),name:'Other Unit Supplier',accountNumber:'OTHER',accountingUnitId:id(41),statusId:'active'}],2)
 if(p==='/api/v1/ledger/accounts'){
  if(fail)return send(503,null)
  return paged([{id:bank,accountNumber:'1010',accountName:'API Operating Bank',status:'active',accountType:0},{id:debit,accountNumber:'2100',accountName:'API Payables',status:'active',accountType:1}])
 }
 if(p==='/api/v1/ledger/bank-accounts')return send(200,{data:[{id:id(8),accountId:bank,bankName:'API Bank',accountNumber:'00042',isActive:true}]})
 send(404,null)
})
await new Promise(r=>upstream.listen(0,'0.0.0.0',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='',origin=base){const response=await fetch(base+path,{method,headers:{origin,cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()}}
try{
 let r=await call('/api/ledger/vouchers/exchange-rate?from=USD&to=USD');check(r.response.status===401,'quote endpoint requires authentication')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'admin',password:'test'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/ledger/vouchers/exchange-rate?from=USD&to=USD','GET',undefined,cookie);check(r.response.status===200&&r.body.rate==='1'&&r.response.headers.get('cache-control')==='no-store','authenticated base quote is exactly one and not cached in browser')
 const require=createRequire((process.env.VOUCHER_BROWSER_DEPS||'/tmp/supplier-tools')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try{
  const ctx=await browser.newContext();await ctx.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(5000)
  let quoteCalls=0
  await page.route('**/api/ledger/vouchers/exchange-rate?**',async route=>{quoteCalls++;await new Promise(r=>setTimeout(r,100));await route.fulfill({json:{rate:'1.2500000000',date:'2026-10-22',source:'test indicative'}})})
  await page.goto(base+'/ledger/vouchers/new/supplier-payment');await page.getByLabel('Supplier / payee',{exact:true}).locator('option').filter({hasText:'API Supplier'}).waitFor({state:'attached'})
  check(await page.getByLabel('Accounting unit',{exact:true}).inputValue()===unit,'live accounting unit selected')
  check(await page.getByLabel('Transaction currency',{exact:true}).inputValue()==='USD','base currency comes from API unit, not GHS constant')
  check(await page.getByLabel('Supplier / payee',{exact:true}).locator('option').filter({hasText:'Other Unit Supplier'}).count()===0,'supplier options are scoped to posting unit')
  await page.getByLabel('Supplier / payee',{exact:true}).selectOption(supplier);await page.waitForFunction(()=>document.querySelector('input[aria-label="Exchange rate"]').value==='1.2500000000')
  check(quoteCalls===1,'supplier currency selection fetches foreign-to-base quote')
  check(await page.getByLabel('Debit GL line 1',{exact:true}).inputValue()===debit,'supplier AP liability default is an actual chart account')
  await page.getByLabel('Bank / cash G/L',{exact:true}).selectOption(bank);await page.getByLabel('Organizational unit line 1',{exact:true}).selectOption(center)
  await page.getByPlaceholder('Invoice',{exact:true}).fill('INV-42');await page.getByPlaceholder('Reference',{exact:true}).fill('PO-19');await page.getByPlaceholder('0.00',{exact:true}).fill('10')
  const description=await page.getByLabel('Voucher description',{exact:true}).inputValue();check(description.includes('API Supplier')&&description.includes('INV-42')&&description.includes('PO-19')&&description.includes('EUR 10.000000'),'description includes supplier, amounts, currency and references')
  await page.getByLabel('Voucher description',{exact:true}).fill('My custom purpose');await page.getByPlaceholder('Reference',{exact:true}).fill('PO-20');check(await page.getByLabel('Voucher description',{exact:true}).inputValue()==='My custom purpose','manual description is preserved')
  await page.getByRole('button',{name:'Use suggested description',exact:true}).click();check((await page.getByLabel('Voucher description',{exact:true}).inputValue()).includes('PO-20'),'suggestion can be explicitly regenerated')
  await page.getByLabel('Transaction currency',{exact:true}).selectOption('USD');check(await page.getByLabel('Exchange rate',{exact:true}).inputValue()==='1.0000000000','returning to base currency restores exact rate one')
  await page.getByLabel('Transaction currency',{exact:true}).selectOption('EUR');await page.getByLabel('Exchange rate',{exact:true}).fill('1.4000000000');await page.waitForTimeout(200);check(await page.getByLabel('Exchange rate',{exact:true}).inputValue()==='1.4000000000','late quote never overwrites a manual rate')
  await page.route('**/api/ledger/vouchers/exchange-rate?**',route=>route.fulfill({status:503,json:{statusMessage:'Unavailable'}}));await page.getByRole('button',{name:'Refresh rate',exact:true}).click();await page.getByText('Rate unavailable. Enter a verified exchange rate manually; no fallback rate has been assumed.',{exact:true}).waitFor();check(await page.getByLabel('Exchange rate',{exact:true}).inputValue()==='','failed quote never reuses an unrelated rate')
  await page.getByLabel('Exchange rate',{exact:true}).fill('1.2500000000')
  await page.getByPlaceholder('0.00',{exact:true}).fill('96')
  await page.getByLabel('Withholding applies to line 1',{exact:true}).check()
  for(const [label,rate] of [['NHIL','2.5'],['GETFund levy','2.5'],['VAT','15'],['Income withholding','5'],['VAT withholding','7']]) {
    await page.getByLabel(`Enable ${label}`,{exact:true}).check()
    await page.getByLabel(`${label} rate`,{exact:true}).fill(rate)
  }
  await page.getByLabel('Income withholding credit account',{exact:true}).selectOption(debit)
  await page.getByLabel('VAT withholding credit account',{exact:true}).selectOption(debit)
  await page.getByRole('button',{name:'Add retention',exact:true}).click()
  await page.getByLabel('Retention credit GL 1',{exact:true}).selectOption(debit)
  await page.getByLabel('Retention rate or amount 1',{exact:true}).fill('10')
  check(await page.getByLabel('Posting period',{exact:true}).inputValue()===id(20),'open period comes from authenticated journal API')
  const journalSection=page.locator('section').filter({has:page.getByRole('heading',{name:'Proposed journal entry',exact:true})})
  check((await journalSection.innerText()).includes('Income withholding · 5%')&&(await journalSection.innerText()).includes('VAT withholding · 7%'),'proposed journal contains both statutory credit lines')
  await page.getByLabel('Enable CST',{exact:true}).check();await page.getByLabel('CST rate',{exact:true}).fill('5')
  await page.getByLabel('Enable COVID levy',{exact:true}).check();check(!await page.getByLabel('Enable CST',{exact:true}).isChecked(),'CST and COVID are mutually exclusive in UI')
  await page.getByLabel('Enable COVID levy',{exact:true}).uncheck()
  await page.getByRole('button',{name:'Save draft',exact:true}).click()
  await page.waitForURL('**/ledger/vouchers');await page.getByText('SPV-TEST',{exact:true}).first().waitFor()
  check(savedInput.taxes.vatWithholding.rate==='7'&&savedInput.periodId===id(20)&&savedInput.requestId,'save forwards tax configuration, period and stable request ID to live API')
  check(stored.netAmount==='96.000000'&&stored.taxSummary.base==='100.000000','live BFF response exposes full calculated totals without demo replacement')
  let result=await call(`/api/ledger/vouchers/${id(21)}/post`,'POST',{version:1},cookie,'https://untrusted.invalid')
  check(result.response.status===403,'voucher mutations reject a cross-origin request')
  result=await call(`/api/ledger/vouchers/${id(21)}/post`,'POST',{version:1},cookie)
  check(result.response.status===200&&result.body.status==='Posted'&&result.body.journalId===id(22),'posting BFF unwraps live server response')
  await page.goto(base+'/ledger/vouchers/new/supplier-payment')
  fail=true;await page.reload();await page.getByText('Voucher configuration could not be loaded:',{exact:false}).waitFor();check(await page.getByLabel('Bank / cash G/L',{exact:true}).locator('option').count()===1,'failed chart lookup never falls back to demo records')
  fail=false
  check(!seen.some(x=>x.p==='/api/v1/shared/employees/options'),'supplier voucher does not request employee biodata options')
  await page.goto(base+'/ledger/vouchers/new/employee-payment')
  const employeeSelect=page.getByLabel('Employee / payee',{exact:true})
  await employeeSelect.locator('option').filter({hasText:'Database Employee Two'}).waitFor({state:'attached'})
  check(await employeeSelect.locator('option').count()===3,'employee dropdown loads all API pages without demo employees')
  check(seen.some(x=>x.p==='/api/v1/shared/employees/options'&&x.query.includes('pageNo=2')),'employee totalCount pagination loads the second page')
  await employeeSelect.selectOption(id(62))
  check((await employeeSelect.locator('option:checked').innerText()).includes('DB-EMP-002'),'employee identifier and database name are shown')
  check(await page.getByRole('heading',{name:'Retentions',exact:true}).count()===0&&await page.getByRole('button',{name:'Add retention',exact:true}).count()===0,'employee vouchers have no retention controls')
  check(await page.getByText('Retentions · USD',{exact:true}).count()===0,'employee vouchers have no retention summary card')
  check(await page.getByRole('columnheader',{name:'Imprest ?',exact:true}).count()===1&&await page.getByRole('columnheader',{name:'Withhold?',exact:true}).count()===1,'employee lines show independent Imprest ? and Withhold? columns')
  await page.getByPlaceholder('0.00',{exact:true}).fill('100')
  await page.getByLabel('Imprest applies to line 1',{exact:true}).check()
  check(await page.getByLabel('Imprest applies to line 1',{exact:true}).isChecked(),'employee imprest checkbox is selectable')
  check(!await page.getByLabel('Withholding applies to line 1',{exact:true}).isChecked(),'checking Imprest does not check Withhold')
  await page.getByLabel('Withholding applies to line 1',{exact:true}).check()
  check(await page.getByLabel('Imprest applies to line 1',{exact:true}).isChecked(),'checking Withhold preserves Imprest')
  await page.getByLabel('Imprest applies to line 1',{exact:true}).uncheck()
  check(await page.getByLabel('Withholding applies to line 1',{exact:true}).isChecked(),'unchecking Imprest preserves Withhold')

  check((await page.getByText('Net paid · USD',{exact:true}).locator('..').innerText()).includes('100.00'),'employee payment has no retention or withholding deductions')
  await page.getByLabel('Bank / cash G/L',{exact:true}).selectOption(bank)
  await page.getByLabel('Debit GL line 1',{exact:true}).selectOption(debit)
  await page.getByLabel('Organizational unit line 1',{exact:true}).selectOption(center)
  await page.getByPlaceholder('0.00',{exact:true}).fill('120')
  await page.getByLabel('Imprest applies to line 1',{exact:true}).check()
  await page.getByLabel('Withholding tax type',{exact:true}).fill('Professional services')
  for(const [label,rate] of [['NHIL','2.5'],['GETFund levy','2.5'],['VAT','15'],['Income withholding','5'],['VAT withholding','7']]) {
    await page.getByLabel(`Enable ${label}`,{exact:true}).check()
    await page.getByLabel(`${label} rate`,{exact:true}).fill(rate)
  }
  await page.getByLabel('Income withholding credit account',{exact:true}).selectOption(debit)
  await page.getByLabel('VAT withholding credit account',{exact:true}).selectOption(debit)
  check((await page.getByText('Net paid · USD',{exact:true}).locator('..').innerText()).includes('108.00'),'employee inclusive tax extraction and both withholding deductions match legacy math')
  await page.getByLabel('Withholding applies to line 1',{exact:true}).uncheck()
  check((await page.getByText('Net paid · USD',{exact:true}).locator('..').innerText()).includes('120.00'),'imprest alone does not trigger withholding deductions')
  await page.getByLabel('Withholding applies to line 1',{exact:true}).check()
  await page.getByRole('button',{name:'Save draft',exact:true}).click()
  await page.waitForURL('**/ledger/vouchers');await page.getByText('EPV-TEST',{exact:true}).first().waitFor()
  check(savedInput.type==='employee-payment'&&savedInput.payeeId===id(62)&&savedInput.retentions.length===0,'employee save reaches authenticated live voucher API without retentions')
  check(savedInput.lines[0].isImprest&&savedInput.lines[0].isWithhold&&savedInput.taxType==='Professional services','employee save carries independent flags and tax classification')
  check(stored.netAmount==='108.000000','employee save preserves authoritative withholding totals')
  await page.goto(base+`/ledger/vouchers/new/employee-payment?id=${id(21)}`)
  await page.getByLabel('Withholding tax type',{exact:true}).waitFor()
  await page.getByText('Net paid · USD',{exact:true}).locator('..').filter({hasText:'108.00'}).waitFor()
  check(await page.getByLabel('Withholding tax type',{exact:true}).inputValue()==='Professional services'&&await page.getByLabel('Enable VAT',{exact:true}).isChecked(),'employee saved tax configuration is restored for editing')
  check(await page.getByLabel('Withholding applies to line 1',{exact:true}).isChecked()&&await page.getByLabel('Imprest applies to line 1',{exact:true}).isChecked(),'new employee draft restores both independent flags')
  await page.goto(base+`/ledger/vouchers/new/employee-payment?id=${id(63)}`)
  await page.getByLabel('Imprest applies to line 1',{exact:true}).waitFor()
  await page.getByText('Net paid · USD',{exact:true}).locator('..').filter({hasText:'100.00'}).waitFor()
  check(await page.getByLabel('Imprest applies to line 1',{exact:true}).isChecked(),'existing employee draft retains its line flag')
  check(!await page.getByLabel('Withholding applies to line 1',{exact:true}).isChecked(),'legacy Imprest value is not misread as new withholding')
  check(await page.getByText('Legacy retention',{exact:true}).count()===0&&(await page.getByText('Net paid · USD',{exact:true}).locator('..').innerText()).includes('100.00'),'legacy employee retention rows are discarded and unflagged amounts remain untaxed')
  failEmployees=true;await page.reload();await page.getByText('Voucher configuration could not be loaded:',{exact:false}).waitFor()
  check(await employeeSelect.locator('option').count()===1,'failed employee API leaves no stale or demo employees')
  failEmployees=false
  await page.goto(base+'/ledger/vouchers/new/customer-receipt')
  const customerSelect=page.getByLabel('Customer',{exact:true})
  await customerSelect.locator('option').filter({hasText:'Live Customer'}).waitFor({state:'attached'})
  check(await customerSelect.locator('option').count()===2,'receipt customers are live, active, paginated and posting-unit scoped without demos')
  check(seen.some(x=>x.p==='/api/v1/shared/customers'&&x.query.includes('pageNo=2')),'customer catalog follows pagination')
  await customerSelect.selectOption(id(71))
  check(await page.getByLabel('Credit GL line 1',{exact:true}).inputValue()===debit,'customer selection defaults the mapped receivable GL')
  check(await page.getByRole('heading',{name:'Taxes & withholding',exact:true}).count()===0&&await page.getByRole('heading',{name:'Retentions',exact:true}).count()===0&&await page.getByRole('columnheader',{name:'Withhold?',exact:true}).count()===0,'receipt has no tax, withholding, imprest or retention controls')
  await page.getByLabel('Bank / cash G/L',{exact:true}).selectOption(bank)
  await page.getByLabel('Organizational unit line 1',{exact:true}).selectOption(center)
  await page.getByPlaceholder('Invoice',{exact:true}).fill('CUS-INV-1')
  await page.getByPlaceholder('0.00',{exact:true}).fill('80')
  await page.getByRole('button',{name:'Add line',exact:true}).click()
  check(await page.getByLabel('Credit GL line 2',{exact:true}).inputValue()===debit&&await page.getByLabel('Organizational unit line 2',{exact:true}).inputValue()===center,'new receipt allocations inherit mapped AR and organization')
  await page.getByPlaceholder('0.00',{exact:true}).nth(1).fill('40')
  check((await page.getByText('Net received · USD',{exact:true}).locator('..').innerText()).includes('120.00'),'receipt sums every allocation without deductions')
  const receiptJournal=page.locator('section').filter({has:page.getByRole('heading',{name:'Proposed journal entry',exact:true})})
  check(await receiptJournal.locator('tbody tr').count()===2&&(await receiptJournal.innerText()).includes('Customer receivable settlement'),'receipt preview shows legacy two-line bank debit and AR credit')
  await page.getByRole('button',{name:'Save draft',exact:true}).click()
  await page.waitForURL('**/ledger/vouchers');await page.getByText('CRV-TEST',{exact:true}).first().waitFor()
  check(savedInput.type==='customer-receipt'&&savedInput.payeeId===id(71)&&savedInput.receiptDate&&savedInput.lines.length===2&&savedInput.retentions.length===0,'receipt save sends customer, receipt date and all source rows through live BFF')
  check(savedInput.lines.every(l=>!l.isWithhold&&!Object.hasOwn(l,'isImprest'))&&Object.values(savedInput.taxes).every(t=>!t.enabled),'receipt payload never carries hidden payment flags or enabled taxes')
  await page.goto(base+`/ledger/vouchers/new/customer-receipt?id=${id(21)}`)
  await page.getByText('Net received · USD',{exact:true}).locator('..').filter({hasText:'120.00'}).waitFor()
  check(await customerSelect.inputValue()===id(71)&&await page.getByLabel('Credit GL line 2',{exact:true}).inputValue()===debit,'receipt customer and all allocations restore for editing')
  result=await call(`/api/ledger/vouchers/${id(21)}/post`,'POST',{version:1},cookie)
  check(result.response.status===200&&result.body.status==='Posted','receipt posting BFF forwards live server response')
  failCustomers=true;await page.goto(base+'/ledger/vouchers/new/customer-receipt');await page.getByText('Voucher configuration could not be loaded:',{exact:false}).waitFor()
  check(await customerSelect.locator('option').count()===1,'customer load failure does not reuse stale or demo choices')
  check(errors.length===0,'no browser runtime errors')
 }finally{await browser.close()}
 check(seen.filter(x=>x.p.startsWith('/api/v1/shared/')||x.p.startsWith('/api/v1/ledger/')).every(x=>x.token==='Bearer tenant-token'),'every upstream lookup forwards bearer authentication')
 check(seen.some(x=>x.p.endsWith('/suppliers')&&x.query.includes('pageNo=2')),'supplier catalog traverses API pagination')
 console.log(`${checks} voucher lookup browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
