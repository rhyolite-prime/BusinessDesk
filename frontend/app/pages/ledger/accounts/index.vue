<script setup lang="ts">
import { Check, ChevronDown, Download, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from '@lucide/vue'
import type { AccountsResponse, CreateAccountInput, LedgerAccount } from '../../../features/ledger/types'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'
import { ledgerSetupIds, useLedgerSetup } from '../../../features/ledger/setup-data'

definePageMeta({ layout: 'admin-ledger' })

const api = useLedgerApi()
const setup = useLedgerSetup()
const search = ref('')
const statusFilter = ref('')
const showCreate = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<string | null>(null)
const saveError = ref('')
const deleteError = ref('')
const form = reactive<CreateAccountInput>({ accountNumber: '', name: '', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: ledgerSetupIds.bankControl, status: 'Active' })
const { data, pending, error, refresh } = await useAsyncData<AccountsResponse>(
  'ledger-accounts',
  () => api.accounts({ search: search.value, status: statusFilter.value }),
  { watch: [search, statusFilter] },
)

const accounts = computed(() => data.value?.items ?? [])
const activeCount = computed(() => accounts.value.filter((account) => account.status === 'Active').length)
const accountControls = computed(() => setup.accountControls.value.filter((control) => control.isActive && setup.accountHeads.value.some((head) => head.id === control.accountGroupId && head.isActive)))
const selectedAccountControl = computed(() => accountControls.value.find((control) => control.id === form.accountHeaderId))
const parsedAccountNumber = computed(() => {
  const value = form.accountNumber.trim()
  if (!/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
})
const accountNumberDuplicate = computed(() => {
  const number = parsedAccountNumber.value
  return number !== null && accounts.value.some((account) => {
    if (account.id === editingId.value) return false
    const value = account.accountNumber.trim()
    const existingNumber = /^\d+$/.test(value) ? Number(value) : null
    return existingNumber === number || value.toLowerCase() === form.accountNumber.trim().toLowerCase()
  })
})
const accountNumberRangeMessage = computed(() => {
  const control = selectedAccountControl.value
  return control ? `Allowed account-number range: ${control.minAccount}–${control.maxAccount}.` : 'Select an active account control to view its permitted range.'
})
const accountNumberError = computed(() => {
  const value = form.accountNumber.trim()
  if (!value) return ''
  const control = selectedAccountControl.value
  if (!control) return 'Select an active account control first.'
  const number = parsedAccountNumber.value
  if (number === null) return 'Enter a whole-number account number.'
  if (number < control.minAccount || number > control.maxAccount) return `Account number must be between ${control.minAccount} and ${control.maxAccount}.`
  if (accountNumberDuplicate.value) return 'An account with this number already exists.'
  return ''
})

function syncAccountTypeFromHeader() {
  const control = accountControls.value.find((item) => item.id === form.accountHeaderId)
  const head = control && setup.accountHeads.value.find((item) => item.id === control.accountGroupId && item.isActive)
  if (control && head) {
    form.group = head.name
    form.accountType = head.standardAccountType
  }
}

function accountHeaderLabel(account: LedgerAccount) {
  if (account.accountHeaderId) {
    return setup.accountControlPath(account.accountHeaderId) || account.group
  }
  const head = setup.accountHeads.value.find((item) => item.name === account.group)
  return head ? setup.accountHeadPath(head.id) : account.group
}

function defaultHeaderId(account?: LedgerAccount) {
  const existing = account?.accountHeaderId && accountControls.value.find((control) => control.id === account.accountHeaderId)
  if (existing) return existing.id
  const head = account && setup.accountHeads.value.find((item) => item.name === account.group)
  const accountNumber = Number(account?.accountNumber)
  const matchingRange = head && accountControls.value.find((control) => control.accountGroupId === head.id
    && Number.isFinite(accountNumber)
    && accountNumber >= control.minAccount
    && accountNumber <= control.maxAccount)
  return matchingRange?.id || accountControls.value.find((control) => control.id === ledgerSetupIds.bankControl)?.id || accountControls.value[0]?.id || ''
}

function openCreate() {
  editingId.value = null
  saveError.value = ''
  Object.assign(form, { accountNumber: '', name: '', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: defaultHeaderId(), status: 'Active' })
  syncAccountTypeFromHeader()
  showCreate.value = true
}

function openEdit(account: LedgerAccount) {
  editingId.value = account.id
  saveError.value = ''
  Object.assign(form, { accountNumber: account.accountNumber, name: account.name, group: account.group, accountType: account.accountType, currency: account.currency, accountHeaderId: defaultHeaderId(account), status: account.status })
  showCreate.value = true
}

async function createAccount() {
  saveError.value = ''
  const control = setup.accountControls.value.find((item) => item.id === form.accountHeaderId && item.isActive)
  const head = control && setup.accountHeads.value.find((item) => item.id === control.accountGroupId && item.isActive)
  if (!control || !head) {
    saveError.value = 'Select an active account head or source.'
    return
  }
  const numericAccountNumber = parsedAccountNumber.value
  if (numericAccountNumber === null) {
    saveError.value = 'Enter a whole-number account number.'
    return
  }
  if (numericAccountNumber < control.minAccount || numericAccountNumber > control.maxAccount) {
    saveError.value = `Account number must be between ${control.minAccount} and ${control.maxAccount}.`
    return
  }
  const normalizedAccountNumber = String(numericAccountNumber)
  if (accounts.value.some((account) => account.id !== editingId.value && /^\d+$/.test(account.accountNumber.trim()) && Number(account.accountNumber.trim()) === numericAccountNumber)) {
    saveError.value = 'An account with this number already exists.'
    return
  }
  form.accountNumber = normalizedAccountNumber
  form.group = head.name
  form.accountType = head.standardAccountType
  saving.value = true
  try {
    const input = { ...form }
    if (editingId.value) await api.updateAccount(editingId.value, input)
    else await api.createAccount(input)
    showCreate.value = false
    editingId.value = null
    Object.assign(form, { accountNumber: '', name: '', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: defaultHeaderId(), status: 'Active' })
    await refresh()
  } catch (e: unknown) {
    const fetchError = e as { statusMessage?: string; data?: { statusMessage?: string } }
    saveError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'The account could not be saved.'
  } finally {
    saving.value = false
  }
}

async function deleteAccount() {
  deleteError.value = ''
  if (!deleteTarget.value) return
  if (setup.bankAccounts.value.some((account) => account.accountId === deleteTarget.value)) {
    deleteError.value = 'This account is linked to a bank account. Remove the bank link before deleting it.'
    return
  }
  try {
    await api.deleteAccount(deleteTarget.value)
    deleteTarget.value = null
    await refresh()
  } catch (e: unknown) {
    const fetchError = e as { statusMessage?: string; data?: { statusMessage?: string } }
    deleteError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'The account could not be deleted.'
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Account Setup</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Chart of Account Detail</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Maintain posting accounts, account heads, currencies, and current posted balances.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Download :size="14" /> Export</button>
        <button class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreate"><Plus :size="15" /> New account</button>
      </div>
    </section>

    <div v-if="error" class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <span>Account data could not be loaded.</span><button class="font-semibold underline" @click="refresh()">Retry</button>
    </div>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Accounts in view</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ data?.total ?? 0 }}</p>
      </div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Active in view</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ activeCount }}</p>
      </div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500">Account groups</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ new Set(accounts.map((account) => account.group)).size }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[360px]">
          <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" placeholder="Search number, name, or group…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" />
        </div>
        <div class="flex items-center gap-2">
          <label class="relative">
            <SlidersHorizontal :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select v-model="statusFilter" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
            <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
          <span class="hidden rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-400 sm:inline-flex dark:bg-slate-800">{{ data?.total ?? 0 }} records</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr><th class="px-5 py-3">Account</th><th class="px-4 py-3">Account head / source</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Currency</th><th class="px-4 py-3 text-right">Current balance</th><th class="px-4 py-3">Status</th><th class="w-24 px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-if="pending"><td colspan="7" class="px-5 py-10 text-center text-xs text-slate-400">Loading chart of accounts…</td></tr>
            <tr v-for="account in accounts" :key="account.id" class="group cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5"><div class="flex items-center gap-3"><span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"><span class="text-[10px] font-bold">{{ account.accountNumber.slice(0, 2) }}</span></span><span><span class="block font-mono text-[11px] font-semibold text-brand-700 dark:text-brand-300">{{ account.accountNumber }}</span><span class="mt-0.5 block text-xs font-medium text-slate-800 dark:text-slate-200">{{ account.name }}</span></span></div></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ accountHeaderLabel(account) }}</td>
              <td class="px-4 py-3.5"><span class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ account.accountType }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-500">{{ account.currency }}</td>
              <td class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(account.balance, account.currency) }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="account.status === 'Active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="account.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'" />{{ account.status }}</span></td>
              <td class="px-4 py-3.5 text-right"><button class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit account detail" @click="openEdit(account)"><Pencil :size="14" /></button><button class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label="Delete account detail" @click="deleteTarget = account.id; deleteError = ''"><Trash2 :size="14" /></button></td>
            </tr>
            <tr v-if="!pending && !accounts.length"><td colspan="7" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No accounts found</p><p class="mt-1 text-xs text-slate-400">Try another search or add an account to this chart.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800">
        <span>Balances reflect posted ledger activity. Draft entries are excluded.</span>
        <span>Base currency: {{ data?.items?.[0]?.currency ?? 'GHS' }}</span>
      </div>
    </section>

    <div v-if="showCreate" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="showCreate = false">
      <section class="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between">
          <div><h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit account detail' : 'New account detail' }}</h2><p class="mt-1 text-xs text-slate-500">Assign the account number to an active control header.</p></div>
          <button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showCreate = false"><X :size="17" /></button>
        </div>
        <form class="mt-5 space-y-4" @submit.prevent="createAccount">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account number</span><input v-model="form.accountNumber" required type="text" inputmode="numeric" pattern="[0-9]*" :aria-invalid="Boolean(accountNumberError)" :class="accountNumberError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'" class="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="e.g. 6100" /><span v-if="selectedAccountControl && !accountNumberError" class="mt-1 block text-[10px] text-slate-400">{{ accountNumberRangeMessage }}</span><span v-if="accountNumberError" class="mt-1 block text-[10px] text-rose-600 dark:text-rose-300">{{ accountNumberError }}</span></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Standard account type</span><input :value="form.accountType" readonly class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800" /></label>
          </div>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account name</span><input v-model="form.name" required maxlength="200" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="e.g. Travel and accommodation" /></label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account control / source</span><select v-model="form.accountHeaderId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="syncAccountTypeFromHeader"><option value="">Select account control or source</option><option v-for="control in accountControls" :key="control.id" :value="control.id">{{ setup.accountControlPath(control.id) }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency</span><select v-model="form.currency" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option>GHS</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
          </div>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Status</span><select v-model="form.status" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showCreate = false">Cancel</button>
            <button type="submit" :disabled="saving" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"><Check v-if="!saving" :size="14" /><span v-else class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-white" />{{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="deleteTarget = null">
      <section class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Delete account detail?</h2>
        <p class="mt-2 text-sm text-slate-500">This removes the posting account from the demo ledger. Posted history may prevent deletion when connected to a ledger service.</p>
        <p v-if="deleteError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button><button type="button" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="deleteAccount">Delete account</button></div>
      </section>
    </div>
  </div>
</template>
