// Built Nuxt + Chromium checks against a controlled upstream. Production service SQL is tested separately.
import http from 'node:http'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
let checks=0,schemaMissing=false,failCommit=false,counter=0
const seen=[],groups=[],suppliers=[]
const check=(value,label)=>{assert.ok(value,label);checks++}
const uuid=n=>`80000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const unit=uuid(100),currency=uuid(200),credit=uuid(301),debit=uuid(302),vat=uuid(303),irs=uuid(304)
const labels={[credit]:'AP liability',[debit]:'Purchases debit',[vat]:'VAT input',[irs]:'IRS withholding'}
const enrich=b=>({...b,supplierGroupName:groups.find(g=>g.id===b.supplierGroupId)?.name||'',statusName:{active:'Active',on_hold:'On hold',inactive:'Inactive'}[b.statusId],currencyName:'Ghana cedi',currencyCode:'GHS',creditAccountName:labels[b.creditAccountId],debitAccountName:labels[b.debitAccountId],vatAccountName:labels[b.vatAccountId],irsAccountName:labels[b.irsAccountId],accountingUnitId:unit,accountingUnitName:'Head office',balance:'0.000000'})
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c
 const b=raw?JSON.parse(raw):null,url=new URL(req.url,'http://fixture'),path=url.pathname
 seen.push({path,kind:url.searchParams.get('kind'),method:req.method,body:b,token:req.headers.authorization})
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status<300,result,error}))}
 if(path==='/api/v1/auth/tenant-login')return send(200,{token:'tenant-token',requiresTwoFactorAuth:false,expiresIn:3600})
 if(path==='/api/v1/auth/me')return req.headers.authorization==='Bearer tenant-token'?send(200,{userId:uuid(999),username:'admin',accountId:'acme'}):send(401,null)
 if(req.headers.authorization!=='Bearer tenant-token')return send(401,null,{code:'unauthorized'})
 if(!path.startsWith('/api/v1/shared/supplier'))return send(404,null)
 if(schemaMissing)return send(503,null,{code:'schema_not_ready',message:'PRIVATE SQL'})
 const group=path.startsWith('/api/v1/shared/supplier-groups'),rows=group?groups:suppliers,base=`/api/v1/shared/${group?'supplier-groups':'suppliers'}`,id=path.startsWith(base+'/')?path.slice(base.length+1):'',query=url.searchParams.get('query')||'',page=+(url.searchParams.get('pageNo')||1),size=+(url.searchParams.get('pageSize')||20)
 if(id==='options'){
  const kind=url.searchParams.get('kind')
  let data=kind==='groups'?groups.filter(x=>!x.isDeleted).map(x=>({id:x.id,label:x.name})):kind==='currencies'?[{id:currency,label:'GHS · Ghana cedi'}]:Object.entries(labels).filter(([id])=>kind!=='credits'||id===credit).map(([id,label])=>({id,label:`Head office · ${label}`,unitId:unit}))
  data=data.filter(x=>x.label.toLowerCase().includes(query.toLowerCase()))
  return send(200,{data:data.slice((page-1)*size,page*size),totalCount:data.length,totalPages:Math.ceil(data.length/size)})
 }
 const existing=rows.find(x=>x.id===id&&!x.isDeleted)
 if(req.method==='GET'){
  if(id)return existing?send(200,group?existing:enrich(existing)):send(404,null,{code:'not_found'})
  const filtered=rows.filter(x=>!x.isDeleted&&`${x.name} ${x.accountNumber||''} ${x.email||''}`.toLowerCase().includes(query.toLowerCase()))
  return send(200,{data:filtered.slice((page-1)*size,page*size).map(x=>group?x:enrich(x)),totalCount:filtered.length,totalPages:Math.ceil(filtered.length/size)})
 }
 if(req.method==='DELETE'){
  if(!existing)return send(404,null,{code:'not_found'})
  if(group&&suppliers.some(x=>x.supplierGroupId===id&&!x.isDeleted))return send(409,null,{code:'conflict'})
  existing.isDeleted=true;return send(200,{id,isDeleted:true})
 }
 if(failCommit)return send(503,null,{code:'database_error',message:'PRIVATE SQL'})
 if(Object.keys(b).some(k=>['balance','tenantId','createdByUserId','supplierGroupName','currencyName'].includes(k)))return send(400,null,{code:'validation_error'})
 if(req.method==='PUT'){
  if(!existing)return send(404,null,{code:'not_found'})
  if(existing.version!==b.version)return send(409,null,{code:'conflict'})
  Object.assign(existing,b,{version:b.version+1});return send(200,group?existing:enrich(existing))
 }
 if(rows.some(x=>(group?x.name.toLowerCase()===b.name.toLowerCase():x.accountNumber.toLowerCase()===b.accountNumber.toLowerCase())&&!x.isDeleted))return send(409,null,{code:'conflict'})
 const row={...b,id:uuid(++counter),version:1};rows.push(row);return send(201,group?row:enrich(row))
})
await new Promise(r=>upstream.listen(0,'0.0.0.0',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'0.0.0.0',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NODE_ENV:'production',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
let log='';app.stderr.on('data',d=>log+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(log)),30000);app.stdout.on('data',d=>{log+=d;if(log.includes('Listening on')){clearTimeout(timer);resolve()}});app.on('exit',code=>{clearTimeout(timer);reject(new Error(`App exit ${code}: ${log}`))})})
async function call(path,method='GET',body,cookie='',origin=base){const response=await fetch(base+path,{method,headers:{origin,cookie,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()}}
try{
 let r=await call('/api/shared/suppliers');check(r.response.status===401,'session required for supplier API')
 const login=await call('/api/auth/login','POST',{accountId:'acme',usernameOrEmail:'admin',password:'test-only'}),cookie=login.response.headers.getSetCookie().find(c=>c.startsWith('bd_access=')).split(';')[0]
 r=await call('/api/shared/supplier-groups','POST',{name:'malicious'},cookie,'https://attacker.example');check(r.response.status===403&&groups.length===0,'cross-origin supplier group write rejected')
 r=await call('/api/shared/suppliers','POST',{},cookie,'https://attacker.example');check(r.response.status===403,'cross-origin supplier write rejected')
 r=await call('/api/shared/suppliers/not-a-uuid','GET',undefined,cookie);check(r.response.status===400,'proxy rejects invalid record IDs')
 r=await call('/api/shared/suppliers','GET',undefined,cookie);check(r.response.status===200&&r.response.headers.get('cache-control')==='no-store','authenticated list is not cached')
 schemaMissing=true;r=await call('/api/shared/suppliers','GET',undefined,cookie);check(r.response.status===503&&r.body.statusMessage.includes('023_drop_customer_supplier_rates.sql')&&!JSON.stringify(r.body).includes('PRIVATE'),'missing migration returns actionable sanitized message');schemaMissing=false
 const require=createRequire((process.env.SUPPLIERS_BROWSER_DEPS||'/tmp/supplier-tools')+'/package.json'),{chromium}=require('playwright-core'),binary=require('@sparticuz/chromium').default||require('@sparticuz/chromium')
 const browser=await chromium.launch({args:binary.args.filter(arg=>arg!=='--single-process'),executablePath:await binary.executablePath(),headless:true})
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'bd_access',value:'tenant-token',url:base,httpOnly:true}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000)
  await page.goto(base+'/ledger/shared-config/supplier-groups',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Supplier groups',exact:true}).waitFor();check(await page.getByRole('link',{name:'Suppliers',exact:true}).count()>0,'supplier configuration is linked in application navigation')
  await page.getByRole('button',{name:'Add supplier group',exact:true}).click();let modal=page.getByRole('dialog');await modal.getByLabel('Name').fill('Local vendors');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(groups.length===1&&groups[0].name==='Local vendors','group create persists through Nuxt transport')
  await page.getByRole('button',{name:'Edit Local vendors',exact:true}).click();await modal.getByLabel('Name').fill('Domestic vendors');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(groups[0].version===2&&groups[0].name==='Domestic vendors','group read/update uses persisted record and version')
  await page.goto(base+'/ledger/shared-config/suppliers',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Suppliers',exact:true}).waitFor();await page.getByRole('button',{name:'Add supplier',exact:true}).click()
  await modal.getByLabel('Name',{exact:false}).fill('Accra Supplies');await modal.getByLabel('Account number').fill('SUP-001');await modal.getByLabel('Email',{exact:true}).fill('supplier@example.test');await modal.getByLabel('Supplier group',{exact:true}).selectOption(groups[0].id);await modal.getByLabel('Currency',{exact:true}).selectOption(currency)
  await modal.getByLabel('Credit GL account (AP liability)',{exact:true}).selectOption(credit);await modal.getByLabel('Debit GL account',{exact:true}).selectOption(debit);await modal.getByLabel('VAT GL account',{exact:true}).selectOption(vat);await modal.getByLabel('IRS GL account',{exact:true}).selectOption(irs);await modal.getByLabel('Credit limit').fill('98765.123456')
  check(await modal.getByLabel('Buying rate').count()===0&&await modal.getByLabel('Selling rate').count()===0,'currency rate fields are absent from the modal');
  check(await modal.getByLabel('Credit GL account (AP liability)',{exact:true}).locator('option').count()>2,'primary posting dropdown lists actual GL accounts, not only a category-filtered subset');
  check(seen.some(r=>r.kind==='accounts')&&!seen.some(r=>r.kind==='credits'||r.kind==='receivables'),'all posting-default lookups request GL account records');
  check(await modal.getByLabel('Balance',{exact:false}).getAttribute('readonly')!==null,'balance is visibly read-only')
  await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(suppliers.length===1&&!('buyingRate' in suppliers[0])&&!('sellingRate' in suppliers[0])&&suppliers[0].creditLimit==='98765.123456'&&!('balance' in suppliers[0]),'supplier form submits exact decimals and no editable balance or derived fields')
  await page.getByRole('button',{name:'View Accra Supplies',exact:true}).click();check(await modal.getByLabel('Account number').inputValue()==='SUP-001'&&await modal.getByLabel('Account number').isDisabled()&&await modal.getByRole('button',{name:'Save changes',exact:true}).count()===0,'supplier details show persisted values in read-only mode');await modal.getByRole('button',{name:'Close',exact:true}).click();await modal.waitFor({state:'hidden'})
  await page.getByRole('button',{name:'Edit Accra Supplies',exact:true}).click();await modal.getByLabel('Contact person',{exact:true}).fill('Ama Mensah');suppliers[0].version++;await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.getByRole('alert').waitFor();check(suppliers[0].contactPerson==='','stale edit is rejected without overwriting supplier');await modal.getByRole('button',{name:'Cancel',exact:true}).click();await modal.waitFor({state:'hidden'})
  await page.getByRole('button',{name:'Edit Accra Supplies',exact:true}).click();await modal.getByLabel('Contact person',{exact:true}).fill('Ama Mensah');await modal.getByLabel('Status',{exact:true}).selectOption('on_hold');await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.waitFor({state:'hidden'});check(suppliers[0].contactPerson==='Ama Mensah'&&suppliers[0].statusId==='on_hold','fresh edit saves contact and status')
  await page.getByLabel('Search suppliers',{exact:true}).fill('no match');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('No suppliers found',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Edit Accra Supplies',exact:true}).count()===0,'server-side search displays honest empty state');await page.getByLabel('Search suppliers',{exact:true}).fill('SUP-001');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:'Edit Accra Supplies',exact:true}).waitFor()
  await page.setViewportSize({width:375,height:850});await page.getByRole('button',{name:'Edit Accra Supplies',exact:true}).click();check(await modal.evaluate(el=>el.getBoundingClientRect().right<=innerWidth&&el.getBoundingClientRect().left>=0),'supplier modal fits mobile viewport');await modal.getByRole('button',{name:'Cancel',exact:true}).click();await modal.waitFor({state:'hidden'})
  await page.goto(base+'/ledger/shared-config/supplier-groups',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Supplier groups',exact:true}).waitFor();await page.getByRole('button',{name:'Delete Domestic vendors',exact:true}).click();await modal.getByRole('button',{name:'Delete',exact:true}).click();await modal.getByRole('alert').waitFor();check(!groups[0].isDeleted,'referenced group deletion fails and stays visible');await modal.getByRole('button',{name:'Cancel',exact:true}).click();await modal.waitFor({state:'hidden'})
  await page.goto(base+'/ledger/shared-config/suppliers',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Delete Accra Supplies',exact:true}).click();await modal.getByRole('button',{name:'Cancel',exact:true}).click();await modal.waitFor({state:'hidden'});check(!suppliers[0].isDeleted,'cancelled deletion does not mutate supplier')
  await page.getByRole('button',{name:'Delete Accra Supplies',exact:true}).click();await modal.getByRole('button',{name:'Delete',exact:true}).click();await modal.waitFor({state:'hidden'});check(suppliers[0].isDeleted,'confirmed supplier deletion persists')
  await page.goto(base+'/ledger/shared-config/supplier-groups',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Delete Domestic vendors',exact:true}).click();await modal.getByRole('button',{name:'Delete',exact:true}).click();await modal.waitFor({state:'hidden'});check(groups[0].isDeleted,'empty supplier group can be deleted')
  for(let n=1;n<=25;n++)groups.push({id:uuid(1000+n),name:`Extra group ${String(n).padStart(2,'0')}`,version:1})
  await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'2',exact:true}).click();await page.getByText('Extra group 25',{exact:true}).waitFor();check(await page.getByText('Extra group 01',{exact:true}).count()===0,'directory pagination reaches records beyond the first page')
  await page.getByRole('button',{name:'Add supplier group',exact:true}).click();await modal.getByLabel('Name').fill('Must not save');failCommit=true;await modal.getByRole('button',{name:'Save changes',exact:true}).click();await modal.getByRole('alert').waitFor();check(!groups.some(g=>g.name==='Must not save')&&!(await modal.innerText()).includes('PRIVATE'),'failed backend save stays open without invented persistence or raw SQL');failCommit=false;await modal.getByRole('button',{name:'Cancel',exact:true}).click();await modal.waitFor({state:'hidden'})
  await page.goto(base+'/ledger/shared-config/suppliers',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Add supplier',exact:true}).click();const lookup=modal.getByLabel('Supplier group',{exact:true}).locator('..');await lookup.getByRole('button',{name:'Next choices',exact:true}).click();await modal.getByLabel('Supplier group',{exact:true}).selectOption(uuid(1025));check(await modal.getByPlaceholder('Search choices…').count()===0 && await modal.getByRole('button',{name:'Find',exact:true}).count()===0,'modal dropdowns have no separate search fields or Find buttons');await lookup.getByRole('button',{name:'Previous choices',exact:true}).click();check(await modal.getByLabel('Supplier group',{exact:true}).inputValue()===uuid(1025),'lookup pagination reaches groups beyond the first 20 choices and preserves selection');await modal.getByRole('button',{name:'Cancel',exact:true}).click();await modal.waitFor({state:'hidden'})
  check(errors.length===0,'no browser runtime errors')
 }finally{await browser.close()}
 check(seen.filter(x=>x.path.startsWith('/api/v1/shared/supplier')).every(x=>x.token==='Bearer tenant-token'),'all CRUD and lookup requests forward bearer token')
 check(seen.some(x=>x.path.endsWith('/supplier-groups')&&x.method==='POST')&&seen.some(x=>x.path.includes('/suppliers/')&&x.method==='PUT')&&seen.some(x=>x.method==='DELETE'),'real proxy transported create/update/delete operations')
 console.log(`${checks} supplier HTTP/browser checks passed`)
}finally{app.kill('SIGTERM');await new Promise(r=>upstream.close(r))}
