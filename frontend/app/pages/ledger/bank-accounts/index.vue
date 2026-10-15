<script setup lang="ts">
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import type { LedgerAccount } from '../../../features/ledger/types'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'
import { ledgerCurrencyOptions, useLedgerSetup } from '../../../features/ledger/setup-data'
import type { LedgerBankAccount } from '../../../features/ledger/setup-data'

definePageMeta({ layout: 'admin-ledger' })

const setup = useLedgerSetup()
const api = useLedgerApi()
const { data: ledgerData, pending: accountsPending, error: accountsError } = await useAsyncData('ledger-bank-account-gl-options', () => api.accounts())
const search = ref('')
const statusFilter = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const deleteTarget = ref<string | null>(null)
const saveError = ref('')
const form = reactive({
  bankName: '', bankBranchName: '', accountId: '', accountNumber: '', accountType: 'Current Account', currency: 'GHS',
  dateOpened: '', location: '', address: '', contactPerson: '', contactNumber: '', chequeBookStart: '', chequeBookEnd: '', isActive: true,
})

const ledgerAccounts = computed<LedgerAccount[]>(() => ledgerData.value?.items ?? [])
const activeCount = computed(() => setup.bankAccounts.value.filter((account) => account.isActive).length)
const currenciesInUse = computed(() => new Set(setup.bankAccounts.value.map((account) => account.currency)).size)
const visibleBankAccounts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return setup.bankAccounts.value
    .filter((account) => !statusFilter.value || String(account.isActive) === statusFilter.value)
    .filter((account) => {
      const glAccount = ledgerAccounts.value.find((item) => item.id === account.accountId)
      return !term || [account.bankName, account.bankBranchName, account.accountNumber, account.accountType, account.currency, account.location, glAccount?.name || ''].some((value) => value.toLowerCase().includes(term))
    })
})

function glAccountLabel(id: string) {
  const account = ledgerAccounts.value.find((item) => item.id === id)
  return account ? `${account.accountNumber} · ${account.name}` : 'GL account unavailable'
}

function resetForm() {
  Object.assign(form, {
    bankName: '', bankBranchName: '', accountId: ledgerAccounts.value[0]?.id || '', accountNumber: '', accountType: 'Current Account', currency: 'GHS',
    dateOpened: '', location: '', address: '', contactPerson: '', contactNumber: '', chequeBookStart: '', chequeBookEnd: '', isActive: true,
  })
}

function openCreate() {
  editingId.value = null
  saveError.value = ''
  resetForm()
  showForm.value = true
}

function openEdit(account: LedgerBankAccount) {
  editingId.value = account.id
  saveError.value = ''
  Object.assign(form, {
    bankName: account.bankName, bankBranchName: account.bankBranchName, accountId: account.accountId, accountNumber: account.accountNumber,
    accountType: account.accountType, currency: account.currency, dateOpened: account.dateOpened, location: account.location,
    address: account.address, contactPerson: account.contactPerson, contactNumber: account.contactNumber,
    chequeBookStart: account.chequeBookStart, chequeBookEnd: account.chequeBookEnd, isActive: account.isActive,
  })
  showForm.value = true
}

function saveBankAccount() {
  saveError.value = ''
  const bankName = form.bankName.trim()
  const bankBranchName = form.bankBranchName.trim()
  const accountNumber = form.accountNumber.trim()
  const accountType = form.accountType.trim()
  if (!bankName || !bankBranchName || !form.accountId || !accountNumber || !accountType || !form.currency || !form.chequeBookStart.trim() || !form.chequeBookEnd.trim()) {
    saveError.value = 'Complete the bank, branch, GL account, account number, account type, currency, and cheque-book fields.'
    return
  }
  if (setup.bankAccounts.value.some((account) => account.id !== editingId.value && account.accountNumber.toLowerCase() === accountNumber.toLowerCase())) {
    saveError.value = 'A bank account with this account number already exists.'
    return
  }
  setup.saveBankAccount({
    id: editingId.value || '', bankName, bankBranchName, accountId: form.accountId,
    accountNumber, accountType, currency: form.currency, dateOpened: form.dateOpened,
    location: form.location.trim(), address: form.address.trim(), contactPerson: form.contactPerson.trim(), contactNumber: form.contactNumber.trim(),
    chequeBookStart: form.chequeBookStart.trim(), chequeBookEnd: form.chequeBookEnd.trim(), isActive: form.isActive,
  })
  showForm.value = false
}

function deleteBankAccount() {
  if (!deleteTarget.value) return
  setup.removeBankAccount(deleteTarget.value)
  deleteTarget.value = null
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Account Setup</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Bank Accounts</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Maintain bank, branch, currency, cheque-book, and linked ledger-account details.</p>
      </div>
      <button class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreate"><Plus :size="15" /> Add bank account</button>
    </section>

    <div v-if="accountsError" class="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><span>Ledger account choices could not be loaded. Check the ledger connection before creating a bank link.</span><NuxtLink to="/ledger/accounts" class="font-semibold underline">Open account details</NuxtLink></div>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Bank accounts</p><p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ setup.bankAccounts.value.length }}</p></div>
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
            <tr v-if="accountsPending"><td colspan="8" class="px-5 py-10 text-center text-xs text-slate-400">Loading ledger-account choices…</td></tr>
            <tr v-for="account in visibleBankAccounts" :key="account.id" class="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5"><span class="block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ account.bankName }}</span><span class="mt-1 block font-mono text-[10px] text-brand-700 dark:text-brand-300">{{ account.accountNumber }}</span></td>
              <td class="px-4 py-3.5"><span class="block text-xs text-slate-600 dark:text-slate-300">{{ account.bankBranchName }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ account.location || 'Location not set' }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ account.accountType }}</td>
              <td class="px-4 py-3.5"><span class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ account.currency }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{{ glAccountLabel(account.accountId) }}</td>
              <td class="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ account.dateOpened || '—' }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="account.isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'"><span class="h-1.5 w-1.5 rounded-full" :class="account.isActive ? 'bg-emerald-500' : 'bg-slate-300'" />{{ account.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="px-4 py-3.5 text-right"><button class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Edit bank account" @click="openEdit(account)"><Pencil :size="14" /></button><button class="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label="Delete bank account" @click="deleteTarget = account.id"><Trash2 :size="14" /></button></td>
            </tr>
            <tr v-if="!accountsPending && !visibleBankAccounts.length"><td colspan="8" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No bank accounts found</p><p class="mt-1 text-xs text-slate-400">Try another search or add a bank account.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"><span>Bank setup changes in this preview are held as workspace demo data.</span><NuxtLink to="/ledger/accounts" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage chart-of-account details →</NuxtLink></div>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="showForm = false">
      <section class="max-h-[94vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start justify-between"><div><h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit bank account' : 'Add bank account' }}</h2><p class="mt-1 text-xs text-slate-500">Link the bank details to a posting account in the General Ledger.</p></div><button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showForm = false"><X :size="17" /></button></div>
        <form class="mt-5 space-y-4" @submit.prevent="saveBankAccount">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Bank name</span><input v-model="form.bankName" required maxlength="160" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Enter bank name" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Bank branch</span><input v-model="form.bankBranchName" required maxlength="160" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Enter branch name" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">GL account</span><select v-model="form.accountId" required :disabled="accountsPending || !ledgerAccounts.length" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"><option value="">Select GL account</option><option v-for="account in ledgerAccounts" :key="account.id" :value="account.id">{{ account.accountNumber }} · {{ account.name }}</option></select><span v-if="!accountsPending && !ledgerAccounts.length" class="mt-1 block text-[10px] text-rose-600">Create an account detail before linking a bank.</span></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account number</span><input v-model="form.accountNumber" required maxlength="100" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Bank account number" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Account type</span><input v-model="form.accountType" required maxlength="100" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="e.g. Current, Savings" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency</span><select v-model="form.currency" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option v-for="currency in ledgerCurrencyOptions" :key="currency.code" :value="currency.code">{{ currency.code }} · {{ currency.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Location</span><input v-model="form.location" maxlength="160" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="City or location" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Date opened</span><input v-model="form.dateOpened" type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Contact person</span><input v-model="form.contactPerson" maxlength="160" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Contact name" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Contact number</span><input v-model="form.contactNumber" maxlength="80" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="+233 …" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cheque book start</span><input v-model="form.chequeBookStart" required maxlength="80" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="First cheque number" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cheque book end</span><input v-model="form.chequeBookEnd" required maxlength="80" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Last cheque number" /></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Address</span><input v-model="form.address" maxlength="300" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Street address" /></label>
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input v-model="form.isActive" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" /> Active bank account</label>
          <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showForm = false">Cancel</button><button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ editingId ? 'Save changes' : 'Save bank account' }}</button></div>
        </form>
      </section>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" @click.self="deleteTarget = null"><section class="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]"><h2 class="text-base font-semibold text-slate-900 dark:text-white">Remove bank account?</h2><p class="mt-2 text-sm text-slate-500">The bank link will be removed from the demo setup data.</p><div class="mt-5 flex justify-end gap-2"><button class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteTarget = null">Cancel</button><button class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="deleteBankAccount">Remove account</button></div></section></div>
  </div>
</template>
