<script setup lang="ts">
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import { emptyBankAccount, type BankAccount, type BankAccountOptions } from '../../../features/ledger/bank-account-types'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Bank Accounts' })
const request = useRequestFetch(), unitId = useState<string>('ledger-accounting-unit', () => '')
const units = ref<{id: string; code: string; name: string; isActive: boolean}[]>([])
const accounts = ref<BankAccount[]>([]), options = ref<BankAccountOptions>({ banks: [], branches: [], accounts: [], currencies: [] })
const loading = ref(true), loaded = ref(false), saving = ref(false), loadError = ref(''), deleteError = ref('')
const search = ref(''), statusFilter = ref(''), showForm = ref(false), editingId = ref<string | null>(null), deleteTarget = ref<string | null>(null), saveError = ref('')
const form = reactive(emptyBankAccount())
let version = 0
const errorMessage = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
const availableBranches = computed(() => options.value.branches.filter(b => b.bankId === form.bankId))
const activeCount = computed(() => accounts.value.filter(a => a.isActive).length)
const currenciesInUse = computed(() => new Set(accounts.value.map(a => a.currencyId)).size)
const visibleBankAccounts = computed(() => {
 const term = search.value.trim().toLowerCase()
 return accounts.value.filter(a => (!statusFilter.value || String(a.isActive) === statusFilter.value) && (!term || [a.bankName,a.bankBranchName,a.accountNumber,a.accountType,a.currencyCode || '',a.location,a.accountName].some(v => v.toLowerCase().includes(term))))
})
function glAccountLabel(id: string) { const a = options.value.accounts.find(a => a.id === id); return a ? `${a.accountNumber} · ${a.name}` : 'Unavailable GL account' }
function selectGl() { const currency = options.value.accounts.find(a => a.id === form.accountId)?.currencyId; if (currency) form.currencyId = currency }
async function loadAccounts() {
 const current = ++version, unit = unitId.value
 accounts.value = []; options.value = { banks: [], branches: [], accounts: [], currencies: [] }; loaded.value = false; loadError.value = ''; showForm.value = false; deleteTarget.value = null
 if (!unit) { loading.value = false; return }
 loading.value = true
 try {
  const [rows, choices] = await Promise.all([request<{data: BankAccount[]}>('/api/ledger/bank-accounts', { query: { accountingUnitId: unit } }), request<BankAccountOptions>('/api/ledger/bank-accounts/options', { query: { accountingUnitId: unit } })])
  if (current !== version) return
  accounts.value = rows.data; options.value = choices; loaded.value = true
 } catch (e) { if (current === version) loadError.value = errorMessage(e) }
 finally { if (current === version) loading.value = false }
}
async function loadUnits() {
 try {
  const all: typeof units.value = []
  for (let pageNo=1; ;pageNo++) {
   const r = await request<{data: typeof units.value; totalPages: number}>('/api/ledger/accounting-units', { query: { pageNo, pageSize: 200 } })
   all.push(...r.data); if (!r.data.length || pageNo >= r.totalPages) break
   if (pageNo >= 50) throw new Error('Too many accounting units')
  }
  units.value = all.filter(u => u.isActive)
  if (unitId.value && !units.value.some(u => u.id === unitId.value)) unitId.value = ''
 } catch (e) { loadError.value = errorMessage(e) }
 finally { loading.value = false }
}
function openCreate() { if (!loaded.value || saving.value) return; editingId.value = null; saveError.value = ''; Object.assign(form, emptyBankAccount()); showForm.value = true }
function openEdit(row: BankAccount) { if (!loaded.value || saving.value) return; editingId.value = row.id; saveError.value = ''; Object.assign(form, emptyBankAccount(), Object.fromEntries(Object.keys(emptyBankAccount()).map(key => [key, row[key as keyof BankAccount] ?? '']))); showForm.value = true }
async function saveBankAccount() {
 if (saving.value || !loaded.value) return
 saving.value = true; saveError.value = ''
 try {
  const body = { ...form, accountingUnitId: unitId.value }
  const row = editingId.value ? await request<BankAccount>(`/api/ledger/bank-accounts/${editingId.value}`, { method: 'PUT', body }) : await request<BankAccount>('/api/ledger/bank-accounts', { method: 'POST', body })
  accounts.value = [row, ...accounts.value.filter(a => a.id !== row.id)]; showForm.value = false
 } catch (e) { saveError.value = errorMessage(e) }
 finally { saving.value = false }
}
async function deleteBankAccount() {
 if (!deleteTarget.value || saving.value) return
 saving.value = true; deleteError.value = ''
 try { await request<{id: string; isDeleted: boolean}>(`/api/ledger/bank-accounts/${deleteTarget.value}`, { method: 'DELETE', query: {accountingUnitId: unitId.value} }); accounts.value = accounts.value.filter(a => a.id !== deleteTarget.value); deleteTarget.value = null }
 catch (e) { deleteError.value = errorMessage(e) }
 finally { saving.value = false }
}
watch(unitId, () => { void loadAccounts() })
onMounted(async () => { await loadUnits(); if (unitId.value) await loadAccounts() })
onUnmounted(() => { version++ })
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Account Setup</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Bank Accounts</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Maintain bank, branch, currency, cheque-book, and linked ledger-account details.</p>
      </div>
      <button :disabled="saving || !loaded || loading" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreate"><Plus :size="15" /> Add bank account</button>
    </section>

    <section class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]">
      <label class="text-xs font-semibold text-slate-600 dark:text-slate-300">Accounting unit<select v-model="unitId" :disabled="loading || saving" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"><option value="">Select an accounting unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} · {{ unit.name }}</option></select></label>
      <button :disabled="loading || saving" class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700" @click="unitId ? loadAccounts() : loadUnits()">Refresh</button>
      <p class="text-xs text-slate-400">Persisted accounts for this unit. Bank, branch, GL and currency names are filled from their catalogs.</p>
    </section>
    <p v-if="loadError" role="alert" class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{{ loadError }}</p>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Bank accounts</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ accounts.length }}</p></div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Active accounts</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ activeCount }}</p></div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Currencies in use</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ currenciesInUse }}</p></div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[360px]"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" type="search" placeholder="Search bank, account, or branch…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></div>
        <div class="flex items-center gap-2"><label class="relative"><select v-model="statusFilter" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label><span class="hidden rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400 sm:inline-flex dark:bg-slate-800">{{ visibleBankAccounts.length }} records</span></div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1050px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Bank account</th><th class="px-4 py-3">Branch</th><th class="px-4 py-3">Account type</th><th class="px-4 py-3">Currency</th><th class="px-4 py-3">Linked GL account</th><th class="px-4 py-3">Date opened</th><th class="px-4 py-3">Status</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="loading"><td colspan="8" class="px-5 py-10 text-center text-xs text-slate-400">Loading bank accounts…</td></tr>
            <tr v-for="account in visibleBankAccounts" :key="account.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5"><span class="block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ account.bankName }}</span><span class="mt-1 block font-mono text-[10px] text-brand-700 dark:text-brand-300">{{ account.accountNumber }}</span></td>
              <td class="px-4 py-3.5"><span class="block text-xs text-slate-600 dark:text-slate-300">{{ account.bankBranchName }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ account.location || 'Location not set' }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ account.accountType }}</td>
              <td class="px-4 py-3.5"><span class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ account.currencyCode || 'Unavailable' }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{{ account.accountName || glAccountLabel(account.accountId) }}</td>
              <td class="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ account.dateOpened || '—' }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="account.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="account.isActive ? 'bg-emerald-500' : 'bg-slate-300'" />{{ account.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="px-4 py-3.5 text-right"><button :disabled="saving" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit bank account" @click="openEdit(account)"><Pencil :size="14" /></button><button :disabled="saving" class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label="Delete bank account" @click="deleteError = ''; deleteTarget = account.id"><Trash2 :size="14" /></button></td>
            </tr>
            <tr v-if="!loading && !visibleBankAccounts.length"><td colspan="8" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No bank accounts found</p><p class="mt-1 text-xs text-slate-400">Try another search or add a bank account.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"><span>Bank accounts are saved to your tenant and selected accounting unit.</span><NuxtLink to="/ledger/accounts" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage chart-of-account details →</NuxtLink><NuxtLink to="/ledger/shared-config/banks" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage banks and branches →</NuxtLink></div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (showForm = false)">
      <section role="dialog" aria-modal="true" aria-label="Bank account form" class="flex h-[calc(100dvh-3rem)] max-h-[900px] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex shrink-0 items-start justify-between p-6"><div><h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit bank account' : 'Add bank account' }}</h2><p class="mt-1 text-xs text-slate-500">Link the bank details to a posting account in the General Ledger.</p></div><button :disabled="saving" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showForm = false"><X :size="17" /></button></div>
        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="saveBankAccount"><div class="min-h-0 flex-1 overflow-y-auto overscroll-contain"><fieldset :disabled="saving" class="min-w-0 space-y-4 px-6 pb-6">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Bank name</span><select v-model="form.bankId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" @change="form.bankBranchId = ''"><option value="">Select bank name</option><option v-if="form.bankId && !options.banks.some(item => item.id === form.bankId)" :value="form.bankId">Unavailable reference (replace)</option><option v-for="item in options.banks" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Bank branch</span><select v-model="form.bankBranchId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select branch</option><option v-if="form.bankBranchId && !availableBranches.some(b => b.id === form.bankBranchId)" :value="form.bankBranchId">Unavailable branch (replace)</option><option v-for="branch in availableBranches" :key="branch.id" :value="branch.id">{{ branch.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">GL account</span><select v-model="form.accountId" @change="selectGl" required :disabled="loading || !options.accounts.length" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"><option value="">Select GL account</option><option v-for="account in options.accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} · {{ account.name }}</option></select><span v-if="!loading && !options.accounts.length" class="mt-1 block text-[10px] text-rose-600">Create an account detail before linking a bank.</span></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account number</span><input v-model="form.accountNumber" required maxlength="100" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Bank account number" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account type</span><input v-model="form.accountType" required maxlength="50" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="e.g. Current, Savings" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency</span><select v-model="form.currencyId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select currency</option><option v-if="form.currencyId && !options.currencies.some(item => item.id === form.currencyId)" :value="form.currencyId">Unavailable reference (replace)</option><option v-for="item in options.currencies" :key="item.id" :value="item.id">{{ item.code + ' · ' + item.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Location</span><input v-model="form.location" maxlength="150" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="City or location" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Date opened</span><input v-model="form.dateOpened" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Contact person</span><input v-model="form.contactPerson" maxlength="130" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Contact name" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Contact number</span><input v-model="form.contactNumber" maxlength="20" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="+233 …" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cheque book start</span><input v-model="form.chequeBookStart" maxlength="20" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="First cheque number" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cheque book end</span><input v-model="form.chequeBookEnd" maxlength="20" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Last cheque number" /></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Address</span><input v-model="form.address" maxlength="150" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Street address" /></label>
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.isActive" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" /> Active bank account</label>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          </fieldset></div><div class="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800"><button :disabled="saving" type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showForm = false">Cancel</button><button :disabled="saving" type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ editingId ? 'Save changes' : 'Save bank account' }}</button></div>
        </form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="!saving && (deleteTarget = null)"><section class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]"><h2 class="text-base font-semibold text-slate-900 dark:text-white">Remove bank account?</h2><p class="mt-2 text-sm text-slate-500">The account will be soft-deleted. Default GL or financial references may prevent removal.</p><p v-if="deleteError" role="alert" class="mt-3 text-xs text-rose-600">{{ deleteError }}</p><div class="mt-5 flex justify-end gap-2"><button :disabled="saving" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button><button :disabled="saving" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="deleteBankAccount">Remove account</button></div></section></div>
  </div>
</template>
