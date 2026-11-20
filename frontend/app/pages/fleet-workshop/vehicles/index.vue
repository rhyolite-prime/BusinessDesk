<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { PmTriggerRecord, VehicleRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import {
  CONSUMPTION_UNITS,
  DEPRECIATION_METHODS,
  METER_UNITS,
  OWNERSHIP_TYPES,
  TRIGGER_METRICS,
  VEHICLE_CONDITIONS,
  VEHICLE_STATUSES,
  fleetErrorMessage,
  fleetStatusTone,
  humanLabel,
  todayIso,
} from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Asset register' })

const route = useRoute()
const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<VehicleRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const q = ref('')
const filterPreset = ref<'all' | 'heavy' | 'light' | 'trailer' | 'workshop' | 'breakdown' | 'stalled'>('all')
const loading = ref(false)
const error = ref('')

const filteredRows = computed(() => {
  if (filterPreset.value === 'all') return rows.value
  if (filterPreset.value === 'heavy') return rows.value.filter((v) => v.isHeavyMachinery)
  if (filterPreset.value === 'light') return rows.value.filter((v) => !v.isHeavyMachinery && !v.isTrailerUnit)
  if (filterPreset.value === 'trailer') return rows.value.filter((v) => v.isTrailerUnit)
  if (filterPreset.value === 'workshop') return rows.value.filter((v) => v.status === 'in_workshop')
  if (filterPreset.value === 'breakdown') return rows.value.filter((v) => v.condition === 'breakdown')
  if (filterPreset.value === 'stalled') return rows.value.filter((v) => v.isMeterStalled)
  return rows.value
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.vehicles.list({
      accountingUnitId: unitId.value || undefined,
      q: q.value || undefined,
      page: page.value,
      size,
    })
    rows.value = r.items
    total.value = r.total
  } catch (e) {
    rows.value = []
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(unitId, () => { page.value = 1; void load() })
watch(page, load)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; void load() }, 250)
})
onMounted(() => {
  void load()
  if (route.query.new === '1') void openCreate()
})

/* ----------------------------- Vehicle modal ------------------------------- */
const showModal = ref(false)
const modalTab = ref<'general' | 'utilization' | 'purchase' | 'triggers'>('general')
const editing = ref<VehicleRecord | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  accountingUnitId: '',
  assetNo: '',
  registrationNo: '',
  assetGroupId: '',
  ownershipType: 'company_owned',
  isHeavyMachinery: false,
  isMiningEquipment: false,
  isTrailerUnit: false,
  coupledTrailerId: '',
  departmentName: '',
  maintenanceDepartmentName: '',
  costCenterId: '',
  logDate: todayIso(),
  condition: 'good',
  status: 'active',
  makeModel: '',
  modelNo: '',
  serialNo: '',
  chassisNo: '',
  engineNo: '',
  manufactureDate: '',
  purchaseAmount: '0',
  purchaseDate: '',
  currencyId: '',
  dateInstalled: '',
  vendorSupplierId: '',
  vendorName: '',
  customerId: '',
  assignedEmployeeId: '',
  fixedAssetId: '',
  residualValue: '0',
  usefulLifeMonths: 60,
  depreciationMethod: 'straight_line',
  accumulatedDepreciation: '0',
  weekdayUtilization: '10',
  weekdayDays: 5,
  saturdayUtilization: '8',
  sundayUtilization: '0',
  trackFuelConsumption: true,
  idealConsumptionRate: '0',
  consumptionUnit: 'litres_per_hour',
  toleranceBelowPct: '10',
  toleranceAbovePct: '10',
  useFuelLogForPm: false,
  primaryMeterUnit: 'hours',
  currentMeterReading: '0',
  cumulativeMeterReading: '0',
  notes: '',
})

const triggers = ref<PmTriggerRecord[]>([])
const triggersSaving = ref(false)
const triggersError = ref('')

function resetForm() {
  Object.assign(form, {
    accountingUnitId: unitId.value || opts.accountingUnits.value[0]?.value || '',
    assetNo: '',
    registrationNo: '',
    assetGroupId: '',
    ownershipType: 'company_owned',
    isHeavyMachinery: false,
    isMiningEquipment: false,
    isTrailerUnit: false,
    coupledTrailerId: '',
    departmentName: '',
    maintenanceDepartmentName: '',
    costCenterId: '',
    logDate: todayIso(),
    condition: 'good',
    status: 'active',
    makeModel: '',
    modelNo: '',
    serialNo: '',
    chassisNo: '',
    engineNo: '',
    manufactureDate: '',
    purchaseAmount: '0',
    purchaseDate: '',
    currencyId: '',
    dateInstalled: '',
    vendorSupplierId: '',
    vendorName: '',
    customerId: '',
    assignedEmployeeId: '',
    fixedAssetId: '',
    residualValue: '0',
    usefulLifeMonths: 60,
    depreciationMethod: 'straight_line',
    accumulatedDepreciation: '0',
    weekdayUtilization: '10',
    weekdayDays: 5,
    saturdayUtilization: '8',
    sundayUtilization: '0',
    trackFuelConsumption: true,
    idealConsumptionRate: '0',
    consumptionUnit: 'litres_per_hour',
    toleranceBelowPct: '10',
    toleranceAbovePct: '10',
    useFuelLogForPm: false,
    primaryMeterUnit: 'hours',
    currentMeterReading: '0',
    cumulativeMeterReading: '0',
    notes: '',
  })
}

async function openCreate() {
  editing.value = null
  formError.value = ''
  triggers.value = []
  modalTab.value = 'general'
  resetForm()
  showModal.value = true
  const targetUnit = form.accountingUnitId || unitId.value
  if (targetUnit) {
    try {
      const n = await api.vehicles.nextNumber(targetUnit)
      form.assetNo = n.nextNumber
    } catch {
      form.assetNo = ''
    }
  }
}

async function onCreateUnitChange(nextUnit: string) {
  if (!editing.value && nextUnit) {
    if (!unitId.value) unitId.value = nextUnit
    if (!form.assetNo.trim()) {
      try {
        const n = await api.vehicles.nextNumber(nextUnit)
        form.assetNo = n.nextNumber
      } catch {
        // keep manual input
      }
    }
  }
}

function onAssetGroupChange(groupId: string) {
  if (editing.value || !groupId) return
  const grp = opts.vehicleOptions.value.assetGroups.find((g) => g.id === groupId) as
    | (typeof opts.vehicleOptions.value.assetGroups[number] & { defaultTriggerMetric?: string })
    | undefined
  if (!grp) return
  if (!form.makeModel.trim() && grp.model) form.makeModel = grp.model
  if (grp.defaultTriggerMetric && grp.defaultTriggerMetric !== 'dates') {
    form.primaryMeterUnit = grp.defaultTriggerMetric
  }
  if (grp.assetClass === 'heavy_equipment' || grp.assetClass === 'mining_equipment') {
    form.isHeavyMachinery = true
  }
  if (grp.assetClass === 'mining_equipment') form.isMiningEquipment = true
  if (grp.assetClass === 'trailer') form.isTrailerUnit = true
}

async function openEdit(row: VehicleRecord, startTab: 'general' | 'triggers' = 'general') {
  formError.value = ''
  triggersError.value = ''
  modalTab.value = startTab
  showModal.value = true
  try {
    const full = await api.vehicles.get(row.id)
    editing.value = full
    Object.assign(form, {
      assetNo: full.assetNo || '',
      registrationNo: full.registrationNo || '',
      assetGroupId: full.assetGroupId || '',
      ownershipType: full.ownershipType || 'company_owned',
      isHeavyMachinery: Boolean(full.isHeavyMachinery),
      isMiningEquipment: Boolean(full.isMiningEquipment),
      isTrailerUnit: Boolean(full.isTrailerUnit),
      coupledTrailerId: full.coupledTrailerId || '',
      departmentName: full.departmentName || '',
      maintenanceDepartmentName: full.maintenanceDepartmentName || '',
      costCenterId: full.costCenterId || '',
      logDate: full.logDate?.slice(0, 10) || '',
      condition: full.condition || 'good',
      status: full.status || 'active',
      makeModel: full.makeModel || '',
      modelNo: full.modelNo || '',
      serialNo: full.serialNo || '',
      chassisNo: full.chassisNo || '',
      engineNo: full.engineNo || '',
      manufactureDate: full.manufactureDate?.slice(0, 10) || '',
      purchaseAmount: full.purchaseAmount || '0',
      purchaseDate: full.purchaseDate?.slice(0, 10) || '',
      currencyId: full.currencyId || '',
      dateInstalled: full.dateInstalled?.slice(0, 10) || '',
      vendorSupplierId: full.vendorSupplierId || '',
      vendorName: full.vendorName || '',
      customerId: full.customerId || '',
      assignedEmployeeId: full.assignedEmployeeId || '',
      fixedAssetId: full.fixedAssetId || '',
      residualValue: full.residualValue || '0',
      usefulLifeMonths: Number(full.usefulLifeMonths ?? 60),
      depreciationMethod: full.depreciationMethod || 'straight_line',
      accumulatedDepreciation: full.accumulatedDepreciation || '0',
      weekdayUtilization: full.weekdayUtilization || '10',
      weekdayDays: Number(full.weekdayDays ?? 5),
      saturdayUtilization: full.saturdayUtilization || '8',
      sundayUtilization: full.sundayUtilization || '0',
      trackFuelConsumption: full.trackFuelConsumption !== false,
      idealConsumptionRate: full.idealConsumptionRate || '0',
      consumptionUnit: full.consumptionUnit || 'litres_per_hour',
      toleranceBelowPct: full.toleranceBelowPct || '10',
      toleranceAbovePct: full.toleranceAbovePct || '10',
      useFuelLogForPm: Boolean(full.useFuelLogForPm),
      primaryMeterUnit: full.primaryMeterUnit || 'hours',
      currentMeterReading: full.currentMeterReading || '0',
      cumulativeMeterReading: full.cumulativeMeterReading || '0',
      notes: full.notes || '',
    })
    triggers.value = (full.pmTriggers || []).map((t) => ({
      ...t,
      lastServiceDate: t.lastServiceDate?.slice(0, 10) || '',
      lastMajorServiceDate: t.lastMajorServiceDate?.slice(0, 10) || '',
    }))
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  }
}

async function saveVehicle() {
  if (saving.value) return
  const resolvedUnit = editing.value ? editing.value.accountingUnitId : (form.accountingUnitId || unitId.value)
  if (!resolvedUnit) {
    formError.value = 'Accounting unit is required.'
    return
  }
  if (!form.assetNo.trim()) {
    formError.value = 'Asset No. is required.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body: Record<string, unknown> = {
      accountingUnitId: resolvedUnit,
      assetNo: form.assetNo.trim(),
      registrationNo: form.registrationNo.trim(),
      assetGroupId: form.assetGroupId || null,
      ownershipType: form.ownershipType,
      isMiningEquipment: form.isMiningEquipment,
      isHeavyMachinery: form.isHeavyMachinery,
      isTrailerUnit: form.isTrailerUnit,
      coupledTrailerId: form.coupledTrailerId || null,
      departmentName: form.departmentName.trim(),
      maintenanceDepartmentName: form.maintenanceDepartmentName.trim(),
      costCenterId: form.costCenterId || null,
      logDate: form.logDate || null,
      condition: form.condition,
      status: form.status,
      makeModel: form.makeModel.trim(),
      modelNo: form.modelNo.trim(),
      serialNo: form.serialNo.trim(),
      chassisNo: form.chassisNo.trim(),
      engineNo: form.engineNo.trim(),
      manufactureDate: form.manufactureDate || null,
      purchaseAmount: String(form.purchaseAmount || '0'),
      purchaseDate: form.purchaseDate || null,
      currencyId: form.currencyId || null,
      dateInstalled: form.dateInstalled || null,
      vendorSupplierId: form.vendorSupplierId || null,
      vendorName: form.vendorName.trim(),
      customerId: form.customerId || null,
      assignedEmployeeId: form.assignedEmployeeId || null,
      fixedAssetId: form.fixedAssetId || null,
      residualValue: String(form.residualValue || '0'),
      usefulLifeMonths: Number(form.usefulLifeMonths || 0),
      depreciationMethod: form.depreciationMethod,
      accumulatedDepreciation: String(form.accumulatedDepreciation || '0'),
      weekdayUtilization: String(form.weekdayUtilization || '0'),
      weekdayDays: Number(form.weekdayDays ?? 5),
      saturdayUtilization: String(form.saturdayUtilization || '0'),
      sundayUtilization: String(form.sundayUtilization || '0'),
      trackFuelConsumption: form.trackFuelConsumption,
      idealConsumptionRate: String(form.idealConsumptionRate || '0'),
      consumptionUnit: form.consumptionUnit,
      toleranceBelowPct: String(form.toleranceBelowPct || '0'),
      toleranceAbovePct: String(form.toleranceAbovePct || '0'),
      useFuelLogForPm: form.useFuelLogForPm,
      primaryMeterUnit: form.primaryMeterUnit,
      currentMeterReading: String(form.currentMeterReading || '0'),
      cumulativeMeterReading: String(form.cumulativeMeterReading || form.currentMeterReading || '0'),
      notes: form.notes.trim(),
    }
    if (editing.value) {
      const saved = await api.vehicles.update(editing.value.id, { ...body, version: editing.value.version })
      editing.value = saved
      toast.success('Vehicle updated')
    } else {
      const created = await api.vehicles.create(body)
      editing.value = created
      triggers.value = created.pmTriggers || []
      toast.success('Vehicle created')
    }
    showModal.value = false
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

function addTriggerRow() {
  triggers.value.push({
    triggerType: 'hours',
    serviceFrequency: '250',
    serviceDowntimeHours: '4',
    majorServiceFrequency: '1000',
    majorServiceDowntimeHours: '12',
    serviceTolerance: '25',
    routineServiceDelay: '0',
    lastServiceReading: '0',
    lastMajorServiceReading: '0',
    lastServiceDate: '',
    lastMajorServiceDate: '',
    isActive: true,
  })
}

async function loadTriggerFromGroup() {
  if (!form.assetGroupId) {
    triggersError.value = 'Select an Asset Group on the General tab first.'
    return
  }
  triggersError.value = ''
  try {
    const grp = await api.assetGroups.get(form.assetGroupId)
    triggers.value = [{
      triggerType: grp.defaultTriggerMetric || 'hours',
      serviceFrequency: grp.serviceFrequency || '250',
      serviceDowntimeHours: grp.serviceDowntimeHours || '4',
      majorServiceFrequency: grp.majorServiceFrequency || '1000',
      majorServiceDowntimeHours: grp.majorServiceDowntimeHours || '12',
      serviceTolerance: grp.tolerance || '25',
      routineServiceDelay: grp.routineServiceDelay || '0',
      lastServiceReading: form.currentMeterReading || '0',
      lastMajorServiceReading: '0',
      lastServiceDate: '',
      lastMajorServiceDate: '',
      isActive: true,
    }]
    toast.info('Loaded defaults from asset group')
  } catch (e) {
    triggersError.value = fleetErrorMessage(e)
  }
}

async function saveTriggers() {
  if (!editing.value || triggersSaving.value) return
  triggersSaving.value = true
  triggersError.value = ''
  try {
    const payload = triggers.value.map((t) => ({
      triggerType: t.triggerType,
      serviceFrequency: String(t.serviceFrequency || '250'),
      serviceDowntimeHours: String(t.serviceDowntimeHours || '4'),
      majorServiceFrequency: String(t.majorServiceFrequency || '0'),
      majorServiceDowntimeHours: String(t.majorServiceDowntimeHours || '12'),
      serviceTolerance: String(t.serviceTolerance || '0'),
      routineServiceDelay: String(t.routineServiceDelay || '0'),
      lastServiceReading: String(t.lastServiceReading || '0'),
      lastMajorServiceReading: String(t.lastMajorServiceReading || '0'),
      lastServiceDate: t.lastServiceDate || null,
      lastMajorServiceDate: t.lastMajorServiceDate || null,
      isActive: t.isActive !== false,
    }))
    const updated = await api.vehicles.replacePmTriggers(editing.value.id, payload)
    editing.value = updated
    triggers.value = (updated.pmTriggers || []).map((t) => ({
      ...t,
      lastServiceDate: t.lastServiceDate?.slice(0, 10) || '',
      lastMajorServiceDate: t.lastMajorServiceDate?.slice(0, 10) || '',
    }))
    toast.success('PM triggers saved')
  } catch (e) {
    triggersError.value = fleetErrorMessage(e)
  } finally {
    triggersSaving.value = false
  }
}

async function handoffFixedAssets(row: VehicleRecord) {
  try {
    const res = await api.vehicles.handoffFa(row.id)
    toast.success('Fixed Assets sync staged', `Link ID: ${res.handoffLinkId}`)
  } catch (e) {
    toast.error('Fixed Assets sync failed', fleetErrorMessage(e))
  }
}

const confirmRow = ref<VehicleRecord | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  try {
    await api.vehicles.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    toast.success('Vehicle removed')
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const columns = [
  { key: 'assetNo', label: 'Asset No.' },
  { key: 'registrationNo', label: 'Registration' },
  { key: 'makeModel', label: 'Make & model' },
  { key: 'assetGroupCode', label: 'Group / Class' },
  { key: 'currentMeterReading', label: 'Meter (Cur / Cum)' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Asset register" subtitle="Vehicles, heavy equipment, coupled trailers, PM triggers and Fixed Assets sync." icon="cube">
      <BaseButton icon="plus" @click="openCreate">Add vehicle / asset</BaseButton>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput v-model="q" placeholder="Search asset no, registration or model…" class="max-w-xs" />
        <div class="flex flex-wrap gap-1.5 text-xs">
          <button
            v-for="pill in [
              { id: 'all', label: 'All' },
              { id: 'heavy', label: 'Heavy machinery' },
              { id: 'light', label: 'Light vehicles' },
              { id: 'trailer', label: 'Trailers' },
              { id: 'workshop', label: 'In workshop' },
              { id: 'breakdown', label: 'Breakdown' },
              { id: 'stalled', label: 'Stalled meters' },
            ] as const"
            :key="pill.id"
            type="button"
            class="rounded-full border px-3 py-1 font-medium transition"
            :class="filterPreset === pill.id ? 'border-primary bg-primary text-white' : 'border-line bg-canvas text-ink-soft hover:border-primary/40'"
            @click="filterPreset = pill.id"
          >
            {{ pill.label }}
          </button>
        </div>
        <span class="ml-auto text-xs text-ink-faint">{{ total }} total</span>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="filteredRows" :loading="loading" empty="No vehicles or equipment found.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'assetNo'">
            <div class="font-semibold text-ink">{{ row.assetNo }}</div>
            <div class="text-[11px] text-ink-faint">{{ humanLabel(row.ownershipType) }}</div>
          </template>
          <template v-else-if="col.key === 'registrationNo'">
            <span>{{ row.registrationNo || '—' }}</span>
          </template>
          <template v-else-if="col.key === 'makeModel'">
            <div>{{ row.makeModel || '—' }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.serialNo ? `SN: ${row.serialNo}` : '' }}</div>
          </template>
          <template v-else-if="col.key === 'assetGroupCode'">
            <div>{{ row.assetGroupCode || '—' }}</div>
            <div class="flex flex-wrap gap-1 pt-0.5">
              <span v-if="row.isHeavyMachinery" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">Heavy</span>
              <span v-if="row.isMiningEquipment" class="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Mining</span>
              <span v-if="row.isTrailerUnit" class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Trailer</span>
            </div>
          </template>
          <template v-else-if="col.key === 'currentMeterReading'">
            <div class="font-medium tnum">{{ Number(row.currentMeterReading || 0).toLocaleString() }} {{ row.primaryMeterUnit }}</div>
            <div class="text-[11px] text-ink-faint tnum">
              Cum: {{ Number(row.cumulativeMeterReading || 0).toLocaleString() }}
              <span v-if="row.isMeterStalled" class="ml-1 font-semibold text-amber-700">· Stalled</span>
            </div>
          </template>
          <template v-else-if="col.key === 'status'">
            <div class="flex flex-wrap gap-1">
              <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">
                {{ humanLabel(row.status) }}
              </span>
              <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.condition)">
                {{ humanLabel(row.condition) }}
              </span>
            </div>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <BaseButton size="sm" variant="ghost" @click="openEdit(row, 'general')">Edit</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="openEdit(row, 'triggers')">PM triggers</BaseButton>
            <BaseButton v-if="row.ownershipType === 'company_owned'" size="sm" variant="secondary" @click="handoffFixedAssets(row)">FA sync</BaseButton>
            <BaseButton size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell
      :open="showModal"
      :title="editing ? `Asset ${editing.assetNo} ${editing.registrationNo ? `(${editing.registrationNo})` : ''}` : 'Register new vehicle / equipment'"
      width="max-w-4xl"
      @close="showModal = false"
    >
      <div class="mb-4 flex flex-wrap gap-2 border-b border-line pb-3">
        <button
          v-for="t in ([
            { id: 'general', label: 'General & manufacture' },
            { id: 'utilization', label: 'Utilization, fuel & meters' },
            { id: 'purchase', label: 'Purchase & Fixed Assets' },
            ...(editing ? [{ id: 'triggers', label: 'PM triggers' }] : []),
          ] as Array<{ id: 'general' | 'utilization' | 'purchase' | 'triggers'; label: string }>)"
          :key="t.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          :class="modalTab === t.id ? 'bg-primary text-white' : 'bg-canvas text-ink-soft hover:text-ink'"
          @click="modalTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <form v-if="modalTab !== 'triggers'" class="space-y-4" @submit.prevent="saveVehicle">
        <div v-if="modalTab === 'general'" class="grid gap-3.5 sm:grid-cols-3">
          <FormField v-if="!editing" label="Accounting unit" required class="sm:col-span-3">
            <FleetSelect v-model="form.accountingUnitId" :options="opts.accountingUnits.value" placeholder="Select accounting unit…" @update:model-value="onCreateUnitChange" />
          </FormField>
          <FormField label="Asset No." required><TextInput v-model="form.assetNo" placeholder="e.g. DT93 or EQ-0001" /></FormField>
          <FormField label="Registration No."><TextInput v-model="form.registrationNo" placeholder="e.g. GC 913-21" /></FormField>
          <FormField label="Asset group"><FleetSelect v-model="form.assetGroupId" :options="opts.assetGroups.value" placeholder="None" @update:model-value="onAssetGroupChange" /></FormField>
          <FormField label="Make & model"><TextInput v-model="form.makeModel" placeholder="e.g. XCMG DUMP TRUCK" /></FormField>
          <FormField label="Model No."><TextInput v-model="form.modelNo" /></FormField>
          <FormField label="Ownership type" required><FleetSelect v-model="form.ownershipType" :options="OWNERSHIP_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Serial No."><TextInput v-model="form.serialNo" /></FormField>
          <FormField label="Chassis No."><TextInput v-model="form.chassisNo" /></FormField>
          <FormField label="Engine No."><TextInput v-model="form.engineNo" /></FormField>
          <FormField label="Department"><TextInput v-model="form.departmentName" placeholder="e.g. Loading & Hauling" /></FormField>
          <FormField label="Maintenance dept."><TextInput v-model="form.maintenanceDepartmentName" placeholder="e.g. HD/EM Workshop" /></FormField>
          <FormField label="Cost center"><FleetSelect v-model="form.costCenterId" :options="opts.costCenters.value" placeholder="None" /></FormField>
          <FormField label="Condition"><FleetSelect v-model="form.condition" :options="VEHICLE_CONDITIONS" :allow-empty="false" /></FormField>
          <FormField label="Status"><FleetSelect v-model="form.status" :options="VEHICLE_STATUSES" :allow-empty="false" /></FormField>
          <FormField label="Log date"><TextInput v-model="form.logDate" type="date" /></FormField>
          <FormField label="Assigned driver / operator"><FleetSelect v-model="form.assignedEmployeeId" :options="opts.employees.value" placeholder="None" /></FormField>
          <FormField label="Coupled trailer"><FleetSelect v-model="form.coupledTrailerId" :options="opts.trailers.value" placeholder="None" /></FormField>
          <FormField v-if="form.ownershipType === 'customer_vehicle'" label="Customer" required><FleetSelect v-model="form.customerId" :options="opts.customers.value" placeholder="Select customer…" /></FormField>
          <div class="flex flex-wrap items-center gap-5 pt-2 sm:col-span-3">
            <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.isHeavyMachinery" type="checkbox" class="h-4 w-4" /> Heavy machinery</label>
            <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.isMiningEquipment" type="checkbox" class="h-4 w-4" /> Mining equipment</label>
            <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.isTrailerUnit" type="checkbox" class="h-4 w-4" /> Trailer unit</label>
          </div>
          <FormField label="Notes" class="sm:col-span-3"><TextareaInput v-model="form.notes" :rows="2" /></FormField>
        </div>

        <div v-else-if="modalTab === 'utilization'" class="grid gap-3.5 sm:grid-cols-3">
          <FormField label="Primary meter unit"><FleetSelect v-model="form.primaryMeterUnit" :options="METER_UNITS" :allow-empty="false" /></FormField>
          <FormField label="Current meter reading"><TextInput v-model="form.currentMeterReading" type="number" step="any" /></FormField>
          <FormField label="Cumulative meter reading"><TextInput v-model="form.cumulativeMeterReading" type="number" step="any" /></FormField>
          <FormField label="Usage per weekday"><TextInput v-model="form.weekdayUtilization" type="number" step="any" /></FormField>
          <FormField label="Weekdays (0–5)"><TextInput v-model="form.weekdayDays" type="number" min="0" max="5" /></FormField>
          <FormField label="Usage on Saturday"><TextInput v-model="form.saturdayUtilization" type="number" step="any" /></FormField>
          <FormField label="Usage on Sunday"><TextInput v-model="form.sundayUtilization" type="number" step="any" /></FormField>
          <FormField label="Ideal consumption rate"><TextInput v-model="form.idealConsumptionRate" type="number" step="any" /></FormField>
          <FormField label="Consumption unit"><FleetSelect v-model="form.consumptionUnit" :options="CONSUMPTION_UNITS" :allow-empty="false" /></FormField>
          <FormField label="% tolerance below"><TextInput v-model="form.toleranceBelowPct" type="number" step="any" /></FormField>
          <FormField label="% tolerance above"><TextInput v-model="form.toleranceAbovePct" type="number" step="any" /></FormField>
          <div class="flex flex-wrap items-center gap-5 pt-4 sm:col-span-3">
            <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.trackFuelConsumption" type="checkbox" class="h-4 w-4" /> Track fuel consumption</label>
            <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.useFuelLogForPm" type="checkbox" class="h-4 w-4" /> Use fuel log readings to schedule PM</label>
          </div>
        </div>

        <div v-else-if="modalTab === 'purchase'" class="grid gap-3.5 sm:grid-cols-3">
          <FormField label="Purchase amount"><TextInput v-model="form.purchaseAmount" type="number" step="any" /></FormField>
          <FormField label="Currency"><FleetSelect v-model="form.currencyId" :options="opts.currencies.value" placeholder="Unit default" /></FormField>
          <FormField label="Purchase date"><TextInput v-model="form.purchaseDate" type="date" /></FormField>
          <FormField label="Date installed"><TextInput v-model="form.dateInstalled" type="date" /></FormField>
          <FormField label="Manufacture date"><TextInput v-model="form.manufactureDate" type="date" /></FormField>
          <FormField label="Vendor (Supplier)"><FleetSelect v-model="form.vendorSupplierId" :options="opts.suppliers.value" placeholder="None" /></FormField>
          <FormField label="Vendor display name"><TextInput v-model="form.vendorName" placeholder="e.g. CATERPILLAR" /></FormField>
          <FormField label="Depreciation method"><FleetSelect v-model="form.depreciationMethod" :options="DEPRECIATION_METHODS" :allow-empty="false" /></FormField>
          <FormField label="Useful life (months)"><TextInput v-model="form.usefulLifeMonths" type="number" min="0" max="1200" /></FormField>
          <FormField label="Residual value"><TextInput v-model="form.residualValue" type="number" step="any" /></FormField>
          <FormField label="Accumulated depreciation"><TextInput v-model="form.accumulatedDepreciation" type="number" step="any" /></FormField>
        </div>

        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">{{ editing ? 'Save asset' : 'Create asset' }}</BaseButton>
        </div>
      </form>

      <div v-else class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-ink-faint">Configure hours, kilometers, miles, tonnes or date-based preventive maintenance triggers.</p>
          <div class="flex gap-2">
            <BaseButton size="sm" variant="secondary" @click="loadTriggerFromGroup">Load from equipment group</BaseButton>
            <BaseButton size="sm" icon="plus" @click="addTriggerRow">Add trigger</BaseButton>
          </div>
        </div>

        <div v-if="!triggers.length" class="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">
          No PM triggers configured. Click "Add trigger" or "Load from equipment group".
        </div>

        <div v-for="(trig, i) in triggers" :key="i" class="space-y-3 rounded-xl border border-line bg-canvas/50 p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-ink">Trigger #{{ i + 1 }}</span>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1.5 text-xs"><input v-model="trig.isActive" type="checkbox" class="h-3.5 w-3.5" /> Active</label>
              <button type="button" class="text-xs text-rose-600 hover:underline" @click="triggers.splice(i, 1)">Remove</button>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-4">
            <FormField label="Trigger metric"><FleetSelect v-model="trig.triggerType" :options="TRIGGER_METRICS" :allow-empty="false" /></FormField>
            <FormField label="Service frequency"><TextInput v-model="trig.serviceFrequency" type="number" step="any" /></FormField>
            <FormField label="Service downtime (hrs)"><TextInput v-model="trig.serviceDowntimeHours" type="number" step="any" /></FormField>
            <FormField label="Service tolerance"><TextInput v-model="trig.serviceTolerance" type="number" step="any" /></FormField>
            <FormField label="Major service frequency"><TextInput v-model="trig.majorServiceFrequency" type="number" step="any" /></FormField>
            <FormField label="Major downtime (hrs)"><TextInput v-model="trig.majorServiceDowntimeHours" type="number" step="any" /></FormField>
            <FormField label="Last service reading"><TextInput v-model="trig.lastServiceReading" type="number" step="any" /></FormField>
            <FormField label="Last major reading"><TextInput v-model="trig.lastMajorServiceReading" type="number" step="any" /></FormField>
          </div>
        </div>

        <p v-if="triggersError" role="alert" class="text-sm text-rose-600">{{ triggersError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Close</BaseButton>
          <BaseButton :loading="triggersSaving" @click="saveTriggers">Save PM triggers</BaseButton>
        </div>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Delete fleet asset?"
      :message="`Remove ${confirmRow?.assetNo} from active register? Assets with existing job cards cannot be deleted.`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
  </section>
</template>
