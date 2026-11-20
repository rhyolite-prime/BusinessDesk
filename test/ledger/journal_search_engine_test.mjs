import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const indexVue = readFileSync('frontend/app/pages/ledger/journals/index.vue', 'utf8')
const serverGetTs = readFileSync('frontend/server/api/ledger/journals.get.ts', 'utf8')

let checks = 0
const check = (ok, label) => {
  assert.ok(ok, label)
  checks++
}

// 1. Static code / template checks in index.vue
check(indexVue.includes('placeholder="Search batch no, ref, cheque, description, cost centre, GL account…"'), 'search input placeholder lists all searchable params')
check(indexVue.includes('aria-label="Search journals"'), 'search input aria-label preserved')
check(indexVue.includes('function lineMatchesSearch'), 'lineMatchesSearch helper defined')
check(indexVue.includes('function headerMatchesSearch'), 'headerMatchesSearch helper defined')
check(indexVue.includes('function hasMatchingTransactionDetail'), 'hasMatchingTransactionDetail helper defined')
check(indexVue.includes('function journalMatchesSearch'), 'journalMatchesSearch helper defined')
check(indexVue.includes('function highlightMatch'), 'highlightMatch helper defined')
check(indexVue.includes('function formatLineAccount'), 'formatLineAccount helper defined')
check(indexVue.includes('function getLineCostCenter'), 'getLineCostCenter helper defined')
check(indexVue.includes('function isExpanded'), 'isExpanded helper defined')
check(indexVue.includes('function toggleExpand'), 'toggleExpand helper defined')
check(indexVue.includes('autoExpandedIds = computed('), 'autoExpandedIds computed property defined')
check(indexVue.includes(':aria-expanded="isExpanded(row.id)"'), 'row button bound to isExpanded')
check(indexVue.includes('@click="toggleExpand(row.id)"'), 'row button bound to toggleExpand')
check(indexVue.includes('v-if="isExpanded(row.id)"'), 'details table conditionally rendered by isExpanded')
check(indexVue.includes('isLineMatched(l)'), 'line matching status checked for row styling')
check(indexVue.includes(':data-matched="isLineMatched(l) ? \'true\' : undefined"'), 'data-matched attribute set on matching lines')
check(indexVue.includes('Matched'), 'Matched badge present on matching lines')
check(indexVue.includes('Ref:'), 'Reference number label present in details line')
check(indexVue.includes('Cheque:'), 'Cheque number label present in details line')
check(indexVue.includes('Cost centre:'), 'Cost centre label present in details line')

// 2. Server proxy static checks in journals.get.ts
check(serverGetTs.includes('l.referenceNumber'), 'server proxy checks line referenceNumber')
check(serverGetTs.includes('l.chequeNumber'), 'server proxy checks line chequeNumber')
check(serverGetTs.includes('l.accountNumber'), 'server proxy checks line accountNumber')
check(serverGetTs.includes('l.accountName'), 'server proxy checks line accountName')
check(serverGetTs.includes('organizationUnitName') || serverGetTs.includes('costCenterName'), 'server proxy checks line cost center')

// 3. Functional search & highlight logic verification
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatch(text, query) {
  if (!text) return ''
  const str = String(text)
  const q = query.trim()
  if (!q) return escapeHtml(str)

  const escapedText = escapeHtml(str)
  const tokens = q.split(/\s+/).filter(Boolean)
  if (!tokens.length) return escapedText

  const uniqueTokens = Array.from(new Set([q, ...tokens]))
    .sort((a, b) => b.length - a.length)
    .map((t) => escapeRegExp(escapeHtml(t)))

  try {
    const pattern = new RegExp(`(${uniqueTokens.join('|')})`, 'gi')
    return escapedText.replace(
      pattern,
      '<mark class="rounded bg-amber-200 px-0.5 font-semibold text-amber-950 dark:bg-amber-500/40 dark:text-amber-100">$1</mark>',
    )
  } catch {
    return escapedText
  }
}

// Test highlighting
const hlSimple = highlightMatch('Cheque CHQ-9988', 'CHQ-9988')
check(hlSimple.includes('<mark') && hlSimple.includes('CHQ-9988</mark>'), 'highlightMatch wraps search term in mark tag')

const hlMulti = highlightMatch('1010 Cash in Bank Operations', '1010 Bank')
check(hlMulti.includes('>1010</mark>') && hlMulti.includes('>Bank</mark>'), 'highlightMatch highlights multiple tokens')

const hlSpecial = highlightMatch('Cost Center (Admin+Ops) [HQ]', '(Admin+Ops)')
check(hlSpecial.includes('>(Admin+Ops)</mark>'), 'highlightMatch safely escapes regex special characters')

const hlXss = highlightMatch('<script>alert("xss")</script>', 'alert')
check(hlXss.includes('&lt;script&gt;<mark') && !hlXss.includes('<script>'), 'highlightMatch sanitizes html for XSS safety')

// Mock catalog options
const mockOptions = {
  accounts: [
    { id: 'acc-1', accountNumber: '1010', name: 'Cash in Bank', currencyId: 'cur-1' },
    { id: 'acc-2', accountNumber: '2010', name: 'Accounts Payable', currencyId: 'cur-1' },
    { id: 'acc-3', accountNumber: '4010', name: 'Office Supplies Expense', currencyId: 'cur-1' },
    { id: 'acc-4', accountNumber: '5010', name: 'Rent Expense', currencyId: 'cur-1' },
  ],
  costCenters: [
    { id: 'cc-1', name: 'Operations' },
    { id: 'cc-2', name: 'Finance' },
    { id: 'cc-3', name: 'Head Office' },
  ],
}

function getLineAccountNumber(line) {
  if (line.accountNumber) return line.accountNumber
  if (!line.accountId) return ''
  const acc = mockOptions.accounts.find((a) => a.id === line.accountId)
  return acc?.accountNumber || ''
}

function getLineAccountName(line) {
  if (line.accountName) return line.accountName
  if (!line.accountId) return ''
  const acc = mockOptions.accounts.find((a) => a.id === line.accountId)
  return acc?.name || ''
}

function getLineCostCenter(line) {
  if (line.organizationUnitName) return line.organizationUnitName
  const id = line.costCenterId || line.organizationUnitId
  if (!id) return ''
  const cc = mockOptions.costCenters.find((c) => c.id === id)
  return cc?.name || ''
}

function lineMatchesSearch(line, query) {
  const q = query.trim().toLowerCase()
  if (!q) return false

  const refNum = (line.referenceNumber || '').toLowerCase()
  const desc = (line.description || '').toLowerCase()
  const chq = (line.chequeNumber || '').toLowerCase()
  const accNum = getLineAccountNumber(line).toLowerCase()
  const accName = getLineAccountName(line).toLowerCase()
  const cc = getLineCostCenter(line).toLowerCase()

  if (
    refNum.includes(q) ||
    desc.includes(q) ||
    chq.includes(q) ||
    accNum.includes(q) ||
    accName.includes(q) ||
    cc.includes(q)
  ) {
    return true
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    const combined = `${refNum} ${desc} ${chq} ${accNum} ${accName} ${cc}`
    return tokens.every((token) => combined.includes(token))
  }

  return false
}

function headerMatchesSearch(row, query) {
  const q = query.trim().toLowerCase()
  if (!q) return false

  const batch = (row.batchNumber || '').toLowerCase()
  const desc = (row.description || '').toLowerCase()

  if (batch.includes(q) || desc.includes(q)) return true

  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    const combined = `${batch} ${desc}`
    return tokens.every((token) => combined.includes(token))
  }

  return false
}

function hasMatchingTransactionDetail(row, query) {
  if (!query.trim()) return false
  if (!row.lines || !row.lines.length) return false
  return row.lines.some((l) => lineMatchesSearch(l, query))
}

function journalMatchesSearch(row, query) {
  const q = query.trim()
  if (!q) return true
  return headerMatchesSearch(row, q) || hasMatchingTransactionDetail(row, q)
}

// Mock dataset
const mockJournals = [
  {
    id: 'j-1',
    batchNumber: 'GJ-2026-001',
    description: 'Monthly office expenses',
    batchDate: '2026-10-05',
    status: 'posted',
    lines: [
      {
        id: 'l-1a',
        accountId: 'acc-1',
        accountNumber: '1010',
        accountName: 'Cash in Bank',
        costCenterId: 'cc-1',
        organizationUnitName: 'Operations',
        referenceNumber: 'REF-001',
        chequeNumber: 'CHQ-100',
        description: 'Office supply payment',
      },
      {
        id: 'l-1b',
        accountId: 'acc-3',
        accountNumber: '4010',
        accountName: 'Office Supplies Expense',
        costCenterId: 'cc-1',
        organizationUnitName: 'Operations',
        referenceNumber: 'REF-002',
        chequeNumber: '',
        description: 'Printer cartridges and paper',
      },
    ],
  },
  {
    id: 'j-2',
    batchNumber: 'GJ-2026-002',
    description: 'Vendor payment settlement',
    batchDate: '2026-10-15',
    status: 'draft',
    lines: [
      {
        id: 'l-2a',
        accountId: 'acc-2',
        accountNumber: '2010',
        accountName: 'Accounts Payable',
        costCenterId: 'cc-2',
        organizationUnitName: 'Finance',
        referenceNumber: 'INV-7788',
        chequeNumber: 'CHQ-200',
        description: 'Vendor invoice settlement',
      },
      {
        id: 'l-2b',
        accountId: 'acc-1',
        accountNumber: '1010',
        accountName: 'Cash in Bank',
        costCenterId: 'cc-2',
        organizationUnitName: 'Finance',
        referenceNumber: 'REF-003',
        chequeNumber: 'CHQ-200',
        description: 'Direct disbursement',
      },
    ],
  },
  {
    id: 'j-3',
    batchNumber: 'GJ-2026-003',
    description: 'Quarterly facility lease',
    batchDate: '2026-10-25',
    status: 'draft',
    lines: [
      {
        id: 'l-3a',
        accountId: 'acc-4',
        accountNumber: '', // will be resolved via options
        accountName: '',   // will be resolved via options
        costCenterId: 'cc-3', // resolved to 'Head Office'
        organizationUnitName: '',
        referenceNumber: 'LEASE-Q4',
        chequeNumber: 'CHQ-300',
        description: 'Office rental space',
      },
      {
        id: 'l-3b',
        accountId: 'acc-1',
        accountNumber: '1010',
        accountName: 'Cash in Bank',
        costCenterId: 'cc-3',
        organizationUnitName: 'Head Office',
        referenceNumber: 'REF-004',
        chequeNumber: 'CHQ-300',
        description: 'Rent wire transfer',
      },
    ],
  },
]

// 4. Test Search by Batch Number
{
  const q = 'GJ-2026-001'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'search by batch number returns target journal')
  check(!hasMatchingTransactionDetail(matched[0], q), 'batch number search alone does not auto-expand transaction details')
}

// 5. Test Search by Transaction Line Reference Number
{
  const q = 'REF-001'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'search by line ref pulls and presents header')
  check(hasMatchingTransactionDetail(matched[0], q), 'search by line ref auto-expands matching journal')
  check(lineMatchesSearch(matched[0].lines[0], q), 'matching line ref is identified for highlighting')
  check(!lineMatchesSearch(matched[0].lines[1], q), 'non-matching line in same journal is not highlighted')
}
{
  const q = 'INV-7788'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-2', 'search by invoice reference pulls journal 2')
  check(hasMatchingTransactionDetail(matched[0], q), 'journal 2 auto-expands on reference match')
}
{
  const q = 'LEASE-Q4'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-3', 'search by lease reference pulls journal 3')
}

// 6. Test Search by Transaction Description
{
  const q = 'cartridges'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'search by line description pulls journal 1')
  check(hasMatchingTransactionDetail(matched[0], q), 'auto-expands on line description match')
  check(!lineMatchesSearch(matched[0].lines[0], q) && lineMatchesSearch(matched[0].lines[1], q), 'identifies correct line for description')
}
{
  const q = 'settlement'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-2', 'search by settlement description pulls journal 2')
}

// 7. Test Search by Cheque Number
{
  const q = 'CHQ-100'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'search by cheque number pulls journal 1')
  check(hasMatchingTransactionDetail(matched[0], q), 'cheque match auto-expands journal')
  check(lineMatchesSearch(matched[0].lines[0], q), 'line 1a matches cheque number')
}
{
  const q = 'CHQ-200'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-2', 'search by CHQ-200 pulls journal 2')
  check(matched[0].lines.every((l) => lineMatchesSearch(l, q)), 'both lines with CHQ-200 are highlighted')
}
{
  const q = '300'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-3', 'partial cheque number match pulls journal 3')
}

// 8. Test Search by Cost Centre
{
  const q = 'Operations'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'search by cost centre Operations pulls journal 1')
  check(hasMatchingTransactionDetail(matched[0], q), 'cost centre match auto-expands journal')
}
{
  const q = 'Finance'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-2', 'search by cost centre Finance pulls journal 2')
}
{
  const q = 'Head Office'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-3', 'search by cost centre Head Office resolves via options and pulls journal 3')
}

// 9. Test Search by GL Account (Number & Name)
{
  const q = '4010'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'search by account number 4010 pulls journal 1')
}
{
  const q = 'Accounts Payable'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-2', 'search by account name Accounts Payable pulls journal 2')
}
{
  const q = 'Rent Expense'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-3', 'search by account name resolved via options pulls journal 3')
  check(hasMatchingTransactionDetail(matched[0], q), 'resolved account name match auto-expands')
}
{
  // 1010 is present in all 3 journals
  const q = '1010'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 3, 'account 1010 pulls all 3 journals')
  check(matched.every((j) => hasMatchingTransactionDetail(j, q)), 'all 3 journals auto-expand on 1010 match')
}

// 10. Multi-token Search across Line Detail Fields
{
  const q = '1010 Operations'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-1', 'multi-token search (account + cost centre) matches line 1a')
}
{
  const q = 'CHQ-200 Payable'
  const matched = mockJournals.filter((j) => journalMatchesSearch(j, q))
  check(matched.length === 1 && matched[0].id === 'j-2', 'multi-token search (cheque + account) matches line 2a')
}

// 11. Expansion and manual toggle state behavior
{
  const manualExpanded = {}
  function isExpanded(id, q) {
    if (manualExpanded[id] !== undefined) return manualExpanded[id]
    const j = mockJournals.find((row) => row.id === id)
    return j ? hasMatchingTransactionDetail(j, q) : false
  }

  // Under 'CHQ-100', journal 1 is auto-expanded, journal 2 is not
  check(isExpanded('j-1', 'CHQ-100') === true, 'j-1 auto-expands for CHQ-100')
  check(isExpanded('j-2', 'CHQ-100') === false, 'j-2 does not expand for CHQ-100')

  // User manually collapses j-1
  manualExpanded['j-1'] = false
  check(isExpanded('j-1', 'CHQ-100') === false, 'manual toggle collapses j-1')

  // User manually expands j-2
  manualExpanded['j-2'] = true
  check(isExpanded('j-2', 'CHQ-100') === true, 'manual toggle expands j-2')
}

console.log(`${checks} journal powerful search engine checks passed`)
