<script setup lang="ts">
import { AlertTriangle, Banknote, Check, Eye, Plus, Search, ShieldCheck, Trash2, X } from '@lucide/vue'
import type { AccountsResponse, LedgerAccount } from '../../../features/ledger/types'
import { formatLedgerAmount, parseLedgerAmount, parseLedgerRate } from '../../../features/ledger/money'
import { ledgerOrganizationalUnits } from '../../../features/ledger/organization-data'
import {
  useLedgerPettyCash,
  type LedgerPettyCashBatch,
  type LedgerPettyCashJournalMode,
  type LedgerPettyCashLine,
  type LedgerPettyCashStatus,
} from '../../../features/ledger/petty-cash-data'
import { ledgerCurrencyOptions, useLedgerSetup } from '../../../features/ledger/setup-data'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Petty Cash Transactions' })

interface PettyCashForm {
  batchDate: string
  batchNumber: string
  sourceDocumentNumber: string
  pettyCashAccountId: string
  batchOriginator: string
  currencyCode: string
  exchangeRate: string
}

interface ProposedJournalLine {
  key: string
  accountId: string
  accountDisplay?: string
  description: string
  referenceNumber: string
  transactionDate: string
  organizationUnitName: string
  recipientName: string
  debitUnits: bigint
  creditUnits: bigint
  groupedCount: number
}

interface ValidPettyCashExpenseLine {
  line: LedgerPettyCashLine
  amount: bigint
  account: LedgerAccount
}

interface ConsolidatedAccountAllocation {
  key: string
  accountId: string
  organizationUnitId: string
  amountUnits: bigint
  transactionCount: number
}

const api = useLedgerApi()
const setup = useLedgerSetup()
const pettyCash = useLedgerPettyCash()
const { data: accountResponse, error: accountError, refresh: refreshAccounts } = await useAsyncData<AccountsResponse>(
  'ledger-petty-cash-accounts',
  () => api.accounts(),
  { default: () => ({ items: [], total: 0 }) },
)

const accounts = computed(() => accountResponse.value?.items ?? [])
const activeAccounts = computed(() => accounts.value.filter((account) => account.status.toLowerCase() === 'active'))
const pettyCashAccounts = computed(() => activeAccounts.value
  .filter((account) => account.accountType.toLowerCase() === 'asset' || account.group.toLowerCase().includes('asset'))
  .slice()
  .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true })))
const expenseAccounts = computed(() => activeAccounts.value
  .filter((account) => account.accountType.toLowerCase().includes('expense') || account.group.toLowerCase().includes('expense'))
  .slice()
  .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true })))
const currencyOptions = computed(() => {
  const supported = ledgerCurrencyOptions.filter((currency) => activeAccounts.value.some((account) => account.currency.toUpperCase() === currency.code))
  return supported.length ? supported : ledgerCurrencyOptions
})
const batches = pettyCash.batches
const search = ref('')
const journalMode = ref<LedgerPettyCashJournalMode>('non-consolidated')
const activeBatchId = ref('')
const recordStatus = ref<LedgerPettyCashStatus>('draft')
const successMessage = ref('')
const formErrors = ref<string[]>([])
const showPostConfirmation = ref(false)
const zeroAmount = BigInt(0)
let lineSequence = 0

const form = reactive<PettyCashForm>({
  batchDate: todayIso(),
  batchNumber: '',
  sourceDocumentNumber: '',
  pettyCashAccountId: '',
  batchOriginator: '',
  currencyCode: 'GHS',
  exchangeRate: '1.0000000000',
})
const lines = ref<LedgerPettyCashLine[]>([])

const isReadOnly = computed(() => recordStatus.value === 'posted')
const selectedCashAccount = computed(() => activeAccounts.value.find((account) => account.id === form.pettyCashAccountId) ?? null)
const totalUnits = computed(() => lines.value.reduce((total, line) => {
  const amount = parseLedgerAmount(line.amount)
  return amount !== null && amount > BigInt(0) ? total + amount : total
}, BigInt(0)))
const incompleteLineCount = computed(() => lines.value.filter((line) => {
  const amount = parseLedgerAmount(line.amount)
  const account = expenseAccounts.value.find((item) => item.id === line.expenseAccountId)
  return amount === null
    || amount <= BigInt(0)
    || !account
    || account.currency.toUpperCase() !== form.currencyCode
    || !isRealIsoDate(line.transactionDate)
}).length)
const validExpenseLines = computed<ValidPettyCashExpenseLine[]>(() => lines.value.flatMap((line) => {
  const amount = parseLedgerAmount(line.amount)
  const account = expenseAccounts.value.find((item) => item.id === line.expenseAccountId)
  if (amount === null || amount <= BigInt(0) || !account || account.currency.toUpperCase() !== form.currencyCode || !isRealIsoDate(line.transactionDate)) return []
  return [{ line, amount, account }]
}))
const consolidatedAccountAllocations = computed<ConsolidatedAccountAllocation[]>(() => {
  const groups = new Map<string, ConsolidatedAccountAllocation>()
  for (const { line, amount, account } of validExpenseLines.value) {
    const key = `${account.id}::${line.organizationUnitId || 'unassigned'}`
    const allocation = groups.get(key)
    if (allocation) {
      allocation.amountUnits += amount
      allocation.transactionCount += 1
    }
    else {
      groups.set(key, {
        key,
        accountId: account.id,
        organizationUnitId: line.organizationUnitId,
        amountUnits: amount,
        transactionCount: 1,
      })
    }
  }
  return [...groups.values()]
})
const consolidatedAccountCount = computed(() => new Set(validExpenseLines.value.map(({ account }) => account.id)).size)
const consolidatedOrganizationUnitName = computed(() => {
  const names = new Set(validExpenseLines.value.map(({ line }) => organizationUnitName(line.organizationUnitId)))
  if (!names.size) return 'Not assigned'
  return names.size === 1 ? [...names][0]! : 'Multiple units'
})
const consolidatedRecipientName = computed(() => {
  const recipients = new Set(validExpenseLines.value.map(({ line }) => line.recipientName.trim()).filter(Boolean))
  return recipients.size === 1 ? [...recipients][0]! : recipients.size > 1 ? 'Multiple recipients' : ''
})
const previewLines = computed<ProposedJournalLine[]>(() => {
  const debits: ProposedJournalLine[] = []

  if (journalMode.value === 'non-consolidated') {
    for (const { line, amount, account } of validExpenseLines.value) {
      debits.push({
        key: line.id,
        accountId: account.id,
        description: line.description.trim() || 'Petty cash expense',
        referenceNumber: line.referenceNumber.trim() || form.batchNumber,
        transactionDate: line.transactionDate,
        organizationUnitName: organizationUnitName(line.organizationUnitId),
        recipientName: line.recipientName.trim(),
        debitUnits: amount,
        creditUnits: BigInt(0),
        groupedCount: 1,
      })
    }
  }
  else if (validExpenseLines.value.length) {
    const firstAccount = validExpenseLines.value[0]!.account
    const accountId = consolidatedAccountCount.value === 1 ? firstAccount.id : ''
    debits.push({
      key: 'petty-cash-consolidated-debit',
      accountId,
      accountDisplay: consolidatedAccountCount.value === 1
        ? accountLabel(firstAccount.id)
        : `Expense A/C (${consolidatedAccountCount.value} G/L accounts)`,
      description: `Consolidated petty cash expenses (${validExpenseLines.value.length} transactions)`,
      referenceNumber: form.batchNumber,
      transactionDate: form.batchDate,
      organizationUnitName: consolidatedOrganizationUnitName.value,
      recipientName: consolidatedRecipientName.value,
      debitUnits: validExpenseLines.value.reduce((total, item) => total + item.amount, BigInt(0)),
      creditUnits: BigInt(0),
      groupedCount: validExpenseLines.value.length,
    })
  }

  const creditAccount = activeAccounts.value.find((account) => account.id === form.pettyCashAccountId && account.currency.toUpperCase() === form.currencyCode)
  if (creditAccount && totalUnits.value > BigInt(0)) {
    debits.push({
      key: 'petty-cash-credit-line',
      accountId: creditAccount.id,
      description: `Petty cash batch ${form.batchNumber || '—'}`,
      referenceNumber: form.batchNumber,
      transactionDate: form.batchDate,
      organizationUnitName: '—',
      recipientName: '',
      debitUnits: BigInt(0),
      creditUnits: totalUnits.value,
      groupedCount: 1,
    })
  }

  return debits
})
const proposedDebitUnits = computed(() => previewLines.value.reduce((total, line) => total + line.debitUnits, BigInt(0)))
const proposedCreditUnits = computed(() => previewLines.value.reduce((total, line) => total + line.creditUnits, BigInt(0)))
const proposedJournalBalanced = computed(() => proposedDebitUnits.value > BigInt(0) && proposedDebitUnits.value === proposedCreditUnits.value)
const visibleBatches = computed(() => {
  const query = search.value.trim().toLowerCase()
  return batches.value
    .filter((batch) => !query || [
      batch.batchNumber,
      batch.sourceDocumentNumber,
      batch.batchOriginator,
      ...batch.lines.flatMap((line) => [line.referenceNumber, line.description, line.recipientName]),
    ].some((value) => value.toLowerCase().includes(query)))
    .slice()
    .sort((a, b) => b.batchDate.localeCompare(a.batchDate) || b.batchNumber.localeCompare(a.batchNumber))
})
const draftBatchCount = computed(() => batches.value.filter((batch) => batch.status === 'draft').length)
const statusText = computed(() => recordStatus.value === 'posted' ? 'Posted' : activeBatchId.value ? 'Draft' : 'New draft')

function todayIso() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isRealIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function makeLine(date = form.batchDate, expenseAccountId = defaultExpenseAccountId()): LedgerPettyCashLine {
  lineSequence += 1
  return {
    id: `petty-cash-line-${Date.now().toString(36)}-${lineSequence}`,
    transactionDate: date,
    referenceNumber: '',
    expenseAccountId,
    description: '',
    amount: '',
    organizationUnitId: '',
    recipientName: '',
  }
}

function defaultCashAccountId() {
  const preferred = setup.defaultGlNumbers.value?.pettyCashGlAccountId
  if (preferred && pettyCashAccounts.value.some((account) => account.id === preferred)) return preferred
  return pettyCashAccounts.value[0]?.id ?? ''
}

function defaultExpenseAccountId() {
  return expenseAccounts.value[0]?.id ?? ''
}

function rateForCurrency(currencyCode: string) {
  const rates: Record<string, string> = {
    GHS: '1.0000000000',
    USD: '12.5000000000',
    EUR: '13.4000000000',
    GBP: '16.0000000000',
  }
  return rates[currencyCode.toUpperCase()] ?? '1.0000000000'
}

function accountLabel(accountId: string) {
  const account = accounts.value.find((item) => item.id === accountId)
  return account ? `${account.accountNumber} — ${account.name}` : accountId ? 'Account unavailable' : 'Select an account'
}

function organizationUnitName(id: string) {
  return ledgerOrganizationalUnits.find((unit) => unit.id === id)?.name || (id ? 'Organizational unit unavailable' : 'Not assigned')
}

function formatMoneyUnits(units: bigint, currencyCode = form.currencyCode) {
  const cents = (units + BigInt(5000)) / BigInt(10000)
  const whole = cents / BigInt(100)
  const fraction = String(cents % BigInt(100)).padStart(2, '0')
  return `${currencyCode} ${new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(whole)}.${fraction}`
}

function normalizeInputAmount(value: string) {
  const units = parseLedgerAmount(value)
  if (units === null) return value
  const [whole = '0', fraction = ''] = formatLedgerAmount(units).split('.')
  const trimmedFraction = fraction.replace(/0+$/, '')
  return `${whole}.${trimmedFraction.length < 2 ? trimmedFraction.padEnd(2, '0') : trimmedFraction}`
}

function formatDate(value: string) {
  if (!isRealIsoDate(value)) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function batchTotalUnits(batch: LedgerPettyCashBatch) {
  return batch.lines.reduce((total, line) => {
    const amount = parseLedgerAmount(line.amount)
    return amount !== null && amount > BigInt(0) ? total + amount : total
  }, BigInt(0))
}

function batchTotalText(batch: LedgerPettyCashBatch) {
  return formatMoneyUnits(batchTotalUnits(batch), batch.currencyCode)
}

function statusClass(status: LedgerPettyCashStatus) {
  return status === 'posted'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
    : 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300'
}

function openBatch(batch: LedgerPettyCashBatch) {
  activeBatchId.value = batch.id
  Object.assign(form, {
    batchDate: batch.batchDate,
    batchNumber: batch.batchNumber,
    sourceDocumentNumber: batch.sourceDocumentNumber,
    pettyCashAccountId: batch.pettyCashAccountId,
    batchOriginator: batch.batchOriginator,
    currencyCode: batch.currencyCode,
    exchangeRate: batch.exchangeRate,
  })
  lines.value = batch.lines.map((line) => ({ ...line }))
  journalMode.value = batch.journalMode
  recordStatus.value = batch.status
  formErrors.value = []
  successMessage.value = ''
  showPostConfirmation.value = false
}

function startNewBatch() {
  const batchDate = todayIso()
  const cashAccountId = defaultCashAccountId()
  const cashAccount = activeAccounts.value.find((account) => account.id === cashAccountId)
  const currencyCode = cashAccount?.currency.toUpperCase() || 'GHS'
  activeBatchId.value = ''
  Object.assign(form, {
    batchDate,
    batchNumber: pettyCash.nextBatchNumber(batchDate),
    sourceDocumentNumber: '',
    pettyCashAccountId: cashAccountId,
    batchOriginator: '',
    currencyCode,
    exchangeRate: rateForCurrency(currencyCode),
  })
  lines.value = [makeLine(batchDate)]
  journalMode.value = 'non-consolidated'
  recordStatus.value = 'draft'
  formErrors.value = []
  successMessage.value = ''
  showPostConfirmation.value = false
}

function addLine() {
  if (isReadOnly.value) return
  lines.value.push(makeLine())
}

function removeLine(index: number) {
  if (isReadOnly.value) return
  lines.value.splice(index, 1)
}

function onCashAccountChange() {
  const currencyCode = selectedCashAccount.value?.currency.toUpperCase()
  if (!currencyCode) return
  form.currencyCode = currencyCode
  form.exchangeRate = rateForCurrency(currencyCode)
}

function onCurrencyChange() {
  form.exchangeRate = rateForCurrency(form.currencyCode)
}

function validateBatch() {
  const errors: string[] = []
  if (!isRealIsoDate(form.batchDate)) errors.push('Enter a valid batch date.')
  if (!form.batchNumber.trim() || form.batchNumber.trim().length > 40) errors.push('Batch number is required and must be 40 characters or fewer.')
  else if (batches.value.some((batch) => batch.id !== activeBatchId.value && batch.batchNumber.toLowerCase() === form.batchNumber.trim().toLowerCase())) errors.push('Batch number is already in use; choose a unique number.')
  if (form.sourceDocumentNumber.trim().length > 80) errors.push('Source document number must be 80 characters or fewer.')
  if (!form.pettyCashAccountId || !pettyCashAccounts.value.some((account) => account.id === form.pettyCashAccountId)) errors.push('Select an active Petty Cash G/L account.')
  if (!form.batchOriginator.trim() || form.batchOriginator.trim().length > 120) errors.push('Enter a batch originator (up to 120 characters).')
  if (!currencyOptions.value.some((currency) => currency.code === form.currencyCode)) errors.push('Select a supported transaction currency.')
  const rate = parseLedgerRate(form.exchangeRate)
  if (rate === null || rate <= BigInt(0)) errors.push('Enter a valid positive exchange rate.')
  if (selectedCashAccount.value && selectedCashAccount.value.currency.toUpperCase() !== form.currencyCode) {
    errors.push(`The selected petty cash account is denominated in ${selectedCashAccount.value.currency}; choose that currency or select a matching account.`)
  }
  if (!lines.value.length) errors.push('Add at least one petty cash expense transaction.')

  lines.value.forEach((line, index) => {
    const rowNumber = index + 1
    const amount = parseLedgerAmount(line.amount)
    const expenseAccount = expenseAccounts.value.find((account) => account.id === line.expenseAccountId)
    if (!isRealIsoDate(line.transactionDate)) errors.push(`Expense ${rowNumber}: enter a valid transaction date.`)
    if (!line.expenseAccountId || !expenseAccount) errors.push(`Expense ${rowNumber}: select an active expense G/L account.`)
    if (!line.description.trim() || line.description.trim().length > 200) errors.push(`Expense ${rowNumber}: enter a description of 200 characters or fewer.`)
    if (amount === null || amount <= BigInt(0)) errors.push(`Expense ${rowNumber}: enter a positive amount with up to six decimal places.`)
    if (line.referenceNumber.trim().length > 80) errors.push(`Expense ${rowNumber}: reference number must be 80 characters or fewer.`)
    if (!ledgerOrganizationalUnits.some((unit) => unit.id === line.organizationUnitId) && line.organizationUnitId) errors.push(`Expense ${rowNumber}: select a valid organizational unit.`)
    if (expenseAccount && expenseAccount.currency.toUpperCase() !== form.currencyCode) {
      errors.push(`Expense ${rowNumber}: ${expenseAccount.accountNumber} is denominated in ${expenseAccount.currency}; use a matching currency and account.`)
    }
  })

  return errors
}

function saveCurrentBatch(showFeedback = true) {
  const errors = validateBatch()
  formErrors.value = errors
  if (errors.length) return null

  const saved = pettyCash.saveBatch({
    id: activeBatchId.value || undefined,
    batchDate: form.batchDate,
    batchNumber: form.batchNumber.trim(),
    sourceDocumentNumber: form.sourceDocumentNumber.trim(),
    pettyCashAccountId: form.pettyCashAccountId,
    batchOriginator: form.batchOriginator.trim(),
    currencyCode: form.currencyCode,
    exchangeRate: form.exchangeRate,
    journalMode: journalMode.value,
    lines: lines.value.map((line) => ({ ...line, amount: normalizeInputAmount(line.amount) })),
  })
  if (!saved) {
    formErrors.value = ['Posted petty cash batches are locked. Start a new batch to make another entry.']
    return null
  }

  openBatch(saved)
  if (showFeedback) successMessage.value = `${saved.batchNumber} saved as a local draft.`
  return saved
}

function saveDraft() {
  saveCurrentBatch()
}

function requestPost() {
  formErrors.value = validateBatch()
  if (formErrors.value.length) return
  showPostConfirmation.value = true
}

function confirmPost() {
  const saved = saveCurrentBatch(false)
  if (!saved) {
    showPostConfirmation.value = false
    return
  }
  if (!pettyCash.postBatch(saved.id)) {
    formErrors.value = ['This draft could not be posted. Refresh the batch and try again.']
    showPostConfirmation.value = false
    return
  }

  const posted = batches.value.find((batch) => batch.id === saved.id)
  if (posted) openBatch(posted)
  successMessage.value = `${saved.batchNumber} marked as posted in the local preview.`
  showPostConfirmation.value = false
}

const initialBatch = batches.value.find((batch) => batch.status === 'draft') ?? batches.value[0]
if (initialBatch) openBatch(initialBatch)
else startNewBatch()
</script>

<template>
  <div class="space-y-5">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Petty Cash</div>
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Petty Cash Transactions</h1>
          <span class="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="recordStatus === 'posted' ? statusClass('posted') : statusClass('draft')">{{ statusText }}</span>
        </div>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Record petty cash expense batches and review their proposed General Ledger entries before posting.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/ledger/petty-cash-recipients" class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#15201e] dark:text-slate-300 dark:hover:bg-slate-800">
          Manage recipients
        </NuxtLink>
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 transition hover:bg-brand-800" @click="startNewBatch"><Plus :size="15" /> New batch</button>
      </div>
    </section>

    <div class="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-xs leading-relaxed text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200">
      <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold dark:bg-brand-900/60">i</span>
      <p><span class="font-semibold">Preview mode:</span> batches and journal previews use local demo data. Saving and posting here do not write to a live General Ledger.</p>
    </div>

    <div v-if="successMessage" class="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
      <span class="flex items-center gap-2"><Check :size="14" />{{ successMessage }}</span>
      <button type="button" class="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss message" @click="successMessage = ''"><X :size="14" /></button>
    </div>

    <div v-if="accountError" class="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <span>The chart of accounts could not be loaded. Refresh it before saving or posting a petty cash batch.</span>
      <button type="button" class="font-semibold underline" @click="refreshAccounts()">Retry</button>
    </div>

    <div v-if="formErrors.length" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30">
      <div class="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200"><AlertTriangle :size="14" /> Please correct the following</div>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-[11px] text-rose-700 dark:text-rose-300"><li v-for="error in formErrors" :key="error">{{ error }}</li></ul>
    </div>

    <div class="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,0.9fr)]">
      <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
        <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2"><Banknote :size="16" class="text-brand-700 dark:text-brand-300" /><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Batch details</h2></div>
            <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Header details and itemized petty cash receipts.</p>
          </div>
          <span v-if="activeBatchId" class="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ form.batchNumber }}</span>
        </div>

        <div class="space-y-5 p-5">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Batch date <span class="text-rose-500">*</span></span>
              <input v-model="form.batchDate" type="date" :disabled="isReadOnly" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30 dark:disabled:bg-slate-900/60" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Batch number <span class="text-rose-500">*</span></span>
              <input v-model="form.batchNumber" type="text" maxlength="40" :disabled="isReadOnly" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30 dark:disabled:bg-slate-900/60" placeholder="PC-2026-0001" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Source document no.</span>
              <input v-model="form.sourceDocumentNumber" type="text" maxlength="80" :disabled="isReadOnly" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30 dark:disabled:bg-slate-900/60" placeholder="Receipt batch / source reference" />
            </label>
            <label class="block sm:col-span-2 xl:col-span-2">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Petty Cash G/L <span class="text-rose-500">*</span></span>
              <select v-model="form.pettyCashAccountId" :disabled="isReadOnly" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30 dark:disabled:bg-slate-900/60" @change="onCashAccountChange">
                <option value="" disabled>Select Petty Cash G/L</option>
                <option v-for="account in pettyCashAccounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }} · {{ account.currency }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Batch originator <span class="text-rose-500">*</span></span>
              <input v-model="form.batchOriginator" type="text" maxlength="120" :disabled="isReadOnly" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30 dark:disabled:bg-slate-900/60" placeholder="Originator name" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency</span>
              <select v-model="form.currencyCode" :disabled="isReadOnly" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30 dark:disabled:bg-slate-900/60" @change="onCurrencyChange">
                <option v-for="currency in currencyOptions" :key="currency.code" :value="currency.code">{{ currency.code }} — {{ currency.name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Exchange rate</span>
              <input v-model="form.exchangeRate" readonly class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs tabular-nums text-slate-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </div>

          <div v-if="selectedCashAccount && selectedCashAccount.currency.toUpperCase() !== form.currencyCode" class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle :size="14" class="mt-0.5 shrink-0" /><span>This G/L account uses {{ selectedCashAccount.currency }}. Change the batch currency or select an account in {{ form.currencyCode }}.</span>
          </div>

          <section class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div class="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/30">
              <div><h3 class="text-xs font-semibold text-slate-800 dark:text-slate-200">Expense transactions</h3><p class="mt-0.5 text-[10px] text-slate-500">Enter one row for each petty cash receipt or expense.</p></div>
              <button type="button" :disabled="isReadOnly" class="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-lg border border-brand-200 bg-white px-3 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto dark:border-brand-900/60 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/30" @click="addLine"><Plus :size="13" /> Add row</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[1000px] text-left">
                <thead class="bg-white text-[9px] font-semibold uppercase tracking-[0.09em] text-slate-400 dark:bg-[#15201e]">
                  <tr><th class="w-[130px] px-3 py-2.5">Date</th><th class="w-[120px] px-3 py-2.5">Ref no.</th><th class="w-[190px] px-3 py-2.5">Expense G/L</th><th class="w-[180px] px-3 py-2.5">Description</th><th class="w-[120px] px-3 py-2.5 text-right">Amount</th><th class="w-[165px] px-3 py-2.5">Organizational unit</th><th class="w-[150px] px-3 py-2.5">Recipient</th><th class="w-12 px-2 py-2.5"></th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="(line, index) in lines" :key="line.id" class="align-top hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td class="px-2 py-2"><input v-model="line.transactionDate" type="date" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" :aria-label="`Transaction date for expense ${index + 1}`" /></td>
                    <td class="px-2 py-2"><input v-model="line.referenceNumber" type="text" maxlength="80" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" placeholder="Receipt ref" :aria-label="`Reference number for expense ${index + 1}`" /></td>
                    <td class="px-2 py-2"><select v-model="line.expenseAccountId" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" :aria-label="`Expense account for expense ${index + 1}`"><option value="" disabled>Select account</option><option v-for="account in expenseAccounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }} ({{ account.currency }})</option></select></td>
                    <td class="px-2 py-2"><input v-model="line.description" type="text" maxlength="200" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" placeholder="Expense description" :aria-label="`Description for expense ${index + 1}`" /></td>
                    <td class="px-2 py-2"><input v-model="line.amount" type="number" min="0" step="0.01" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-[10px] tabular-nums outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" placeholder="0.00" :aria-label="`Amount for expense ${index + 1}`" /></td>
                    <td class="px-2 py-2"><select v-model="line.organizationUnitId" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" :aria-label="`Organizational unit for expense ${index + 1}`"><option value="">No unit</option><option v-for="unit in ledgerOrganizationalUnits" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></td>
                    <td class="px-2 py-2"><input v-model="line.recipientName" type="text" list="petty-cash-recipient-options" maxlength="120" :disabled="isReadOnly" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-brand-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-900/60" placeholder="Recipient" :aria-label="`Recipient for expense ${index + 1}`" /></td>
                    <td class="px-2 py-2 text-center"><button type="button" :disabled="isReadOnly" class="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950/30" :aria-label="`Remove expense ${index + 1}`" title="Remove row" @click="removeLine(index)"><Trash2 :size="13" /></button></td>
                  </tr>
                  <tr v-if="!lines.length"><td colspan="8" class="px-4 py-10 text-center text-xs text-slate-400">No expense rows. Add a row to begin the batch.</td></tr>
                </tbody>
                <tfoot class="border-t border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40">
                  <tr><td colspan="4" class="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Batch total</td><td class="px-3 py-3 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-white">{{ formatMoneyUnits(totalUnits) }}</td><td colspan="3" class="px-3 py-3 text-[10px] text-slate-400">{{ lines.length }} expense {{ lines.length === 1 ? 'line' : 'lines' }}</td></tr>
                </tfoot>
              </table>
            </div>
            <datalist id="petty-cash-recipient-options"><option v-for="recipient in setup.pettyCashRecipients.value" :key="recipient.id" :value="recipient.recipient" /></datalist>
          </section>

          <div class="flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center dark:border-slate-800">
            <p class="text-[10px] leading-relaxed text-slate-400">{{ isReadOnly ? 'Posted batches are read-only. Create a new batch to record more expenses.' : 'Save the batch as a draft before posting. Required fields are marked with an asterisk.' }}</p>
            <div class="flex flex-wrap justify-end gap-2">
              <button v-if="!isReadOnly" type="button" class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" @click="saveDraft"><Check :size="14" /> Save draft</button>
              <button v-if="!isReadOnly" type="button" class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3.5 text-[11px] font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!accounts.length" @click="requestPost"><ShieldCheck :size="14" /> Post Petty Cash</button>
              <span v-else class="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-50 px-3.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300"><Check :size="14" /> Posted</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="space-y-4 2xl:sticky 2xl:top-5">
        <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div><div class="flex items-center gap-2"><Eye :size="15" class="text-brand-700 dark:text-brand-300" /><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Proposed journal entry</h2></div><p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Preview generated from the expense rows below.</p></div>
            <span v-if="proposedJournalBalanced" class="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300"><Check :size="12" /> Balanced</span>
            <span v-else class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/25 dark:text-amber-300"><AlertTriangle :size="12" /> Incomplete</span>
          </div>

          <div class="space-y-4 p-5">
            <fieldset>
              <legend class="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Debit presentation</legend>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 transition" :class="journalMode === 'consolidated' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'">
                  <input v-model="journalMode" type="radio" name="petty-cash-journal-mode" value="consolidated" :disabled="isReadOnly" class="mt-0.5 accent-[#1e5d50] disabled:opacity-50" />
                  <span><span class="block text-[11px] font-semibold text-slate-800 dark:text-slate-200">Consolidated</span><span class="mt-0.5 block text-[9px] leading-relaxed text-slate-500">Combine all expense debits into one transaction.</span></span>
                </label>
                <label class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 transition" :class="journalMode === 'non-consolidated' ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'">
                  <input v-model="journalMode" type="radio" name="petty-cash-journal-mode" value="non-consolidated" :disabled="isReadOnly" class="mt-0.5 accent-[#1e5d50] disabled:opacity-50" />
                  <span><span class="block text-[11px] font-semibold text-slate-800 dark:text-slate-200">Non-consolidated</span><span class="mt-0.5 block text-[9px] leading-relaxed text-slate-500">Keep every expense line separate.</span></span>
                </label>
              </div>
              <p v-if="journalMode === 'consolidated'" class="mt-2 text-[10px] leading-relaxed text-slate-400">All valid expense lines appear as one debit transaction. The original G/L account allocations remain available below.</p>
            </fieldset>

            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40"><p class="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">Proposed debits</p><p class="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatMoneyUnits(proposedDebitUnits) }}</p></div>
              <div class="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40"><p class="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">Proposed credits</p><p class="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatMoneyUnits(proposedCreditUnits) }}</p></div>
            </div>

            <div v-if="incompleteLineCount" class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle :size="13" class="mt-0.5 shrink-0" /><span>{{ incompleteLineCount }} expense {{ incompleteLineCount === 1 ? 'line is' : 'lines are' }} incomplete and excluded from the preview.</span></div>

            <div class="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
              <table class="w-full min-w-[490px] text-left">
                <thead class="bg-slate-50/70 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-3 py-2.5">Account / description</th><th class="px-3 py-2.5 text-right">Debit</th><th class="px-3 py-2.5 text-right">Credit</th></tr></thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="journalLine in previewLines" :key="journalLine.key" class="align-top">
                    <td class="px-3 py-2.5"><span class="block text-[10px] font-semibold text-slate-800 dark:text-slate-200">{{ journalLine.accountDisplay || accountLabel(journalLine.accountId) }}</span><span class="mt-0.5 block max-w-[235px] truncate text-[9px] text-slate-500" :title="journalLine.description">{{ journalLine.description }}</span><span class="mt-0.5 block text-[9px] text-slate-400">{{ formatDate(journalLine.transactionDate) }} · {{ journalLine.referenceNumber || 'No reference' }}<template v-if="journalLine.organizationUnitName !== '—'"> · {{ journalLine.organizationUnitName }}</template><template v-if="journalLine.recipientName"> · {{ journalLine.recipientName }}</template></span><span v-if="journalLine.groupedCount > 1" class="mt-1 inline-flex rounded-full bg-brand-50 px-1.5 py-0.5 text-[8px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{{ journalLine.groupedCount }} entries combined</span></td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-right text-[10px] tabular-nums text-slate-700 dark:text-slate-300">{{ journalLine.debitUnits > zeroAmount ? formatMoneyUnits(journalLine.debitUnits) : '—' }}</td>
                    <td class="whitespace-nowrap px-3 py-2.5 text-right text-[10px] tabular-nums text-slate-700 dark:text-slate-300">{{ journalLine.creditUnits > zeroAmount ? formatMoneyUnits(journalLine.creditUnits) : '—' }}</td>
                  </tr>
                  <tr v-if="!previewLines.length"><td colspan="3" class="px-3 py-8 text-center text-[10px] text-slate-400">Enter a valid expense amount and account to build the proposed journal.</td></tr>
                </tbody>
                <tfoot class="border-t border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40"><tr><td class="px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">Totals</td><td class="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-bold tabular-nums text-slate-900 dark:text-white">{{ formatMoneyUnits(proposedDebitUnits) }}</td><td class="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-bold tabular-nums text-slate-900 dark:text-white">{{ formatMoneyUnits(proposedCreditUnits) }}</td></tr></tfoot>
              </table>
            </div>

            <details v-if="journalMode === 'consolidated' && consolidatedAccountAllocations.length" class="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
              <summary class="cursor-pointer px-3 py-2.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-50/60 dark:text-brand-300 dark:hover:bg-brand-950/20">View underlying G/L allocation ({{ consolidatedAccountAllocations.length }} splits)</summary>
              <div class="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
                <table class="w-full min-w-[420px] text-left">
                  <thead class="bg-slate-50/70 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-3 py-2">Expense account / unit</th><th class="px-3 py-2 text-right">Rows</th><th class="px-3 py-2 text-right">Debit allocation</th></tr></thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr v-for="allocation in consolidatedAccountAllocations" :key="allocation.key">
                      <td class="px-3 py-2"><span class="block text-[10px] font-semibold text-slate-700 dark:text-slate-300">{{ accountLabel(allocation.accountId) }}</span><span class="mt-0.5 block text-[9px] text-slate-400">{{ organizationUnitName(allocation.organizationUnitId) }}</span></td>
                      <td class="px-3 py-2 text-right text-[10px] tabular-nums text-slate-500">{{ allocation.transactionCount }}</td>
                      <td class="px-3 py-2 text-right text-[10px] tabular-nums text-slate-700 dark:text-slate-300">{{ formatMoneyUnits(allocation.amountUnits) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            <div class="flex items-start gap-2 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-400 dark:border-slate-800"><span class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-slate-100 text-[9px] font-bold dark:bg-slate-800">i</span><p>The credit is posted to the selected Petty Cash G/L. Consolidated mode displays one debit transaction and retains its account split for review; non-consolidated mode preserves every expense debit as entered.</p></div>
          </div>
        </section>

        <section class="grid grid-cols-2 gap-3">
          <article class="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[10px] font-medium text-slate-500 dark:text-slate-400">Draft batches</p><p class="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ draftBatchCount }}</p></article>
          <article class="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[10px] font-medium text-slate-500 dark:text-slate-400">Current batch</p><p class="mt-1.5 truncate text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatMoneyUnits(totalUnits) }}</p></article>
        </section>
      </aside>
    </div>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Petty cash batch history</h2><p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{{ visibleBatches.length }} of {{ batches.length }} local demo batches</p></div>
        <label class="relative block w-full sm:max-w-[300px]"><Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" type="search" placeholder="Search batches, references, recipients…" class="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></label>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-left">
          <thead class="bg-slate-50/70 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Batch</th><th class="px-4 py-3">Date</th><th class="px-4 py-3">Source document / originator</th><th class="px-4 py-3 text-right">Expenses</th><th class="px-4 py-3 text-right">Total</th><th class="px-4 py-3">Status</th><th class="px-5 py-3 text-right">Action</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="batch in visibleBatches" :key="batch.id" class="transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40" :class="activeBatchId === batch.id ? 'bg-brand-50/40 dark:bg-brand-950/15' : ''">
              <td class="px-5 py-3.5"><span class="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{{ batch.batchNumber }}</span><span class="mt-1 block text-[9px] text-slate-400">{{ batch.pettyCashAccountId ? accountLabel(batch.pettyCashAccountId) : 'No cash account' }}</span></td>
              <td class="px-4 py-3.5 text-[11px] text-slate-500">{{ formatDate(batch.batchDate) }}</td>
              <td class="px-4 py-3.5"><span class="block text-[10px] text-slate-700 dark:text-slate-300">{{ batch.sourceDocumentNumber || '—' }}</span><span class="mt-1 block text-[9px] text-slate-400">{{ batch.batchOriginator }}</span></td>
              <td class="px-4 py-3.5 text-right text-[11px] tabular-nums text-slate-500">{{ batch.lines.length }}</td>
              <td class="px-4 py-3.5 text-right text-[11px] font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ batchTotalText(batch) }}</td>
              <td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusClass(batch.status)">{{ batch.status === 'posted' ? 'Posted' : 'Draft' }}</span></td>
              <td class="px-5 py-3.5 text-right"><button type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30" :aria-label="`Open batch ${batch.batchNumber}`" @click="openBatch(batch)"><Eye :size="13" /> Open</button></td>
            </tr>
            <tr v-if="!visibleBatches.length"><td colspan="7" class="px-5 py-12 text-center"><p class="text-xs font-semibold text-slate-700 dark:text-slate-200">No petty cash batches found</p><p class="mt-1 text-[10px] text-slate-400">Try another search or create a new batch.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-1 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"><span>Demo batches are held in local application state.</span><span>Posted batches are locked in this preview.</span></div>
    </section>

    <div v-if="showPostConfirmation" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" @click.self="showPostConfirmation = false">
      <section role="dialog" aria-modal="true" aria-labelledby="petty-cash-post-title" class="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="flex items-start gap-3"><span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><ShieldCheck :size="17" /></span><div><h2 id="petty-cash-post-title" class="text-base font-semibold text-slate-900 dark:text-white">Post this petty cash batch?</h2><p class="mt-1.5 text-sm leading-relaxed text-slate-500">{{ form.batchNumber }} will be marked as posted in the preview workflow.</p></div></div>
        <p class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">This action is local demo behavior. It does not create a live GL journal or update account balances.</p>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="showPostConfirmation = false">Cancel</button><button type="button" class="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700" @click="confirmPost"><Check :size="14" /> Post batch</button></div>
      </section>
    </div>
  </div>
</template>
