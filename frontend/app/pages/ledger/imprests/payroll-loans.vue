<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRightLeft,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Filter,
  Info,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from '@lucide/vue'
import {
  convertLedgerAmount,
  formatLedgerAmount,
  parseLedgerAmount,
  parseLedgerRate,
} from '../../../features/ledger/money'
import {
  payrollLoanTypes,
  useLedgerImprests,
  type LedgerImprest,
  type LedgerPayrollLoanConversion,
} from '../../../features/ledger/imprest-data'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Convert Outstanding Balance to Payroll Loans' })

const route = useRoute()
const ledger = useLedgerImprests()
const employees = ledger.employees
const imprests = ledger.imprests
const retirements = ledger.retirements
const refunds = ledger.refunds
const writeOffs = ledger.writeOffs
const conversions = ledger.payrollLoanConversions
const loanTypes = payrollLoanTypes

interface ConversionForm {
  loanDate: string
  employeeId: string
  loanTypeId: string
  deductionStarts: string
  durationMonths: number
  deductThisMonth: boolean
}

interface PayrollSourceRow {
  imprest: LedgerImprest
  availableAmount: string
  imprestGhs: bigint
  retirementGhs: bigint
  writeOffGhs: bigint
  refundGhs: bigint
  balanceGhs: bigint
}

interface PayrollCategoryRow {
  id: string
  name: string
  sources: PayrollSourceRow[]
  imprestGhs: bigint
  retirementGhs: bigint
  writeOffGhs: bigint
  refundGhs: bigint
  balanceGhs: bigint
}

const form = reactive<ConversionForm>({
  loanDate: todayIso(),
  employeeId: 'employee-ama-owusu',
  loanTypeId: 'staff-payroll-js-loan',
  deductionStarts: todayIso(),
  durationMonths: 12,
  deductThisMonth: true,
})
const selectedImprestIds = ref<string[]>([])
const editingConversionId = ref('')
const selectedConversionId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const searchTerm = ref('')
const flatPreview = ref(false)
const fieldsOpen = ref(false)
const expandedCategories = ref<string[]>([])
const confirmation = ref<{ action: 'convert' | 'delete'; id: string } | null>(null)
const visibleFields = reactive({
  imprestAmount: true,
  retirement: true,
  writeOff: true,
  refund: true,
  balance: true,
})
const fieldOptions: Array<{ key: keyof typeof visibleFields; label: string }> = [
  { key: 'imprestAmount', label: 'Imprest Amount' },
  { key: 'retirement', label: 'Retirement' },
  { key: 'writeOff', label: 'WriteOff' },
  { key: 'refund', label: 'Refund' },
  { key: 'balance', label: 'Balance' },
]

const availableImprests = computed(() => imprests.value.filter((imprest) => {
  if (!imprest.postedToGl || ledger.hasUnpostedSettlement(imprest.id)) return false
  const available = parseLedgerAmount(ledger.availableBalanceForImprest(imprest.id, editingConversionId.value))
  return available !== null && available > BigInt(0)
}))

const employeeOptions = computed(() => employees.filter((employee) => availableImprests.value.some((imprest) => imprest.employeeId === employee.id)))
const selectedEmployee = computed(() => employees.find((employee) => employee.id === form.employeeId) ?? null)

const eligibleImprests = computed(() => availableImprests.value.filter((imprest) => imprest.employeeId === form.employeeId))

const sourceRows = computed<PayrollSourceRow[]>(() => eligibleImprests.value.map((imprest) => {
  const availableAmount = ledger.availableBalanceForImprest(imprest.id, editingConversionId.value)
  const rateUnits = parseLedgerRate(imprest.sellRate) ?? BigInt(0)
  const balanceUnits = parseLedgerAmount(availableAmount) ?? BigInt(0)
  return {
    imprest,
    availableAmount,
    imprestGhs: toGhsUnits(imprest.amount, imprest.sellRate),
    retirementGhs: retirements.value
      .filter((item) => item.imprestId === imprest.id && item.status === 'posted')
      .reduce((total, item) => total + toGhsUnits(item.amountRetired, imprest.sellRate), BigInt(0)),
    writeOffGhs: writeOffs.value
      .filter((item) => item.imprestId === imprest.id && item.status === 'posted')
      .reduce((total, item) => total + toGhsUnits(item.amount, imprest.sellRate), BigInt(0)),
    refundGhs: refunds.value
      .filter((item) => item.imprestId === imprest.id && item.status === 'posted')
      .reduce((total, item) => total + toGhsUnits(item.amount, imprest.sellRate), BigInt(0)),
    balanceGhs: rateUnits > BigInt(0) ? convertLedgerAmount(balanceUnits, rateUnits) : BigInt(0),
  }
}))
const visibleSourceRows = computed(() => sourceRows.value.filter((source) => matchesSearch(searchTerm.value, [
  source.imprest.imprestNumber,
  source.imprest.imprestCategoryName,
  source.imprest.referenceNumber,
  source.imprest.description,
  source.imprest.organizationUnitName,
])))

const categoryRows = computed<PayrollCategoryRow[]>(() => {
  const groups = new Map<string, PayrollCategoryRow>()
  for (const source of visibleSourceRows.value) {
    const id = source.imprest.imprestCategoryId
    let row = groups.get(id)
    if (!row) {
      row = {
        id,
        name: source.imprest.imprestCategoryName,
        sources: [],
        imprestGhs: BigInt(0),
        retirementGhs: BigInt(0),
        writeOffGhs: BigInt(0),
        refundGhs: BigInt(0),
        balanceGhs: BigInt(0),
      }
      groups.set(id, row)
    }
    row.sources.push(source)
    row.imprestGhs += source.imprestGhs
    row.retirementGhs += source.retirementGhs
    row.writeOffGhs += source.writeOffGhs
    row.refundGhs += source.refundGhs
    row.balanceGhs += source.balanceGhs
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const selectedSources = computed(() => sourceRows.value.filter((row) => selectedImprestIds.value.includes(row.imprest.id)))
const selectedPrincipalUnits = computed(() => selectedSources.value.reduce((total, source) => total + source.balanceGhs, BigInt(0)))
const monthlyDeductionUnits = computed(() => {
  const months = Number(form.durationMonths)
  if (!Number.isInteger(months) || months < 1) return BigInt(0)
  return selectedPrincipalUnits.value / BigInt(months)
})
const selectedAmountCount = computed(() => selectedSources.value.length)
const selectedConversion = computed(() => conversions.value.find((conversion) => conversion.id === selectedConversionId.value) ?? null)
const isEditingDraft = computed(() => conversions.value.some((conversion) => conversion.id === editingConversionId.value && conversion.status === 'draft'))
const canConvert = computed(() => selectedConversion.value?.status === 'draft')
const filteredConversions = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()
  return [...conversions.value]
    .filter((conversion) => !query || [conversion.conversionNumber, conversion.employeeName, conversion.employeeIdentifier, conversion.loanTypeName].some((value) => value.toLowerCase().includes(query)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

function todayIso() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function matchesSearch(term: string, values: Array<string | undefined>) {
  const query = term.trim().toLowerCase()
  return !query || values.some((value) => (value || '').toLowerCase().includes(query))
}

function toGhsUnits(amount: string, rate: string) {
  const amountUnits = parseLedgerAmount(amount)
  const rateUnits = parseLedgerRate(rate)
  return amountUnits === null || rateUnits === null ? BigInt(0) : convertLedgerAmount(amountUnits, rateUnits)
}

function formatGhs(units: bigint) {
  const cents = (units + BigInt(5_000)) / BigInt(10_000)
  const whole = String(cents / BigInt(100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = String(cents % BigInt(100)).padStart(2, '0')
  return `${whole}.${fraction}`
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}

function onEmployeeChange() {
  selectedImprestIds.value = []
  expandedCategories.value = []
  errorMessage.value = ''
}

function setImprestSelected(imprestId: string, checked: boolean) {
  if (checked && !selectedImprestIds.value.includes(imprestId)) selectedImprestIds.value = [...selectedImprestIds.value, imprestId]
  else if (!checked) selectedImprestIds.value = selectedImprestIds.value.filter((id) => id !== imprestId)
  errorMessage.value = ''
}

function onImprestCheckboxChange(imprestId: string, event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement) setImprestSelected(imprestId, target.checked)
}

function categorySelectionState(row: PayrollCategoryRow) {
  const count = row.sources.filter((source) => selectedImprestIds.value.includes(source.imprest.id)).length
  if (!count) return 'none'
  return count === row.sources.length ? 'all' : 'partial'
}

function toggleCategory(row: PayrollCategoryRow) {
  const selected = categorySelectionState(row) === 'all'
  for (const source of row.sources) setImprestSelected(source.imprest.id, !selected)
}

function toggleExpanded(id: string) {
  expandedCategories.value = expandedCategories.value.includes(id)
    ? expandedCategories.value.filter((item) => item !== id)
    : [...expandedCategories.value, id]
}

function resetForm(clearSelectedConversion = true) {
  editingConversionId.value = ''
  selectedImprestIds.value = []
  form.loanDate = todayIso()
  form.employeeId = employeeOptions.value[0]?.id ?? ''
  form.loanTypeId = loanTypes[0]?.id ?? ''
  form.deductionStarts = todayIso()
  form.durationMonths = 12
  form.deductThisMonth = true
  expandedCategories.value = []
  errorMessage.value = ''
  if (clearSelectedConversion) selectedConversionId.value = ''
}

function newConversion() {
  resetForm()
  successMessage.value = ''
}

function loadConversion(conversion: LedgerPayrollLoanConversion) {
  if (conversion.status !== 'draft') return
  editingConversionId.value = conversion.id
  selectedConversionId.value = conversion.id
  form.loanDate = conversion.loanDate
  form.employeeId = conversion.employeeId
  form.loanTypeId = conversion.loanTypeId
  form.deductionStarts = conversion.deductionStarts
  form.durationMonths = conversion.durationMonths
  form.deductThisMonth = conversion.deductThisMonth
  selectedImprestIds.value = conversion.sources.map((source) => source.imprestId)
  errorMessage.value = ''
  successMessage.value = `Draft ${conversion.conversionNumber} loaded for editing.`
}

function saveDraft() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!form.employeeId) {
    errorMessage.value = 'Select an employee with an available posted imprest balance.'
    return
  }
  if (!selectedImprestIds.value.length) {
    errorMessage.value = 'Select at least one category or outstanding imprest balance before saving.'
    return
  }
  if (!Number.isInteger(Number(form.durationMonths)) || Number(form.durationMonths) < 1 || Number(form.durationMonths) > 60) {
    errorMessage.value = 'Duration must be a whole number between 1 and 60 months.'
    return
  }
  const saved = ledger.savePayrollLoanConversion({
    id: editingConversionId.value || undefined,
    employeeId: form.employeeId,
    loanDate: form.loanDate,
    loanTypeId: form.loanTypeId,
    deductionStarts: form.deductionStarts,
    durationMonths: Number(form.durationMonths),
    deductThisMonth: form.deductThisMonth,
    selectedImprestIds: selectedImprestIds.value,
  })
  if (!saved) {
    errorMessage.value = 'The draft could not be saved. One or more imprests may have changed or been reserved by another draft; refresh the register and review the selected balances.'
    return
  }
  editingConversionId.value = saved.id
  selectedConversionId.value = saved.id
  successMessage.value = `${saved.conversionNumber} saved as a draft. Convert it when the loan details are ready.`
}

function selectConversion(conversion: LedgerPayrollLoanConversion) {
  selectedConversionId.value = conversion.id
  errorMessage.value = ''
}

function editSelected() {
  if (selectedConversion.value) loadConversion(selectedConversion.value)
}

function requestDeleteSelected() {
  if (selectedConversion.value?.status === 'draft') confirmation.value = { action: 'delete', id: selectedConversion.value.id }
}

function requestConvertSelected() {
  if (selectedConversion.value?.status !== 'draft') return
  if (editingConversionId.value === selectedConversion.value.id) {
    const saved = ledger.savePayrollLoanConversion({
      id: editingConversionId.value,
      employeeId: form.employeeId,
      loanDate: form.loanDate,
      loanTypeId: form.loanTypeId,
      deductionStarts: form.deductionStarts,
      durationMonths: Number(form.durationMonths),
      deductThisMonth: form.deductThisMonth,
      selectedImprestIds: selectedImprestIds.value,
    })
    if (!saved) {
      errorMessage.value = 'Save the current edits before converting. The selected source balance may have changed.'
      return
    }
    selectedConversionId.value = saved.id
  }
  confirmation.value = { action: 'convert', id: selectedConversion.value.id }
}

function confirmAction() {
  if (!confirmation.value) return
  const { action, id } = confirmation.value
  confirmation.value = null
  errorMessage.value = ''
  successMessage.value = ''
  if (action === 'delete') {
    const conversion = conversions.value.find((item) => item.id === id)
    if (!ledger.removePayrollLoanConversion(id)) {
      errorMessage.value = 'Only payroll-js-loan conversion drafts can be deleted.'
      return
    }
    if (editingConversionId.value === id) resetForm()
    selectedConversionId.value = ''
    successMessage.value = `${conversion?.conversionNumber ?? 'Draft'} deleted. Its imprest balances are available again.`
    return
  }
  const conversion = conversions.value.find((item) => item.id === id)
  if (!ledger.convertPayrollLoanConversion(id)) {
    errorMessage.value = 'Conversion was not completed. A source balance may have changed or may be awaiting another imprest settlement.'
    return
  }
  if (editingConversionId.value === id) resetForm(false)
  successMessage.value = `${conversion?.conversionNumber ?? 'Payroll loan'} converted. The source imprest balance has been marked as converted in this local preview.`
}

function refreshPreview() {
  errorMessage.value = ''
  selectedImprestIds.value = selectedImprestIds.value.filter((id) => sourceRows.value.some((source) => source.imprest.id === id))
  successMessage.value = 'Available balances refreshed from the current imprest register.'
}

function downloadReport() {
  const headers = ['Employee', 'Employee ID', 'Imprest Category', 'Imprest Amount (GHS equiv.)', 'Retirement (GHS equiv.)', 'WriteOff (GHS equiv.)', 'Refund (GHS equiv.)', 'Available Balance (GHS equiv.)']
  const lines = [headers, ...categoryRows.value.map((row) => [
    selectedEmployee.value?.employeeName ?? '',
    selectedEmployee.value?.employeeIdentifier ?? '',
    row.name,
    formatLedgerAmount(row.imprestGhs),
    formatLedgerAmount(row.retirementGhs),
    formatLedgerAmount(row.writeOffGhs),
    formatLedgerAmount(row.refundGhs),
    formatLedgerAmount(row.balanceGhs),
  ])]
  const csv = lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'outstanding-imprest-balances.csv'
  anchor.click()
  URL.revokeObjectURL(url)
  successMessage.value = 'Outstanding-balance report downloaded.'
}

function returnToImprests() {
  return navigateTo('/ledger/imprests')
}

function applyImprestQuery(value: unknown) {
  const imprestId = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
  if (!imprestId) return
  const imprest = imprests.value.find((item) => item.id === imprestId)
  if (!imprest) {
    errorMessage.value = 'The selected imprest could not be found.'
    return
  }
  const available = parseLedgerAmount(ledger.availableBalanceForImprest(imprest.id))
  if (!imprest.postedToGl || available === null || available <= BigInt(0) || ledger.hasUnpostedSettlement(imprest.id)) {
    errorMessage.value = 'This imprest is not currently available for conversion. It must be posted, have an unreserved balance, and have no pending settlement.'
    return
  }
  editingConversionId.value = ''
  selectedConversionId.value = ''
  form.employeeId = imprest.employeeId
  selectedImprestIds.value = [imprest.id]
  searchTerm.value = ''
  expandedCategories.value = [imprest.imprestCategoryId]
  errorMessage.value = ''
  successMessage.value = `${imprest.imprestNumber} selected. Review the loan details and save a conversion draft.`
}

watch(() => route.query.imprestId, applyImprestQuery, { immediate: true })
</script>

<template>
  <div class="space-y-5 pb-8">
    <section class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div class="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
          <NuxtLink to="/ledger" class="hover:text-brand-700 dark:hover:text-brand-300">General Ledger</NuxtLink>
          <ChevronRight :size="13" />
          <NuxtLink to="/ledger/imprests" class="hover:text-brand-700 dark:hover:text-brand-300">Accountable Imprest</NuxtLink>
          <ChevronRight :size="13" />
          <span class="text-slate-500 dark:text-slate-300">Payroll Loans</span>
        </div>
        <div class="flex items-start gap-3">
          <span class="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><ArrowRightLeft :size="19" /></span>
          <div>
            <h1 class="text-[25px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Convert Outstanding Balance to Payroll Loans</h1>
            <p class="mt-1.5 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Select an employee’s eligible imprest balances, set the loan terms and prepare a payroll deduction conversion.</p>
          </div>
        </div>
      </div>
      <NuxtLink to="/ledger/imprests" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft :size="14" /> Back to imprests</NuxtLink>
    </section>

    <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <Info :size="16" class="mt-0.5 shrink-0" />
      <p><span class="font-semibold">Local workflow preview.</span> Conversion drafts and source-balance updates are stored in this browser session. Payroll-loan and payroll-deduction APIs are not connected yet, so converting here does not create a live payroll loan, payslip deduction or General Ledger journal.</p>
    </div>

    <div v-if="errorMessage" class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200" role="alert"><CircleAlert :size="15" class="mt-0.5 shrink-0" /><span>{{ errorMessage }}</span></div>
    <div v-if="successMessage" class="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200" role="status"><span class="flex items-start gap-2"><CheckCircle2 :size="15" class="mt-0.5 shrink-0" />{{ successMessage }}</span><button type="button" class="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss message" @click="successMessage = ''"><X :size="14" /></button></div>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
        <button type="button" class="toolbar-button" @click="newConversion"><Plus :size="14" />New</button>
        <button type="button" class="toolbar-button" :disabled="selectedConversion?.status !== 'draft'" @click="editSelected"><Pencil :size="14" />Edit</button>
        <button type="button" class="toolbar-button text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30" :disabled="selectedConversion?.status !== 'draft'" @click="requestDeleteSelected"><Trash2 :size="14" />Delete</button>
        <button type="button" class="toolbar-button" @click="resetForm()"><X :size="14" />Cancel</button>
        <button type="button" class="toolbar-button" @click="saveDraft"><Save :size="14" />Save draft</button>
        <button type="button" class="toolbar-button" @click="refreshPreview"><RefreshCw :size="14" />Refresh</button>
        <span class="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <button type="button" class="toolbar-button" @click="downloadReport"><FileSpreadsheet :size="14" />Report</button>
        <button type="button" class="toolbar-button" :class="flatPreview ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200' : ''" :aria-pressed="flatPreview" @click="flatPreview = !flatPreview"><Printer :size="14" />{{ flatPreview ? 'Grouped Preview' : 'Flat Preview' }}</button>
        <div class="relative">
          <button type="button" class="toolbar-button" :aria-expanded="fieldsOpen" @click="fieldsOpen = !fieldsOpen"><Filter :size="14" />Field Chooser <ChevronDown :size="12" /></button>
          <div v-if="fieldsOpen" class="absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-[#172321]">
            <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Visible columns</p>
            <label v-for="field in fieldOptions" :key="field.key" class="flex cursor-pointer items-center gap-2 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <input v-model="visibleFields[field.key]" type="checkbox" class="rounded border-slate-300 text-brand-700 focus:ring-brand-500" />{{ field.label }}
            </label>
          </div>
        </div>
        <span class="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <button type="button" class="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-700 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40" :disabled="!canConvert" @click="requestConvertSelected"><ArrowRightLeft :size="13" />Convert</button>
        <NuxtLink to="/ledger/imprests" class="toolbar-button"><ArrowLeft :size="14" />Return</NuxtLink>
        <button type="button" class="toolbar-button" @click="returnToImprests"><X :size="14" />Close</button>
      </div>

      <form class="p-4 sm:p-5" @submit.prevent="saveDraft">
        <div class="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Payroll loan details</h2>
              <span v-if="isEditingDraft" class="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Editing draft</span>
              <span v-else-if="selectedConversion" class="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ selectedConversion.status === 'converted' ? 'Converted' : 'Draft selected' }}</span>
            </div>
            <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Loan terms apply to the selected outstanding imprest amount.</p>
          </div>
          <div class="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 dark:border-brand-900/40 dark:bg-brand-950/20">
            <CircleDollarSign :size="16" class="text-brand-700 dark:text-brand-300" />
            <span class="text-[10px] font-medium text-brand-800 dark:text-brand-200">Selected principal</span>
            <span class="text-sm font-bold tabular-nums text-brand-900 dark:text-white">GHS {{ formatGhs(selectedPrincipalUnits) }}</span>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label class="block"><span class="field-label">Loan Date <span class="text-rose-500">*</span></span><span class="relative block"><CalendarDays :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="form.loanDate" required type="date" class="form-control pl-9" /></span></label>
          <label class="block"><span class="field-label">Employee <span class="text-rose-500">*</span></span><span class="relative block"><Users :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select v-model="form.employeeId" required class="form-control pl-9" @change="onEmployeeChange"><option value="" disabled>Select employee</option><option v-for="employee in employeeOptions" :key="employee.id" :value="employee.id">{{ employee.employeeIdentifier }} — {{ employee.employeeName }}</option></select></span></label>
          <label class="block"><span class="field-label">Type of Loan <span class="text-rose-500">*</span></span><select v-model="form.loanTypeId" required class="form-control"><option v-for="loanType in loanTypes" :key="loanType.id" :value="loanType.id">{{ loanType.name }}</option></select></label>
          <label class="block"><span class="field-label">Deduction Starts <span class="text-rose-500">*</span></span><span class="relative block"><CalendarClock :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="form.deductionStarts" required type="date" class="form-control pl-9" /></span></label>
          <label class="block"><span class="field-label">Duration (Months) <span class="text-rose-500">*</span></span><input v-model.number="form.durationMonths" required type="number" min="1" max="60" step="1" inputmode="numeric" class="form-control text-right tabular-nums" /></label>
        </div>

        <div class="mt-3 flex flex-col justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-3 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/35">
          <label class="flex cursor-pointer items-start gap-2.5">
            <input v-model="form.deductThisMonth" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900" />
            <span><span class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Deduct This Month?</span><span class="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">{{ form.deductThisMonth ? 'The first scheduled payroll-js deduction is included in the current month.' : `First scheduled deduction: ${formatDate(form.deductionStarts)}` }}</span></span>
          </label>
          <div class="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span>Selected imprests <strong class="ml-1 text-slate-700 dark:text-slate-200">{{ selectedAmountCount }}</strong></span>
            <span>Monthly deduction <strong class="ml-1 text-slate-700 dark:text-slate-200">GHS {{ formatGhs(monthlyDeductionUnits) }}</strong></span>
            <span v-if="selectedConversion" class="font-mono">{{ selectedConversion.conversionNumber }}</span>
          </div>
        </div>
      </form>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="flex items-start gap-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ClipboardList :size="17" /></span>
          <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Outstanding imprest balances</h2><p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Amounts are shown in GHS equivalent at the original imprest rate.</p></div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400"><ShieldCheck :size="13" />Posted balances only</span>
          <label class="relative block w-full sm:w-56"><Search :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="searchTerm" type="search" placeholder="Search category or imprest…" class="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[11px] outline-none placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900" /></label>
        </div>
      </div>

      <div v-if="!form.employeeId" class="px-6 py-12 text-center"><Wallet :size="23" class="mx-auto text-slate-300" /><p class="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Select an employee to view balances</p><p class="mt-1 text-xs text-slate-400">Only employees with posted, unreserved imprest balances are listed.</p></div>
      <div v-else-if="!categoryRows.length" class="px-6 py-12 text-center"><Banknote :size="23" class="mx-auto text-slate-300" /><p class="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">No outstanding balance available</p><p class="mt-1 text-xs text-slate-400">{{ selectedEmployee?.employeeName }} has no eligible posted imprests matching the current search.</p></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50">
            <tr>
              <th class="w-10 px-4 py-3"><span class="sr-only">Select balance</span></th>
              <th class="min-w-[230px] px-3 py-3">Imprest Category / Source</th>
              <th v-if="visibleFields.imprestAmount" class="px-4 py-3 text-right">Imprest Amount <span class="block text-[8px] font-normal normal-case tracking-normal">GHS equiv.</span></th>
              <th v-if="visibleFields.retirement" class="px-4 py-3 text-right">Retirement <span class="block text-[8px] font-normal normal-case tracking-normal">GHS equiv.</span></th>
              <th v-if="visibleFields.writeOff" class="px-4 py-3 text-right">WriteOff <span class="block text-[8px] font-normal normal-case tracking-normal">GHS equiv.</span></th>
              <th v-if="visibleFields.refund" class="px-4 py-3 text-right">Refund <span class="block text-[8px] font-normal normal-case tracking-normal">GHS equiv.</span></th>
              <th v-if="visibleFields.balance" class="px-4 py-3 text-right">Balance <span class="block text-[8px] font-normal normal-case tracking-normal">Available · GHS</span></th>
            </tr>
          </thead>
          <tbody v-if="!flatPreview" class="divide-y divide-slate-100 dark:divide-slate-800">
            <template v-for="row in categoryRows" :key="row.id">
              <tr class="transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                <td class="px-4 py-3.5"><input type="checkbox" :checked="categorySelectionState(row) === 'all'" :indeterminate="categorySelectionState(row) === 'partial'" :aria-label="`Select all ${row.name} balances`" class="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500" @change="toggleCategory(row)" /></td>
                <td class="px-3 py-3.5"><div class="flex items-center gap-2"><button type="button" class="rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" :aria-label="`${expandedCategories.includes(row.id) ? 'Collapse' : 'Expand'} ${row.name}`" @click="toggleExpanded(row.id)"><ChevronDown v-if="expandedCategories.includes(row.id)" :size="14" /><ChevronRight v-else :size="14" /></button><span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300"><Wallet :size="15" /></span><span class="min-w-0"><span class="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{{ row.name }}</span><span class="mt-0.5 block text-[10px] text-slate-400">{{ row.sources.length }} open imprest{{ row.sources.length === 1 ? '' : 's' }}</span></span></div></td>
                <td v-if="visibleFields.imprestAmount" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(row.imprestGhs) }}</td>
                <td v-if="visibleFields.retirement" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(row.retirementGhs) }}</td>
                <td v-if="visibleFields.writeOff" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(row.writeOffGhs) }}</td>
                <td v-if="visibleFields.refund" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(row.refundGhs) }}</td>
                <td v-if="visibleFields.balance" class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatGhs(row.balanceGhs) }}</td>
              </tr>
              <tr v-if="expandedCategories.includes(row.id)" class="bg-slate-50/70 dark:bg-slate-900/30"><td :colspan="1 + 1 + Object.values(visibleFields).filter(Boolean).length" class="px-6 py-2.5"><div class="space-y-1.5"> <div v-for="source in row.sources" :key="source.imprest.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-[10px] dark:bg-slate-900"><span class="flex min-w-0 items-center gap-2"><span class="font-mono font-semibold text-brand-700 dark:text-brand-300">{{ source.imprest.imprestNumber }}</span><span class="truncate text-slate-500">{{ source.imprest.description }}</span></span><span class="whitespace-nowrap text-slate-500">{{ source.availableAmount }} {{ source.imprest.currencyCode }} <span v-if="source.imprest.currencyCode !== 'GHS'">· rate {{ source.imprest.sellRate }}</span><span class="ml-1 font-semibold text-slate-700 dark:text-slate-200">→ GHS {{ formatGhs(source.balanceGhs) }}</span></span></div></div></td></tr>
            </template>
          </tbody>
          <tbody v-else class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="source in visibleSourceRows" :key="source.imprest.id" class="transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
              <td class="px-4 py-3.5"><input type="checkbox" :checked="selectedImprestIds.includes(source.imprest.id)" :aria-label="`Select ${source.imprest.imprestNumber}`" class="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500" @change="onImprestCheckboxChange(source.imprest.id, $event)" /></td>
              <td class="px-3 py-3.5"><span class="block text-xs font-semibold text-slate-800 dark:text-slate-100">{{ source.imprest.imprestCategoryName }}</span><span class="mt-0.5 block font-mono text-[10px] text-brand-700 dark:text-brand-300">{{ source.imprest.imprestNumber }} · {{ source.imprest.referenceNumber }}</span></td>
              <td v-if="visibleFields.imprestAmount" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(source.imprestGhs) }}</td>
              <td v-if="visibleFields.retirement" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(source.retirementGhs) }}</td>
              <td v-if="visibleFields.writeOff" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(source.writeOffGhs) }}</td>
              <td v-if="visibleFields.refund" class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-500">{{ formatGhs(source.refundGhs) }}</td>
              <td v-if="visibleFields.balance" class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-900 dark:text-white">{{ formatGhs(source.balanceGhs) }}</td>
            </tr>
          </tbody>
          <tfoot class="border-t border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
            <tr>
              <td class="px-4 py-3"></td><td class="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{{ flatPreview ? `${visibleSourceRows.length} source records` : `${categoryRows.length} categories` }} · {{ selectedAmountCount }} selected</td>
              <td v-if="visibleFields.imprestAmount" class="px-4 py-3 text-right text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{{ formatGhs(categoryRows.reduce((total, row) => total + row.imprestGhs, BigInt(0))) }}</td>
              <td v-if="visibleFields.retirement" class="px-4 py-3 text-right text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{{ formatGhs(categoryRows.reduce((total, row) => total + row.retirementGhs, BigInt(0))) }}</td>
              <td v-if="visibleFields.writeOff" class="px-4 py-3 text-right text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{{ formatGhs(categoryRows.reduce((total, row) => total + row.writeOffGhs, BigInt(0))) }}</td>
              <td v-if="visibleFields.refund" class="px-4 py-3 text-right text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{{ formatGhs(categoryRows.reduce((total, row) => total + row.refundGhs, BigInt(0))) }}</td>
              <td v-if="visibleFields.balance" class="px-4 py-3 text-right text-[11px] font-bold tabular-nums text-brand-800 dark:text-brand-200">{{ formatGhs(categoryRows.reduce((total, row) => total + row.balanceGhs, BigInt(0))) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800"><span>Selected balances: <strong class="font-semibold text-slate-700 dark:text-slate-200">GHS {{ formatGhs(selectedPrincipalUnits) }}</strong></span><span>Outstanding amounts in non-GHS currency are translated using the imprest’s stored sell rate.</span></div>
    </section>

    <section class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800">
        <div class="flex items-start gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300"><Banknote :size="17" /></span><div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Payroll loan conversion register</h2><p class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Saved drafts reserve their source balances. Converted records close the linked imprest balance.</p></div></div>
        <span class="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300"><ClipboardList :size="13" />{{ conversions.length }} record{{ conversions.length === 1 ? '' : 's' }}</span>
      </div>
      <div v-if="!filteredConversions.length" class="px-5 py-10 text-center"><Search :size="20" class="mx-auto text-slate-300" /><p class="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">No payroll-loan conversions yet</p><p class="mt-1 text-[10px] text-slate-400">Save a draft above to see it in this register.</p></div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left">
          <thead class="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:bg-slate-900/50"><tr><th class="px-5 py-3">Conversion / Employee</th><th class="px-4 py-3">Loan type</th><th class="px-4 py-3">Loan date</th><th class="px-4 py-3 text-right">Principal · GHS</th><th class="px-4 py-3 text-right">Monthly · GHS</th><th class="px-4 py-3">Deduction starts</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Action</th></tr></thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="conversion in filteredConversions" :key="conversion.id" class="transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40" :class="selectedConversionId === conversion.id ? 'bg-brand-50/60 dark:bg-brand-950/20' : ''">
              <td class="px-5 py-3.5"><button type="button" class="text-left" @click="selectConversion(conversion)"><span class="block font-mono text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300">{{ conversion.conversionNumber }}</span><span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">{{ conversion.employeeName }} <span class="text-[10px] text-slate-400">· {{ conversion.employeeIdentifier }}</span></span></button></td>
              <td class="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{{ conversion.loanTypeName }}</td>
              <td class="px-4 py-3.5 text-xs text-slate-500">{{ formatDate(conversion.loanDate) }}</td>
              <td class="px-4 py-3.5 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatGhs(parseLedgerAmount(conversion.principalAmountGhs) ?? BigInt(0)) }}</td>
              <td class="px-4 py-3.5 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{{ formatGhs(parseLedgerAmount(conversion.monthlyDeductionGhs) ?? BigInt(0)) }}</td>
              <td class="px-4 py-3.5 text-xs text-slate-500">{{ formatDate(conversion.deductionStarts) }}<span v-if="conversion.deductThisMonth" class="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">This month</span></td>
              <td class="px-4 py-3.5"><span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="conversion.status === 'converted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300'">{{ conversion.status === 'converted' ? 'Converted' : 'Draft' }}</span></td>
              <td class="px-4 py-3.5 text-right"><div class="flex justify-end gap-1"><button type="button" class="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="`Select conversion ${conversion.conversionNumber}`" title="Select conversion" @click="selectConversion(conversion)"><Eye :size="14" /></button><button v-if="conversion.status === 'draft'" type="button" class="rounded-md p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40" :aria-label="`Edit ${conversion.conversionNumber}`" title="Edit draft" @click="loadConversion(conversion)"><Pencil :size="14" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col justify-between gap-1 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800"><span>Monthly deduction is rounded down to the ledger’s six-decimal precision; the final instalment adjusts for any remainder.</span><span>Demo register · not a live payroll loan ledger</span></div>
    </section>

    <div v-if="confirmation" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" role="presentation" @click.self="confirmation = null">
      <section role="dialog" aria-modal="true" aria-labelledby="conversion-confirm-title" class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#172321] sm:p-6">
        <div class="flex gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="confirmation.action === 'convert' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/25 dark:text-rose-300'"><CircleAlert :size="19" /></span><div><h2 id="conversion-confirm-title" class="text-sm font-semibold text-slate-900 dark:text-white">{{ confirmation.action === 'convert' ? 'Convert outstanding balance?' : 'Delete payroll-js-loan draft?' }}</h2><p class="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ confirmation.action === 'convert' ? 'This will mark the selected source balances as converted and lock this local preview record. Payroll and GL integrations are not connected.' : 'This draft will be removed and the reserved imprest balances will become available again.' }}</p></div></div>
        <div class="mt-5 flex justify-end gap-2"><button type="button" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="confirmation = null">Cancel</button><button type="button" class="h-9 rounded-lg px-3.5 text-xs font-semibold text-white" :class="confirmation.action === 'convert' ? 'bg-brand-700 hover:bg-brand-800' : 'bg-rose-600 hover:bg-rose-700'" @click="confirmAction">{{ confirmation.action === 'convert' ? 'Convert balance' : 'Delete draft' }}</button></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.toolbar-button {
  display: inline-flex;
  height: 2rem;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.375rem;
  padding: 0 0.625rem;
  color: rgb(71 85 105);
  font-size: 0.6875rem;
  font-weight: 600;
  transition: background-color 120ms ease, color 120ms ease;
}
.toolbar-button:hover:not(:disabled) { background-color: rgb(241 245 249); color: rgb(15 23 42); }
.toolbar-button:disabled { cursor: not-allowed; opacity: 0.4; }
:global(.dark) .toolbar-button { color: rgb(203 213 225); }
:global(.dark) .toolbar-button:hover:not(:disabled) { background-color: rgb(30 41 59); color: white; }
.field-label { display: block; margin-bottom: 0.375rem; font-size: 0.6875rem; font-weight: 600; color: rgb(71 85 105); }
:global(.dark) .field-label { color: rgb(203 213 225); }
.form-control { display: block; height: 2.5rem; width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); background-color: white; padding-right: 0.75rem; padding-left: 0.75rem; font-size: 0.75rem; outline: none; transition: border-color 120ms ease, box-shadow 120ms ease; }
.form-control:focus { border-color: rgb(20 184 166); box-shadow: 0 0 0 3px rgb(20 184 166 / 0.12); }
:global(.dark) .form-control { border-color: rgb(51 65 85); background-color: rgb(15 23 42); color: rgb(226 232 240); }
</style>
