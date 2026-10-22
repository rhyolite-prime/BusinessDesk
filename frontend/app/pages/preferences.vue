<script setup lang="ts">
import {
  defaultTenantPreferences,
  useTenantPreferences,
  type TenantPreferences,
} from '../composables/useTenantPreferences'
definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Preferences' })
type Table = { table: string; module: string }
type Item = Table & { rows: number }
type Plan = {
  planId: string
  expiresAt: string
  confirmation: string
  items: Item[]
  allTenant: boolean
}
type ResetEvent = {
  id: string
  status: string
  reason: string
  createdAt: string
  actorFullName: string | null
  actorEmail: string | null
  details: { items?: Item[] }
}
const { settings: activeSettings, version: activeVersion } =
    useTenantPreferences(),
  { user } = useBusinessDeskAuth()
const form = reactive<TenantPreferences>(defaultTenantPreferences())
const version = ref(0),
  canManage = ref(false),
  accountId = ref(''),
  tables = ref<Table[]>([]),
  loaded = ref(false),
  loading = ref(false),
  saving = ref(false),
  busy = ref(false)
const error = ref(''),
  success = ref(''),
  resetError = ref(''),
  blocked = ref<string[]>([]),
  history = ref<ResetEvent[]>([]),
  historyError = ref('')
const scope = ref<'selected' | 'all'>('selected'),
  selected = ref<string[]>([]),
  plan = ref<Plan | null>(null),
  confirmation = ref(''),
  password = ref(''),
  reason = ref('')
const modules = computed(() => [...new Set(tables.value.map((t) => t.module))])
const rows = computed(
  () => plan.value?.items.reduce((n, t) => n + t.rows, 0) || 0,
)
const preferencesBusy = computed(
  () => saving.value || busy.value || loading.value,
)
const message = (e: any) =>
  e?.data?.statusMessage || 'Request failed. Please retry.'
let generation = 0
const identity = () => `${user.value?.accountId}:${user.value?.username}`
function invalidPlan() {
  plan.value = null
  confirmation.value = ''
  password.value = ''
  resetError.value = ''
  blocked.value = []
}
watch([scope, selected], invalidPlan, { deep: true })
function toggleModule(module: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked,
    names = tables.value.filter((t) => t.module === module).map((t) => t.table)
  selected.value = checked
    ? [...new Set([...selected.value, ...names])]
    : selected.value.filter((t) => !names.includes(t))
}
async function loadHistory() {
  const current = generation,
    who = identity()
  historyError.value = ''
  try {
    const result = await $fetch<{ items: ResetEvent[] }>(
      '/api/preferences/reset/history',
    )
    if (current === generation && who === identity())
      history.value = result.items
  } catch (e) {
    if (current === generation && who === identity())
      historyError.value = message(e)
  }
}
async function load() {
  const current = ++generation,
    who = identity()
  loading.value = true
  loaded.value = false
  error.value = ''
  canManage.value = false
  invalidPlan()
  history.value = []
  try {
    const result = await $fetch<{
      settings: TenantPreferences
      version: number
      canManage: boolean
      accountId: string
      tables: Table[]
    }>('/api/preferences')
    if (current !== generation || who !== identity()) return
    Object.assign(form, result.settings)
    activeSettings.value = { ...result.settings }
    activeVersion.value = result.version
    version.value = result.version
    canManage.value = result.canManage
    accountId.value = result.accountId
    tables.value = result.tables
    loaded.value = true
    if (canManage.value) void loadHistory()
  } catch (e) {
    if (current === generation && who === identity()) error.value = message(e)
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(identity, () => {
  generation++
  loaded.value = false
  canManage.value = false
  tables.value = []
  history.value = []
  invalidPlan()
  if (user.value) void load()
})
onMounted(load)
onUnmounted(() => {
  generation++
  password.value = ''
})
async function save() {
  if (preferencesBusy.value || !canManage.value) return
  const current = generation,
    who = identity()
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const result = await $fetch<{
      settings: TenantPreferences
      version: number
    }>('/api/preferences', {
      method: 'PUT',
      body: { settings: { ...form }, version: version.value },
    })
    if (current !== generation || who !== identity()) return
    activeSettings.value = { ...result.settings }
    activeVersion.value = result.version
    version.value = result.version
    success.value =
      'Tenant preferences saved. Shared formatters and print defaults now use these settings.'
  } catch (e) {
    if (current === generation && who === identity()) error.value = message(e)
  } finally {
    saving.value = false
  }
}
async function preview() {
  if (preferencesBusy.value || !canManage.value) return
  const current = generation
  busy.value = true
  invalidPlan()
  success.value = ''
  try {
    const result = await $fetch<Plan>('/api/preferences/reset/preview', {
      method: 'POST',
      body: {
        scope: scope.value,
        tables: scope.value === 'all' ? [] : [...selected.value],
      },
    })
    if (current === generation) plan.value = result
  } catch (e: any) {
    if (current === generation) {
      resetError.value = message(e)
      blocked.value = e?.data?.data?.blocked || []
    }
  } finally {
    busy.value = false
  }
}
async function reset() {
  if (
    preferencesBusy.value ||
    !canManage.value ||
    !plan.value ||
    confirmation.value !== plan.value.confirmation ||
    !password.value ||
    !reason.value.trim()
  )
    return
  const current = generation
  busy.value = true
  resetError.value = ''
  success.value = ''
  try {
    const result = await $fetch<{ deletedRows: number }>(
      '/api/preferences/reset/execute',
      {
        method: 'POST',
        body: {
          planId: plan.value.planId,
          password: password.value,
          confirmation: confirmation.value,
          reason: reason.value.trim(),
        },
        retry: 0,
        timeout: 90000,
      },
    )
    if (current !== generation) return
    success.value = `Cleared ${result.deletedRows} business records. Company profile, users, security, preferences and reset history were retained.`
    invalidPlan()
    selected.value = []
    reason.value = ''
    useState<string>('ledger-accounting-unit', () => '').value = ''
    clearNuxtData()
  } catch (e: any) {
    if (current === generation) {
      resetError.value = message(e)
      if (e?.status === 409 || e?.statusCode === 409) {
        plan.value = null
        confirmation.value = ''
      }
    }
  } finally {
    password.value = ''
    busy.value = false
    if (current === generation) void loadHistory()
  }
}
const sample = computed(() => {
  try {
    return new Intl.NumberFormat(form.locale, {
      minimumFractionDigits: form.moneyDecimals,
      maximumFractionDigits: form.moneyDecimals,
      useGrouping: form.useGrouping,
    }).format(12345.6789)
  } catch {
    return 'Invalid number format'
  }
})
</script>
<template>
  <div class="min-w-0 space-y-6">
    <PageHeader
      title="Preferences"
      subtitle="Tenant-wide ERP operating, display and print defaults."
      icon="cog-6-tooth"
    >
      <BaseButton
        variant="secondary"
        icon="arrow-path"
        :disabled="preferencesBusy"
        @click="load"
        >Reload preferences</BaseButton
      >
    </PageHeader>
    <p v-if="loading" role="status" class="text-sm text-ink-faint">
      Loading preferences…
    </p>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      {{ error }}
    </p>
    <p
      v-if="success"
      role="status"
      class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      {{ success }}
    </p>
    <template v-if="loaded">
      <p
        v-if="!canManage"
        class="rounded-lg border border-line bg-surface p-4 text-sm text-ink-soft"
      >
        These settings apply to your tenant. Only tenant administrators can
        change them or initialize business data.
      </p>
      <BaseCard
        title="Operating and display defaults"
        icon="building-office"
        :subtitle="`Account ${accountId} · Version ${version}`"
      >
        <form @submit.prevent="save">
          <fieldset
            :disabled="preferencesBusy || !canManage"
            class="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <FormField label="Display locale"
              ><select
                v-model="form.locale"
                aria-label="Display locale"
                class="preference-input"
              >
                <option value="en-GH">English (Ghana)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="en-US">English (United States)</option>
                <option value="fr-FR">Français (France)</option>
                <option value="de-DE">Deutsch (Deutschland)</option>
              </select></FormField
            >
            <FormField
              label="Time zone"
              hint="IANA name. Accounting date-only values do not shift across time zones."
              ><input
                v-model="form.timeZone"
                required
                maxlength="100"
                list="preference-time-zones"
                class="preference-input" /><datalist id="preference-time-zones">
                <option
                  v-for="zone in [
                    'Africa/Accra',
                    'UTC',
                    'Europe/London',
                    'America/New_York',
                    'Asia/Dubai',
                    'Asia/Kolkata',
                  ]"
                  :key="zone"
                  :value="zone"
                /></datalist
            ></FormField>
            <FormField label="Date style"
              ><select
                v-model="form.dateStyle"
                aria-label="Date style"
                class="preference-input"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select></FormField
            >
            <FormField label="Time format"
              ><select
                v-model="form.timeFormat"
                aria-label="Time format"
                class="preference-input"
              >
                <option value="24h">24 hour</option>
                <option value="12h">12 hour</option>
              </select></FormField
            >
            <FormField
              label="Currency display decimals"
              hint="Display only; does not change stored amounts, rates or posting precision."
              ><select
                v-model.number="form.moneyDecimals"
                aria-label="Currency display decimals"
                class="preference-input"
              >
                <option v-for="n in [0, 1, 2, 3, 4, 5, 6]" :key="n" :value="n">
                  {{ n }}
                </option>
              </select></FormField
            >
            <label
              class="flex items-center gap-2 self-center text-sm text-ink-soft"
              ><input
                v-model="form.useGrouping"
                type="checkbox"
                class="accent-primary"
              />Group thousands in numbers</label
            >
          </fieldset>

          <fieldset
            :disabled="preferencesBusy || !canManage"
            class="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-2"
          >
            <FormField label="Report paper size"
              ><select
                v-model="form.paperSize"
                aria-label="Report paper size"
                class="preference-input"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select></FormField
            >
            <FormField label="Print orientation"
              ><select
                v-model="form.orientation"
                aria-label="Print orientation"
                class="preference-input"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select></FormField
            >
          </fieldset>
          <div
            class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"
          >
            <p class="text-xs text-ink-faint">
              Number preview: <strong class="text-ink tnum">{{ sample }}</strong
              >. Applies to shared ERP formatters, not fixed-precision journal
              entry controls.
            </p>
            <BaseButton
              v-if="canManage"
              type="submit"
              :disabled="preferencesBusy"
              >{{ saving ? 'Saving…' : 'Save preferences' }}</BaseButton
            >
          </div>
        </form>
      </BaseCard>
      <BaseCard
        title="Financial and security configuration"
        icon="shield-check"
      >
        <p class="text-sm text-ink-soft">
          Company identity, base currency, fiscal year and tax settings remain
          in Company Profile. User access and authentication remain in their
          existing administration screens. Preferences do not override these
          controls or rewrite financial values.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton
            to="/ledger/shared-config/company-profile"
            variant="secondary"
            size="sm"
            >Company profile</BaseButton
          ><BaseButton
            to="/ledger/accounting-units"
            variant="secondary"
            size="sm"
            >Accounting units</BaseButton
          ><BaseButton
            to="/ledger/accounting-periods"
            variant="secondary"
            size="sm"
            >Accounting periods</BaseButton
          >
        </div>
      </BaseCard>
      <BaseCard
        v-if="canManage"
        title="Initialize tenant business data"
        icon="exclamation-triangle"
        subtitle="Permanent deletion of test data. There is no undo."
        class="border-red-200"
      >
        <div
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <strong>Back up and use a maintenance window first.</strong> Live and
          archived records in the reviewed selection will be permanently
          removed. Company profile, tenant identity, users, roles, security
          settings, preferences, global catalogs and reset audit history are
          always retained. Other tenants are never reset.
        </div>
        <fieldset :disabled="preferencesBusy" class="mt-5 space-y-4">
          <legend class="sr-only">Choose reset scope</legend>
          <label class="flex items-center gap-2 text-sm"
            ><input
              v-model="scope"
              type="radio"
              value="selected"
              name="reset-scope"
            />Selected tables or modules</label
          >
          <label class="flex items-center gap-2 text-sm"
            ><input
              v-model="scope"
              type="radio"
              value="all"
              name="reset-scope"
            />Entire tenant business database (preserved data excluded)</label
          >
          <div
            v-if="scope === 'selected'"
            class="grid min-w-0 gap-4 lg:grid-cols-2"
          >
            <section
              v-for="module in modules"
              :key="module"
              class="min-w-0 rounded-lg border border-line p-4"
            >
              <label
                class="flex items-center gap-2 border-b border-line pb-3 text-sm font-semibold"
                ><input
                  type="checkbox"
                  :checked="
                    tables
                      .filter((t) => t.module === module)
                      .every((t) => selected.includes(t.table))
                  "
                  :indeterminate="
                    tables.some(
                      (t) => t.module === module && selected.includes(t.table),
                    ) &&
                    !tables
                      .filter((t) => t.module === module)
                      .every((t) => selected.includes(t.table))
                  "
                  :aria-label="`Select module ${module}`"
                  @change="toggleModule(module, $event)"
                />{{ module }}</label
              >
              <div class="mt-3 max-h-56 space-y-2 overflow-y-auto">
                <label
                  v-for="t in tables.filter((t) => t.module === module)"
                  :key="t.table"
                  class="flex items-start gap-2 text-xs text-ink-soft"
                  ><input
                    v-model="selected"
                    type="checkbox"
                    :value="t.table"
                    class="mt-0.5"
                  /><span class="break-all">{{ t.table }}</span></label
                >
              </div>
            </section>
          </div>
          <p class="text-xs text-ink-faint">
            Dependencies are expanded automatically. Financial transactions and
            balances reset as a group; deleting cost centers also includes
            dependent ledger data. The preview shows the complete selection.
            Unreviewed tables, unsafe relationships and unsupported table
            policies block the reset.
          </p>
          <BaseButton
            variant="secondary"
            icon="eye"
            :disabled="
              preferencesBusy || (scope === 'selected' && !selected.length)
            "
            @click="preview"
            >{{ busy ? 'Working…' : 'Preview initialization' }}</BaseButton
          >
        </fieldset>
        <p
          v-if="resetError"
          role="alert"
          class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {{ resetError }}
        </p>
        <ul
          v-if="blocked.length"
          class="mt-2 list-inside list-disc space-y-1 text-xs text-red-700"
        >
          <li v-for="item in blocked" :key="item">{{ item }}</li>
        </ul>
        <form
          v-if="plan"
          class="mt-6 space-y-5 border-t border-line pt-5"
          @submit.prevent="reset"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-ink">
              Reset preview · {{ rows }} records across
              {{ plan.items.length }} tables
            </h3>
            <Badge tone="amber"
              >Expires
              {{ new Date(plan.expiresAt).toLocaleTimeString() }}</Badge
            >
          </div>
          <div class="max-h-72 overflow-auto rounded-lg border border-line">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 bg-canvas text-ink-faint">
                <tr>
                  <th class="p-3">Table</th>
                  <th class="p-3">Records (including archived)</th>
                  <th class="p-3">Selection</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="t in plan.items" :key="t.table">
                  <td class="break-all p-3">{{ t.table }}</td>
                  <td class="p-3 tnum">{{ t.rows }}</td>
                  <td class="p-3">
                    {{
                      scope === 'selected' && !selected.includes(t.table)
                        ? 'Added dependency'
                        : 'Included'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <fieldset :disabled="preferencesBusy" class="space-y-4">
            <FormField label="Reason">
              <textarea
                v-model="reason"
                required
                maxlength="500"
                rows="2"
                class="preference-input"
              />
            </FormField>
            <FormField
              label="Typed confirmation"
              :hint="`Type exactly: ${plan.confirmation}`"
              ><input
                v-model="confirmation"
                required
                autocomplete="off"
                spellcheck="false"
                class="preference-input"
            /></FormField>
            <FormField
              label="Current administrator password"
              hint="Re-authenticated on every execution. Never stored in preferences or reset history."
              ><input
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                class="preference-input"
            /></FormField>
          </fieldset>
          <div class="flex flex-wrap justify-end gap-3">
            <BaseButton
              variant="secondary"
              :disabled="preferencesBusy"
              @click="invalidPlan"
              >Cancel preview</BaseButton
            ><BaseButton
              type="submit"
              variant="danger"
              :disabled="
                preferencesBusy ||
                confirmation !== plan.confirmation ||
                !password ||
                !reason.trim()
              "
              >{{
                busy ? 'Initializing…' : 'Permanently initialize selected data'
              }}</BaseButton
            >
          </div>
        </form>
      </BaseCard>
      <BaseCard
        v-if="canManage"
        title="Initialization history"
        subtitle="Last 25 completed or rejected reset attempts. Preserved through every initialization."
        icon="clock"
      >
        <template #actions
          ><BaseButton
            size="sm"
            variant="ghost"
            :disabled="preferencesBusy"
            @click="loadHistory"
            >Refresh history</BaseButton
          ></template
        >
        <p v-if="historyError" role="alert" class="text-sm text-red-700">
          {{ historyError }}
        </p>
        <EmptyState
          v-else-if="!history.length"
          title="No initialization events recorded"
          icon="clock"
        />
        <ol class="space-y-3">
          <li
            v-for="event in history"
            :key="event.id"
            class="rounded-lg border border-line p-4 text-xs"
          >
            <div class="flex flex-wrap justify-between gap-2">
              <Badge
                :tone="event.status === 'completed' ? 'green' : 'red'"
                size="sm"
                >{{ event.status }}</Badge
              ><time class="text-ink-faint">{{
                new Date(event.createdAt).toLocaleString()
              }}</time>
            </div>
            <p class="mt-2 break-words text-ink-soft">{{ event.reason }}</p>
            <p class="mt-1 text-ink-faint">
              {{ event.actorFullName || 'Unavailable user'
              }}<span v-if="event.actorEmail"> · {{ event.actorEmail }}</span>
            </p>
            <p v-if="event.details.items" class="mt-2 text-ink-faint">
              {{ event.details.items.reduce((n, t) => n + t.rows, 0) }} records
              · {{ event.details.items.length }} tables
            </p>
          </li>
        </ol>
      </BaseCard>
    </template>
  </div>
</template>
<style scoped>
@reference "../../layers/shared/app/assets/css/main.css";
.preference-input {
  @apply block w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-canvas disabled:opacity-50;
}
</style>
