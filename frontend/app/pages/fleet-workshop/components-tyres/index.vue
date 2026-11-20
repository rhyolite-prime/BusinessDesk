<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { MajorComponentRecord, TyreRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { COMPONENT_CONDITIONS, fleetErrorMessage, fleetStatusTone, humanLabel, todayIso } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Major components & tyres' })

const route = useRoute()
const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const activeTab = ref<'components' | 'tyres'>('components')
const viewMode = ref<'all' | 'live' | 'history'>('all')
const q = ref('')

const components = ref<MajorComponentRecord[]>([])
const compTotal = ref(0)
const compPage = ref(1)

const tyres = ref<TyreRecord[]>([])
const tyreTotal = ref(0)
const tyrePage = ref(1)

const size = 20
const loading = ref(false)
const error = ref('')

const filteredComponents = computed(() => {
  if (viewMode.value === 'live') return components.value.filter((c) => ['unassigned', 'fitted', 'in_repair'].includes(c.status))
  if (viewMode.value === 'history') return components.value.filter((c) => c.status === 'scrapped')
  return components.value
})

const filteredTyres = computed(() => {
  if (viewMode.value === 'live') return tyres.value.filter((t) => ['in_stock', 'fitted', 'in_repair', 'retreaded'].includes(t.status))
  if (viewMode.value === 'history') return tyres.value.filter((t) => ['removed', 'scrapped'].includes(t.status))
  return tyres.value
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'components') {
      const r = await api.majorComponents.list({
        q: q.value || undefined,
        page: compPage.value,
        size,
      })
      components.value = r.items
      compTotal.value = r.total
    } else {
      const r = await api.tyres.list({
        q: q.value || undefined,
        page: tyrePage.value,
        size,
      })
      tyres.value = r.items
      tyreTotal.value = r.total
    }
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([activeTab, unitId, compPage, tyrePage], load)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { compPage.value = 1; tyrePage.value = 1; void load() }, 250)
})
onMounted(() => {
  void load()
  if (route.query.new === '1') openCreateComp()
  else if (route.query.new === 'tyre') {
    activeTab.value = 'tyres'
    openCreateTyre()
  }
})

/* ------------------------ Major Component CRUD ---------------------------- */
const showCompModal = ref(false)
const editingComp = ref<MajorComponentRecord | null>(null)
const compSaving = ref(false)
const compError = ref('')
const compForm = reactive({
  componentCode: '',
  serialNo: '',
  componentType: 'ENGINE',
  description: '',
  manufacturer: '',
  condition: 'NEW',
  estimatedLifeHours: '10000',
  purchaseCost: '0',
  notes: '',
})

function openCreateComp() {
  editingComp.value = null
  compError.value = ''
  Object.assign(compForm, {
    componentCode: '',
    serialNo: '',
    componentType: 'ENGINE',
    description: '',
    manufacturer: '',
    condition: 'NEW',
    estimatedLifeHours: '10000',
    purchaseCost: '0',
    notes: '',
  })
  showCompModal.value = true
}

function openEditComp(row: MajorComponentRecord) {
  editingComp.value = row
  compError.value = ''
  Object.assign(compForm, {
    componentCode: row.componentCode,
    serialNo: row.serialNo || '',
    componentType: row.componentType,
    description: row.description || '',
    manufacturer: row.manufacturer || '',
    condition: row.condition || 'NEW',
    estimatedLifeHours: row.estimatedLifeHours || '0',
    purchaseCost: row.purchaseCost || '0',
    notes: row.notes || '',
  })
  showCompModal.value = true
}

async function saveComp() {
  if (compSaving.value) return
  if (!compForm.componentCode.trim() || !compForm.componentType.trim()) {
    compError.value = 'Component code and type are required.'
    return
  }
  compSaving.value = true
  compError.value = ''
  try {
    const body = {
      componentCode: compForm.componentCode.trim(),
      serialNo: compForm.serialNo.trim(),
      componentType: compForm.componentType.trim(),
      description: compForm.description.trim(),
      manufacturer: compForm.manufacturer.trim(),
      condition: compForm.condition,
      estimatedLifeHours: String(compForm.estimatedLifeHours || '0'),
      purchaseCost: String(compForm.purchaseCost || '0'),
      notes: compForm.notes.trim(),
    }
    if (editingComp.value) {
      await api.majorComponents.update(editingComp.value.id, { ...body, version: editingComp.value.version })
      toast.success('Component updated')
    } else {
      await api.majorComponents.create(body)
      toast.success('Major component registered')
    }
    showCompModal.value = false
    await load()
  } catch (e) {
    compError.value = fleetErrorMessage(e)
  } finally {
    compSaving.value = false
  }
}

/* ------------------------ Tyre CRUD --------------------------------------- */
const showTyreModal = ref(false)
const editingTyre = ref<TyreRecord | null>(null)
const tyreSaving = ref(false)
const tyreError = ref('')
const tyreForm = reactive({
  serialNo: '',
  brand: '',
  sizeSpec: '',
  pattern: '',
  currentTreadDepthMm: '18',
  purchaseCost: '0',
  supplierId: '',
  purchaseLocation: '',
  notes: '',
})

function openCreateTyre() {
  editingTyre.value = null
  tyreError.value = ''
  Object.assign(tyreForm, {
    serialNo: '',
    brand: '',
    sizeSpec: '12R22.5',
    pattern: '',
    currentTreadDepthMm: '18',
    purchaseCost: '0',
    supplierId: '',
    purchaseLocation: '',
    notes: '',
  })
  showTyreModal.value = true
}

function openEditTyre(row: TyreRecord) {
  editingTyre.value = row
  tyreError.value = ''
  Object.assign(tyreForm, {
    serialNo: row.serialNo,
    brand: row.brand || '',
    sizeSpec: row.sizeSpec || '',
    pattern: row.pattern || '',
    currentTreadDepthMm: row.currentTreadDepthMm || '18',
    purchaseCost: row.purchaseCost || '0',
    supplierId: row.supplierId || '',
    purchaseLocation: row.purchaseLocation || '',
    notes: row.notes || '',
  })
  showTyreModal.value = true
}

async function saveTyre() {
  if (tyreSaving.value) return
  if (!tyreForm.serialNo.trim()) {
    tyreError.value = 'Tyre serial No. is required.'
    return
  }
  tyreSaving.value = true
  tyreError.value = ''
  try {
    const body = {
      serialNo: tyreForm.serialNo.trim(),
      brand: tyreForm.brand.trim(),
      sizeSpec: tyreForm.sizeSpec.trim(),
      pattern: tyreForm.pattern.trim(),
      currentTreadDepthMm: String(tyreForm.currentTreadDepthMm || '0'),
      purchaseCost: String(tyreForm.purchaseCost || '0'),
      supplierId: tyreForm.supplierId || null,
      purchaseLocation: tyreForm.purchaseLocation.trim(),
      notes: tyreForm.notes.trim(),
    }
    if (editingTyre.value) {
      await api.tyres.update(editingTyre.value.id, { ...body, version: editingTyre.value.version })
      toast.success('Tyre updated')
    } else {
      await api.tyres.create(body)
      toast.success('Tyre registered')
    }
    showTyreModal.value = false
    await load()
  } catch (e) {
    tyreError.value = fleetErrorMessage(e)
  } finally {
    tyreSaving.value = false
  }
}

/* ------------------------ Lifecycle Action Modal -------------------------- */
type ActionModalState =
  | { kind: 'component'; id: string; label: string; act: 'mount' | 'remove' | 'repair' | 'scrap' }
  | { kind: 'tyre'; id: string; label: string; act: 'fit' | 'rotate' | 'repair' | 'remove' | 'retread' | 'scrap' }
  | null

const actModal = ref<ActionModalState>(null)
const actSaving = ref(false)
const actError = ref('')
const actForm = reactive({
  vehicleId: '',
  axlePosition: 'FL',
  eventDate: todayIso(),
  meterReading: '0',
  treadDepthMm: '14',
  cost: '0',
  condition: 'USED',
  locationNote: '',
  notes: '',
})

function openAction(state: NonNullable<ActionModalState>, defaultVehicleId?: string | null) {
  actModal.value = state
  actError.value = ''
  const v = defaultVehicleId ? opts.vehicleMap.value[defaultVehicleId] : undefined
  Object.assign(actForm, {
    vehicleId: defaultVehicleId || opts.vehicles.value[0]?.value || '',
    axlePosition: 'FL',
    eventDate: todayIso(),
    meterReading: v?.cumulativeMeterReading || v?.currentMeterReading || '0',
    treadDepthMm: '14',
    cost: '0',
    condition: state.act === 'repair' ? 'REBUILT' : 'USED',
    locationNote: '',
    notes: '',
  })
}

async function runAction() {
  if (!actModal.value || actSaving.value) return
  actSaving.value = true
  actError.value = ''
  try {
    const m = actModal.value
    if (m.kind === 'component') {
      await api.majorComponents.action(m.id, m.act, {
        vehicleId: m.act === 'mount' ? actForm.vehicleId : undefined,
        eventDate: actForm.eventDate,
        cumOdoReading: String(actForm.meterReading || '0'),
        condition: m.act === 'scrap' ? 'SCRAPPED' : actForm.condition,
        repairCost: m.act === 'repair' ? String(actForm.cost || '0') : '0',
        notes: actForm.notes.trim(),
      })
    } else {
      await api.tyres.action(m.id, m.act, {
        vehicleId: ['fit', 'rotate'].includes(m.act) ? actForm.vehicleId : undefined,
        axlePosition: ['fit', 'rotate'].includes(m.act) ? actForm.axlePosition.trim() : undefined,
        eventDate: actForm.eventDate,
        meterReading: String(actForm.meterReading || '0'),
        treadDepthMm: String(actForm.treadDepthMm || '0'),
        cost: ['repair', 'retread'].includes(m.act) ? String(actForm.cost || '0') : '0',
        locationNote: actForm.locationNote.trim(),
        notes: actForm.notes.trim(),
      })
    }
    toast.success(`${humanLabel(m.act)} completed`)
    actModal.value = null
    await load()
  } catch (e) {
    actError.value = fleetErrorMessage(e)
  } finally {
    actSaving.value = false
  }
}

/* ------------------------ Event History Modal ----------------------------- */
const historyTitle = ref('')
const historyEvents = ref<any[]>([])
const showHistory = ref(false)

async function openHistory(kind: 'component' | 'tyre', id: string, label: string) {
  historyTitle.value = `${kind === 'component' ? 'Component' : 'Tyre'} history — ${label}`
  historyEvents.value = []
  showHistory.value = true
  try {
    if (kind === 'component') {
      const full = await api.majorComponents.get(id)
      historyEvents.value = full.history || []
    } else {
      const full = await api.tyres.get(id)
      historyEvents.value = full.history || []
    }
  } catch (e) {
    toast.error('Failed to load history', fleetErrorMessage(e))
  }
}

const confirmRemove = ref<{ kind: 'component' | 'tyre'; id: string; label: string; version: number } | null>(null)
const deletingItem = ref(false)
async function performRemove() {
  if (!confirmRemove.value || deletingItem.value) return
  deletingItem.value = true
  try {
    if (confirmRemove.value.kind === 'component') {
      await api.majorComponents.remove(confirmRemove.value.id, confirmRemove.value.version)
      toast.success('Component deleted')
    } else {
      await api.tyres.remove(confirmRemove.value.id, confirmRemove.value.version)
      toast.success('Tyre deleted')
    }
    confirmRemove.value = null
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deletingItem.value = false
  }
}

const compCols = [
  { key: 'componentCode', label: 'Code / Serial No.' },
  { key: 'componentType', label: 'Type & description' },
  { key: 'assetNo', label: 'Mounted on' },
  { key: 'accumulatedHours', label: 'Accumulated hrs / Cost' },
  { key: 'status', label: 'Status / Cond.' },
  { key: '_actions', label: '', align: 'right' as const },
]

const tyreCols = [
  { key: 'serialNo', label: 'Serial / Size' },
  { key: 'brand', label: 'Brand & pattern' },
  { key: 'assetNo', label: 'Fitted position' },
  { key: 'currentTreadDepthMm', label: 'Tread / Usage' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Major components & tyres" subtitle="Track serialized engines, gearboxes and tyres across mounts, rotations, rebuilds, retreads and scrappage." icon="arrow-path">
      <BaseButton variant="secondary" icon="plus" @click="openCreateTyre">Register tyre</BaseButton>
      <BaseButton icon="plus" @click="openCreateComp">Register component</BaseButton>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div class="flex gap-1.5">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold"
            :class="activeTab === 'components' ? 'bg-primary text-white' : 'bg-canvas text-ink-soft'"
            @click="activeTab = 'components'"
          >
            Major components
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold"
            :class="activeTab === 'tyres' ? 'bg-primary text-white' : 'bg-canvas text-ink-soft'"
            @click="activeTab = 'tyres'"
          >
            Tyres
          </button>
        </div>
        <div class="flex gap-1.5 text-xs">
          <button
            v-for="m in [
              { id: 'all', label: 'All' },
              { id: 'live', label: 'Live / Mounted' },
              { id: 'history', label: 'Removed / Scrapped' },
            ] as const"
            :key="m.id"
            type="button"
            class="rounded-full border px-2.5 py-1 font-medium"
            :class="viewMode === m.id ? 'border-primary bg-primary-soft text-primary' : 'border-line text-ink-soft'"
            @click="viewMode = m.id"
          >
            {{ m.label }}
          </button>
        </div>
        <TextInput v-model="q" placeholder="Search code, serial, brand or type…" class="ml-auto max-w-xs" />
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable v-if="activeTab === 'components'" :columns="compCols" :rows="filteredComponents" :loading="loading" empty="No major components registered.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'componentCode'">
            <div class="font-semibold text-ink">{{ row.componentCode }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.serialNo || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'componentType'">
            <div class="font-medium">{{ row.componentType }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.description || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'assetNo'">
            <span v-if="row.assetNo">{{ row.assetNo }} {{ row.registrationNo ? `(${row.registrationNo})` : '' }}</span>
            <span v-else class="text-ink-faint">Unassigned</span>
          </template>
          <template v-else-if="col.key === 'accumulatedHours'">
            <div class="tnum">{{ Number(row.accumulatedHours || 0).toLocaleString() }} / {{ Number(row.estimatedLifeHours || 0).toLocaleString() }} hrs</div>
            <div class="text-[11px] text-ink-faint tnum">Repair: {{ formatCurrency(row.cumulativeRepairCost) }}</div>
          </template>
          <template v-else-if="col.key === 'status'">
            <div class="flex flex-wrap gap-1">
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(row.status)">{{ humanLabel(row.status) }}</span>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(row.condition)">{{ row.condition }}</span>
            </div>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex flex-wrap justify-end gap-1">
            <BaseButton v-if="['unassigned', 'in_repair'].includes(row.status)" size="sm" @click="openAction({ kind: 'component', id: row.id, label: row.componentCode, act: 'mount' })">Mount</BaseButton>
            <BaseButton v-if="row.status === 'fitted'" size="sm" variant="secondary" @click="openAction({ kind: 'component', id: row.id, label: row.componentCode, act: 'remove' }, row.currentVehicleId)">Remove</BaseButton>
            <BaseButton v-if="row.status !== 'scrapped'" size="sm" variant="ghost" @click="openAction({ kind: 'component', id: row.id, label: row.componentCode, act: 'repair' }, row.currentVehicleId)">Repair</BaseButton>
            <BaseButton v-if="row.status !== 'scrapped'" size="sm" variant="danger" @click="openAction({ kind: 'component', id: row.id, label: row.componentCode, act: 'scrap' }, row.currentVehicleId)">Scrap</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openHistory('component', row.id, row.componentCode)">Timeline</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openEditComp(row)">Edit</BaseButton>
            <BaseButton v-if="row.status === 'unassigned'" size="sm" variant="danger" @click="confirmRemove = { kind: 'component', id: row.id, label: row.componentCode, version: row.version }">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <DataTable v-else :columns="tyreCols" :rows="filteredTyres" :loading="loading" empty="No tyres registered.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'serialNo'">
            <div class="font-semibold text-ink">{{ row.serialNo }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.sizeSpec || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'brand'">
            <div>{{ row.brand || '—' }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.pattern || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'assetNo'">
            <span v-if="row.assetNo">{{ row.assetNo }} ({{ row.axlePosition || '—' }})</span>
            <span v-else class="text-ink-faint">In store / unmounted</span>
          </template>
          <template v-else-if="col.key === 'currentTreadDepthMm'">
            <div class="tnum">{{ row.currentTreadDepthMm }} mm</div>
            <div class="text-[11px] text-ink-faint tnum">{{ Number(row.accumulatedMeterUsage || 0).toLocaleString() }} usage</div>
          </template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">{{ humanLabel(row.status) }}</span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex flex-wrap justify-end gap-1">
            <BaseButton v-if="['in_stock', 'removed', 'retreaded'].includes(row.status)" size="sm" @click="openAction({ kind: 'tyre', id: row.id, label: row.serialNo, act: 'fit' })">Fit</BaseButton>
            <BaseButton v-if="row.status === 'fitted'" size="sm" variant="secondary" @click="openAction({ kind: 'tyre', id: row.id, label: row.serialNo, act: 'rotate' }, row.currentVehicleId)">Rotate</BaseButton>
            <BaseButton v-if="row.status === 'fitted'" size="sm" variant="secondary" @click="openAction({ kind: 'tyre', id: row.id, label: row.serialNo, act: 'remove' }, row.currentVehicleId)">Remove</BaseButton>
            <BaseButton v-if="row.status !== 'scrapped'" size="sm" variant="ghost" @click="openAction({ kind: 'tyre', id: row.id, label: row.serialNo, act: 'repair' }, row.currentVehicleId)">Repair</BaseButton>
            <BaseButton v-if="['in_stock', 'removed', 'in_repair'].includes(row.status)" size="sm" variant="ghost" @click="openAction({ kind: 'tyre', id: row.id, label: row.serialNo, act: 'retread' })">Retread</BaseButton>
            <BaseButton v-if="row.status !== 'scrapped'" size="sm" variant="danger" @click="openAction({ kind: 'tyre', id: row.id, label: row.serialNo, act: 'scrap' }, row.currentVehicleId)">Scrap</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openHistory('tyre', row.id, row.serialNo)">Timeline</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openEditTyre(row)">Edit</BaseButton>
            <BaseButton v-if="row.status === 'in_stock'" size="sm" variant="danger" @click="confirmRemove = { kind: 'tyre', id: row.id, label: row.serialNo, version: row.version }">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-if="activeTab === 'components'" v-model:page="compPage" :size="size" :total="compTotal" />
        <Pagination v-else v-model:page="tyrePage" :size="size" :total="tyreTotal" />
      </div>
    </div>

    <ModalShell :open="showCompModal" :title="editingComp ? `Component ${editingComp.componentCode}` : 'Register major component'" width="max-w-2xl" @close="showCompModal = false">
      <form class="space-y-3.5" @submit.prevent="saveComp">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Component code" required><TextInput v-model="compForm.componentCode" placeholder="e.g. ENG-C15-01" /></FormField>
          <FormField label="Serial No."><TextInput v-model="compForm.serialNo" /></FormField>
          <FormField label="Component type" required><TextInput v-model="compForm.componentType" placeholder="ENGINE, TRANSMISSION, AXLE…" /></FormField>
          <FormField label="Condition"><FleetSelect v-model="compForm.condition" :options="COMPONENT_CONDITIONS" :allow-empty="false" /></FormField>
          <FormField label="Manufacturer"><TextInput v-model="compForm.manufacturer" /></FormField>
          <FormField label="Estimated life (hrs)"><TextInput v-model="compForm.estimatedLifeHours" type="number" step="any" /></FormField>
          <FormField label="Purchase cost"><TextInput v-model="compForm.purchaseCost" type="number" step="any" /></FormField>
          <FormField label="Description" class="sm:col-span-2"><TextInput v-model="compForm.description" /></FormField>
        </div>
        <FormField label="Notes"><TextareaInput v-model="compForm.notes" :rows="2" /></FormField>
        <p v-if="compError" role="alert" class="text-sm text-rose-600">{{ compError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showCompModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="compSaving">Save component</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showTyreModal" :title="editingTyre ? `Tyre ${editingTyre.serialNo}` : 'Register tyre'" width="max-w-2xl" @close="showTyreModal = false">
      <form class="space-y-3.5" @submit.prevent="saveTyre">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Serial No." required><TextInput v-model="tyreForm.serialNo" /></FormField>
          <FormField label="Size specification"><TextInput v-model="tyreForm.sizeSpec" placeholder="e.g. 29.5R25 or 12R22.5" /></FormField>
          <FormField label="Brand"><TextInput v-model="tyreForm.brand" /></FormField>
          <FormField label="Tread pattern"><TextInput v-model="tyreForm.pattern" /></FormField>
          <FormField label="Current tread (mm)"><TextInput v-model="tyreForm.currentTreadDepthMm" type="number" step="any" /></FormField>
          <FormField label="Purchase cost"><TextInput v-model="tyreForm.purchaseCost" type="number" step="any" /></FormField>
          <FormField label="Supplier"><FleetSelect v-model="tyreForm.supplierId" :options="opts.suppliers.value" placeholder="None" /></FormField>
          <FormField label="Purchase location"><TextInput v-model="tyreForm.purchaseLocation" /></FormField>
        </div>
        <FormField label="Notes"><TextareaInput v-model="tyreForm.notes" :rows="2" /></FormField>
        <p v-if="tyreError" role="alert" class="text-sm text-rose-600">{{ tyreError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showTyreModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="tyreSaving">Save tyre</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="!!actModal" :title="actModal ? `${humanLabel(actModal.act)} — ${actModal.label}` : ''" width="max-w-lg" @close="actModal = null">
      <form v-if="actModal" class="space-y-3.5" @submit.prevent="runAction">
        <FormField v-if="['mount', 'fit', 'rotate'].includes(actModal.act)" :label="actModal.act === 'rotate' ? 'Target vehicle' : 'Vehicle'" required>
          <FleetSelect v-model="actForm.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" />
        </FormField>
        <FormField v-if="actModal.kind === 'tyre' && ['fit', 'rotate'].includes(actModal.act)" label="Axle / wheel position" required>
          <TextInput v-model="actForm.axlePosition" placeholder="e.g. FL, FR, RL1, RL2, SPARE" />
        </FormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Action date" required><TextInput v-model="actForm.eventDate" type="date" /></FormField>
          <FormField v-if="['mount', 'remove', 'fit', 'rotate', 'scrap'].includes(actModal.act)" label="Cumulative / Meter reading"><TextInput v-model="actForm.meterReading" type="number" step="any" /></FormField>
          <FormField v-if="actModal.kind === 'tyre'" label="Tread depth (mm)">
            <TextInput v-model="actForm.treadDepthMm" type="number" step="any" />
          </FormField>
          <FormField v-if="['repair', 'retread'].includes(actModal.act)" label="Cost"><TextInput v-model="actForm.cost" type="number" step="any" /></FormField>
          <FormField v-if="actModal.kind === 'component' && ['mount', 'remove', 'repair'].includes(actModal.act)" label="Condition">
            <FleetSelect v-model="actForm.condition" :options="COMPONENT_CONDITIONS" :allow-empty="false" />
          </FormField>
        </div>
        <FormField v-if="actModal.kind === 'tyre'" label="Location / Bay note"><TextInput v-model="actForm.locationNote" /></FormField>
        <FormField label="Notes"><TextareaInput v-model="actForm.notes" :rows="2" /></FormField>
        <p v-if="actError" role="alert" class="text-sm text-rose-600">{{ actError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="actModal = null">Cancel</BaseButton>
          <BaseButton type="submit" :loading="actSaving">Confirm {{ humanLabel(actModal.act) }}</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showHistory" :title="historyTitle" width="max-w-2xl" @close="showHistory = false">
      <div v-if="!historyEvents.length" class="py-6 text-center text-xs text-ink-faint">No lifecycle events logged yet.</div>
      <div v-else class="space-y-2.5">
        <div v-for="(ev, idx) in historyEvents" :key="idx" class="rounded-xl border border-line bg-canvas/50 p-3 text-xs">
          <div class="flex items-center justify-between font-semibold text-ink">
            <span>{{ humanLabel(ev.eventType) }}</span>
            <span class="text-ink-faint">{{ formatDate(ev.eventDate) }}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-4 text-ink-soft">
            <span v-if="ev.axlePosition">Pos: {{ ev.axlePosition }}</span>
            <span v-if="ev.cumOdoReading">Cum. Odo: {{ Number(ev.cumOdoReading).toLocaleString() }}</span>
            <span v-if="ev.meterReading">Meter: {{ Number(ev.meterReading).toLocaleString() }}</span>
            <span v-if="ev.treadDepthMm">Tread: {{ ev.treadDepthMm }} mm</span>
            <span v-if="ev.repairCost && Number(ev.repairCost) > 0">Cost: {{ formatCurrency(ev.repairCost) }}</span>
            <span v-if="ev.cost && Number(ev.cost) > 0">Cost: {{ formatCurrency(ev.cost) }}</span>
          </div>
          <p v-if="ev.notes" class="mt-1 text-ink-faint">{{ ev.notes }}</p>
        </div>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRemove"
      :title="`Delete ${confirmRemove?.kind === 'component' ? 'component' : 'tyre'}?`"
      :message="`Delete ${confirmRemove?.label}?`"
      confirm-label="Delete"
      tone="danger"
      :loading="deletingItem"
      @confirm="performRemove"
      @cancel="confirmRemove = null"
    />
  </section>
</template>
