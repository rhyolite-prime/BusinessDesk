<script setup lang="ts">
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from '@lucide/vue'
import type { LedgerDefaultGlNumbers } from '../../../features/ledger/setup-data'

definePageMeta({ layout: 'admin-ledger' })

type DefaultGlSelectionKey = Exclude<keyof LedgerDefaultGlNumbers, 'id' | 'vatRate'>
type MappingSource = 'account' | 'bank' | 'category'
interface DefaultGlField {
  key: DefaultGlSelectionKey
  label: string
  source: MappingSource
}
interface DefaultGlSection {
  title: string
  description: string
  fields: DefaultGlField[]
  includesVatRate?: boolean
}
interface MappingOption {
  value: string
  label: string
}
type DefaultGlFormValues = Omit<LedgerDefaultGlNumbers, 'vatRate'> & { vatRatePercent: number }

useHead({ title: 'Default GL Numbers' })
const request = useRequestFetch(), defaults = ref<LedgerDefaultGlNumbers | null>(null)
const units = ref<{ id: string; name: string; code: string; isActive: boolean }[]>([]), unitId = useState<string>('ledger-accounting-unit', () => '')
const choices = ref<Record<MappingSource, MappingOption[]>>({ account: [], bank: [], category: [] })
const loading = ref(true), saving = ref(false), loaded = ref(false), loadError = ref(''), deleteError = ref('')
let loadVersion = 0
const errorMessage = (e: any) => e?.data?.statusMessage || 'Request failed. Please retry.'
function normalize(row: any): LedgerDefaultGlNumbers {
  const result = { ...row }
  for (const field of allMappingFields) result[field.key] = row[field.key] ?? ''
  return result
}
async function loadDefaults() {
  const version = ++loadVersion, unit = unitId.value
  defaults.value = null; loaded.value = false; choices.value = { account: [], bank: [], category: [] }; loadError.value = ''; deleteError.value = ''; showForm.value = false; deleteConfirmOpen.value = false
  if (!unit) { loading.value = false; return }
  loading.value = true
  try {
    const [rows, options] = await Promise.all([
      request<{ data: any[] }>('/api/ledger/default-gl-numbers', { query: { accountingUnitId: unit } }),
      request<Record<MappingSource, MappingOption[]>>('/api/ledger/default-gl-numbers/options', { query: { accountingUnitId: unit } }),
    ])
    if (version !== loadVersion) return
    defaults.value = rows.data[0] ? normalize(rows.data[0]) : null; choices.value = options; loaded.value = true
  } catch (e) { if (version === loadVersion) loadError.value = errorMessage(e) }
  finally { if (version === loadVersion) loading.value = false }
}
async function loadUnits() {
  loading.value = true; loadError.value = ''
  try {
    const all: typeof units.value = []
    for (let pageNo = 1; ; pageNo++) {
      const r = await request<{ data: typeof units.value; totalPages: number }>('/api/ledger/accounting-units', { query: { pageNo, pageSize: 200 } })
      all.push(...r.data); if (pageNo >= r.totalPages || !r.data.length) break
      if (pageNo >= 50) throw new Error('Too many accounting units')
    }
    units.value = all.filter(u => u.isActive)
    if (unitId.value && !units.value.some(u => u.id === unitId.value)) unitId.value = ''
  } catch (e) { loadError.value = errorMessage(e) }
  finally { loading.value = false }
}
watch(unitId, () => { void loadDefaults() })
onMounted(async () => { await loadUnits(); if (unitId.value) await loadDefaults() })
onUnmounted(() => { loadVersion++ })
const showForm = ref(false)
const deleteConfirmOpen = ref(false)
const editingId = ref<string | null>(null)
const saveError = ref('')
const form = reactive<DefaultGlFormValues>({
  id: '',
  accountPayablesBankAccountId: '',
  payrollBankAccountId: '',
  salesBankAccountId: '',
  accountsReceivableBankAccountId: '',
  accountsReceivableAccountId: '',
  accountsPayableAccountId: '',
  withholdingTaxAccountId: '',
  imprestCategoryId: '',
  creditPurchasesAccountId: '',
  advanceFromCustomerAccountId: '',
  covidTaxReceivedAccountId: '',
  communicationsServiceTaxReceivedAccountId: '',
  inventoryAccountId: '',
  salesRevenueAccountId: '',
  stockPurchasesAccountId: '',
  currentEarningsAccountId: '',
  retainedEarningsAccountId: '',
  vatReceivedAccountId: '',
  vatRatePercent: 15,
  imprestGlAccountId: '',
  pettyCashGlAccountId: '',
  purchasesBankAccountId: '',
  advanceToSupplierAccountId: '',
  covidTaxPaidAccountId: '',
  communicationsServiceTaxPaidAccountId: '',
  goodsInTransitAccountId: '',
  unrealizedFxLossAccountId: '',
  unrealizedFxGainAccountId: '',
  realizedFxLossAccountId: '',
  realizedFxGainAccountId: '',
  vatPaidAccountId: '',
  getflReceivedAccountId: '',
  getflPaidAccountId: '',
  nhilReceivedAccountId: '',
  nhilPaidAccountId: '',
  socialSecurityEmployerPortionDefaultExpenseGl: '',
  socialSecurityEmployeePortionDefaultExpenseGl: '',
  socialSecurityEmployerPortionDefaultLiabilityGl: '',
  socialSecurityEmployeePortionDefaultLiabilityGl: '',
})

const mappingSections: DefaultGlSection[] = [
  {
    title: 'Cash and banking',
    description: 'Default bank accounts and cash-control references for day-to-day workflows.',
    fields: [
      { key: 'accountPayablesBankAccountId', label: 'Accounts Payable bank account', source: 'bank' },
      { key: 'payrollBankAccountId', label: 'Payroll bank account', source: 'bank' },
      { key: 'salesBankAccountId', label: 'Sales bank account', source: 'bank' },
      { key: 'accountsReceivableBankAccountId', label: 'Accounts Receivable bank account', source: 'bank' },
      { key: 'purchasesBankAccountId', label: 'Purchases bank account', source: 'bank' },
      { key: 'imprestCategoryId', label: 'Default imprest category', source: 'category' },
      { key: 'imprestGlAccountId', label: 'Imprest control account', source: 'account' },
      { key: 'pettyCashGlAccountId', label: 'Petty cash control account', source: 'account' },
    ],
  },
  {
    title: 'Core posting accounts',
    description: 'Customer, supplier, trading, inventory, and retained-result defaults.',
    fields: [
      { key: 'accountsReceivableAccountId', label: 'Accounts Receivable', source: 'account' },
      { key: 'accountsPayableAccountId', label: 'Accounts Payable', source: 'account' },
      { key: 'creditPurchasesAccountId', label: 'Credit purchases', source: 'account' },
      { key: 'advanceFromCustomerAccountId', label: 'Advances from customers', source: 'account' },
      { key: 'inventoryAccountId', label: 'Inventory', source: 'account' },
      { key: 'salesRevenueAccountId', label: 'Sales revenue', source: 'account' },
      { key: 'stockPurchasesAccountId', label: 'Stock purchases', source: 'account' },
      { key: 'currentEarningsAccountId', label: 'Current earnings', source: 'account' },
      { key: 'retainedEarningsAccountId', label: 'Retained earnings', source: 'account' },
      { key: 'advanceToSupplierAccountId', label: 'Advances to suppliers', source: 'account' },
      { key: 'goodsInTransitAccountId', label: 'Goods in transit', source: 'account' },
    ],
  },
  {
    title: 'Taxes and statutory accounts',
    description: 'Tax receipts, tax payments, and social-security posting defaults.',
    includesVatRate: true,
    fields: [
      { key: 'withholdingTaxAccountId', label: 'Withholding tax', source: 'account' },
      { key: 'vatReceivedAccountId', label: 'VAT received', source: 'account' },
      { key: 'vatPaidAccountId', label: 'VAT paid', source: 'account' },
      { key: 'covidTaxReceivedAccountId', label: 'COVID tax received', source: 'account' },
      { key: 'covidTaxPaidAccountId', label: 'COVID tax paid', source: 'account' },
      { key: 'communicationsServiceTaxReceivedAccountId', label: 'Communications service tax received', source: 'account' },
      { key: 'communicationsServiceTaxPaidAccountId', label: 'Communications service tax paid', source: 'account' },
      { key: 'getflReceivedAccountId', label: 'GETFL received', source: 'account' },
      { key: 'getflPaidAccountId', label: 'GETFL paid', source: 'account' },
      { key: 'nhilReceivedAccountId', label: 'NHIL received', source: 'account' },
      { key: 'nhilPaidAccountId', label: 'NHIL paid', source: 'account' },
      { key: 'socialSecurityEmployerPortionDefaultExpenseGl', label: 'SSNIT employer expense', source: 'account' },
      { key: 'socialSecurityEmployeePortionDefaultExpenseGl', label: 'SSNIT employee expense', source: 'account' },
      { key: 'socialSecurityEmployerPortionDefaultLiabilityGl', label: 'SSNIT employer liability', source: 'account' },
      { key: 'socialSecurityEmployeePortionDefaultLiabilityGl', label: 'SSNIT employee liability', source: 'account' },
    ],
  },
  {
    title: 'Foreign exchange accounts',
    description: 'Recognized and unrealized currency gain and loss defaults.',
    fields: [
      { key: 'unrealizedFxLossAccountId', label: 'Unrealized FX loss', source: 'account' },
      { key: 'unrealizedFxGainAccountId', label: 'Unrealized FX gain', source: 'account' },
      { key: 'realizedFxLossAccountId', label: 'Realized FX loss', source: 'account' },
      { key: 'realizedFxGainAccountId', label: 'Realized FX gain', source: 'account' },
    ],
  },
]
const allMappingFields = mappingSections.flatMap((section) => section.fields)
const totalBankMappings = computed(() => allMappingFields.filter((field) => field.source === 'bank').length)
const configuredMappingCount = computed(() => {
  const saved = defaults.value
  return saved ? allMappingFields.filter((field) => Boolean(saved[field.key])).length : 0
})
const configuredBankMappingCount = computed(() => {
  const saved = defaults.value
  return saved ? allMappingFields.filter((field) => field.source === 'bank' && Boolean(saved[field.key])).length : 0
})

function sourceOptions(field: DefaultGlField): MappingOption[] { return [...choices.value[field.source]] }

function optionsFor(field: DefaultGlField): MappingOption[] {
  const options = sourceOptions(field)
  const currentValue = form[field.key]
  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.unshift({ value: currentValue, label: `Unavailable reference · ${currentValue}` })
  }
  return options
}

function mappingLabel(setting: LedgerDefaultGlNumbers | null, field: DefaultGlField) {
  const id = setting?.[field.key]
  if (!id) return 'Not configured'
  return sourceOptions(field).find((option) => option.value === id)?.label || `Unavailable reference · ${id}`
}

function openEditor() {
  if (!loaded.value || loading.value || saving.value) return
  const existing = defaults.value
  editingId.value = existing?.id || null
  saveError.value = ''
  if (existing) {
    Object.assign(form, { id: existing.id, ...Object.fromEntries(allMappingFields.map(f => [f.key, existing[f.key]])), vatRatePercent: existing.vatRate * 100 })
  } else {
    Object.assign(form, {
      id: '',
      ...Object.fromEntries(allMappingFields.map((field) => [field.key, ''])),
      vatRatePercent: 15,
    })
  }
  showForm.value = true
}

function formatVatRate(vatRate: number) {
  return `${Number((vatRate * 100).toFixed(4))}%`
}

async function saveDefaults() {
  if (saving.value || !loaded.value) return
  saveError.value = ''
  const vatRatePercent = Number(form.vatRatePercent)
  if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
    saveError.value = 'Enter a VAT rate from 0 to 100 percent.'
    return
  }
  if (Math.abs(vatRatePercent * 10000 - Math.round(vatRatePercent * 10000)) > 0.000001) { saveError.value = 'VAT percentage supports up to four decimal places.'; return }
  saving.value = true
  try {
    const body = { accountingUnitId: unitId.value, vatRate: Number((vatRatePercent / 100).toFixed(6)), ...Object.fromEntries(allMappingFields.map(f => [f.key, form[f.key] || null])) }
    const row = editingId.value
      ? await request<LedgerDefaultGlNumbers>(`/api/ledger/default-gl-numbers/${editingId.value}`, { method: 'PUT', body })
      : await request<LedgerDefaultGlNumbers>('/api/ledger/default-gl-numbers', { method: 'POST', body })
    defaults.value = normalize(row); showForm.value = false
  } catch (e) { saveError.value = errorMessage(e) }
  finally { saving.value = false }
}

async function removeDefaults() {
  const id = defaults.value?.id
  if (!id || saving.value) return
  saving.value = true; deleteError.value = ''
  try {
    await request<{ id: string; isDeleted: boolean }>(`/api/ledger/default-gl-numbers/${id}`, { method: 'DELETE', query: { accountingUnitId: unitId.value } })
    defaults.value = null; deleteConfirmOpen.value = false
  } catch (e) { deleteError.value = errorMessage(e) }
  finally { saving.value = false }
}

</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div class="mb-2 text-xs font-medium text-slate-400">General Ledger <span class="mx-1 text-slate-300">/</span> Planning</div>
        <h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">Default GL Numbers</h1>
        <p class="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Set the default bank, ledger, tax, and cash-control accounts used by posting workflows.</p>
      </div>
      <button type="button" :disabled="saving || !loaded || loading" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-xs font-semibold text-white shadow-sm shadow-brand-900/15 hover:bg-brand-800" @click="openEditor"><Pencil v-if="defaults" :size="14" /><Plus v-else :size="15" />{{ defaults ? 'Edit defaults' : 'Set up defaults' }}</button>
    </section>

    <section class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]">
      <label class="min-w-[240px] text-xs font-semibold text-slate-600 dark:text-slate-300">Accounting unit<select v-model="unitId" :disabled="loading || saving" class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">Select an accounting unit</option><option v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.code }} · {{ unit.name }}</option></select></label>
      <button type="button"  :disabled="loading || saving" class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700" @click="unitId ? loadDefaults() : loadUnits()">Refresh</button>
      <p class="text-xs text-slate-400">One configuration per accounting unit. All reference choices come from the backend, not demo data.</p>
    </section>
    <p v-if="loading" role="status" class="text-sm text-slate-400">Loading Default GL Numbers…</p>
    <p v-if="loadError" role="alert" class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{{ loadError }}</p>
    <section v-if="loaded" class="grid gap-3 sm:grid-cols-3">
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Account and reference mappings</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ configuredMappingCount }} <span class="text-sm font-medium text-slate-400">/ {{ allMappingFields.length }}</span></p>
        <p class="mt-1 text-[11px] text-slate-400">GL accounts, bank accounts, and imprest category</p>
      </article>
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bank account links</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ configuredBankMappingCount }} <span class="text-sm font-medium text-slate-400">/ {{ totalBankMappings }}</span></p>
        <p class="mt-1 text-[11px] text-slate-400">Workflow-specific bank defaults</p>
      </article>
      <article class="rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
        <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400">VAT rate</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ defaults ? formatVatRate(defaults.vatRate) : '—' }}</p>
        <p class="mt-1 text-[11px] text-slate-400">{{ defaults ? 'Configured for this accounting unit' : 'No default setup saved' }}</p>
      </article>
    </section>

    <section v-if="defaults" class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#15201e]">
      <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Organization posting defaults</h2>
            <span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Saved</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Review the complete default mapping set by workflow.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" :disabled="saving" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="openEditor"><Pencil :size="13" /> Edit</button>
          <button type="button" :disabled="saving" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30" @click="deleteError = ''; deleteConfirmOpen = true"><Trash2 :size="13" /> Delete</button>
        </div>
      </div>

      <div class="grid gap-4 p-4 md:grid-cols-2 md:p-5">
        <section v-for="section in mappingSections" :key="section.title" class="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800">
          <div class="mb-3">
            <h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ section.title }}</h3>
            <p class="mt-1 text-[10px] leading-relaxed text-slate-400">{{ section.description }}</p>
          </div>
          <dl class="divide-y divide-slate-100 dark:divide-slate-800">
            <div v-for="field in section.fields" :key="field.key" class="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <dt class="text-[11px] text-slate-500 dark:text-slate-400">{{ field.label }}</dt>
              <dd class="max-w-[58%] text-right text-[11px] font-medium text-slate-800 dark:text-slate-200">{{ mappingLabel(defaults, field) }}</dd>
            </div>
            <div v-if="section.includesVatRate" class="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5 dark:border-slate-800">
              <dt class="text-[11px] text-slate-500 dark:text-slate-400">VAT rate</dt>
              <dd class="text-right text-[11px] font-medium text-slate-800 dark:text-slate-200">{{ formatVatRate(defaults.vatRate) }}</dd>
            </div>
          </dl>
        </section>
      </div>
      <div class="flex flex-col justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:flex-row dark:border-slate-800">
        <span>Empty mappings are allowed for workflows your organization does not use.</span>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <NuxtLink to="/ledger/accounts" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Chart of Account Detail →</NuxtLink>
          <NuxtLink to="/ledger/bank-accounts" class="font-semibold text-brand-700 hover:underline dark:text-brand-300">Bank Accounts →</NuxtLink>
        </div>
      </div>
    </section>

    <section v-else-if="loaded" class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-[#15201e]">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><span class="text-lg font-semibold">GL</span></div>
      <h2 class="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">No default GL numbers saved</h2>
      <p class="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">Add the bank, ledger, tax, and cash-control mappings used by your posting workflows.</p>
      <button type="button" :disabled="saving" class="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white hover:bg-brand-800" @click="openEditor"><Plus :size="14" /> Set up defaults</button>
    </section>

    <div v-if="showForm" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-5" role="presentation" @click.self="!saving && (showForm = false)">
      <section role="dialog" aria-modal="true" aria-labelledby="default-gl-form-title" class="flex h-[calc(100dvh-3rem)] max-h-[900px] w-full max-w-[1020px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div><h2 id="default-gl-form-title" class="text-lg font-semibold text-slate-900 dark:text-white">{{ editingId ? 'Edit Default GL Numbers' : 'Set up Default GL Numbers' }}</h2><p class="mt-1 text-xs text-slate-500">Choose a General Ledger account, bank account, or imprest category for each available default.</p></div>
          <button type="button" :disabled="saving" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close dialog" @click="showForm = false"><X :size="17" /></button>
        </header>
        <form class="flex min-h-0 flex-1 flex-col overflow-hidden" @submit.prevent="saveDefaults">
          <div data-testid="default-gl-form-scroll" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <fieldset :disabled="saving" class="min-w-0 space-y-4 p-4 sm:p-6">
            <section v-for="section in mappingSections" :key="section.title" class="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800">
              <div class="mb-3"><h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">{{ section.title }}</h3><p class="mt-1 text-[10px] text-slate-400">{{ section.description }}</p></div>
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label v-for="field in section.fields" :key="field.key" class="block min-w-0">
                  <span class="mb-1.5 block truncate text-[10px] font-semibold text-slate-600 dark:text-slate-300">{{ field.label }}</span>
                  <select v-model="form[field.key]" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-brand-900/30">
                    <option value="">Not configured</option>
                    <option v-for="option in optionsFor(field)" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
              </div>
              <div v-if="section.includesVatRate" class="mt-3 max-w-[calc(33.333%-0.5rem)] min-w-[210px]">
                <label class="block">
                  <span class="mb-1.5 block text-[10px] font-semibold text-slate-600 dark:text-slate-300">VAT rate (%)</span>
                  <input v-model.number="form.vatRatePercent" required type="number" min="0" max="100" step="0.0001" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-brand-900/30" />
                </label>
              </div>
            </section>
            <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ saveError }}</p>
          </fieldset>
          </div>
          <footer class="flex shrink-0 justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3 dark:border-slate-800 dark:bg-[#172321] sm:px-6">
            <p class="hidden self-center text-[10px] text-slate-400 sm:block">Only select defaults used by your organization's workflows.</p>
            <div class="ml-auto flex gap-2">
              <button type="button" :disabled="saving" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="showForm = false">Cancel</button>
              <button type="submit" :disabled="saving" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-xs font-semibold text-white hover:bg-brand-800"><Check :size="14" />{{ editingId ? 'Save changes' : 'Save defaults' }}</button>
            </div>
          </footer>
        </form>
      </section>
    </div>

    <div v-if="deleteConfirmOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="!saving && (deleteConfirmOpen = false)">
      <section role="dialog" aria-modal="true" aria-labelledby="default-gl-delete-title" class="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#172321]">
        <h2 id="default-gl-delete-title" class="text-base font-semibold text-slate-900 dark:text-white">Delete Default GL Numbers?</h2>
        <p class="mt-2 text-sm text-slate-500">This removes the accounting-unit default mapping set by soft deletion. Posting workflows will have no default accounts until a new setup is saved.</p>
        <p v-if="deleteError" role="alert" class="mt-3 text-xs text-rose-600">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" :disabled="saving" class="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300" @click="deleteConfirmOpen = false">Cancel</button>
          <button type="button" :disabled="saving" class="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700" @click="removeDefaults">Delete defaults</button>
        </div>
      </section>
    </div>
  </div>
</template>
