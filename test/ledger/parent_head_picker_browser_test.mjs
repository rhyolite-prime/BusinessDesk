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
   await page.setViewportSize(viewport);await page.goto(base+'/ledger/chart-of-accounts',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Add To Chart of Account',exact:true}).click()
   const trigger=page.getByRole('button',{name:/^Parent head/}),search=page.getByRole('combobox',{name:'Search parent heads'}),list=page.getByRole('listbox',{name:'Parent heads'}),type=page.getByRole('combobox',{name:/^Standard account type/})
   await expect(trigger).toContainText('Top level');await expect(type).toBeEnabled();checks++
   await trigger.click();await expect(search).toBeFocused();checks++
   check(await list.getByRole('option').count()>=76,'active parent heads beyond first 20 available')
   const groups=await list.getByRole('group').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));check(JSON.stringify(groups)===JSON.stringify(['Asset','Liability','Equity','Revenue','Expense']),'parent groups follow account-type order')
   check((await list.boundingBox()).height<=256,'parent list bounded on desktop and mobile')
   await search.fill('no-such-parent');await expect(list.getByRole('status')).toHaveText('No matching parent heads.');checks++
   await page.getByRole('button',{name:'Top level (no parent)',exact:true}).click();await expect(type).toBeEnabled();checks++
   await trigger.click();await search.fill('Liability Current');await expect(list.getByRole('option')).toHaveCount(viewport.width===1440?1:2);await search.press('Enter');await expect(trigger).toContainText('Liabilities / Current liabilities');await expect(type).toHaveValue('Liability');await expect(type).toBeDisabled();checks++
   await trigger.click();await search.press('Escape');await expect(trigger).toBeFocused();checks++
   if(viewport.width===1440){
    await page.getByLabel('Account head name').fill('Picker child');await page.getByRole('button',{name:'Create head',exact:true}).click();await expect(page.getByRole('heading',{name:'New account head',exact:true})).toHaveCount(0)
    check(rows.at(-1).parentId===uuid(6)&&rows.at(-1).accountType===1,'create submits parent and inherited type')
    await page.getByRole('row').filter({has:page.getByText('Liabilities',{exact:true})}).first().getByRole('button',{name:'Edit account head',exact:true}).click()
    await trigger.click();await search.fill('Liabilities');await expect(list.getByRole('option')).toHaveCount(0);checks++
    await search.fill('Picker child');await expect(list.getByRole('option')).toHaveCount(0);checks++
    await search.fill('Equity');await list.getByRole('option',{name:'Equity',exact:true}).click();await expect(type).toHaveValue('Equity');checks++
   }
   await page.getByRole('button',{name:'Cancel',exact:true}).click()
  }
  check(!errors.length,'no browser runtime errors')
 }finally{await browser.close()}
 console.log(`${checks} searchable parent-head picker browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
