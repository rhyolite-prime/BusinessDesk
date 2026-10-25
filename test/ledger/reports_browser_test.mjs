// Built Nuxt/Chromium with a controlled upstream, not a live Drogon server.
import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
const uuid=n=>`92000000-0000-4000-8000-${String(n).padStart(12,'0')}`,unit=uuid(100)
const names=['Assets','Liabilities','Equity','Revenue','Expenses']
const controls=[]
const rows=names.map((name,accountType)=>({id:uuid(accountType+1),name,accountType,parentId:null,isActive:true,accountingUnitId:unit}))
rows.push({id:uuid(6),name:'Current liabilities',accountType:1,parentId:uuid(2),isActive:true,accountingUnitId:unit},{id:uuid(7),name:'Inactive head',accountType:0,parentId:null,isActive:false,accountingUnitId:unit})
const accounts=[]
for(let i=0;i<70;i++){
 rows.push({id:uuid(1000+i),name:`Head ${i}`,accountType:i%5,parentId:null,isActive:true,accountingUnitId:unit})
 controls.push({id:uuid(2000+i),accountGroupId:uuid(1000+i),parentAccountHeaderId:null,accountHeaderName:`Control ${i}`,minAccount:i*100,maxAccount:i*100+99,isActive:true})
 accounts.push({id:uuid(3000+i),accountingUnitId:unit,accountHeaderId:uuid(2000+i),accountGroupId:uuid(1000+i),accountNumber:String(i*100+1),accountName:`Account ${i}`,accountType:i%5,currencyId:null,status:'active',allowManualPosting:true,isControlAccount:false})
}
accounts.splice(0)
for(let i=0;i<450;i++)accounts.push({id:uuid(10000+i),accountingUnitId:unit,accountHeaderId:uuid(2000+i%3),accountGroupId:uuid(1000+i%3),accountNumber:String(10000+i),accountName:`Report account ${i}`,accountType:i%5,currencyId:i%2?null:uuid(5000),status:i%10===0?'inactive':'active',allowManualPosting:true,isControlAccount:false})
let missingCompany=false,failAccounts=false
let checks=0;const seen=[],check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://fixture'),path=url.pathname
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:uuid(999),username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 seen.push({path,body,method:req.method,token:req.headers.authorization})
 if(path==='/api/v1/shared/company-profile')return missingCompany?send(404,null):send(200,{companyName:'Example Company'})
 if(path===`/api/v1/ledger/accounting-units/${unit}`)return send(200,{id:unit,name:'Head office',baseCurrencyId:uuid(5000),timeZone:'Africa/Accra'})
 if(path==='/api/v1/ledger/accounts'&&failAccounts)return send(503,null,{code:'unavailable'})
 if(path==='/api/v1/ledger/account-head-units')return send(200,[{id:unit,name:'Head office',code:'HQ'}])
 if(path==='/api/v1/ledger/accounting-unit-currencies')return send(200,[{id:uuid(5000),code:'GHS',name:'Ghana cedi'}])
 if(path==='/api/v1/ledger/accounts'){
  if(req.method==='POST'){const control=controls.find(c=>c.id===body.accountHeaderId);const row={id:uuid(8000),...body,accountGroupId:control.accountGroupId,accountType:rows.find(h=>h.id===control.accountGroupId).accountType};accounts.push(row);return send(201,row)}
  return send(200,{data:accounts.slice((Number(url.searchParams.get('pageNo')||1)-1)*200,Number(url.searchParams.get('pageNo')||1)*200),totalCount:accounts.length,totalPages:3})
 }
 if(path.startsWith('/api/v1/ledger/accounts/'))return send(200,accounts.find(a=>a.id===path.split('/').at(-1)))
 const controlBase='/api/v1/ledger/account-controls'
 if(path===controlBase||path.startsWith(controlBase+'/')){
  const id=path.slice(controlBase.length+1)
  if(req.method==='GET')return id?send(200,controls.find(r=>r.id===id)):send(200,{data:controls,totalCount:controls.length,totalPages:1})
  if(req.method==='POST'){const row={id:uuid(200+controls.length),...body};controls.push(row);return send(201,row)}
  if(req.method==='PUT'){const row=controls.find(r=>r.id===id);Object.assign(row,body);return send(200,row)}
 }
 const base='/api/v1/ledger/account-heads',id=path.startsWith(base+'/')?path.slice(base.length+1):''
 if(!path.startsWith(base))return send(404,null)
 if(req.method==='GET')return id?send(200,rows.find(r=>r.id===id)):send(200,{data:rows,totalCount:rows.length,totalPages:1})
 if(req.method==='POST'||req.method==='PUT'){
  const parent=rows.find(r=>r.id===body.parentId)
  if(parent&&parent.accountType!==body.accountType)return send(400,null,{code:'validation_error'})
  if(id){Object.assign(rows.find(r=>r.id===id),body);return send(200,rows.find(r=>r.id===id))}
  const row={id:uuid(rows.length+1),...body};rows.push(row);return send(201,row)
 }
 return send(404,null)
})
await new Promise(r=>upstream.listen(0,'0.0.0.0',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
try {
 const require=createRequire((process.env.PICKER_BROWSER_DEPS||'/tmp/picker-browser')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium'),{expect}=require('@playwright/test')
 const {mkdir,copyFile}=await import('node:fs/promises');await mkdir('/tmp/businessdesk-report-tests',{recursive:true})
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
  const context=await browser.newContext({acceptDownloads:true});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000)
  await page.goto(base+'/ledger/reports/chart-of-accounts',{waitUntil:'networkidle'})
  const viewer=page.getByRole('region',{name:'Report viewer'}),text=viewer.getByRole('document'),pageNumber=page.getByRole('spinbutton',{name:'Report page number'})
  await expect(text).toContainText('Example Company');await expect(text).toContainText('CHART OF ACCOUNTS');await expect(viewer).toContainText('450 records');checks++
  check(seen.filter(r=>r.path==='/api/v1/ledger/accounts'&&r.method==='GET').length===3,'all API pages fetched for reporting')
  const total=Number(await pageNumber.getAttribute('max'));check(total>1,'PDF paginates a large report')
  await page.getByRole('button',{name:'Last page',exact:true}).click();await expect(text).toContainText(`Page ${total} of ${total}`);await expect(text).toContainText('Example Company');checks++
  await pageNumber.fill('9999');await pageNumber.press('Enter');await expect(pageNumber).toHaveValue(String(total));checks++
  await page.getByRole('button',{name:'First page',exact:true}).click();await expect(text).toContainText(`Page 1 of ${total}`);checks++
  await page.getByLabel('Zoom',{exact:false}).selectOption('1.25');await expect(text).toContainText('Example Company');checks++
  for(const [label,ext] of [['Export PDF','pdf'],['Export Excel','xlsx'],['Export Word','docx']]){
   const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const download=await downloadPromise;await copyFile(await download.path(),`/tmp/businessdesk-report-tests/chart-of-accounts.${ext}`);check(download.suggestedFilename().endsWith('.'+ext),`real ${ext} export downloads`)
  }
  await page.setViewportSize({width:390,height:844});await page.getByLabel('Zoom',{exact:false}).selectOption('fit');await expect(text).toContainText('Example Company');checks++
  const type=page.getByLabel('Account type',{exact:false}),status=page.getByRole('combobox',{name:/^Status/})
  await type.selectOption('0');await expect(viewer).toContainText('90 records');await expect(text).toContainText('CHART OF ACCOUNTS');checks++
  await status.selectOption('active');await status.selectOption('inactive');await expect(viewer).toContainText('45 records');await expect(text).toContainText('Status: inactive');checks++
  await page.getByPlaceholder('Account number, name or control…').fill('never-exists');await expect(text).toContainText('No accounts match the selected filters.');checks++
  await page.getByPlaceholder('Account number, name or control…').fill('');await status.selectOption('');await type.selectOption('')
  failAccounts=true;await page.getByRole('button',{name:'Refresh report',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(viewer).toHaveCount(0);checks++
  failAccounts=false;missingCompany=true;await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(text).toContainText('Company profile not configured');checks++
  check(seen.every(r=>r.token==='Bearer tenant-token'),'all report API calls authenticated')
  check(!errors.length,`no browser runtime errors: ${errors.join('; ')}`)
 }finally{await browser.close()}
 console.log(`${checks} report browser/export checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
