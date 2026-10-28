<script setup lang="ts">
import { journalRateDisplay } from '../../../features/ledger/journal-rate-display'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Send,
  X,
} from '@lucide/vue'
import type { Journal } from '../../../features/ledger/journal-types'
import { emptyJournalOptions } from '../../../features/ledger/journal-types'
import { useJournals } from '../../../features/ledger/useJournals'

const displayBudgetAmount = (value: string) => formatDecimalAmount(value)
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Journals' })
const api = useJournals(),
  { unitId } = api
const units = ref<Awaited<ReturnType<typeof api.units>>>([]),
  rows = ref<Journal[]>([]),
  options = ref(emptyJournalOptions())
const loading = ref(false),
  loaded = ref(false),
  saving = ref(false),
  error = ref(''),
  actionError = ref(''),
  search = ref(''),
  status = ref(''),
  expanded = ref('')
const target = ref<Journal | null>(null),
  action = ref<'post' | 'delete'>('post'),
  periodId = ref(''),
  periodLoading = ref(false)
let version = 0
const message = (e: any) =>
  e?.data?.statusMessage || 'Request failed. Please retry.'
const visible = computed(() =>
  rows.value.filter(
    (r) =>
      (!status.value || r.status === status.value) &&
      (!search.value ||
        `${r.batchNumber} ${r.description}`
          .toLowerCase()
          .includes(search.value.trim().toLowerCase())),
  ),
)
async function load() {
  const current = ++version,
    unit = unitId.value
  rows.value = []
  options.value = emptyJournalOptions()
  loaded.value = false
  target.value = null
  error.value = ''
  if (!unit) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [r, o] = await Promise.all([api.list(unit), api.options(unit)])
    if (current !== version) return
    rows.value = r.items
    options.value = o
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
    if (!units.value.some((u) => u.id === unitId.value)) unitId.value = ''
    if (unitId.value) await load()
  } catch (e) {
    error.value = message(e)
  }
})
watch(unitId, load)
onUnmounted(() => version++)
const eligiblePeriods = computed(() =>
  !target.value
    ? []
    : options.value.periods.filter(
        (p) =>
          target.value!.batchDate >= p.beginDate &&
          target.value!.batchDate <= p.endDate &&
          target.value!.lines.every(
            (line) =>
              line.transactionDate >= p.beginDate &&
              line.transactionDate <= p.endDate,
          ),
      ),
)
let periodRequest = 0
async function refreshPostingPeriods() {
  if (!target.value || action.value !== 'post') return
  const current = version,
    row = target.value,
    request = ++periodRequest
  periodLoading.value = true
  actionError.value = ''
  periodId.value = ''
  options.value.periods = []
  try {
    const fresh = await api.options(unitId.value)
    if (
      current !== version ||
      request !== periodRequest ||
      target.value !== row ||
      action.value !== 'post'
    )
      return
    options.value.periods = fresh.periods
    if (eligiblePeriods.value.some((p) => p.id === row.periodId))
      periodId.value = row.periodId!
    else if (eligiblePeriods.value.length === 1)
      periodId.value = eligiblePeriods.value[0]!.id
  } catch (e) {
    if (
      current === version &&
      request === periodRequest &&
      target.value === row
    )
      actionError.value = message(e)
  } finally {
    if (request === periodRequest) periodLoading.value = false
  }
}
function confirm(row: Journal, kind: 'post' | 'delete') {
  target.value = row
  action.value = kind
  actionError.value = ''
  periodId.value = ''
  periodRequest++
  periodLoading.value = false
  if (kind === 'post') void refreshPostingPeriods()
}
async function execute() {
  if (
    !target.value ||
    saving.value ||
    periodLoading.value ||
    (action.value === 'post' &&
      !eligiblePeriods.value.some((p) => p.id === periodId.value))
  )
    return
  const row = target.value,
    current = version
  saving.value = true
  actionError.value = ''
  try {
    if (action.value === 'post') {
      const saved = await api.request<Journal>(
        `/api/ledger/journals/${row.id}/post`,
        {
          method: 'POST',
          body: {
            accountingUnitId: unitId.value,
            version: row.version,
            periodId: periodId.value,
          },
        },
      )
      if (current !== version) return
      rows.value = rows.value.map((r) => (r.id === row.id ? saved : r))
    } else {
      await api.request(`/api/ledger/journals/${row.id}`, {
        method: 'DELETE',
        query: { accountingUnitId: unitId.value, version: row.version },
      })
      if (current !== version) return
      rows.value = rows.value.filter((r) => r.id !== row.id)
    }
    target.value = null
  } catch (e) {
    if (current === version) actionError.value = message(e)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs text-slate-400">General Ledger / Transactions</p>
        <h1 class="mt-2 text-3xl font-semibold">Journals</h1>
        <p class="mt-2 text-sm text-slate-500">
          Single- and multi-currency drafts. Final posting updates ledger
          balances atomically.
        </p>
      </div>
      <NuxtLink
        v-if="loaded"
        to="/ledger/journals/new"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white"
        ><Plus :size="15" />New journal</NuxtLink
      >
    </header>
    <section
      class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#15201e]"
    >
      <label class="text-xs font-semibold"
        >Accounting unit<select
          v-model="unitId"
          :disabled="loading || saving"
          class="mt-2 block h-10 rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        >
          <option value="">Select an accounting unit</option>
          <option v-for="u in units" :key="u.id" :value="u.id">
            {{ u.code }} · {{ u.name }}
          </option>
        </select></label
      ><input
        v-model="search"
        type="search"
        aria-label="Search journals"
        placeholder="Search journal…"
        class="h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
      /><select
        v-model="status"
        aria-label="Filter by status"
        class="h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs dark:border-slate-700"
      >
        <option value="">All statuses</option>
        <option
          v-for="s in [
            'draft',
            'posted',
            'pending_approval',
            'approved',
            'rejected',
            'voided',
            'reversed',
          ]"
          :key="s"
        >
          {{ s }}
        </option></select
      ><button
        :disabled="loading || saving || !unitId"
        class="h-10 rounded-lg border border-slate-200 px-3 text-xs dark:border-slate-700"
        @click="load"
      >
        Refresh
      </button>
    </section>
    <p v-if="loading" role="status" class="text-sm text-slate-400">
      Loading journals…
    </p>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
    >
      {{ error }}
    </p>
    <section
      class="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]"
    >
      <table class="w-full min-w-[850px] text-left text-xs">
        <thead
          class="bg-slate-50 text-[10px] uppercase text-slate-400 dark:bg-slate-900"
        >
          <tr>
            <th class="p-4">Journal</th>
            <th>Date / mode</th>
            <th class="text-right">Base debit</th>
            <th class="text-right">Base credit</th>
            <th class="px-4">Status</th>
            <th class="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="!loading && !visible.length">
            <td colspan="6" class="p-12 text-center text-slate-400">
              {{
                unitId
                  ? 'No journals found'
                  : 'Select an accounting unit to view journals'
              }}
            </td>
          </tr>
          <template v-for="row in visible" :key="row.id"
            ><tr>
              <td class="p-4">
                <button
                  :aria-expanded="expanded === row.id"
                  class="flex items-center gap-2 font-semibold"
                  @click="expanded = expanded === row.id ? '' : row.id"
                >
                  <ChevronDown
                    v-if="expanded === row.id"
                    :size="14"
                  /><ChevronRight v-else :size="14" />{{ row.batchNumber }}
                </button>
                <p class="ml-5 mt-1 text-slate-400">{{ row.description }}</p>
              </td>
              <td>
                {{ row.batchDate }}
                <p class="mt-1 text-slate-400">
                  {{
                    row.isMultiCurrency ? 'Multi-currency' : 'Single currency'
                  }}
                </p>
              </td>
              <td class="text-right font-mono">
                {{ displayBudgetAmount(row.totalDebit) }}
              </td>
              <td class="text-right font-mono">
                {{ displayBudgetAmount(row.totalCredit) }}
              </td>
              <td class="px-4">{{ row.status }}</td>
              <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                  <NuxtLink
                    :to="{
                      path: '/ledger/journals/new',
                      query: { id: row.id, accountingUnitId: unitId },
                    }"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-700"
                    ><Pencil :size="12" />{{
                      row.status === 'draft' ? 'Edit draft' : 'View'
                    }}</NuxtLink
                  ><button
                    :disabled="saving || row.status !== 'draft'"
                    aria-label="Post journal"
                    class="p-2 text-brand-700 disabled:opacity-30"
                    @click="confirm(row, 'post')"
                  >
                    <Send :size="15" /></button
                  ><button
                    :disabled="saving || row.status !== 'draft'"
                    aria-label="Delete journal"
                    class="p-2 text-rose-500 disabled:opacity-30"
                    @click="confirm(row, 'delete')"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="expanded === row.id">
              <td colspan="6" class="bg-slate-50/50 p-5 dark:bg-slate-900/30">
                <table class="w-full text-xs">
                  <thead class="text-left text-slate-400">
                    <tr>
                      <th>Account / detail</th>
                      <th>Date</th>
                      <th>Currency / rate</th>
                      <th class="text-right">Debit (transaction / base)</th>
                      <th class="text-right">Credit (transaction / base)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="l in row.lines" :key="l.id">
                      <td class="py-2">
                        {{ l.accountNumber }} · {{ l.accountName }}
                        <p class="text-[10px] text-slate-400">
                          {{ l.referenceNumber }} {{ l.description }}
                        </p>
                      </td>
                      <td>{{ l.transactionDate }}</td>
                      <td>
                        {{ l.currencyCode }} /
                        {{ journalRateDisplay(l.exchangeRate) }}
                      </td>
                      <td class="text-right font-mono">
                        {{ l.debit }} / {{ l.baseDebit }}
                      </td>
                      <td class="text-right font-mono">
                        {{ l.credit }} / {{ l.baseCredit }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr></template
          >
        </tbody>
      </table>
    </section>
    <div
      v-if="target"
      class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"
      @click.self="!saving && (target = null)"
    >
      <section
        role="dialog"
        aria-modal="true"
        :aria-label="action === 'post' ? 'Post journal' : 'Delete journal'"
        class="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-[#15201e]"
      >
        <header class="flex justify-between">
          <h2 class="font-semibold">
            {{ action === 'post' ? 'Final posting' : 'Delete draft' }} ·
            {{ target.batchNumber }}
          </h2>
          <button :disabled="saving" aria-label="Close" @click="target = null">
            <X :size="16" />
          </button>
        </header>
        <p class="mt-3 text-xs text-slate-500">
          {{
            action === 'post'
              ? 'Posting is final: the journal becomes read-only and updates ledger balances.'
              : 'The draft and its lines will be soft-deleted; audit history is retained.'
          }}
        </p>
        <label v-if="action === 'post'" class="mt-4 block text-xs"
          >Posting period<select
            v-model="periodId"
            :disabled="periodLoading || saving"
            class="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
          >
            <option value="">Select an open period</option>
            <option v-for="p in eligiblePeriods" :key="p.id" :value="p.id">
              {{ p.period }} · {{ p.beginDate }} — {{ p.endDate }}
            </option></select
          ><span
            v-if="!periodLoading && !eligiblePeriods.length"
            class="mt-2 block text-amber-600"
            >No open period covers the batch date and every line date. Create or
            open an eligible period before posting.</span
          ></label
        >
        <div v-if="action === 'post'" class="mt-3 space-y-2 text-xs">
          <p v-if="periodLoading" role="status" class="text-slate-400">
            Refreshing open periods…
          </p>
          <p class="font-mono">
            Local debit {{ target.totalDebit }} · Local credit
            {{ target.totalCredit }}
          </p>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              :to="{
                path: '/ledger/accounting-periods',
                query: { year: target.batchDate.slice(0, 4) },
              }"
              class="text-brand-700 underline"
              >Manage accounting periods</NuxtLink
            >
            <button
              type="button"
              :disabled="periodLoading || saving"
              class="text-brand-700 underline"
              @click="refreshPostingPeriods"
            >
              Refresh open periods
            </button>
          </div>
        </div>
        <p v-if="actionError" role="alert" class="mt-3 text-xs text-rose-600">
          {{ actionError }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            :disabled="saving"
            class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
            @click="target = null"
          >
            Cancel</button
          ><button
            :disabled="
              saving ||
              periodLoading ||
              (action === 'post' &&
                !eligiblePeriods.some((p) => p.id === periodId))
            "
            class="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            @click="execute"
          >
            {{
              saving
                ? 'Saving…'
                : action === 'post'
                  ? 'Confirm final posting'
                  : 'Delete draft'
            }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
