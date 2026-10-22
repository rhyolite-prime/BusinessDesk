// Black-box tests of the built Nitro auth routes. The upstream is a test server,
// not the real C++ backend. Separate C++/PostgreSQL tests cover that implementation.
// Usage: node --experimental-strip-types test/auth/frontend_auth_test.mjs /path/to/test-deps
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { totpFromTime } from '../../frontend/layers/shared/server/utils/totp.ts'
const require = createRequire(path.join(process.argv[2], 'package.json'))
const { PNG } = require('pngjs'), jsQR = require('jsqr')
let checks=0
const check=(v,message)=>{assert.ok(v,message);checks++}
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const challenge='a'.repeat(64)
let calls=0, consumed=false, revoked=false
const upstream=http.createServer(async(req,res)=>{
  calls++
  let raw='';for await(const chunk of req)raw+=chunk
  const body=raw?JSON.parse(raw):{}
  const send=(status,result)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({success:status===200,result}))}
  if(req.url==='/api/v1/auth/tenant-login'){
    if(body.password!=='secret-password')return send(401,{})
    if(body.accountId==='broken')return send(500,{})
    if(body.accountId==='malformed')return send(200,{token:'unsafe-token',requiresTwoFactorAuth:true,expiresIn:300,challengeId:challenge})
    if(body.accountId==='plain')return send(200,{token:'plain-jwt',expiresIn:3600,requiresTwoFactorAuth:false})
    consumed=false
    return send(200,{requiresTwoFactorAuth:true,challengeId:challenge,expiresIn:300,enrollmentRequired:body.accountId==='enroll',...(body.accountId==='enroll'?{secret,issuer:'BusinessDesk',accountLabel:'enroll/admin'}:{})})
  }
  if(req.url==='/api/v1/auth/tenant-verify-totp'){
    if(consumed||body.challengeId!==challenge||body.code!==totpFromTime(secret,Math.floor(Date.now()/1000)))return send(401,{})
    consumed=true
    return send(200,{token:'mfa-jwt',expiresIn:3600,requiresTwoFactorAuth:true})
  }
  if(req.url==='/api/v1/auth/me'){
    if(revoked||!['Bearer plain-jwt','Bearer mfa-jwt'].includes(req.headers.authorization))return send(401,{})
    return send(200,{userId:'uuid-user',username:'admin',accountId:'acme',permissions:['users.read']})
  }
  send(404,{})
})
await new Promise(resolve=>upstream.listen(0,'0.0.0.0',resolve))
const upstreamBase=`http://127.0.0.1:${upstream.address().port}`
const app=spawn(process.execPath,['frontend/.output/server/index.mjs'],{
 env:{...process.env,NODE_ENV:'production',HOST:'0.0.0.0',PORT:'0',NUXT_AUTH_API_BASE_URL:upstreamBase},stdio:['ignore','pipe','pipe'],
})
let logs=''
app.stderr.on('data',chunk=>{logs+=chunk})
const origin=await new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(new Error(`Nitro did not start: ${logs}`)),30000)
 app.stdout.on('data',chunk=>{logs+=chunk;const match=logs.match(/http:\/\/(?:\[::\]|0\.0\.0\.0|localhost):(\d+)/);if(match){clearTimeout(timer);resolve(`http://127.0.0.1:${match[1]}`)}})
 app.on('exit',code=>{clearTimeout(timer);reject(new Error(`Nitro exited ${code}: ${logs}`))})
})
const cookies=res=>res.headers.getSetCookie()
const cookie=(res,name)=>cookies(res).find(v=>v.startsWith(`${name}=`)&&!v.includes('Max-Age=0'))?.split(';')[0]||''
async function post(url,body,session='',extraHeaders={}){
 const res=await fetch(`${origin}${url}`,{method:'POST',headers:{'content-type':'application/json',origin,cookie:session,...extraHeaders},body:JSON.stringify(body),redirect:'manual'})
 return {res,body:await res.json()}
}
const credentials=accountId=>({accountId,usernameOrEmail:'admin@example.com',password:'secret-password'})
try {
 let result=await post('/api/auth/login',{username:'admin',password:'secret-password'})
 check(result.res.status===400,'accountId and usernameOrEmail required')
 result=await post('/api/auth/login',credentials('plain'))
 check(result.res.status===200&&result.body.authenticated===true,'no-2FA login completes directly')
 const plainCookie=cookie(result.res,'bd_access')
 check(plainCookie==='bd_access=plain-jwt','JWT stored in cookie')
 check(cookies(result.res).some(c=>c.startsWith('bd_access=')&&/HttpOnly/i.test(c)&&/Secure/i.test(c)&&/SameSite=Strict/i.test(c)),'JWT cookie protected')
 check(!JSON.stringify(result.body).includes('jwt'),'JWT absent from browser response')
 check(result.res.headers.get('cache-control')==='no-store','login response not cached')
 const modules=await fetch(`${origin}/modules`,{headers:{cookie:plainCookie},redirect:'manual'})
 if(modules.status!==200) console.error('Module response',modules.status,modules.headers.get('location'),(await modules.text()).slice(0,1500),logs)
 check(modules.status===200,'server guard admits validated JWT cookie to module manager')
 const missing=await fetch(`${origin}/modules`,{headers:{cookie:'tl_authed=1'},redirect:'manual'})
 check(missing.status===302&&missing.headers.get('location')==='/login','editable hint cannot bypass module guard')
 const login=await fetch(`${origin}/login`)
 const html=await login.text()
 check(html.includes('Account ID')&&html.includes('Username or email')&&!html.includes('Demo credentials'),'login renders tenant credential fields without demo password')
 result=await post('/api/auth/login',credentials('enroll'),plainCookie)
 check(result.res.status===200&&result.body.authenticated===false&&result.body.requiresTwoFactorAuth,'2FA login does not authenticate')
 check(!cookie(result.res,'bd_access'),'challenge response does not set authenticated JWT')
 const challengeCookie=cookie(result.res,'bd_challenge')
 check(challengeCookie===`bd_challenge=${challenge}`&&cookies(result.res).some(c=>c.startsWith('bd_challenge=')&&/HttpOnly/i.test(c)),'challenge is browser-bound in httpOnly cookie')
 check(!result.body.challengeId&&!result.body.token&&!result.body.demoCode,'no bearer challenge, JWT, or current-code hint in response')
 const enrollment=result.body.enrollment
 const image=PNG.sync.read(Buffer.from(enrollment.qr.split(',')[1],'base64'))
 const decoded=jsQR(new Uint8ClampedArray(image.data),image.width,image.height)
 check(Boolean(decoded),'generated QR is machine scannable')
 const uri=new URL(decoded.data)
 check(uri.protocol==='otpauth:'&&uri.hostname==='totp'&&uri.searchParams.get('secret')===secret,'QR contains correct TOTP secret')
 check(uri.searchParams.get('issuer')==='BusinessDesk'&&uri.searchParams.get('digits')==='6'&&uri.searchParams.get('period')==='30'&&uri.searchParams.get('algorithm')==='SHA1','QR authenticator parameters match backend')
 result=await post('/api/auth/verify-2fa',{code:totpFromTime(secret,Math.floor(Date.now()/1000))})
 check(result.res.status===401,'code without challenge cookie cannot complete login')
 result=await post('/api/auth/verify-2fa',{code:'wrong'},challengeCookie)
 check(result.res.status===400,'code format validated')
 result=await post('/api/auth/verify-2fa',{code: String((Number(totpFromTime(secret,Math.floor(Date.now()/1000))) + 1) % 1000000).padStart(6,'0')},challengeCookie)
 check(result.res.status===401&&!cookie(result.res,'bd_access'),'invalid code cannot authenticate')
 result=await post('/api/auth/verify-2fa',{code:totpFromTime(secret,Math.floor(Date.now()/1000)),challengeId:'body-controlled-challenge'},challengeCookie)
 check(result.res.status===200&&result.body.authenticated&&cookie(result.res,'bd_access')==='bd_access=mfa-jwt','scanned authenticator code completes login with cookie-bound challenge')
 check(!cookie(result.res,'bd_challenge')&&cookies(result.res).some(c=>c.startsWith('bd_challenge=')&&c.includes('Max-Age=0')),'successful verification clears challenge')
 result=await post('/api/auth/verify-2fa',{code:totpFromTime(secret,Math.floor(Date.now()/1000))},challengeCookie)
 check(result.res.status===401,'consumed challenge cannot complete twice')
 result=await post('/api/auth/login',credentials('enrolled'))
 check(result.body.enrollment===null,'existing enrollment is not disclosed again')
 result=await post('/api/auth/login',credentials('malformed'))
 check(result.res.status===503&&!cookie(result.res,'bd_access'),'upstream cannot accidentally authenticate a pending challenge')
 result=await post('/api/auth/login',credentials('broken'))
 check(result.res.status===503,'upstream failure cannot fall back to demo')
 const before=calls
 result=await post('/api/auth/login',credentials('plain'),'',{origin:'https://attacker.example'})
 check(result.res.status===403&&calls===before,'cross-origin login rejected before upstream')
 result=await post('/api/auth/signup',{institution:'Fake',totpSecret:secret})
 check(result.res.status===501,'legacy mock provisioning cannot claim to create a real account')
 result=await post('/api/auth/reset-password',{current:'demo1234',next:'new-password'})
 check(result.res.status===501,'mock reset cannot mutate seeded fallback credentials')
 const setup=await fetch(`${origin}/api/auth/setup-2fa?username=admin`)
 check(setup.status===410,'username cannot retrieve an existing authenticator secret')
 let me=await fetch(`${origin}/api/auth/me`,{headers:{cookie:plainCookie}})
 check(me.status===200&&(await me.json()).demo===false,'identity validated against backend, not demo store')
 revoked=true
 me=await fetch(`${origin}/api/auth/me`,{headers:{cookie:plainCookie}})
 check(me.status===401,'backend revocation/state failure invalidates browser session')
 result=await post('/api/auth/logout',{},plainCookie)
 check(result.res.status===200&&cookies(result.res).some(c=>c.startsWith('bd_access=')&&c.includes('Max-Age=0')),'logout clears JWT and guard cookies')
 console.log(`${checks} frontend HTTP/QR checks passed`)
} finally {
 app.kill('SIGTERM')
 await new Promise(resolve=>upstream.close(resolve))
}
