<script setup lang="ts">
import {
  blankEmployee,
  employeeFields,
  employeeName,
  employeePayload,
  type EmployeeRecord,
  type EmployeeSummary,
} from '../features/employees/fields'
const request = useRequestFetch(),
  { user } = useBusinessDeskAuth()
const canWrite = ref(false)
const endpoint: string = '/api/shared/employees'
const rows = ref<EmployeeSummary[]>([]),
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
  editing = ref<EmployeeRecord | null>(null),
  deletion = ref<EmployeeSummary | null>(null)
const form = reactive(blankEmployee()),
  arrayText = reactive<Record<string, string>>({})
const groups = [...new Set(employeeFields.map((f) => f.group))]
const message = (e: unknown) =>
  (e as { data?: { statusMessage?: string } })?.data?.statusMessage ||
  'Request failed. Please retry.'
const identity = () => `${user.value?.accountId}:${user.value?.username}`
let generation = 0,
  lifecycle = 0
async function load(next = page.value) {
  const current = ++generation,
    who = identity()
  page.value = next
  loading.value = true
  error.value = ''
  try {
    const data = await request<{
      data: EmployeeSummary[]
      totalCount: number
      capabilities: { canWrite: boolean }
    }>(endpoint, { query: { pageNo: next, pageSize: 20, query: search.value } })
    if (current !== generation || who !== identity()) return
    rows.value = data.data
    total.value = data.totalCount
    canWrite.value = data.capabilities.canWrite
    if (!rows.value.length && page.value > 1 && total.value) {
      await load(Math.ceil(total.value / 20))
      return
    }
  } catch (e) {
    if (current === generation && who === identity()) {
      canWrite.value = false
      rows.value = []
      total.value = 0
      error.value = message(e)
    }
  } finally {
    if (current === generation && who === identity()) loading.value = false
  }
}
async function open(row?: EmployeeSummary, view = false) {
  if (busy.value) return
  const life = lifecycle,
    who = identity()
  busy.value = true
  formError.value = ''
  error.value = ''
  try {
    const record = row
      ? await request<EmployeeRecord>(`${endpoint}/${row.id}`)
      : null
    if (life !== lifecycle || who !== identity()) return
    editing.value = record
    readOnly.value = view
    Object.assign(form, blankEmployee())
    for (const f of employeeFields) {
      if (record) form[f.key] = record[f.key]
      if (f.kind === 'array')
        arrayText[f.key] = (form[f.key] as string[]).join('\n')
    }
    dialog.value = true
  } catch (e) {
    if (life === lifecycle && who === identity()) error.value = message(e)
  } finally {
    if (life === lifecycle && who === identity()) busy.value = false
  }
}
async function save() {
  if (busy.value || readOnly.value) return
  const life = lifecycle,
    who = identity()
  busy.value = true
  formError.value = ''
  try {
    await request(
      editing.value ? `${endpoint}/${editing.value.id}` : endpoint,
      {
        method: editing.value ? 'PUT' : 'POST',
        body: employeePayload(form, arrayText, editing.value?.version),
      },
    )
    if (life !== lifecycle || who !== identity()) return
    dialog.value = false
    editing.value = null
    Object.assign(form, blankEmployee())
    for (const k of Object.keys(arrayText)) delete arrayText[k]
    notice.value = 'Employee saved.'
    await load()
  } catch (e) {
    if (life === lifecycle && who === identity()) formError.value = message(e)
  } finally {
    if (life === lifecycle && who === identity()) busy.value = false
  }
}
async function remove() {
  if (busy.value || !deletion.value) return
  const life = lifecycle,
    who = identity()
  busy.value = true
  formError.value = ''
  try {
    await request(`${endpoint}/${deletion.value.id}`, {
      method: 'DELETE',
      body: { version: deletion.value.version },
    })
    if (life !== lifecycle || who !== identity()) return
    deletion.value = null
    notice.value = 'Employee deleted.'
    await load()
  } catch (e) {
    if (life === lifecycle && who === identity()) formError.value = message(e)
  } finally {
    if (life === lifecycle && who === identity()) busy.value = false
  }
}
function clearPrivateData() {
  lifecycle++
  generation++
  rows.value = []
  canWrite.value = false
  total.value = 0
  page.value = 1
  search.value = ''
  editing.value = null
  deletion.value = null
  dialog.value = false
  Object.assign(form, blankEmployee())
  for (const k of Object.keys(arrayText)) delete arrayText[k]
  error.value = ''
  formError.value = ''
  notice.value = ''
  loading.value = false
  busy.value = false
}
watch(identity, () => {
  clearPrivateData()
  if (user.value) void load(1)
})
onMounted(() => load())
onBeforeUnmount(clearPrivateData)
function confirmDelete(row: EmployeeSummary) {
  if (!busy.value) {
    deletion.value = row
    formError.value = ''
  }
}
function closeDelete() {
  if (!busy.value) {
    deletion.value = null
    formError.value = ''
  }
}
function close() {
  if (!busy.value) {
    dialog.value = false
    editing.value = null
    Object.assign(form, blankEmployee())
    for (const k of Object.keys(arrayText)) delete arrayText[k]
  }
}
</script>
<template>
  <div class="mx-auto max-w-[1320px] space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs text-ink-faint">Shared resources / People</p>
        <h1 class="mt-2 text-3xl font-semibold text-ink">Employee biodata</h1>
        <p class="mt-2 text-sm text-ink-faint">
          Manage employee records for payroll and future employee payment
          vouchers.
        </p>
      </div>
      <BaseButton
        v-if="canWrite"
        icon="plus"
        :disabled="busy || loading || dialog || !!deletion"
        @click="open()"
        >New employee</BaseButton
      >
    </header>
    <p class="text-xs text-ink-faint">
      Personal and health data is restricted to tenant administrators or users
      with employee biodata permissions.
    </p>
    <p
      v-if="notice"
      role="status"
      class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
    >
      {{ notice }}
    </p>
    <p
      v-if="error"
      role="alert"
      class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
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
            type="search"
            maxlength="200"
            aria-label="Search employees"
            placeholder="Search identifier, name or department…"
            :disabled="busy"
          /><BaseButton
            type="submit"
            variant="secondary"
            size="sm"
            :disabled="loading || busy"
            >Search</BaseButton
          >
        </form>
        <BaseButton
          variant="ghost"
          size="sm"
          :disabled="loading || busy"
          @click="load()"
          >Refresh</BaseButton
        >
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-left text-xs">
          <caption class="sr-only">
            Employee biodata directory
          </caption>
          <thead
            class="bg-canvas text-[10px] font-semibold uppercase tracking-wider text-ink-faint"
          >
            <tr>
              <th class="px-5 py-3">Employee</th>
              <th class="px-4 py-3">Department</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Status code</th>
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-if="loading">
              <td
                colspan="5"
                role="status"
                class="p-10 text-center text-ink-faint"
              >
                Loading employees…
              </td>
            </tr>
            <template v-else
              ><tr v-for="row in rows" :key="row.id">
                <td class="px-5 py-4">
                  <p class="font-semibold text-ink">{{ employeeName(row) }}</p>
                  <p class="mt-1 text-ink-faint">
                    {{ row.employeeIdentifier }}
                  </p>
                </td>
                <td class="px-4 py-4">{{ row.departmentName || '—' }}</td>
                <td class="px-4 py-4">{{ row.categoryName || '—' }}</td>
                <td class="px-4 py-4">{{ row.status }}</td>
                <td class="px-5 py-4 text-right">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    :disabled="busy"
                    :aria-label="`View ${employeeName(row)}`"
                    @click="open(row, true)"
                    >View</BaseButton
                  ><BaseButton
                    variant="ghost"
                    size="sm"
                    :disabled="busy"
                    v-if="canWrite"
                    :aria-label="`Edit ${employeeName(row)}`"
                    @click="open(row)"
                    >Edit</BaseButton
                  ><BaseButton
                    variant="ghost"
                    size="sm"
                    class="!text-rose-600"
                    :disabled="busy"
                    v-if="canWrite"
                    :aria-label="`Delete ${employeeName(row)}`"
                    @click="confirmDelete(row)"
                    >Delete</BaseButton
                  >
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="5" class="p-12 text-center text-ink-faint">
                  <p class="font-semibold">
                    {{
                      error ? 'Unable to load employees' : 'No employees found'
                    }}
                  </p>
                  <p class="mt-2">
                    {{
                      error
                        ? 'Refresh to retry.'
                        : 'Try another search or create an employee.'
                    }}
                  </p>
                </td>
              </tr></template
            >
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
      :title="`${readOnly ? 'View' : editing ? 'Edit' : 'New'} employee`"
      :busy="busy"
      wide
      @close="close"
    >
      <form @submit.prevent="save">
        <fieldset :disabled="busy || readOnly" class="space-y-6">
          <p class="text-xs text-ink-faint">
            Status uses your EmployeeStatus integer code; no enum meanings are
            assumed. Classification names can be entered now. Reference UUIDs
            are optional until HR catalogs are connected.
          </p>
          <section v-for="group in groups" :key="group">
            <h3
              class="mb-4 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint"
            >
              {{ group }}
            </h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField
                v-for="field in employeeFields.filter((f) => f.group === group)"
                :key="field.key"
                :label="field.label"
                :required="field.required"
                :hint="
                  field.kind === 'array'
                    ? 'One item per line; up to 50 items, 200 characters each.'
                    : field.kind === 'uuid'
                      ? 'Optional reference UUID. Linked users must belong to this tenant.'
                      : field.kind === 'decimal'
                        ? 'Enter an exact non-negative decimal.'
                        : undefined
                "
              >
                <TextareaInput
                  v-if="field.kind === 'array'"
                  v-model="arrayText[field.key]!"
                  :aria-label="field.label"
                  :rows="3"
                  maxlength="10049"
                />
                <TextInput
                  v-else
                  v-model="form[field.key] as string | number | null"
                  :aria-label="field.label"
                  :required="field.required"
                  :maxlength="field.max || undefined"
                  :type="
                    field.kind === 'date'
                      ? 'date'
                      : field.kind === 'int'
                        ? 'number'
                        : field.key === 'personalEmail' ||
                            field.key === 'companyEmail'
                          ? 'email'
                          : 'text'
                  "
                  :min="field.kind === 'int' ? 0 : undefined"
                  :max="
                    field.kind === 'int'
                      ? field.key === 'status'
                        ? 32767
                        : 366
                      : undefined
                  "
                  :step="field.kind === 'int' ? 1 : undefined"
                  :inputmode="field.kind === 'decimal' ? 'decimal' : undefined"
                />
              </FormField>
            </div>
          </section>
        </fieldset>
        <p v-if="editing" class="mt-5 text-[11px] text-ink-faint">
          Version {{ editing.version }} · Created {{ editing.createdAt
          }}<span v-if="editing.lastModifiedAt">
            · Updated {{ editing.lastModifiedAt }}</span
          >
        </p>
        <p
          v-if="formError"
          role="alert"
          class="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {{ formError }}
        </p>
        <footer class="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" :disabled="busy" @click="close">{{
            readOnly ? 'Close' : 'Cancel'
          }}</BaseButton
          ><BaseButton v-if="!readOnly" type="submit" :disabled="busy">{{
            busy ? 'Saving…' : 'Save employee'
          }}</BaseButton>
        </footer>
      </form>
    </SupplierModal>
    <SupplierModal
      v-if="deletion"
      title="Delete employee"
      :busy="busy"
      @close="closeDelete"
    >
      <p class="text-sm text-ink-soft">
        Delete {{ employeeName(deletion) }} ({{ deletion.employeeIdentifier }})?
        This is a soft deletion; their identifier stays reserved. A live voucher
        or imprest prevents deletion.
      </p>
      <p v-if="formError" role="alert" class="mt-4 text-xs text-rose-700">
        {{ formError }}
      </p>
      <footer class="mt-6 flex justify-end gap-2">
        <BaseButton variant="secondary" :disabled="busy" @click="closeDelete"
          >Cancel</BaseButton
        ><BaseButton variant="danger" :disabled="busy" @click="remove">{{
          busy ? 'Deleting…' : 'Delete employee'
        }}</BaseButton>
      </footer>
    </SupplierModal>
  </div>
</template>
