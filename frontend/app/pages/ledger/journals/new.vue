<script setup lang="ts">
import { ArrowLeft, Plus, Trash2, Save, AlertTriangle, CheckCircle2 } from '@lucide/vue'
import type { AccountsResponse, CreateJournalDraftInput } from '../../../features/ledger/types'
import { ledgerCurrencyOptions } from '../../../features/ledger/setup-data'
import { ledgerOrganizationalUnits } from '../../../features/ledger/organization-data'
import { convertBaseToTransactionAmount, convertLedgerAmount, formatLedgerAmount, LEDGER_RATE_SCALE, parseLedgerAmount, parseLedgerRate } from '../../../features/ledger/money'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'

definePageMeta({ layout: 'admin-ledger' })

interface DraftLine {
  accountId: string
  referenceNumber: string
  description: string
  organizationUnitId: string
  transactionDate: string
  chequeNumber: string
  currencyCode: string
  exchangeRate: string
  foreignDebit: string
  foreignCredit: string
  debit: string
  credit: string
}

const baseCurrencyCode = 'GHS'

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeLine(organizationUnitId: string, transactionDate: string): DraftLine {
  return {
    accountId: '',
    referenceNumber: '',
    description: '',
    organizationUnitId,
    transactionDate,
    chequeNumber: '',
    currencyCode: baseCurrencyCode,
    exchangeRate: '1.0000000000',
    foreignDebit: '',
    foreignCredit: '',
    debit: '',
    credit: '',
  }
}

const api = useLedgerApi()
const today = localDateString()
const batchDate = ref(today)
const description = ref('')
const organizationUnitId = ref('ou-accra')
const multiCurrency = ref(false)
const lines = ref<DraftLine[]>([
  makeLine(organizationUnitId.value, today),
  makeLine(organizationUnitId.value, today),
])
const saving = ref(false)
const saveError = ref('')
const { data: accountsData, error: accountsError, refresh: refreshAccounts } = await useAsyncData<AccountsResponse>('ledger-journal-account-options', () => api.accounts())
const accounts = computed(() => accountsData.value?.items ?? [])
const activeAccounts = computed(() => accounts.value.filter((account) => account.status === 'Active'))
const hasForeignCurrencyAccount = computed(() => lines.value.some((line) => {
  const account = accounts.value.find((item) => item.id === line.accountId)
  return Boolean(account && account.currency.toUpperCase() !== baseCurrencyCode)
}))
const isMultiCurrency = computed(() => multiCurrency.value || hasForeignCurrencyAccount.value)

function accountCurrencyCode(line: DraftLine): string {
  return accounts.value.find((account) => account.id === line.accountId)?.currency.toUpperCase() || baseCurrencyCode
}

function lineCurrencyCode(line: DraftLine): string {
  return (line.currencyCode || accountCurrencyCode(line)).toUpperCase()
}

function defaultExchangeRate(currencyCode: string): string {
  if (currencyCode === 'USD') return '12.5000000000'
  if (currencyCode === 'EUR') return '13.6000000000'
  if (currencyCode === 'GBP') return '15.8000000000'
  return '1.0000000000'
}

function hasAmount(line: DraftLine, side: 'debit' | 'credit') {
  const transactionAmount = side === 'debit' ? line.foreignDebit : line.foreignCredit
  const baseAmount = side === 'debit' ? line.debit : line.credit
  return Boolean((isMultiCurrency.value ? transactionAmount : baseAmount).trim())
}

function transactionAmountText(line: DraftLine, side: 'debit' | 'credit', multi = isMultiCurrency.value): string {
  if (!multi) return side === 'debit' ? line.debit : line.credit
  const transactionAmount = side === 'debit' ? line.foreignDebit : line.foreignCredit
  if (!transactionAmount && lineCurrencyCode(line) === baseCurrencyCode) {
    return side === 'debit' ? line.debit : line.credit
  }
  return transactionAmount
}

function baseAmountUnits(line: DraftLine, side: 'debit' | 'credit', multi = isMultiCurrency.value): bigint | null {
  const amount = parseLedgerAmount(transactionAmountText(line, side, multi), true)
  if (amount === null) return null
  if (!multi) return amount
  const currencyCode = lineCurrencyCode(line)
  const rate = parseLedgerRate(line.exchangeRate || (currencyCode === baseCurrencyCode ? '1' : ''))
  if (rate === null || rate <= BigInt(0)) return null
  return convertLedgerAmount(amount, rate)
}

function displayedBaseAmount(line: DraftLine, side: 'debit' | 'credit'): string {
  const amount = baseAmountUnits(line, side)
  return amount === null ? '' : formatLedgerAmount(amount)
}

const debitUnits = computed(() => lines.value.reduce((sum, line) => sum + (baseAmountUnits(line, 'debit') ?? BigInt(0)), BigInt(0)))
const creditUnits = computed(() => lines.value.reduce((sum, line) => sum + (baseAmountUnits(line, 'credit') ?? BigInt(0)), BigInt(0)))
const totalDebit = computed(() => formatLedgerAmount(debitUnits.value))
const totalCredit = computed(() => formatLedgerAmount(creditUnits.value))

function lineIsValid(line: DraftLine): boolean {
  const account = accounts.value.find((item) => item.id === line.accountId && item.status === 'Active')
  const currencyCode = lineCurrencyCode(line)
  const currencyExists = ledgerCurrencyOptions.some((currency) => currency.code === currencyCode)
  const debitInput = parseLedgerAmount(transactionAmountText(line, 'debit'), true)
  const creditInput = parseLedgerAmount(transactionAmountText(line, 'credit'), true)
  const rate = parseLedgerRate(isMultiCurrency.value ? line.exchangeRate : '1')
  if (!account || !currencyExists || account.currency.toUpperCase() !== currencyCode) return false
  if (!line.referenceNumber.trim() || !line.transactionDate || debitInput === null || creditInput === null) return false
  if (debitInput === BigInt(0) && creditInput === BigInt(0)) return false
  if (debitInput > BigInt(0) && creditInput > BigInt(0)) return false
  if (rate === null || rate <= BigInt(0)) return false
  if (currencyCode === baseCurrencyCode && rate !== LEDGER_RATE_SCALE) return false
  const baseDebit = baseAmountUnits(line, 'debit')
  const baseCredit = baseAmountUnits(line, 'credit')
  if (baseDebit === null || baseCredit === null) return false
  if (parseLedgerAmount(formatLedgerAmount(baseDebit)) === null || parseLedgerAmount(formatLedgerAmount(baseCredit)) === null) return false
  if ((debitInput > BigInt(0) && baseDebit === BigInt(0)) || (creditInput > BigInt(0) && baseCredit === BigInt(0))) return false
  return true
}

const linesValid = computed(() => lines.value.length >= 2 && lines.value.every(lineIsValid))
const balanced = computed(() => linesValid.value && debitUnits.value === creditUnits.value)
const difference = computed(() => formatLedgerAmount(debitUnits.value >= creditUnits.value ? debitUnits.value - creditUnits.value : creditUnits.value - debitUnits.value))
const canSave = computed(() => Boolean(description.value.trim()) && Boolean(batchDate.value) && linesValid.value && !saving.value && !accountsError.value)
const exchangeRateErrors = computed(() => lines.value.flatMap((line, index) => {
  if (!isMultiCurrency.value || !line.accountId) return []
  const rate = parseLedgerRate(line.exchangeRate)
  if (rate === null || rate <= BigInt(0)) return [`Line ${index + 1}: enter a positive exchange rate with at most 10 decimal places.`]
  if (lineCurrencyCode(line) === baseCurrencyCode && rate !== LEDGER_RATE_SCALE) return [`Line ${index + 1}: GHS exchange rates must equal 1.`]
  return []
}))

function addLine() {
  lines.value.push(makeLine(organizationUnitId.value, batchDate.value))
}

function removeLine(index: number) {
  if (lines.value.length > 2) lines.value.splice(index, 1)
}

function updateLineDefaultUnits() {
  for (const line of lines.value) {
    if (!line.organizationUnitId || line.organizationUnitId === 'ou-accra') line.organizationUnitId = organizationUnitId.value
  }
}

function updateLineDates() {
  for (const line of lines.value) {
    if (!line.transactionDate) line.transactionDate = batchDate.value
  }
}

function onAccountChange(line: DraftLine) {
  const oldCurrencyCode = lineCurrencyCode(line)
  const wasMultiCurrency = multiCurrency.value || lines.value.some((item) => item !== line && lineCurrencyCode(item) !== baseCurrencyCode) || oldCurrencyCode !== baseCurrencyCode
  const hadDebit = Boolean(line.debit.trim() || line.foreignDebit.trim())
  const hadCredit = Boolean(line.credit.trim() || line.foreignCredit.trim())
  const baseDebit = baseAmountUnits(line, 'debit', wasMultiCurrency) ?? BigInt(0)
  const baseCredit = baseAmountUnits(line, 'credit', wasMultiCurrency) ?? BigInt(0)
  const newCurrencyCode = accountCurrencyCode(line)
  const previousRate = parseLedgerRate(line.exchangeRate)
  const rateText = newCurrencyCode === baseCurrencyCode
    ? '1.0000000000'
    : oldCurrencyCode === newCurrencyCode && previousRate !== null && previousRate > BigInt(0)
      ? line.exchangeRate
      : defaultExchangeRate(newCurrencyCode)
  const rate = parseLedgerRate(rateText) ?? LEDGER_RATE_SCALE

  if (newCurrencyCode !== baseCurrencyCode) multiCurrency.value = true
  line.currencyCode = newCurrencyCode
  line.exchangeRate = rateText

  if (multiCurrency.value || newCurrencyCode !== baseCurrencyCode) {
    const keepExistingTransactionAmounts = wasMultiCurrency && oldCurrencyCode === newCurrencyCode
    line.foreignDebit = keepExistingTransactionAmounts && line.foreignDebit.trim()
      ? line.foreignDebit
      : hadDebit && baseDebit > BigInt(0) ? formatLedgerAmount(convertBaseToTransactionAmount(baseDebit, rate)) : ''
    line.foreignCredit = keepExistingTransactionAmounts && line.foreignCredit.trim()
      ? line.foreignCredit
      : hadCredit && baseCredit > BigInt(0) ? formatLedgerAmount(convertBaseToTransactionAmount(baseCredit, rate)) : ''
    line.debit = ''
    line.credit = ''
  } else {
    line.debit = hadDebit && baseDebit > BigInt(0) ? formatLedgerAmount(baseDebit) : ''
    line.credit = hadCredit && baseCredit > BigInt(0) ? formatLedgerAmount(baseCredit) : ''
    line.foreignDebit = ''
    line.foreignCredit = ''
  }
}

function onMultiCurrencyToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  const wasMultiCurrency = isMultiCurrency.value
  if (!enabled && hasForeignCurrencyAccount.value) {
    multiCurrency.value = true
    return
  }

  if (enabled) {
    multiCurrency.value = true
    for (const line of lines.value) {
      const oldCurrencyCode = lineCurrencyCode(line)
      const newCurrencyCode = accountCurrencyCode(line)
      const hadDebit = Boolean(line.debit.trim() || line.foreignDebit.trim())
      const hadCredit = Boolean(line.credit.trim() || line.foreignCredit.trim())
      const baseDebit = baseAmountUnits(line, 'debit', wasMultiCurrency) ?? BigInt(0)
      const baseCredit = baseAmountUnits(line, 'credit', wasMultiCurrency) ?? BigInt(0)
      const oldRate = parseLedgerRate(line.exchangeRate)
      const rateText = newCurrencyCode === baseCurrencyCode
        ? '1.0000000000'
        : oldCurrencyCode === newCurrencyCode && oldRate !== null && oldRate > BigInt(0)
          ? line.exchangeRate
          : defaultExchangeRate(newCurrencyCode)
      const rate = parseLedgerRate(rateText) ?? LEDGER_RATE_SCALE
      line.currencyCode = newCurrencyCode
      line.exchangeRate = rateText
      line.foreignDebit = wasMultiCurrency && oldCurrencyCode === newCurrencyCode && line.foreignDebit.trim()
        ? line.foreignDebit
        : hadDebit && baseDebit > BigInt(0) ? formatLedgerAmount(convertBaseToTransactionAmount(baseDebit, rate)) : ''
      line.foreignCredit = wasMultiCurrency && oldCurrencyCode === newCurrencyCode && line.foreignCredit.trim()
        ? line.foreignCredit
        : hadCredit && baseCredit > BigInt(0) ? formatLedgerAmount(convertBaseToTransactionAmount(baseCredit, rate)) : ''
      line.debit = ''
      line.credit = ''
    }
    return
  }

  for (const line of lines.value) {
    const baseDebit = baseAmountUnits(line, 'debit', true) ?? BigInt(0)
    const baseCredit = baseAmountUnits(line, 'credit', true) ?? BigInt(0)
    const hasTransactionAmount = Boolean(line.foreignDebit.trim() || line.foreignCredit.trim() || line.debit.trim() || line.credit.trim())
    line.debit = hasTransactionAmount ? formatLedgerAmount(baseDebit) : ''
    line.credit = hasTransactionAmount ? formatLedgerAmount(baseCredit) : ''
    line.currencyCode = baseCurrencyCode
    line.exchangeRate = '1.0000000000'
    line.foreignDebit = ''
    line.foreignCredit = ''
  }
  multiCurrency.value = false
}

function onDebitInput(line: DraftLine) {
  if (isMultiCurrency.value) line.foreignCredit = ''
  else line.credit = ''
}

function onCreditInput(line: DraftLine) {
  if (isMultiCurrency.value) line.foreignDebit = ''
  else line.debit = ''
}

async function saveDraft() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    const input: CreateJournalDraftInput = {
      batchDate: batchDate.value,
      description: description.value.trim(),
      organizationUnitId: organizationUnitId.value || undefined,
      isMultiCurrency: isMultiCurrency.value,
      lines: lines.value.map((line) => {
        const account = accounts.value.find((item) => item.id === line.accountId)
        const currencyCode = lineCurrencyCode(line)
        const debitBase = baseAmountUnits(line, 'debit') ?? BigInt(0)
        const creditBase = baseAmountUnits(line, 'credit') ?? BigInt(0)
        const debitTransaction = parseLedgerAmount(transactionAmountText(line, 'debit'), true) ?? BigInt(0)
        const creditTransaction = parseLedgerAmount(transactionAmountText(line, 'credit'), true) ?? BigInt(0)
        const currencyName = ledgerCurrencyOptions.find((currency) => currency.code === currencyCode)?.name ?? currencyCode
        return {
          accountId: line.accountId,
          accountName: account?.name ?? '',
          referenceNumber: line.referenceNumber.trim(),
          description: line.description.trim(),
          organizationUnitId: line.organizationUnitId || undefined,
          transactionDate: line.transactionDate,
          chequeNumber: line.chequeNumber.trim() || undefined,
          currencyCode,
          currencyName,
          exchangeRate: isMultiCurrency.value ? line.exchangeRate : '1.0000000000',
          foreignDebit: formatLedgerAmount(debitTransaction),
          foreignCredit: formatLedgerAmount(creditTransaction),
          debit: formatLedgerAmount(debitBase),
          credit: formatLedgerAmount(creditBase),
        }
      }),
    }
    const validation = await api.validateJournalDraft(input)
    if (!validation.valid) {
      saveError.value = validation.errors.join(' ')
      return
    }
    await api.createJournalDraft(input)
    await navigateTo('/ledger/journals')
  } catch (e: unknown) {
    const fetchError = e as { statusMessage?: string; data?: { statusMessage?: string } }
    saveError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'The journal draft could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1320px] space-y-6">
    <NuxtLink to="/ledger/journals" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"><ArrowLeft :size="15" /> Back to journal entries</NuxtLink>

    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Journal entries <span class="mx-1 text-slate-300">/</span> New</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Create journal draft</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Enter a journal header and ledger lines. Drafts can be saved before they balance.</p>
      </div>
      <span class="inline-flex w-fit items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/25 dark:text-violet-300"><span class="h-1.5 w-1.5 rounded-full bg-violet-500" /> Draft</span>
    </section>

    <div v-if="accountsError" class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <span>Unable to load the chart of accounts.</span>
      <button type="button" class="font-semibold underline" @click="refreshAccounts()">Retry</button>
    </div>

    <section class="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:p-6">
      <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Journal header</h2><p class="mt-1 text-[11px] text-slate-500">A batch number is assigned when the journal is saved.</p></div>
        <span class="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">General journal</span>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-[190px_260px_1fr]">
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Batch date</span><input v-model="batchDate" type="date" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" @change="updateLineDates" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Organizational unit</span><select v-model="organizationUnitId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="updateLineDefaultUnits"><option value="">No unit</option><option v-for="unit in ledgerOrganizationalUnits" :key="unit.id" :value="unit.id">{{ unit.path }}</option></select></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Batch description</span><input v-model="description" required maxlength="200" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" placeholder="What is this journal recording?" /></label>
      </div>
      <label class="mt-4 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
        <input type="checkbox" :checked="isMultiCurrency" :disabled="hasForeignCurrencyAccount" class="mt-0.5 rounded border-slate-300 text-brand-700 focus:ring-brand-500" @change="onMultiCurrencyToggle" />
        <span><span class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Multi-currency journal</span><span class="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">Enter each line in its account currency and set its rate to GHS. Foreign-currency accounts automatically require this mode; journal totals and balancing remain in GHS.</span></span>
      </label>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Journal lines</h2><p class="mt-1 text-[11px] text-slate-500">Reference, account, organizational unit, transaction date, and cheque details are captured per line. {{ isMultiCurrency ? 'Transaction amounts are converted to GHS for balancing.' : 'Amounts are entered in GHS.' }}</p></div>
        <button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="addLine"><Plus :size="14" /> Add line</button>
      </div>
      <div class="overflow-x-auto">
        <table :class="['w-full text-left', isMultiCurrency ? 'min-w-[2050px]' : 'min-w-[1500px]']">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="w-12 px-5 py-3">#</th><th class="w-[145px] px-3 py-3">Reference no.</th><th class="min-w-[250px] px-3 py-3">Account</th><th class="min-w-[190px] px-3 py-3">Description</th><th class="min-w-[200px] px-3 py-3">Organizational unit</th><th class="w-[140px] px-3 py-3">Transaction date</th><th class="w-[130px] px-3 py-3">Cheque no.</th><th v-if="isMultiCurrency" class="w-[105px] px-3 py-3">Currency</th><th v-if="isMultiCurrency" class="w-[155px] px-3 py-3 text-right">Rate to GHS</th><th v-if="isMultiCurrency" class="w-[145px] px-3 py-3 text-right">Txn debit</th><th v-if="isMultiCurrency" class="w-[145px] px-3 py-3 text-right">Txn credit</th><th class="w-[145px] px-3 py-3 text-right">Debit (GHS)</th><th class="w-[145px] px-3 py-3 text-right">Credit (GHS)</th><th class="w-12 px-3 py-3" /></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="(line, index) in lines" :key="index">
              <td class="px-5 py-3 text-xs font-medium text-slate-400">{{ String(index + 1).padStart(2, '0') }}</td>
              <td class="px-3 py-2.5"><input v-model="line.referenceNumber" required maxlength="80" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Reference" /></td>
              <td class="px-3 py-2.5"><select v-model="line.accountId" required class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="onAccountChange(line)"><option value="" disabled>Select ledger account</option><option v-for="account in activeAccounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }} · {{ account.currency }}</option></select></td>
              <td class="px-3 py-2.5"><input v-model="line.description" maxlength="300" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Line details" /></td>
              <td class="px-3 py-2.5"><select v-model="line.organizationUnitId" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="">No unit</option><option v-for="unit in ledgerOrganizationalUnits" :key="unit.id" :value="unit.id">{{ unit.path }}</option></select></td>
              <td class="px-3 py-2.5"><input v-model="line.transactionDate" type="date" required class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></td>
              <td class="px-3 py-2.5"><input v-model="line.chequeNumber" maxlength="80" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Optional" /></td>
              <td v-if="isMultiCurrency" class="px-3 py-2.5"><span class="inline-flex rounded-md bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{{ lineCurrencyCode(line) }}</span></td>
              <td v-if="isMultiCurrency" class="px-3 py-2.5"><input v-model="line.exchangeRate" type="text" inputmode="decimal" :disabled="lineCurrencyCode(line) === 'GHS'" :aria-label="`Exchange rate for line ${index + 1}`" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800" placeholder="1.0000000000" /></td>
              <td v-if="isMultiCurrency" class="px-3 py-2.5"><input v-model="line.foreignDebit" inputmode="decimal" :aria-label="`Debit amount in ${lineCurrencyCode(line)} for line ${index + 1}`" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" @input="onDebitInput(line)" /></td>
              <td v-if="isMultiCurrency" class="px-3 py-2.5"><input v-model="line.foreignCredit" inputmode="decimal" :aria-label="`Credit amount in ${lineCurrencyCode(line)} for line ${index + 1}`" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" @input="onCreditInput(line)" /></td>
              <td v-if="isMultiCurrency" class="px-3 py-2.5 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{{ displayedBaseAmount(line, 'debit') ? formatCurrency(displayedBaseAmount(line, 'debit'), 'GHS') : '—' }}</td>
              <td v-else class="px-3 py-2.5"><input v-model="line.debit" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" @input="onDebitInput(line)" /></td>
              <td v-if="isMultiCurrency" class="px-3 py-2.5 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{{ displayedBaseAmount(line, 'credit') ? formatCurrency(displayedBaseAmount(line, 'credit'), 'GHS') : '—' }}</td>
              <td v-else class="px-3 py-2.5"><input v-model="line.credit" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" @input="onCreditInput(line)" /></td>
              <td class="px-3 py-2.5"><button type="button" :disabled="lines.length <= 2" class="rounded-md p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" aria-label="Remove line" @click="removeLine(index)"><Trash2 :size="14" /></button></td>
            </tr>
            <tr class="bg-slate-50/70 dark:bg-slate-900/50"><td :colspan="isMultiCurrency ? 11 : 7" class="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">GHS totals</td><td class="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(totalDebit, 'GHS') }}</td><td class="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(totalCredit, 'GHS') }}</td><td /></tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="exchangeRateErrors.length" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ exchangeRateErrors.join(' ') }}</p>
    <div class="flex flex-col justify-between gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center" :class="balanced ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20'">
      <div class="flex items-start gap-2.5"><CheckCircle2 v-if="balanced" :size="16" class="mt-0.5 shrink-0 text-emerald-600" /><AlertTriangle v-else :size="16" class="mt-0.5 shrink-0 text-amber-600" /><p class="text-xs" :class="balanced ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'"><span class="font-semibold">{{ balanced ? 'Journal is balanced.' : 'Journal is not balanced yet.' }}</span> {{ balanced ? 'It is ready to save as a draft.' : 'A valid but unbalanced batch can still be saved as a draft; approval requires matching totals.' }}</p></div>
      <span class="shrink-0 text-[10px] font-semibold tabular-nums" :class="balanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'">Difference {{ formatCurrency(difference, 'GHS') }}</span>
    </div>

    <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
    <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
      <NuxtLink to="/ledger/journals" class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</NuxtLink>
      <button type="button" :disabled="!canSave" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-xs font-semibold text-white shadow-sm shadow-brand-900/10 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50" @click="saveDraft"><Save :size="14" />{{ saving ? 'Saving draft…' : 'Save draft' }}</button>
    </div>
  </div>
</template>
