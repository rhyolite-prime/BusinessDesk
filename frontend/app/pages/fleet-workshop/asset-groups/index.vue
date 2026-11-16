<script setup lang="ts">
import { useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { AssetGroupComponent, AssetGroupMaterial, AssetGroupRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import {
  ASSET_CLASSES,
  ASSET_TYPES,
  SERVICE_TIERS,
  TRIGGER_METRICS,
  fleetErrorMessage,
  humanLabel,
} from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Asset groups & BOMs' })

const api = useFleetWorkshop()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<AssetGroupRecord[]>([])
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
    const r = await api.assetGroups.list({ q: q.value || undefined, page: page.value, size })
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

/* ----------------------------- Group modal -------------------------------- */
const showModal = ref(false)
const editing = ref<AssetGroupRecord | null>(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({
  code: '',
  model: '',
  modelType: '',
  assetClass: 'heavy_equipment',
  assetType: 'dump_truck',
  defaultTriggerMetric: 'hours',
  serviceFrequency: '250',
  serviceDowntimeHours: '4',
  majorServiceFrequency: '1000',
  majorServiceDowntimeHours: '10',
  tolerance: '25',
  routineServiceDelay: '0',
  weekdayUtilization: '20',
  weekdayDays: 5,
  saturdayUtilization: '20',
  sundayUtilization: '1',
  description: '',
  isActive: true,
})

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, {
    code: '',
    model: '',
    modelType: '',
    assetClass: 'heavy_equipment',
    assetType: 'dump_truck',
    defaultTriggerMetric: 'hours',
    serviceFrequency: '250',
    serviceDowntimeHours: '4',
    majorServiceFrequency: '1000',
    majorServiceDowntimeHours: '10',
    tolerance: '25',
    routineServiceDelay: '0',
    weekdayUtilization: '20',
    weekdayDays: 5,
    saturdayUtilization: '20',
    sundayUtilization: '1',
    description: '',
    isActive: true,
  })
  showModal.value = true
}

function openEdit(row: AssetGroupRecord) {
  editing.value = row
  formError.value = ''
  Object.assign(form, {
    code: row.code,
    model: row.model,
    modelType: row.modelType || '',
    assetClass: row.assetClass || 'heavy_equipment',
    assetType: row.assetType || 'dump_truck',
    defaultTriggerMetric: row.defaultTriggerMetric || 'hours',
    serviceFrequency: row.serviceFrequency || '250',
    serviceDowntimeHours: row.serviceDowntimeHours || '4',
    majorServiceFrequency: row.majorServiceFrequency || '1000',
    majorServiceDowntimeHours: row.majorServiceDowntimeHours || '10',
    tolerance: row.tolerance || '0',
    routineServiceDelay: row.routineServiceDelay || '0',
    weekdayUtilization: row.weekdayUtilization || '10',
    weekdayDays: Number(row.weekdayDays ?? 5),
    saturdayUtilization: row.saturdayUtilization || '8',
    sundayUtilization: row.sundayUtilization || '0',
    description: row.description || '',
    isActive: row.isActive !== false,
  })
  showModal.value = true
}

async function saveGroup() {
  if (saving.value) return
  if (!form.code.trim() || !form.model.trim()) {
    formError.value = 'Code and Model are required.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      ...form,
      code: form.code.trim(),
      model: form.model.trim(),
      modelType: form.modelType.trim(),
      serviceFrequency: String(form.serviceFrequency || '250'),
      serviceDowntimeHours: String(form.serviceDowntimeHours || '4'),
      majorServiceFrequency: String(form.majorServiceFrequency || '1000'),
      majorServiceDowntimeHours: String(form.majorServiceDowntimeHours || '10'),
      tolerance: String(form.tolerance || '0'),
      routineServiceDelay: String(form.routineServiceDelay || '0'),
      weekdayUtilization: String(form.weekdayUtilization || '10'),
      weekdayDays: Number(form.weekdayDays ?? 5),
      saturdayUtilization: String(form.saturdayUtilization || '8'),
      sundayUtilization: String(form.sundayUtilization || '0'),
      description: form.description.trim(),
    }
    if (editing.value) {
      await api.assetGroups.update(editing.value.id, { ...body, version: editing.value.version })
      toast.success('Asset group updated')
    } else {
      await api.assetGroups.create(body)
      toast.success('Asset group created')
    }
    showModal.value = false
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

/* ----------------------------- Blueprints modal ---------------------------- */
const blueprintGroup = ref<AssetGroupRecord | null>(null)
const blueprintTab = ref<'materials' | 'components'>('materials')
const materials = ref<AssetGroupMaterial[]>([])
const components = ref<AssetGroupComponent[]>([])
const blueprintSaving = ref(false)
const blueprintError = ref('')

async function openBlueprints(row: AssetGroupRecord, tab: 'materials' | 'components') {
  blueprintGroup.value = row
  blueprintTab.value = tab
  blueprintError.value = ''
  try {
    const full = await api.assetGroups.get(row.id)
    materials.value = (full.materials || []).map((m) => ({ ...m }))
    components.value = (full.components || []).map((c) => ({ ...c }))
  } catch (e) {
    blueprintError.value = fleetErrorMessage(e)
  }
}

function addMaterial() {
  const firstItem = opts.invItems.value[0]?.value || ''
  materials.value.push({
    serviceTier: 'minor_service',
    itemId: firstItem,
    uomId: (firstItem && opts.invItemBaseUom.value[firstItem]) || opts.invUoms.value[0]?.value || '',
    quantity: '1',
    isLubricant: false,
    notes: '',
  })
}

function onMaterialItemChange(m: AssetGroupMaterial, itemId: string) {
  m.itemId = itemId
  if (opts.invItemBaseUom.value[itemId]) m.uomId = opts.invItemBaseUom.value[itemId]
}

function addComponent() {
  components.value.push({
    componentType: 'ENGINE',
    slotLabel: 'Primary',
    expectedLifeHours: '10000',
    isRequired: true,
    notes: '',
  })
}

async function saveBlueprints() {
  if (!blueprintGroup.value || blueprintSaving.value) return
  blueprintSaving.value = true
  blueprintError.value = ''
  try {
    if (blueprintTab.value === 'materials') {
      await api.assetGroups.replaceMaterials(
        blueprintGroup.value.id,
        materials.value.map((m) => ({
          serviceTier: m.serviceTier,
          itemId: m.itemId,
          uomId: m.uomId,
          quantity: String(m.quantity || '1'),
          isLubricant: Boolean(m.isLubricant),
          notes: (m.notes || '').trim(),
        })),
      )
      toast.success('Service materials BOM saved')
    } else {
      await api.assetGroups.replaceComponents(
        blueprintGroup.value.id,
        components.value.map((c) => ({
          componentType: (c.componentType || '').trim(),
          slotLabel: (c.slotLabel || '').trim(),
          expectedLifeHours: String(c.expectedLifeHours || '0'),
          isRequired: c.isRequired !== false,
          notes: (c.notes || '').trim(),
        })),
      )
      toast.success('Required components saved')
    }
    blueprintGroup.value = null
    await load()
  } catch (e) {
    blueprintError.value = fleetErrorMessage(e)
  } finally {
    blueprintSaving.value = false
  }
}

const confirmRow = ref<AssetGroupRecord | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  try {
    await api.assetGroups.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    toast.success('Asset group deleted')
    await load()
  } catch (e) {
    toast.error('Cannot delete asset group', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const columns = [
  { key: 'code', label: 'Code' },
  { key: 'model', label: 'Model / Type' },
  { key: 'assetClass', label: 'Class / Asset Type' },
  { key: 'serviceFrequency', label: 'PM defaults (Minor / Major)' },
  { key: 'materialCount', label: 'BOMs / Slots' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Asset groups & BOMs" subtitle="Equipment models, default service triggers, minor/major materials BOMs and component slots." icon="list-bullet">
      <template #actions>
        <BaseButton icon="plus" @click="openCreate">New asset group</BaseButton>
      </template>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput v-model="q" placeholder="Search code, model or type…" class="max-w-xs" />
        <span class="ml-auto text-xs text-ink-faint">{{ total }} groups</span>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="rows" :loading="loading" empty="No asset groups configured.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'code'">
            <span class="font-semibold text-ink">{{ row.code }}</span>
          </template>
          <template v-else-if="col.key === 'model'">
            <div class="font-medium text-ink">{{ row.model }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.modelType || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'assetClass'">
            <div>{{ humanLabel(row.assetClass) }}</div>
            <div class="text-[11px] text-ink-faint">{{ humanLabel(row.assetType) }}</div>
          </template>
          <template v-else-if="col.key === 'serviceFrequency'">
            <div class="tnum">{{ row.serviceFrequency }} / {{ row.majorServiceFrequency }} {{ row.defaultTriggerMetric }}</div>
            <div class="text-[11px] text-ink-faint">Tol: {{ row.tolerance }} · Downtime: {{ row.serviceDowntimeHours }}h / {{ row.majorServiceDowntimeHours }}h</div>
          </template>
          <template v-else-if="col.key === 'materialCount'">
            <div class="text-xs">
              <span class="font-medium">{{ row.materialCount ?? 0 }}</span> materials ·
              <span class="font-medium">{{ row.componentCount ?? 0 }}</span> component slots
            </div>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <BaseButton size="sm" variant="ghost" @click="openBlueprints(row, 'materials')">Service BOM</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openBlueprints(row, 'components')">Components</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell :open="showModal" :title="editing ? `Edit ${editing.code}` : 'New asset group'" width="max-w-3xl" @close="showModal = false">
      <form class="space-y-4" @submit.prevent="saveGroup">
        <div class="grid gap-3.5 sm:grid-cols-3">
          <FormField label="Group code" required><TextInput v-model="form.code" placeholder="e.g. XCMG-XDE130" /></FormField>
          <FormField label="Model" required><TextInput v-model="form.model" placeholder="e.g. XCMG DUMP TRUCK" /></FormField>
          <FormField label="Model type"><TextInput v-model="form.modelType" placeholder="e.g. XDE130" /></FormField>
          <FormField label="Asset class"><FleetSelect v-model="form.assetClass" :options="ASSET_CLASSES" :allow-empty="false" /></FormField>
          <FormField label="Asset type"><FleetSelect v-model="form.assetType" :options="ASSET_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Default trigger metric"><FleetSelect v-model="form.defaultTriggerMetric" :options="TRIGGER_METRICS" :allow-empty="false" /></FormField>
          <FormField label="Minor service freq."><TextInput v-model="form.serviceFrequency" type="number" step="any" /></FormField>
          <FormField label="Minor downtime (hrs)"><TextInput v-model="form.serviceDowntimeHours" type="number" step="any" /></FormField>
          <FormField label="Tolerance"><TextInput v-model="form.tolerance" type="number" step="any" /></FormField>
          <FormField label="Major service freq."><TextInput v-model="form.majorServiceFrequency" type="number" step="any" /></FormField>
          <FormField label="Major downtime (hrs)"><TextInput v-model="form.majorServiceDowntimeHours" type="number" step="any" /></FormField>
          <FormField label="Routine delay"><TextInput v-model="form.routineServiceDelay" type="number" step="any" /></FormField>
          <FormField label="Weekday utilization"><TextInput v-model="form.weekdayUtilization" type="number" step="any" /></FormField>
          <FormField label="No. of weekdays (0–5)"><TextInput v-model="form.weekdayDays" type="number" min="0" max="5" /></FormField>
          <FormField label="Saturday / Sunday util.">
            <div class="grid grid-cols-2 gap-2">
              <TextInput v-model="form.saturdayUtilization" type="number" step="any" placeholder="Sat" />
              <TextInput v-model="form.sundayUtilization" type="number" step="any" placeholder="Sun" />
            </div>
          </FormField>
          <FormField label="Description" class="sm:col-span-3"><TextareaInput v-model="form.description" :rows="2" /></FormField>
          <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.isActive" type="checkbox" class="h-4 w-4" /> Active</label>
        </div>
        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">Save group</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell
      :open="!!blueprintGroup"
      :title="`Blueprints — ${blueprintGroup?.code} (${blueprintGroup?.model})`"
      width="max-w-4xl"
      @close="blueprintGroup = null"
    >
      <div class="mb-4 flex items-center justify-between gap-2 border-b border-line pb-3">
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold"
            :class="blueprintTab === 'materials' ? 'bg-primary text-white' : 'bg-canvas text-ink-soft'"
            @click="blueprintTab = 'materials'"
          >
            Service materials &amp; lubricants
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold"
            :class="blueprintTab === 'components' ? 'bg-primary text-white' : 'bg-canvas text-ink-soft'"
            @click="blueprintTab = 'components'"
          >
            Major component slots
          </button>
        </div>
        <BaseButton v-if="blueprintTab === 'materials'" size="sm" icon="plus" @click="addMaterial">Add material</BaseButton>
        <BaseButton v-else size="sm" icon="plus" @click="addComponent">Add component slot</BaseButton>
      </div>

      <div v-if="blueprintTab === 'materials'" class="space-y-3">
        <div v-if="!materials.length" class="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">
          No service materials defined yet. Materials auto-populate Job Cards and PM Requisitions.
        </div>
        <div v-for="(m, idx) in materials" :key="idx" class="grid items-end gap-2.5 rounded-xl border border-line bg-canvas/40 p-3 sm:grid-cols-12">
          <FormField label="Tier" class="sm:col-span-2"><FleetSelect v-model="m.serviceTier" :options="SERVICE_TIERS" :allow-empty="false" /></FormField>
          <FormField label="Inventory item" class="sm:col-span-4">
            <FleetSelect :model-value="m.itemId" :options="opts.invItems.value" placeholder="Select item…" @update:model-value="(val) => onMaterialItemChange(m, val)" />
          </FormField>
          <FormField label="UOM" class="sm:col-span-2"><FleetSelect v-model="m.uomId" :options="opts.invUoms.value" placeholder="UOM…" /></FormField>
          <FormField label="Qty" class="sm:col-span-1"><TextInput v-model="m.quantity" type="number" step="any" /></FormField>
          <div class="flex items-center justify-between gap-2 pb-1 sm:col-span-3">
            <label class="flex items-center gap-1.5 text-xs"><input v-model="m.isLubricant" type="checkbox" class="h-3.5 w-3.5" /> Lubricant</label>
            <button type="button" class="text-xs text-rose-600 hover:underline" @click="materials.splice(idx, 1)">Remove</button>
          </div>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div v-if="!components.length" class="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">
          No required major component slots defined yet (e.g. ENGINE, TRANSMISSION, FINAL DRIVE LH).
        </div>
        <div v-for="(c, idx) in components" :key="idx" class="grid items-end gap-2.5 rounded-xl border border-line bg-canvas/40 p-3 sm:grid-cols-12">
          <FormField label="Component type" class="sm:col-span-3"><TextInput v-model="c.componentType" placeholder="e.g. ENGINE" /></FormField>
          <FormField label="Slot label" class="sm:col-span-3"><TextInput v-model="c.slotLabel" placeholder="e.g. Main / LH" /></FormField>
          <FormField label="Expected life (hrs)" class="sm:col-span-2"><TextInput v-model="c.expectedLifeHours" type="number" step="any" /></FormField>
          <div class="flex items-center justify-between gap-2 pb-1 sm:col-span-4">
            <label class="flex items-center gap-1.5 text-xs"><input v-model="c.isRequired" type="checkbox" class="h-3.5 w-3.5" /> Required</label>
            <button type="button" class="text-xs text-rose-600 hover:underline" @click="components.splice(idx, 1)">Remove</button>
          </div>
        </div>
      </div>

      <p v-if="blueprintError" role="alert" class="mt-3 text-sm text-rose-600">{{ blueprintError }}</p>
      <div class="mt-4 flex justify-end gap-2 border-t border-line pt-4">
        <BaseButton variant="secondary" @click="blueprintGroup = null">Close</BaseButton>
        <BaseButton :loading="blueprintSaving" @click="saveBlueprints">Save blueprint</BaseButton>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Delete asset group?"
      :message="`Delete ${confirmRow?.code}? Asset groups assigned to live vehicles cannot be removed.`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
  </section>
</template>
