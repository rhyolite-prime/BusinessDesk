<script setup lang="ts">
import { AlertTriangle, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign, Copy, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import type { AccountsResponse, LedgerAccount } from '../../../features/ledger/types'
import type { LedgerBudget, LedgerBudgetDetail, LedgerBudgetStatus } from '../../../features/ledger/budget-data'
import { budgetOrganizationalUnits, useLedgerBudgets } from '../../../features/ledger/budget-data'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Budgets' })

type BudgetAmountOption = 'different' | 'same-as-last-year' | 'percentage-of-last-year'
type AllocationMethod = 'each-period' | 'shared-equally' | 'individual-period'
type BudgetTarget = 'budget' | 'revised'

interface BudgetPeriod {
  key: string
  month: number
  year: number
  label: string
}

const monthOptions = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((name, index) => ({ value: index + 1, name }))
const currentYear = new Date().getFullYear()
const api = useLedgerApi()
const setup = useLedgerBudgets()
const { money, num } = useFormat()
const { data: accountData, pending: accountsPending, error: accountDataError } = await useAsyncData<AccountsResponse>(
  'ledger-budget-account-options',
  () => api.accounts(),
)

const accounts = computed(() => accountData.value?.items ?? [])
const activeAccounts = computed(() => accounts.value.filter((account) => account.status === 'Active'))
const budgets = setup.budgets
const organizationUnits = budgetOrganizationalUnits

const search = ref('')
const yearFilter = ref('all')
const unitFilter = ref('')
const statusFilter = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const editingBudget = computed(() => budgets.value.find((budget) => budget.id === editingId.value))
const deleteTarget = ref<LedgerBudget | null>(null)
const saveError = ref('')
const expandedIds = ref(new Set<string>())
const periodAmounts = reactive<Record<string, string>>({})

const form = reactive({
  accountId: '',
  organizationUnitId: '',
  beginMonth: 1,
  beginYear: currentYear,
  endMonth: 12,
  endYear: currentYear,
  amountOption: 'different' as BudgetAmountOption,
  allocationMethod: 'each-period' as AllocationMethod,
  budgetTarget: 'budget' as BudgetTarget,
  amount: '0',
  percentage: '10',
  status: 'draft' as LedgerBudgetStatus,
})

function periodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getPeriods(beginYear: number, beginMonth: number, endYear: number, endMonth: number): BudgetPeriod[] {
  if (![beginYear, beginMonth, endYear, endMonth].every(Number.isInteger)) return []
  if (beginYear < 1900 || beginYear > 2100 || endYear < 1900 || endYear > 2100) return []
  if (beginMonth < 1 || beginMonth > 12 || endMonth < 1 || endMonth > 12) return []
  if (beginYear > endYear || (beginYear === endYear && beginMonth > endMonth)) return []

  const rows: BudgetPeriod[] = []
  let year = beginYear
  let month = beginMonth
  while (year < endYear || (year === endYear && month <= endMonth)) {
    rows.push({
      key: periodKey(year, month),
      month,
      year,
      label: `${monthOptions[month - 1]?.name} ${year}`,
    })
    if (rows.length > 60) return rows
    month += 1
    if (month === 13) {
      month = 1
      year += 1
    }
  }
  return rows
}

const periodRows = computed(() => getPeriods(
  Number(form.beginYear),
  Number(form.beginMonth),
  Number(form.endYear),
  Number(form.endMonth),
))

watch(periodRows, (rows) => {
  const activeKeys = new Set(rows.map((period) => period.key))
  for (const period of rows) {
    if (periodAmounts[period.key] === undefined) periodAmounts[period.key] = '0'
  }
  for (const key of Object.keys(periodAmounts)) {
    if (!activeKeys.has(key)) delete periodAmounts[key]
  }
}, { immediate: true })

function accountFor(accountId: string): LedgerAccount | undefined {
  return accounts.value.find((account) => account.id === accountId)
}

function unitFor(unitId: string) {
  return organizationUnits.find((unit) => unit.id === unitId)
}

function findPriorBudget(targetYear: number): LedgerBudget | undefined {
  return budgets.value
    .filter((budget) => budget.id !== editingId.value
      && budget.accountId === form.accountId
      && budget.organizationUnitId === form.organizationUnitId
      && (budget.status === 'approved' || budget.status === 'closed')
      && budget.details.some((detail) => detail.year === targetYear))
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0]
}

function priorYearAmount(period: BudgetPeriod): number | null {
  const source = findPriorBudget(period.year - 1)
  const line = source?.details.find((detail) => detail.year === period.year - 1 && detail.month === period.month)
  if (!line) return null
  if (form.budgetTarget === 'revised' && line.revisedAmount > 0) return line.revisedAmount
  return line.budgetAmount
}

const priorYearBudget = computed(() => periodRows.value.length
  ? findPriorBudget(periodRows.value[0]!.year - 1)
  : undefined)
const missingPriorPeriods = computed(() => periodRows.value.filter((period) => priorYearAmount(period) === null))
const usesPriorYear = computed(() => form.amountOption !== 'different')

function numericValue(value: string | number): number {
  if (typeof value === 'string' && value.trim() === '') return Number.NaN
  const parsed = typeof value === 'number' ? value : Number(value.trim())
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const generatedAmounts = computed(() => {
  const rows = periodRows.value
  const result: Record<string, number> = {}
  if (!rows.length) return result

  if (form.amountOption === 'same-as-last-year') {
    for (const period of rows) result[period.key] = priorYearAmount(period) ?? 0
    return result
  }
  if (form.amountOption === 'percentage-of-last-year') {
    const percentage = numericValue(form.percentage)
    for (const period of rows) {
      const previous = priorYearAmount(period)
      result[period.key] = previous === null || !Number.isFinite(percentage)
        ? 0
        : roundMoney(previous * (1 + percentage / 100))
    }
    return result
  }

  if (form.allocationMethod === 'each-period') {
    const amount = numericValue(form.amount)
    for (const period of rows) result[period.key] = Number.isFinite(amount) ? roundMoney(amount) : 0
    return result
  }
  if (form.allocationMethod === 'shared-equally') {
    const total = numericValue(form.amount)
    if (!Number.isFinite(total)) return result
    const perPeriod = roundMoney(total / rows.length)
    let allocated = 0
    rows.forEach((period, index) => {
      const amount = index === rows.length - 1 ? roundMoney(total - allocated) : perPeriod
      result[period.key] = amount
      allocated = roundMoney(allocated + amount)
    })
    return result
  }

  for (const period of rows) {
    const amount = numericValue(periodAmounts[period.key] ?? '0')
    result[period.key] = Number.isFinite(amount) ? roundMoney(amount) : 0
  }
  return result
})

const previewTotal = computed(() => Object.values(generatedAmounts.value).reduce((total, amount) => total + amount, 0))
const budgetTotal = computed(() => budgets.value.reduce((total, budget) => total + budget.details.reduce((sum, detail) => sum + detail.budgetAmount, 0), 0))
const revisedTotal = computed(() => budgets.value.reduce((total, budget) => total + budget.details.reduce((sum, detail) => sum + detail.revisedAmount, 0), 0))
const openPlanCount = computed(() => budgets.value.filter((budget) => budget.status === 'draft' || budget.status === 'submitted').length)
const scheduledPeriodCount = computed(() => budgets.value.reduce((total, budget) => total + budget.details.length, 0))

const availableYears = computed(() => [...new Set(budgets.value.flatMap((budget) => budget.details.map((detail) => detail.year)))].sort((a, b) => b - a))
const visibleBudgets = computed(() => {
  const query = search.value.trim().toLowerCase()
  return [...budgets.value]
    .filter((budget) => {
      const account = accountFor(budget.accountId)
      const matchesSearch = !query || [
        budget.accountNumber,
        budget.accountName,
        account?.name ?? '',
        account?.accountNumber ?? '',
        budget.organizationUnitName,
        budget.status,
      ].some((value) => value.toLowerCase().includes(query))
      const matchesYear = yearFilter.value === 'all' || budget.details.some((detail) => String(detail.year) === yearFilter.value)
      const matchesUnit = !unitFilter.value || budget.organizationUnitId === unitFilter.value
      const matchesStatus = !statusFilter.value || budget.status === statusFilter.value
      return matchesSearch && matchesYear && matchesUnit && matchesStatus
    })
    .sort((a, b) => b.beginDate.localeCompare(a.beginDate) || a.accountNumber.localeCompare(b.accountNumber))
})

function budgetSum(budget: LedgerBudget, key: 'budgetAmount' | 'revisedAmount') {
  return budget.details.reduce((total, detail) => total + detail[key], 0)
}

function periodLabel(budget: LedgerBudget) {
  return `${formatDate(budget.beginDate)} — ${formatDate(budget.endDate)}`
}

function statusText(status: LedgerBudgetStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusClass(status: LedgerBudgetStatus) {
  const classes: Record<LedgerBudgetStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    submitted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    closed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  }
  return classes[status]
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function resetPeriodAmounts(rows: BudgetPeriod[]) {
  for (const key of Object.keys(periodAmounts)) delete periodAmounts[key]
  for (const period of rows) periodAmounts[period.key] = '0'
}

function openCreate() {
  editingId.value = null
  saveError.value = ''
  Object.assign(form, {
    accountId: activeAccounts.value[0]?.id ?? '',
    organizationUnitId: organizationUnits[0]?.id ?? '',
    beginMonth: 1,
    beginYear: currentYear,
    endMonth: 12,
    endYear: currentYear,
    amountOption: 'different' as BudgetAmountOption,
    allocationMethod: 'each-period' as AllocationMethod,
    budgetTarget: 'budget' as BudgetTarget,
    amount: '0',
    percentage: '10',
    status: 'draft' as LedgerBudgetStatus,
  })
  resetPeriodAmounts(getPeriods(form.beginYear, form.beginMonth, form.endYear, form.endMonth))
  showForm.value = true
}

function openEdit(budget: LedgerBudget) {
  editingId.value = budget.id
  saveError.value = ''
  const hasRevisedAmounts = budget.details.some((detail) => detail.revisedAmount > 0)
  const budgetTarget: BudgetTarget = hasRevisedAmounts ? 'revised' : 'budget'
  const begin = budget.beginDate.split('-').map(Number)
  const end = budget.endDate.split('-').map(Number)
  Object.assign(form, {
    accountId: budget.accountId,
    organizationUnitId: budget.organizationUnitId,
    beginMonth: begin[1] || 1,
    beginYear: begin[0] || currentYear,
    endMonth: end[1] || 12,
    endYear: end[0] || currentYear,
    amountOption: 'different' as BudgetAmountOption,
    allocationMethod: 'individual-period' as AllocationMethod,
    budgetTarget,
    amount: '0',
    percentage: '10',
    status: budget.status,
  })
  const rows = getPeriods(form.beginYear, form.beginMonth, form.endYear, form.endMonth)
  resetPeriodAmounts(rows)
  for (const detail of budget.details) {
    periodAmounts[periodKey(detail.year, detail.month)] = String(budgetTarget === 'budget' ? detail.budgetAmount : detail.revisedAmount)
  }
  showForm.value = true
}

function createIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function saveBudget() {
  saveError.value = ''
  const selectedAccount = accountFor(form.accountId)
  const existing = budgets.value.find((budget) => budget.id === editingId.value)
  const selectedUnit = unitFor(form.organizationUnitId)
  const rows = periodRows.value
  const beginYear = Number(form.beginYear)
  const endYear = Number(form.endYear)
  const beginMonth = Number(form.beginMonth)
  const endMonth = Number(form.endMonth)

  if ((!selectedAccount && !existing) || (selectedAccount && selectedAccount.status !== 'Active' && !editingId.value)) {
    saveError.value = 'Choose an active General Ledger account.'
    return
  }
  if (!selectedUnit) {
    saveError.value = 'Choose an organizational unit.'
    return
  }
  if (!rows.length || rows.length > 60) {
    saveError.value = 'Enter a valid date range of no more than 60 monthly periods.'
    return
  }
  if (rows.some((period) => period.year < 1900 || period.year > 2100)) {
    saveError.value = 'Budget years must be between 1900 and 2100.'
    return
  }
  if (usesPriorYear.value && missingPriorPeriods.value.length) {
    saveError.value = `There is no matching prior-year amount for ${missingPriorPeriods.value[0]?.label}. Choose another amount option or complete the prior-year schedule first.`
    return
  }
  if (form.amountOption === 'percentage-of-last-year') {
    const percentage = numericValue(form.percentage)
    if (!Number.isFinite(percentage) || percentage < -100) {
      saveError.value = 'Enter a valid percentage of at least -100%.'
      return
    }
  }
  if (form.amountOption === 'different' && form.allocationMethod !== 'individual-period') {
    const amount = numericValue(form.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      saveError.value = 'Enter a non-negative amount for the selected allocation method.'
      return
    }
  }
  if (form.amountOption === 'different' && form.allocationMethod === 'individual-period') {
    const hasInvalidAmount = rows.some((period) => {
      const amount = numericValue(periodAmounts[period.key] ?? '')
      return !Number.isFinite(amount) || amount < 0
    })
    if (hasInvalidAmount) {
      saveError.value = 'Enter a non-negative amount for every budget period.'
      return
    }
  }

  const beginDate = createIsoDate(beginYear, beginMonth, 1)
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate()
  const endDate = createIsoDate(endYear, endMonth, lastDay)
  const duplicate = budgets.value.some((budget) => budget.id !== editingId.value
    && budget.accountId === form.accountId
    && budget.organizationUnitId === form.organizationUnitId
    && budget.beginDate === beginDate
    && budget.endDate === endDate)
  if (duplicate) {
    saveError.value = 'A budget already exists for this account, organizational unit, and date range.'
    return
  }

  const details: LedgerBudgetDetail[] = rows.map((period) => {
    const previous = existing?.details.find((detail) => detail.year === period.year && detail.month === period.month)
    const amount = generatedAmounts.value[period.key] ?? 0
    return {
      id: previous?.id ?? '',
      month: period.month,
      year: period.year,
      budgetAmount: form.budgetTarget === 'budget' ? amount : (previous?.budgetAmount ?? 0),
      revisedAmount: form.budgetTarget === 'revised' ? amount : (previous?.revisedAmount ?? 0),
    }
  })

  const payload: Omit<LedgerBudget, 'id'> & { id?: string } = {
    accountId: selectedAccount?.id ?? existing?.accountId ?? form.accountId,
    accountNumber: selectedAccount?.accountNumber ?? existing?.accountNumber ?? '',
    accountName: selectedAccount?.name ?? existing?.accountName ?? '',
    organizationUnitId: selectedUnit.id,
    organizationUnitName: selectedUnit.name,
    beginDate,
    endDate,
    status: editingId.value ? form.status : 'draft',
    details,
  }
  if (editingId.value) payload.id = editingId.value
  const saved = setup.saveBudget(payload)
  expandedIds.value = new Set([...expandedIds.value, saved.id])
  showForm.value = false
  editingId.value = null
}

function closeForm() {
  showForm.value = false
  saveError.value = ''
  editingId.value = null
}

function confirmDelete() {
  if (!deleteTarget.value) return
  setup.removeBudget(deleteTarget.value.id)
  const next = new Set(expandedIds.value)
  next.delete(deleteTarget.value.id)
  expandedIds.value = next
  deleteTarget.value = null
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Planning</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Budget</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Plan and review account budgets by organizational unit and monthly period.</p>
      </div>
      <button class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreate">
        <Plus :size="15" /> Create budget
      </button>
    </section>

    <div class="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-xs text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200">
      <CircleDollarSign :size="16" class="mt-0.5 shrink-0" />
      <p><span class="font-semibold">Preview mode:</span> budget plans are stored in local mock data until the ledger budget API is connected. Changes made here reset when the page is reloaded.</p>
    </div>

    <div v-if="accountDataError" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle :size="16" class="mt-0.5 shrink-0" />
      <p>General Ledger accounts could not be loaded. Existing budget schedules are still available, but creating a budget requires account data.</p>
    </div>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex items-center justify-between gap-3"><p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Budget plans</p><span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><CalendarDays :size="16" /></span></div>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ num(budgets.length) }}</p>
        <p class="mt-1 text-[11px] text-slate-400">{{ scheduledPeriodCount }} monthly periods scheduled</p>
      </article>
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex items-center justify-between gap-3"><p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Budgeted amount</p><span class="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><CircleDollarSign :size="16" /></span></div>
        <p class="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ money(budgetTotal) }}</p>
        <p class="mt-1 text-[11px] text-slate-400">Across all saved schedules</p>
      </article>
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex items-center justify-between gap-3"><p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Revised amount</p><span class="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"><Pencil :size="15" /></span></div>
        <p class="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ money(revisedTotal) }}</p>
        <p class="mt-1 text-[11px] text-slate-400">Approved changes and revisions</p>
      </article>
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex items-center justify-between gap-3"><p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Open plans</p><span class="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Copy :size="15" /></span></div>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ openPlanCount }}</p>
        <p class="mt-1 text-[11px] text-slate-400">Draft or submitted for review</p>
      </article>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Budget schedules</h2>
          <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{{ visibleBudgets.length }} of {{ budgets.length }} plans</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label class="relative block min-w-0 sm:w-60">
            <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="search" type="search" placeholder="Search account or unit" class="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-brand-900/40">
          </label>
          <select v-model="yearFilter" aria-label="Filter by year" class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <option value="all">All years</option>
            <option v-for="year in availableYears" :key="year" :value="String(year)">{{ year }}</option>
          </select>
          <select v-model="unitFilter" aria-label="Filter by organizational unit" class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <option value="">All units</option>
            <option v-for="unit in organizationUnits" :key="unit.id" :value="unit.id">{{ unit.name }}</option>
          </select>
          <select v-model="statusFilter" aria-label="Filter by status" class="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[980px] w-full text-left">
          <thead class="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:bg-slate-900/60">
            <tr>
              <th class="px-5 py-3">Account</th>
              <th class="px-4 py-3">Organizational unit</th>
              <th class="px-4 py-3">Budget period</th>
              <th class="px-4 py-3 text-right">Periods</th>
              <th class="px-4 py-3 text-right">Budget amount</th>
              <th class="px-4 py-3 text-right">Revised amount</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <template v-for="budget in visibleBudgets" :key="budget.id">
              <tr class="group hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <button type="button" class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="expandedIds.has(budget.id) ? 'Hide monthly schedule' : 'Show monthly schedule'" @click="toggleExpanded(budget.id)">
                      <ChevronDown v-if="expandedIds.has(budget.id)" :size="15" />
                      <ChevronRight v-else :size="15" />
                    </button>
                    <div class="min-w-0">
                      <p class="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{{ accountFor(budget.accountId)?.name ?? budget.accountName }}</p>
                      <p class="mt-0.5 text-[10px] text-slate-400">{{ accountFor(budget.accountId)?.accountNumber ?? budget.accountNumber }} <span class="mx-1">·</span> {{ accountFor(budget.accountId)?.group ?? 'General Ledger' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3.5"><span class="block max-w-[190px] truncate text-xs text-slate-600 dark:text-slate-300" :title="budget.organizationUnitName">{{ budget.organizationUnitName }}</span></td>
                <td class="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">{{ periodLabel(budget) }}</td>
                <td class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ budget.details.length }}</td>
                <td class="px-4 py-3.5 text-right text-xs font-medium tabular-nums text-slate-800 dark:text-slate-100">{{ money(budgetSum(budget, 'budgetAmount')) }}</td>
                <td class="px-4 py-3.5 text-right text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">{{ money(budgetSum(budget, 'revisedAmount')) }}</td>
                <td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold" :class="statusClass(budget.status)">{{ statusText(budget.status) }}</span></td>
                <td class="px-5 py-3.5">
                  <div class="flex items-center justify-end gap-1">
                    <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300" :aria-label="`Edit ${budget.accountName} budget`" title="Edit budget" @click="openEdit(budget)"><Pencil :size="14" /></button>
                    <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-300" :aria-label="`Delete ${budget.accountName} budget`" title="Delete budget" @click="deleteTarget = budget"><Trash2 :size="14" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedIds.has(budget.id)" class="bg-slate-50/60 dark:bg-slate-900/25">
                <td colspan="8" class="px-5 pb-4 pt-2">
                  <div class="overflow-hidden rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#111b19]">
                    <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      <div><p class="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Monthly schedule</p><p class="mt-0.5 text-[10px] text-slate-400">{{ budget.details.length }} periods <span class="mx-1">·</span> {{ budget.organizationUnitName }}</p></div>
                      <button type="button" class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30" @click="openEdit(budget)"><Pencil :size="12" /> Edit schedule</button>
                    </div>
                    <div class="max-h-72 overflow-auto">
                      <table class="w-full text-left">
                        <thead class="sticky top-0 bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:bg-slate-900">
                          <tr><th class="px-4 py-2">Period</th><th class="px-4 py-2 text-right">Budget</th><th class="px-4 py-2 text-right">Revised</th><th class="px-4 py-2 text-right">Variance</th></tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr v-for="detail in [...budget.details].sort((a, b) => a.year - b.year || a.month - b.month)" :key="detail.id" class="text-xs">
                            <td class="px-4 py-2.5 text-slate-600 dark:text-slate-300">{{ monthOptions[detail.month - 1]?.name }} {{ detail.year }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{{ money(detail.budgetAmount) }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{{ money(detail.revisedAmount) }}</td>
                            <td class="px-4 py-2.5 text-right tabular-nums" :class="detail.revisedAmount > detail.budgetAmount ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'">{{ money(detail.revisedAmount - detail.budgetAmount) }}</td>
                          </tr>
                        </tbody>
                        <tfoot class="border-t border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                          <tr><td class="px-4 py-2.5">Total</td><td class="px-4 py-2.5 text-right">{{ money(budgetSum(budget, 'budgetAmount')) }}</td><td class="px-4 py-2.5 text-right">{{ money(budgetSum(budget, 'revisedAmount')) }}</td><td class="px-4 py-2.5 text-right">{{ money(budgetSum(budget, 'revisedAmount') - budgetSum(budget, 'budgetAmount')) }}</td></tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!visibleBudgets.length">
              <td colspan="8" class="px-6 py-14 text-center">
                <div class="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><CalendarDays :size="19" /></div>
                <p class="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No budget schedules found</p>
                <p class="mt-1 text-xs text-slate-400">Try changing the search or filters, or create a budget plan.</p>
                <button type="button" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800" @click="openCreate"><Plus :size="14" /> Create budget</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" @click.self="closeForm">
      <section role="dialog" aria-modal="true" :aria-label="editingId ? 'Edit budget' : 'Create budget'" class="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-[#111b19] sm:max-h-[92vh] sm:rounded-2xl">
        <header class="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">General Ledger planning</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit budget' : 'Create budget' }}</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Set the account, organizational unit, period and monthly allocation.</p>
          </div>
          <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close" @click="closeForm"><X :size="18" /></button>
        </header>

        <form class="min-h-0 flex-1 overflow-y-auto" @submit.prevent="saveBudget">
          <div class="space-y-6 px-5 py-5 sm:px-6">
            <section class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">General Ledger account <span class="text-rose-500">*</span></span>
                <select v-model="form.accountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-brand-900/40">
                  <option value="" disabled>{{ accountsPending ? 'Loading accounts…' : 'Select an account' }}</option>
                  <option v-if="editingBudget && !accountFor(form.accountId)" :value="editingBudget.accountId">{{ editingBudget.accountNumber }} — {{ editingBudget.accountName }} (saved account)</option>
                  <option v-for="account in accounts" :key="account.id" :value="account.id" :disabled="account.status !== 'Active' && account.id !== form.accountId">{{ account.accountNumber }} — {{ account.name }}{{ account.status !== 'Active' ? ' (inactive)' : '' }}</option>
                </select>
              </label>
              <label class="block">
                <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Organizational unit <span class="text-rose-500">*</span></span>
                <select v-model="form.organizationUnitId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-brand-900/40">
                  <option value="" disabled>Select an organizational unit</option>
                  <option v-for="unit in organizationUnits" :key="unit.id" :value="unit.id">{{ unit.path }}</option>
                </select>
              </label>
            </section>

            <section>
              <div class="mb-2 flex items-center gap-2"><CalendarDays :size="15" class="text-brand-700 dark:text-brand-300" /><h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">Budget period</h3></div>
              <div class="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/30 sm:grid-cols-2">
                <div class="grid grid-cols-[1fr_112px] gap-2">
                  <label><span class="mb-1.5 block text-[10px] font-semibold text-slate-500">Beginning month</span><select v-model.number="form.beginMonth" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><option v-for="month in monthOptions" :key="month.value" :value="month.value">{{ month.name }}</option></select></label>
                  <label><span class="mb-1.5 block text-[10px] font-semibold text-slate-500">Year</span><input v-model.number="form.beginYear" type="number" min="1900" max="2100" required class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"></label>
                </div>
                <div class="grid grid-cols-[1fr_112px] gap-2">
                  <label><span class="mb-1.5 block text-[10px] font-semibold text-slate-500">Ending month</span><select v-model.number="form.endMonth" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><option v-for="month in monthOptions" :key="month.value" :value="month.value">{{ month.name }}</option></select></label>
                  <label><span class="mb-1.5 block text-[10px] font-semibold text-slate-500">Year</span><input v-model.number="form.endYear" type="number" min="1900" max="2100" required class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"></label>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400 sm:col-span-2">{{ periodRows.length }} monthly periods will be created. Schedules can span up to 60 months.</p>
              </div>
            </section>

            <section>
              <div class="mb-2 flex items-center gap-2"><CircleDollarSign :size="15" class="text-brand-700 dark:text-brand-300" /><h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">Budget amount option</h3></div>
              <div class="grid gap-2 md:grid-cols-3">
                <label class="flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors" :class="form.amountOption === 'different' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/30'">
                  <input v-model="form.amountOption" type="radio" value="different" class="mt-0.5 accent-brand-700">
                  <span><span class="block text-xs font-semibold text-slate-800 dark:text-slate-100">Different amount</span><span class="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">Set a new amount or allocation for each period.</span></span>
                </label>
                <label class="flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors" :class="form.amountOption === 'same-as-last-year' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/30'">
                  <input v-model="form.amountOption" type="radio" value="same-as-last-year" class="mt-0.5 accent-brand-700">
                  <span><span class="block text-xs font-semibold text-slate-800 dark:text-slate-100">Same as last year</span><span class="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">Copy the matching monthly amounts from the prior year.</span></span>
                </label>
                <label class="flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors" :class="form.amountOption === 'percentage-of-last-year' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/30'">
                  <input v-model="form.amountOption" type="radio" value="percentage-of-last-year" class="mt-0.5 accent-brand-700">
                  <span><span class="block text-xs font-semibold text-slate-800 dark:text-slate-100">Percentage of last year</span><span class="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">Carry forward the prior-year pattern with an adjustment.</span></span>
                </label>
              </div>
              <div v-if="usesPriorYear" class="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3.5 py-3 text-[10px] leading-4 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                <Copy :size="14" class="mt-0.5 shrink-0" />
                <p v-if="priorYearBudget">Monthly amounts are copied from the matching {{ periodRows[0]?.year ? periodRows[0].year - 1 : 'prior-year' }} schedule for {{ priorYearBudget.accountName }} · {{ priorYearBudget.organizationUnitName }}.</p>
                <p v-else>No matching prior-year schedule was found for this account and organizational unit. Choose a prior-year pair or use a different amount.</p>
              </div>
              <label v-if="form.amountOption === 'percentage-of-last-year'" class="mt-3 block max-w-xs">
                <span class="mb-1.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">Adjustment percentage</span>
                <div class="relative"><input v-model="form.percentage" type="number" step="0.01" min="-100" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span></div>
              </label>
              <p v-if="usesPriorYear && missingPriorPeriods.length" class="mt-2 text-[10px] text-amber-700 dark:text-amber-300">{{ missingPriorPeriods.length }} selected period{{ missingPriorPeriods.length === 1 ? '' : 's' }} have no matching prior-year line.</p>
            </section>

            <section>
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2"><CircleDollarSign :size="15" class="text-brand-700 dark:text-brand-300" /><h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">Allocation method</h3></div>
                <span v-if="usesPriorYear" class="text-[10px] text-slate-400">Disabled for prior-year allocation</span>
              </div>
              <div class="grid gap-2 md:grid-cols-3">
                <label class="flex gap-2.5 rounded-lg border p-3 text-[10px] transition-colors" :class="[form.allocationMethod === 'each-period' ? 'border-brand-500 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800', usesPriorYear ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']">
                  <input v-model="form.allocationMethod" type="radio" value="each-period" :disabled="usesPriorYear" class="mt-0.5 accent-brand-700">
                  <span class="font-medium leading-4 text-slate-700 dark:text-slate-300">Enter an amount to be added for each period</span>
                </label>
                <label class="flex gap-2.5 rounded-lg border p-3 text-[10px] transition-colors" :class="[form.allocationMethod === 'shared-equally' ? 'border-brand-500 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800', usesPriorYear ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']">
                  <input v-model="form.allocationMethod" type="radio" value="shared-equally" :disabled="usesPriorYear" class="mt-0.5 accent-brand-700">
                  <span class="font-medium leading-4 text-slate-700 dark:text-slate-300">Enter an amount to be shared equally</span>
                </label>
                <label class="flex gap-2.5 rounded-lg border p-3 text-[10px] transition-colors" :class="[form.allocationMethod === 'individual-period' ? 'border-brand-500 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800', usesPriorYear ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']">
                  <input v-model="form.allocationMethod" type="radio" value="individual-period" :disabled="usesPriorYear" class="mt-0.5 accent-brand-700">
                  <span class="font-medium leading-4 text-slate-700 dark:text-slate-300">Enter an amount for each individual period</span>
                </label>
              </div>

              <label v-if="form.amountOption === 'different' && form.allocationMethod !== 'individual-period'" class="mt-3 block max-w-sm">
                <span class="mb-1.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">{{ form.allocationMethod === 'each-period' ? 'Amount per period' : 'Total amount to allocate' }}</span>
                <div class="relative"><input v-model="form.amount" type="number" min="0" step="0.01" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-14 text-xs text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">{{ accounts.find((account) => account.id === form.accountId)?.currency ?? 'GHS' }}</span></div>
              </label>

              <div v-if="form.amountOption === 'different' && form.allocationMethod === 'individual-period'" class="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"><span class="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Period-by-period amounts</span><span class="text-[10px] text-slate-400">{{ periodRows.length }} periods</span></div>
                <div class="max-h-64 overflow-auto">
                  <div v-for="period in periodRows" :key="period.key" class="grid grid-cols-[1fr_160px] items-center gap-3 border-b border-slate-100 px-3.5 py-2 last:border-b-0 dark:border-slate-800">
                    <span class="text-[11px] text-slate-600 dark:text-slate-300">{{ period.label }}</span>
                    <div class="relative"><input v-model="periodAmounts[period.key]" type="number" min="0" step="0.01" :aria-label="`${period.label} amount`" class="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 pr-12 text-right text-[11px] tabular-nums text-slate-700 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><span class="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">{{ accounts.find((account) => account.id === form.accountId)?.currency ?? 'GHS' }}</span></div>
                  </div>
                  <div v-if="!periodRows.length" class="px-4 py-6 text-center text-[10px] text-amber-700 dark:text-amber-300">Choose a valid beginning and ending period to enter monthly amounts.</div>
                </div>
              </div>
            </section>

            <section>
              <div class="mb-2 flex items-center gap-2"><Check :size="15" class="text-brand-700 dark:text-brand-300" /><h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">Budget to add</h3></div>
              <div class="flex flex-wrap gap-2">
                <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs" :class="form.budgetTarget === 'budget' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-800'"><input v-model="form.budgetTarget" type="radio" value="budget" class="accent-brand-700"><span class="font-medium text-slate-700 dark:text-slate-200">Budget amount</span></label>
                <label class="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs" :class="form.budgetTarget === 'revised' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-800'"><input v-model="form.budgetTarget" type="radio" value="revised" class="accent-brand-700"><span class="font-medium text-slate-700 dark:text-slate-200">Revised amount</span></label>
              </div>
            </section>

            <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 dark:border-brand-900/50 dark:bg-brand-950/20">
              <div><p class="text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{{ form.budgetTarget === 'budget' ? 'Budget amount' : 'Revised amount' }} preview</p><p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{{ periodRows.length }} periods <span class="mx-1">·</span> {{ form.amountOption === 'different' ? 'Custom allocation' : 'Prior-year allocation' }}</p></div>
              <p class="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{{ money(previewTotal) }}</p>
            </div>

            <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{{ saveError }}</p>
          </div>

          <footer class="sticky bottom-0 flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur dark:border-slate-800 dark:bg-[#111b19]/95 sm:px-6">
            <p class="hidden text-[10px] text-slate-400 sm:block">New budget schedules start in draft status.</p>
            <div class="ml-auto flex items-center gap-2"><button type="button" class="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeForm">Cancel</button><button type="submit" :disabled="accountsPending || (!accounts.length && !editingId)" class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"><Check :size="14" />{{ editingId ? 'Save changes' : 'Save budget' }}</button></div>
          </footer>
        </form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-[2px]" @click.self="deleteTarget = null">
      <section role="alertdialog" aria-modal="true" aria-labelledby="delete-budget-title" class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#111b19]">
        <div class="flex items-start gap-3"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"><Trash2 :size="18" /></div><div><h2 id="delete-budget-title" class="text-sm font-semibold text-slate-900 dark:text-white">Delete budget schedule?</h2><p class="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">This removes the {{ deleteTarget?.details.length }} monthly lines for <span class="font-semibold text-slate-700 dark:text-slate-200">{{ deleteTarget?.accountNumber }} — {{ deleteTarget?.accountName }}</span> in {{ deleteTarget?.organizationUnitName }}. This cannot be undone in preview mode.</p></div></div>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="h-9 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="deleteTarget = null">Cancel</button><button type="button" class="h-9 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white hover:bg-rose-700" @click="confirmDelete">Delete schedule</button></div>
      </section>
    </div>
  </div>
</template>
