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
rows.push({id:uuid(9001),name:'Nested liability',accountType:1,parentId:uuid(6),isActive:true,accountingUnitId:unit})
let checks=0;const seen=[],check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://fixture'),path=url.pathname
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:uuid(999),username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 seen.push({path,body,method:req.method,token:req.headers.authorization})
 if(path==='/api/v1/ledger/account-head-units')return send(200,[{id:unit,name:'Head office',code:'HQ'}])
 if(path==='/api/v1/ledger/accounting-unit-currencies')return send(200,[{id:uuid(5000),code:'GHS',name:'Ghana cedi'}])
 if(path==='/api/v1/ledger/accounts'){
  if(req.method==='POST'){const control=controls.find(c=>c.id===body.accountHeaderId);const row={id:uuid(8000),...body,accountGroupId:control.accountGroupId,accountType:rows.find(h=>h.id===control.accountGroupId).accountType};accounts.push(row);return send(201,row)}
  return send(200,{data:accounts,totalCount:accounts.length,totalPages:1})
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
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
  const context=await browser.newContext();await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.goto(base+'/ledger/chart-of-accounts',{waitUntil:'networkidle'})
   const table=page.getByRole('table'),nested=table.getByText('Nested liability',{exact:true}),search=page.getByPlaceholder('Search account heads…')
   await expect(nested).toBeVisible();checks++
   await page.getByRole('button',{name:'Collapse Current liabilities',exact:true}).click();await expect(nested).toHaveCount(0);checks++
   const root=page.getByRole('button',{name:'Collapse Liabilities',exact:true});await root.focus();await page.keyboard.press('Enter');await expect(table.locator('span').filter({hasText:/^Current liabilities$/})).toHaveCount(0);checks++
   await page.getByRole('button',{name:'Expand Liabilities',exact:true}).click();await expect(table.locator('span').filter({hasText:/^Current liabilities$/})).toBeVisible();await expect(nested).toHaveCount(0);checks++
   await page.getByRole('button',{name:'Expand all',exact:true}).click();await expect(nested).toBeVisible();checks++
   await page.getByRole('button',{name:'Collapse all',exact:true}).click();await expect(nested).toHaveCount(0);await expect(table.locator('span').filter({hasText:/^Current liabilities$/})).toHaveCount(0);checks++
   await search.fill('Nested liability');await expect(nested).toBeVisible();await expect(table.locator('span').filter({hasText:/^Current liabilities$/})).toBeVisible();await expect(page.getByRole('button',{name:'Collapse all',exact:true})).toBeDisabled();checks++
   await search.fill('');await expect(nested).toHaveCount(0);checks++
   const type=page.locator('select').filter({has:page.locator('option',{hasText:'All account types'})});await type.selectOption('Liability');await expect(nested).toBeVisible();checks++
   await type.selectOption('');await expect(nested).toHaveCount(0);checks++
   await page.locator('main').getByRole('button',{name:'Add To Chart of Account',exact:true}).click();await page.getByRole('button',{name:/^Parent head/}).click();await page.getByRole('combobox',{name:'Search parent heads'}).fill('Nested liability');await expect(page.getByRole('listbox',{name:'Parent heads'}).getByRole('option')).toHaveCount(1);checks++
   await page.getByRole('combobox',{name:'Search parent heads'}).press('Escape');await page.getByRole('button',{name:'Cancel',exact:true}).click()
  }
  check(!errors.length,'no browser runtime errors')
 }finally{await browser.close()}
 console.log(`${checks} account-head expand/collapse browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
