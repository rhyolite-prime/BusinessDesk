// Real built Nuxt browser + BFF, controlled backend. Financial SQL has a separate PG suite.
import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
const uuid=n=>`93000000-0000-4000-8000-${String(n).padStart(12,'0')}`,unit=uuid(1)
let fail=false,admin=true
const accounts=[{id:uuid(2),number:'10001',name:'Cash',type:0,category:'current_asset'},{id:uuid(3),number:'40001',name:'Sales',type:3,category:'revenue'}]
const lines=accounts.map((account,i)=>({id:uuid(10+i),accountId:account.id,accountName:account.name,type:account.type,batchId:uuid(20),batchNumber:'JV-POSTED',date:'2026-10-03',batchDate:'2026-10-03',description:'Posted sale',reference:'REF-1',source:'general_journal',costCenterId:null,costCenter:null,currency:'GHS',rate:'1.0000000000',debit:i?'0.000000':'25.123456',credit:i?'25.123456':'0.000000',transactionDebit:i?'0.000000':'25.123456',transactionCredit:i?'25.123456':'0.000000',opening:false}))
const snapshot={companyName:'Example Company',unitName:'HQ',currencyCode:'GHS',decimals:4,fiscalMonth:1,generatedAt:'2026-10-28 12:00 UTC',through:'2026-10-31',accounts,lines,budgets:[]}
let checks=0;const seen=[],check=(condition,label)=>{assert.ok(condition,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const path=new URL(req.url,'http://fixture').pathname,body=raw?JSON.parse(raw):null
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 seen.push({path,body,method:req.method})
 if(path==='/api/v1/auth/me')return send(200,{userId:uuid(999),username:'admin',accountId:'acme'})
 if(path==='/api/v1/shared/company-profile')return send(200,{companyName:'Example Company',displayDecimals:4})
 if(path==='/api/v1/ledger/accounting-units')return send(200,{data:[{id:unit,name:'HQ',code:'HQ',isActive:true}],totalPages:1})
 if(path==='/api/v1/ledger/financial-reports')return fail?send(503,null,{code:'database_error',message:'PRIVATE SQL'}):send(200,{...snapshot,canManageMappings:admin})
 if(path==='/api/v1/ledger/financial-reports/mappings'){
  if(!admin)return send(403,null,{code:'forbidden'})
  for(const change of body)accounts.find(a=>a.id===change.accountId).category=change.category
  return send(200,{saved:true})
 }
 send(404,null)
})
await new Promise(resolve=>upstream.listen(0,'0.0.0.0',resolve))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
try {
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}})})
 const require=createRequire('/tmp/picker-browser/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium'),{expect}=require('@playwright/test')
 const browser=await chromium.launch({args:binary.args.filter(arg=>arg!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
  const context=await browser.newContext(),page=await context.newPage();await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.goto(base+'/ledger/reports/financial?type=income-basic',{waitUntil:'networkidle'})
   await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByLabel('Through',{exact:true}).fill('2026-10-31');await page.getByRole('button',{name:'Generate report',exact:true}).click()
   await expect(page.getByRole('button',{name:'Export PDF',exact:true})).toBeEnabled();await expect(page.getByRole('document',{name:/Report page/})).toContainText('Net income');await expect(page.getByRole('document',{name:/Report page/})).toContainText('25.1235');checks+=2
   await page.getByLabel('Report',{exact:true}).selectOption('general-ledger');await expect(page.getByRole('document',{name:/Report page/})).toHaveCount(0);checks++
   await page.getByRole('button',{name:'Generate report',exact:true}).click();await expect(page.getByRole('button',{name:'Export Excel',exact:true})).toBeEnabled();await expect(page.getByRole('document',{name:/Report page/})).toContainText('Opening');checks++
   for(const [name,extension] of [['Export PDF','.pdf'],['Export Excel','.xlsx'],['Export Word','.docx']]){
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const download=await downloadPromise;check(download.suggestedFilename().endsWith(extension),'download '+extension)
   }
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no page horizontal overflow')
  }
  await page.goto(base+'/ledger/reports/mappings',{waitUntil:'networkidle'});const category=page.getByLabel('Classification for 40001 Sales');await category.selectOption('other_income');await page.getByRole('button',{name:'Save 1 changed mappings'}).click();await expect(page.locator('p[role="status"]')).toContainText('Report mappings saved');check(accounts[1].category==='other_income','mapping writes exact account id')
  check(seen.some(request=>request.path.endsWith('/mappings')&&request.method==='PUT'&&request.body[0].accountId===uuid(3)),'mapping BFF forwards ID and method')
  admin=false;await page.reload({waitUntil:'networkidle'});await expect(category).toBeDisabled();checks++
  fail=true;await page.goto(base+'/ledger/reports/financial',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Generate report',exact:true}).click();await expect(page.getByRole('alert')).not.toContainText('PRIVATE SQL');await expect(page.getByRole('alert')).toContainText('unavailable');checks++
  check(!errors.length,'no browser runtime errors: '+errors.join('; '))
  const noSession=await fetch(base+`/api/ledger/financial-reports?accountingUnitId=${unit}&through=2026-10-31`);check(noSession.status===401,'missing session denied')
  const csrf=await fetch(base+`/api/ledger/financial-reports/mappings?accountingUnitId=${unit}&through=2026-10-31`,{method:'PUT',headers:{cookie:'bd_access=tenant-token',origin:'https://evil.invalid','content-type':'application/json'},body:'[]'});check(csrf.status===403,'cross-origin mapping write denied')
 }finally{await browser.close()}
 console.log(`${checks} financial report browser/export/proxy checks passed`)
}finally{app.kill();upstream.close()}
