<script setup lang="ts">
import { useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { ProcedureRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { PROCEDURE_CATEGORIES, fleetErrorMessage, fleetStatusTone, humanLabel } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Procedure library' })

const api = useFleetWorkshop()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<ProcedureRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const q = ref('')
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.procedures.list({ q: q.value || undefined, page: page.value, size })
    rows.value = r.items
    total.value = r.total
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(page, load)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; void load() }, 250)
})
onMounted(load)

const showModal = ref(false)
const editing = ref<ProcedureRecord | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  pcode: '',
  description: '',
  serviceCategory: 'service',
  assetGroupId: '',
  estimatedHours: '4',
  procedureText: '',
  status: 'active',
})
const checklist = ref<string[]>([])

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, {
    pcode: '',
    description: '',
    serviceCategory: 'service',
    assetGroupId: '',
    estimatedHours: '4',
    procedureText: '',
    status: 'active',
  })
  checklist.value = ['Drain and inspect engine oil & replace filter']
  showModal.value = true
}

async function openEdit(row: ProcedureRecord) {
  editing.value = row
  formError.value = ''
  showModal.value = true
  try {
    const full = await api.procedures.get(row.id)
    editing.value = full
    Object.assign(form, {
      pcode: full.pcode,
      description: full.description,
      serviceCategory: full.serviceCategory || 'service',
      assetGroupId: full.assetGroupId || '',
      estimatedHours: full.estimatedHours || '4',
      procedureText: full.procedureText || '',
      status: full.status || 'active',
    })
    checklist.value = Array.isArray(full.checklistItems)
      ? full.checklistItems.map((c: any) => (typeof c === 'string' ? c : c?.task || ''))
      : []
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  }
}

function addStep() {
  checklist.value.push('')
}

async function save() {
  if (saving.value) return
  if (!form.pcode.trim() || !form.description.trim()) {
    formError.value = 'PCode and Description are required.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      pcode: form.pcode.trim(),
      description: form.description.trim(),
      serviceCategory: form.serviceCategory,
      assetGroupId: form.assetGroupId || null,
      estimatedHours: String(form.estimatedHours || '0'),
      procedureText: form.procedureText.trim(),
      checklistItems: checklist.value.map((c) => c.trim()).filter(Boolean),
      status: form.status,
    }
    if (editing.value) {
      await api.procedures.update(editing.value.id, { ...body, version: editing.value.version })
      toast.success('Procedure updated')
    } else {
      await api.procedures.create(body)
      toast.success('Procedure created')
    }
    showModal.value = false
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

const confirmRow = ref<ProcedureRecord | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  try {
    await api.procedures.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    toast.success('Procedure deleted')
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const columns = [
  { key: 'pcode', label: 'PCode' },
  { key: 'description', label: 'Procedure description' },
  { key: 'serviceCategory', label: 'Category' },
  { key: 'estimatedHours', label: 'Est. hours' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Procedure library" subtitle="Standardized PCode work instructions, safety checks and task checklists." icon="document-text">
      <template #actions>
        <BaseButton icon="plus" @click="openCreate">Add procedure</BaseButton>
      </template>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput v-model="q" placeholder="Search PCode or description…" class="max-w-xs" />
        <span class="ml-auto text-xs text-ink-faint">{{ total }} procedures</span>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="rows" :loading="loading" empty="No procedures defined yet.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'pcode'">
            <span class="font-semibold text-ink">{{ row.pcode }}</span>
          </template>
          <template v-else-if="col.key === 'description'">
            <div class="font-medium">{{ row.description }}</div>
            <div v-if="row.assetGroupCode" class="text-[11px] text-ink-faint">Group: {{ row.assetGroupCode }}</div>
          </template>
          <template v-else-if="col.key === 'serviceCategory'">
            {{ humanLabel(row.serviceCategory) }}
          </template>
          <template v-else-if="col.key === 'estimatedHours'">
            <span class="tnum">{{ row.estimatedHours }} hrs</span>
          </template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">
              {{ humanLabel(row.status) }}
            </span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <BaseButton size="sm" variant="ghost" @click="openEdit(row)">Edit / Checklist</BaseButton>
            <BaseButton size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell :open="showModal" :title="editing ? `Procedure ${editing.pcode}` : 'New standard procedure'" width="max-w-3xl" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid gap-3.5 sm:grid-cols-2">
          <FormField label="Procedure code (PCode)" required><TextInput v-model="form.pcode" placeholder="e.g. P-250HR" /></FormField>
          <FormField label="Description" required><TextInput v-model="form.description" placeholder="e.g. 250 Hour Preventive Service" /></FormField>
          <FormField label="Service category"><FleetSelect v-model="form.serviceCategory" :options="PROCEDURE_CATEGORIES" :allow-empty="false" /></FormField>
          <FormField label="Asset group (optional)"><FleetSelect v-model="form.assetGroupId" :options="opts.assetGroups.value" placeholder="All groups" /></FormField>
          <FormField label="Estimated hours"><TextInput v-model="form.estimatedHours" type="number" step="any" /></FormField>
          <FormField label="Status">
            <FleetSelect
              v-model="form.status"
              :options="[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]"
              :allow-empty="false"
            />
          </FormField>
          <FormField label="Procedure memo / instructions" class="sm:col-span-2">
            <TextareaInput v-model="form.procedureText" :rows="3" placeholder="Safety lockout, torque specs, diagnostic sequence…" />
          </FormField>
        </div>

        <div class="space-y-2 rounded-xl border border-line bg-canvas/40 p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-ink">Inspection &amp; task checklist</span>
            <BaseButton size="sm" variant="secondary" icon="plus" @click="addStep">Add step</BaseButton>
          </div>
          <div v-for="(_, idx) in checklist" :key="idx" class="flex items-center gap-2">
            <span class="w-6 text-center text-xs font-semibold text-ink-faint">{{ idx + 1 }}.</span>
            <TextInput v-model="checklist[idx]" placeholder="Inspection or work task…" class="flex-1" />
            <button type="button" class="text-xs text-rose-600 hover:underline" @click="checklist.splice(idx, 1)">Remove</button>
          </div>
        </div>

        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">Save procedure</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Delete procedure?"
      :message="`Delete procedure ${confirmRow?.pcode} (${confirmRow?.description})?`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
  </section>
</template>
