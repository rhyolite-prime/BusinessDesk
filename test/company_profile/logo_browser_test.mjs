// Built Nuxt/BFF + Chromium; controlled upstream. SQL/crypto tested separately.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { emptyCompanyProfile } from '../../frontend/app/features/ledger/company-profile-fields.ts'
const uuid=n=>`91000000-0000-4000-8000-${String(n).padStart(12,'0')}`
let checks=0,profile={...emptyCompanyProfile(),id:uuid(1),companyName:'Example Company',country:uuid(2),countryName:'Ghana',defaultCurrencyId:uuid(3),hasEmailPassword:false}
const seen=[],check=(value,label)=>{assert.ok(value,label);checks++}
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const body=raw?JSON.parse(raw):null,url=new URL(req.url,'http://fixture'),path=url.pathname
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:uuid(4),username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 seen.push({path,method:req.method,body,token:req.headers.authorization})
 if(path==='/api/v1/shared/currencies')return send(200,{data:[{id:uuid(3),name:'Ghana cedi',code:'GHS',isActive:true}],totalPages:1})
 if(path==='/api/v1/shared/company-profile'){
  if(req.method==='GET')return send(200,profile)
  if(req.method==='PUT'){profile={...profile,...body};return send(200,profile)}
 }
 return send(404,null,{code:'not_found'})
})
await new Promise(r=>upstream.listen(0,'0.0.0.0',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='',origin=base){const response=await fetch(base+path,{method,headers:{origin,cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()}}

try {
 const require=createRequire((process.env.LOGO_BROWSER_DEPS||'/tmp/unit-browser')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args.filter(x=>x!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
  await page.goto(base+'/ledger/shared-config/company-profile',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor()
  check(await page.getByLabel('Country ID',{exact:true}).count()===0&&await page.getByLabel('Company logo URL',{exact:true}).count()===0,'legacy country ID and logo URL inputs are hidden')
  await page.getByRole('button',{name:'Edit profile',exact:true}).click()
  const file=page.getByLabel('Company logo',{exact:true})
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const x=c.getContext('2d');for(let i=0;i<100;i++)for(let j=0;j<100;j++){x.fillStyle=`rgb(${i*2},${j*2},${(i*j)%255})`;x.fillRect(i,j,1,1)}return c.toDataURL('image/png')})
  await file.setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});await page.getByAltText('Company logo preview').waitFor()
  check(await page.getByAltText('Company logo preview').evaluate(el=>el.complete&&el.naturalWidth===100),'chosen image is decoded and previewed')
  check(!profile.companyLogoUrl,'selection is staged until profile save')
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor();check(profile.companyLogoUrl===png&&png.length>2048,'uploaded image travels through authenticated profile save, beyond legacy URL length')
  check(profile.country===uuid(2),'hidden country identifier is preserved')
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor();check(await page.getByAltText('Company logo preview').getAttribute('src')===png,'saved logo preview survives reload')
  await page.getByRole('button',{name:'Edit profile',exact:true}).click()
  await file.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await page.getByRole('alert').filter({hasText:'Choose a PNG or JPEG'}).waitFor();check(await page.getByAltText('Company logo preview').getAttribute('src')===png,'SVG rejected without replacing current logo')
  await file.setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(262145)});check(await page.getByRole('alert').filter({hasText:'256 KB'}).count()>0,'oversized images rejected')
  await file.setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await page.getByRole('alert').filter({hasText:'not a readable image'}).waitFor();check(await page.getByAltText('Company logo preview').getAttribute('src')===png,'invalid image contents rejected')
  await page.getByRole('button',{name:'Remove logo',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();check(await page.getByAltText('Company logo preview').getAttribute('src')===png,'cancel restores saved logo')
  await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByRole('button',{name:'Remove logo',exact:true}).click();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).waitFor();check(profile.companyLogoUrl===''&&await page.getByAltText('Company logo preview').count()===0,'logo removal persists')
  check(!errors.length,'no browser runtime errors');check(seen.every(r=>r.token==='Bearer tenant-token'),'profile/image payloads use authenticated transport')
 } finally {await browser.close()}
 console.log(`${checks} company logo HTTP/browser checks passed`)
} finally {app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
