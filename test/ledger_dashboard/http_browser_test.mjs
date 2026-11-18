// Built Nuxt + real Chromium with a controlled upstream. SQL is tested separately.
import http from 'node:http'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { EventEmitter, once } from 'node:events'
import { dashboardStatuses, parseDashboardFilters } from '../../frontend/app/features/ledger/dashboard-filters.ts'

const id = n => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const unit = id(1), branch = id(2), root = id(3), child = id(4), ghs = id(5), usd = id(6)
const options = {
  accountingUnits: [
    { id: unit, name: 'Live head office', code: 'HQ', baseCurrency: 'GHS', fiscalYearStartMonth: 7 },
    { id: branch, name: 'Live branch', code: 'BR', baseCurrency: 'USD', fiscalYearStartMonth: 4 },
  ],
  costCenters: [{ id: root, name: 'Operations', parentId: null }, { id: child, name: 'Projects', parentId: root }],
  currencies: [{ id: ghs, code: 'GHS', name: 'Ghana cedi' }, { id: usd, code: 'USD', name: 'US dollar' }],
  sources: ['customer_receipt', 'supplier_payment'],
}
let checks = 0, failDashboard = false, failOptions = false, empty = false, invalid = false, errorCode = '', delayedUnit = ''
const seen = [], delayed = [], signals = new EventEmitter()
const check = (value, label) => { assert.ok(value, label); checks++ }
function snapshot(filters) {
  const selectedUnit = options.accountingUnits.find(option => option.id === filters.accountingUnitId)
  const count = empty ? 0 : filters.status === 'draft' ? 6 : filters.status === 'pending_approval' ? 19 : 47
  const pending = empty || (filters.status && filters.status !== 'pending_approval') ? 0 : 19
  const amount = empty ? '0.000000' : filters.source ? '777.000000' : selectedUnit.id === branch ? '4321.000000' : '1234.567890'
  const journal = (index, status = 'Posted') => ({
    id: id(100 + index), batchNumber: `LIVE-${selectedUnit.code}-${index}`, description: status === 'Pending approval' ? `Waiting approval ${index}` : `System journal ${index}`,
    date: filters.dateTo, source: filters.source || 'general_journal', debit: '10.123456', credit: '10.123456', status, preparer: 'Ama Mensah', lineCount: 2,
  })
  return {
    accountingUnit: selectedUnit, asOf: '2026-11-18T13:00:00Z', filters,
    metrics: ['assets', 'liabilities', 'revenue', 'expenditure'].map((key, index) => ({ key, label: ['Total assets', 'Total liabilities', 'Revenue', 'Expenditure'][index], amount: index ? (empty ? '0.000000' : '100.000000') : amount, currency: selectedUnit.baseCurrency, note: index < 2 ? `Posted balance through ${filters.dateTo}` : 'Posted activity in selected period' })),
    cashPosition: empty ? [] : [{ label: `${selectedUnit.baseCurrency} bank / cash`, amount: '640.123456', currency: selectedUnit.baseCurrency }],
    postedLineCount: empty ? 0 : 150, unclassifiedLineCount: 0, reclassifiedLineCount: 0,
    journalCount: count, pendingApprovalCount: pending,
    journalStatuses: dashboardStatuses.map(status => ({ status: status.value, label: status.label, count: empty ? 0 : filters.status ? (status.value === filters.status ? count : 0) : ({ posted: 22, pending_approval: 19, draft: 6 }[status.value] || 0) })),
    recentJournals: Array.from({ length: Math.min(10, count) }, (_, index) => journal(index + 1, filters.status === 'draft' ? 'Draft' : filters.status === 'pending_approval' ? 'Pending approval' : 'Posted')),
    pendingJournals: Array.from({ length: Math.min(5, pending) }, (_, index) => journal(index + 1, 'Pending approval')),
  }
}
const upstream = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture'), path = url.pathname
  const send = (code, result, error) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify({ success: code < 300, result, error })) }
  seen.push({ path, query: Object.fromEntries(url.searchParams), token: req.headers.authorization, requestId: req.headers['x-request-id'] })
  if (path === '/api/v1/auth/tenant-login') return send(200, { token: 'tenant-token', requiresTwoFactorAuth: false, expiresIn: 3600 })
  if (path === '/api/v1/auth/me') return req.headers.authorization === 'Bearer tenant-token' ? send(200, { userId: id(99), username: 'ama', accountId: 'acme' }) : send(401, null)
  if (req.headers.authorization !== 'Bearer tenant-token') return send(401, null)
  if (path === '/api/v1/ledger/dashboard/options') return failOptions ? send(503, null, { code: 'database_error', message: 'PRIVATE SQL' }) : send(200, options)
  if (path === '/api/v1/ledger/dashboard') {
    if (failDashboard) return send(503, null, { code: 'database_error', message: 'PRIVATE SQL and credentials' })
    if (errorCode) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ success: false, error: { code: errorCode, message: 'PRIVATE SQL' } })); return }
    if (invalid) return send(200, { unexpected: 'PRIVATE' })
    const filters = parseDashboardFilters(Object.fromEntries(url.searchParams))
    if (!options.accountingUnits.some(option => option.id === filters.accountingUnitId)) return send(404, null, { code: 'not_found', message: 'PRIVATE tenant' })
    const response = snapshot(filters)
    if (filters.accountingUnitId === delayedUnit) await new Promise(resolve => { delayed.push(resolve); signals.emit('held') })
    return send(200, response)
  }
  if (path === '/api/v1/preferences') return send(200, {})
  send(404, null)
})
await new Promise(resolve => upstream.listen(0, '0.0.0.0', resolve))
const reserve = http.createServer(); await new Promise(resolve => reserve.listen(0, '0.0.0.0', resolve))
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve))
const base = `http://127.0.0.1:${port}`, backend = `http://127.0.0.1:${upstream.address().port}`
// Unset ledger origin deliberately: dashboard must use the real auth origin, not demo data.
const app = spawn(process.execPath, ['frontend/.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(port), HOST: '0.0.0.0', NODE_ENV: 'production', NUXT_AUTH_API_BASE_URL: backend, NUXT_LEDGER_API_BASE_URL: '', NUXT_PUBLIC_DEMO_MODE: 'true' }, stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''; app.stderr.on('data', data => { log += data })
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(log)), 30000)
  app.stdout.on('data', data => { log += data; if (log.includes('Listening on')) { clearTimeout(timer); resolve() } })
  app.on('exit', code => { clearTimeout(timer); reject(new Error(`App exited ${code}: ${log}`)) })
})
async function call(path, cookie = '', method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { cookie, origin: base, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return { response, body: await response.json() }
}
const query = `?accountingUnitId=${unit}&dateFrom=2026-10-01&dateTo=2026-10-31`
try {
  let result = await call('/api/ledger/dashboard' + query); check(result.response.status === 401, 'dashboard rejects anonymous reads')
  result = await call('/api/ledger/dashboard/options'); check(result.response.status === 401, 'filter catalogs reject anonymous reads')
  const login = await call('/api/auth/login', '', 'POST', { accountId: 'acme', usernameOrEmail: 'ama', password: 'test-only' })
  const cookie = login.response.headers.getSetCookie().find(value => value.startsWith('bd_access=')).split(';')[0]
  result = await call('/api/ledger/dashboard/options', cookie)
  check(result.response.status === 200 && result.body.accountingUnits.length === 2 && result.body.costCenters[1].parentId === root, 'options are unwrapped from real upstream response')
  check(result.response.headers.get('cache-control') === 'no-store', 'options cannot be cached across tenants')
  for (const suffix of ['', query + '&tenantId=' + unit, query + '&dateFrom=2026-09-01', query.replace('2026-10-01', '2026-02-30'), query + '&includeChildCostCenters=yes', query + '&status=unknown', query + '&currencyId=USD']) {
    const before = seen.filter(request => request.path === '/api/v1/ledger/dashboard').length
    result = await call('/api/ledger/dashboard' + suffix, cookie)
    check(result.response.status === 400 && seen.filter(request => request.path === '/api/v1/ledger/dashboard').length === before, 'invalid, repeated and scope-override filters never reach upstream')
  }
  result = await call('/api/ledger/dashboard/options?tenantId=' + unit, cookie); check(result.response.status === 400, 'options reject unexpected parameters')
  result = await call('/api/ledger/dashboard' + query + `&costCenterId=${child}&includeChildCostCenters=false&source=customer_receipt&currencyId=${usd}&status=pending_approval`, cookie)
  check(result.response.status === 200 && result.body.filters.costCenterId === child && result.body.filters.includeChildCostCenters === false && result.body.pendingApprovalCount === 19, 'all filters forwarded and full live counts preserved')
  check(result.response.headers.get('cache-control') === 'no-store' && !JSON.stringify(result.body).includes('vs last month'), 'no cache and no fabricated trends')
  const forwarded = seen.filter(request => request.path === '/api/v1/ledger/dashboard').at(-1)
  check(forwarded.query.currencyId === usd && forwarded.query.status === 'pending_approval' && forwarded.query.includeChildCostCenters === 'false' && forwarded.token === 'Bearer tenant-token' && forwarded.requestId, 'bearer token, request ID and normalized dimensional filters forwarded')
  result = await call('/api/ledger/dashboard' + query.replace(unit, id(98)), cookie); check(result.response.status === 404 && !JSON.stringify(result.body).includes('PRIVATE'), 'not-found errors sanitized')
  failDashboard = true; result = await call('/api/ledger/dashboard' + query, cookie)
  check(result.response.status === 503 && !JSON.stringify(result.body).includes('PRIVATE') && !result.body.metrics, 'upstream failure never falls back to mock financial data, even with demo mode enabled')
  failDashboard = false; invalid = true; result = await call('/api/ledger/dashboard' + query, cookie)
  check(result.response.status === 503 && !JSON.stringify(result.body).includes('PRIVATE'), 'malformed upstream data rejected rather than rendered')
  invalid = false
  for (const [code, status] of [['validation_error', 400], ['unauthorized', 401], ['forbidden', 403], ['not_found', 404], ['database_error', 503]]) {
    errorCode = code; result = await call('/api/ledger/dashboard' + query, cookie)
    check(result.response.status === status && !JSON.stringify(result.body).includes('PRIVATE'), 'failed API envelopes map to safe status codes')
  }
  errorCode = ''

  const require = createRequire(`${process.env.DASHBOARD_BROWSER_DEPS || '/tmp/supplier-tools'}/package.json`)
  const { chromium } = require('playwright-core'), binary = require('@sparticuz/chromium').default || require('@sparticuz/chromium')
  const browser = await chromium.launch({ args: binary.args.filter(arg => arg !== '--single-process'), executablePath: await binary.executablePath(), headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await context.addCookies([{ name: 'bd_access', value: 'tenant-token', url: base, httpOnly: true }])
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(15000)
    await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'))
    const indicators = () => page.getByRole('region', { name: 'Financial indicators', exact: true })
    const waitLoaded = () => indicators().waitFor()
    async function change(action) {
      const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/ledger/dashboard')
      await action(); await response; await waitLoaded()
    }
    await page.goto(base + '/ledger'); await waitLoaded()
    check(await page.getByRole('heading', { name: 'Live head office', exact: true }).isVisible(), 'dashboard uses actual accounting unit name')
    check((await indicators().innerText()).includes('1,234.57') && (await indicators().getByText('Pending approvals', { exact: true }).locator('..').innerText()).includes('19'), 'live decimal totals and complete pending count displayed')
    check(await page.getByText('All 47 matching journal batches', { exact: true }).isVisible() && await page.locator('tbody tr').count() === 10, 'status chart uses all filtered batches while activity table is limited to ten')
    check(await page.getByText('Preview data', { exact: true }).count() === 0 && !(await page.locator('main').innerText()).includes('vs last month'), 'demo badge and static trend percentages removed')
    check(await page.getByLabel('From date', { exact: true }).inputValue() === '2026-01-01' && await page.getByLabel('Through date', { exact: true }).inputValue() === '2026-11-18', 'default dates use the current year and day')
    check((await page.getByLabel('Dashboard cost center', { exact: true }).locator(`option[value="${child}"]`).innerText()).includes('Operations / Projects'), 'hierarchical cost centers come from live options')
    await change(() => page.getByLabel('Date range', { exact: true }).selectOption('last-month'))
    check(await page.getByLabel('From date', { exact: true }).inputValue() === '2026-10-01' && await page.getByLabel('Through date', { exact: true }).inputValue() === '2026-10-31', 'last-month preset applies an inclusive full calendar month')
    await change(() => page.getByLabel('Date range', { exact: true }).selectOption('fiscal-year-to-date'))
    check(await page.getByLabel('From date', { exact: true }).inputValue() === '2026-07-01', 'fiscal preset uses the selected unit fiscal start month')
    await change(() => page.getByLabel('Dashboard cost center', { exact: true }).selectOption(root))
    await change(() => page.getByLabel('Include child cost centers', { exact: true }).uncheck())
    await change(() => page.getByLabel('Transaction source', { exact: true }).selectOption('customer_receipt'))
    await change(() => page.getByLabel('Dashboard transaction currency', { exact: true }).selectOption(usd))
    await change(() => page.getByLabel('Journal status (activity only)', { exact: true }).selectOption('pending_approval'))
    const applied = seen.filter(request => request.path === '/api/v1/ledger/dashboard').at(-1).query
    check(applied.accountingUnitId === unit && applied.costCenterId === root && applied.includeChildCostCenters === 'false' && applied.source === 'customer_receipt' && applied.currencyId === usd && applied.status === 'pending_approval', 'every visible filter reaches the dashboard API')
    check((await indicators().innerText()).includes('777.00') && await page.getByText('All 19 matching journal batches', { exact: true }).isVisible(), 'filtered upstream totals and activity counts replace old values')
    await page.getByLabel('From date', { exact: true }).fill('2027-01-01')
    await page.getByText('The from date must be on or before the through date.', { exact: true }).waitFor()
    check(await indicators().count() === 0, 'invalid ranges hide stale financial results')
    await page.getByRole('button', { name: 'Reset filters', exact: true }).click(); await waitLoaded()
    check(await page.getByLabel('Dashboard cost center', { exact: true }).inputValue() === '' && await page.getByLabel('Transaction source', { exact: true }).inputValue() === '' && await page.getByLabel('Journal status (activity only)', { exact: true }).inputValue() === '', 'reset clears optional filters and reloads live data')
    await page.getByLabel('Dashboard accounting unit', { exact: true }).selectOption(branch); await page.getByRole('heading', { name: 'Live branch', exact: true }).waitFor()
    check((await indicators().innerText()).includes('4,321.00') && (await page.locator('main').innerText()).includes('Base currency · USD'), 'unit switch changes financial data and real base currency')
    await page.getByLabel('Dashboard accounting unit', { exact: true }).selectOption(unit); await page.getByRole('heading', { name: 'Live head office', exact: true }).waitFor()
    // An aborted older scope may finish later on the server; it must not win.
    delayedUnit = branch
    const held = once(signals, 'held')
    await page.getByLabel('Dashboard accounting unit', { exact: true }).selectOption(branch)
    await page.waitForFunction(() => !document.querySelector('section[aria-label="Financial indicators"]'))
    await held
    await page.getByLabel('Dashboard accounting unit', { exact: true }).selectOption(unit); await page.getByRole('heading', { name: 'Live head office', exact: true }).waitFor()
    delayedUnit = ''; delayed.splice(0).forEach(resolve => resolve()); await page.waitForTimeout(200)
    check(await page.getByRole('heading', { name: 'Live head office', exact: true }).isVisible() && (await indicators().innerText()).includes('1,234.57'), 'late old-unit response cannot overwrite current-unit totals')
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    await page.getByText('Waiting approval 1', { exact: true }).first().waitFor()
    check(seen.some(request => request.path === '/api/v1/ledger/dashboard' && request.query.accountingUnitId === unit && request.query.status === 'pending_approval' && request.query.dateFrom === '1900-01-01'), 'topbar notifications use the selected unit and dedicated pending list, not a recent-entry approximation')
    await page.getByRole('button', { name: /journal approvals|Notifications/ }).click()
    empty = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByText('No posted ledger lines match this scope', { exact: false }).waitFor()
    check(await page.getByText('No journal activity matches the selected filters.', { exact: true }).isVisible() && (await indicators().innerText()).includes('0.00'), 'genuinely empty system data renders honest zeros and empty states')
    empty = false; failDashboard = true; await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByText('Dashboard data is unavailable', { exact: true }).waitFor()
    check(await indicators().count() === 0 && !(await page.locator('main').innerText()).includes('PRIVATE'), 'failed refresh shows sanitized error without old or mock totals')
    failDashboard = false; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await waitLoaded()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1)
    check(await page.getByLabel('Dashboard accounting unit', { exact: true }).isVisible() && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'dashboard filters and content fit mobile viewport')
    failOptions = true; await page.reload(); await page.getByRole('button', { name: 'Retry filter options', exact: true }).waitFor()
    check(await indicators().count() === 0, 'catalog failure does not expose previous filters or balances')
    failOptions = false; await page.getByRole('button', { name: 'Retry filter options', exact: true }).click(); await waitLoaded()
    check(errors.length === 0, `no dashboard browser runtime errors: ${errors.join('; ')}`)
  } finally { await browser.close() }
  check(seen.filter(request => request.path.startsWith('/api/v1/ledger/dashboard')).every(request => request.token === 'Bearer tenant-token'), 'all dashboard and filter requests carry tenant authentication')
  console.log(`${checks} ledger dashboard HTTP/browser checks passed`)
} finally {
  delayed.splice(0).forEach(resolve => resolve())
  app.kill('SIGTERM'); await new Promise(resolve => upstream.close(resolve))
}
