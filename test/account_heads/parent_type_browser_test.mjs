// Built Nuxt/Chromium with a controlled upstream, not a live Drogon server.
import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
const uuid=n=>`92000000-0000-4000-8000-${String(n).padStart(12,'0')}`,unit=uuid(100)
const names=['Assets','Liabilities','Equity','Revenue','Expenses']
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
 const require=createRequire((process.env.HEAD_BROWSER_DEPS||'/tmp/head-browser')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
  const context=await browser.newContext();await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
  await page.goto(base+'/ledger/chart-of-accounts',{waitUntil:'domcontentloaded'});const add=page.getByRole('button',{name:'Add To Chart of Account',exact:false});await add.waitFor();await add.click()
  const parent=page.getByRole('button',{name:/^Parent head/}),type=page.getByRole('combobox',{name:/^Standard account type/})
  check(await type.inputValue()==='Asset'&&await type.isEnabled(),'root head classification is editable')
  await parent.click();check(await page.getByRole('listbox',{name:'Parent heads'}).getByRole('option').count()===6,'parent choices include all five types and nested active heads, not inactive heads');await page.getByRole('combobox',{name:'Search parent heads'}).press('Escape')
  const chooseParent=async id=>{
   await parent.click()
   if(!id){await page.getByRole('button',{name:'Top level (no parent)',exact:true}).click();return}
   await page.getByRole('combobox',{name:'Search parent heads'}).fill(rows.find(row=>row.id===id).name)
   await page.getByRole('listbox',{name:'Parent heads'}).getByRole('option').first().click()
  }
  for(const [id,name] of [[uuid(2),'Liability'],[uuid(3),'Equity'],[uuid(4),'Revenue'],[uuid(5),'Expense'],[uuid(1),'Asset'],[uuid(6),'Liability']]){
   await chooseParent(id);check(await type.inputValue()===name&&await type.isDisabled(),`selected parent automatically determines ${name} and prevents mismatches`)
  }
  await chooseParent('');check(await type.isEnabled(),'clearing the parent restores root account type selection');await type.selectOption('Revenue');check(await type.inputValue()==='Revenue','root type can be chosen manually')
  await chooseParent(uuid(2));await page.getByLabel('Account head name').fill('New inherited liability');await page.getByRole('button',{name:'Create head',exact:true}).click();await page.getByText('New inherited liability',{exact:true}).waitFor();check(rows.at(-1).accountType===1&&rows.at(-1).parentId===uuid(2),'create submits inherited parent type to the API')
  await add.click();check(await type.inputValue()==='Asset'&&await type.isEnabled()&&(await parent.textContent()).includes('Top level (no parent)'),'new root form resets inherited state');await page.getByRole('button',{name:'Cancel',exact:true}).click()
  check(seen.every(r=>r.token==='Bearer tenant-token'),'all requests forward bearer token');check(!errors.length,'no browser runtime errors')
 }finally{await browser.close()}
 console.log(`${checks} parent account-type browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
