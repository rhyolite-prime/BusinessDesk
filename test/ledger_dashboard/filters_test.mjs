import assert from 'node:assert/strict'
import { dashboardDate, dashboardDateRange, dashboardSourceLabel, parseDashboardFilters } from '../../frontend/app/features/ledger/dashboard-filters.ts'

let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const unit = 'A0000000-0000-4000-8000-000000000001'
const defaults = { accountingUnitId: unit, dateFrom: '2026-10-01', dateTo: '2026-10-31' }
const parsed = parseDashboardFilters(defaults)
check(parsed.accountingUnitId === unit.toLowerCase() && parsed.includeChildCostCenters && parsed.status === '' && parsed.currencyId === '', 'defaults are explicit and UUIDs normalized')
check(parseDashboardFilters({ ...defaults, includeChildCostCenters: 'false', costCenterId: 'unassigned', status: 'rejected' }).includeChildCostCenters === false, 'query booleans, unassigned and full status enum supported')
check(dashboardDate('2024-02-29') && !dashboardDate('2026-02-29') && !dashboardDate('2026-02-30'), 'real calendar validation including leap days')
for (const change of [
  { accountingUnitId: '' }, { accountingUnitId: '00000000-0000-0000-0000-000000000000' },
  { dateFrom: '1899-12-31' }, { dateFrom: '2026-11-01' }, { dateTo: '3000-01-01' },
  { dateFrom: '2026-1-01' }, { dateTo: ['2026-10-31', '2026-11-30'] },
  { status: 'all' }, { source: 'a'.repeat(41) }, { source: '\u0000' }, { source: 'é'.repeat(21) },
  { includeChildCostCenters: 'yes' }, { currencyId: 'USD' }, { costCenterId: 'root' },
  { tenantId: unit }, { userId: unit }, { pageSize: '10' },
]) { assert.throws(() => parseDashboardFilters({ ...defaults, ...change })); checks++ }
const today = new Date(2026, 10, 18, 12)
for (const [preset, start, end] of [
  ['month-to-date', '2026-11-01', '2026-11-18'],
  ['quarter-to-date', '2026-10-01', '2026-11-18'],
  ['year-to-date', '2026-01-01', '2026-11-18'],
  ['last-month', '2026-10-01', '2026-10-31'],
  ['fiscal-year-to-date', '2026-07-01', '2026-11-18'],
]) { assert.deepEqual(dashboardDateRange(preset, today, 7), { dateFrom: start, dateTo: end }); checks++ }
assert.deepEqual(dashboardDateRange('fiscal-year-to-date', new Date(2026, 1, 20), 7), { dateFrom: '2025-07-01', dateTo: '2026-02-20' }); checks++
assert.deepEqual(dashboardDateRange('last-month', new Date(2026, 0, 1)), { dateFrom: '2025-12-01', dateTo: '2025-12-31' }); checks++
check(dashboardSourceLabel('customer_receipt') === 'Customer Receipt', 'real source codes have readable labels')
console.log(`${checks} ledger dashboard filter checks passed`)
