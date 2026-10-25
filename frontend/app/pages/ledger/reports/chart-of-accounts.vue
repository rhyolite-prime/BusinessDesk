<script setup lang="ts">
import { embeddedReports } from '../../../features/reports/report-types'
import { chartOfAccountsReport } from '../../../features/reports/chart-of-accounts'
import type { AccountDetail } from '../../../features/ledger/account-detail-types'
import type { LedgerAccountControl } from '../../../features/ledger/setup-data'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: `${embeddedReports['chart-of-accounts'].title} Report` })
const request = useRequestFetch()
const units = ref<{ id: string; name: string; code: string }[]>([]), unitId = ref('')
const loading = ref(false), error = ref(''), warning = ref(''), status = ref(''), type = ref(''), search = ref('')
const snapshot = shallowRef<Parameters<typeof chartOfAccountsReport>[0] | null>(null)
const report = computed(() => snapshot.value ? chartOfAccountsReport({ ...snapshot.value, status: status.value, type: type.value, query: search.value }) : null)
let version = 0, debounce: ReturnType<typeof setTimeout> | undefined
const searchInput = ref('')
watch(searchInput, value => { clearTimeout(debounce); debounce = setTimeout(() => { search.value = value }, 300) })
async function allPages<T>(resource: string, selected: string, current: number): Promise<T[]> {
  const rows: T[] = []
  for (let pageNo = 1; ; pageNo++) {
    if (current !== version) return []
    if (pageNo > 500) throw new Error('This report exceeds 100,000 records. Contact your administrator.')
    const result = await request<{ data: T[]; totalPages: number }>(`/api/ledger/${resource}`, { query: { accountingUnitId: selected, pageNo, pageSize: 200 } })
    if (current !== version) return []
    rows.push(...result.data)
    if (!result.data.length || pageNo >= result.totalPages) return rows
  }
}
async function profile() {
  try { return await request<{ companyName: string }>('/api/shared/company-profile') }
  catch (e: any) { if (e?.statusCode === 404 || e?.status === 404) return null; throw e }
}
async function load() {
  const current = ++version, selected = unitId.value
  snapshot.value = null; error.value = ''; warning.value = ''; loading.value = !!selected
  if (!selected) return
  try {
    const [accounts, controls, currencies, unit, company] = await Promise.all([
      allPages<AccountDetail>('accounts', selected, current), allPages<LedgerAccountControl>('account-controls', selected, current),
      request<{ id: string; name: string; code: string }[]>('/api/ledger/accounting-unit-currencies'),
      request<{ name: string; baseCurrencyId: string; timeZone: string }>(`/api/ledger/accounting-units/${selected}`), profile(),
    ])
    if (current !== version) return
    if (!company?.companyName) warning.value = 'Company profile is not configured. The report header will indicate this.'
    snapshot.value = { accounts, controls, currencies, companyName: company?.companyName || '', unitName: unit.name, baseCurrencyId: unit.baseCurrencyId,
      generatedAt: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: unit.timeZone || 'UTC' }).format(new Date()) }
  } catch (e: any) { if (current === version) error.value = e?.data?.statusMessage || e?.message || 'Unable to load report records.' }
  finally { if (current === version) loading.value = false }
}
watch(unitId, () => { void load() })
onMounted(async () => {
  loading.value = true
  try { units.value = await request('/api/ledger/account-head-units'); if (units.value[0]) unitId.value = units.value[0].id; else loading.value = false }
  catch (e: any) { error.value = e?.data?.statusMessage || 'Unable to load accounting units.'; loading.value = false }
})
onBeforeUnmount(() => { version++; clearTimeout(debounce) })
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">General Ledger · Reports</p><h1 class="mt-1 text-2xl font-semibold">Chart of Accounts</h1><p class="mt-2 text-sm text-slate-500">An embedded standard report of account numbers, names and currencies, grouped by account type and control.</p></div><NuxtLink to="/ledger/accounts" class="text-xs font-semibold text-brand-700 dark:text-brand-300">Back to account details →</NuxtLink></div>
    <section class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <label class="text-xs font-semibold">Accounting unit<select v-model="unitId" class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"><option value="">Select accounting unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} · {{ unit.name }}</option></select></label>
      <label class="text-xs font-semibold">Account type<select v-model="type" class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"><option value="">All types</option><option v-for="(name, index) in ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']" :key="name" :value="String(index)">{{ name }}</option></select></label>
      <label class="text-xs font-semibold">Status<select v-model="status" class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label class="min-w-48 flex-1 text-xs font-semibold">Search<input v-model="searchInput" maxlength="120" type="search" placeholder="Account number, name or control…" class="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label>
      <button type="button" :disabled="loading || !unitId" class="h-10 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-50" @click="load">Refresh report</button>
    </section>
    <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{{ error }} <button class="font-semibold underline" @click="load">Retry</button></p>
    <p v-if="warning" role="status" class="text-sm text-amber-700">{{ warning }}</p>
    <p v-if="loading" role="status" class="p-8 text-center text-sm text-slate-500">Loading report records…</p>
    <p v-else-if="!unitId && !error" class="p-8 text-center text-sm text-slate-500">Select an accounting unit to view its report.</p>
    <ReportViewer v-if="report && !loading" :report="report" />
  </div>
</template>
