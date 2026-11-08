// Built Nuxt/BFF regression: Add supplier's preview must never report form-field errors.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
let status = 200, payload = { success: true, result: { accountNumber: 'SUP-0042' } }, checks = 0
const requests = [], check = (value, label) => { assert.ok(value, label); checks++ }
const upstream = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture')
  const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
  if (url.pathname === '/api/v1/auth/tenant-login') return send(200, { success: true, result: { token: 'tenant-token', requiresTwoFactorAuth: false, expiresIn: 3600 } })
  if (url.pathname === '/api/v1/auth/me') return send(200, { success: true, result: { userId: '80000000-0000-4000-8000-000000000001', username: 'admin', accountId: 'acme' } })
  if (req.headers.authorization !== 'Bearer tenant-token') return send(401, { success: false })
  requests.push({ path: url.pathname, query: url.search, method: req.method })
  send(status, payload)
})
await new Promise(resolve => upstream.listen(0, '0.0.0.0', resolve))
const reserve = http.createServer()
await new Promise(resolve => reserve.listen(0, '0.0.0.0', resolve))
const port = reserve.address().port
await new Promise(resolve => reserve.close(resolve))
const base = `http://127.0.0.1:${port}`, backend = `http://127.0.0.1:${upstream.address().port}`
const app = spawn(process.execPath, ['frontend/.output/server/index.mjs'], { env: { ...process.env, PORT: String(port), HOST: '0.0.0.0', NODE_ENV: 'production', NUXT_AUTH_API_BASE_URL: backend, NUXT_LEDGER_API_BASE_URL: backend }, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
app.stderr.on('data', data => { log += data })
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(log || 'Nuxt startup timed out')), 30000)
    app.stdout.on('data', data => { log += data; if (log.includes('Listening on')) { clearTimeout(timer); resolve() } })
    app.on('exit', code => { clearTimeout(timer); reject(new Error(`Nuxt exited ${code}: ${log}`)) })
  })
  const path = '/api/shared/suppliers/next-number'
  check((await fetch(base + path)).status === 401, 'preview requires a session')
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ accountId: 'acme', usernameOrEmail: 'admin', password: 'test-only' }) })
  const cookie = login.headers.getSetCookie().find(value => value.startsWith('bd_access=')).split(';')[0]
  async function preview() {
    const response = await fetch(base + path, { headers: { cookie } })
    return { response, body: await response.json() }
  }
  let result = await preview()
  check(result.response.status === 200 && result.body.accountNumber === 'SUP-0042', 'valid preview is returned without replacement')
  check(result.response.headers.get('cache-control') === 'no-store', 'preview response is uncached')
  check(requests.at(-1).path === '/api/v1/shared/suppliers/next-number' && requests.at(-1).method === 'GET' && requests.at(-1).query === '', 'preview sends no supplier data or unrelated list parameters')
  for (const code of [400, 404, 405, 501, 200]) {
    status = code
    payload = { success: false, error: { code: code === 404 ? 'not_found' : 'validation_error', message: 'PRIVATE upstream / Invalid record or list parameters.' } }
    result = await preview()
    check(result.response.status === 503 && result.body.statusMessage.includes('Rebuild and restart the C++ backend') && result.body.statusMessage.includes('/api/v1/shared/suppliers/next-number'), `legacy/unsupported preview ${code} identifies the backend route rather than form fields`)
    check(!JSON.stringify(result.body).includes('PRIVATE') && !result.body.statusMessage.includes('credit account'), `preview ${code} sanitizes internals and omits unrelated GL advice`)
  }
  for (const code of [401, 403]) {
    status = code; payload = { success: false, error: { code: code === 401 ? 'unauthorized' : 'forbidden' } }
    result = await preview()
    check(result.response.status === code && !result.body.statusMessage.includes('Rebuild'), `authentication failure ${code} remains distinct`)
  }
  for (const code of ['supplier_numbering', 'schema_not_ready']) {
    status = 503; payload = { success: false, error: { code, message: 'PRIVATE SQL' } }
    result = await preview()
    check(result.response.status === 503 && result.body.statusMessage.includes(code === 'supplier_numbering' ? 'supplier-account-id' : '023_drop_customer_supplier_rates.sql') && !JSON.stringify(result.body).includes('PRIVATE'), `${code} retains safe actionable configuration advice`)
  }
  for (const value of [null, {}, { accountNumber: '' }, { accountNumber: 42 }]) {
    status = 200; payload = { success: true, result: value }
    result = await preview()
    check(result.response.status === 503 && result.body.statusMessage.includes('Unable to load the next supplier account number'), 'malformed preview is rejected without inventing a number')
  }
  status = 500; payload = { success: false, error: { code: 'database_error', message: 'PRIVATE SQL' } }
  result = await preview()
  check(result.response.status === 503 && result.body.statusMessage.includes('No supplier fields have been submitted') && !JSON.stringify(result.body).includes('PRIVATE'), 'server failure is described as preview failure')
  status = 400; payload = { success: false, error: { code: 'validation_error' } }
  const save = await fetch(base + '/api/shared/suppliers', { method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' }, body: '{}' })
  check(save.status === 400 && (await save.json()).statusMessage.includes('Check required fields'), 'actual supplier save validation remains unchanged')
  console.log(`${checks} supplier preview HTTP error/contract checks passed`)
} finally {
  app.kill('SIGTERM')
  await new Promise(resolve => upstream.close(resolve))
}
