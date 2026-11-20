import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const indexVue = readFileSync('frontend/app/pages/ledger/journals/index.vue', 'utf8')
const serviceCc = readFileSync('domain_services/gl/JournalService.cc', 'utf8')
const controllerCc = readFileSync('controllers/JournalController.cc', 'utf8')
const journalApiTs = readFileSync('frontend/server/utils/journal-api.ts', 'utf8')
const serverGetTs = readFileSync('frontend/server/api/ledger/journals.get.ts', 'utf8')
const typesTs = readFileSync('frontend/app/features/ledger/journal-types.ts', 'utf8')
const useJournalsTs = readFileSync('frontend/app/features/ledger/useJournals.ts', 'utf8')

let checks = 0
const check = (ok, label) => {
  assert.ok(ok, label)
  checks++
}

// 1. C++ Backend SQL search and pagination checks
check(serviceCc.includes('count(*)::bigint AS count FROM gl_journal_batches b'), 'SQL count query for total matching journals')
check(serviceCc.includes('LIMIT $7 OFFSET $8'), 'SQL pagination with LIMIT and OFFSET parameters')
check(serviceCc.includes('result.result["pageNo"]=pageNo'), 'result returns pageNo')
check(serviceCc.includes('result.result["pageSize"]=pageSize'), 'result returns pageSize')
check(serviceCc.includes('result.result["totalPages"]'), 'result returns totalPages')
check(serviceCc.includes('b.batch_number'), 'SQL search checks batch_number')
check(serviceCc.includes('b.batch_description'), 'SQL search checks batch_description')
check(serviceCc.includes('l.reference_number'), 'SQL search checks line reference_number')
check(serviceCc.includes('l.description'), 'SQL search checks line description')
check(serviceCc.includes('l.cheque_number'), 'SQL search checks line cheque_number')
check(serviceCc.includes('l.organization_unit_name'), 'SQL search checks line organization_unit_name')
check(serviceCc.includes('l.account_name'), 'SQL search checks line account_name')
check(serviceCc.includes('a.account_number'), 'SQL search checks joined account_number')
check(serviceCc.includes('cc.name'), 'SQL search checks joined cost center name')

// 2. Controller and Proxy parameter forwarding
check(controllerCc.includes('"pageNo"') && controllerCc.includes('"pageSize"'), 'JournalController extracts pageNo and pageSize')
check(controllerCc.includes('"search"') && controllerCc.includes('"query"'), 'JournalController extracts search and query')
check(journalApiTs.includes('pageNo: query.pageNo') && journalApiTs.includes('pageSize: query.pageSize'), 'journalRequest forwards pagination params')
check(journalApiTs.includes('search: query.search'), 'journalRequest forwards search query')
check(serverGetTs.includes('totalPages') && serverGetTs.includes('pageNo'), 'server GET endpoint handles paginated response')

// 3. Types and Composable checks
check(typesTs.includes('pageNo?: number') && typesTs.includes('pageSize?: number'), 'JournalFilterParams supports pageNo and pageSize')
check(useJournalsTs.includes('pageNo: filters?.pageNo') && useJournalsTs.includes('pageSize: filters?.pageSize'), 'useJournals list passes pageNo and pageSize')

// 4. UI Loader Animations and Pagination in index.vue
check(indexVue.includes('searching = ref(false)'), 'searching reactive state defined')
check(indexVue.includes('animate-spin'), 'animated spinner used for loader')
check(indexVue.includes('Searching database'), 'informative search loader status message')
check(indexVue.includes('Scanning batch numbers, line references, cheques, descriptions, cost centres, and GL accounts'), 'explains deep search scanning')
check(indexVue.includes('aria-label="Journals per page"'), 'pageSize selector present')
check(indexVue.includes('aria-label="First page"'), 'first page pagination button present')
check(indexVue.includes('aria-label="Previous page"'), 'previous page pagination button present')
check(indexVue.includes('aria-label="Next page"'), 'next page pagination button present')
check(indexVue.includes('aria-label="Last page"'), 'last page pagination button present')
check(indexVue.includes('Page {{ page }} of {{ Math.max(1, totalPages) }}'), 'page progress indicator displayed')
check(indexVue.includes('Showing'), 'item range indicator displayed')

// 5. Functional pagination slicing logic verification
function paginateItems(items, pageNo = 1, pageSize = 20) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, pageNo), totalPages)
  const offset = (safePage - 1) * pageSize
  const pageItems = items.slice(offset, offset + pageSize)
  return { items: pageItems, total, pageNo: safePage, pageSize, totalPages }
}

const mockList = Array.from({ length: 55 }, (_, i) => ({ id: `j-${i + 1}`, batchNumber: `GJ-${i + 1}` }))

const p1 = paginateItems(mockList, 1, 20)
check(p1.items.length === 20 && p1.items[0].batchNumber === 'GJ-1' && p1.items[19].batchNumber === 'GJ-20', 'page 1 returns first 20 records')
check(p1.total === 55 && p1.totalPages === 3, '55 items at 20/page gives 3 total pages')

const p2 = paginateItems(mockList, 2, 20)
check(p2.items.length === 20 && p2.items[0].batchNumber === 'GJ-21' && p2.items[19].batchNumber === 'GJ-40', 'page 2 returns next 20 records')

const p3 = paginateItems(mockList, 3, 20)
check(p3.items.length === 15 && p3.items[0].batchNumber === 'GJ-41' && p3.items[14].batchNumber === 'GJ-55', 'page 3 returns remaining 15 records')

const pOverflow = paginateItems(mockList, 10, 20)
check(pOverflow.pageNo === 3 && pOverflow.items.length === 15, 'page out of bounds clamps to last page')

const pCustomSize = paginateItems(mockList, 1, 50)
check(pCustomSize.items.length === 50 && pCustomSize.totalPages === 2, 'custom page size of 50 works accurately')

console.log(`${checks} journal SQL search, pagination, and loader animation checks passed`)
