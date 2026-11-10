<script setup lang="ts">
// Generic list + create/edit/delete screen for one inventory master resource.
// Field keys match the backend whitelist for the resource, so the body sent
// on create/update is exactly what InventoryService validates.
import type { InventoryQuery, Page } from '../useInventory'

export interface MasterField {
  key: string
  label: string
  type?: 'text' | 'number' | 'integer' | 'date' | 'select' | 'textarea' | 'checkbox'
  required?: boolean
  options?: { value: string | number; label: string }[]
  hint?: string
  /** Stored as a string on the wire (decimal/date columns). */
  asString?: boolean
}
export interface MasterColumn {
  key: string
  label: string
  format?: (row: any) => string
}
export interface MasterApi {
  list: (query: InventoryQuery) => Promise<Page<any>>
  create: (body: Record<string, unknown>) => Promise<unknown>
  update: (id: string, body: Record<string, unknown>) => Promise<unknown>
  remove: (id: string, version: number) => Promise<unknown>
}

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon?: string
  api: MasterApi
  columns: MasterColumn[]
  fields: MasterField[]
  /** Fixed body fields added on create (e.g. accountingUnitId). */
  scope?: Record<string, unknown>
  /** Extra list filters (e.g. itemId for item-scoped children). */
  filters?: Record<string, string | undefined>
  /** Field defaults for a new record. */
  defaults?: Record<string, unknown>
  canDelete?: boolean
  /** Hides create, edit and delete for system-generated lists (ledger, balances). */
  readonly?: boolean
  createLabel?: string
  /** Pass false to hide the create button when the parent scope is missing. */
  ready?: boolean
}>(), { canDelete: true, readonly: false, createLabel: 'New record', ready: true })

const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const q = ref('')
const loading = ref(false)
const error = ref('')
const message = (e: any) => e?.data?.statusMessage || e?.statusMessage || 'Request failed. Please retry.'

async function load() {
  if (!props.ready) return
  loading.value = true
  error.value = ''
  try {
    const r = await props.api.list({ page: page.value, size, q: q.value, ...(props.filters || {}) } as InventoryQuery)
    rows.value = r.items
    total.value = r.total
  } catch (e) {
    rows.value = []
    total.value = 0
    error.value = message(e)
  } finally {
    loading.value = false
  }
}

watch(() => [props.ready, props.filters, props.scope], () => { page.value = 1; load() }, { deep: true })
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})
watch(page, load)
onMounted(load)

const showForm = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive<Record<string, any>>({})

function blankForm() {
  for (const f of props.fields) {
    form[f.key] = f.type === 'checkbox' ? true : ''
  }
  Object.assign(form, props.defaults || {})
}

function openCreate() {
  editing.value = null
  formError.value = ''
  blankForm()
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  formError.value = ''
  blankForm()
  for (const f of props.fields) {
    const v = row[f.key]
    form[f.key] = v === null || v === undefined ? (f.type === 'checkbox' ? false : '') : v
    if (f.type === 'date' && typeof form[f.key] === 'string') form[f.key] = form[f.key].slice(0, 10)
  }
  showForm.value = true
}

function buildBody() {
  const body: Record<string, unknown> = { ...(props.scope || {}) }
  for (const f of props.fields) {
    const raw = form[f.key]
    if (f.type === 'checkbox') { body[f.key] = Boolean(raw); continue }
    const text = raw === null || raw === undefined ? '' : String(raw).trim()
    if (!text) {
      if (f.required) throw new Error(`${f.label} is required.`)
      continue
    }
    if (f.type === 'integer') body[f.key] = Number.parseInt(text, 10)
    else if (f.type === 'number') body[f.key] = text
    else body[f.key] = text
  }
  return body
}

async function save() {
  if (saving.value) return
  formError.value = ''
  saving.value = true
  try {
    const body = buildBody()
    if (editing.value) {
      await props.api.update(editing.value.id, { ...body, version: editing.value.version })
    } else {
      await props.api.create(body)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    formError.value = e?.message && !e?.data ? e.message : message(e)
  } finally {
    saving.value = false
  }
}

const confirmRow = ref<any | null>(null)
const deleting = ref(false)
const deleteError = ref('')
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await props.api.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    await load()
  } catch (e) {
    deleteError.value = message(e)
  } finally {
    deleting.value = false
  }
}

const tableColumns = computed(() => [
  ...props.columns.map((c) => ({ key: c.key, label: c.label })),
  ...(props.readonly ? [] : [{ key: '_actions', label: '', align: 'right' as const }]),
])
const findColumn = (key: string) => props.columns.find((c) => c.key === key)
</script>

<template>
  <section class="space-y-5">
    <PageHeader :title="title" :subtitle="subtitle" :icon="icon" />

    <div v-if="!ready" class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">
      Select an accounting unit to continue.
    </div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <TextInput v-model="q" placeholder="Search" class="max-w-xs" />
        <span class="text-sm text-slate-500">{{ total }} record{{ total === 1 ? '' : 's' }}</span>
        <div class="ml-auto">
          <BaseButton v-if="!readonly" icon="plus" @click="openCreate">{{ createLabel }}</BaseButton>
        </div>
      </div>

      <p v-if="error" class="p-4 text-sm text-red-600">{{ error }}</p>

      <DataTable :columns="tableColumns" :rows="rows" :loading="loading" empty="No records found.">
        <template #cell="{ col, row }">
          <div v-if="col.key === '_actions' && !readonly" class="flex justify-end gap-2">
            <BaseButton size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton v-if="canDelete" size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
          <template v-else>{{ findColumn(col.key)?.format ? findColumn(col.key)!.format!(row) : (row[col.key] ?? '—') }}</template>
        </template>
      </DataTable>

      <div class="border-t border-slate-200 p-4 dark:border-slate-800">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell :open="showForm" :title="editing ? `Edit ${title.toLowerCase()}` : `New ${title.toLowerCase()}`" width="max-w-2xl" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-for="f in fields" :key="f.key" :label="f.label" :hint="f.hint" :required="f.required" :class="f.type === 'textarea' ? 'sm:col-span-2' : ''">
            <SelectInput v-if="f.type === 'select'" v-model="form[f.key]" :options="f.options || []" placeholder="Select…" />
            <textarea v-else-if="f.type === 'textarea'" v-model="form[f.key]" rows="3" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900" />
            <label v-else-if="f.type === 'checkbox'" class="flex items-center gap-2 text-sm">
              <input v-model="form[f.key]" type="checkbox" class="h-4 w-4" /> Enabled
            </label>
            <TextInput v-else v-model="form[f.key]" :type="f.type === 'date' ? 'date' : f.type === 'number' || f.type === 'integer' ? 'number' : 'text'" :step="f.type === 'number' ? 'any' : f.type === 'integer' ? 1 : undefined" />
          </FormField>
        </div>
        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="showForm = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Delete record?"
      message="This removes the record from active use. It cannot be undone from this screen."
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
    <p v-if="deleteError" class="text-sm text-red-600">{{ deleteError }}</p>
  </section>
</template>
