// Built Nuxt proxy with controlled upstream; PostgreSQL behavior is tested separately.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
let seen=[], fail=0
const upstream=http.createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk
 const send=(status,result,error)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status===200,result,error}))}
 if(req.headers.authorization!=='Bearer host-token')return send(401,null,{code:'unauthorized'})
 if(req.url==='/api/v1/host/currency-session')return send(200,{canManageCurrencies:true})
 if(req.url==='/api/v1/host/system-numbers/sync'){
  seen.push({method:req.method,body:JSON.parse(raw),token:req.headers.authorization})
  return fail?send(fail,null,{code:'conflict'}):send(200,{deleted:0,updated:1,copied:2})
 }
 send(404,null)
})
await new Promise(r=>upstream.listen(0,'127.0.0.1',r))
const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r))
const base=`http://127.0.0.1:${port}`,backend=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{env:{...process.env,PORT:String(port),HOST:'0.0.0.0',NUXT_AUTH_API_BASE_URL:backend,NUXT_LEDGER_API_BASE_URL:backend},stdio:['ignore','pipe','pipe']})
try {
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out')),30000);app.stdout.on('data',d=>{if(String(d).includes('Listening on')){clearTimeout(timer);resolve()}})})
 const body={tenantId:'10000000-0000-4000-8000-000000000001',mode:'override',confirmation:'SYNC'}
 const post=(cookie='',origin=base)=>fetch(base+'/api/host/system-numbers/sync',{method:'POST',headers:{'content-type':'application/json',cookie,origin},body:JSON.stringify(body)})
 assert.equal((await post()).status,401)
 assert.equal((await post('bd_access=tenant-token')).status,401)
 assert.equal((await post('bd_host_access=host-token','https://evil.invalid')).status,403)
 assert.equal(seen.length,0)
 let response=await post('bd_host_access=host-token');assert.equal(response.status,200);assert.deepEqual(await response.json(),{deleted:0,updated:1,copied:2})
 assert.deepEqual(seen[0],{method:'POST',body,token:'Bearer host-token'})
 body.mode='replace';response=await post('bd_host_access=host-token');assert.equal(response.status,200);assert.equal(seen[1].body.mode,'replace')
 fail=409;response=await post('bd_host_access=host-token');assert.equal(response.status,409);assert.match((await response.json()).statusMessage,/No changes were saved/)
 console.log('11 system-number sync HTTP proxy checks passed')
} finally {app.kill();upstream.close()}
