<script setup lang="ts">
import { AlertTriangle, ArrowRightLeft, Banknote, Check, ChevronDown, Clock3, Download, Eye, FilePenLine, Plus, Search, ShieldCheck, Trash2, Wallet, X } from '@lucide/vue'
import type { AccountsResponse } from '../../../features/ledger/types'
import { convertLedgerAmount, formatLedgerAmount, parseLedgerAmount, parseLedgerRate } from '../../../features/ledger/money'
import { useLedgerApi } from '../../../features/ledger/useLedgerApi'
import { ledgerCurrencyOptions, useLedgerSetup } from '../../../features/ledger/setup-data'
import { ledgerOrganizationalUnits } from '../../../features/ledger/organization-data'
import {
  useLedgerImprests,
  type ImprestSettlementStatus,
  type ImprestStatus,
  type LedgerImprest,
  type SaveImprestInput,
} from '../../../features/ledger/imprest-data'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Accountable imprests' })

const api = useLedgerApi()
const setup = useLedgerSetup()
const ledger = useLedgerImprests()
const { data: accountResponse, error: accountError, refresh: refreshAccounts } = await useAsyncData<AccountsResponse>(
  'ledger-imprest-accounts',
  () => api.accounts(),
  { default: () => ({ items: [], total: 0 }) },
)

const accounts = computed(() => (accountResponse.value?.items ?? []).filter((account) => account.status === 'Active'))
const employees = ledger.employees
const imprests = ledger.imprests
const retirements = ledger.retirements
const refunds = ledger.refunds
const writeOffs = ledger.writeOffs
const search = ref('')
const statusFilter = ref('')
const activeTab = ref<'disbursements' | 'retirements' | 'refunds' | 'writeoffs'>('disbursements')
const showImprestForm = ref(false)
const editingImprestId = ref('')
const imprestFormError = ref('')
const settlementType = ref<'retirement' | 'refund' | 'writeoff' | null>(null)
const settlementError = ref('')
const selectedSettlementImprestId = ref('')
const successMessage = ref('')
const confirmation = ref<{ action: 'post' | 'delete'; recordType: 'imprest' | 'retirement' | 'refund' | 'writeoff'; id: string; label: string } | null>(null)
const confirmationError = ref('')
const detailRecord = ref<{ type: 'imprest' | 'retirement' | 'refund' | 'writeoff'; id: string } | null>(null)

interface RetirementFormLine {
  key: number
  receiptDate: string
  receiptNumber: string
  description: string
  amount: string
  debitAccountId: string
  creditAccountId: string
  organizationUnitId: string
}

const imprestForm = reactive({
  id: '',
  imprestNumber: '',
  employeeId: '',
  categoryId: '',
  amount: '',
  disbursementDate: todayIso(),
  expectedRetirementDate: dateAfter(30),
  currencyCode: 'GHS',
  buyRate: '1',
  sellRate: '1',
  creditAccountId: '',
  paymentMethod: 'Bank transfer',
  chequeNumber: '',
  debitAccountId: '',
  referenceNumber: '',
  description: '',
  organizationUnitId: '',
})
const retirementForm = reactive({ retirementDate: todayIso(), retiredBy: 'Finance Desk', exchangeRate: '1' })
const retirementLines = ref<RetirementFormLine[]>([])
const refundForm = reactive({
  refundDate: todayIso(), amount: '', exchangeRate: '1', receiptDate: todayIso(), receiptNumber: '',
  refundReceivedBy: 'Finance Desk', debitAccountId: '', creditAccountId: '', notes: '',
})
const writeOffForm = reactive({
  writeOffDate: todayIso(), amount: '', exchangeRate: '1', authorizedBy: '', writtenOffBy: 'Finance Desk',
  debitAccountId: '', creditAccountId: '', notes: '',
})
let lineCounter = 0

const selectedSettlementImprest = computed(() => imprests.value.find((item) => item.id === selectedSettlementImprestId.value) || null)
const selectedImprestDetail = computed(() => detailRecord.value?.type === 'imprest' ? imprests.value.find((item) => item.id === detailRecord.value?.id) || null : null)
const selectedRetirementDetail = computed(() => detailRecord.value?.type === 'retirement' ? retirements.value.find((item) => item.id === detailRecord.value?.id) || null : null)
const selectedRefundDetail = computed(() => detailRecord.value?.type === 'refund' ? refunds.value.find((item) => item.id === detailRecord.value?.id) || null : null)
const selectedWriteOffDetail = computed(() => detailRecord.value?.type === 'writeoff' ? writeOffs.value.find((item) => item.id === detailRecord.value?.id) || null : null)
const activeGhsOutstanding = computed(() => {
  let total = BigInt(0)
  for (const item of imprests.value) {
    if (!item.postedToGl || !hasOutstanding(item.balance)) continue
    const balance = parseLedgerAmount(item.balance)
    const rate = parseLedgerRate(item.sellRate)
    if (balance !== null && rate !== null) total += convertLedgerAmount(balance, rate)
  }
  return formatLedgerAmount(total)
})
const openImprestCount = computed(() => imprests.value.filter((item) => item.postedToGl && hasOutstanding(item.balance)).length)
const overdueCount = computed(() => imprests.value.filter((item) => isOverdue(item)).length)
const draftCount = computed(() => imprests.value.filter((item) => item.status === 'draft').length
  + retirements.value.filter((item) => item.status === 'draft').length
  + refunds.value.filter((item) => item.status === 'draft').length
  + writeOffs.value.filter((item) => item.status === 'draft').length)
const retirementLineTotal = computed(() => {
  const total = retirementLines.value.reduce((sum, line) => sum + (parseLedgerAmount(line.amount, true) ?? BigInt(0)), BigInt(0))
  return formatLedgerAmount(total)
})
const retirementLineTotalUnits = computed(() => parseLedgerAmount(retirementLineTotal.value, true) ?? BigInt(0))
const outstandingStatusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Awaiting review' },
  { value: 'posted', label: 'Posted' },
  { value: 'converted', label: 'Converted to payroll-js loan' },
  { value: 'closed', label: 'Settled' },
]
const tabItems = computed(() => [
  { id: 'disbursements' as const, label: 'Disbursements', count: imprests.value.length },
  { id: 'retirements' as const, label: 'Retirements', count: retirements.value.length },
  { id: 'refunds' as const, label: 'Refunds', count: refunds.value.length },
  { id: 'writeoffs' as const, label: 'Write-offs', count: writeOffs.value.length },
])

const visibleImprests = computed(() => imprests.value.filter((item) => matchesSearch(search.value, [
  item.imprestNumber, item.employeeName, item.employeeIdentifier, item.imprestCategoryName, item.referenceNumber, item.description, item.organizationUnitName,
]) && matchesStatus(item.status, statusFilter.value)))
const visibleRetirements = computed(() => retirements.value.filter((item) => matchesSearch(search.value, [
  item.imprestNumber, item.employeeName, item.retiredBy, ...item.details.flatMap((line) => [line.receiptNumber, line.description]),
]) && matchesStatus(item.status, statusFilter.value)))
const visibleRefunds = computed(() => refunds.value.filter((item) => matchesSearch(search.value, [
  item.imprestNumber, item.employeeName, item.receiptNumber, item.refundReceivedBy, item.notes,
]) && matchesStatus(item.status, statusFilter.value)))
const visibleWriteOffs = computed(() => writeOffs.value.filter((item) => matchesSearch(search.value, [
  item.imprestNumber, item.employeeName, item.authorizedBy, item.writtenOffBy, item.notes,
]) && matchesStatus(item.status, statusFilter.value)))

watch(activeTab, () => { statusFilter.value = '' })

function todayIso() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function matchesSearch(term: string, values: Array<string | undefined>) {
  const query = term.trim().toLowerCase()
  return !query || values.some((value) => (value || '').toLowerCase().includes(query))
}

function matchesStatus(status: ImprestStatus | ImprestSettlementStatus, filter: string) {
  if (!filter) return true
  if (filter === 'closed') return ['retired', 'refunded', 'written_off', 'converted'].includes(status)
  return status === filter
}

function statusLabel(status: ImprestStatus | ImprestSettlementStatus) {
  const labels: Record<ImprestStatus | ImprestSettlementStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Awaiting review',
    approved: 'Approved',
    posted: 'Posted',
    retired: 'Retired',
    refunded: 'Refunded',
    written_off: 'Written off',
    converted: 'Converted to payroll-js loan',
    reversed: 'Reversed',
  }
  return labels[status]
}

function statusClass(status: ImprestStatus | ImprestSettlementStatus) {
  if (status === 'posted') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
  if (status === 'approved') return 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300'
  if (status === 'pending_approval') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'
  if (status === 'draft') return 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300'
  if (status === 'converted') return 'bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-300'
  if (status === 'reversed') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

function hasOutstanding(value: string) {
  const units = parseLedgerAmount(value)
  return units !== null && units > BigInt(0)
}

function isOverdue(imprest: LedgerImprest) {
  return imprest.postedToGl && hasOutstanding(imprest.balance) && imprest.expectedRetirementDate < todayIso()
}

function canConvertToPayrollLoan(imprest: LedgerImprest) {
  return imprest.postedToGl
    && hasOutstanding(imprest.balance)
    && !ledger.hasUnpostedSettlement(imprest.id)
    && hasOutstanding(ledger.availableBalanceForImprest(imprest.id))
}

function payrollConversionUnavailableReason(imprest: LedgerImprest) {
  if (!imprest.postedToGl) return 'Post this disbursement to the General Ledger before converting.'
  if (ledger.hasUnpostedSettlement(imprest.id)) return 'Complete or remove the pending imprest settlement before converting.'
  return 'This outstanding balance is already reserved by a payroll-js-loan draft.'
}

function accountName(accountId: string) {
  const account = accounts.value.find((item) => item.id === accountId)
  if (account) return `${account.accountNumber} — ${account.name}`
  const known: Record<string, string> = {
    'acc-1000': '1000 — Cash on Hand',
    'acc-1010': '1010 — Bank — Main Operating',
    'acc-1020': '1020 — Bank — USD Account',
    'acc-5000': '5000 — Operating Expenses',
  }
  return known[accountId] || accountId || '—'
}

function accountIdOrDefault(preferred: string | undefined, fallback: string) {
  if (preferred && accounts.value.some((account) => account.id === preferred)) return preferred
  if (accounts.value.some((account) => account.id === fallback)) return fallback
  return accounts.value[0]?.id || ''
}

function defaultImprestAccount() {
  return accountIdOrDefault(setup.defaultGlNumbers.value?.imprestGlAccountId, 'acc-1000')
}

function defaultExpenseAccount() {
  return accountIdOrDefault(setup.defaultGlNumbers.value?.creditPurchasesAccountId, 'acc-5000')
}

function defaultBankGlAccount() {
  const bankId = setup.defaultGlNumbers.value?.accountPayablesBankAccountId
  const bank = setup.bankAccounts.value.find((item) => item.id === bankId && item.isActive)
  return accountIdOrDefault(bank?.accountId, 'acc-1010')
}

function organizationUnitName(id: string) {
  return ledgerOrganizationalUnits.find((unit) => unit.id === id)?.name || '—'
}

function employeeFor(id: string) {
  return employees.find((employee) => employee.id === id)
}

function currencyName(code: string) {
  return ledgerCurrencyOptions.find((currency) => currency.code === code)?.name || code
}

function notify(message: string) {
  successMessage.value = message
  if (import.meta.client) window.setTimeout(() => {
    if (successMessage.value === message) successMessage.value = ''
  }, 5500)
}

function resetImprestForm() {
  editingImprestId.value = ''
  imprestFormError.value = ''
  Object.assign(imprestForm, {
    id: '',
    imprestNumber: ledger.nextImprestNumber(),
    employeeId: '',
    categoryId: setup.defaultGlNumbers.value?.imprestCategoryId || setup.imprestCategories.value[0]?.id || '',
    amount: '',
    disbursementDate: todayIso(),
    expectedRetirementDate: dateAfter(30),
    currencyCode: 'GHS',
    buyRate: '1',
    sellRate: '1',
    creditAccountId: defaultBankGlAccount(),
    paymentMethod: 'Bank transfer',
    chequeNumber: '',
    debitAccountId: defaultImprestAccount(),
    referenceNumber: '',
    description: '',
    organizationUnitId: '',
  })
}

function openCreateImprest() {
  resetImprestForm()
  showImprestForm.value = true
}

function openEditImprest(imprest: LedgerImprest) {
  if (imprest.status !== 'draft' || ledger.hasSettlements(imprest.id)) return
  editingImprestId.value = imprest.id
  imprestFormError.value = ''
  Object.assign(imprestForm, {
    id: imprest.id,
    imprestNumber: imprest.imprestNumber,
    employeeId: imprest.employeeId,
    categoryId: imprest.imprestCategoryId,
    amount: String(imprest.amount),
    disbursementDate: imprest.disbursementDate,
    expectedRetirementDate: imprest.expectedRetirementDate,
    currencyCode: imprest.currencyCode,
    buyRate: String(imprest.buyRate),
    sellRate: String(imprest.sellRate),
    creditAccountId: imprest.creditAccountId,
    paymentMethod: imprest.paymentMethod,
    chequeNumber: imprest.chequeNumber,
    debitAccountId: imprest.debitAccountId,
    referenceNumber: imprest.referenceNumber,
    description: imprest.description,
    organizationUnitId: imprest.organizationUnitId,
  })
  showImprestForm.value = true
}

function onEmployeeChange() {
  const employee = employeeFor(imprestForm.employeeId)
  if (employee) imprestForm.organizationUnitId = employee.organizationUnitId
}

function onCurrencyChange() {
  if (imprestForm.currencyCode === 'GHS') {
    imprestForm.buyRate = '1'
    imprestForm.sellRate = '1'
  } else if (imprestForm.buyRate === '1' && imprestForm.sellRate === '1') {
    imprestForm.buyRate = '12.5000000000'
    imprestForm.sellRate = '12.5000000000'
  }
  const currencyBank = setup.bankAccounts.value.find((account) => account.isActive && account.currency === imprestForm.currencyCode)
  if (currencyBank) imprestForm.creditAccountId = accountIdOrDefault(currencyBank.accountId, imprestForm.creditAccountId)
}

function saveImprest() {
  imprestFormError.value = ''
  const employee = employeeFor(imprestForm.employeeId)
  const category = setup.imprestCategories.value.find((item) => item.id === imprestForm.categoryId)
  const debitAccount = accounts.value.find((item) => item.id === imprestForm.debitAccountId)
  const creditAccount = accounts.value.find((item) => item.id === imprestForm.creditAccountId)
  const amount = imprestForm.amount.trim()
  const amountUnits = parseLedgerAmount(amount)
  const buyRateUnits = parseLedgerRate(imprestForm.buyRate)
  const sellRateUnits = parseLedgerRate(imprestForm.sellRate)
  if (!employee || !category) {
    imprestFormError.value = 'Select an employee and an imprest category.'
    return
  }
  if (amountUnits === null || amountUnits <= BigInt(0)) {
    imprestFormError.value = 'Enter a valid amount greater than zero (up to six decimal places).'
    return
  }
  if (!imprestForm.disbursementDate || !imprestForm.expectedRetirementDate || imprestForm.expectedRetirementDate < imprestForm.disbursementDate) {
    imprestFormError.value = 'The expected retirement date must be on or after the disbursement date.'
    return
  }
  if (!debitAccount || !creditAccount) {
    imprestFormError.value = 'Choose valid debit and credit General Ledger accounts.'
    return
  }
  if (buyRateUnits === null || buyRateUnits <= BigInt(0) || sellRateUnits === null || sellRateUnits <= BigInt(0)) {
    imprestFormError.value = 'Enter positive buy and sell rates with up to ten decimal places.'
    return
  }
  if (!imprestForm.referenceNumber.trim()) {
    imprestFormError.value = 'Enter a payment or transfer reference.'
    return
  }
  if (imprestForm.paymentMethod === 'Cheque' && !imprestForm.chequeNumber.trim()) {
    imprestFormError.value = 'Enter the cheque number for cheque payments.'
    return
  }
  const input: SaveImprestInput = {
    id: editingImprestId.value || undefined,
    imprestNumber: imprestForm.imprestNumber,
    employeeId: employee.id,
    employeeIdentifier: employee.employeeIdentifier,
    employeeName: employee.employeeName,
    imprestCategoryId: category.id,
    imprestCategoryName: category.name,
    amount,
    disbursementDate: imprestForm.disbursementDate,
    expectedRetirementDate: imprestForm.expectedRetirementDate,
    creditAccountId: creditAccount.id,
    creditAccountName: creditAccount.name,
    paymentMethod: imprestForm.paymentMethod,
    chequeNumber: imprestForm.chequeNumber.trim(),
    debitAccountId: debitAccount.id,
    debitAccountName: debitAccount.name,
    referenceNumber: imprestForm.referenceNumber.trim(),
    description: imprestForm.description.trim(),
    organizationUnitId: imprestForm.organizationUnitId || employee.organizationUnitId,
    organizationUnitName: organizationUnitName(imprestForm.organizationUnitId || employee.organizationUnitId),
    currencyCode: imprestForm.currencyCode,
    currencyName: currencyName(imprestForm.currencyCode),
    buyRate: imprestForm.buyRate,
    sellRate: imprestForm.sellRate,
  }
  if (!ledger.saveImprest(input)) {
    imprestFormError.value = 'This imprest can no longer be changed. Refresh the register and try again.'
    return
  }
  showImprestForm.value = false
  notify(editingImprestId.value ? 'Imprest draft updated.' : 'Imprest draft created.')
}

function addRetirementLine() {
  lineCounter += 1
  retirementLines.value.push({
    key: lineCounter,
    receiptDate: todayIso(),
    receiptNumber: '',
    description: '',
    amount: '',
    debitAccountId: defaultExpenseAccount(),
    creditAccountId: defaultImprestAccount(),
    organizationUnitId: selectedSettlementImprest.value?.organizationUnitId || '',
  })
}

function openSettlement(kind: 'retirement' | 'refund' | 'writeoff', imprest: LedgerImprest) {
  if (!imprest.postedToGl || !hasOutstanding(imprest.balance)) return
  settlementType.value = kind
  selectedSettlementImprestId.value = imprest.id
  settlementError.value = ''
  const rate = imprest.sellRate || '1.0000000000'
  if (kind === 'retirement') {
    Object.assign(retirementForm, { retirementDate: todayIso(), retiredBy: imprest.employeeName, exchangeRate: rate })
    retirementLines.value = []
    addRetirementLine()
  } else if (kind === 'refund') {
    Object.assign(refundForm, {
      refundDate: todayIso(), amount: '', exchangeRate: rate, receiptDate: todayIso(), receiptNumber: '',
      refundReceivedBy: 'Finance Desk', debitAccountId: accountIdOrDefault(imprest.creditAccountId, defaultBankGlAccount()),
      creditAccountId: defaultImprestAccount(), notes: '',
    })
  } else {
    Object.assign(writeOffForm, {
      writeOffDate: todayIso(), amount: '', exchangeRate: rate, authorizedBy: '', writtenOffBy: 'Finance Desk',
      debitAccountId: defaultExpenseAccount(), creditAccountId: defaultImprestAccount(), notes: '',
    })
  }
}

function closeSettlement() {
  settlementType.value = null
  selectedSettlementImprestId.value = ''
  settlementError.value = ''
  retirementLines.value = []
}

function saveSettlement() {
  settlementError.value = ''
  const imprest = selectedSettlementImprest.value
  if (!imprest || !settlementType.value) return
  if (settlementType.value === 'retirement') {
    const exchangeRateUnits = parseLedgerRate(retirementForm.exchangeRate)
    if (!retirementForm.retirementDate || !retirementForm.retiredBy.trim() || exchangeRateUnits === null || exchangeRateUnits <= BigInt(0)) {
      settlementError.value = 'Complete the retirement date, employee and a positive exchange rate.'
      return
    }
    if (!retirementLines.value.length || retirementLines.value.some((line) => {
      const amountUnits = parseLedgerAmount(line.amount)
      return !line.receiptDate || !line.receiptNumber.trim() || !line.description.trim() || amountUnits === null || amountUnits <= BigInt(0) || !line.debitAccountId || !line.creditAccountId || !line.organizationUnitId
    })) {
      settlementError.value = 'Each receipt line needs a date, receipt number, description, positive amount, accounts and organizational unit.'
      return
    }
    if (retirementLineTotalUnits.value > (parseLedgerAmount(imprest.balance) ?? BigInt(0))) {
      settlementError.value = 'Retirement details cannot exceed the outstanding imprest balance.'
      return
    }
    const saved = ledger.saveRetirement({
      imprestId: imprest.id,
      employeeId: imprest.employeeId,
      retirementDate: retirementForm.retirementDate,
      currencyCode: imprest.currencyCode,
      exchangeRate: retirementForm.exchangeRate,
      retiredBy: retirementForm.retiredBy.trim(),
      details: retirementLines.value.map((line) => ({
        receiptDate: line.receiptDate,
        receiptNumber: line.receiptNumber.trim(),
        description: line.description.trim(),
        amount: line.amount,
        debitAccountId: line.debitAccountId,
        creditAccountId: line.creditAccountId,
        organizationUnitId: line.organizationUnitId,
      })),
    })
    if (!saved) {
      settlementError.value = 'The retirement could not be saved. Check the balance and try again.'
      return
    }
    closeSettlement()
    notify('Retirement draft recorded. Post it to apply the GL workflow.')
    return
  }
  if (settlementType.value === 'refund') {
    const amount = refundForm.amount.trim()
    const amountUnits = parseLedgerAmount(amount)
    const exchangeRateUnits = parseLedgerRate(refundForm.exchangeRate)
    if (!refundForm.refundDate || !refundForm.receiptDate || !refundForm.receiptNumber.trim() || !refundForm.refundReceivedBy.trim() || !refundForm.debitAccountId || !refundForm.creditAccountId) {
      settlementError.value = 'Complete the refund date, receipt details, recipient and posting accounts.'
      return
    }
    if (amountUnits === null || amountUnits <= BigInt(0) || amountUnits > (parseLedgerAmount(imprest.balance) ?? BigInt(0))) {
      settlementError.value = 'Enter a refund amount greater than zero and no higher than the outstanding balance.'
      return
    }
    if (exchangeRateUnits === null || exchangeRateUnits <= BigInt(0)) {
      settlementError.value = 'Enter a positive exchange rate with up to ten decimal places.'
      return
    }
    const saved = ledger.saveRefund({
      imprestId: imprest.id,
      employeeId: imprest.employeeId,
      refundDate: refundForm.refundDate,
      amount,
      currencyCode: imprest.currencyCode,
      exchangeRate: refundForm.exchangeRate,
      refundType: 'employee_refund_company',
      receiptDate: refundForm.receiptDate,
      receiptNumber: refundForm.receiptNumber.trim(),
      refundReceivedBy: refundForm.refundReceivedBy.trim(),
      debitAccountId: refundForm.debitAccountId,
      creditAccountId: refundForm.creditAccountId,
      notes: refundForm.notes.trim(),
    })
    if (!saved) {
      settlementError.value = 'The refund could not be saved. Check the balance and try again.'
      return
    }
    closeSettlement()
    notify('Refund draft recorded. Post it to apply the GL workflow.')
    return
  }

  const amount = writeOffForm.amount.trim()
  const amountUnits = parseLedgerAmount(amount)
  const exchangeRateUnits = parseLedgerRate(writeOffForm.exchangeRate)
  if (!writeOffForm.writeOffDate || !writeOffForm.authorizedBy.trim() || !writeOffForm.writtenOffBy.trim() || !writeOffForm.debitAccountId || !writeOffForm.creditAccountId) {
    settlementError.value = 'Complete the write-off date, authorization, preparer and posting accounts.'
    return
  }
  if (amountUnits === null || amountUnits <= BigInt(0) || amountUnits > (parseLedgerAmount(imprest.balance) ?? BigInt(0))) {
    settlementError.value = 'Enter a write-off amount greater than zero and no higher than the outstanding balance.'
    return
  }
  if (exchangeRateUnits === null || exchangeRateUnits <= BigInt(0)) {
    settlementError.value = 'Enter a positive exchange rate with up to ten decimal places.'
    return
  }
  const saved = ledger.saveWriteOff({
    imprestId: imprest.id,
    employeeId: imprest.employeeId,
    writeOffDate: writeOffForm.writeOffDate,
    amount,
    currencyCode: imprest.currencyCode,
    exchangeRate: writeOffForm.exchangeRate,
    authorizedBy: writeOffForm.authorizedBy.trim(),
    writtenOffBy: writeOffForm.writtenOffBy.trim(),
    debitAccountId: writeOffForm.debitAccountId,
    creditAccountId: writeOffForm.creditAccountId,
    notes: writeOffForm.notes.trim(),
  })
  if (!saved) {
    settlementError.value = 'The write-off could not be saved. Check the balance and try again.'
    return
  }
  closeSettlement()
  notify('Write-off draft recorded. Post it to apply the GL workflow.')
}

function requestAction(action: 'post' | 'delete', recordType: 'imprest' | 'retirement' | 'refund' | 'writeoff', id: string, label: string) {
  confirmationError.value = ''
  confirmation.value = { action, recordType, id, label }
}

function executeAction() {
  const target = confirmation.value
  if (!target) return
  confirmationError.value = ''
  let success = false
  if (target.recordType === 'imprest') success = target.action === 'post' ? ledger.postImprest(target.id) : ledger.removeImprest(target.id)
  else if (target.recordType === 'retirement') success = target.action === 'post' ? ledger.postRetirement(target.id) : ledger.removeRetirement(target.id)
  else if (target.recordType === 'refund') success = target.action === 'post' ? ledger.postRefund(target.id) : ledger.removeRefund(target.id)
  else success = target.action === 'post' ? ledger.postWriteOff(target.id) : ledger.removeWriteOff(target.id)
  if (!success) {
    confirmationError.value = 'This record can no longer be changed. Refresh the register and try again.'
    return
  }
  confirmation.value = null
  notify(target.action === 'post' ? `${target.label} marked as posted in demo data.` : `${target.label} deleted.`)
}

function openDetail(type: 'imprest' | 'retirement' | 'refund' | 'writeoff', id: string) {
  detailRecord.value = { type, id }
}

function exportCurrentTab() {
  const rows: string[][] = []
  let filename = 'imprests'
  if (activeTab.value === 'disbursements') {
    filename = 'imprest-disbursements'
    rows.push(['Imprest no', 'Employee', 'Employee ID', 'Category', 'Disbursement date', 'Expected retirement', 'Amount', 'Balance', 'Currency', 'Status', 'Reference'])
    for (const item of visibleImprests.value) rows.push([item.imprestNumber, item.employeeName, item.employeeIdentifier, item.imprestCategoryName, item.disbursementDate, item.expectedRetirementDate, String(item.amount), String(item.balance), item.currencyCode, statusLabel(item.status), item.referenceNumber])
  } else if (activeTab.value === 'retirements') {
    filename = 'imprest-retirements'
    rows.push(['Imprest no', 'Employee', 'Retirement date', 'Receipt lines', 'Amount retired', 'Currency', 'Status'])
    for (const item of visibleRetirements.value) rows.push([item.imprestNumber, item.employeeName, item.retirementDate, String(item.details.length), String(item.amountRetired), item.currencyCode, statusLabel(item.status)])
  } else if (activeTab.value === 'refunds') {
    filename = 'imprest-refunds'
    rows.push(['Imprest no', 'Employee', 'Refund date', 'Receipt no', 'Amount', 'Currency', 'Status'])
    for (const item of visibleRefunds.value) rows.push([item.imprestNumber, item.employeeName, item.refundDate, item.receiptNumber, String(item.amount), item.currencyCode, statusLabel(item.status)])
  } else {
    filename = 'imprest-write-offs'
    rows.push(['Imprest no', 'Employee', 'Write-off date', 'Authorized by', 'Amount', 'Currency', 'Status'])
    for (const item of visibleWriteOffs.value) rows.push([item.imprestNumber, item.employeeName, item.writeOffDate, item.authorizedBy, String(item.amount), item.currencyCode, statusLabel(item.status)])
  }
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Accountable Imprest</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Accountable imprests</h1>
        <p class="mt-1.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Disburse staff advances, itemize receipts, record refunds and authorized write-offs, and track each outstanding balance.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/ledger/imprest-categories" class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">Manage categories</NuxtLink>
        <NuxtLink to="/ledger/imprests/payroll-loans" class="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3.5 text-xs font-semibold text-brand-800 shadow-sm hover:bg-brand-100 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200 dark:hover:bg-brand-950/60">Convert to payroll loan</NuxtLink>
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openCreateImprest"><Plus :size="15" /> New imprest</button>
      </div>
    </section>

    <div v-if="successMessage" class="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><span>{{ successMessage }}</span><button type="button" class="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss message" @click="successMessage = ''"><X :size="14" /></button></div>

    <div class="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-xs text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-200">
      <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold dark:bg-brand-900/60">i</span>
      <p><span class="font-semibold">Workflow preview:</span> register data is held in local demo state. Posting changes the preview status only; it does not create a live General Ledger journal.</p>
    </div>

    <div v-if="accountError" class="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><span>Ledger accounts could not be loaded. Refresh them before preparing or posting a transaction.</span><button type="button" class="font-semibold underline" @click="refreshAccounts()">Retry</button></div>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300"><Wallet :size="18" /></span><span class="min-w-0"><span class="block text-[11px] text-slate-500 dark:text-slate-400">Outstanding · GHS equivalent</span><span class="mt-1 block truncate text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatCurrency(activeGhsOutstanding, 'GHS') }}</span></span></article>
      <article class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300"><Banknote :size="18" /></span><span><span class="block text-[11px] text-slate-500 dark:text-slate-400">Open imprests</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ openImprestCount }}</span></span></article>
      <article class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/25 dark:text-rose-300"><AlertTriangle :size="18" /></span><span><span class="block text-[11px] text-slate-500 dark:text-slate-400">Overdue retirement</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ overdueCount }}</span></span></article>
      <article class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300"><Clock3 :size="18" /></span><span><span class="block text-[11px] text-slate-500 dark:text-slate-400">Draft transactions</span><span class="mt-1 block text-xl font-semibold text-slate-900 dark:text-white">{{ draftCount }}</span></span></article>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="relative w-full sm:max-w-[350px]"><Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="search" type="search" :placeholder="activeTab === 'disbursements' ? 'Search imprest, employee, reference…' : 'Search imprest, employee, receipt…'" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900/30" /></div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="relative"><select v-model="statusFilter" class="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option v-for="option in outstandingStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>
          <button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" @click="exportCurrentTab"><Download :size="14" /> Export</button>
        </div>
      </div>

      <div class="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-1 dark:border-slate-800 sm:px-5">
        <button v-for="tab in tabItems" :key="tab.id" type="button" class="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition" :class="activeTab === tab.id ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'" @click="activeTab = tab.id"><span>{{ tab.label }}</span><span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-300">{{ tab.count }}</span></button>
      </div>

      <div v-if="activeTab === 'disbursements'" class="overflow-x-auto">
        <table class="w-full min-w-[1260px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Imprest / reference</th><th class="px-4 py-3">Employee</th><th class="px-4 py-3">Category / unit</th><th class="px-4 py-3">Disbursed</th><th class="px-4 py-3">Expected retirement</th><th class="px-4 py-3 text-right">Amount / balance</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="item in visibleImprests" :key="item.id" class="transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
              <td class="px-5 py-3.5"><button type="button" class="font-mono text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300" @click="openDetail('imprest', item.id)">{{ item.imprestNumber }}</button><span class="mt-1 block text-[10px] text-slate-400">{{ item.referenceNumber || 'No reference' }} · {{ item.currencyCode }}</span></td>
              <td class="px-4 py-3.5"><span class="block text-xs font-semibold text-slate-800 dark:text-slate-200">{{ item.employeeName }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ item.employeeIdentifier }}</span></td>
              <td class="px-4 py-3.5"><span class="block text-xs text-slate-700 dark:text-slate-300">{{ item.imprestCategoryName }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ item.organizationUnitName }}</span></td>
              <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{{ formatDate(item.disbursementDate) }}</td>
              <td class="px-4 py-3.5"><span class="text-xs" :class="isOverdue(item) ? 'font-semibold text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'">{{ formatDate(item.expectedRetirementDate) }}</span><span v-if="isOverdue(item)" class="mt-1 block text-[10px] font-semibold text-rose-500">Overdue</span></td>
              <td class="px-4 py-3.5 text-right"><span class="block text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(item.amount, item.currencyCode) }}</span><span class="mt-1 block text-[10px] tabular-nums" :class="hasOutstanding(item.balance) ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'">Balance {{ formatCurrency(item.balance, item.currencyCode) }}</span></td>
              <td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td>
              <td class="px-4 py-3.5"><div class="flex flex-wrap justify-end gap-1.5">
                <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`View ${item.imprestNumber}`" title="View details" @click="openDetail('imprest', item.id)"><Eye :size="14" /></button>
                <template v-if="item.status === 'draft'">
                  <button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300" :aria-label="`Edit ${item.imprestNumber}`" title="Edit draft" @click="openEditImprest(item)"><FilePenLine :size="14" /></button>
                  <button type="button" class="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" :aria-label="`Post ${item.imprestNumber}`" title="Post disbursement to GL" @click="requestAction('post', 'imprest', item.id, item.imprestNumber)"><Check :size="14" /></button>
                  <button type="button" class="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete ${item.imprestNumber}`" title="Delete draft" @click="requestAction('delete', 'imprest', item.id, item.imprestNumber)"><Trash2 :size="14" /></button>
                  <button v-if="hasOutstanding(item.balance)" type="button" disabled class="inline-flex cursor-not-allowed items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-slate-400 opacity-60" :aria-label="`Post ${item.imprestNumber} before converting to payroll loan`" title="Post this disbursement to the General Ledger before converting"><ArrowRightLeft :size="12" />Convert to Payroll Loan</button>
                </template>
                <template v-else-if="item.postedToGl && hasOutstanding(item.balance)">
                  <button type="button" class="rounded-md px-2 py-1.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30" @click="openSettlement('retirement', item)">Retire</button>
                  <button type="button" class="rounded-md px-2 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30" @click="openSettlement('refund', item)">Refund</button>
                  <button type="button" class="rounded-md px-2 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30" @click="openSettlement('writeoff', item)">Write off</button>
                  <NuxtLink v-if="canConvertToPayrollLoan(item)" :to="{ path: '/ledger/imprests/payroll-js-loans', query: { imprestId: item.id } }" class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30" :aria-label="`Convert ${item.imprestNumber} to payroll loan`" title="Convert this outstanding balance to a payroll loan"><ArrowRightLeft :size="12" />Convert to Payroll Loan</NuxtLink>
                  <button v-else type="button" disabled class="inline-flex cursor-not-allowed items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-slate-400 opacity-60" :aria-label="`${item.imprestNumber} is not available for payroll-loan conversion`" :title="payrollConversionUnavailableReason(item)"><ArrowRightLeft :size="12" />Convert to Payroll Loan</button>
                </template>
                <button v-else-if="hasOutstanding(item.balance)" type="button" disabled class="inline-flex cursor-not-allowed items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-slate-400 opacity-60" :aria-label="`${item.imprestNumber} is not available for payroll-loan conversion`" :title="payrollConversionUnavailableReason(item)"><ArrowRightLeft :size="12" />Convert to Payroll Loan</button>
              </div></td>
            </tr>
            <tr v-if="!visibleImprests.length"><td colspan="8" class="px-5 py-12 text-center"><p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No imprests match</p><p class="mt-1 text-xs text-slate-400">Adjust the filters or create a new imprest draft.</p></td></tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="activeTab === 'retirements'" class="overflow-x-auto">
        <table class="w-full min-w-[1000px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Imprest / employee</th><th class="px-4 py-3">Retirement date</th><th class="px-4 py-3">Receipt details</th><th class="px-4 py-3 text-right">Amount retired</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="item in visibleRetirements" :key="item.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-900/40"><td class="px-5 py-3.5"><button type="button" class="font-mono text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300" @click="openDetail('retirement', item.id)">{{ item.imprestNumber }}</button><span class="mt-1 block text-xs text-slate-500">{{ item.employeeName }}</span></td><td class="px-4 py-3.5 text-xs text-slate-500">{{ formatDate(item.retirementDate) }}</td><td class="px-4 py-3.5"><span class="text-xs text-slate-700 dark:text-slate-300">{{ item.details.length }} receipt {{ item.details.length === 1 ? 'line' : 'lines' }}</span><span class="mt-1 block text-[10px] text-slate-400">{{ item.details.slice(0, 2).map((line) => line.receiptNumber).join(', ') }}</span></td><td class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(item.amountRetired, item.currencyCode) }}</td><td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td><td class="px-4 py-3.5"><div class="flex justify-end gap-1"><button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`View retirement ${item.imprestNumber}`" title="View receipt details" @click="openDetail('retirement', item.id)"><Eye :size="14" /></button><button v-if="item.status === 'draft'" type="button" class="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" :aria-label="`Post retirement for ${item.imprestNumber}`" title="Post retirement to GL" @click="requestAction('post', 'retirement', item.id, `Retirement ${item.imprestNumber}`)"><Check :size="14" /></button><button v-if="item.status === 'draft'" type="button" class="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete retirement for ${item.imprestNumber}`" title="Delete retirement draft" @click="requestAction('delete', 'retirement', item.id, `Retirement ${item.imprestNumber}`)"><Trash2 :size="14" /></button></div></td></tr><tr v-if="!visibleRetirements.length"><td colspan="6" class="px-5 py-12 text-center text-xs text-slate-400">No retirements match the current filters.</td></tr></tbody>
        </table>
      </div>

      <div v-else-if="activeTab === 'refunds'" class="overflow-x-auto">
        <table class="w-full min-w-[1000px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Imprest / employee</th><th class="px-4 py-3">Refund date</th><th class="px-4 py-3">Receipt / received by</th><th class="px-4 py-3 text-right">Amount</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="item in visibleRefunds" :key="item.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-900/40"><td class="px-5 py-3.5"><button type="button" class="font-mono text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300" @click="openDetail('refund', item.id)">{{ item.imprestNumber }}</button><span class="mt-1 block text-xs text-slate-500">{{ item.employeeName }}</span></td><td class="px-4 py-3.5 text-xs text-slate-500">{{ formatDate(item.refundDate) }}</td><td class="px-4 py-3.5"><span class="text-xs text-slate-700 dark:text-slate-300">{{ item.receiptNumber }}</span><span class="mt-1 block text-[10px] text-slate-400">Received by {{ item.refundReceivedBy }}</span></td><td class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(item.amount, item.currencyCode) }}</td><td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td><td class="px-4 py-3.5"><div class="flex justify-end gap-1"><button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`View refund ${item.imprestNumber}`" title="View refund details" @click="openDetail('refund', item.id)"><Eye :size="14" /></button><button v-if="item.status === 'draft'" type="button" class="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" :aria-label="`Post refund for ${item.imprestNumber}`" title="Post refund to GL" @click="requestAction('post', 'refund', item.id, `Refund ${item.imprestNumber}`)"><Check :size="14" /></button><button v-if="item.status === 'draft'" type="button" class="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete refund for ${item.imprestNumber}`" title="Delete refund draft" @click="requestAction('delete', 'refund', item.id, `Refund ${item.imprestNumber}`)"><Trash2 :size="14" /></button></div></td></tr><tr v-if="!visibleRefunds.length"><td colspan="6" class="px-5 py-12 text-center text-xs text-slate-400">No refunds match the current filters.</td></tr></tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1000px] text-left"><thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Imprest / employee</th><th class="px-4 py-3">Write-off date</th><th class="px-4 py-3">Authorization</th><th class="px-4 py-3 text-right">Amount</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="item in visibleWriteOffs" :key="item.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-900/40"><td class="px-5 py-3.5"><button type="button" class="font-mono text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300" @click="openDetail('writeoff', item.id)">{{ item.imprestNumber }}</button><span class="mt-1 block text-xs text-slate-500">{{ item.employeeName }}</span></td><td class="px-4 py-3.5 text-xs text-slate-500">{{ formatDate(item.writeOffDate) }}</td><td class="px-4 py-3.5"><span class="text-xs text-slate-700 dark:text-slate-300">{{ item.authorizedBy }}</span><span class="mt-1 block text-[10px] text-slate-400">Prepared by {{ item.writtenOffBy }}</span></td><td class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(item.amount, item.currencyCode) }}</td><td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td><td class="px-4 py-3.5"><div class="flex justify-end gap-1"><button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`View write-off ${item.imprestNumber}`" title="View write-off details" @click="openDetail('writeoff', item.id)"><Eye :size="14" /></button><button v-if="item.status === 'draft'" type="button" class="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" :aria-label="`Post write-off for ${item.imprestNumber}`" title="Post write-off to GL" @click="requestAction('post', 'writeoff', item.id, `Write-off ${item.imprestNumber}`)"><Check :size="14" /></button><button v-if="item.status === 'draft'" type="button" class="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete write-off for ${item.imprestNumber}`" title="Delete write-off draft" @click="requestAction('delete', 'writeoff', item.id, `Write-off ${item.imprestNumber}`)"><Trash2 :size="14" /></button></div></td></tr><tr v-if="!visibleWriteOffs.length"><td colspan="6" class="px-5 py-12 text-center text-xs text-slate-400">No write-offs match the current filters.</td></tr></tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-1 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"><span>Showing {{ activeTab === 'disbursements' ? visibleImprests.length : activeTab === 'retirements' ? visibleRetirements.length : activeTab === 'refunds' ? visibleRefunds.length : visibleWriteOffs.length }} records</span><span>Posted records are locked; correct them through the reversal workflow.</span></div>
    </section>

    <div v-if="showImprestForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" @click.self="showImprestForm = false">
      <section role="dialog" aria-modal="true" aria-labelledby="imprest-form-title" class="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-[#172321]/95 sm:px-6"><div><p class="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">Disbursement draft</p><h2 id="imprest-form-title" class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ editingImprestId ? 'Edit imprest' : 'New imprest' }}</h2><p class="mt-1 text-xs text-slate-500">Record the employee advance, funding account, currency and retirement deadline.</p></div><button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showImprestForm = false"><X :size="17" /></button></div>
        <form class="space-y-5 p-5 sm:p-6" @submit.prevent="saveImprest">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Imprest number</span><input v-model="imprestForm.imprestNumber" readonly class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Employee <span class="text-rose-500">*</span></span><select v-model="imprestForm.employeeId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="onEmployeeChange"><option value="" disabled>Select employee</option><option v-for="employee in employees" :key="employee.id" :value="employee.id">{{ employee.employeeIdentifier }} — {{ employee.employeeName }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Imprest category <span class="text-rose-500">*</span></span><select v-model="imprestForm.categoryId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select category</option><option v-for="category in setup.imprestCategories.value" :key="category.id" :value="category.id">{{ category.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Amount <span class="text-rose-500">*</span></span><input v-model="imprestForm.amount" required min="0.000001" step="0.000001" inputmode="decimal" type="number" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Currency</span><select v-model="imprestForm.currencyCode" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" @change="onCurrencyChange"><option v-for="currency in ledgerCurrencyOptions" :key="currency.code" :value="currency.code">{{ currency.code }} — {{ currency.name }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Disbursement date <span class="text-rose-500">*</span></span><input v-model="imprestForm.disbursementDate" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Expected retirement <span class="text-rose-500">*</span></span><input v-model="imprestForm.expectedRetirementDate" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Organizational unit</span><select v-model="imprestForm.organizationUnitId" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="">Use employee's unit</option><option v-for="unit in ledgerOrganizationalUnits" :key="unit.id" :value="unit.id">{{ unit.path }}</option></select></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Payment method</span><select v-model="imprestForm.paymentMethod" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option>Bank transfer</option><option>Cheque</option><option>Cash</option><option>Mobile money</option></select></label>
            <label v-if="imprestForm.paymentMethod === 'Cheque'" class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cheque number <span class="text-rose-500">*</span></span><input v-model="imprestForm.chequeNumber" maxlength="80" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Cheque number" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Payment reference <span class="text-rose-500">*</span></span><input v-model="imprestForm.referenceNumber" required maxlength="100" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Bank transfer or cheque reference" /></label>
          </div>

          <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div class="mb-3 flex items-center justify-between gap-3"><div><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Currency conversion</h3><p class="mt-1 text-[10px] text-slate-500">Exchange rates are recorded as Ghana cedi per unit of foreign currency.</p></div><span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ imprestForm.currencyCode }} → GHS</span></div><div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-slate-500">Buy rate</span><input v-model="imprestForm.buyRate" required min="0.0000000001" step="0.0000000001" type="number" class="h-9 w-full rounded-md border border-slate-200 px-3 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label><label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-slate-500">Sell rate</span><input v-model="imprestForm.sellRate" required min="0.0000000001" step="0.0000000001" type="number" class="h-9 w-full rounded-md border border-slate-200 px-3 text-right text-xs tabular-nums outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label></div></div>

          <div class="grid gap-4 sm:grid-cols-2"><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Debit G/L account <span class="text-rose-500">*</span></span><select v-model="imprestForm.debitAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></label><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Credit / funding G/L account <span class="text-rose-500">*</span></span><select v-model="imprestForm.creditAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></label></div>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Description</span><textarea v-model="imprestForm.description" rows="2" maxlength="500" class="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" placeholder="Purpose and supporting context" /></label>
          <p v-if="imprestFormError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ imprestFormError }}</p>
          <div class="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center dark:border-slate-800"><p class="text-[10px] text-slate-400">New disbursements are saved as drafts; posting is a separate step.</p><div class="flex justify-end gap-2"><button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showImprestForm = false">Cancel</button><button type="submit" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ editingImprestId ? 'Save draft' : 'Create draft' }}</button></div></div>
        </form>
      </section>
    </div>

    <div v-if="settlementType && selectedSettlementImprest" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" @click.self="closeSettlement">
      <section role="dialog" aria-modal="true" aria-labelledby="settlement-title" class="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-[#172321]/95 sm:px-6"><div><p class="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">{{ settlementType === 'retirement' ? 'Receipt retirement' : settlementType === 'refund' ? 'Cash refund' : 'Authorized write-off' }}</p><h2 id="settlement-title" class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ settlementType === 'retirement' ? 'Record retirement' : settlementType === 'refund' ? 'Record refund' : 'Record write-off' }}</h2><p class="mt-1 text-xs text-slate-500">{{ selectedSettlementImprest.imprestNumber }} · {{ selectedSettlementImprest.employeeName }} · outstanding {{ formatCurrency(selectedSettlementImprest.balance, selectedSettlementImprest.currencyCode) }}</p></div><button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="closeSettlement"><X :size="17" /></button></div>
        <div class="space-y-5 p-5 sm:p-6">
          <div v-if="settlementType === 'retirement'" class="space-y-5">
            <div class="grid gap-4 sm:grid-cols-3"><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Retirement date</span><input v-model="retirementForm.retirementDate" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Retired by</span><input v-model="retirementForm.retiredBy" required maxlength="120" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label><label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Rate to GHS</span><input v-model="retirementForm.exchangeRate" required min="0.0000000001" step="0.0000000001" type="number" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums dark:border-slate-700 dark:bg-slate-900" /></label></div>
            <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><div><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Receipt detail lines</h3><p class="mt-1 text-[10px] text-slate-500">Itemize receipts; the total cannot exceed the outstanding balance.</p></div><button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="addRetirementLine"><Plus :size="13" /> Add line</button></div><table class="w-full min-w-[1140px] text-left text-xs"><thead class="bg-slate-50/70 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/50"><tr><th class="px-3 py-2.5">Receipt date</th><th class="px-3 py-2.5">Receipt no.</th><th class="px-3 py-2.5">Description</th><th class="px-3 py-2.5 text-right">Amount · {{ selectedSettlementImprest.currencyCode }}</th><th class="px-3 py-2.5">Debit account</th><th class="px-3 py-2.5">Credit account</th><th class="px-3 py-2.5">Org unit</th><th class="w-10 px-2 py-2.5" /></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(line, index) in retirementLines" :key="line.key"><td class="px-3 py-2"><input v-model="line.receiptDate" type="date" class="h-9 w-[130px] rounded-md border border-slate-200 px-2 text-[10px] dark:border-slate-700 dark:bg-slate-900" /></td><td class="px-3 py-2"><input v-model="line.receiptNumber" maxlength="80" class="h-9 w-[130px] rounded-md border border-slate-200 px-2 text-[10px] dark:border-slate-700 dark:bg-slate-900" placeholder="Receipt no." /></td><td class="px-3 py-2"><input v-model="line.description" maxlength="300" class="h-9 w-[180px] rounded-md border border-slate-200 px-2 text-[10px] dark:border-slate-700 dark:bg-slate-900" placeholder="Expense description" /></td><td class="px-3 py-2"><input v-model="line.amount" min="0.000001" step="0.000001" type="number" class="h-9 w-[125px] rounded-md border border-slate-200 px-2 text-right text-[10px] tabular-nums dark:border-slate-700 dark:bg-slate-900" placeholder="0.00" /></td><td class="px-3 py-2"><select v-model="line.debitAccountId" class="h-9 w-[180px] rounded-md border border-slate-200 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Debit account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></td><td class="px-3 py-2"><select v-model="line.creditAccountId" class="h-9 w-[180px] rounded-md border border-slate-200 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Credit account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></td><td class="px-3 py-2"><select v-model="line.organizationUnitId" class="h-9 w-[160px] rounded-md border border-slate-200 bg-white px-2 text-[10px] dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select unit</option><option v-for="unit in ledgerOrganizationalUnits" :key="unit.id" :value="unit.id">{{ unit.name }}</option></select></td><td class="px-2 py-2"><button type="button" :disabled="retirementLines.length <= 1" class="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/30" :aria-label="`Remove receipt line ${index + 1}`" @click="retirementLines.splice(index, 1)"><Trash2 :size="13" /></button></td></tr></tbody><tfoot class="bg-slate-50/70 dark:bg-slate-900/50"><tr><td colspan="3" class="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Retirement total</td><td class="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatCurrency(retirementLineTotal, selectedSettlementImprest.currencyCode) }}</td><td colspan="4" class="px-3 py-3 text-right text-[10px] text-slate-500">Outstanding {{ formatCurrency(selectedSettlementImprest.balance, selectedSettlementImprest.currencyCode) }}</td></tr></tfoot></table></div>
          </div>

          <div v-else-if="settlementType === 'refund'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Refund date</span><input v-model="refundForm.refundDate" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Refund amount · {{ selectedSettlementImprest.currencyCode }}</span><input v-model="refundForm.amount" required min="0.000001" :max="selectedSettlementImprest.balance" step="0.000001" type="number" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Rate to GHS</span><input v-model="refundForm.exchangeRate" required min="0.0000000001" step="0.0000000001" type="number" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Receipt date</span><input v-model="refundForm.receiptDate" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Receipt number</span><input v-model="refundForm.receiptNumber" required maxlength="80" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Cash receipt or deposit reference" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Funds received by</span><input v-model="refundForm.refundReceivedBy" required maxlength="120" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block lg:col-span-1"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Debit / cash received account</span><select v-model="refundForm.debitAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></label>
            <label class="block lg:col-span-1"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Credit / imprest control account</span><select v-model="refundForm.creditAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></label>
            <label class="block sm:col-span-2 lg:col-span-3"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Notes</span><textarea v-model="refundForm.notes" rows="2" maxlength="500" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Reason and supporting details" /></label>
          </div>

          <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Write-off date</span><input v-model="writeOffForm.writeOffDate" required type="date" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Write-off amount · {{ selectedSettlementImprest.currencyCode }}</span><input v-model="writeOffForm.amount" required min="0.000001" :max="selectedSettlementImprest.balance" step="0.000001" type="number" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Rate to GHS</span><input v-model="writeOffForm.exchangeRate" required min="0.0000000001" step="0.0000000001" type="number" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-right text-xs tabular-nums dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Authorized by</span><input v-model="writeOffForm.authorizedBy" required maxlength="120" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Approving manager" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Written off by</span><input v-model="writeOffForm.writtenOffBy" required maxlength="120" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Debit / expense account</span><select v-model="writeOffForm.debitAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></label>
            <label class="block sm:col-span-2"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Credit / imprest control account</span><select v-model="writeOffForm.creditAccountId" required class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="" disabled>Select account</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.accountNumber }} — {{ account.name }}</option></select></label>
            <label class="block sm:col-span-2 lg:col-span-3"><span class="mb-1.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Notes</span><textarea v-model="writeOffForm.notes" rows="2" maxlength="500" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Justification and authorization reference" /></label>
          </div>

          <p v-if="settlementError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ settlementError }}</p>
          <div class="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center dark:border-slate-800"><p class="text-[10px] text-slate-400">Saved settlement drafts reserve the entered amount until posted or deleted.</p><div class="flex justify-end gap-2"><button type="button" class="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeSettlement">Cancel</button><button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white hover:bg-brand-800" @click="saveSettlement"><Check :size="14" />Save settlement draft</button></div></div>
        </div>
      </section>
    </div>

    <div v-if="detailRecord" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" @click.self="detailRecord = null">
      <section role="dialog" aria-modal="true" aria-labelledby="imprest-detail-title" class="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-[#172321]/95 sm:px-6"><div><p class="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">{{ selectedImprestDetail ? 'Disbursement details' : selectedRetirementDetail ? 'Retirement details' : selectedRefundDetail ? 'Refund details' : 'Write-off details' }}</p><h2 id="imprest-detail-title" class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{{ selectedImprestDetail?.imprestNumber || selectedRetirementDetail?.imprestNumber || selectedRefundDetail?.imprestNumber || selectedWriteOffDetail?.imprestNumber }}</h2></div><button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close details" @click="detailRecord = null"><X :size="17" /></button></div>
        <div class="space-y-6 p-5 sm:p-6">
          <template v-if="selectedImprestDetail">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><span class="detail-label">Employee</span><span class="detail-value">{{ selectedImprestDetail.employeeName }} · {{ selectedImprestDetail.employeeIdentifier }}</span></div><div><span class="detail-label">Category</span><span class="detail-value">{{ selectedImprestDetail.imprestCategoryName }}</span></div><div><span class="detail-label">Organizational unit</span><span class="detail-value">{{ selectedImprestDetail.organizationUnitName }}</span></div><div><span class="detail-label">Status</span><span class="detail-value">{{ statusLabel(selectedImprestDetail.status) }}</span></div><div><span class="detail-label">Disbursement date</span><span class="detail-value">{{ formatDate(selectedImprestDetail.disbursementDate) }}</span></div><div><span class="detail-label">Expected retirement</span><span class="detail-value">{{ formatDate(selectedImprestDetail.expectedRetirementDate) }}</span></div><div><span class="detail-label">Amount</span><span class="detail-value">{{ formatCurrency(selectedImprestDetail.amount, selectedImprestDetail.currencyCode) }}</span></div><div><span class="detail-label">Outstanding balance</span><span class="detail-value">{{ formatCurrency(selectedImprestDetail.balance, selectedImprestDetail.currencyCode) }}</span></div><div><span class="detail-label">Payment method / reference</span><span class="detail-value">{{ selectedImprestDetail.paymentMethod }}{{ selectedImprestDetail.chequeNumber ? ` · ${selectedImprestDetail.chequeNumber}` : '' }} · {{ selectedImprestDetail.referenceNumber }}</span></div><div><span class="detail-label">Currency rates to GHS</span><span class="detail-value">Buy {{ selectedImprestDetail.buyRate }} · Sell {{ selectedImprestDetail.sellRate }}</span></div><div class="sm:col-span-2"><span class="detail-label">Description</span><span class="detail-value">{{ selectedImprestDetail.description || '—' }}</span></div></div>
            <div class="rounded-xl border border-slate-200 dark:border-slate-700"><div class="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Disbursement journal preview</h3><p class="mt-1 text-[10px] text-slate-500">Preview only · posting is not connected to the live General Ledger.</p></div><div class="grid gap-3 p-4 sm:grid-cols-2"><div class="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-900/50"><span class="block text-[10px] uppercase text-slate-400">Debit</span><span class="mt-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">{{ accountName(selectedImprestDetail.debitAccountId) }}</span><span class="mt-1 block text-xs tabular-nums text-slate-500">{{ formatCurrency(selectedImprestDetail.amount, selectedImprestDetail.currencyCode) }}</span></div><div class="rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-900/50"><span class="block text-[10px] uppercase text-slate-400">Credit</span><span class="mt-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">{{ accountName(selectedImprestDetail.creditAccountId) }}</span><span class="mt-1 block text-xs tabular-nums text-slate-500">{{ formatCurrency(selectedImprestDetail.amount, selectedImprestDetail.currencyCode) }}</span></div></div></div>
          </template>
          <template v-else-if="selectedRetirementDetail">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><span class="detail-label">Employee</span><span class="detail-value">{{ selectedRetirementDetail.employeeName }}</span></div><div><span class="detail-label">Retirement date</span><span class="detail-value">{{ formatDate(selectedRetirementDetail.retirementDate) }}</span></div><div><span class="detail-label">Amount retired</span><span class="detail-value">{{ formatCurrency(selectedRetirementDetail.amountRetired, selectedRetirementDetail.currencyCode) }}</span></div><div><span class="detail-label">Status / prepared by</span><span class="detail-value">{{ statusLabel(selectedRetirementDetail.status) }} · {{ selectedRetirementDetail.retiredBy }}</span></div></div>
            <div><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Receipt details</h3><div class="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table class="w-full min-w-[760px] text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/50"><tr><th class="px-3 py-2.5">Receipt date / no.</th><th class="px-3 py-2.5">Description</th><th class="px-3 py-2.5">Debit account</th><th class="px-3 py-2.5">Credit account</th><th class="px-3 py-2.5">Org unit</th><th class="px-3 py-2.5 text-right">Amount</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="line in selectedRetirementDetail.details" :key="line.id"><td class="px-3 py-3 text-slate-600 dark:text-slate-300">{{ formatDate(line.receiptDate) }}<span class="mt-1 block font-mono text-[10px] text-slate-400">{{ line.receiptNumber }}</span></td><td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ line.description }}</td><td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ accountName(line.debitAccountId) }}</td><td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ accountName(line.creditAccountId) }}</td><td class="px-3 py-3 text-slate-600 dark:text-slate-400">{{ organizationUnitName(line.organizationUnitId) }}</td><td class="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{{ formatCurrency(line.amount, selectedRetirementDetail.currencyCode) }}</td></tr></tbody></table></div></div>
          </template>
          <template v-else-if="selectedRefundDetail">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><span class="detail-label">Employee</span><span class="detail-value">{{ selectedRefundDetail.employeeName }}</span></div><div><span class="detail-label">Refund date</span><span class="detail-value">{{ formatDate(selectedRefundDetail.refundDate) }}</span></div><div><span class="detail-label">Amount</span><span class="detail-value">{{ formatCurrency(selectedRefundDetail.amount, selectedRefundDetail.currencyCode) }}</span></div><div><span class="detail-label">Status</span><span class="detail-value">{{ statusLabel(selectedRefundDetail.status) }}</span></div><div><span class="detail-label">Receipt</span><span class="detail-value">{{ selectedRefundDetail.receiptNumber }} · {{ formatDate(selectedRefundDetail.receiptDate) }}</span></div><div><span class="detail-label">Received by</span><span class="detail-value">{{ selectedRefundDetail.refundReceivedBy }}</span></div><div class="sm:col-span-2"><span class="detail-label">Notes</span><span class="detail-value">{{ selectedRefundDetail.notes || '—' }}</span></div></div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Refund journal preview</h3><p class="mt-1 text-[10px] text-slate-500">Debit {{ accountName(selectedRefundDetail.debitAccountId) }} · Credit {{ accountName(selectedRefundDetail.creditAccountId) }} · {{ formatCurrency(selectedRefundDetail.amount, selectedRefundDetail.currencyCode) }}</p></div>
          </template>
          <template v-else-if="selectedWriteOffDetail">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><span class="detail-label">Employee</span><span class="detail-value">{{ selectedWriteOffDetail.employeeName }}</span></div><div><span class="detail-label">Write-off date</span><span class="detail-value">{{ formatDate(selectedWriteOffDetail.writeOffDate) }}</span></div><div><span class="detail-label">Amount</span><span class="detail-value">{{ formatCurrency(selectedWriteOffDetail.amount, selectedWriteOffDetail.currencyCode) }}</span></div><div><span class="detail-label">Status</span><span class="detail-value">{{ statusLabel(selectedWriteOffDetail.status) }}</span></div><div><span class="detail-label">Authorized by</span><span class="detail-value">{{ selectedWriteOffDetail.authorizedBy }}</span></div><div><span class="detail-label">Written off by</span><span class="detail-value">{{ selectedWriteOffDetail.writtenOffBy }}</span></div><div class="sm:col-span-2"><span class="detail-label">Notes</span><span class="detail-value">{{ selectedWriteOffDetail.notes || '—' }}</span></div></div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 class="text-xs font-semibold text-slate-900 dark:text-white">Write-off journal preview</h3><p class="mt-1 text-[10px] text-slate-500">Debit {{ accountName(selectedWriteOffDetail.debitAccountId) }} · Credit {{ accountName(selectedWriteOffDetail.creditAccountId) }} · {{ formatCurrency(selectedWriteOffDetail.amount, selectedWriteOffDetail.currencyCode) }}</p></div>
          </template>
        </div>
      </section>
    </div>

    <div v-if="confirmation" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" @click.self="confirmation = null">
      <section role="dialog" aria-modal="true" aria-labelledby="imprest-confirm-title" class="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]"><div class="flex items-start gap-3"><span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg" :class="confirmation.action === 'post' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'"><ShieldCheck v-if="confirmation.action === 'post'" :size="17" /><Trash2 v-else :size="16" /></span><div><h2 id="imprest-confirm-title" class="text-base font-semibold text-slate-900 dark:text-white">{{ confirmation.action === 'post' ? 'Post this transaction?' : 'Delete this draft?' }}</h2><p class="mt-1.5 text-sm leading-relaxed text-slate-500">{{ confirmation.action === 'post' ? `${confirmation.label} will be marked posted in the preview workflow.` : `${confirmation.label} will be removed from local demo data.` }}</p></div></div><p v-if="confirmation.action === 'post'" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">This preview action does not create a live GL journal.</p><p v-if="confirmationError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ confirmationError }}</p><div class="mt-5 flex justify-end gap-2"><button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="confirmation = null">Cancel</button><button type="button" class="h-9 rounded-lg px-3 text-xs font-semibold text-white" :class="confirmation.action === 'post' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'" @click="executeAction">{{ confirmation.action === 'post' ? 'Mark as posted' : 'Delete draft' }}</button></div></section>
    </div>
  </div>
</template>

<style scoped>
.detail-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(148 163 184);
}
.detail-value {
  display: block;
  margin-top: 0.35rem;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(71 85 105);
}
:global(.dark) .detail-value {
  color: rgb(203 213 225);
}
</style>
