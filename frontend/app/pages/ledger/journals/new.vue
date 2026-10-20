<script setup lang="ts">
import { ArrowLeft, Plus, Trash2, Save } from '@lucide/vue'
import { toRaw } from 'vue'
import {
  journalDeficit,
  journalBalancingAmounts,
} from '../../../features/ledger/journal-deficit'
import {
  emptyJournalOptions,
  journalLineInput,
  type Journal,
  type JournalLine,
} from '../../../features/ledger/journal-types'
import { useJournals } from '../../../features/ledger/useJournals'
import {
  parseLedgerAmount,
  parseLedgerRate,
  convertLedgerAmount,
  formatLedgerAmount,
  LEDGER_RATE_SCALE,
} from '../../../features/ledger/money'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Journal editor' })
const api = useJournals(),
  { unitId } = api,
  route = useRoute()
const editingId = typeof route.query.id === 'string' ? route.query.id : ''
const units = ref<Awaited<ReturnType<typeof api.units>>>([]),
  options = ref(emptyJournalOptions()),
  original = ref<Journal | null>(null)
const loading = ref(true),
  loaded = ref(false),
  saving = ref(false),
  error = ref(''),
  saveError = ref('')
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const form = reactive({
    batchDate: today(),
    description: '',
    isMultiCurrency: false,
  }),
  lines = ref<JournalLine[]>([])
// Header selectors are bulk/default controls. The authoritative dimensions
// remain on each persisted line; mixed imported/edited journals stay mixed.
const header = reactive({ currencyId: '', costCenterId: null as string | null })
const batchNumber = ref('')
const mixedCostCenters = '__mixed__'
function applyHeaderCostCenter() {
  if (header.costCenterId === mixedCostCenters) return
  for (const line of lines.value) line.costCenterId = header.costCenterId
}
function applyHeaderCurrency() {
  if (form.isMultiCurrency || !header.currencyId) return
  for (const line of lines.value) {
    if (line.currencyId !== header.currencyId) {
      line.currencyId = header.currencyId
      selectCurrency(line)
    }
  }
}
function changeMode() {
  if (!form.isMultiCurrency) {
    header.currencyId = options.value.baseCurrencyId
    applyHeaderCurrency()
  }
}
const readonly = computed(() =>
  Boolean(original.value && original.value.status !== 'draft'),
)
const baseCode = computed(
  () =>
    options.value.currencies.find((c) => c.id === options.value.baseCurrencyId)
      ?.code || 'Unavailable',
)
const max = 99999999999999999999n
const message = (e: any) =>
  e?.data?.statusMessage || 'Request failed. Please retry.'
let version = 0,
  initialized = false
function blank(): JournalLine {
  return {
    accountId: '',
    currencyId: header.currencyId || options.value.baseCurrencyId,
    costCenterId:
      header.costCenterId === mixedCostCenters ? null : header.costCenterId,
    exchangeRate:
      !header.currencyId || header.currencyId === options.value.baseCurrencyId
        ? '1'
        : '',
    debit: '0',
    credit: '0',
    description: '',
    referenceNumber: '',
    chequeNumber: '',
    transactionDate: form.batchDate,
  }
}
// Only suggested amounts are recalculated on currency/rate changes. Once a user
// types an amount, their input is authoritative and is never overwritten.
const suggestedDeficits = new WeakMap<JournalLine, bigint>()
function stopSuggestion(line: JournalLine) {
  suggestedDeficits.delete(toRaw(line))
}
function refreshSuggestion(line: JournalLine) {
  const deficit = suggestedDeficits.get(toRaw(line))
  if (deficit === undefined) return
  const amounts = journalBalancingAmounts(deficit, line.exchangeRate)
  line.debit = amounts?.debit || '0'
  line.credit = amounts?.credit || '0'
  const remainder =
    'The FX rate leaves a rounding remainder. Review the base totals before posting, or use a base-currency account.'
  const unavailable =
    'The deficit cannot be represented at this exchange rate. Use a base-currency account or enter the amount manually.'
  if (amounts && !amounts.exact) saveError.value = remainder
  else if (!amounts && (parseLedgerRate(line.exchangeRate) || 0n) > 0n)
    saveError.value = unavailable
  else if (saveError.value === remainder || saveError.value === unavailable)
    saveError.value = ''
}
function selectCurrency(line: JournalLine) {
  const account = options.value.accounts.find((a) => a.id === line.accountId)
  // A currency is selectable before the GL, but cannot override a fixed GL currency.
  if (account && account.currencyId !== line.currencyId) line.accountId = ''
  line.exchangeRate =
    line.currencyId === options.value.baseCurrencyId ? '1' : ''
  refreshSuggestion(line)
}
function selectAccount(line: JournalLine) {
  const account = options.value.accounts.find((a) => a.id === line.accountId)
  const previousCurrency = line.currencyId
  line.currencyId = account?.currencyId || previousCurrency
  if (line.currencyId === options.value.baseCurrencyId) line.exchangeRate = '1'
  else if (line.currencyId !== previousCurrency) line.exchangeRate = ''
  refreshSuggestion(line)
}
function addLine() {
  if (saving.value || readonly.value || lines.value.length >= 500) return
  saveError.value = ''
  const deficit = journalDeficit(lines.value),
    line = blank()
  if (deficit === null) {
    saveError.value =
      'The new line is blank because an existing amount or exchange rate is invalid. Correct those fields before calculating a balancing amount.'
  } else if (deficit !== 0n) {
    suggestedDeficits.set(line, deficit)
    refreshSuggestion(line)
  }
  lines.value.push(line)
}
function base(l: JournalLine, side: 'debit' | 'credit') {
  const value = parseLedgerAmount(l[side], true),
    rate = parseLedgerRate(l.exchangeRate)
  return value === null || rate === null || rate <= 0n
    ? null
    : convertLedgerAmount(value, rate)
}
const totals = computed(() => ({
  debit: lines.value.reduce((s, l) => s + (base(l, 'debit') || 0n), 0n),
  credit: lines.value.reduce((s, l) => s + (base(l, 'credit') || 0n), 0n),
}))
function realDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s < '1900-01-01' || s > '2999-12-31')
    return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}
const issues = computed(() => {
  const e: string[] = []
  if (
    !form.description.trim() ||
    new TextEncoder().encode(form.description.trim()).length > 200
  )
    e.push('Enter a description of 1–200 bytes.')
  if (!realDate(form.batchDate)) e.push('Enter a valid batch date (1900–2999).')
  if (lines.value.length < 2 || lines.value.length > 500)
    e.push('Use 2–500 journal lines.')
  lines.value.forEach((l, i) => {
    const a = options.value.accounts.find((a) => a.id === l.accountId),
      d = parseLedgerAmount(l.debit, true),
      c = parseLedgerAmount(l.credit, true),
      r = parseLedgerRate(l.exchangeRate)
    const prefix = `Line ${i + 1}: `
    if (
      !a ||
      a.currencyId !== l.currencyId ||
      !options.value.currencies.some((c) => c.id === l.currencyId)
    )
      e.push(prefix + 'select an active manual-postable GL and its currency.')
    if (!form.isMultiCurrency && l.currencyId !== options.value.baseCurrencyId)
      e.push(prefix + 'a foreign account requires multi-currency mode.')
    if (!realDate(l.transactionDate))
      e.push(prefix + 'enter a valid transaction date.')
    if (d === null || c === null || (d === 0n) === (c === 0n))
      e.push(
        prefix +
          'enter exactly one positive debit or credit (up to 6 decimals); the other side must be 0.',
      )
    if (r === null || r <= 0n || r > max)
      e.push(
        prefix +
          'enter a positive exchange rate (up to 10 integer and 10 fractional digits).',
      )
    if (
      l.currencyId === options.value.baseCurrencyId &&
      r !== LEDGER_RATE_SCALE
    )
      e.push(prefix + 'the base-currency rate must be 1.')
    const bd = base(l, 'debit'),
      bc = base(l, 'credit')
    if (
      bd !== null &&
      bc !== null &&
      (bd > max || bc > max || ((d || 0n) + (c || 0n) > 0n && bd + bc === 0n))
    )
      e.push(prefix + 'converted amount overflows or rounds to zero.')
    if (
      new TextEncoder().encode(l.description.trim()).length > 300 ||
      new TextEncoder().encode(l.referenceNumber.trim()).length > 40 ||
      new TextEncoder().encode(l.chequeNumber.trim()).length > 40
    )
      e.push(
        prefix +
          'description limit 300 bytes; reference/cheque limit 40 bytes.',
      )
  })
  if (totals.value.debit > max || totals.value.credit > max)
    e.push('Base totals exceed numeric(20,6).')
  return e
})
async function load() {
  const current = ++version,
    unit = unitId.value
  loaded.value = false
  original.value = null
  options.value = emptyJournalOptions()
  lines.value = []
  error.value = ''
  saveError.value = ''
  batchNumber.value = ''
  header.currencyId = ''
  header.costCenterId = null
  if (!unit) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [o, row, preview] = await Promise.all([
      api.options(unit),
      editingId ? api.get(editingId, unit) : Promise.resolve(null),
      editingId ? Promise.resolve(null) : api.nextNumber(unit),
    ])
    if (current !== version) return
    options.value = o
    original.value = row
    Object.assign(form, {
      batchDate: row?.batchDate || today(),
      description: row?.description || '',
      isMultiCurrency: row?.isMultiCurrency || false,
    })
    batchNumber.value = row?.batchNumber || preview?.batchNumber || ''
    if (row) {
      const currencies = new Set(row.lines.map((line) => line.currencyId))
      const centers = new Set(
        row.lines.map((line) => line.costCenterId || null),
      )
      header.currencyId =
        currencies.size === 1 ? row.lines[0]?.currencyId || '' : ''
      header.costCenterId =
        centers.size === 1
          ? row.lines[0]?.costCenterId || null
          : mixedCostCenters
    } else header.currencyId = o.baseCurrencyId
    lines.value = row ? row.lines.map((l) => ({ ...l })) : [blank(), blank()]
    loaded.value = true
  } catch (e) {
    if (current === version) error.value = message(e)
  } finally {
    if (current === version) loading.value = false
  }
}
onMounted(async () => {
  try {
    units.value = await api.units()
    const queryUnit =
      typeof route.query.accountingUnitId === 'string'
        ? route.query.accountingUnitId
        : ''
    if (queryUnit) unitId.value = queryUnit
    if (unitId.value && !units.value.some((u) => u.id === unitId.value))
      throw new Error('Unit unavailable')
    await load()
  } catch (e) {
    error.value = message(e)
    loading.value = false
  } finally {
    initialized = true
  }
})
watch(unitId, () => {
  if (initialized) void load()
})
onUnmounted(() => version++)
async function save() {
  if (saving.value || readonly.value || !loaded.value) return
  saveError.value = ''
  if (issues.value.length) {
    saveError.value = issues.value[0]
    return
  }
  const current = version
  const body = {
    accountingUnitId: unitId.value,
    ...form,
    periodId: original.value?.periodId || null,
    ...(original.value ? { version: original.value.version } : {}),
    lines: lines.value.map((l) => ({
      ...journalLineInput(l),
      debit: formatLedgerAmount(parseLedgerAmount(l.debit, true)!),
      credit: formatLedgerAmount(parseLedgerAmount(l.credit, true)!),
      exchangeRate: (() => {
        const r = parseLedgerRate(l.exchangeRate)!
        return `${r / LEDGER_RATE_SCALE}.${String(r % LEDGER_RATE_SCALE).padStart(10, '0')}`
      })(),
    })),
  }
  saving.value = true
  try {
    if (editingId)
      await api.request<Journal>(`/api/ledger/journals/${editingId}`, {
        method: 'PUT',
        body,
      })
    else
      await api.request<Journal>('/api/ledger/journals', {
        method: 'POST',
        body,
      })
    if (current === version) await navigateTo('/ledger/journals')
  } catch (e) {
    if (current === version) saveError.value = message(e)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="space-y-5">
    <NuxtLink
      to="/ledger/journals"
      class="inline-flex items-center gap-2 text-xs text-slate-500"
      ><ArrowLeft :size="14" />Back to journals</NuxtLink
    >
    <header>
      <p class="text-xs text-slate-400">General Ledger / Journal entry</p>
      <h1 class="mt-2 text-3xl font-semibold">
        {{
          readonly
            ? 'View journal'
            : editingId
              ? 'Edit draft journal'
              : 'New journal'
        }}
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ original?.batchNumber || 'Batch number is assigned on save.' }} ·
        Base currency: {{ baseCode
        }}<span v-if="original">
          · {{ original.status }} · version {{ original.version }}</span
        >
      </p>
    </header>
    <div class="flex items-end gap-3">
      <label class="text-xs font-semibold"
        >Accounting unit<select
          v-model="unitId"
          :disabled="loading || saving || Boolean(editingId)"
          class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        >
          <option value="">Select an accounting unit</option>
          <option v-for="u in units" :key="u.id" :value="u.id">
            {{ u.code }} · {{ u.name }}
          </option>
        </select></label
      ><button
        v-if="unitId"
        :disabled="loading || saving"
        class="h-10 rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700"
        @click="load"
      >
        Reload
      </button>
    </div>
    <p v-if="loading" role="status" class="text-sm text-slate-400">
      Loading journal…
    </p>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
    >
      {{ error }}
    </p>
    <p v-if="!unitId && !loading" class="text-sm text-slate-400">
      Select an accounting unit to enter a journal.
    </p>
    <form v-if="loaded" @submit.prevent="save">
      <fieldset :disabled="saving || readonly" class="min-w-0 space-y-5">
        <section
          class="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:grid-cols-2"
        >
          <label class="text-xs font-semibold"
            >Batch number
            <input
              :value="batchNumber"
              aria-label="Batch number"
              readonly
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono dark:border-slate-700 dark:bg-slate-900"
            />
            <span
              v-if="!original"
              class="mt-1 block text-[10px] font-normal text-slate-400"
              >Preview only — the server assigns the final number on save.</span
            >
          </label>
          <label class="text-xs font-semibold"
            >Header currency
            <select
              v-model="header.currencyId"
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
              @change="applyHeaderCurrency"
            >
              <option value="" disabled>
                Mixed currencies — choose a new-line default
              </option>
              <option
                v-if="
                  header.currencyId &&
                  !options.currencies.some((c) => c.id === header.currencyId)
                "
                :value="header.currencyId"
                disabled
              >
                Unavailable currency (replace)
              </option>
              <option
                v-for="currency in options.currencies"
                :key="currency.id"
                :value="currency.id"
                :disabled="
                  !form.isMultiCurrency &&
                  currency.id !== options.baseCurrencyId
                "
              >
                {{ currency.code }} · {{ currency.name }}
              </option>
            </select>
            <span class="mt-1 block text-[10px] font-normal text-slate-400">{{
              form.isMultiCurrency
                ? 'New-line default only; existing line currencies/rates are preserved.'
                : 'Applies to every line. Local mode uses the accounting unit’s base currency.'
            }}</span>
          </label>
          <label class="text-xs font-semibold"
            >Header cost center
            <select
              v-model="header.costCenterId"
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
              @change="applyHeaderCostCenter"
            >
              <option
                v-if="header.costCenterId === mixedCostCenters"
                :value="mixedCostCenters"
                disabled
              >
                Mixed cost centers — choose to apply to all
              </option>
              <option :value="null">Not configured</option>
              <option
                v-if="
                  header.costCenterId &&
                  header.costCenterId !== mixedCostCenters &&
                  !options.costCenters.some((c) => c.id === header.costCenterId)
                "
                :value="header.costCenterId"
              >
                Unavailable cost center (replace)
              </option>
              <option
                v-for="center in options.costCenters"
                :key="center.id"
                :value="center.id"
              >
                {{ center.name }}
              </option>
            </select>
            <span class="mt-1 block text-[10px] font-normal text-slate-400"
              >Applies to every line, including when cleared; new lines inherit
              it.</span
            >
          </label>
          <label class="text-xs font-semibold"
            >Batch date<input
              v-model="form.batchDate"
              required
              type="date"
              min="1900-01-01"
              max="2999-12-31"
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label
          ><label class="text-xs font-semibold"
            >Description<input
              v-model="form.description"
              required
              maxlength="200"
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label
          ><label class="flex items-center gap-2 text-xs"
            ><input
              v-model="form.isMultiCurrency"
              type="checkbox"
              @change="changeMode"
            />Multi-currency journal</label
          >
          <p class="text-xs text-slate-400">
            {{
              form.isMultiCurrency
                ? 'Rates are explicit: 1 unit of transaction currency × rate = base currency. No demo rates are supplied.'
                : 'Local journals use only base-currency accounts at rate 1.'
            }}
          </p>
        </section>
        <section class="space-y-4">
          <header class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">
              Journal lines
              <span class="text-slate-400">({{ lines.length }})</span>
            </h2>
            <button
              v-if="!readonly"
              type="button"
              :disabled="lines.length >= 500"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
              @click="addLine"
            >
              <Plus :size="14" />Add line
            </button>
          </header>
          <article
            v-for="(l, i) in lines"
            :key="l.id || i"
            class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]"
            :aria-label="`Journal line ${i + 1}`"
          >
            <header class="mb-3 flex items-center justify-between">
              <h3 class="text-xs font-semibold">Line {{ i + 1 }}</h3>
              <button
                v-if="!readonly"
                type="button"
                :disabled="lines.length <= 2"
                :aria-label="`Remove line ${i + 1}`"
                class="p-1 text-rose-500 disabled:opacity-30"
                @click="lines.splice(i, 1)"
              >
                <Trash2 :size="14" />
              </button>
            </header>
            <div
              class="journal-amount-fields grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-8"
            >
              <label class="min-w-0 text-[11px] xl:col-span-3"
                >GL account
                <select
                  v-model="l.accountId"
                  required
                  class="journal-input"
                  @change="selectAccount(l)"
                >
                  <option value="">Select a GL account</option>
                  <option
                    v-if="
                      l.accountId &&
                      !options.accounts.some((a) => a.id === l.accountId)
                    "
                    :value="l.accountId"
                  >
                    {{ l.accountName || 'Unavailable account (replace)' }}
                  </option>
                  <option
                    v-for="a in options.accounts.filter(
                      (a) =>
                        form.isMultiCurrency ||
                        a.currencyId === options.baseCurrencyId,
                    )"
                    :key="a.id"
                    :value="a.id"
                  >
                    {{ a.accountNumber }} · {{ a.name }}
                  </option>
                </select>
              </label>
              <label class="min-w-0 text-[11px]"
                >Transaction date
                <input
                  v-model="l.transactionDate"
                  required
                  type="date"
                  min="1900-01-01"
                  max="2999-12-31"
                  class="journal-input"
                />
              </label>
              <label class="min-w-0 text-[11px]"
                >Currency
                <select
                  v-model="l.currencyId"
                  required
                  class="journal-input"
                  @change="selectCurrency(l)"
                >
                  <option value="" disabled>Select currency</option>
                  <option
                    v-if="
                      l.currencyId &&
                      !options.currencies.some((c) => c.id === l.currencyId)
                    "
                    :value="l.currencyId"
                  >
                    {{ l.currencyCode || 'Unavailable (replace)' }}
                  </option>
                  <option
                    v-for="c in options.currencies.filter(
                      (c) =>
                        form.isMultiCurrency || c.id === options.baseCurrencyId,
                    )"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.code }}
                  </option>
                </select>
              </label>
              <label class="min-w-0 text-[11px]"
                >Exchange rate
                <input
                  v-model="l.exchangeRate"
                  required
                  :readonly="l.currencyId === options.baseCurrencyId"
                  inputmode="decimal"
                  class="journal-input"
                  @input="refreshSuggestion(l)"
                />
              </label>
              <label class="min-w-0 text-[11px]"
                >Debit
                <input
                  v-model="l.debit"
                  inputmode="decimal"
                  class="journal-input font-mono"
                  @input="stopSuggestion(l)"
                />
              </label>
              <label class="min-w-0 text-[11px]"
                >Credit
                <input
                  v-model="l.credit"
                  inputmode="decimal"
                  class="journal-input font-mono"
                  @input="stopSuggestion(l)"
                />
              </label>
            </div>
            <div
              class="journal-detail-fields mt-3 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-8"
            >
              <label class="min-w-0 text-[11px] xl:col-span-2"
                >Cost center
                <select v-model="l.costCenterId" class="journal-input">
                  <option :value="null">Not configured</option>
                  <option
                    v-if="
                      l.costCenterId &&
                      !options.costCenters.some((c) => c.id === l.costCenterId)
                    "
                    :value="l.costCenterId"
                  >
                    Unavailable (replace)
                  </option>
                  <option
                    v-for="c in options.costCenters"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </option>
                </select>
              </label>
              <label class="min-w-0 text-[11px]"
                >Reference
                <input
                  v-model="l.referenceNumber"
                  maxlength="40"
                  class="journal-input"
                />
              </label>
              <label class="min-w-0 text-[11px]"
                >Cheque number
                <input
                  v-model="l.chequeNumber"
                  maxlength="40"
                  class="journal-input"
                />
              </label>
              <label class="min-w-0 text-[11px] xl:col-span-4"
                >Line description
                <input
                  v-model="l.description"
                  maxlength="300"
                  class="journal-input"
                />
              </label>
            </div>
            <div
              class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-300"
            >
              <span
                >Base debit:
                <span class="font-mono">{{
                  base(l, 'debit') === null
                    ? 'Invalid'
                    : formatLedgerAmount(base(l, 'debit')!)
                }}</span></span
              >
              <span
                >Base credit:
                <span class="font-mono">{{
                  base(l, 'credit') === null
                    ? 'Invalid'
                    : formatLedgerAmount(base(l, 'credit')!)
                }}</span></span
              >
            </div>
            <p
              v-if="l.organizationUnitId"
              class="mt-2 text-[10px] text-slate-400"
            >
              Legacy organization retained:
              {{ l.organizationUnitName || l.organizationUnitId }}
            </p>
          </article>
        </section>
      </fieldset>
      <section
        class="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e]"
      >
        <div class="flex flex-wrap justify-between gap-3 text-xs font-bold">
          <p>
            Base debit
            <strong class="ml-2 font-mono">{{
              formatLedgerAmount(totals.debit)
            }}</strong>
          </p>
          <p>
            Base credit
            <strong class="ml-2 font-mono">{{
              formatLedgerAmount(totals.credit)
            }}</strong>
          </p>
          <p
            :class="
              totals.debit === totals.credit
                ? 'text-emerald-600'
                : 'text-amber-600'
            "
          >
            {{
              totals.debit === totals.credit
                ? 'Balanced'
                : 'Unbalanced draft — correct before posting'
            }}
          </p>
        </div>
        <p class="text-xs text-slate-400">
          Drafts may be unbalanced, but every line must be valid. Only final
          posting affects balances. New organizational-unit assignments are
          unavailable until a real catalog is connected.
        </p>
        <details
          v-if="!readonly && issues.length"
          class="text-xs text-amber-700"
        >
          <summary>
            {{ issues.length }} field issue(s) — expand for details
          </summary>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li v-for="issue in issues" :key="issue">{{ issue }}</li>
          </ul>
        </details>
        <p v-if="saveError" role="alert" class="text-xs text-rose-600">
          {{ saveError }}
        </p>
        <div class="flex justify-end gap-3">
          <NuxtLink
            to="/ledger/journals"
            class="rounded-lg border border-slate-200 px-4 py-2 text-xs dark:border-slate-700"
            >{{ readonly ? 'Back' : 'Cancel' }}</NuxtLink
          ><button
            v-if="!readonly"
            type="submit"
            :disabled="saving || issues.length > 0"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Save :size="14" />{{
              saving ? 'Saving…' : editingId ? 'Save changes' : 'Save draft'
            }}
          </button>
        </div>
      </section>
    </form>
  </div>
</template>
<style scoped>
.journal-input {
  display: block;
  margin-top: 0.375rem;
  height: 2.5rem;
  width: 100%;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  background: transparent;
  font-size: 0.75rem;
}
:global(.dark) .journal-input {
  border-color: #334155;
}
</style>
