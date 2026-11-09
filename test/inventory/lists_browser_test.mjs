// Built Nuxt + Chromium regression checks for the inventory list workspaces.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const uuid = n => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const unit = uuid(100)
const seen = []
const records = {
  items: [{ id: uuid(1), version: 1, itemCode: 'SKU-001', name: 'Office chair', categoryName: 'Furniture', baseUom: 'EA', trackingMethod: 'none', status: 'active', baseUomId: uuid(20) }],
  warehouses: [{ id: uuid(2), version: 1, code: 'MAIN', name: 'Main warehouse', warehouseType: 'warehouse', allowsNegativeStock: false, isActive: true }],
  'bin-locations': [{ id: uuid(3), version: 1, code: 'A-01', warehouseName: 'Main warehouse', zone: 'A', capacity: '25' }],
  balances: [{ id: uuid(4), itemCode: 'SKU-001', warehouseName: 'Main warehouse', batchNumber: null, quantityOnHand: '12', averageUnitCost: '50', stockValue: '600' }],
  ledger: [{ id: uuid(5), transactionDate: '2026-11-09', documentNumber: 'GRN-001', documentType: 'receipt', movementReason: 'purchase_receipt', itemCode: 'SKU-001', warehouseName: 'Main warehouse', quantity: '12', balanceQuantity: '12', balanceValue: '600' }],
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
    data: [{ id: unit, code: 'HQ', name: 'Head Office', baseCurrencyId: uuid(200), isActive: true }],
    totalCount: 1, totalPages: 1,
  })
  if (path === '/api/v1/inventory/uoms') return send(200, { data: [{ id: uuid(20), code: 'EA', name: 'Each' }], totalCount: 1 })
  if (path === '/api/v1/inventory/item-categories') return send(200, { data: [], totalCount: 0 })
  if (path === '/api/v1/shared/suppliers') return send(200, { data: [], totalCount: 0 })
  const match = path.match(/^\/api\/v1\/inventory\/(items|warehouses|bin-locations|balances|ledger)$/)
  if (match) return send(200, { data: records[match[1]], totalCount: records[match[1]].length })
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
  const unauthenticated = await fetch(`${base}/api/inventory/items`)
  check(unauthenticated.status === 401, 'inventory lists require an authenticated session')
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ accountId: 'acme', usernameOrEmail: 'admin', password: 'test-only' }),
  })
  const cookie = login.headers.getSetCookie().find(value => value.startsWith('bd_access=')).split(';')[0]
  for (const resource of Object.keys(records)) {
    const response = await fetch(`${base}/api/inventory/${resource}?accountingUnitId=${unit}`, { headers: { cookie } })
    const body = await response.json()
    check(response.status === 200 && body.data.length === 1 && body.totalCount === 1, `${resource} proxy unwraps the service result`)
  }

  const require = createRequire((process.env.INVENTORY_BROWSER_DEPS || '/tmp/inventory-browser') + '/package.json')
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
    const cases = [
      ['/inventory/items', 'SKU-001'],
      ['/inventory/warehouses', 'Main warehouse'],
      ['/inventory/bin-locations', 'A-01'],
      ['/inventory/stock', '600'],
      ['/inventory/ledger', 'GRN-001'],
    ]
    for (const [path, text] of cases) {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' })
      try {
        await page.getByText(text, { exact: true }).first().waitFor()
      } catch (error) {
        console.error('PAGE DEBUG', path, page.url(), errors, await page.locator('body').innerText())
        throw error
      }
      check(await page.getByText('1 record', { exact: true }).isVisible(), `${path} renders its record count`)
      check(await page.getByText('No records found.', { exact: true }).count() === 0, `${path} does not replace returned rows with an empty state`)
    }
    check(errors.length === 0, `inventory lists have no browser runtime errors: ${errors.join('; ')}`)
    for (const resource of Object.keys(records)) {
      check(seen.some(request => request.path === `/api/v1/inventory/${resource}` && request.query.get('accountingUnitId') === unit), `${resource} is requested in the selected accounting unit`)
    }
    check(seen.filter(request => request.path.startsWith('/api/v1/inventory/')).every(request => request.token === 'Bearer tenant-token'), 'inventory requests forward the bearer token only through the server proxy')
  } finally {
    await browser.close()
  }
  console.log(`${checks} inventory list HTTP/browser checks passed`)
} finally {
  app.kill('SIGTERM')
  await new Promise(resolve => upstream.close(resolve))
}
