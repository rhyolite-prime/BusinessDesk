<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { FuelLogRecord, FuelToleranceAlertRecord, LubricantLogRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { LUBRICANT_TYPES, fleetErrorMessage, fleetStatusTone, humanLabel, todayIso } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Fuel & lubricants' })

const route = useRoute()
const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const activeTab = ref<'fuel' | 'tolerances' | 'lubricants'>('fuel')
const vehicleFilter = ref('')

const fuelLogs = ref<FuelLogRecord[]>([])
const fuelTotal = ref(0)
const fuelPage = ref(1)

const tolerances = ref<FuelToleranceAlertRecord[]>([])
const tolTotal = ref(0)
const tolPage = ref(1)

const lubLogs = ref<LubricantLogRecord[]>([])
const lubTotal = ref(0)
const lubPage = ref(1)

const size = 20
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'fuel') {
      const r = await api.fuelLogs.list({
        accountingUnitId: unitId.value || undefined,
        vehicleId: vehicleFilter.value || undefined,
        page: fuelPage.value,
        size,
      })
      fuelLogs.value = r.items
      fuelTotal.value = r.total
    } else if (activeTab.value === 'tolerances') {
      const r = await api.fuelTolerances.list({
        accountingUnitId: unitId.value || undefined,
        vehicleId: vehicleFilter.value || undefined,
        page: tolPage.value,
        size,
      })
      tolerances.value = r.items
      tolTotal.value = r.total
    } else {
      const r = await api.lubricantLogs.list({
        accountingUnitId: unitId.value || undefined,
        vehicleId: vehicleFilter.value || undefined,
        page: lubPage.value,
        size,
      })
      lubLogs.value = r.items
      lubTotal.value = r.total
    }
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([activeTab, vehicleFilter, unitId, fuelPage, tolPage, lubPage], load)
onMounted(() => {
  void load()
  if (route.query.new === '1') void openCreateFuel()
  else if (route.query.new === 'lub') void openCreateLub()
})

/* ----------------------------- Fuel Log Modal ----------------------------- */
const showFuelModal = ref(false)
const editingFuel = ref<FuelLogRecord | null>(null)
const fuelSaving = ref(false)
const fuelError = ref('')
const fuelPreviewNo = ref('')
const fuelForm = reactive({
  accountingUnitId: '',
  vehicleId: '',
  driverEmployeeId: '',
  logDate: todayIso(),
  warehouseId: '',
  fuelItemId: '',
  uomId: '',
  supplierId: '',
  costCenterId: '',
  stationOrPump: '',
  quantityLitres: '',
  unitCost: '0',
  meterReading: '0',
  notes: '',
})

async function openCreateFuel() {
  editingFuel.value = null
  fuelError.value = ''
  fuelPreviewNo.value = ''
  const defaultUnit = unitId.value || opts.accountingUnits.value[0]?.value || ''
  Object.assign(fuelForm, {
    accountingUnitId: defaultUnit,
    vehicleId: vehicleFilter.value || opts.vehicles.value[0]?.value || '',
    driverEmployeeId: '',
    logDate: todayIso(),
    warehouseId: opts.invWarehouses.value[0]?.value || '',
    fuelItemId: opts.invItems.value[0]?.value || '',
    uomId: opts.invUoms.value[0]?.value || '',
    supplierId: '',
    costCenterId: '',
    stationOrPump: '',
    quantityLitres: '',
    unitCost: '0',
    meterReading: '0',
    notes: '',
  })
  onFuelVehicleChange(fuelForm.vehicleId)
  onFuelItemChange(fuelForm.fuelItemId)
  showFuelModal.value = true
  if (defaultUnit) {
    try {
      const n = await api.fuelLogs.nextNumber(defaultUnit)
      fuelPreviewNo.value = n.nextNumber
    } catch { /* ignore */ }
  }
}

function openEditFuel(row: FuelLogRecord) {
  editingFuel.value = row
  fuelPreviewNo.value = row.fuelLogNumber
  fuelError.value = ''
  Object.assign(fuelForm, {
    vehicleId: row.vehicleId,
    driverEmployeeId: row.driverEmployeeId || '',
    logDate: row.logDate?.slice(0, 10) || todayIso(),
    warehouseId: row.warehouseId || '',
    fuelItemId: row.fuelItemId || '',
    uomId: row.uomId || '',
    supplierId: row.supplierId || '',
    costCenterId: row.costCenterId || '',
    stationOrPump: row.stationOrPump || '',
    quantityLitres: row.quantityLitres,
    unitCost: row.unitCost || '0',
    meterReading: row.meterReading || '0',
    notes: row.notes || '',
  })
  showFuelModal.value = true
}

function onFuelVehicleChange(vehicleId: string) {
  fuelForm.vehicleId = vehicleId
  const v = opts.vehicleMap.value[vehicleId]
  if (v) fuelForm.meterReading = v.currentMeterReading || '0'
}

function onFuelItemChange(itemId: string) {
  fuelForm.fuelItemId = itemId
  if (opts.invItemBaseUom.value[itemId]) fuelForm.uomId = opts.invItemBaseUom.value[itemId]
  if (opts.invItemCost.value[itemId]) fuelForm.unitCost = opts.invItemCost.value[itemId]
}

async function saveFuel() {
  if (fuelSaving.value) return
  const resolvedUnit = editingFuel.value ? editingFuel.value.accountingUnitId : (fuelForm.accountingUnitId || unitId.value)
  if (!resolvedUnit) {
    fuelError.value = 'Accounting unit is required.'
    return
  }
  if (!fuelForm.vehicleId || !fuelForm.quantityLitres) {
    fuelError.value = 'Vehicle and litres are required.'
    return
  }
  fuelSaving.value = true
  fuelError.value = ''
  try {
    const body = {
      accountingUnitId: resolvedUnit,
      vehicleId: fuelForm.vehicleId,
      driverEmployeeId: fuelForm.driverEmployeeId || null,
      logDate: fuelForm.logDate,
      warehouseId: fuelForm.warehouseId || null,
      fuelItemId: fuelForm.fuelItemId || null,
      uomId: fuelForm.uomId || null,
      supplierId: fuelForm.supplierId || null,
      costCenterId: fuelForm.costCenterId || null,
      stationOrPump: fuelForm.stationOrPump.trim(),
      quantityLitres: String(fuelForm.quantityLitres),
      unitCost: String(fuelForm.unitCost || '0'),
      meterReading: String(fuelForm.meterReading || '0'),
      notes: fuelForm.notes.trim(),
    }
    if (editingFuel.value) {
      await api.fuelLogs.update(editingFuel.value.id, { ...body, version: editingFuel.value.version })
      toast.success('Fuel log updated')
    } else {
      await api.fuelLogs.create(body)
      toast.success('Fuel log created')
    }
    showFuelModal.value = false
    await load()
  } catch (e) {
    fuelError.value = fleetErrorMessage(e)
  } finally {
    fuelSaving.value = false
  }
}

/* Direct GL Post modal when Fuel Log is not linked to an Inventory warehouse item */
const glPostFuelTarget = ref<FuelLogRecord | null>(null)
const glPostForm = reactive({ periodId: '', creditAccountId: '', debitAccountId: '' })
const glPostAccounts = ref<Array<{ value: string; label: string }>>([])
const glPosting = ref(false)
const glPostError = ref('')

async function postFuel(row: FuelLogRecord) {
  if (row.fuelItemId && row.warehouseId) {
    try {
      await api.fuelLogs.post(row.id)
      toast.success('Fuel log posted to Inventory & GL')
      await Promise.all([load(), opts.loadShared()])
    } catch (e) {
      toast.error('Post failed', fleetErrorMessage(e))
    }
    return
  }
  glPostFuelTarget.value = row
  glPostError.value = ''
  glPostForm.periodId = opts.openPeriods.value[0]?.value || ''
  glPostForm.creditAccountId = ''
  glPostForm.debitAccountId = ''
  try {
    const glOpts = await api.glSettings.options(row.accountingUnitId)
    glPostAccounts.value = (glOpts.accounts || []).map((a) => ({ value: a.id, label: `${a.accountNumber} — ${a.name}` }))
  } catch { /* ignore */ }
}

async function submitGlFuelPost() {
  if (!glPostFuelTarget.value || glPosting.value) return
  glPosting.value = true
  glPostError.value = ''
  try {
    await api.fuelLogs.post(glPostFuelTarget.value.id, {
      periodId: glPostForm.periodId || undefined,
      creditAccountId: glPostForm.creditAccountId || undefined,
      debitAccountId: glPostForm.debitAccountId || undefined,
    })
    glPostFuelTarget.value = null
    toast.success('Fuel log posted to GL')
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    glPostError.value = fleetErrorMessage(e)
  } finally {
    glPosting.value = false
  }
}

async function reverseFuel(row: FuelLogRecord) {
  try {
    await api.fuelLogs.reverse(row.id)
    toast.success('Fuel log reversed')
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    toast.error('Reverse failed', fleetErrorMessage(e))
  }
}

/* ----------------------------- Lubricant Modal ---------------------------- */
const showLubModal = ref(false)
const lubSaving = ref(false)
const lubError = ref('')
const lubPreviewNo = ref('')
const lubForm = reactive({
  accountingUnitId: '',
  vehicleId: '',
  logDate: todayIso(),
  lubricantType: 'engine_oil',
  warehouseId: '',
  itemId: '',
  uomId: '',
  quantity: '',
  unitCost: '0',
  meterReading: '0',
  isOilChange: false,
  notes: '',
})

async function openCreateLub() {
  lubError.value = ''
  lubPreviewNo.value = ''
  const defaultUnit = unitId.value || opts.accountingUnits.value[0]?.value || ''
  Object.assign(lubForm, {
    accountingUnitId: defaultUnit,
    vehicleId: vehicleFilter.value || opts.vehicles.value[0]?.value || '',
    logDate: todayIso(),
    lubricantType: 'engine_oil',
    warehouseId: opts.invWarehouses.value[0]?.value || '',
    itemId: opts.invItems.value[0]?.value || '',
    uomId: opts.invUoms.value[0]?.value || '',
    quantity: '',
    unitCost: '0',
    meterReading: '0',
    isOilChange: false,
    notes: '',
  })
  onLubVehicleChange(lubForm.vehicleId)
  onLubItemChange(lubForm.itemId)
  showLubModal.value = true
  if (defaultUnit) {
    try {
      const n = await api.lubricantLogs.nextNumber(defaultUnit)
      lubPreviewNo.value = n.nextNumber
    } catch { /* ignore */ }
  }
}

function onLubVehicleChange(vehicleId: string) {
  lubForm.vehicleId = vehicleId
  const v = opts.vehicleMap.value[vehicleId]
  if (v) lubForm.meterReading = v.currentMeterReading || '0'
}

function onLubItemChange(itemId: string) {
  lubForm.itemId = itemId
  if (opts.invItemBaseUom.value[itemId]) lubForm.uomId = opts.invItemBaseUom.value[itemId]
  if (opts.invItemCost.value[itemId]) lubForm.unitCost = opts.invItemCost.value[itemId]
}

async function saveLub() {
  if (lubSaving.value) return
  const resolvedUnit = lubForm.accountingUnitId || unitId.value
  if (!resolvedUnit) {
    lubError.value = 'Accounting unit is required.'
    return
  }
  if (!lubForm.vehicleId || !lubForm.quantity) {
    lubError.value = 'Vehicle and quantity are required.'
    return
  }
  lubSaving.value = true
  lubError.value = ''
  try {
    await api.lubricantLogs.create({
      accountingUnitId: resolvedUnit,
      vehicleId: lubForm.vehicleId,
      logDate: lubForm.logDate,
      lubricantType: lubForm.lubricantType,
      warehouseId: lubForm.warehouseId || null,
      itemId: lubForm.itemId || null,
      uomId: lubForm.uomId || null,
      quantity: String(lubForm.quantity),
      unitCost: String(lubForm.unitCost || '0'),
      meterReading: String(lubForm.meterReading || '0'),
      isOilChange: lubForm.isOilChange,
      notes: lubForm.notes.trim(),
    })
    toast.success('Lubricant log created')
    showLubModal.value = false
    await load()
  } catch (e) {
    lubError.value = fleetErrorMessage(e)
  } finally {
    lubSaving.value = false
  }
}

async function postLub(row: LubricantLogRecord) {
  try {
    await api.lubricantLogs.post(row.id)
    toast.success('Lubricant log posted to Inventory & GL')
    await load()
  } catch (e) {
    toast.error('Post failed', fleetErrorMessage(e))
  }
}

async function reverseLub(row: LubricantLogRecord) {
  try {
    await api.lubricantLogs.reverse(row.id)
    toast.success('Lubricant log reversed')
    await load()
  } catch (e) {
    toast.error('Reverse failed', fleetErrorMessage(e))
  }
}

const confirmDelete = ref<{ kind: 'fuel' | 'lub'; id: string; label: string; version: number } | null>(null)
const deleting = ref(false)
async function performDelete() {
  if (!confirmDelete.value || deleting.value) return
  deleting.value = true
  try {
    if (confirmDelete.value.kind === 'fuel') {
      await api.fuelLogs.remove(confirmDelete.value.id, confirmDelete.value.version)
    } else {
      await api.lubricantLogs.remove(confirmDelete.value.id, confirmDelete.value.version)
    }
    confirmDelete.value = null
    toast.success('Draft log deleted')
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const fuelCols = [
  { key: 'fuelLogNumber', label: 'Log No.' },
  { key: 'logDate', label: 'Date' },
  { key: 'assetNo', label: 'Vehicle' },
  { key: 'quantityLitres', label: 'Litres / Cost' },
  { key: 'actualConsumptionRate', label: 'Consumption / Tolerance' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]

const tolCols = [
  { key: 'fuelLogNumber', label: 'Log No.' },
  { key: 'logDate', label: 'Date' },
  { key: 'assetNo', label: 'Vehicle' },
  { key: 'quantityLitres', label: 'Litres' },
  { key: 'actualRate', label: 'Actual vs Ideal' },
  { key: 'variancePct', label: 'Variance' },
  { key: 'stationOrPump', label: 'Station / Pump' },
]

const lubCols = [
  { key: 'lubricantLogNumber', label: 'Log No.' },
  { key: 'logDate', label: 'Date' },
  { key: 'assetNo', label: 'Vehicle' },
  { key: 'lubricantType', label: 'Lubricant' },
  { key: 'quantity', label: 'Qty / Cost' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Fuel & lubricants" subtitle="Daily fuel issues, variance tolerance checks, lubricant logs, and Inventory + GL posting." icon="arrow-path">
      <BaseButton variant="secondary" icon="plus" @click="openCreateLub">Log lubricant</BaseButton>
      <BaseButton icon="plus" @click="openCreateFuel">Log fuel issue</BaseButton>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div class="flex gap-1.5">
          <button
            v-for="t in [
              { id: 'fuel', label: 'Fuel logs' },
              { id: 'tolerances', label: 'Fuel tolerance alerts' },
              { id: 'lubricants', label: 'Lubricant logs' },
            ] as const"
            :key="t.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            :class="activeTab === t.id ? 'bg-primary text-white' : 'bg-canvas text-ink-soft hover:text-ink'"
            @click="activeTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="w-64">
          <FleetSelect v-model="vehicleFilter" :options="opts.vehicles.value" placeholder="All vehicles…" />
        </div>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable v-if="activeTab === 'fuel'" :columns="fuelCols" :rows="fuelLogs" :loading="loading" empty="No fuel logs recorded.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'fuelLogNumber'">
            <div class="font-semibold">{{ row.fuelLogNumber }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.stationOrPump || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'logDate'">{{ formatDate(row.logDate) }}</template>
          <template v-else-if="col.key === 'assetNo'">
            <div>{{ row.assetNo }}</div>
            <div class="text-[11px] text-ink-faint tnum">Meter: {{ Number(row.meterReading || 0).toLocaleString() }}</div>
          </template>
          <template v-else-if="col.key === 'quantityLitres'">
            <div class="font-medium tnum">{{ Number(row.quantityLitres).toLocaleString() }} L</div>
            <div class="text-[11px] text-ink-faint tnum">{{ formatCurrency(row.totalCost) }}</div>
          </template>
          <template v-else-if="col.key === 'actualConsumptionRate'">
            <div class="tnum">{{ row.actualConsumptionRate ? Number(row.actualConsumptionRate).toFixed(2) : '—' }}</div>
            <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(row.withinTolerance ? 'good' : 'failed')">
              {{ row.withinTolerance ? 'Within tolerance' : `Alert (${Number(row.variancePct || 0).toFixed(1)}%)` }}
            </span>
          </template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">{{ humanLabel(row.status) }}</span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <template v-if="row.status === 'draft'">
              <BaseButton size="sm" variant="ghost" @click="openEditFuel(row)">Edit</BaseButton>
              <BaseButton size="sm" @click="postFuel(row)">Post</BaseButton>
              <BaseButton size="sm" variant="danger" @click="confirmDelete = { kind: 'fuel', id: row.id, label: row.fuelLogNumber, version: row.version }">Delete</BaseButton>
            </template>
            <BaseButton v-else-if="row.status === 'posted'" size="sm" variant="secondary" @click="reverseFuel(row)">Reverse</BaseButton>
          </div>
        </template>
      </DataTable>

      <DataTable v-else-if="activeTab === 'tolerances'" :columns="tolCols" :rows="tolerances" :loading="loading" empty="No fuel tolerance breaches recorded.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'logDate'">{{ formatDate(row.logDate) }}</template>
          <template v-else-if="col.key === 'quantityLitres'"><span class="tnum">{{ Number(row.quantityLitres).toLocaleString() }} L</span></template>
          <template v-else-if="col.key === 'actualRate'"><span class="tnum">{{ Number(row.actualRate || 0).toFixed(2) }} vs {{ Number(row.idealRate || 0).toFixed(2) }} ({{ humanLabel(row.consumptionUnit) }})</span></template>
          <template v-else-if="col.key === 'variancePct'"><span class="tnum font-semibold text-rose-600">{{ Number(row.variancePct || 0).toFixed(1) }}%</span></template>
        </template>
      </DataTable>

      <DataTable v-else :columns="lubCols" :rows="lubLogs" :loading="loading" empty="No lubricant logs recorded.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'lubricantLogNumber'">
            <div class="font-semibold">{{ row.lubricantLogNumber }}</div>
            <div v-if="row.isOilChange" class="text-[11px] font-medium text-blue-700">Oil change</div>
          </template>
          <template v-else-if="col.key === 'logDate'">{{ formatDate(row.logDate) }}</template>
          <template v-else-if="col.key === 'lubricantType'">{{ humanLabel(row.lubricantType) }}</template>
          <template v-else-if="col.key === 'quantity'">
            <div class="font-medium tnum">{{ Number(row.quantity).toLocaleString() }}</div>
            <div class="text-[11px] text-ink-faint tnum">{{ formatCurrency(row.totalCost) }}</div>
          </template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">{{ humanLabel(row.status) }}</span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <template v-if="row.status === 'draft'">
              <BaseButton size="sm" @click="postLub(row)">Post</BaseButton>
              <BaseButton size="sm" variant="danger" @click="confirmDelete = { kind: 'lub', id: row.id, label: row.lubricantLogNumber, version: row.version }">Delete</BaseButton>
            </template>
            <BaseButton v-else-if="row.status === 'posted'" size="sm" variant="secondary" @click="reverseLub(row)">Reverse</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-if="activeTab === 'fuel'" v-model:page="fuelPage" :size="size" :total="fuelTotal" />
        <Pagination v-else-if="activeTab === 'tolerances'" v-model:page="tolPage" :size="size" :total="tolTotal" />
        <Pagination v-else v-model:page="lubPage" :size="size" :total="lubTotal" />
      </div>
    </div>

    <ModalShell :open="showFuelModal" :title="editingFuel ? `Edit fuel log ${editingFuel.fuelLogNumber}` : `Log daily fuel issue ${fuelPreviewNo ? `(${fuelPreviewNo})` : ''}`" width="max-w-2xl" @close="showFuelModal = false">
      <form class="space-y-3.5" @submit.prevent="saveFuel">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField v-if="!editingFuel" label="Accounting unit" required class="sm:col-span-2">
            <FleetSelect v-model="fuelForm.accountingUnitId" :options="opts.accountingUnits.value" placeholder="Select accounting unit…" />
          </FormField>
          <FormField label="Log date" required><TextInput v-model="fuelForm.logDate" type="date" /></FormField>
          <FormField label="Vehicle" required><FleetSelect :model-value="fuelForm.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" @update:model-value="onFuelVehicleChange" /></FormField>
          <FormField label="Driver / operator"><FleetSelect v-model="fuelForm.driverEmployeeId" :options="opts.employees.value" placeholder="None" /></FormField>
          <FormField label="Station / Pump"><TextInput v-model="fuelForm.stationOrPump" placeholder="e.g. Site Tank A or Shell Pump 2" /></FormField>
          <FormField label="Fuel tank / warehouse"><FleetSelect v-model="fuelForm.warehouseId" :options="opts.invWarehouses.value" placeholder="Optional warehouse…" /></FormField>
          <FormField label="Fuel item (Inventory)"><FleetSelect :model-value="fuelForm.fuelItemId" :options="opts.invItems.value" placeholder="Optional item…" @update:model-value="onFuelItemChange" /></FormField>
          <FormField label="UOM"><FleetSelect v-model="fuelForm.uomId" :options="opts.invUoms.value" placeholder="UOM…" /></FormField>
          <FormField label="Supplier"><FleetSelect v-model="fuelForm.supplierId" :options="opts.suppliers.value" placeholder="None" /></FormField>
          <FormField label="Litres issued" required><TextInput v-model="fuelForm.quantityLitres" type="number" step="any" /></FormField>
          <FormField label="Unit cost"><TextInput v-model="fuelForm.unitCost" type="number" step="any" /></FormField>
          <FormField label="Meter reading at fuel"><TextInput v-model="fuelForm.meterReading" type="number" step="any" /></FormField>
          <FormField label="Cost center"><FleetSelect v-model="fuelForm.costCenterId" :options="opts.costCenters.value" placeholder="None" /></FormField>
        </div>
        <FormField label="Notes"><TextareaInput v-model="fuelForm.notes" :rows="2" /></FormField>
        <p v-if="fuelError" role="alert" class="text-sm text-rose-600">{{ fuelError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showFuelModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="fuelSaving">Save fuel log</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="!!glPostFuelTarget" :title="`Post non-stock fuel log — ${glPostFuelTarget?.fuelLogNumber}`" width="max-w-md" @close="glPostFuelTarget = null">
      <form class="space-y-3.5" @submit.prevent="submitGlFuelPost">
        <p class="text-xs text-ink-soft">No Inventory warehouse/item linked. Select an accounting period and credit account (or leave blank if zero-cost memo) to post to GL.</p>
        <FormField label="Accounting period"><FleetSelect v-model="glPostForm.periodId" :options="opts.openPeriods.value" placeholder="Select period…" /></FormField>
        <FormField label="Credit account (Cash / Bank / AP)"><FleetSelect v-model="glPostForm.creditAccountId" :options="glPostAccounts" placeholder="Select credit account…" /></FormField>
        <FormField label="Debit account override (optional)"><FleetSelect v-model="glPostForm.debitAccountId" :options="glPostAccounts" placeholder="Use Fleet GL Setting" /></FormField>
        <p v-if="glPostError" role="alert" class="text-sm text-rose-600">{{ glPostError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="glPostFuelTarget = null">Cancel</BaseButton>
          <BaseButton type="submit" :loading="glPosting">Post to GL</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showLubModal" :title="`Log lubricant / oil issue ${lubPreviewNo ? `(${lubPreviewNo})` : ''}`" width="max-w-2xl" @close="showLubModal = false">
      <form class="space-y-3.5" @submit.prevent="saveLub">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Accounting unit" required class="sm:col-span-2">
            <FleetSelect v-model="lubForm.accountingUnitId" :options="opts.accountingUnits.value" placeholder="Select accounting unit…" />
          </FormField>
          <FormField label="Log date" required><TextInput v-model="lubForm.logDate" type="date" /></FormField>
          <FormField label="Vehicle" required><FleetSelect :model-value="lubForm.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" @update:model-value="onLubVehicleChange" /></FormField>
          <FormField label="Lubricant type"><FleetSelect v-model="lubForm.lubricantType" :options="LUBRICANT_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Warehouse"><FleetSelect v-model="lubForm.warehouseId" :options="opts.invWarehouses.value" placeholder="Optional warehouse…" /></FormField>
          <FormField label="Inventory item"><FleetSelect :model-value="lubForm.itemId" :options="opts.invItems.value" placeholder="Optional item…" @update:model-value="onLubItemChange" /></FormField>
          <FormField label="UOM"><FleetSelect v-model="lubForm.uomId" :options="opts.invUoms.value" placeholder="UOM…" /></FormField>
          <FormField label="Quantity" required><TextInput v-model="lubForm.quantity" type="number" step="any" /></FormField>
          <FormField label="Unit cost"><TextInput v-model="lubForm.unitCost" type="number" step="any" /></FormField>
          <FormField label="Meter reading"><TextInput v-model="lubForm.meterReading" type="number" step="any" /></FormField>
          <label class="flex items-center gap-2 pt-6 text-xs font-medium"><input v-model="lubForm.isOilChange" type="checkbox" class="h-4 w-4" /> Full oil change</label>
        </div>
        <FormField label="Notes"><TextareaInput v-model="lubForm.notes" :rows="2" /></FormField>
        <p v-if="lubError" role="alert" class="text-sm text-rose-600">{{ lubError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showLubModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="lubSaving">Save lubricant log</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmDelete"
      title="Delete draft log?"
      :message="`Delete draft ${confirmDelete?.label}?`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="performDelete"
      @cancel="confirmDelete = null"
    />
  </section>
</template>
