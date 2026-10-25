<script setup lang="ts">
import { Check, ChevronDown, Plus, Pencil, Trash2, X, Search } from '@lucide/vue'
import type { LedgerAccountControl, LedgerAccountHead } from '../../../features/ledger/setup-data'
import { standardAccountTypes } from '../../../features/ledger/setup-data'
import { buildAccountHeadTree } from '../../../features/ledger/account-head-tree'
import { sortAccountControlsByType } from '../../../features/ledger/account-control-order'
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
const eligibleControls = computed(() => sortAccountControlsByType(controls.value.filter(control => control.isActive && heads.value.some(head => head.id === control.accountGroupId && head.isActive) && !controls.value.some(child => child.parentAccountHeaderId === control.id)), heads.value))
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
    <div class="flex flex-wrap items-end gap-3">
      <label class="text-sm font-semibold">Accounting unit
        <select v-model="unitId" :disabled="saving" class="ml-3 rounded-lg border border-slate-300 bg-white p-2 dark:bg-slate-900">
          <option value="" disabled>Select an accounting unit</option>
          <option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} — {{ unit.name }}</option>
        </select>
      </label>
      <button :disabled="loading || saving" class="text-sm underline" @click="unitId ? load() : reloadNuxtApp()">Refresh</button>
    </div>
    <p v-if="error" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ error }}</p>
    <p v-else-if="loading" role="status" class="text-sm text-slate-500">Loading account details…</p>
    <p v-else-if="!units.length" class="text-sm text-slate-500">No active accounting units. <NuxtLink to="/ledger/accounting-units" class="font-semibold underline">Create or activate a unit</NuxtLink> first.</p>
    <p v-else-if="!eligibleControls.length" class="text-sm text-slate-500">No active leaf controls. <NuxtLink to="/ledger/account-controls" class="font-semibold underline">Create or activate an account control</NuxtLink> first.</p>
    <p v-if="!loading && !error && unitId && !currencies.length" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">No active currencies. Ask your administrator to configure the currency catalog.</p>

    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Account Setup</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Chart of Account Details</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Manage posting accounts, control assignments, currencies and posting settings.</p>
      </div>
      <button :disabled="saving || loading || !unitId || !eligibleControls.length || !currencies.length" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800 disabled:opacity-50" @click="openCreate"><Plus :size="15" /> Add account detail</button>
    </section>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Accounts in view</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ visibleAccounts.length }}</p>
      </div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Active in view</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ visibleAccounts.filter(row => row.status === 'active').length }}</p>
      </div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Account heads in view</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ new Set(visibleAccounts.map(row => row.accountGroupId)).size }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[360px]">
          <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" aria-label="Search account details" placeholder="Search number, name, head or control…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" />
        </div>
        <div class="flex items-center gap-2">
          <label class="relative">
            <select v-model="statusFilter" aria-label="Filter account status" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
            <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
          <span class="hidden rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400 sm:inline-flex dark:bg-slate-800">{{ visibleAccounts.length }} records</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[950px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr><th class="px-5 py-3">Account</th><th class="px-4 py-3">Head / control</th><th class="px-4 py-3">Standard type</th><th class="px-4 py-3">Currency</th><th class="px-4 py-3">Posting settings</th><th class="px-4 py-3">Status</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="account in visibleAccounts" :key="account.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"><span class="text-[10px] font-bold">{{ account.accountNumber.slice(0, 2) }}</span></span>
                  <span><span class="block font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ account.accountNumber }}</span><span class="mt-0.5 block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ account.accountName }}</span></span>
                </div>
              </td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400"><p>{{ headName(account.accountGroupId) }}</p><p class="mt-0.5 text-[10px] text-slate-400">{{ controlPath(account.accountHeaderId) }}</p></td>
              <td class="px-4 py-3.5"><span class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ standardAccountTypes[account.accountType] || 'Unknown' }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ currencyName(account.currencyId) }}</td>
              <td class="px-4 py-3.5 text-[10px] text-slate-500 dark:text-slate-400"><p>Manual: {{ account.allowManualPosting ? 'Allowed' : 'Blocked' }}</p><p class="mt-0.5">{{ account.isControlAccount ? 'Control account' : 'Posting account' }}</p></td>
              <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="account.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="account.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'" />{{ account.status === 'active' ? 'Active' : 'Inactive' }}</span></td>
              <td class="px-4 py-3.5 text-right">
                <button :disabled="loading || saving" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit account detail" @click="openEdit(account.id)"><Pencil :size="14" /></button>
                <button :disabled="loading || saving" class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" aria-label="Delete account detail" @click="deleteError = ''; deleteTarget = account"><Trash2 :size="14" /></button>
              </td>
            </tr>
            <tr v-if="!loading && !error && !visibleAccounts.length"><td colspan="7" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No account details found</p><p class="mt-1 text-xs text-slate-400">Try another filter or add an account to this chart.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800">
        <span>Live setup records for the selected unit. Posted balances are not part of this setup API.</span>
        <NuxtLink to="/ledger/account-controls" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Back to account controls →</NuxtLink>
      </div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (showForm = false)">
      <section role="dialog" aria-modal="true" aria-labelledby="account-form-title" class="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between">
          <div><h2 id="account-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit account detail' : 'New account detail' }}</h2><p class="mt-1 text-xs text-slate-500">Assign the account to a leaf control and configure its posting settings.</p></div>
          <button :disabled="saving" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showForm = false"><X :size="17" /></button>
        </div>
        <form class="mt-5 space-y-4" @submit.prevent="save"><fieldset :disabled="saving" class="space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account control</span><select v-model="form.accountHeaderId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select active leaf control</option><option v-if="form.accountHeaderId && !eligibleControls.some(row => row.id === form.accountHeaderId)" :value="form.accountHeaderId" disabled>Current control is inactive/unavailable</option><option v-for="control in eligibleControls" :key="control.id" :value="control.id">{{ headName(control.accountGroupId) }} / {{ controlPath(control.id) }} ({{ control.minAccount }}–{{ control.maxAccount }})</option></select></label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account number</span><input v-model="form.accountNumber" required maxlength="80" inputmode="numeric" pattern="[0-9]+" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /><span v-if="selectedControl" class="mt-1 block text-[10px] text-slate-400">Allowed range: {{ selectedControl.minAccount }}–{{ selectedControl.maxAccount }}. Leading zeros are normalized.</span></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Standard account type</span><input :value="selectedType" readonly class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800" /></label>
          </div>
          <p class="text-[10px] text-slate-400">Head and standard type are assigned by the backend from the selected control.</p>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account name</span><input v-model="form.accountName" required maxlength="200" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency</span><select v-model="form.currencyId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option :value="null">Use accounting unit base currency</option><option v-if="form.currencyId && !currencies.some(row => row.id === form.currencyId)" :value="form.currencyId" disabled>Current currency is inactive/unavailable</option><option v-for="currency in currencies" :key="currency.id" :value="currency.id">{{ currency.code }} — {{ currency.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Status</span><select v-model="form.status" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          </div>
          <div class="flex flex-wrap gap-x-6 gap-y-3">
            <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.allowManualPosting" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" /> Allow manual posting</label>
            <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.isControlAccount" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" /> Control account</label>
          </div>
          <p v-if="editingId" class="text-[10px] text-slate-400">Accounts in use cannot change number, control, head/type, currency or control-account classification.</p>
          <p v-if="saveError" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showForm = false">Cancel</button>
            <button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account' }}</button>
          </div>
        </fieldset></form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (deleteTarget = null)">
      <section role="dialog" aria-modal="true" aria-labelledby="account-delete-title" class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <h2 id="account-delete-title" class="text-base font-semibold text-slate-900 dark:text-white">Delete account detail?</h2>
        <p class="mt-2 text-sm text-slate-500">Soft-delete {{ deleteTarget.accountNumber }} — {{ deleteTarget.accountName }}? Accounts referenced by balances, ledger activity or configuration cannot be deleted.</p>
        <p v-if="deleteError" role="alert" class="mt-3 text-sm text-rose-600">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button :disabled="saving" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button>
          <button :disabled="saving" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="remove">{{ saving ? 'Deleting…' : 'Delete account' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>
