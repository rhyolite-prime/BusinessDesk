<script setup lang="ts">
import { ArrowLeft, Plus, Trash2, Save } from '@lucide/vue'
import { toRaw } from 'vue'
import { costCenterOptions } from '../../../features/ledger/cost-center-options'
import { journalRateDisplay } from '../../../features/ledger/journal-rate-display'
import {
  suggestBatchDescription,
  suggestLineDescription,
} from '../../../features/ledger/journal-descriptions'
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
const displayLedgerAmount = (value: bigint) => formatDecimalAmount(formatLedgerAmount(value))
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
// Header cost center is a bulk/default control; currency is GL-resolved.
// Persisted dimensions remain authoritative on each line.
const header = reactive({ costCenterId: null as string | null })
const batchNumber = ref('')
const mixedCostCenters = '__mixed__'
const centerChoices = computed(() => costCenterOptions(options.value.costCenters))
function applyHeaderCostCenter() {
  if (header.costCenterId === mixedCostCenters) return
  for (const line of lines.value) line.costCenterId = header.costCenterId
}
function changeMode() {
  if (!form.isMultiCurrency) {
    for (const line of lines.value) {
      const account = options.value.accounts.find(
        (a) => a.id === line.accountId,
      )
      if (account?.currencyId !== options.value.baseCurrencyId)
        line.accountId = ''
      if (line.currencyId !== options.value.baseCurrencyId) {
        line.debit = '0'
        line.credit = '0'
        stopSuggestion(line)
      }
      line.currencyId = options.value.baseCurrencyId
      void lookupRate(line)
    }
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
const manualHeaderDescription = ref(false)
const manualLineDescriptions = new WeakSet<JournalLine>()
const lineElements = new WeakMap<JournalLine, HTMLElement>()
let scrollRequest = 0
function registerLine(line: JournalLine, element: unknown) {
  if (element instanceof HTMLElement) lineElements.set(toRaw(line), element)
  else lineElements.delete(toRaw(line))
}
function blank(): JournalLine {
  const currencyId = options.value.baseCurrencyId
  return {
    accountId: '',
    currencyId,
    costCenterId:
      header.costCenterId === mixedCostCenters ? null : header.costCenterId,
    exchangeRate: '1',
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
// Transaction amounts are the persisted source; local amounts are exact derived
// previews. Never sum foreign amounts belonging to different currencies.
const manualAmounts = reactive(new WeakSet<JournalLine>())
function foreignLine(line: JournalLine) {
  return line.currencyId !== options.value.baseCurrencyId
}
function inputAmount(line: JournalLine, side: 'debit' | 'credit') {
  manualAmounts.add(toRaw(line))
  stopSuggestion(line)
  const amount = parseLedgerAmount(line[side], true)
  if (amount !== null && amount > 0n)
    line[side === 'debit' ? 'credit' : 'debit'] = '0'
}
function inputForeignAmount(
  line: JournalLine,
  side: 'debit' | 'credit',
  event: Event,
) {
  line[side] = (event.target as HTMLInputElement).value
  inputAmount(line, side)
}
const freshBalanceNotice = ref('')
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
type RateState = { request: number; loading: boolean; message: string }
const editingRate = shallowRef<JournalLine | null>(null)
const rateDraft = ref('')
function beginRateEdit(line: JournalLine) {
  editingRate.value = toRaw(line)
  rateDraft.value = journalRateDisplay(line.exchangeRate)
}
function inputRate(line: JournalLine, event: Event) {
  const input = event.target as HTMLInputElement
  if (!/^\d*(?:\.\d{0,10})?$/.test(input.value)) {
    input.value = rateDraft.value
    return
  }
  rateDraft.value = input.value
  line.exchangeRate = input.value
  editRate(line)
}
const rateStates = reactive(new WeakMap<JournalLine, RateState>())
let rateRequest = 0
function editRate(line: JournalLine) {
  rateStates.set(toRaw(line), {
    request: ++rateRequest,
    loading: false,
    message: 'Manual rate override.',
  })
  refreshSuggestion(line)
}
async function lookupRate(line: JournalLine) {
  const raw = toRaw(line),
    currencyId = line.currencyId,
    scope = version,
    request = ++rateRequest
  if (currencyId === options.value.baseCurrencyId) {
    line.exchangeRate = '1'
    if (editingRate.value === raw) rateDraft.value = '1.0000'
    rateStates.set(raw, {
      request,
      loading: false,
      message: 'Company local currency: rate 1.0000.',
    })
    refreshSuggestion(line)
    return
  }
  line.exchangeRate = ''
  if (editingRate.value === raw) rateDraft.value = ''
  refreshSuggestion(line)
  rateStates.set(raw, {
    request,
    loading: true,
    message: 'Fetching daily rate… You may enter a manual rate.',
  })
  const current = () =>
    scope === version &&
    rateStates.get(raw)?.request === request &&
    line.currencyId === currencyId &&
    !readonly.value &&
    lines.value.some((l) => toRaw(l) === raw)
  try {
    const from = options.value.currencies.find((c) => c.id === currencyId)?.code
    const to = options.value.currencies.find(
      (c) => c.id === options.value.baseCurrencyId,
    )?.code
    const quote = await api.request<{
      from: string
      to: string
      rate: string
      date: string
      source: string
    }>('/api/ledger/journals/exchange-rate', {
      query: { from, to },
      retry: 0,
      timeout: 12000,
    })
    if (!current()) return
    if (
      quote.from !== from ||
      quote.to !== to ||
      !parseLedgerRate(quote.rate) ||
      parseLedgerRate(quote.rate)! > max
    )
      throw new Error('Invalid quote')
    line.exchangeRate = quote.rate
    if (editingRate.value === raw)
      rateDraft.value = journalRateDisplay(quote.rate)
    rateStates.set(raw, {
      request,
      loading: false,
      message: `${quote.source} · ${quote.date} · 1 ${from} = ${journalRateDisplay(quote.rate)} ${to}. Editable indicative rate.`,
    })
    refreshSuggestion(line)
  } catch {
    if (current())
      rateStates.set(raw, {
        request,
        loading: false,
        message: 'Daily rate unavailable. Enter an exchange rate manually.',
      })
  }
}
function selectAccount(line: JournalLine) {
  const account = options.value.accounts.find((a) => a.id === line.accountId)
  const currencyId = account?.currencyId || options.value.baseCurrencyId
  if (line.currencyId !== currencyId) {
    // Never reinterpret amounts entered in the old currency as the new one.
    line.debit = '0'
    line.credit = '0'
    stopSuggestion(line)
    manualAmounts.delete(toRaw(line))
  }
  line.currencyId = currencyId
  if (!account) {
    line.debit = '0'
    line.credit = '0'
    stopSuggestion(line)
  }
  // Every explicit GL selection refreshes the quote; manual rate edits win
  // over any request in flight and saved drafts are not refreshed on load.
  void lookupRate(line)
}
async function addLine() {
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
  const scope = version,
    request = ++scrollRequest
  lines.value.push(line)
  await nextTick()
  const element = lineElements.get(line)
  if (scope !== version || request !== scrollRequest || !element?.isConnected)
    return
  element.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
    block: 'start',
  })
  element
    .querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')
    ?.focus({ preventScroll: true })
}
function base(l: JournalLine, side: 'debit' | 'credit') {
  const value = parseLedgerAmount(l[side], true),
    rate = parseLedgerRate(l.exchangeRate)
  // A zero transaction amount is locally zero even while its quote is pending.
  // Positive amounts still require a valid rate; validation never assumes one.
  if (value === 0n) return 0n
  return value === null || rate === null || rate <= 0n
    ? null
    : convertLedgerAmount(value, rate)
}
// Like the template's fresh two-row entry, but convert through the local
// currency even when both rows are foreign and use different currencies/rates.
watchEffect(() => {
  freshBalanceNotice.value = ''
  if (
    !loaded.value ||
    readonly.value ||
    original.value ||
    !form.isMultiCurrency ||
    lines.value.length !== 2
  )
    return
  const first = lines.value[0]!,
    second = lines.value[1]!
  if (manualAmounts.has(toRaw(second))) return
  const deficit = journalDeficit([first])
  const suggested =
    deficit === null
      ? null
      : journalBalancingAmounts(deficit, second.exchangeRate)
  second.debit = suggested?.debit || '0'
  second.credit = suggested?.credit || '0'
  freshBalanceNotice.value = !suggested
    ? 'Second-line suggestion is waiting for valid amounts and exchange rates. No rate is assumed.'
    : !suggested.exact
      ? 'The second-line suggestion leaves an FX rounding remainder. Review local totals before posting.'
      : 'Second line suggested from the first line’s local balance. Editing its amount stops automatic suggestions.'
})
const totals = computed(() => ({
  debit: lines.value.reduce((s, l) => s + (base(l, 'debit') || 0n), 0n),
  credit: lines.value.reduce((s, l) => s + (base(l, 'credit') || 0n), 0n),
}))
const balanceDeficit = computed(() => journalDeficit(lines.value))
const positiveBalanced = computed(
  () => balanceDeficit.value === 0n && totals.value.debit > 0n,
)
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
      e.push(
        prefix +
          'use the company profile local currency or enable multi-currency mode.',
      )
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
  manualHeaderDescription.value = false
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
      const centers = new Set(
        row.lines.map((line) => line.costCenterId || null),
      )
      header.costCenterId =
        centers.size === 1
          ? row.lines[0]?.costCenterId || null
          : mixedCostCenters
    }
    lines.value = row ? row.lines.map((l) => ({ ...l })) : [blank(), blank()]
    manualHeaderDescription.value = Boolean(row?.description.trim())
    if (row)
      for (const line of lines.value)
        if (line.description.trim()) manualLineDescriptions.add(toRaw(line))
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
watchEffect(() => {
  if (!loaded.value || readonly.value) return
  if (!manualHeaderDescription.value)
    form.description = suggestBatchDescription({
      batchDate: form.batchDate,
      isMultiCurrency: form.isMultiCurrency,
      currencyId: options.value.baseCurrencyId,
      lines: lines.value,
      options: options.value,
    })
  for (const line of lines.value) {
    if (!manualLineDescriptions.has(toRaw(line)))
      line.description = suggestLineDescription(line, options.value)
  }
})
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
    ...(!original.value ? { batchNumber: batchNumber.value } : {}),
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
  <div class="min-w-0 space-y-5">
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
    <div class="flex flex-wrap items-end gap-3">
      <label class="min-w-0 text-xs font-semibold"
        >Accounting unit<select
          v-model="unitId"
          :disabled="loading || saving || Boolean(editingId)"
          class="mt-2 block h-10 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
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
          class="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e] sm:grid-cols-2 xl:grid-cols-3"
          data-testid="journal-header"
        >
          <label class="min-w-0 text-xs font-semibold"
            >Batch number
            <input
              :value="batchNumber"
              aria-label="Batch number"
              readonly
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono dark:border-slate-700 dark:bg-slate-900"
            />
            <span v-if="!original" class="mt-1 block text-xs font-normal text-slate-500"></span>
          </label>
          <label class="min-w-0 text-xs font-semibold"
            >Batch date<input
              v-model="form.batchDate"
              required
              type="date"
              min="1900-01-01"
              max="2999-12-31"
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700" /></label
          ><label class="min-w-0 text-xs font-semibold"
            >Description<input
              v-model="form.description"
              @input="manualHeaderDescription = true"
              required
              maxlength="200"
              class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
          /></label>
           
          <div class="min-w-0">
            <AccountControlPicker :model-value="header.costCenterId || ''" kind="cost-centers" label="Header cost center" :options="centerChoices" :disabled="loading || saving || readonly" :unavailable-text="header.costCenterId === mixedCostCenters ? 'Mixed cost centers — choose to apply to all' : undefined" @update:model-value="value => { header.costCenterId = value || null; applyHeaderCostCenter() }" />
            <span class="mt-1 block text-[10px] font-normal text-slate-400"> </span>
          </div>
          <label class="flex items-center gap-2 text-xs"
            ><input
              v-model="form.isMultiCurrency"
              type="checkbox"
              @change="changeMode"
            />Multi-currency journal</label
          >
          
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
            :ref="(element) => registerLine(l, element)"
            tabindex="-1"
            class="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]"
            :aria-label="`Journal line ${i + 1}`"
          >
            <header class="mb-3 flex items-center justify-between">
              <h3 class="min-w-0 text-xs font-semibold">Line {{ i + 1 }}</h3>
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
              class="journal-amount-fields grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-8"
            >
              <AccountControlPicker
                class="min-w-0 xl:col-span-3"
                kind="accounts"
                label="GL account"
                :model-value="l.accountId"
                :options="options.accounts.filter(a => form.isMultiCurrency || a.currencyId === options.baseCurrencyId).map(a => ({ id: a.id, label: `${a.accountNumber} · ${a.name}`, type: 'GL accounts' }))"
                :disabled="loading || saving || readonly"
                :unavailable-text="l.accountName || 'Unavailable account (replace)'"
                @update:model-value="value => { l.accountId = value; selectAccount(l) }"
              />
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
                  disabled
                  required
                  class="journal-input"
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
                    v-for="c in options.currencies"
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
                  :value="
                    editingRate === toRaw(l)
                      ? rateDraft
                      : journalRateDisplay(l.exchangeRate)
                  "
                  @focus="beginRateEdit(l)"
                  @blur="editingRate = null"
                  required
                  :readonly="l.currencyId === options.baseCurrencyId"
                  inputmode="decimal"
                  class="journal-input"
                  @input="inputRate(l, $event)"
                />
              </label>
              <label
                class="min-w-0 text-[11px]"
                :class="form.isMultiCurrency ? 'font-bold' : ''"
              >
                {{ form.isMultiCurrency ? 'Local debit' : 'Debit' }}
                <input
                  v-if="form.isMultiCurrency && foreignLine(l)"
                  :value="
                    base(l, 'debit') === null
                      ? ''
                      : displayLedgerAmount(base(l, 'debit')!)
                  "
                  readonly
                  inputmode="decimal"
                  class="journal-input font-mono bg-slate-50 dark:bg-slate-900"
                />
                <input
                  v-else
                  v-model="l.debit"
                  inputmode="decimal"
                  class="journal-input font-mono"
                  @input="inputAmount(l, 'debit')"
                />
              </label>
              <label
                class="min-w-0 text-[11px]"
                :class="form.isMultiCurrency ? 'font-bold' : ''"
              >
                {{ form.isMultiCurrency ? 'Local credit' : 'Credit' }}
                <input
                  v-if="form.isMultiCurrency && foreignLine(l)"
                  :value="
                    base(l, 'credit') === null
                      ? ''
                      : displayLedgerAmount(base(l, 'credit')!)
                  "
                  readonly
                  inputmode="decimal"
                  class="journal-input font-mono bg-slate-50 dark:bg-slate-900"
                />
                <input
                  v-else
                  v-model="l.credit"
                  inputmode="decimal"
                  class="journal-input font-mono"
                  @input="inputAmount(l, 'credit')"
                />
              </label>
            </div>
            <div
              v-if="form.isMultiCurrency"
              class="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4"
              data-testid="foreign-amounts"
            >
              <p class="text-[11px] text-slate-500 sm:col-span-2">
                {{
                  foreignLine(l)
                    ? 'Enter foreign amounts; local equivalents are calculated using the exchange rate.'
                    : 'Company local-currency account: enter local amounts above; foreign entry is disabled.'
                }}
                {{
                  options.currencies.find((c) => c.id === l.currencyId)?.code ||
                  'Unavailable'
                }}
                → {{ baseCode }}
              </p>
              <label class="min-w-0 text-[11px]"
                >Foreign debit
                <input
                  :value="foreignLine(l) ? l.debit : '0.000000'"
                  :readonly="!foreignLine(l)"
                  inputmode="decimal"
                  class="journal-input font-mono"
                  @input="inputForeignAmount(l, 'debit', $event)"
                />
              </label>
              <label class="min-w-0 text-[11px]"
                >Foreign credit
                <input
                  :value="foreignLine(l) ? l.credit : '0.000000'"
                  :readonly="!foreignLine(l)"
                  inputmode="decimal"
                  class="journal-input font-mono"
                  @input="inputForeignAmount(l, 'credit', $event)"
                />
              </label>
            </div>
            <p
              v-if="i === 1 && freshBalanceNotice"
              role="status"
              class="mt-2 text-[10px] text-slate-500"
            >
              {{ freshBalanceNotice }}
            </p>
            <p
              v-if="rateStates.get(toRaw(l))"
              role="status"
              class="mt-2 text-[10px] text-slate-500"
            >
              {{ rateStates.get(toRaw(l))?.message }}
            </p>
            <div
              class="journal-detail-fields mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-8"
            >
              <div class="min-w-0 xl:col-span-2">
                <AccountControlPicker :model-value="l.costCenterId || ''" kind="cost-centers" :options="centerChoices" :disabled="loading || saving || readonly" @update:model-value="value => l.costCenterId = value || null" />
              </div>
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
                  @input="manualLineDescriptions.add(toRaw(l))"
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
                    : displayLedgerAmount(base(l, 'debit')!)
                }}</span></span
              >
              <span
                >Base credit:
                <span class="font-mono">{{
                  base(l, 'credit') === null
                    ? 'Invalid'
                    : displayLedgerAmount(base(l, 'credit')!)
                }}</span></span
              >
            </div>
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
              displayLedgerAmount(totals.debit)
            }}</strong>
          </p>
          <p>
            Base credit
            <strong class="ml-2 font-mono">{{
              displayLedgerAmount(totals.credit)
            }}</strong>
          </p>
          <p :class="positiveBalanced ? 'text-emerald-600' : 'text-amber-600'">
            {{
              balanceDeficit === null
                ? 'Awaiting valid amounts and exchange rates'
                : positiveBalanced
                  ? 'Balanced'
                  : totals.debit === 0n && totals.credit === 0n
                    ? 'Enter journal amounts'
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
