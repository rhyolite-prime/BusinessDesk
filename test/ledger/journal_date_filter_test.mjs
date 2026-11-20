import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dashboardDateRange } from '../../frontend/app/features/ledger/dashboard-filters.ts'

const indexVue = readFileSync('frontend/app/pages/ledger/journals/index.vue', 'utf8')
const typesTs = readFileSync('frontend/app/features/ledger/journal-types.ts', 'utf8')
const useJournalsTs = readFileSync('frontend/app/features/ledger/useJournals.ts', 'utf8')
const serverGetTs = readFileSync('frontend/server/api/ledger/journals.get.ts', 'utf8')

let checks = 0
const check = (ok, label) => {
  assert.ok(ok, label)
  checks++
}

// 1. Template & structure checks in index.vue
check(indexVue.includes('v-model="datePreset"'), 'date preset select bound in journals index')
check(indexVue.includes('aria-label="Date range"'), 'date range select labeled')
check(indexVue.includes('v-model="dateFrom"'), 'from date input bound in journals index')
check(indexVue.includes('aria-label="From date"'), 'from date input labeled')
check(indexVue.includes('v-model="dateTo"'), 'to date input bound in journals index')
check(indexVue.includes('aria-label="To date"'), 'to date input labeled')
check(indexVue.includes('Clear dates'), 'clear dates button present')
check(indexVue.includes('clearDates'), 'clearDates action present')
check(indexVue.includes('applyDatePreset'), 'applyDatePreset action present')
check(indexVue.includes('dashboardDateRange'), 'dashboardDateRange imported and used')

// 2. JournalFilterParams interface in journal-types.ts
check(typesTs.includes('export interface JournalFilterParams'), 'JournalFilterParams exported')
check(typesTs.includes('dateFrom?: string'), 'JournalFilterParams has dateFrom')
check(typesTs.includes('dateTo?: string'), 'JournalFilterParams has dateTo')
check(typesTs.includes('startDate?: string'), 'JournalFilterParams has startDate')
check(typesTs.includes('endDate?: string'), 'JournalFilterParams has endDate')

// 3. useJournals.ts list() supports filter params
check(useJournalsTs.includes('list: (unit = unitId.value, filters?: JournalFilterParams)'), 'useJournals list accepts filters')
check(useJournalsTs.includes('dateFrom: from'), 'useJournals list passes dateFrom')
check(useJournalsTs.includes('dateTo: to'), 'useJournals list passes dateTo')

// 4. server/api/ledger/journals.get.ts supports date range filtering
check(serverGetTs.includes('dateFrom'), 'journals.get.ts handles dateFrom')
check(serverGetTs.includes('dateTo'), 'journals.get.ts handles dateTo')
check(serverGetTs.includes('r.batchDate'), 'journals.get.ts filters by batchDate')

// 5. Functional date range filtering logic
const mockJournals = [
  { id: '1', batchNumber: 'GJ-1', description: 'September batch', batchDate: '2026-09-15', status: 'posted' },
  { id: '2', batchNumber: 'GJ-2', description: 'Early October batch', batchDate: '2026-10-01', status: 'draft' },
  { id: '3', batchNumber: 'GJ-3', description: 'Mid October batch', batchDate: '2026-10-15', status: 'posted' },
  { id: '4', batchNumber: 'GJ-4', description: 'End October batch', batchDate: '2026-10-31', status: 'approved' },
  { id: '5', batchNumber: 'GJ-5', description: 'November batch', batchDate: '2026-11-05', status: 'draft' },
]

function filterVisible(rows, { status = '', search = '', dateFrom = '', dateTo = '' } = {}) {
  return rows.filter((r) =>
    (!status || r.status === status) &&
    (!search || `${r.batchNumber} ${r.description}`.toLowerCase().includes(search.trim().toLowerCase())) &&
    (!dateFrom || r.batchDate >= dateFrom) &&
    (!dateTo || r.batchDate <= dateTo),
  )
}

// Unfiltered
check(filterVisible(mockJournals).length === 5, 'empty date range retains all journals')

// From date only
const afterOct1 = filterVisible(mockJournals, { dateFrom: '2026-10-01' })
check(afterOct1.length === 4 && !afterOct1.some(j => j.batchDate < '2026-10-01'), 'from date filter excludes earlier journals')

// To date only
const beforeOct31 = filterVisible(mockJournals, { dateTo: '2026-10-31' })
check(beforeOct31.length === 4 && !beforeOct31.some(j => j.batchDate > '2026-10-31'), 'to date filter excludes later journals')

// Date range inclusive
const octOnly = filterVisible(mockJournals, { dateFrom: '2026-10-01', dateTo: '2026-10-31' })
check(octOnly.length === 3, 'inclusive date range retains exact matching period')
check(octOnly.map(j => j.batchNumber).join(',') === 'GJ-2,GJ-3,GJ-4', 'october date range returns GJ-2, GJ-3, GJ-4')

// Single day range
const singleDay = filterVisible(mockJournals, { dateFrom: '2026-10-15', dateTo: '2026-10-15' })
check(singleDay.length === 1 && singleDay[0].batchNumber === 'GJ-3', 'single-day range matches exact batch date')

// Out of range
const future = filterVisible(mockJournals, { dateFrom: '2027-01-01', dateTo: '2027-12-31' })
check(future.length === 0, 'out of range dates produce empty list')

// Inverted range
const inverted = filterVisible(mockJournals, { dateFrom: '2026-11-01', dateTo: '2026-10-01' })
check(inverted.length === 0, 'inverted range produces empty list')

// Combined with status and search
const octPosted = filterVisible(mockJournals, { dateFrom: '2026-10-01', dateTo: '2026-10-31', status: 'posted' })
check(octPosted.length === 1 && octPosted[0].batchNumber === 'GJ-3', 'date range combined with status filter')

const octSearch = filterVisible(mockJournals, { dateFrom: '2026-10-01', dateTo: '2026-10-31', search: 'early' })
check(octSearch.length === 1 && octSearch[0].batchNumber === 'GJ-2', 'date range combined with search filter')

// Preset calculation check
const fixedDate = new Date(2026, 9, 20) // October 20, 2026
const mtd = dashboardDateRange('month-to-date', fixedDate)
check(mtd.dateFrom === '2026-10-01' && mtd.dateTo === '2026-10-20', 'month-to-date preset bounds')

const lastMonth = dashboardDateRange('last-month', fixedDate)
check(lastMonth.dateFrom === '2026-09-01' && lastMonth.dateTo === '2026-09-30', 'last-month preset bounds')

const ytd = dashboardDateRange('year-to-date', fixedDate)
check(ytd.dateFrom === '2026-01-01' && ytd.dateTo === '2026-10-20', 'year-to-date preset bounds')

console.log(`${checks} journal date range filter checks passed`)
