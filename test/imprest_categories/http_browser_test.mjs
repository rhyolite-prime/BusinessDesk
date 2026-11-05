// Built Nuxt/Chromium with a controlled upstream; actual SQL is tested separately.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const uuid=n=>`90000000-0000-4000-8000-${String(n).padStart(12,'0')}`,unit=uuid(100),rows=[],seen=[]
let checks=0,unavailable=false,blocked=false
const check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const b=raw?JSON.parse(raw):null,url=new URL(req.url,'http://fixture'),path=url.pathname
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',requiresTwoFactorAuth:false,expiresIn:3600})
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:uuid(999),username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 seen.push({path,method:req.method,token:req.headers.authorization,body:b})
 if(path==='/api/v1/ledger/account-head-units')return send(200,[{id:unit,name:'Head office',code:'HQ'}])
 if(path==='/api/v1/ledger/default-gl-numbers'||path==='/api/v1/ledger/bank-accounts')return send(200,{data:[]})
 const base='/api/v1/ledger/imprest-categories'
 if(!path.startsWith(base))return send(404,null)
 if(unavailable)return send(503,null,{code:'database_error',message:'PRIVATE SQL'})
 const id=path.startsWith(base+'/')?path.slice(base.length+1):'',row=rows.find(x=>x.id===id&&!x.isDeleted)
 if(req.method==='GET')return id?(row?send(200,row):send(404,null,{code:'not_found'})):send(200,{data:rows.filter(x=>!x.isDeleted&&x.accountingUnitId===url.searchParams.get('accountingUnitId'))})
 if(id&&!row)return send(404,null,{code:'not_found'})
 if(id&&row.version!==b.version)return send(409,null,{code:'conflict'})
 if(req.method==='DELETE'){if(blocked)return send(409,null,{code:'conflict'});row.isDeleted=true;return send(200,{id,isDeleted:true})}
 if(rows.some(x=>!x.isDeleted&&x.id!==id&&x.name.toLowerCase()===b.name.trim().toLowerCase()))return send(409,null,{code:'conflict'})
 if(id){Object.assign(row,{name:b.name.trim(),version:row.version+1});return send(200,row)}
 const created={id:uuid(rows.length+1),...b,name:b.name.trim(),version:1};rows.push(created);return send(201,created)
})
await new Promise(r=>upstream.listen(0,'0.0.0.0',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='',origin=base){const response=await fetch(base+path,{method,headers:{origin,cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()}}try {
 const endpoint='/api/ledger/imprest-categories'
 let r=await call(endpoint);check(r.response.status===401,'anonymous proxy denied')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'admin',password:'test-only'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call(endpoint,'POST',{name:'Bad',accountingUnitId:unit},cookie,'https://attacker.example');check(r.response.status===403&&rows.length===0,'CSRF denied')
 r=await call(endpoint+'/invalid','GET',undefined,cookie);check(r.response.status===400,'invalid ID denied')
 r=await call(endpoint+'?accountingUnitId='+unit,'GET',undefined,cookie);check(r.response.status===200&&r.response.headers.get('cache-control')==='no-store','scoped list not cached')
 const require=createRequire((process.env.IMPREST_BROWSER_DEPS||'/tmp/gl-default-tools')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
 await page.goto(base+'/ledger/imprest-categories',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Imprest Categories',exact:true}).waitFor()
 check(await page.getByRole('columnheader',{name:'Default GL mapping',exact:true}).count()===0&&await page.getByText('Assigned as default',{exact:true}).count()===0,'default GL mapping indicators are not displayed');
 check(await page.getByRole('button',{name:'Add category',exact:true}).isDisabled(),'unit required before create')
 await page.getByLabel('Accounting unit',{exact:true}).getByRole('option',{name:'Head office',exact:true}).waitFor({state:'attached'});check(await page.getByLabel('Accounting unit',{exact:true}).getByRole('option').count()===2,'accounting-unit array populates the dropdown');await page.getByLabel('Accounting unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Add category',exact:true}).click();const modal=page.getByRole('dialog')
 await modal.getByLabel('Category name').fill(' Travel ');await modal.getByRole('button',{name:'Create category',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows[0].name==='Travel'&&rows[0].accountingUnitId===unit,'create persisted with selected unit')
 await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Accounting unit',{exact:true}).selectOption(unit);await page.getByRole('button',{name:'Edit Travel',exact:true}).click();check(await modal.getByLabel('Category name').inputValue()==='Travel','detail survives page reload')
 await modal.getByLabel('Category name').fill('Operations');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows[0].name==='Operations'&&rows[0].version===2,'versioned update persisted')
 await page.getByRole('button',{name:'Edit Operations',exact:true}).click();rows[0].version++;await modal.getByLabel('Category name').fill('Stale');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.getByRole('alert').waitFor();check(rows[0].name==='Operations','stale edit rejected');await modal.getByRole('button',{name:'Cancel',exact:true}).click()
 await page.getByPlaceholder('Search categories…').fill('missing');check(await page.getByRole('button',{name:'Edit Operations',exact:true}).count()===0,'directory search');await page.getByPlaceholder('Search categories…').fill('')
 blocked=true;await page.getByRole('button',{name:'Delete Operations',exact:true}).click();await modal.getByRole('button',{name:'Delete category',exact:true}).click();await modal.getByRole('alert').waitFor();check(!rows[0].isDeleted,'referenced category cannot be deleted');await modal.getByRole('button',{name:'Cancel',exact:true}).click();blocked=false
 // Reload list so deletion supplies the current version after stale-edit probe.
 await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Accounting unit',{exact:true}).selectOption(unit)
 await page.setViewportSize({width:375,height:850});await page.getByRole('button',{name:'Delete Operations',exact:true}).click();check(await modal.evaluate(el=>el.getBoundingClientRect().right<=innerWidth),'modal fits mobile');await modal.getByRole('button',{name:'Delete category',exact:true}).click();await modal.waitFor({state:'hidden'});check(rows[0].isDeleted,'versioned deletion persisted')
 unavailable=true;r=await call(endpoint+'?accountingUnitId='+unit,'GET',undefined,cookie);check(r.response.status===503&&!JSON.stringify(r.body).includes('PRIVATE'),'bounded API errors');unavailable=false
 check(!errors.length,'no browser runtime errors')
 } finally { await browser.close() }
 check(seen.every(r=>r.token==='Bearer tenant-token'),'all upstream requests authenticated')
 check(seen.some(r=>r.method==='POST')&&seen.some(r=>r.method==='PUT')&&seen.some(r=>r.method==='DELETE'),'proxy transported complete CRUD')
 console.log(`${checks} imprest category HTTP/browser checks passed`)
} finally { app.kill('SIGTERM');await new Promise(r=>upstream.close(r)) }
