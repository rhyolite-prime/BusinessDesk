<script setup lang="ts">
import { ArrowLeft, Calculator, Check, Plus, Save, Trash2 } from '@lucide/vue'
import type { AccountsResponse } from '../../../../features/ledger/types'
import { ledgerCurrencyOptions, useLedgerSetup } from '../../../../features/ledger/setup-data'
import { ledgerOrganizationalUnits } from '../../../../features/ledger/organization-data'
import { convertLedgerAmount, formatLedgerAmount, parseLedgerAmount, parseLedgerRate, percentageOfLedgerAmount } from '../../../../features/ledger/money'
import type { CreateLedgerVoucherInput, LedgerVoucher, LedgerVoucherLineInput, LedgerVoucherRetentionInput, LedgerVoucherType } from '../../../../features/ledger/voucher-data'
import { isLedgerVoucherType, payeesForVoucherType, voucherTypeInfo } from '../../../../features/ledger/voucher-data'
import { useLedgerApi } from '../../../../features/ledger/useLedgerApi'
import { useLedgerVoucherApi } from '../../../../features/ledger/useLedgerVoucherApi'

definePageMeta({ layout: 'admin-ledger' })

interface VoucherDraftLine extends LedgerVoucherLineInput {
  key: string
}

interface VoucherDraftRetention extends LedgerVoucherRetentionInput {
  key: string
}

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeLine(organizationUnitId = 'ou-accra'): VoucherDraftLine {
  return {
    key: `line-${crypto.randomUUID()}`,
    invoiceNumber: '',
    referenceNumber: '',
    accountId: '',
    description: '',
    organizationUnitId,
    localAmount: '',
    foreignAmount: '',
    isWithhold: false,
  }
}

function makeRetention(): VoucherDraftRetention {
  return {
    key: `retention-${crypto.randomUUID()}`,
    accountId: 'acc-2200',
    description: 'Withholding tax',
    value: '',
    isPercentage: true,
  }
}

function defaultRate(currencyCode: string) {
  if (currencyCode === 'USD') return '12.5000000000'
  if (currencyCode === 'EUR') return '13.6000000000'
  if (currencyCode === 'GBP') return '15.8000000000'
  return '1.0000000000'
}

const route = useRoute()
const routeType = typeof route.params.type === 'string' ? route.params.type : ''
if (!isLedgerVoucherType(routeType)) throw createError({ statusCode: 404, statusMessage: 'Voucher type not found.' })
const type = computed<LedgerVoucherType>(() => isLedgerVoucherType(route.params.type) ? route.params.type : routeType)
const typeInfo = computed(() => voucherTypeInfo(type.value))
const editingId = computed(() => typeof route.query.id === 'string' ? route.query.id : '')
const today = localDateString()
const ledgerApi = useLedgerApi()
const voucherApi = useLedgerVoucherApi()
const setup = useLedgerSetup()
const saving = ref(false)
const saveError = ref('')
const { data: accountData, pending: accountsPending, error: accountError, refresh: refreshAccounts } = await useAsyncData<AccountsResponse>(
  'ledger-voucher-account-options',
  () => ledgerApi.accounts(),
)
const { data: existingVoucher, pending: voucherPending, error: voucherLoadError } = await useAsyncData<LedgerVoucher | null>(
  `ledger-voucher-edit-${editingId.value || 'new'}`,
  () => editingId.value ? voucherApi.get(editingId.value) : Promise.resolve(null),
)

const form = reactive<Omit<CreateLedgerVoucherInput, 'lines' | 'retentions'>>({
  type: type.value,
  payeeId: '',
  entryDate: today,
  paymentDate: today,
  receiptDate: today,
  bankAccountId: 'bank-account-demo-1',
  bankAccountName: 'GCB Bank PLC · BD-DEMO-001',
  bankGlAccountId: 'acc-1010',
  bankGlAccountName: '1010 — Bank — Main Operating',
  mode: 'Cash',
  currencyCode: 'GHS',
  exchangeRate: '1.0000000000',
  multiCurrency: false,
  chequeNumber: '',
  description: '',
})
const lines = ref<VoucherDraftLine[]>([makeLine()])
const retentions = ref<VoucherDraftRetention[]>([])

const accounts = computed(() => accountData.value?.items ?? [])
const activeAccounts = computed(() => accounts.value.filter((account) => account.status === 'Active'))
const bankOptions = computed(() => setup.bankAccounts.value
  .filter((bank) => bank.isActive && activeAccounts.value.some((account) => account.id === bank.accountId))
  .map((bank) => {
    const glAccount = activeAccounts.value.find((account) => account.id === bank.accountId)
    return { ...bank, glAccountName: glAccount ? `${glAccount.accountNumber} — ${glAccount.name}` : '' }
  }))
const lineAccounts = computed(() => activeAccounts.value.filter((account) => account.id !== form.bankGlAccountId))
const payees = computed(() => payeesForVoucherType(type.value))
const editing = computed(() => Boolean(editingId.value))
const isReceipt = computed(() => type.value === 'customer-receipt')

function bankName(bankId: string) {
  const bank = bankOptions.value.find((item) => item.id === bankId)
  return bank ? `${bank.bankName} · ${bank.accountNumber}` : ''
}

function onBankAccountChange() {
  const bank = bankOptions.value.find((item) => item.id === form.bankAccountId)
  if (!bank) return
  form.bankAccountName = `${bank.bankName} · ${bank.accountNumber}`
  form.bankGlAccountId = bank.accountId
  form.bankGlAccountName = bank.glAccountName
  form.currencyCode = bank.currency
  form.multiCurrency = bank.currency !== 'GHS'
  form.exchangeRate = defaultRate(bank.currency)
}

function onCurrencyChange() {
  form.multiCurrency = form.currencyCode !== 'GHS'
  form.exchangeRate = defaultRate(form.currencyCode)
  if (!form.multiCurrency) {
    for (const line of lines.value) line.foreignAmount = ''
  }
}

function onMultiCurrencyChange() {
  if (!form.multiCurrency) {
    form.currencyCode = 'GHS'
    form.exchangeRate = defaultRate('GHS')
    for (const line of lines.value) line.foreignAmount = ''
  } else if (form.currencyCode === 'GHS') {
    form.currencyCode = 'USD'
    form.exchangeRate = defaultRate('USD')
  }
}

function addLine() {
  lines.value.push(makeLine())
}

function removeLine(index: number) {
  if (lines.value.length > 1) lines.value.splice(index, 1)
}

function addRetention() {
  retentions.value.push(makeRetention())
}

function removeRetention(index: number) {
  retentions.value.splice(index, 1)
}

function localAmountUnits(line: VoucherDraftLine): bigint | null {
  if (!form.multiCurrency) return parseLedgerAmount(line.localAmount)
  const foreignUnits = parseLedgerAmount(line.foreignAmount)
  const rateUnits = parseLedgerRate(form.exchangeRate)
  if (foreignUnits === null || rateUnits === null) return null
  return convertLedgerAmount(foreignUnits, rateUnits)
}

function localAmountText(line: VoucherDraftLine): string {
  const units = localAmountUnits(line)
  return units === null ? '' : formatLedgerAmount(units)
}

const grossUnits = computed(() => lines.value.reduce((sum, line) => sum + (localAmountUnits(line) ?? BigInt(0)), BigInt(0)))
const withholdingBaseUnits = computed(() => lines.value
  .filter((line) => line.isWithhold)
  .reduce((sum, line) => sum + (localAmountUnits(line) ?? BigInt(0)), BigInt(0)))
const grossAmount = computed(() => formatLedgerAmount(grossUnits.value))

function retentionAmountUnits(retention: VoucherDraftRetention): bigint | null {
  const valueUnits = parseLedgerAmount(retention.value)
  if (valueUnits === null) return null
  return retention.isPercentage ? percentageOfLedgerAmount(withholdingBaseUnits.value, valueUnits) : valueUnits
}

function retentionAmountText(retention: VoucherDraftRetention): string {
  const units = retentionAmountUnits(retention)
  return units === null ? '' : formatLedgerAmount(units)
}

const retentionTotalUnits = computed(() => retentions.value.reduce((sum, retention) => sum + (retentionAmountUnits(retention) ?? BigInt(0)), BigInt(0)))
const retentionTotal = computed(() => formatLedgerAmount(retentionTotalUnits.value))
const netAmount = computed(() => formatLedgerAmount(grossUnits.value >= retentionTotalUnits.value ? grossUnits.value - retentionTotalUnits.value : BigInt(0)))

const journalPreview = computed(() => {
  const rows: Array<{ account: string; description: string; debit: string; credit: string }> = []
  if (isReceipt.value) {
    rows.push({ account: form.bankGlAccountName, description: 'Receipt to bank / cash', debit: grossAmount.value, credit: '0.000000' })
    for (const line of lines.value) {
      const account = activeAccounts.value.find((item) => item.id === line.accountId)
      rows.push({ account: account ? `${account.accountNumber} — ${account.name}` : 'Select an offset account', description: line.description || line.referenceNumber || 'Receipt allocation', debit: '0.000000', credit: localAmountText(line) || '0.000000' })
    }
  } else {
    for (const line of lines.value) {
      const account = activeAccounts.value.find((item) => item.id === line.accountId)
      rows.push({ account: account ? `${account.accountNumber} — ${account.name}` : 'Select an expense / offset account', description: line.description || line.referenceNumber || 'Payment allocation', debit: localAmountText(line) || '0.000000', credit: '0.000000' })
    }
    rows.push({ account: form.bankGlAccountName, description: 'Net payment from bank / cash', debit: '0.000000', credit: netAmount.value })
    for (const retention of retentions.value) {
      const account = activeAccounts.value.find((item) => item.id === retention.accountId)
      rows.push({ account: account ? `${account.accountNumber} — ${account.name}` : 'Select a retention liability account', description: retention.description || 'Retention', debit: '0.000000', credit: retentionAmountText(retention) || '0.000000' })
    }
  }
  return rows
})

const debitPreviewUnits = computed(() => journalPreview.value.reduce((sum, line) => sum + (parseLedgerAmount(line.debit, true) ?? BigInt(0)), BigInt(0)))
const creditPreviewUnits = computed(() => journalPreview.value.reduce((sum, line) => sum + (parseLedgerAmount(line.credit, true) ?? BigInt(0)), BigInt(0)))
const journalBalanced = computed(() => debitPreviewUnits.value === creditPreviewUnits.value && grossUnits.value > BigInt(0))

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const validationErrors = computed(() => {
  const errors: string[] = []
  if (!form.payeeId) errors.push(`Choose a ${typeInfo.value.payeeLabel.toLowerCase()}.`)
  if (!isValidDate(form.entryDate)) errors.push('Enter a valid entry date.')
  if (!isValidDate(isReceipt.value ? form.receiptDate ?? '' : form.paymentDate ?? '')) errors.push(`Enter a valid ${isReceipt.value ? 'receipt' : 'payment'} date.`)
  if (!form.bankAccountId || !form.bankGlAccountId) errors.push('Choose an active bank or cash G/L account.')
  if (!form.mode) errors.push('Choose a payment or receipt method.')
  if (form.mode === 'Cheque' && !form.chequeNumber.trim()) errors.push('Enter the cheque number.')
  if (form.description.length > 300) errors.push('Voucher description must be 300 characters or fewer.')
  if (!ledgerCurrencyOptions.some((currency) => currency.code === form.currencyCode)) errors.push('Choose a supported currency.')
  const rate = parseLedgerRate(form.exchangeRate)
  if (rate === null || rate <= BigInt(0)) errors.push('Exchange rate must be a positive decimal with at most 10 decimal places.')
  if (form.currencyCode !== 'GHS' && !form.multiCurrency) errors.push('Enable multi-currency for foreign-currency vouchers.')
  if (form.currencyCode === 'GHS' && rate !== null && rate !== BigInt(10000000000)) errors.push('GHS vouchers use an exchange rate of 1.')
  if (lines.value.length === 0) errors.push('Add at least one voucher line.')
  lines.value.forEach((line, index) => {
    if (!line.accountId) errors.push(`Line ${index + 1}: choose a G/L account.`)
    const amount = localAmountUnits(line)
    if (amount === null || amount <= BigInt(0)) errors.push(`Line ${index + 1}: enter a positive ${form.multiCurrency ? 'foreign' : 'local'} amount.`)
    if (line.invoiceNumber.length > 80 || line.referenceNumber.length > 80 || line.description.length > 300) errors.push(`Line ${index + 1}: invoice, reference, or description is too long.`)
    if (line.organizationUnitId && !ledgerOrganizationalUnits.some((unit) => unit.id === line.organizationUnitId)) errors.push(`Line ${index + 1}: select a valid organizational unit.`)
  })
  if (!isReceipt) {
    retentions.value.forEach((retention, index) => {
      if (!retention.accountId) errors.push(`Retention ${index + 1}: choose a credit G/L account.`)
      if (!retention.description.trim()) errors.push(`Retention ${index + 1}: enter a description.`)
      const value = parseLedgerAmount(retention.value)
      if (value === null || value <= BigInt(0)) errors.push(`Retention ${index + 1}: enter a positive amount or percentage.`)
      if (retention.isPercentage && value !== null && value > BigInt(100000000)) errors.push(`Retention ${index + 1}: percentage cannot exceed 100%.`)
      if (retention.isPercentage && withholdingBaseUnits.value <= BigInt(0)) errors.push(`Retention ${index + 1}: mark at least one voucher line as withholdable.`)
      const calculated = retentionAmountUnits(retention)
      if (calculated === null || calculated <= BigInt(0)) errors.push(`Retention ${index + 1}: calculated amount must be greater than zero.`)
    })
    if (retentionTotalUnits.value > grossUnits.value) errors.push('Total retentions cannot exceed the voucher amount.')
  }
  if (grossUnits.value <= BigInt(0)) errors.push('Voucher total must be greater than zero.')
  if (!journalBalanced.value) errors.push('The proposed journal entry must balance before this voucher can be saved.')
  return [...new Set(errors)]
})
const canSave = computed(() => validationErrors.value.length === 0
  && !saving.value
  && !accountsPending.value
  && !voucherPending.value
  && !accountError.value
  && (!editing.value || existingVoucher.value?.status === 'Draft'))

function hydrate(voucher: LedgerVoucher) {
  if (voucher.type !== type.value) {
    saveError.value = 'This draft belongs to a different voucher workflow.'
    return
  }
  form.type = voucher.type
  form.payeeId = voucher.payeeId
  form.entryDate = voucher.entryDate
  form.paymentDate = voucher.paymentDate ?? voucher.entryDate
  form.receiptDate = voucher.receiptDate ?? voucher.entryDate
  form.bankAccountId = voucher.bankAccountId
  form.bankAccountName = voucher.bankAccountName
  form.bankGlAccountId = voucher.bankGlAccountId
  form.bankGlAccountName = voucher.bankGlAccountName
  form.mode = voucher.mode
  form.currencyCode = voucher.currencyCode
  form.exchangeRate = voucher.exchangeRate
  form.multiCurrency = voucher.multiCurrency
  form.chequeNumber = voucher.chequeNumber
  form.description = voucher.description
  lines.value = voucher.lines.map((line) => ({
    key: line.id,
    invoiceNumber: line.invoiceNumber,
    referenceNumber: line.referenceNumber,
    accountId: line.accountId,
    description: line.description,
    organizationUnitId: line.organizationUnitId,
    localAmount: line.localAmount,
    foreignAmount: line.foreignAmount === '0.000000' ? '' : line.foreignAmount,
    isWithhold: line.isWithhold,
  }))
  retentions.value = voucher.retentions.map((retention) => ({
    key: retention.id,
    accountId: retention.accountId,
    description: retention.description,
    value: retention.value,
    isPercentage: retention.isPercentage,
  }))
}

watch(existingVoucher, (voucher) => {
  if (voucher) hydrate(voucher)
}, { immediate: true })
watch(type, (newType) => {
  if (!editing.value) form.type = newType
})

function buildInput(): CreateLedgerVoucherInput {
  return {
    type: type.value,
    payeeId: form.payeeId,
    entryDate: form.entryDate,
    ...(isReceipt.value ? { receiptDate: form.receiptDate } : { paymentDate: form.paymentDate }),
    bankAccountId: form.bankAccountId,
    bankAccountName: bankName(form.bankAccountId) || form.bankAccountName,
    bankGlAccountId: form.bankGlAccountId,
    bankGlAccountName: form.bankGlAccountName,
    mode: form.mode,
    currencyCode: form.currencyCode,
    exchangeRate: form.exchangeRate,
    multiCurrency: form.multiCurrency,
    chequeNumber: form.chequeNumber.trim(),
    description: form.description.trim(),
    lines: lines.value.map((line) => ({
      invoiceNumber: line.invoiceNumber.trim(),
      referenceNumber: line.referenceNumber.trim(),
      accountId: line.accountId,
      description: line.description.trim(),
      organizationUnitId: line.organizationUnitId,
      localAmount: localAmountText(line) || '0',
      foreignAmount: form.multiCurrency ? line.foreignAmount || '0' : '0',
      isWithhold: line.isWithhold,
    })),
    retentions: isReceipt.value ? [] : retentions.value.map((retention) => ({
      accountId: retention.accountId,
      description: retention.description.trim(),
      value: retention.value,
      isPercentage: retention.isPercentage,
    })),
  }
}

async function saveDraft() {
  saveError.value = ''
  if (!canSave.value) return
  saving.value = true
  try {
    if (editing.value) await voucherApi.update(editingId.value, buildInput())
    else await voucherApi.create(buildInput())
    await navigateTo('/ledger/vouchers')
  } catch (e: unknown) {
    const fetchError = e as { statusMessage?: string; data?: { statusMessage?: string } }
    saveError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'The voucher draft could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1320px] space-y-6">
    <NuxtLink to="/ledger/vouchers" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"><ArrowLeft :size="15" /> Back to vouchers</NuxtLink>

    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Vouchers <span class="mx-1 text-slate-300">/</span> {{ editing ? 'Edit draft' : 'New' }}</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">{{ editing ? `Edit ${typeInfo.shortLabel.toLowerCase()}` : typeInfo.label }}</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ typeInfo.description }}</p>
      </div>
      <span class="inline-flex w-fit items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/25 dark:text-violet-300"><span class="h-1.5 w-1.5 rounded-full bg-violet-500" /> Draft</span>
    </section>

    <div v-if="accountError" class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"><span>Chart of accounts could not be loaded.</span><button type="button" class="font-semibold underline" @click="refreshAccounts()">Retry</button></div>
    <div v-if="voucherLoadError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">The requested voucher draft could not be loaded.</div>
    <div v-if="editing && existingVoucher && existingVoucher.status !== 'Draft'" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Only draft vouchers can be edited. This voucher is {{ existingVoucher.status.toLowerCase() }}.</div>

    <section class="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:p-6">
      <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Voucher header</h2><p class="mt-1 text-[11px] text-slate-500">Voucher and batch numbers are assigned when the draft is first saved.</p></div><span class="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ typeInfo.prefix }} · General Ledger</span></div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">{{ typeInfo.payeeLabel }} <span class="text-rose-500">*</span></span><select v-model="form.payeeId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select {{ typeInfo.payeeLabel.toLowerCase() }}</option><option v-for="payee in payees" :key="payee.id" :value="payee.id">{{ payee.name }} · {{ payee.code }}</option></select></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Entry date <span class="text-rose-500">*</span></span><input v-model="form.entryDate" type="date" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Bank / cash G/L <span class="text-rose-500">*</span></span><select v-model="form.bankAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="onBankAccountChange"><option value="" disabled>Select bank account</option><option v-for="bank in bankOptions" :key="bank.id" :value="bank.id">{{ bank.bankName }} · {{ bank.accountNumber }} ({{ bank.glAccountName }})</option></select></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Transaction currency <span class="text-rose-500">*</span></span><select v-model="form.currencyCode" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="onCurrencyChange"><option v-for="currency in ledgerCurrencyOptions" :key="currency.code" :value="currency.code">{{ currency.code }} · {{ currency.name }}</option></select></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">{{ isReceipt ? 'Receipt date' : 'Payment date' }} <span class="text-rose-500">*</span></span><input v-if="isReceipt" v-model="form.receiptDate" type="date" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /><input v-else v-model="form.paymentDate" type="date" required class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Mode of {{ isReceipt ? 'receipt' : 'payment' }} <span class="text-rose-500">*</span></span><select v-model="form.mode" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="Cash">Cash</option><option value="Cheque">Cheque</option><option value="Bank transfer">Bank transfer</option><option value="Mobile money">Mobile money</option></select></label>
        <label v-if="form.mode === 'Cheque'" class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cheque number <span class="text-rose-500">*</span></span><input v-model="form.chequeNumber" maxlength="80" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Enter cheque number" /></label>
        <label class="block lg:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Voucher description</span><input v-model="form.description" maxlength="300" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Purpose or summary of this transaction" /></label>
      </div>
      <div class="mt-4 flex flex-col gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800 dark:bg-slate-900/40">
        <label class="flex items-start gap-2.5"><input v-model="form.multiCurrency" type="checkbox" class="mt-0.5 rounded border-slate-300 text-brand-700 focus:ring-brand-500" @change="onMultiCurrencyChange" /><span><span class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Multi-currency voucher</span><span class="mt-1 block text-[10px] text-slate-500">Foreign amounts are converted to GHS using the entered rate.</span></span></label>
        <label class="block w-full sm:max-w-[260px]"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Exchange rate · {{ form.currencyCode }} to GHS</span><input v-model="form.exchangeRate" type="text" inputmode="decimal" :disabled="!form.multiCurrency" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums outline-none focus:border-brand-500 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800" placeholder="1.0000000000" /></label>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800"><div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Voucher lines</h2><p class="mt-1 text-[11px] text-slate-500">Each line posts {{ typeInfo.accountDirection === 'debit' ? 'a debit' : 'a credit' }} to the selected G/L account.</p></div><button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="addLine"><Plus :size="14" /> Add line</button></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[1380px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="w-12 px-5 py-3">#</th><th class="w-[135px] px-3 py-3">Invoice no.</th><th class="w-[135px] px-3 py-3">Reference no.</th><th class="min-w-[220px] px-3 py-3">{{ typeInfo.accountDirection === 'debit' ? 'Debit' : 'Credit' }} G/L</th><th class="min-w-[190px] px-3 py-3">Description</th><th class="w-[145px] px-3 py-3 text-right">Local · GHS</th><th class="w-[145px] px-3 py-3 text-right">Foreign · {{ form.currencyCode }}</th><th class="min-w-[185px] px-3 py-3">Organizational unit</th><th v-if="!isReceipt" class="w-[100px] px-3 py-3 text-center">Withhold?</th><th class="w-12 px-3 py-3" /></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(line, index) in lines" :key="line.key"><td class="px-5 py-3 text-xs font-medium text-slate-400">{{ String(index + 1).padStart(2, '0') }}</td><td class="px-3 py-2.5"><input v-model="line.invoiceNumber" maxlength="80" class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Invoice" /></td><td class="px-3 py-2.5"><input v-model="line.referenceNumber" maxlength="80" class="h-9 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Reference" /></td><td class="px-3 py-2.5"><select v-model="line.accountId" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in lineAccounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></td><td class="px-3 py-2.5"><input v-model="line.description" maxlength="300" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Line details" /></td><td class="px-3 py-2.5"><input v-if="!form.multiCurrency" v-model="line.localAmount" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" /><input v-else :value="localAmountText(line)" readonly class="h-9 w-full rounded-md border border-slate-100 bg-slate-50 px-2.5 text-right text-xs tabular-nums text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300" placeholder="Converted" /></td><td class="px-3 py-2.5"><input v-if="form.multiCurrency" v-model="line.foreignAmount" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" /><span v-else class="block text-right text-xs text-slate-300">—</span></td><td class="px-3 py-2.5"><select v-model="line.organizationUnitId" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="">No unit</option><option v-for="unit in ledgerOrganizationalUnits" :key="unit.id" :value="unit.id">{{ unit.path }}</option></select></td><td v-if="!isReceipt" class="px-3 py-2.5 text-center"><input v-model="line.isWithhold" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" :aria-label="`Withholding applies to line ${index + 1}`" /></td><td class="px-3 py-2.5"><button type="button" :disabled="lines.length <= 1" class="rounded-md p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/30" aria-label="Remove voucher line" @click="removeLine(index)"><Trash2 :size="14" /></button></td></tr><tr class="bg-slate-50/70 dark:bg-slate-900/50"><td colspan="5" class="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Voucher total</td><td class="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(grossAmount, 'GHS') }}</td><td class="px-3 py-3 text-right text-xs text-slate-500">{{ form.multiCurrency ? formatCurrency(lines.reduce((sum, line) => sum + (parseLedgerAmount(line.foreignAmount, true) ?? BigInt(0)), BigInt(0)).toString(), form.currencyCode) : '—' }}</td><td :colspan="isReceipt ? 2 : 3" /></tr></tbody></table></div>
    </section>

    <section v-if="!isReceipt" class="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800"><div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Retentions</h2><p class="mt-1 text-[11px] text-slate-500">Percentage retentions apply only to lines marked “Withhold?”; fixed deductions use the entered amount.</p></div><button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="addRetention"><Plus :size="14" /> Add retention</button></div>
      <div v-if="retentions.length" class="overflow-x-auto"><table class="w-full min-w-[800px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="min-w-[220px] px-5 py-3">Credit G/L</th><th class="min-w-[200px] px-3 py-3">Description</th><th class="w-[130px] px-3 py-3">Calculation</th><th class="w-[140px] px-3 py-3 text-right">Rate / amount</th><th class="w-[160px] px-3 py-3 text-right">Calculated · GHS</th><th class="w-12 px-3 py-3" /></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(retention, index) in retentions" :key="retention.key"><td class="px-5 py-2.5"><select v-model="retention.accountId" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select credit account</option><option v-for="account in activeAccounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></td><td class="px-3 py-2.5"><input v-model="retention.description" maxlength="160" class="h-9 w-full rounded-md border border-slate-200 px-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Withholding tax" /></td><td class="px-3 py-2.5"><select v-model="retention.isPercentage" class="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"><option :value="true">Percentage</option><option :value="false">Fixed amount</option></select></td><td class="px-3 py-2.5"><div class="relative"><input v-model="retention.value" inputmode="decimal" class="h-9 w-full rounded-md border border-slate-200 px-2.5 pr-8 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" /><span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{{ retention.isPercentage ? '%' : 'GHS' }}</span></div></td><td class="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{{ retentionAmountText(retention) ? formatCurrency(retentionAmountText(retention), 'GHS') : '—' }}</td><td class="px-3 py-2.5"><button type="button" class="rounded-md p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label="Remove retention" @click="removeRetention(index)"><Trash2 :size="14" /></button></td></tr></tbody></table></div>
      <div v-else class="px-5 py-6 text-center text-xs text-slate-400">No retentions added. The full voucher total will be paid.</div>
    </section>

    <section class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Total amount · GHS</p><p class="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(grossAmount, 'GHS') }}</p></div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Retentions · GHS</p><p class="mt-2 text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{{ formatCurrency(retentionTotal, 'GHS') }}</p></div>
      <div class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-[11px] font-medium text-slate-500">Net {{ isReceipt ? 'received' : 'paid' }} · GHS</p><p class="mt-2 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{{ formatCurrency(netAmount, 'GHS') }}</p></div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800"><div><h2 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Calculator :size="15" /> Proposed journal entry</h2><p class="mt-1 text-[11px] text-slate-500">A balanced draft posts {{ isReceipt ? 'debit to cash / bank and credits to the selected offset accounts.' : 'debits to the selected accounts and credits to cash / bank and retention accounts.' }}</p></div><span class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="journalBalanced ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'"><Check v-if="journalBalanced" :size="12" />{{ journalBalanced ? 'Balanced' : 'Needs valid amounts' }}</span></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[680px] text-left text-xs"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Account</th><th class="px-3 py-3">Description</th><th class="px-3 py-3 text-right">Debit · GHS</th><th class="px-3 py-3 text-right">Credit · GHS</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(line, index) in journalPreview" :key="`preview-${index}`"><td class="px-5 py-3 text-slate-700 dark:text-slate-300">{{ line.account }}</td><td class="px-3 py-3 text-slate-500">{{ line.description }}</td><td class="px-3 py-3 text-right tabular-nums">{{ line.debit === '0.000000' ? '—' : formatCurrency(line.debit, 'GHS') }}</td><td class="px-3 py-3 text-right tabular-nums">{{ line.credit === '0.000000' ? '—' : formatCurrency(line.credit, 'GHS') }}</td></tr></tbody><tfoot class="bg-slate-50/70 font-semibold dark:bg-slate-900/50"><tr><td colspan="2" class="px-5 py-3 text-right text-slate-500">Totals</td><td class="px-3 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(formatLedgerAmount(debitPreviewUnits), 'GHS') }}</td><td class="px-3 py-3 text-right tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(formatLedgerAmount(creditPreviewUnits), 'GHS') }}</td></tr></tfoot></table></div>
    </section>

    <div v-if="validationErrors.length" class="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20"><p class="text-xs font-semibold text-amber-900 dark:text-amber-200">Complete the required voucher details:</p><ul class="mt-2 list-inside list-disc space-y-1 text-[11px] text-amber-800 dark:text-amber-300"><li v-for="message in validationErrors" :key="message">{{ message }}</li></ul></div>
    <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
    <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row"><NuxtLink to="/ledger/vouchers" class="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</NuxtLink><button type="button" :disabled="!canSave" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-xs font-semibold text-white shadow-sm shadow-brand-900/10 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50" @click="saveDraft"><Save :size="14" />{{ saving ? 'Saving…' : editing ? 'Update draft' : 'Save draft' }}</button></div>
  </div>
</template>
