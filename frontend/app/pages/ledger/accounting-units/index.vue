<script setup lang="ts">
import { Plus, Pencil, Trash2, X, RefreshCw, Search } from '@lucide/vue'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Accounting Units' })
interface AccountingUnit { id: string; code: string; name: string; baseCurrencyId: string; timeZone: string; fiscalYearStartMonth: number; isActive: boolean }
interface Currency { id: string; code: string; name: string }
const request = useRequestFetch()
const units = ref<AccountingUnit[]>([])
const currencies = ref<Currency[]>([])
const page = ref(1), total = ref(0), totalPages = ref(0), search = ref(''), query = ref('')
const loading = ref(true), saving = ref(false), currencyLoading = ref(true)
const loadError = ref(''), currencyError = ref(''), formError = ref(''), deleteError = ref('')
const showForm = ref(false), editingId = ref<string | null>(null), deleteTarget = ref<AccountingUnit | null>(null)
const form = reactive({ code: '', name: '', baseCurrencyId: '', timeZone: 'UTC', fiscalYearStartMonth: 1, isActive: true })
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const timeZones = ['UTC', 'Africa/Accra', 'Africa/Lagos', 'Africa/Johannesburg', 'Europe/London', 'America/New_York', 'Asia/Dubai']
let version = 0
let debounce: ReturnType<typeof setTimeout> | undefined
const errorMessage = (error: any) => error?.data?.statusMessage || error?.message || 'Request failed. Please retry.'
const currencyName = (id: string) => currencies.value.find(currency => currency.id === id)?.code || 'Unavailable currency'
async function loadUnits() {
  const current = ++version
  loading.value = true; loadError.value = ''
  try {
    const result = await request<any>('/api/ledger/accounting-units', { query: { pageNo: page.value, pageSize: 20, query: query.value } })
    if (current !== version) return
    units.value = result.data; total.value = result.totalCount; totalPages.value = result.totalPages
    if (page.value > Math.max(1, totalPages.value)) page.value = Math.max(1, totalPages.value)
  } catch (error) { if (current === version) { units.value = []; loadError.value = errorMessage(error) } }
  finally { if (current === version) loading.value = false }
}
async function loadCurrencies() {
  currencyLoading.value = true; currencyError.value = ''
  try { currencies.value = await request('/api/ledger/accounting-unit-currencies') }
  catch (error) { currencyError.value = errorMessage(error) }
  finally { currencyLoading.value = false }
}
watch(search, value => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { query.value = value.trim(); page.value = 1 }, 300)
})
watch([page, query], () => { void loadUnits() })
onMounted(() => { void loadUnits(); void loadCurrencies() })
onUnmounted(() => { clearTimeout(debounce); version++ })
function openCreate() {
  editingId.value = null; formError.value = ''
  Object.assign(form, { code: '', name: '', baseCurrencyId: currencies.value[0]?.id || '', timeZone: 'UTC', fiscalYearStartMonth: 1, isActive: true })
  showForm.value = true
}
async function openEdit(id: string) {
  if (saving.value) return
  saving.value = true; loadError.value = ''; formError.value = ''
  try {
    const unit = await request<AccountingUnit>(`/api/ledger/accounting-units/${id}`)
    editingId.value = id
    Object.assign(form, { code: unit.code, name: unit.name, baseCurrencyId: unit.baseCurrencyId, timeZone: unit.timeZone, fiscalYearStartMonth: unit.fiscalYearStartMonth, isActive: unit.isActive })
    showForm.value = true
  } catch (error) { loadError.value = errorMessage(error) }
  finally { saving.value = false }
}
async function saveUnit() {
  if (saving.value) return
  formError.value = ''
  try { new Intl.DateTimeFormat('en', { timeZone: form.timeZone.trim() }).format() }
  catch { formError.value = 'Enter a valid IANA time zone.'; return }
  saving.value = true
  try {
    const body = { ...form, code: form.code.trim(), name: form.name.trim(), timeZone: form.timeZone.trim() }
    if (editingId.value) await request(`/api/ledger/accounting-units/${editingId.value}`, { method: 'PUT', body })
    else await request('/api/ledger/accounting-units', { method: 'POST', body })
    showForm.value = false
    await loadUnits()
  } catch (error) { formError.value = errorMessage(error) }
  finally { saving.value = false }
}
async function deleteUnit() {
  if (!deleteTarget.value || saving.value) return
  saving.value = true; deleteError.value = ''
  try {
    await request(`/api/ledger/accounting-units/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteTarget.value = null
    await loadUnits()
  } catch (error) { deleteError.value = errorMessage(error) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs text-slate-500">General Ledger</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Accounting Units</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-500">Manage your tenant's accounting units, base currencies, fiscal years and activation status.</p>
      </div>
      <button :disabled="saving || currencyLoading || !currencies.length" class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="openCreate"><Plus :size="16" /> New accounting unit</button>
    </header>
    <p v-if="currencyError" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{{ currencyError }} <button class="underline" @click="loadCurrencies">Retry currencies</button></p>
    <p v-else-if="!currencyLoading && !currencies.length" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No active base currencies are available. Ask your administrator to configure the currency catalog before creating units.</p>
    <p v-if="loadError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ loadError }}</p>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <label class="flex items-center gap-2"><Search :size="16" class="text-slate-400" /><input v-model="search" aria-label="Search accounting units" type="search" placeholder="Search code or name…" class="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /></label>
        <button :disabled="loading || saving" class="inline-flex items-center gap-2 text-sm text-brand-700 disabled:opacity-50" @click="loadUnits"><RefreshCw :size="15" /> Refresh</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th class="p-4">Code / name</th><th class="p-4">Base currency</th><th class="p-4">Time zone</th><th class="p-4">Fiscal year starts</th><th class="p-4">Status</th><th class="p-4 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="loading"><td colspan="6" class="p-8 text-center" role="status">Loading accounting units…</td></tr>
            <tr v-for="unit in loading ? [] : units" :key="unit.id">
              <td class="p-4"><strong>{{ unit.code }}</strong><p class="mt-1 text-slate-500">{{ unit.name }}</p></td>
              <td class="p-4">{{ currencyName(unit.baseCurrencyId) }}</td><td class="p-4">{{ unit.timeZone }}</td><td class="p-4">{{ months[unit.fiscalYearStartMonth - 1] }}</td>
              <td class="p-4"><span :class="unit.isActive ? 'text-emerald-700' : 'text-slate-500'">{{ unit.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="p-4 text-right"><button :disabled="saving" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Edit accounting unit" @click="openEdit(unit.id)"><Pencil :size="16" /></button><button :disabled="saving" class="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label="Delete accounting unit" @click="deleteError = ''; deleteTarget = unit"><Trash2 :size="16" /></button></td>
            </tr>
            <tr v-if="!loading && !loadError && !units.length"><td colspan="6" class="p-10 text-center text-slate-500">{{ query ? 'No matching accounting units.' : 'No accounting units yet. Create your first unit to start adding account heads.' }}</td></tr>
          </tbody>
        </table>
      </div>
      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800">
        <span>{{ total }} units · Page {{ page }} of {{ Math.max(1, totalPages) }}</span>
        <div class="flex gap-3"><button :disabled="loading || saving || page <= 1" class="disabled:opacity-40" @click="page--">Previous</button><button :disabled="loading || saving || page >= totalPages" class="disabled:opacity-40" @click="page++">Next</button></div>
        <NuxtLink to="/ledger/account-heads" class="font-semibold text-brand-700 hover:underline">Continue to Account Heads →</NuxtLink>
      </footer>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" @click.self="!saving && (showForm = false)">
      <section role="dialog" aria-modal="true" aria-labelledby="unit-form-title" class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-[#172321]">
        <header class="flex justify-between gap-4"><h2 id="unit-form-title" class="text-xl font-semibold">{{ editingId ? 'Edit accounting unit' : 'New accounting unit' }}</h2><button :disabled="saving" aria-label="Close dialog" @click="showForm = false"><X :size="20" /></button></header>
        <form class="mt-5" @submit.prevent="saveUnit"><fieldset :disabled="saving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2"><label class="block text-sm">Code<input v-model="form.code" required maxlength="40" class="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" placeholder="HQ" /></label><label class="block text-sm">Name<input v-model="form.name" required maxlength="160" class="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Head office" /></label></div>
          <label class="block text-sm">Base currency<select v-model="form.baseCurrencyId" required class="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option value="" disabled>Select a currency</option><option v-if="form.baseCurrencyId && !currencies.some(c => c.id === form.baseCurrencyId)" :value="form.baseCurrencyId" disabled>Current currency is inactive/unavailable</option><option v-for="currency in currencies" :key="currency.id" :value="currency.id">{{ currency.code }} — {{ currency.name }}</option></select></label>
          <p v-if="editingId" class="text-xs text-slate-500">The base currency cannot be changed after this unit has ledger dependencies.</p>
          <label class="block text-sm">IANA time zone<input v-model="form.timeZone" required maxlength="80" list="unit-time-zones" class="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Africa/Accra" /><datalist id="unit-time-zones"><option v-for="zone in timeZones" :key="zone" :value="zone" /></datalist></label>
          <label class="block text-sm">Fiscal year start month<select v-model.number="form.fiscalYearStartMonth" class="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option v-for="(month, index) in months" :key="month" :value="index + 1">{{ month }}</option></select></label>
          <label class="flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox" /> Active (available for Account Heads)</label>
          <p v-if="formError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ formError }}</p>
          <footer class="flex justify-end gap-3 border-t pt-4"><button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="showForm = false">Cancel</button><button type="submit" :disabled="saving || !currencies.length" class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create accounting unit' }}</button></footer>
        </fieldset></form>
      </section>
    </div>
    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" @click.self="!saving && (deleteTarget = null)">
      <section role="dialog" aria-modal="true" aria-labelledby="unit-delete-title" class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-[#172321]">
        <h2 id="unit-delete-title" class="text-xl font-semibold">Delete accounting unit?</h2><p class="mt-3 text-sm text-slate-500">Soft-delete {{ deleteTarget.code }} — {{ deleteTarget.name }}? Units with live ledger dependencies cannot be deleted.</p>
        <p v-if="deleteError" role="alert" class="mt-3 text-sm text-rose-600">{{ deleteError }}</p>
        <footer class="mt-5 flex justify-end gap-3"><button :disabled="saving" class="rounded-lg border px-3 py-2 text-sm" @click="deleteTarget = null">Cancel</button><button :disabled="saving" class="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="deleteUnit">{{ saving ? 'Deleting…' : 'Delete accounting unit' }}</button></footer>
      </section>
    </div>
  </div>
</template>
