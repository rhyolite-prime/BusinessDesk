// Built Nuxt + Chromium checks for the supply chain dashboard and operations links.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const uuid = n => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const unit = uuid(100)
const seen = []
const requisition = { id: uuid(1), requisitionNumber: 'REQ-0012', requestDate: '2026-11-08', status: 'submitted', warehouseName: 'Main warehouse' }
const order = { id: uuid(2), orderNumber: 'PO-1008', supplierName: 'Accra Supplies', orderDate: '2026-11-07', expectedDeliveryDate: '2026-11-15', currencyCode: 'GHS', grandTotal: '12500.00', status: 'sent' }
const receipt = { id: uuid(3), receiptNumber: 'GRN-0006', orderNumber: 'PO-1001', supplierName: 'Accra Supplies', receiptDate: '2026-11-06', status: 'posted' }
const totals = {
  requisitions: { '': 12, submitted: 3 },
  orders: { '': 8, submitted: 2, approved: 1, sent: 2, partially_received: 1 },
  receipts: { '': 6, draft: 2 },
}

const upstream = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://fixture')
  const path = url.pathname
  seen.push({ path, method: req.method, query: url.searchParams, token: req.headers.authorization })
  const send = (status, result, error) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ success: status < 300, result, error }))
  }
  if (path === '/api/v1/auth/tenant-login') return send(200, { token: 'tenant-token', requiresTwoFactorAuth: false, expiresIn: 3600 })
  if (path === '/api/v1/auth/me') return req.headers.authorization === 'Bearer tenant-token'
    ? send(200, { userId: uuid(999), username: 'admin', accountId: 'acme' })
    : send(401, null)
  if (req.headers.authorization !== 'Bearer tenant-token') return send(401, null, { code: 'unauthorized' })
  if (path === '/api/v1/ledger/accounting-units') return send(200, {
    data: [{ id: unit, code: 'HQ', name: 'Head Office', isActive: true }], totalCount: 1, totalPages: 1,
  })
  if (path === '/api/v1/shared/suppliers') return send(200, { data: [], totalCount: 0 })
  if (path === '/api/v1/inventory/items' || path === '/api/v1/inventory/warehouses') return send(200, { data: [], totalCount: 0 })
  const match = path.match(/^\/api\/v1\/scm\/(requisitions|orders|receipts)$/)
  if (match) {
    const resource = match[1]
    const status = url.searchParams.get('status') || ''
    const data = status ? [] : resource === 'requisitions' ? [requisition] : resource === 'orders' ? [order] : [receipt]
    return send(200, { data, totalCount: totals[resource][status] ?? 0 })
  }
  return send(404, null, { code: 'not_found' })
})
await new Promise(resolve => upstream.listen(0, '0.0.0.0', resolve))
const reserve = http.createServer()
await new Promise(resolve => reserve.listen(0, '0.0.0.0', resolve))
const port = reserve.address().port
await new Promise(resolve => reserve.close(resolve))
const base = `http://127.0.0.1:${port}`
const backend = `http://127.0.0.1:${upstream.address().port}`
const app = spawn(process.execPath, ['frontend/.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(port), HOST: '0.0.0.0', NODE_ENV: 'production', NUXT_AUTH_API_BASE_URL: backend, NUXT_LEDGER_API_BASE_URL: backend },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
app.stderr.on('data', data => { log += data })
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(log)), 30000)
  app.stdout.on('data', data => {
    log += data
    if (log.includes('Listening on')) { clearTimeout(timer); resolve() }
  })
  app.on('exit', code => { clearTimeout(timer); reject(new Error(`App exit ${code}: ${log}`)) })
})

try {
  const unauthenticated = await fetch(`${base}/api/scm/orders`)
  check(unauthenticated.status === 401, 'dashboard data requires an authenticated session')
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ accountId: 'acme', usernameOrEmail: 'admin', password: 'test-only' }),
  })
  const cookie = login.headers.getSetCookie().find(value => value.startsWith('bd_access=')).split(';')[0]
  const list = await fetch(`${base}/api/scm/orders?accountingUnitId=${unit}&status=sent&page=1&size=1`, { headers: { cookie } })
  const body = await list.json()
  check(list.status === 200 && body.totalCount === 2, 'status-filtered dashboard request preserves the exact service count')

  const require = createRequire((process.env.SUPPLY_CHAIN_BROWSER_DEPS || '/tmp/supply-chain-browser') + '/package.json')
  const { chromium } = require('playwright-core')
  const chromiumModule = require('@sparticuz/chromium')
  const binary = chromiumModule.default || chromiumModule
  const browser = await chromium.launch({ args: binary.args.filter(arg => arg !== '--single-process'), executablePath: await binary.executablePath(), headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.addCookies([{ name: 'bd_access', value: 'tenant-token', url: base, httpOnly: true }])
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(30000)
    await page.goto(`${base}/supply-chain`, { waitUntil: 'domcontentloaded' })
    await page.getByText('PO-1008', { exact: true }).waitFor()
    check(await page.getByRole('heading', { name: 'Supply chain', exact: true }).isVisible(), 'module opens on its dashboard')
    const metric = label => page.getByText(label, { exact: true }).locator('..')
    check(await metric('Purchase requisitions').getByText('12', { exact: true }).isVisible(), 'requisition total is rendered')
    check(await metric('Requisition approvals').getByText('3', { exact: true }).isVisible(), 'requisition approval queue is rendered')
    check(await metric('Open purchase orders').getByText('4', { exact: true }).isVisible(), 'open orders combine approved, sent and partly received counts')
    check(await metric('Unposted receipts').getByText('2', { exact: true }).isVisible(), 'draft receipt count is rendered')
    check(await page.getByText('REQ-0012', { exact: true }).isVisible() && await page.getByText('GRN-0006', { exact: true }).isVisible(), 'recent requisition and receipt activity is rendered')
    check(await page.getByText('GHS 12,500.00', { exact: true }).isVisible(), 'recent order currency and total are rendered')

    await page.getByRole('link', { name: 'View all', exact: true }).first().click()
    await page.waitForURL('**/supply-chain/operations?tab=orders')
    await page.getByRole('heading', { name: 'Supply chain operations', exact: true }).waitFor()
    await page.getByText('PO-1008', { exact: true }).waitFor()
    check(await page.getByText('PO-1008', { exact: true }).isVisible(), 'dashboard links open the existing purchase order workflow')
    await page.goto(`${base}/supply-chain?tab=receipts`, { waitUntil: 'domcontentloaded' })
    await page.waitForURL('**/supply-chain/operations?tab=receipts')
    check(await page.getByRole('heading', { name: 'Supply chain operations', exact: true }).isVisible(), 'legacy tab URLs redirect to the operations workspace')
    check(errors.length === 0, `dashboard and operations have no browser runtime errors: ${errors.join('; ')}`)

    const dashboardRequests = seen.filter(request => request.path.startsWith('/api/v1/scm/') && request.query.get('size') === '1')
    check(dashboardRequests.length >= 6 && dashboardRequests.every(request => request.query.get('accountingUnitId') === unit), 'all exact dashboard counts are scoped to the selected unit')
    check(seen.filter(request => request.path.startsWith('/api/v1/scm/')).every(request => request.token === 'Bearer tenant-token'), 'dashboard API requests forward the bearer token only through the server proxy')
  } finally {
    await browser.close()
  }
  console.log(`${checks} supply chain dashboard HTTP/browser checks passed`)
} finally {
  app.kill('SIGTERM')
  await new Promise(resolve => upstream.close(resolve))
}
