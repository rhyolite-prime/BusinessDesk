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
let checks=0;const seen=[],check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://fixture'),path=url.pathname
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:uuid(999),username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 seen.push({path,body,method:req.method,token:req.headers.authorization})
 if(path==='/api/v1/ledger/account-head-units')return send(200,[{id:unit,name:'Head office',code:'HQ'}])
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
async function call(path,method='GET',body,cookie='',origin=base){const response=await fetch(base+path,{method,headers:{origin,cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()}}
try {
 const require=createRequire((process.env.CONTROL_BROWSER_DEPS||'/tmp/control-browser')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
  const context=await browser.newContext();await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
  await page.goto(base+'/ledger/account-controls',{waitUntil:'domcontentloaded'});const add=page.getByRole('button',{name:'Add control header'});await add.click()
  const min=page.getByLabel('Minimum account no.'),max=page.getByLabel('Maximum account no.')
  const chooseHead=async id=>{
   await page.getByRole('button',{name:/^Chart of account/}).click()
   await page.getByRole('combobox',{name:'Search chart heads'}).fill(rows.find(row=>row.id===id).name)
   await page.getByRole('listbox',{name:'Chart heads'}).getByRole('option').first().click()
  }
  check(await page.getByLabel('Account header name').count()===0,'manual name field is absent')
  await chooseHead(uuid(6));await min.fill('2000');await max.fill('2099');await page.getByRole('button',{name:'Create control',exact:true}).click();await page.getByRole('heading',{name:'New account control',exact:true}).waitFor({state:'hidden'})
  check(controls[0].accountHeaderName==='Liabilities / Current liabilities','create stores complete selected hierarchy path')
  check(controls[0].accountGroupId===uuid(6)&&controls[0].accountingUnitId===unit,'selected head and accounting unit are preserved')
  const edit=page.getByRole('button',{name:'Edit account control',exact:true});await edit.click();check(await page.getByLabel('Account header name').count()===0,'edit also hides name field')
  await chooseHead(uuid(4));await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Edit account control',exact:true}).waitFor({state:'hidden'});check(controls[0].accountHeaderName==='Revenue','changing selection replaces old hierarchy name with root name')
  controls[0].accountHeaderName='Legacy manually entered name';await page.reload();await edit.click();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('heading',{name:'Edit account control',exact:true}).waitFor({state:'hidden'});check(controls[0].accountHeaderName==='Revenue','editing legacy control derives name even without changing selection')
  await add.click();await chooseHead(uuid(6));await chooseHead(uuid(3));await min.fill('3000');await max.fill('3099');await page.getByRole('button',{name:'Create control',exact:true}).click();await page.getByRole('heading',{name:'New account control',exact:true}).waitFor({state:'hidden'});check(controls[1].accountHeaderName==='Equity','switching head before create submits latest resolved name')
  check(seen.every(r=>r.token==='Bearer tenant-token'),'API requests remain authenticated');check(!errors.length,'no browser runtime errors')
 }finally{await browser.close()}
 console.log(`${checks} control hierarchy-name browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
