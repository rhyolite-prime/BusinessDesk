<script setup lang="ts">
import { journalRateDisplay } from '../../../features/ledger/journal-rate-display'
import {
  Plus,
  CircleCheck,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Send,
  X,
  Search,
  RefreshCw,
} from '@lucide/vue'
import type { Journal, JournalLine, JournalFilterParams } from '../../../features/ledger/journal-types'
import { emptyJournalOptions } from '../../../features/ledger/journal-types'
import { dashboardDateRange } from '../../../features/ledger/dashboard-filters'
import { useJournals } from '../../../features/ledger/useJournals'

const displayBudgetAmount = (value: string | undefined) => value === undefined ? '—' : formatDecimalAmount(value)
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Journals' })
const api = useJournals(),
  { unitId } = api
const units = ref<Awaited<ReturnType<typeof api.units>>>([]),
  rows = ref<Journal[]>([]),
  options = ref(emptyJournalOptions())
const loading = ref(false),
  loaded = ref(false),
  saving = ref(false),
  searching = ref(false),
  error = ref(''),
  actionError = ref(''),
  search = ref(''),
  query = ref(''),
  status = ref(''),
  dateFrom = ref(''),
  dateTo = ref(''),
  datePreset = ref('all'),
  page = ref(1),
  pageSize = ref(20),
  total = ref(0),
  totalPages = ref(1),
  expanded = ref('')

const startDate = dateFrom,
  endDate = dateTo

const route = useRoute()
const initialFrom = String(
  route.query.dateFrom || route.query.startDate || route.query.from || '',
)
const initialTo = String(
  route.query.dateTo || route.query.endDate || route.query.to || '',
)
if (initialFrom || initialTo) {
  dateFrom.value = initialFrom
  dateTo.value = initialTo
  datePreset.value = 'custom'
}
if (route.query.status && typeof route.query.status === 'string') {
  status.value = route.query.status
}
if (
  (route.query.search || route.query.q) &&
  typeof (route.query.search || route.query.q) === 'string'
) {
  search.value = String(route.query.search || route.query.q)
  query.value = search.value.trim()
}
if (route.query.page || route.query.pageNo) {
  const p = Number(route.query.page || route.query.pageNo)
  if (Number.isInteger(p) && p > 0) page.value = p
}
if (route.query.pageSize || route.query.size) {
  const s = Number(route.query.pageSize || route.query.size)
  if (Number.isInteger(s) && s > 0 && s <= 200) pageSize.value = s
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(search, (newVal) => {
  searching.value = true
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    query.value = newVal.trim()
    page.value = 1
  }, 350)
})

function submitSearch() {
  clearTimeout(searchTimer)
  query.value = search.value.trim()
  page.value = 1
}

function clearSearch() {
  clearTimeout(searchTimer)
  search.value = ''
  query.value = ''
  page.value = 1
}

function applyDatePreset() {
  if (datePreset.value === 'all') {
    dateFrom.value = ''
    dateTo.value = ''
    page.value = 1
    return
  }
  if (datePreset.value === 'custom') return
  const { dateFrom: from, dateTo: through } = dashboardDateRange(
    datePreset.value as any,
  )
  dateFrom.value = from
  dateTo.value = through
  page.value = 1
}

function clearDates() {
  dateFrom.value = ''
  dateTo.value = ''
  datePreset.value = 'all'
  page.value = 1
}

watch([dateFrom, dateTo], ([from, to]) => {
  if (!from && !to && datePreset.value !== 'all') {
    datePreset.value = 'all'
  }
})

const activeSearch = computed(() => (query.value || search.value).trim())

const filters = reactive({
  search,
  query,
  status,
  dateFrom,
  dateTo,
  startDate,
  endDate,
  datePreset,
  page,
  pageSize,
})

const manualExpanded = ref<Record<string, boolean>>({})

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatch(text: string | undefined | null, query: string): string {
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

function getLineAccountNumber(line: JournalLine): string {
  if (line.accountNumber) return line.accountNumber
  if (!line.accountId) return ''
  const acc = options.value.accounts.find((a) => a.id === line.accountId)
  return acc?.accountNumber || ''
}

function getLineAccountName(line: JournalLine): string {
  if (line.accountName) return line.accountName
  if (!line.accountId) return ''
  const acc = options.value.accounts.find((a) => a.id === line.accountId)
  return acc?.name || ''
}

function formatLineAccount(line: JournalLine): string {
  const num = getLineAccountNumber(line)
  const name = getLineAccountName(line)
  if (num && name) return `${num} · ${name}`
  return num || name || '—'
}

function getLineCostCenter(line: JournalLine): string {
  if (line.organizationUnitName) return line.organizationUnitName
  const id = line.costCenterId || line.organizationUnitId
  if (!id) return ''
  const cc = options.value.costCenters.find((c) => c.id === id)
  return cc?.name || ''
}

function lineMatchesSearch(line: JournalLine, query: string): boolean {
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

function isLineMatched(line: JournalLine): boolean {
  return lineMatchesSearch(line, activeSearch.value)
}

function headerMatchesSearch(row: Journal, query: string): boolean {
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

function hasMatchingTransactionDetail(row: Journal, query: string): boolean {
  if (!query.trim()) return false
  if (!row.lines || !row.lines.length) return false
  return row.lines.some((l) => lineMatchesSearch(l, query))
}

function countMatchingLines(row: Journal, query: string): number {
  if (!query.trim() || !row.lines) return 0
  return row.lines.filter((l) => lineMatchesSearch(l, query)).length
}

function journalMatchesSearch(row: Journal, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  return headerMatchesSearch(row, q) || hasMatchingTransactionDetail(row, q)
}

const autoExpandedIds = computed(() => {
  const q = activeSearch.value
  const set = new Set<string>()
  if (!q) return set
  for (const r of rows.value) {
    if (hasMatchingTransactionDetail(r, q)) {
      set.add(r.id)
    }
  }
  return set
})

function isExpanded(id: string): boolean {
  if (manualExpanded.value[id] !== undefined) {
    return manualExpanded.value[id]
  }
  if (autoExpandedIds.value.has(id)) {
    return true
  }
  return expanded.value === id
}

function toggleExpand(id: string) {
  const current = isExpanded(id)
  manualExpanded.value = {
    ...manualExpanded.value,
    [id]: !current,
  }
  expanded.value = !current ? id : ''
}

watch(activeSearch, () => {
  manualExpanded.value = {}
  if (autoExpandedIds.value.size > 0) {
    expanded.value = Array.from(autoExpandedIds.value)[0] || ''
  } else if (!activeSearch.value) {
    expanded.value = ''
  }
})

const target = ref<Journal | null>(null),
  action = ref<'post' | 'delete'>('post'),
  periodId = ref(''),
  periodLoading = ref(false)
let version = 0
const message = (e: any) =>
  e?.data?.statusMessage || 'Request failed. Please retry.'

const visible = computed(() => rows.value)

async function load() {
  const current = ++version,
    unit = unitId.value
  error.value = ''
  target.value = null
  if (!unit) {
    rows.value = []
    total.value = 0
    totalPages.value = 1
    loading.value = false
    searching.value = false
    return
  }
  loading.value = true
  try {
    const filterParams: JournalFilterParams = {
      pageNo: page.value,
      pageSize: pageSize.value,
      ...(query.value ? { search: query.value } : {}),
      ...(status.value ? { status: status.value } : {}),
      ...(dateFrom.value ? { dateFrom: dateFrom.value } : {}),
      ...(dateTo.value ? { dateTo: dateTo.value } : {}),
    }
    const [r, o] = await Promise.all([
      api.list(unit, filterParams),
      options.value.accounts.length ? Promise.resolve(options.value) : api.options(unit),
    ])
    if (current !== version) return
    rows.value = r.items || []
    total.value = r.total ?? rows.value.length
    totalPages.value = r.totalPages || Math.max(1, Math.ceil(total.value / pageSize.value))
    if (page.value > Math.max(1, totalPages.value)) {
      page.value = Math.max(1, totalPages.value)
    }
    options.value = o
    loaded.value = true
  } catch (e) {
    if (current === version) {
      rows.value = []
      total.value = 0
      totalPages.value = 1
      error.value = message(e)
    }
  } finally {
    if (current === version) {
      loading.value = false
      searching.value = false
    }
  }
}
onMounted(async () => {
  try {
    units.value = await api.units()
    if (!units.value.some((u) => u.id === unitId.value)) unitId.value = ''
    if (unitId.value) await load()
  } catch (e) {
    error.value = message(e)
  }
})
watch(unitId, () => {
  page.value = 1
  void load()
})
watch([page, query, status, dateFrom, dateTo, pageSize], () => {
  if (unitId.value) void load()
})
onUnmounted(() => {
  clearTimeout(searchTimer)
  version++
})
const eligiblePeriods = computed(() =>
  !target.value
    ? []
    : options.value.periods.filter(
        (p) =>
          target.value!.batchDate >= p.beginDate &&
          target.value!.batchDate <= p.endDate &&
          target.value!.lines.every(
            (line) =>
              line.transactionDate >= p.beginDate &&
              line.transactionDate <= p.endDate,
          ),
      ),
)
let periodRequest = 0
async function refreshPostingPeriods() {
  if (!target.value || action.value !== 'post') return
  const current = version,
    row = target.value,
    request = ++periodRequest
  periodLoading.value = true
  actionError.value = ''
  periodId.value = ''
  options.value.periods = []
  try {
    const fresh = await api.options(unitId.value)
    if (
      current !== version ||
      request !== periodRequest ||
      target.value !== row ||
      action.value !== 'post'
    )
      return
    options.value.periods = fresh.periods
    if (eligiblePeriods.value.some((p) => p.id === row.periodId))
      periodId.value = row.periodId!
    else if (eligiblePeriods.value.length === 1)
      periodId.value = eligiblePeriods.value[0]!.id
  } catch (e) {
    if (
      current === version &&
      request === periodRequest &&
      target.value === row
    )
      actionError.value = message(e)
  } finally {
    if (request === periodRequest) periodLoading.value = false
  }
}
function confirm(row: Journal, kind: 'post' | 'delete') {
  target.value = row
  action.value = kind
  actionError.value = ''
  periodId.value = ''
  periodRequest++
  periodLoading.value = false
  if (kind === 'post') void refreshPostingPeriods()
}
async function execute() {
  if (
    !target.value ||
    saving.value ||
    periodLoading.value ||
    (action.value === 'post' &&
      !eligiblePeriods.value.some((p) => p.id === periodId.value))
  )
    return
  const row = target.value,
    current = version
  saving.value = true
  actionError.value = ''
  try {
    if (action.value === 'post') {
      const saved = await api.request<Journal>(
        `/api/ledger/journals/${row.id}/post`,
        {
          method: 'POST',
          body: {
            accountingUnitId: unitId.value,
            version: row.version,
            periodId: periodId.value,
          },
        },
      )
      if (current !== version) return
      rows.value = rows.value.map((r) => (r.id === row.id ? saved : r))
    } else {
      await api.request(`/api/ledger/journals/${row.id}`, {
        method: 'DELETE',
        query: { accountingUnitId: unitId.value, version: row.version },
      })
      if (current !== version) return
      rows.value = rows.value.filter((r) => r.id !== row.id)
    }
    target.value = null
  } catch (e) {
    if (current === version) actionError.value = message(e)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs text-slate-400">General Ledger / Transactions</p>
        <h1 class="mt-2 text-3xl font-semibold">Journals</h1>
        <p class="mt-2 text-sm text-slate-500">
          Single- and multi-currency drafts. Final posting updates ledger
          balances atomically.
        </p>
      </div>
      <NuxtLink
        v-if="loaded"
        to="/ledger/journals/new"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white"
        ><Plus :size="15" />New journal</NuxtLink
      >
    </header>
    <section
      class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]"
    >
      <label class="text-xs font-semibold"
        >Accounting unit<select
          v-model="unitId"
          :disabled="loading || saving"
          class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        >
          <option value="">Select an accounting unit</option>
          <option v-for="u in units" :key="u.id" :value="u.id">
            {{ u.code }} · {{ u.name }}
          </option>
        </select></label
      ><label class="text-xs font-semibold"
        >Date range<select
          v-model="datePreset"
          aria-label="Date range"
          :disabled="loading || saving || !unitId"
          class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
          @change="applyDatePreset"
        >
          <option value="all">All dates</option>
          <option value="month-to-date">Month to date</option>
          <option value="quarter-to-date">Quarter to date</option>
          <option value="year-to-date">Year to date</option>
          <option value="last-month">Last month</option>
          <option value="custom">Custom range</option>
        </select></label
      ><label class="text-xs font-semibold"
        >From date<input
          v-model="dateFrom"
          type="date"
          aria-label="From date"
          min="1900-01-01"
          :max="dateTo || '2999-12-31'"
          :disabled="loading || saving || !unitId"
          class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
          @input="datePreset = 'custom'"
      /></label
      ><label class="text-xs font-semibold"
        >To date<input
          v-model="dateTo"
          type="date"
          aria-label="To date"
          :min="dateFrom || '1900-01-01'"
          max="2999-12-31"
          :disabled="loading || saving || !unitId"
          class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
          @input="datePreset = 'custom'"
      /></label
      ><div class="relative min-w-[260px] flex-1 sm:max-w-xs">
        <Search
          :size="14"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          v-model="search"
          type="search"
          aria-label="Search journals"
          placeholder="Search batch no, ref, cheque, description, cost centre, GL account…"
          :disabled="saving || !unitId"
          class="h-10 w-full rounded-lg border border-slate-200 bg-transparent pl-8 pr-8 text-xs outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:focus:border-brand-400"
          @keydown.enter.prevent="submitSearch"
        />
        <span
          v-if="searching || loading"
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-600 dark:text-brand-400"
          title="Searching database…"
        >
          <RefreshCw :size="14" class="animate-spin" />
        </span>
        <button
          v-else-if="search"
          type="button"
          aria-label="Clear search"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          @click="clearSearch"
        >
          <X :size="14" />
        </button>
      </div><select
        v-model="status"
        aria-label="Filter by status"
        :disabled="loading || saving || !unitId"
        class="h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
      >
        <option value="">All statuses</option>
        <option
          v-for="s in [
            'draft',
            'posted',
            'pending_approval',
            'approved',
            'rejected',
            'voided',
            'reversed',
          ]"
          :key="s"
        >
          {{ s }}
        </option></select
      ><button
        v-if="dateFrom || dateTo"
        type="button"
        aria-label="Clear date range"
        class="h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        @click="clearDates"
      >
        Clear dates</button
      ><button
        :disabled="loading || saving || !unitId"
        class="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        @click="load"
      >
        <RefreshCw :size="12" :class="loading ? 'animate-spin' : ''" /> Refresh
      </button>
    </section>
    <div
      v-if="searching || loading"
      role="status"
      class="flex items-center gap-2 text-xs font-medium text-brand-700 dark:text-brand-300"
    >
      <RefreshCw :size="13" class="animate-spin" />
      <span>{{ activeSearch ? 'Searching database across batches and transaction lines…' : 'Loading journals from database…' }}</span>
    </div>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
    >
      {{ error }}
    </p>
    <section
      class="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]"
    >
      <table class="w-full min-w-[850px] text-left text-xs">
        <thead
          class="bg-slate-50 text-[10px] uppercase text-slate-400 dark:bg-slate-900"
        >
          <tr>
            <th class="p-4">Journal</th>
            <th>Date / mode</th>
            <th class="text-right">Base debit</th>
            <th class="text-right">Base credit</th>
            <th class="px-4">Status</th>
            <th class="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="loading">
            <td colspan="6" class="p-12 text-center text-slate-400">
              <div class="flex flex-col items-center justify-center gap-3">
                <div class="relative flex h-10 w-10 items-center justify-center">
                  <span
                    class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400/20 dark:bg-brand-500/20"
                  ></span>
                  <span
                    class="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  >
                    <RefreshCw :size="16" class="animate-spin" />
                  </span>
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {{
                      activeSearch
                        ? 'Searching database records…'
                        : 'Loading journals…'
                    }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-slate-400">
                    {{
                      activeSearch
                        ? 'Scanning batch numbers, line references, cheques, descriptions, cost centres, and GL accounts'
                        : 'Retrieving journal batches and transaction lines from database'
                    }}
                  </p>
                </div>
              </div>
            </td>
          </tr>
          <tr v-else-if="!visible.length">
            <td colspan="6" class="p-12 text-center text-slate-400">
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {{
                  !unitId
                    ? 'Select an accounting unit to view journals'
                    : activeSearch
                      ? 'No matching journals found'
                      : 'No journals found'
                }}
              </p>
              <p
                v-if="unitId && activeSearch"
                class="mt-1 text-xs text-slate-400"
              >
                No records matched your search query across batch headers and line details. Try different keywords or clear the search.
              </p>
              <button
                v-if="unitId && activeSearch"
                type="button"
                class="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="clearSearch"
              >
                <X :size="12" /> Clear search
              </button>
            </td>
          </tr>
          <template v-else v-for="row in visible" :key="row.id">
            <tr
              :class="hasMatchingTransactionDetail(row, activeSearch)
                ? 'bg-amber-50/30 dark:bg-amber-950/20'
                : ''"
            >
              <td class="p-4">
                <button
                  :aria-expanded="isExpanded(row.id)"
                  class="flex items-center gap-2 font-semibold"
                  @click="toggleExpand(row.id)"
                >
                  <ChevronDown
                    v-if="isExpanded(row.id)"
                    :size="14"
                  /><ChevronRight v-else :size="14" />
                  <span v-html="highlightMatch(row.batchNumber, activeSearch)"></span>
                  <span
                    v-if="hasMatchingTransactionDetail(row, activeSearch)"
                    class="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                  >
                    {{ countMatchingLines(row, activeSearch) }} line match{{ countMatchingLines(row, activeSearch) > 1 ? 'es' : '' }}
                  </span>
                </button>
                <p
                  class="ml-5 mt-1 text-slate-400"
                  v-html="highlightMatch(row.description, activeSearch)"
                ></p>
              </td>
              <td>
                {{ row.batchDate }}
                <p class="mt-1 text-slate-400">
                  {{
                    row.isMultiCurrency ? 'Multi-currency' : 'Single currency'
                  }}
                </p>
              </td>
              <td class="text-right font-mono">
                {{ displayBudgetAmount(row.totalDebit) }}
              </td>
              <td class="text-right font-mono">
                {{ displayBudgetAmount(row.totalCredit) }}
              </td>
              <td class="px-4">
                <span
                  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-4 ring-1 ring-inset"
                  :class="row.status === 'posted'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25'
                    : 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25'"
                  :title="row.status === 'posted' ? 'Posted to the ledger; read-only' : 'Saved draft; not yet posted to the ledger'"
                  :aria-label="`Journal status: ${row.status === 'posted' ? 'Posted' : 'Draft'}`"
                >
                  <CircleCheck v-if="row.status === 'posted'" :size="12" aria-hidden="true" />
                  <Pencil v-else :size="12" aria-hidden="true" />
                  {{ row.status === 'posted' ? 'Posted' : 'Draft' }}
                </span>
              </td>
              <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                  <NuxtLink
                    :to="{
                      path: '/ledger/journals/new',
                      query: { id: row.id, accountingUnitId: unitId },
                    }"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-700"
                    ><Pencil :size="12" />{{
                      row.status === 'draft' ? 'Edit draft' : 'View'
                    }}</NuxtLink
                  ><button
                    :disabled="saving || row.status !== 'draft'"
                    aria-label="Post journal"
                    class="p-2 text-brand-700 disabled:opacity-30"
                    @click="confirm(row, 'post')"
                  >
                    <Send :size="15" /></button
                  ><button
                    :disabled="saving || row.status !== 'draft'"
                    aria-label="Delete journal"
                    class="p-2 text-rose-500 disabled:opacity-30"
                    @click="confirm(row, 'delete')"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="isExpanded(row.id)">
              <td colspan="6" class="bg-slate-50/50 p-5 dark:bg-slate-900/30">
                <table class="w-full text-xs">
                  <thead class="text-left text-slate-400">
                    <tr>
                      <th>Account / detail</th>
                      <th>Date</th>
                      <th>Currency / rate</th>
                      <th class="text-right">Debit (transaction / base)</th>
                      <th class="text-right">Credit (transaction / base)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(l, idx) in row.lines"
                      :key="l.id || idx"
                      class="transition-colors border-b border-slate-100 last:border-b-0 dark:border-slate-800/60"
                      :class="isLineMatched(l)
                        ? 'bg-amber-50/90 font-medium dark:bg-amber-950/40 ring-1 ring-inset ring-amber-300/60 dark:ring-amber-700/50'
                        : ''"
                      :data-matched="isLineMatched(l) ? 'true' : undefined"
                    >
                      <td class="py-2.5 pl-2 pr-4">
                        <div class="flex items-center gap-1.5">
                          <span
                            class="font-semibold"
                            v-html="highlightMatch(formatLineAccount(l), activeSearch)"
                          ></span>
                          <span
                            v-if="isLineMatched(l)"
                            class="rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-500/30 dark:text-amber-200"
                          >
                            Matched
                          </span>
                        </div>
                        <p
                          v-if="l.description"
                          class="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300"
                          v-html="highlightMatch(l.description, activeSearch)"
                        ></p>
                        <div
                          v-if="l.referenceNumber || l.chequeNumber || getLineCostCenter(l)"
                          class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400"
                        >
                          <span v-if="l.referenceNumber" class="inline-flex items-center gap-1">
                            <span class="font-medium text-slate-400 dark:text-slate-500">Ref:</span>
                            <span v-html="highlightMatch(l.referenceNumber, activeSearch)"></span>
                          </span>
                          <span v-if="l.chequeNumber" class="inline-flex items-center gap-1">
                            <span class="font-medium text-slate-400 dark:text-slate-500">Cheque:</span>
                            <span v-html="highlightMatch(l.chequeNumber, activeSearch)"></span>
                          </span>
                          <span v-if="getLineCostCenter(l)" class="inline-flex items-center gap-1">
                            <span class="font-medium text-slate-400 dark:text-slate-500">Cost centre:</span>
                            <span v-html="highlightMatch(getLineCostCenter(l), activeSearch)"></span>
                          </span>
                        </div>
                      </td>
                      <td class="py-2.5 whitespace-nowrap">{{ l.transactionDate }}</td>
                      <td class="py-2.5 whitespace-nowrap">
                        {{ l.currencyCode }} /
                        {{ journalRateDisplay(l.exchangeRate) }}
                      </td>
                      <td class="py-2.5 text-right font-mono whitespace-nowrap">
                        {{ displayBudgetAmount(l.debit) }} / {{ displayBudgetAmount(l.baseDebit) }}
                      </td>
                      <td class="py-2.5 text-right font-mono whitespace-nowrap">
                        {{ displayBudgetAmount(l.credit) }} / {{ displayBudgetAmount(l.baseCredit) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <footer
        v-if="unitId && total > 0"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span>
            Showing
            <strong class="font-medium text-slate-700 dark:text-slate-200">
              {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }}
            </strong>
            of
            <strong class="font-medium text-slate-700 dark:text-slate-200">
              {{ total }}
            </strong>
            journal{{ total === 1 ? '' : 's' }}
          </span>
          <label class="flex items-center gap-1 text-[11px]">
            <span>Show:</span>
            <select
              v-model.number="pageSize"
              aria-label="Journals per page"
              :disabled="loading || saving"
              class="h-8 rounded-lg border border-slate-200 bg-transparent px-2 text-xs outline-none focus:border-brand-500 dark:border-slate-700"
              @change="page = 1"
            >
              <option :value="10">10 / page</option>
              <option :value="20">20 / page</option>
              <option :value="50">50 / page</option>
              <option :value="100">100 / page</option>
            </select>
          </label>
        </div>
        <div class="flex items-center gap-1">
          <span class="mr-2 text-xs text-slate-400">
            Page {{ page }} of {{ Math.max(1, totalPages) }}
          </span>
          <button
            :disabled="loading || saving || page <= 1"
            aria-label="First page"
            title="First page"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="page = 1"
          >
            <ChevronsLeft :size="14" />
          </button>
          <button
            :disabled="loading || saving || page <= 1"
            aria-label="Previous page"
            class="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="page--"
          >
            <ChevronLeft :size="14" /> Prev
          </button>
          <button
            :disabled="loading || saving || page >= totalPages"
            aria-label="Next page"
            class="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="page++"
          >
            Next <ChevronRight :size="14" />
          </button>
          <button
            :disabled="loading || saving || page >= totalPages"
            aria-label="Last page"
            title="Last page"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="page = totalPages"
          >
            <ChevronsRight :size="14" />
          </button>
        </div>
      </footer>
    </section>
    <div
      v-if="target"
      class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"
      @click.self="!saving && (target = null)"
    >
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="action === 'post' ? 'Post journal' : 'Delete journal'"
        class="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-[#15201e]"
      >
        <header class="flex justify-between">
          <h2 class="font-semibold">
            {{ action === 'post' ? 'Final posting' : 'Delete draft' }} ·
            {{ target.batchNumber }}
          </h2>
          <button :disabled="saving" aria-label="Close" @click="target = null">
            <X :size="16" />
          </button>
        </header>
        <p class="mt-3 text-xs text-slate-500">
          {{
            action === 'post'
              ? 'Posting is final: the journal becomes read-only and updates ledger balances.'
              : 'The draft and its lines will be soft-deleted; audit history is retained.'
          }}
        </p>
        <label v-if="action === 'post'" class="mt-4 block text-xs"
          >Posting period<select
            v-model="periodId"
            :disabled="periodLoading || saving"
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
          >
            <option value="">Select an open period</option>
            <option v-for="p in eligiblePeriods" :key="p.id" :value="p.id">
              {{ p.period }} · {{ p.beginDate }} — {{ p.endDate }}
            </option></select
          ><span
            v-if="!periodLoading && !eligiblePeriods.length"
            class="mt-2 block text-amber-600"
            >No open period covers the batch date and every line date. Create or
            open an eligible period before posting.</span
          ></label
        >
        <div v-if="action === 'post'" class="mt-3 space-y-2 text-xs">
          <p v-if="periodLoading" role="status" class="text-slate-400">
            Refreshing open periods…
          </p>
          <p class="font-mono">
            Local debit {{ displayBudgetAmount(target.totalDebit) }} · Local credit
            {{ displayBudgetAmount(target.totalCredit) }}
          </p>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              :to="{
                path: '/ledger/accounting-periods',
                query: { year: target.batchDate.slice(0, 4) },
              }"
              class="text-brand-700 underline"
              >Manage accounting periods</NuxtLink
            >
            <button
              type="button"
              :disabled="periodLoading || saving"
              class="text-brand-700 underline"
              @click="refreshPostingPeriods"
            >
              Refresh open periods
            </button>
          </div>
        </div>
        <p v-if="actionError" role="alert" class="mt-3 text-xs text-rose-600">
          {{ actionError }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            :disabled="saving"
            class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
            @click="target = null"
          >
            Cancel</button
          ><button
            :disabled="
              saving ||
              periodLoading ||
              (action === 'post' &&
                !eligiblePeriods.some((p) => p.id === periodId))
            "
            class="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            @click="execute"
          >
            {{
              saving
                ? 'Saving…'
                : action === 'post'
                  ? 'Confirm final posting'
                  : 'Delete draft'
            }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
