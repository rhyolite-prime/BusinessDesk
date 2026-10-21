<script setup lang="ts">
import { useJournals } from '../../../features/ledger/useJournals'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Accounting periods' })
type Period = {
  id: string
  period: number
  beginDate: string
  endDate: string
  status: 'open' | 'closed' | 'locked'
  version: number
  lastClosedAt: string | null
  closeReason: string | null
}
type Event = {
  action: string
  version: number
  previousStatus: string | null
  newStatus: string
  reason: string
  createdAt: string
  createdByUserId: string
}
const api = useJournals(),
  { unitId } = api,
  route = useRoute()
const units = ref<Awaited<ReturnType<typeof api.units>>>([]),
  periods = ref<Period[]>([])
const year = ref(
  /^\d{4}$/.test(String(route.query.year || ''))
    ? Number(route.query.year)
    : new Date().getFullYear(),
)
const month = ref(
    `${year.value}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  ),
  beginDate = ref(''),
  endDate = ref('')
const loading = ref(false),
  saving = ref(false),
  loaded = ref(false),
  error = ref(''),
  saveError = ref(''),
  success = ref('')
const target = ref<Period | null>(null),
  action = ref<'open' | 'close'>('open'),
  reason = ref('')
const history = ref<Event[]>([]),
  historyPeriod = ref<Period | null>(null),
  historyLoading = ref(false),
  historyError = ref('')
let scope = 0,
  historyRequest = 0
const message = (e: any) =>
  e?.data?.statusMessage || 'Request failed. Please retry.'
function defaultDates() {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value)) return
  const [y, m] = month.value.split('-').map(Number)
  beginDate.value = `${month.value}-01`
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  endDate.value = `${month.value}-${String(last).padStart(2, '0')}`
}
defaultDates()
async function load() {
  const current = ++scope
  periods.value = []
  loaded.value = false
  error.value = ''
  target.value = null
  historyPeriod.value = null
  historyRequest++
  if (
    !unitId.value ||
    !Number.isInteger(year.value) ||
    year.value < 1900 ||
    year.value > 2999
  ) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = await api.request<{ items: Period[] }>(
      '/api/ledger/accounting-periods',
      { query: { accountingUnitId: unitId.value, year: year.value } },
    )
    if (current === scope) {
      periods.value = data.items
      loaded.value = true
    }
  } catch (e) {
    if (current === scope) error.value = message(e)
  } finally {
    if (current === scope) loading.value = false
  }
}
watch([unitId, year], () => {
  success.value = ''
  saveError.value = ''
  void load()
})
onMounted(async () => {
  try {
    units.value = await api.units()
    if (!units.value.some((u) => u.id === unitId.value)) unitId.value = ''
    if (unitId.value) await load()
  } catch (e) {
    error.value = message(e)
  }
})
onUnmounted(() => {
  scope++
  historyRequest++
})
async function create() {
  if (saving.value || !loaded.value) return
  const current = scope,
    unit = unitId.value
  saving.value = true
  saveError.value = ''
  success.value = ''
  try {
    const saved = await api.request<Period>('/api/ledger/accounting-periods', {
      method: 'POST',
      body: {
        accountingUnitId: unit,
        period: Number(month.value.replace('-', '')),
        beginDate: beginDate.value,
        endDate: endDate.value,
      },
    })
    if (current !== scope) return
    success.value = `Period ${saved.period} created closed. Open it when ready to accept postings.`
    if (year.value !== Math.floor(saved.period / 100)) {
      year.value = Math.floor(saved.period / 100)
    } else await load()
  } catch (e) {
    if (current === scope) saveError.value = message(e)
  } finally {
    saving.value = false
  }
}
function hideHistory() {
  historyPeriod.value = null
  historyRequest++
}
function confirm(period: Period, next: 'open' | 'close') {
  target.value = period
  action.value = next
  reason.value = ''
  saveError.value = ''
}
async function transition() {
  if (!target.value || saving.value || !reason.value.trim()) return
  const current = scope,
    row = target.value,
    next = action.value
  saving.value = true
  saveError.value = ''
  success.value = ''
  try {
    const saved = await api.request<Period>(
      `/api/ledger/accounting-periods/${row.id}/${next}`,
      {
        method: 'POST',
        body: {
          accountingUnitId: unitId.value,
          version: row.version,
          reason: reason.value.trim(),
        },
      },
    )
    if (current !== scope) return
    periods.value = periods.value.map((p) => (p.id === saved.id ? saved : p))
    target.value = null
    success.value = `Period ${saved.period} is ${saved.status}.`
  } catch (e) {
    if (current === scope) saveError.value = message(e)
  } finally {
    saving.value = false
  }
}
async function showHistory(period: Period) {
  const current = scope,
    request = ++historyRequest
  historyPeriod.value = period
  history.value = []
  historyLoading.value = true
  historyError.value = ''
  try {
    const data = await api.request<{ items: Event[] }>(
      `/api/ledger/accounting-periods/${period.id}/history`,
      { query: { accountingUnitId: unitId.value } },
    )
    if (current === scope && request === historyRequest)
      history.value = data.items
  } catch (e) {
    if (current === scope && request === historyRequest)
      historyError.value = message(e)
  } finally {
    if (current === scope && request === historyRequest)
      historyLoading.value = false
  }
}
</script>
<template>
  <div class="min-w-0 space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs text-slate-400">General Ledger / Period controls</p>
        <h1 class="mt-2 text-3xl font-semibold">Accounting periods</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-500">
          Create non-overlapping periods, then open them for posting. Closing
          blocks new postings without changing posted journals or balances.
        </p>
      </div>
      <NuxtLink
        to="/ledger/journals"
        class="rounded-lg border px-3 py-2 text-xs"
        >Journal posting →</NuxtLink
      >
    </header>
    <div class="flex flex-wrap items-end gap-3">
      <label class="min-w-0 text-xs"
        >Accounting unit<select
          v-model="unitId"
          :disabled="saving"
          class="mt-2 block h-10 max-w-full rounded-lg border bg-transparent px-3"
        >
          <option value="">Select an accounting unit</option>
          <option v-for="u in units" :key="u.id" :value="u.id">
            {{ u.code }} · {{ u.name }}
          </option>
        </select></label
      ><label class="text-xs"
        >Period year<input
          v-model.number="year"
          type="number"
          min="1900"
          max="2999"
          :disabled="saving"
          class="mt-2 block h-10 w-28 rounded-lg border bg-transparent px-3" /></label
      ><button
        :disabled="saving || loading || !unitId"
        class="h-10 rounded-lg border px-3 text-xs disabled:opacity-40"
        @click="load"
      >
        Refresh periods
      </button>
    </div>
    <p v-if="!unitId" class="text-sm text-slate-500">
      Select an accounting unit to manage its periods.
    </p>
    <p v-if="loading" role="status">Loading periods…</p>
    <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p>
    <p
      v-if="success"
      role="status"
      class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      {{ success }}
    </p>
    <form
      v-if="loaded"
      class="rounded-xl border bg-white p-5 dark:bg-[#15201e]"
      @submit.prevent="create"
    >
      <h2 class="font-semibold">Create accounting period</h2>
      <p class="mt-1 text-xs text-slate-500">
        Created closed. Dates may be customized for fiscal calendars;
        overlapping periods are not permitted. Dates cannot be changed here
        after creation.
      </p>
      <fieldset
        :disabled="saving"
        class="mt-4 grid min-w-0 gap-4 sm:grid-cols-3"
      >
        <label class="min-w-0 text-xs"
          >Period month / code<input
            v-model="month"
            type="month"
            required
            min="1900-01"
            max="2999-12"
            class="mt-2 h-10 w-full min-w-0 rounded-lg border bg-transparent px-3"
            @change="defaultDates" /></label
        ><label class="min-w-0 text-xs"
          >Start date<input
            v-model="beginDate"
            type="date"
            required
            min="1900-01-01"
            max="2999-12-31"
            class="mt-2 h-10 w-full min-w-0 rounded-lg border bg-transparent px-3" /></label
        ><label class="min-w-0 text-xs"
          >End date<input
            v-model="endDate"
            type="date"
            required
            :min="beginDate || '1900-01-01'"
            max="2999-12-31"
            class="mt-2 h-10 w-full min-w-0 rounded-lg border bg-transparent px-3"
        /></label>
      </fieldset>
      <button
        :disabled="saving"
        class="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
      >
        {{ saving ? 'Saving…' : 'Create period' }}
      </button>
    </form>
    <p v-if="saveError && !target" role="alert" class="text-sm text-rose-600">
      {{ saveError }}
    </p>
    <section v-if="loaded" class="overflow-x-auto rounded-xl border">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs dark:bg-slate-900">
          <tr>
            <th class="p-3">Period</th>
            <th class="p-3">Dates (inclusive)</th>
            <th class="p-3">Status</th>
            <th class="p-3">Last close</th>
            <th class="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in periods" :key="p.id" class="border-t">
            <td class="p-3 font-mono">{{ p.period }}</td>
            <td class="whitespace-nowrap p-3 text-xs">
              {{ p.beginDate }} — {{ p.endDate }}
            </td>
            <td class="p-3">
              <span
                :class="
                  p.status === 'open' ? 'text-emerald-600' : 'text-amber-600'
                "
                >{{ p.status }}</span
              ><span class="ml-2 text-[10px] text-slate-400"
                >v{{ p.version }}</span
              >
            </td>
            <td class="p-3 text-xs">
              <span>{{
                p.lastClosedAt ? new Date(p.lastClosedAt).toLocaleString() : '—'
              }}</span>
              <p class="max-w-xs break-words text-slate-500">
                {{ p.closeReason }}
              </p>
            </td>
            <td class="p-3">
              <div class="flex gap-2">
                <button
                  v-if="p.status === 'closed'"
                  :disabled="saving"
                  class="rounded border px-3 py-1 text-xs text-emerald-700"
                  @click="confirm(p, 'open')"
                >
                  Open</button
                ><button
                  v-if="p.status === 'open'"
                  :disabled="saving"
                  class="rounded border px-3 py-1 text-xs text-amber-700"
                  @click="confirm(p, 'close')"
                >
                  Close</button
                ><button
                  :disabled="saving"
                  class="rounded border px-3 py-1 text-xs"
                  @click="showHistory(p)"
                >
                  History
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!periods.length">
            <td colspan="5" class="p-6 text-center text-slate-500">
              No periods configured for this year.
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section v-if="historyPeriod" class="rounded-xl border p-5">
      <header class="flex justify-between">
        <h2 class="font-semibold">Period {{ historyPeriod.period }} history</h2>
        <button class="text-xs underline" @click="hideHistory">
          Hide history
        </button>
      </header>
      <p v-if="historyLoading" role="status">Loading history…</p>
      <p v-if="historyError" role="alert" class="text-rose-600">
        {{ historyError }}
      </p>
      <p
        v-if="!historyLoading && !historyError && !history.length"
        class="mt-3 text-xs text-slate-500"
      >
        No events recorded since period management was enabled.
      </p>
      <ol class="mt-3 space-y-3">
        <li
          v-for="event in history"
          :key="event.version"
          class="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900"
        >
          <strong>{{ event.action }} · v{{ event.version }}</strong> ·
          {{ new Date(event.createdAt).toLocaleString() }}
          <p>
            {{ event.previousStatus || 'New' }} → {{ event.newStatus }} ·
            {{ event.reason }}
          </p>
          <p class="mt-1 break-all text-[10px] text-slate-400">
            Actor: {{ event.createdByUserId }}
          </p>
        </li>
      </ol>
    </section>
    <div
      v-if="target"
      class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4"
    >
      <form
        role="dialog"
        aria-modal="true"
        :aria-label="
          action === 'open'
            ? 'Open accounting period'
            : 'Close accounting period'
        "
        class="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-[#15201e]"
        @submit.prevent="transition"
      >
        <h2 class="font-semibold">
          {{ action === 'open' ? 'Open' : 'Close' }} period {{ target.period }}?
        </h2>
        <p class="mt-3 text-xs text-slate-500">
          {{
            action === 'open'
              ? 'Opening permits journals dated within this period to be posted. Reopening does not reverse prior postings.'
              : 'Closing stops subsequent postings. Unposted drafts remain drafts; existing postings and balances are unchanged.'
          }}
        </p>
        <label class="mt-4 block text-xs"
          >Reason<textarea
            v-model="reason"
            required
            maxlength="500"
            :disabled="saving"
            class="mt-2 min-h-24 w-full rounded-lg border bg-transparent p-3"
          />
        </label>
        <p v-if="saveError" role="alert" class="mt-2 text-xs text-rose-600">
          {{ saveError }}
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            :disabled="saving"
            class="rounded-lg border px-3 py-2 text-xs"
            @click="target = null"
          >
            Cancel</button
          ><button
            :disabled="saving || !reason.trim()"
            class="rounded-lg bg-brand-700 px-3 py-2 text-xs text-white disabled:opacity-40"
          >
            {{
              saving
                ? 'Saving…'
                : action === 'open'
                  ? 'Confirm open'
                  : 'Confirm close'
            }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
