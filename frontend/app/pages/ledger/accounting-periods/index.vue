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
  actorFullName: string | null
  actorEmail: string | null
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
function cancelTransition() {
  if (!saving.value) target.value = null
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
    <PageHeader
      title="Accounting Periods"
      icon="calendar-days"
      subtitle="Create, open and close accounting periods for journal posting."
    >
      <BaseButton to="/ledger/journals" variant="secondary" icon="book-open">
        Journal posting →
      </BaseButton>
    </PageHeader>

    <BaseCard>
      <div
        class="grid min-w-0 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
      >
        <FormField label="Accounting unit">
          <select v-model="unitId" :disabled="saving" class="period-input">
            <option value="">Select an accounting unit</option>
            <option v-for="u in units" :key="u.id" :value="u.id">
              {{ u.code }} · {{ u.name }}
            </option>
          </select>
        </FormField>
        <FormField label="Period year">
          <input
            v-model.number="year"
            type="number"
            min="1900"
            max="2999"
            :disabled="saving"
            class="period-input tnum"
          />
        </FormField>
        <BaseButton
          variant="secondary"
          icon="arrow-path"
          :disabled="saving || loading || !unitId"
          @click="load"
        >
          Refresh periods
        </BaseButton>
      </div>
      <p class="mt-3 flex items-start gap-2 text-xs text-ink-faint">
        <AppIcon name="information-circle" :size="15" />
        Period dates are inclusive. Closing prevents new postings without
        changing existing journals or balances.
      </p>
    </BaseCard>

    <BaseCard v-if="!unitId && !loading">
      <EmptyState
        icon="building-office"
        title="Select an accounting unit"
        message="Select an accounting unit to manage its periods."
      />
    </BaseCard>
    <p
      v-if="loading"
      role="status"
      class="flex items-center gap-2 text-sm text-ink-faint"
    >
      <AppIcon
        name="arrow-path"
        :size="16"
        class="animate-spin motion-reduce:animate-none"
      />
      Loading periods…
    </p>
    <p
      v-if="error"
      role="alert"
      class="period-alert border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
    >
      <AppIcon name="exclamation-triangle" :size="18" /> {{ error }}
    </p>
    <p
      v-if="success"
      role="status"
      class="period-alert border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
    >
      <AppIcon name="check-circle" :size="18" /> {{ success }}
    </p>

    <BaseCard
      v-if="loaded"
      title="Create accounting period"
      icon="plus"
      subtitle="New periods start closed. Open them when ready to accept postings."
    >
      <form @submit.prevent="create">
        <fieldset :disabled="saving" class="grid min-w-0 gap-4 sm:grid-cols-3">
          <FormField label="Period month / code">
            <input
              v-model="month"
              type="month"
              required
              min="1900-01"
              max="2999-12"
              class="period-input tnum"
              @change="defaultDates"
            />
          </FormField>
          <FormField label="Start date">
            <input
              v-model="beginDate"
              type="date"
              required
              min="1900-01-01"
              max="2999-12-31"
              class="period-input tnum"
            />
          </FormField>
          <FormField label="End date">
            <input
              v-model="endDate"
              type="date"
              required
              :min="beginDate || '1900-01-01'"
              max="2999-12-31"
              class="period-input tnum"
            />
          </FormField>
        </fieldset>
        <div
          class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"
        >
          <p class="max-w-xl text-xs text-ink-faint">
            Dates may be customized for fiscal calendars. Ranges cannot overlap,
            and dates cannot be changed here after creation.
          </p>
          <BaseButton type="submit" icon="plus" :disabled="saving">{{
            saving ? 'Saving…' : 'Create period'
          }}</BaseButton>
        </div>
      </form>
    </BaseCard>
    <p
      v-if="saveError && !target"
      role="alert"
      class="period-alert border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
    >
      <AppIcon name="exclamation-triangle" :size="18" /> {{ saveError }}
    </p>

    <BaseCard
      v-if="loaded"
      title="Accounting periods"
      icon="calendar-days"
      :subtitle="`Period year ${year}`"
      :pad="false"
      class="min-w-0 overflow-hidden"
    >
      <template #actions
        ><Badge tone="gray" size="sm"
          >{{ periods.length }} periods</Badge
        ></template
      >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead
            class="border-b border-line bg-canvas/50 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
          >
            <tr>
              <th scope="col" class="px-5 py-3">Period</th>
              <th scope="col" class="px-5 py-3">Dates (inclusive)</th>
              <th scope="col" class="px-5 py-3">Status</th>
              <th scope="col" class="px-5 py-3">Last close</th>
              <th scope="col" class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line/60">
            <tr
              v-for="p in periods"
              :key="p.id"
              class="transition-colors hover:bg-primary-soft/40"
            >
              <td class="px-5 py-4 font-semibold text-ink tnum">
                {{ p.period }}
              </td>
              <td
                class="whitespace-nowrap px-5 py-4 text-xs text-ink-soft tnum"
              >
                {{ p.beginDate }} — {{ p.endDate }}
              </td>
              <td class="px-5 py-4">
                <Badge
                  :tone="
                    p.status === 'open'
                      ? 'green'
                      : p.status === 'closed'
                        ? 'amber'
                        : 'gray'
                  "
                  dot
                  size="sm"
                  >{{ p.status }}</Badge
                >
                <p class="mt-1.5 text-[11px] text-ink-faint">
                  v{{ p.version }}
                </p>
              </td>
              <td class="px-5 py-4 text-xs text-ink-soft">
                <span class="whitespace-nowrap tnum">{{
                  p.lastClosedAt
                    ? new Date(p.lastClosedAt).toLocaleString()
                    : '—'
                }}</span>
                <p
                  v-if="p.closeReason"
                  class="mt-1 max-w-xs break-words text-ink-faint"
                >
                  {{ p.closeReason }}
                </p>
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <BaseButton
                    v-if="p.status === 'closed'"
                    variant="ghost"
                    size="sm"
                    :disabled="saving"
                    @click="confirm(p, 'open')"
                    >Open</BaseButton
                  >
                  <BaseButton
                    v-if="p.status === 'open'"
                    variant="ghost"
                    size="sm"
                    :disabled="saving"
                    @click="confirm(p, 'close')"
                    >Close</BaseButton
                  >
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    icon="clock"
                    :disabled="saving"
                    @click="showHistory(p)"
                    >History</BaseButton
                  >
                </div>
              </td>
            </tr>
            <tr v-if="!periods.length">
              <td colspan="5">
                <EmptyState
                  icon="calendar-days"
                  title="No periods configured for this year."
                  message="Create a period above, then open it to enable journal posting."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer
        ><p class="text-xs text-ink-faint">
          Open periods accept postings. Closed and locked periods remain
          available for review.
        </p></template
      >
    </BaseCard>

    <BaseCard
      v-if="historyPeriod"
      :title="`Period ${historyPeriod.period} history`"
      icon="clock"
      subtitle="Status changes and the actors who made them."
    >
      <template #actions
        ><BaseButton
          variant="ghost"
          size="sm"
          icon="x-mark"
          @click="hideHistory"
          >Hide history</BaseButton
        ></template
      >
      <p v-if="historyLoading" role="status" class="text-sm text-ink-faint">
        Loading history…
      </p>
      <p
        v-if="historyError"
        role="alert"
        class="period-alert border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
      >
        {{ historyError }}
      </p>
      <EmptyState
        v-if="!historyLoading && !historyError && !history.length"
        icon="clock"
        title="No events recorded since period management was enabled."
      />
      <ol class="space-y-3">
        <li
          v-for="event in history"
          :key="event.version"
          class="rounded-lg border border-line bg-canvas/50 p-4 text-xs"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <strong class="text-ink"
              >{{ event.action }} · v{{ event.version }}</strong
            >
            <time :datetime="event.createdAt" class="text-ink-faint tnum">{{
              new Date(event.createdAt).toLocaleString()
            }}</time>
          </div>
          <p class="mt-2 text-ink-soft">
            {{ event.previousStatus || 'New' }} → {{ event.newStatus
            }}<span v-if="event.reason"> · {{ event.reason }}</span>
          </p>
          <p class="mt-2 break-all text-[11px] text-ink-faint">
            Actor: {{ event.actorFullName || 'Unavailable user'
            }}<template v-if="event.actorEmail">
              · {{ event.actorEmail }}</template
            >
          </p>
        </li>
      </ol>
    </BaseCard>

    <Teleport to="body">
      <div
        v-if="target"
        class="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
        @click.self="cancelTransition"
        @keydown.esc.prevent="cancelTransition"
      >
        <form
          role="dialog"
          aria-modal="true"
          :aria-label="
            action === 'open'
              ? 'Open accounting period'
              : 'Close accounting period'
          "
          class="my-auto w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl"
          @submit.prevent="transition"
        >
          <header
            class="flex items-start justify-between gap-4 border-b border-line px-6 py-4"
          >
            <div>
              <p class="mb-1 text-xs text-ink-faint">
                Accounting periods / Status change
              </p>
              <h2 class="text-base font-semibold text-ink">
                {{ action === 'open' ? 'Open' : 'Close' }} period
                {{ target.period }}?
              </h2>
            </div>
            <button
              type="button"
              :disabled="saving"
              aria-label="Close dialog"
              class="rounded-md p-1 text-ink-faint transition hover:bg-canvas hover:text-ink disabled:opacity-50"
              @click="cancelTransition"
            >
              <AppIcon name="x-mark" :size="18" />
            </button>
          </header>
          <div class="space-y-4 px-6 py-5">
            <p class="text-sm text-ink-soft">
              {{
                action === 'open'
                  ? 'Opening permits journals dated within this period to be posted. Reopening does not reverse prior postings.'
                  : 'Closing stops subsequent postings. Unposted drafts remain drafts; existing postings and balances are unchanged.'
              }}
            </p>
            <FormField label="Reason">
              <textarea
                v-model="reason"
                required
                maxlength="500"
                :disabled="saving"
                rows="3"
                class="period-input min-h-24 resize-y"
                placeholder="Explain why this period is being changed…"
              />
            </FormField>
            <p
              v-if="saveError"
              role="alert"
              class="period-alert border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {{ saveError }}
            </p>
          </div>
          <footer
            class="flex justify-end gap-2 rounded-b-2xl border-t border-line bg-canvas/50 px-6 py-4"
          >
            <BaseButton
              variant="secondary"
              :disabled="saving"
              @click="cancelTransition"
              >Cancel</BaseButton
            >
            <BaseButton type="submit" :disabled="saving || !reason.trim()">{{
              saving
                ? 'Saving…'
                : action === 'open'
                  ? 'Confirm open'
                  : 'Confirm close'
            }}</BaseButton>
          </footer>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@reference "../../../../layers/shared/app/assets/css/main.css";

.period-input {
  @apply block w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-50;
}
.period-alert {
  @apply flex items-start gap-2 rounded-lg border p-3 text-sm;
}
</style>
