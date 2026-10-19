<script setup lang="ts">
import { Plus, Pencil, Trash2, X, RefreshCw, Search } from '@lucide/vue'
import type { LedgerAccountControl, LedgerAccountHead } from '../../../features/ledger/setup-data'
import { standardAccountTypes } from '../../../features/ledger/setup-data'
import { buildAccountHeadTree } from '../../../features/ledger/account-head-tree'
import type { AccountDetail, AccountDetailInput } from '../../../features/ledger/account-detail-types'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Chart of Account Details' })
const request = useRequestFetch()
const unitId = useState<string>('ledger-accounting-unit', () => '')
const units = ref<{ id: string; code: string; name: string }[]>([])
const accounts = ref<AccountDetail[]>([]), controls = ref<LedgerAccountControl[]>([]), heads = ref<LedgerAccountHead[]>([])
const currencies = ref<{ id: string; code: string; name: string }[]>([])
const loading = ref(true), saving = ref(false), error = ref(''), saveError = ref(''), deleteError = ref('')
const search = ref(''), statusFilter = ref(''), showForm = ref(false), editingId = ref<string | null>(null), deleteTarget = ref<AccountDetail | null>(null)
const form = reactive<AccountDetailInput>({ accountingUnitId: '', accountHeaderId: '', accountNumber: '', accountName: '', currencyId: null, status: 'active', allowManualPosting: true, isControlAccount: false })
let version = 0
const message = (e: any) => e?.data?.statusMessage || e?.message || 'Request failed. Please retry.'
const headRows = computed(() => buildAccountHeadTree(heads.value))
const headName = (id: string) => headRows.value.find(row => row.head.id === id)?.path || 'Unavailable head'
function controlPath(id: string) {
  const names: string[] = [], seen = new Set<string>()
  let current = controls.value.find(row => row.id === id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id); names.unshift(current.accountHeaderName)
    current = controls.value.find(row => row.id === current?.parentAccountHeaderId)
  }
  return names.join(' / ') || 'Unavailable control'
}
const eligibleControls = computed(() => controls.value.filter(control => control.isActive && heads.value.some(head => head.id === control.accountGroupId && head.isActive) && !controls.value.some(child => child.parentAccountHeaderId === control.id)))
const selectedControl = computed(() => controls.value.find(row => row.id === form.accountHeaderId))
const selectedType = computed(() => heads.value.find(head => head.id === selectedControl.value?.accountGroupId)?.standardAccountType || 'Select a control')
const visibleAccounts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return accounts.value.filter(row => (!statusFilter.value || row.status === statusFilter.value) && (!term || `${row.accountNumber} ${row.accountName} ${headName(row.accountGroupId)} ${controlPath(row.accountHeaderId)}`.toLowerCase().includes(term)))
    .sort((a, b) => Number(a.accountNumber) - Number(b.accountNumber) || a.id.localeCompare(b.id))
})
const currencyName = (id: string | null) => currencies.value.find(row => row.id === id)?.code || (id ? 'Inactive/unavailable currency' : 'Unit base currency')
async function pages(resource: string, unit: string, current: number) {
  const rows: any[] = []
  for (let pageNo = 1; ; pageNo++) {
    if (pageNo > 50) throw new Error('Too many records to display. Contact your administrator.')
    const result = await request<any>(`/api/ledger/${resource}`, { query: { accountingUnitId: unit, pageNo, pageSize: 200 } })
    if (current !== version) return []
    rows.push(...result.data)
    if (!result.data.length || pageNo >= result.totalPages) return rows
  }
}
async function load() {
  const current = ++version, unit = unitId.value
  loading.value = true; error.value = ''; showForm.value = false; deleteTarget.value = null
  accounts.value = []; controls.value = []; heads.value = []; currencies.value = []
  if (!unit) { loading.value = false; return }
  try {
    const [rows, controlRows, groupRows, currencyRows] = await Promise.all([pages('accounts', unit, current), pages('account-controls', unit, current), pages('account-heads', unit, current), request<{ id: string; code: string; name: string }[]>('/api/ledger/accounting-unit-currencies')])
    if (current !== version) return
    accounts.value = rows; controls.value = controlRows; currencies.value = currencyRows
    heads.value = groupRows.map((row, index) => ({ id: row.id, name: row.name, parentId: row.parentId || null, isActive: row.isActive, standardAccountType: standardAccountTypes[row.accountType]!, sortOrder: index }))
  } catch (e) { if (current === version) error.value = message(e) }
  finally { if (current === version) loading.value = false }
}
watch(unitId, () => { search.value = ''; statusFilter.value = ''; void load() })
onMounted(async () => {
  try {
    units.value = await request('/api/ledger/account-head-units')
    const next = units.value.some(unit => unit.id === unitId.value) ? unitId.value : units.value[0]?.id || ''
    if (next !== unitId.value) unitId.value = next
    else await load()
  } catch (e) { error.value = message(e); loading.value = false }
})
onUnmounted(() => { version++ })
function openCreate() {
  editingId.value = null; saveError.value = ''
  Object.assign(form, { accountingUnitId: unitId.value, accountHeaderId: eligibleControls.value[0]?.id || '', accountNumber: '', accountName: '', currencyId: null, status: 'active', allowManualPosting: true, isControlAccount: false })
  showForm.value = true
}
async function openEdit(id: string) {
  if (saving.value || loading.value) return
  saving.value = true; error.value = ''; saveError.value = ''
  try {
    const row = await request<AccountDetail>(`/api/ledger/accounts/${id}`, { query: { accountingUnitId: unitId.value } })
    editingId.value = row.id
    Object.assign(form, { accountingUnitId: unitId.value, accountHeaderId: row.accountHeaderId, accountNumber: row.accountNumber, accountName: row.accountName, currencyId: row.currencyId, status: row.status, allowManualPosting: row.allowManualPosting, isControlAccount: row.isControlAccount })
    showForm.value = true
  } catch (e) { error.value = message(e) }
  finally { saving.value = false }
}
async function save() {
  if (saving.value || loading.value) return
  saveError.value = ''
  const control = eligibleControls.value.find(row => row.id === form.accountHeaderId), value = form.accountNumber.trim(), number = Number(value)
  if (!control || !/^\d+$/.test(value) || value.length > 80 || !Number.isInteger(number) || number > 2147483647 || number < control.minAccount || number > control.maxAccount) {
    saveError.value = 'Select an active leaf control and enter a whole-number account number inside its range.'; return
  }
  if (!form.accountName.trim()) { saveError.value = 'Enter an account name.'; return }
  saving.value = true
  try {
    const body = { ...form, accountingUnitId: unitId.value, accountNumber: String(number), accountName: form.accountName.trim() }
    if (editingId.value) await request(`/api/ledger/accounts/${editingId.value}`, { method: 'PUT', body })
    else await request('/api/ledger/accounts', { method: 'POST', body })
    showForm.value = false; await load()
  } catch (e) { saveError.value = message(e) }
  finally { saving.value = false }
}
async function remove() {
  if (!deleteTarget.value || saving.value) return
  saving.value = true; deleteError.value = ''
  try {
    await request(`/api/ledger/accounts/${deleteTarget.value.id}`, { method: 'DELETE', query: { accountingUnitId: unitId.value } })
    deleteTarget.value = null; await load()
  } catch (e) { deleteError.value = message(e) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <label class="text-sm font-semibold">Accounting unit <select v-model="unitId" :disabled="saving" class="ml-2 rounded-lg border bg-white p-2 dark:bg-slate-900"><option value="" disabled>Select a unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} — {{ unit.name }}</option></select></label>
      <button :disabled="loading || saving" class="inline-flex items-center gap-2 text-sm underline" @click="unitId ? load() : reloadNuxtApp()"><RefreshCw :size="14" /> Refresh</button>
    </div>
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-xs text-slate-500">General Ledger / Account Setup</p><h1 class="mt-2 text-3xl font-semibold">Chart of Account Details</h1><p class="mt-2 text-sm text-slate-500">Manage posting accounts, control assignments, currencies and posting settings.</p></div>
      <button :disabled="saving || loading || !unitId || !eligibleControls.length || !currencies.length" class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="openCreate"><Plus :size="16" /> New account</button>
    </header>
    <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ error }}</p>
    <p v-else-if="!loading && !units.length" class="text-sm text-slate-500">No active accounting units. <NuxtLink to="/ledger/accounting-units" class="underline">Create or activate a unit</NuxtLink> first.</p>
    <p v-else-if="!loading && unitId && !eligibleControls.length" class="text-sm text-slate-500">No active leaf controls. <NuxtLink to="/ledger/account-controls" class="underline">Create or activate an account control</NuxtLink> first.</p>
    <p v-if="!loading && !error && unitId && !currencies.length" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No active currencies. Ask your administrator to configure the currency catalog.</p>
    <section class="grid gap-3 sm:grid-cols-3"><div class="rounded-xl border p-4"><p class="text-xs text-slate-500">Accounts in view</p><strong class="mt-2 block text-2xl">{{ visibleAccounts.length }}</strong></div><div class="rounded-xl border p-4"><p class="text-xs text-slate-500">Active in view</p><strong class="mt-2 block text-2xl">{{ visibleAccounts.filter(row => row.status === 'active').length }}</strong></div><div class="rounded-xl border p-4"><p class="text-xs text-slate-500">Account heads in view</p><strong class="mt-2 block text-2xl">{{ new Set(visibleAccounts.map(row => row.accountGroupId)).size }}</strong></div></section>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b p-4"><label class="flex items-center gap-2"><Search :size="16" /><input v-model="search" type="search" aria-label="Search account details" placeholder="Search number, name, head or control…" class="rounded-lg border bg-transparent px-3 py-2 text-sm" /></label><select v-model="statusFilter" aria-label="Filter account status" class="rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[950px] text-left text-sm"><thead class="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th class="p-4">Account</th><th class="p-4">Head / control</th><th class="p-4">Type</th><th class="p-4">Currency</th><th class="p-4">Posting settings</th><th class="p-4">Status</th><th class="p-4 text-right">Actions</th></tr></thead><tbody class="divide-y dark:divide-slate-800">
        <tr v-if="loading"><td colspan="7" role="status" class="p-8 text-center">Loading accounts…</td></tr>
        <tr v-for="account in visibleAccounts" :key="account.id"><td class="p-4"><strong class="font-mono text-brand-700">{{ account.accountNumber }}</strong><p>{{ account.accountName }}</p></td><td class="p-4"><p>{{ headName(account.accountGroupId) }}</p><p class="mt-1 text-xs text-slate-500">{{ controlPath(account.accountHeaderId) }}</p></td><td class="p-4">{{ standardAccountTypes[account.accountType] || 'Unknown' }}</td><td class="p-4">{{ currencyName(account.currencyId) }}</td><td class="p-4 text-xs text-slate-500"><p>Manual: {{ account.allowManualPosting ? 'Allowed' : 'Blocked' }}</p><p>{{ account.isControlAccount ? 'Control account' : 'Posting account' }}</p></td><td class="p-4"><span :class="account.status === 'active' ? 'text-emerald-700' : 'text-slate-500'">{{ account.status === 'active' ? 'Active' : 'Inactive' }}</span></td><td class="p-4 text-right"><button :disabled="loading || saving" class="rounded-lg p-2 disabled:opacity-50" aria-label="Edit account detail" @click="openEdit(account.id)"><Pencil :size="16" /></button><button :disabled="loading || saving" class="rounded-lg p-2 text-rose-600 disabled:opacity-50" aria-label="Delete account detail" @click="deleteError = ''; deleteTarget = account"><Trash2 :size="16" /></button></td></tr>
        <tr v-if="!loading && !error && !visibleAccounts.length"><td colspan="7" class="p-10 text-center text-slate-500">No accounts found. Try another filter or create an account.</td></tr>
      </tbody></table></div>
      <footer class="border-t p-4 text-xs text-slate-500">Live setup records for the selected unit. Posted balances are not part of this setup API.</footer>
    </section>
    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" @click.self="!saving && (showForm = false)">
      <section role="dialog" aria-modal="true" aria-labelledby="account-form-title" class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-[#172321]">
        <header class="flex justify-between gap-4"><h2 id="account-form-title" class="text-xl font-semibold">{{ editingId ? 'Edit account detail' : 'New account detail' }}</h2><button :disabled="saving" aria-label="Close dialog" @click="showForm = false"><X :size="20" /></button></header>
        <form class="mt-5" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4">
          <label class="block text-sm">Account control<select v-model="form.accountHeaderId" required class="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option value="" disabled>Select active leaf control</option><option v-if="form.accountHeaderId && !eligibleControls.some(row => row.id === form.accountHeaderId)" :value="form.accountHeaderId" disabled>Current control is inactive/unavailable</option><option v-for="control in eligibleControls" :key="control.id" :value="control.id">{{ headName(control.accountGroupId) }} / {{ controlPath(control.id) }} ({{ control.minAccount }}–{{ control.maxAccount }})</option></select></label>
          <p class="text-xs text-slate-500">Standard type: {{ selectedType }}. Head and type are assigned by the backend from the selected control.</p>
          <label class="block text-sm">Account number<input v-model="form.accountNumber" required maxlength="80" inputmode="numeric" pattern="[0-9]+" class="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" /><span v-if="selectedControl" class="mt-1 block text-xs text-slate-500">Allowed range: {{ selectedControl.minAccount }}–{{ selectedControl.maxAccount }}. Leading zeros are normalized.</span></label>
          <label class="block text-sm">Account name<input v-model="form.accountName" required maxlength="200" class="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" /></label>
          <label class="block text-sm">Currency<select v-model="form.currencyId" class="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option :value="null">Use accounting unit base currency</option><option v-if="form.currencyId && !currencies.some(row => row.id === form.currencyId)" :value="form.currencyId" disabled>Current currency is inactive/unavailable</option><option v-for="currency in currencies" :key="currency.id" :value="currency.id">{{ currency.code }} — {{ currency.name }}</option></select></label>
          <label class="block text-sm">Status<select v-model="form.status" class="mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label class="flex items-center gap-2 text-sm"><input v-model="form.allowManualPosting" type="checkbox" /> Allow manual posting</label><label class="flex items-center gap-2 text-sm"><input v-model="form.isControlAccount" type="checkbox" /> Control account</label>
          <p v-if="saveError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ saveError }}</p>
          <p v-if="editingId" class="text-xs text-slate-500">Accounts in use cannot change number, control, head/type, currency or control-account classification.</p>
          <footer class="flex justify-end gap-3 border-t pt-4"><button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="showForm = false">Cancel</button><button type="submit" class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white">{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account' }}</button></footer>
        </fieldset></form>
      </section>
    </div>
    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" @click.self="!saving && (deleteTarget = null)"><section role="dialog" aria-modal="true" aria-labelledby="account-delete-title" class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-[#172321]"><h2 id="account-delete-title" class="text-xl font-semibold">Delete account detail?</h2><p class="mt-3 text-sm text-slate-500">Soft-delete {{ deleteTarget.accountNumber }} — {{ deleteTarget.accountName }}? Accounts referenced by balances, ledger activity or configuration cannot be deleted.</p><p v-if="deleteError" role="alert" class="mt-3 text-sm text-rose-600">{{ deleteError }}</p><footer class="mt-5 flex justify-end gap-3"><button :disabled="saving" class="rounded-lg border px-3 py-2 text-sm" @click="deleteTarget = null">Cancel</button><button :disabled="saving" class="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white" @click="remove">{{ saving ? 'Deleting…' : 'Delete account' }}</button></footer></section></div>
  </div>
</template>
