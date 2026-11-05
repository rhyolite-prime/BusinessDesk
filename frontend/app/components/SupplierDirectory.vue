<script setup lang="ts">
import {
  blankSupplier,
  supplierTextFields,
  supplierDecimalFields,
  supplierAccountFields,
  type SupplierRecord,
} from '../features/ledger/supplier-fields'
interface Group {
  id: string
  name: string
  version: number
}
const props = defineProps<{ group?: boolean }>()
const request = useRequestFetch(),
  { num } = useFormat(),
  { user } = useBusinessDeskAuth()
const { settings: preferences } = useTenantPreferences()
const rows = ref<(SupplierRecord | Group)[]>([]),
  page = ref(1),
  total = ref(0),
  search = ref(''),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  formError = ref(''),
  notice = ref('')
const dialog = ref(false),
  readOnly = ref(false),
  editing = ref<SupplierRecord | Group | null>(null),
  deletion = ref<SupplierRecord | Group | null>(null)
const form = reactive(blankSupplier()),
  unit = ref('')
const singular = computed(() => (props.group ? 'supplier group' : 'supplier')),
  title = computed(() => (props.group ? 'Supplier groups' : 'Suppliers'))
const endpoint = computed(
  () => `/api/shared/${props.group ? 'supplier-groups' : 'suppliers'}`,
)
const identity = () => `${user.value?.accountId}:${user.value?.username}`
const detail = computed(() => editing.value as SupplierRecord | null)
const message = (e: any) =>
  e?.data?.statusMessage || 'Request failed. Please retry.'
let generation = 0,
  lifecycle = 0
async function load(nextPage = page.value) {
  const current = ++generation,
    who = identity()
  page.value = nextPage
  loading.value = true
  error.value = ''
  try {
    const r = await request<{
      data: (SupplierRecord | Group)[]
      totalCount: number
    }>(endpoint.value, {
      query: { pageNo: page.value, pageSize: 20, query: search.value },
    })
    if (current !== generation || who !== identity()) return
    rows.value = r.data
    total.value = r.totalCount
    if (!rows.value.length && page.value > 1 && total.value) {
      await load(Math.ceil(total.value / 20))
      return
    }
  } catch (e) {
    if (current === generation && who === identity()) {
      rows.value = []
      total.value = 0
      error.value = message(e)
    }
  } finally {
    if (current === generation && who === identity()) loading.value = false
  }
}
async function open(row?: SupplierRecord | Group, view = false) {
  if (busy.value) return
  const current = generation,
    who = identity(),
    life = lifecycle
  busy.value = true
  error.value = ''
  formError.value = ''
  try {
    const result = row
      ? await request<SupplierRecord | Group>(`${endpoint.value}/${row.id}`)
      : null
    if (current !== generation || who !== identity()) return
    editing.value = result
    readOnly.value = view
    Object.assign(form, blankSupplier())
    if (result) {
      for (const key of Object.keys(form) as (keyof typeof form)[])
        if (key in result)
          Object.assign(form, { [key]: (result as SupplierRecord)[key] })
    }
    unit.value = (result as SupplierRecord | null)?.accountingUnitId || ''
    dialog.value = true
  } catch (e) {
    if (current === generation && who === identity()) error.value = message(e)
  } finally {
    if (life === lifecycle && who === identity()) busy.value = false
  }
}
function chooseCredit(option: { unitId?: string }) {
  if (unit.value !== option.unitId) {
    form.debitAccountId = ''
    form.vatAccountId = ''
    form.irsAccountId = ''
  }
  unit.value = option.unitId || ''
}
async function save() {
  if (busy.value || readOnly.value) return
  if (!props.group && supplierAccountFields.some(field => !form[field.key])) {
    formError.value = 'Select all four GL posting accounts before saving.'
    return
  }
  const current = generation,
    who = identity(),
    life = lifecycle
  busy.value = true
  formError.value = ''
  try {
    const body = props.group ? { name: form.name.trim() } : { ...form }
    if (editing.value) Object.assign(body, { version: editing.value.version })
    await request(
      `${endpoint.value}${editing.value ? `/${editing.value.id}` : ''}`,
      { method: editing.value ? 'PUT' : 'POST', body },
    )
    if (current !== generation || who !== identity()) return
    dialog.value = false
    notice.value = `${props.group ? 'Supplier group' : 'Supplier'} saved.`
    await load()
  } catch (e) {
    if (current === generation && who === identity())
      formError.value = message(e)
  } finally {
    if (life === lifecycle && who === identity()) busy.value = false
  }
}
function confirm(row: SupplierRecord | Group) {
  formError.value = ''
  deletion.value = row
}
async function remove() {
  if (!deletion.value || busy.value) return
  const current = generation,
    who = identity(),
    life = lifecycle
  busy.value = true
  formError.value = ''
  try {
    await request(`${endpoint.value}/${deletion.value.id}`, {
      method: 'DELETE',
      body: { version: deletion.value.version },
    })
    if (current !== generation || who !== identity()) return
    deletion.value = null
    notice.value = `${props.group ? 'Supplier group' : 'Supplier'} deleted.`
    await load()
  } catch (e) {
    if (current === generation && who === identity())
      formError.value = message(e)
  } finally {
    if (life === lifecycle && who === identity()) busy.value = false
  }
}
watch(identity, () => {
  generation++
  lifecycle++
  rows.value = []
  total.value = 0
  dialog.value = false
  deletion.value = null
  editing.value = null
  error.value = ''
  notice.value = ''
  busy.value = false
  loading.value = false
  Object.assign(form, blankSupplier())
  if (user.value) void load(1)
})
onMounted(() => load())
onUnmounted(() => {
  generation++
  lifecycle++
})
</script>
<template>
  <div class="space-y-6">
    <div class="text-xs font-medium text-ink-faint">
      General Ledger <span class="mx-1">/</span> Shared config
    </div>
    <PageHeader
      :title="title"
      :subtitle="
        group
          ? 'Organize suppliers into tenant-wide groups.'
          : 'Manage supplier contacts, tax details, currency and posting defaults.'
      "
      icon="user-group"
      ><BaseButton
        :disabled="busy || loading || dialog || !!deletion"
        icon="plus"
        @click="open()"
        >Add {{ singular }}</BaseButton
      ></PageHeader
    >
    <nav class="flex gap-3 text-xs font-semibold">
      <NuxtLink
        to="/ledger/shared-config/supplier-groups"
        class="rounded-lg px-3 py-2"
        :class="
          group
            ? 'bg-primary-soft text-primary'
            : 'text-ink-faint hover:bg-canvas'
        "
        >Supplier groups</NuxtLink
      ><NuxtLink
        to="/ledger/shared-config/suppliers"
        class="rounded-lg px-3 py-2"
        :class="
          !group
            ? 'bg-primary-soft text-primary'
            : 'text-ink-faint hover:bg-canvas'
        "
        >Suppliers</NuxtLink
      >
    </nav>
    <p
      v-if="notice"
      role="status"
      class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
    >
      {{ notice }}
    </p>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
    >
      {{ error }}
    </p>
    <section
      class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
      :aria-busy="loading"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-5"
      >
        <form class="flex w-full gap-2 sm:max-w-lg" @submit.prevent="load(1)">
          <TextInput
            v-model="search"
            :disabled="busy"
            type="search"
            :aria-label="`Search ${title.toLowerCase()}`"
            :placeholder="
              group
                ? 'Search group name…'
                : 'Search name, account number or email…'
            "
            maxlength="200"
          /><BaseButton
            type="submit"
            size="sm"
            variant="secondary"
            :disabled="busy || loading"
            >Search</BaseButton
          >
        </form>
        <BaseButton
          size="sm"
          variant="ghost"
          :disabled="busy || loading"
          @click="load()"
          >Refresh</BaseButton
        >
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-xs">
          <caption class="sr-only">
            {{
              title
            }}
            directory
          </caption>
          <thead
            class="bg-canvas text-[10px] font-semibold uppercase tracking-wider text-ink-faint"
          >
            <tr>
              <th class="px-5 py-3">{{ group ? 'Group name' : 'Supplier' }}</th>
              <template v-if="!group"
                ><th class="px-4 py-3">Group / Status</th>
                <th class="px-4 py-3">Contact</th>
                <th class="px-4 py-3 text-right">Balance</th></template
              >
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-if="loading">
              <td
                :colspan="group ? 2 : 5"
                class="p-10 text-center text-ink-faint"
                role="status"
              >
                Loading {{ title.toLowerCase() }}…
              </td>
            </tr>
            <tr
              v-for="row in loading ? [] : rows"
              :key="row.id"
              class="hover:bg-canvas/70"
            >
              <td class="px-5 py-4">
                <p class="font-semibold text-ink">{{ row.name }}</p>
                <p v-if="!group" class="mt-1 text-[11px] text-ink-faint">
                  {{ (row as SupplierRecord).accountNumber }}
                </p>
              </td>
              <template v-if="!group"
                ><td class="px-4 py-4 text-ink-soft">
                  <p>{{ (row as SupplierRecord).supplierGroupName }}</p>
                  <span
                    class="mt-1 inline-block rounded-md px-2 py-1 text-[10px]"
                    :class="
                      (row as SupplierRecord).statusId === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    "
                    >{{ (row as SupplierRecord).statusName }}</span
                  >
                </td>
                <td class="px-4 py-4 text-ink-faint">
                  <p>{{ (row as SupplierRecord).email || '—' }}</p>
                  <p class="mt-1">
                    {{ (row as SupplierRecord).phoneNo || '—' }}
                  </p>
                </td>
                <td class="px-4 py-4 text-right tabular-nums text-ink-soft">
                  {{
                    num(
                      Number((row as SupplierRecord).balance),
                      preferences?.moneyDecimals ?? 2,
                    )
                  }}
                  <span class="text-[10px] text-ink-faint">{{
                    (row as SupplierRecord).currencyCode
                  }}</span>
                </td></template
              >
              <td class="whitespace-nowrap px-5 py-4 text-right">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  :disabled="busy"
                  :aria-label="`View ${row.name}`"
                  @click="open(row, true)"
                  >View</BaseButton
                ><BaseButton
                  variant="ghost"
                  size="sm"
                  :disabled="busy"
                  :aria-label="`Edit ${row.name}`"
                  @click="open(row)"
                  >Edit</BaseButton
                ><BaseButton
                  variant="ghost"
                  size="sm"
                  :disabled="busy"
                  :aria-label="`Delete ${row.name}`"
                  class="!text-rose-600"
                  @click="confirm(row)"
                  >Delete</BaseButton
                >
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td :colspan="group ? 2 : 5" class="p-12 text-center">
                <p class="font-semibold text-ink-soft">
                  {{
                    error
                      ? 'Unable to load records'
                      : `No ${title.toLowerCase()} found`
                  }}
                </p>
                <p class="mt-2 text-ink-faint">
                  {{
                    error
                      ? 'Refresh to retry.'
                      : 'Try another search or add a new record.'
                  }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <fieldset :disabled="busy || loading">
        <Pagination
          :page="page"
          :size="20"
          :total="total"
          @update:page="load"
        />
      </fieldset>
    </section>
    <SupplierModal
      v-if="dialog"
      :title="`${readOnly ? 'View' : editing ? 'Edit' : 'New'} ${singular}`"
      :busy="busy"
      :wide="!group"
      @close="dialog = false"
      ><form @submit.prevent="save">
        <fieldset :disabled="busy || readOnly" class="space-y-6">
          <FormField v-if="group" label="Name" required
            ><TextInput
              v-model="form.name"
              required
              maxlength="200" /></FormField
          ><template v-else>
            <section>
              <h3
                class="mb-4 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint"
              >
                Identity and contact
              </h3>
              <div class="grid gap-4 sm:grid-cols-2">
                <FormField
                  v-for="field in supplierTextFields"
                  :key="field.key"
                  :label="field.label"
                  :required="'required' in field && field.required"
                  ><TextInput
                    v-model="form[field.key]"
                    :type="'type' in field ? field.type : 'text'"
                    :required="'required' in field && field.required"
                    :maxlength="field.max" /></FormField
                ><SupplierLookup
                  v-model="form.supplierGroupId"
                  label="Supplier group"
                  kind="groups"
                  :selected-label="detail?.supplierGroupName"
                  :disabled="readOnly || busy"
                /><FormField label="Status" required
                  ><select
                    v-model="form.statusId"
                    aria-label="Status"
                    required
                    class="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="inactive">Inactive</option>
                  </select></FormField
                ><label
                  class="flex items-center gap-2 text-xs font-semibold text-ink-soft"
                  ><input
                    v-model="form.isResident"
                    type="checkbox"
                    class="accent-primary"
                  />Resident supplier</label
                >
              </div>
            </section>
            <section>
              <h3
                class="mb-4 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint"
              >
                Currency and credit
              </h3>
              <div class="grid gap-4 sm:grid-cols-2">
                <SupplierLookup
                  v-model="form.currencyId"
                  label="Currency"
                  kind="currencies"
                  :selected-label="
                    detail
                      ? `${detail.currencyCode} · ${detail.currencyName}`
                      : ''
                  "
                  :disabled="readOnly || busy"
                /><FormField
                  v-for="field in supplierDecimalFields"
                  :key="field.key"
                  :label="field.label"
                  required
                  ><TextInput
                    v-model="form[field.key]"
                    required
                    inputmode="decimal"
                    :pattern="field.pattern"
                    maxlength="25" /></FormField
                ><FormField
                  label="Balance"
                  hint="Read-only. Maintained by accounting transactions, not supplier edits."
                  ><TextInput
                    :model-value="detail?.balance || '0.000000'"
                    readonly
                /></FormField>
              </div>
              <p class="mt-3 text-xs text-ink-faint">
                Rates must be greater than zero (up to 10 decimal places).
                Credit limit is non-negative (up to 6 decimal places). These are
                defaults, not automatic exchange-rate quotes.
              </p>
            </section>
            <section>
              <h3
                class="mb-4 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint"
              >
                GL posting defaults
              </h3>
              <p class="mb-4 text-xs text-ink-faint">
                Select the AP liability account first. All four GL accounts must
                belong to the same active accounting unit.
              </p>
              <div class="grid gap-4 sm:grid-cols-2">
                <SupplierLookup
                  v-for="field in supplierAccountFields"
                  :key="field.key"
                  v-model="form[field.key]"
                  :label="field.label"
                  :kind="field.kind"
                  :selected-label="detail?.[field.name] || ''"
                  :unit-id="field.key === 'creditAccountId' ? '' : unit"
                  :disabled="
                    busy ||
                    readOnly ||
                    (field.key !== 'creditAccountId' && !form.creditAccountId)
                  "
                  @selected="field.key === 'creditAccountId' && chooseCredit($event)"
                />
              </div>
            </section>
          </template>
        </fieldset>
        <p v-if="formError" role="alert" class="mt-4 text-xs text-rose-600">
          {{ formError }}
        </p>
        <footer class="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton
            variant="secondary"
            :disabled="busy"
            @click="dialog = false"
            >{{ readOnly ? 'Close' : 'Cancel' }}</BaseButton
          ><BaseButton v-if="!readOnly" type="submit" :disabled="busy">{{
            busy ? 'Saving…' : 'Save changes'
          }}</BaseButton>
        </footer>
      </form></SupplierModal
    >
    <SupplierModal
      v-if="deletion"
      :title="`Delete ${singular}?`"
      :busy="busy"
      @close="deletion = null"
      ><p class="text-sm leading-relaxed text-ink-soft">
        Delete <strong>{{ deletion.name }}</strong
        >? This is a soft deletion.
        {{
          group
            ? 'A group cannot be deleted while live suppliers reference it.'
            : 'A supplier with a nonzero balance cannot be deleted. Its account number remains reserved for audit history.'
        }}
      </p>
      <p v-if="formError" role="alert" class="mt-4 text-xs text-rose-600">
        {{ formError }}
      </p>
      <footer class="mt-6 flex justify-end gap-2">
        <BaseButton
          variant="secondary"
          :disabled="busy"
          @click="deletion = null"
          >Cancel</BaseButton
        ><BaseButton variant="danger" :disabled="busy" @click="remove">{{
          busy ? 'Deleting…' : 'Delete'
        }}</BaseButton>
      </footer></SupplierModal
    >
  </div>
</template>
