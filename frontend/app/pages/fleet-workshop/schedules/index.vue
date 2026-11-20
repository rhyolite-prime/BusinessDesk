<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { MaintenanceScheduleRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import {
  SCHEDULE_CLASSES,
  SCHEDULE_EDIT_STATUSES,
  SERVICE_TYPES,
  WORK_CATEGORIES,
  fleetErrorMessage,
  fleetStatusTone,
  humanLabel,
  todayIso,
} from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Maintenance schedules & forecast' })

const route = useRoute()
const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<MaintenanceScheduleRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 25
const classFilter = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const q = ref('')
const loading = ref(false)
const error = ref('')

const filteredRows = computed(() =>
  statusFilter.value ? rows.value.filter((r) => r.status === statusFilter.value) : rows.value,
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.schedules.list({
      accountingUnitId: unitId.value || undefined,
      scheduleClass: classFilter.value || undefined,
      workCategory: categoryFilter.value || undefined,
      q: q.value || undefined,
      page: page.value,
      size,
    })
    rows.value = r.items
    total.value = r.total
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([unitId, classFilter, categoryFilter, page], load)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; void load() }, 250)
})
onMounted(() => {
  void load()
  if (route.query.new === '1') void openCreate()
  else if (route.query.new === 'forecast') openForecast()
})

/* ------------------------ Forecast Generator ------------------------------ */
const showForecast = ref(false)
const forecastSaving = ref(false)
const forecastError = ref('')
const forecastForm = reactive({
  accountingUnitId: '',
  horizonDays: 30,
  fromDate: todayIso(),
})

function openForecast() {
  forecastError.value = ''
  forecastForm.accountingUnitId = unitId.value || opts.accountingUnits.value[0]?.value || ''
  forecastForm.horizonDays = 30
  forecastForm.fromDate = todayIso()
  showForecast.value = true
}

async function runForecast() {
  if (forecastSaving.value) return
  const resolvedUnit = forecastForm.accountingUnitId || unitId.value
  if (!resolvedUnit) {
    forecastError.value = 'Select an accounting unit first.'
    return
  }
  forecastSaving.value = true
  forecastError.value = ''
  try {
    const res = await api.schedules.generate({
      accountingUnitId: resolvedUnit,
      horizonDays: Number(forecastForm.horizonDays || 30),
      fromDate: forecastForm.fromDate || todayIso(),
    })
    showForecast.value = false
    toast.success(`PM forecast complete`, `${res.generatedCount} schedule(s) generated for live vehicles.`)
    await load()
  } catch (e) {
    forecastError.value = fleetErrorMessage(e)
  } finally {
    forecastSaving.value = false
  }
}

/* ------------------------ Schedule CRUD Modal ----------------------------- */
const showModal = ref(false)
const editing = ref<MaintenanceScheduleRecord | null>(null)
const saving = ref(false)
const formError = ref('')
const previewNo = ref('')
const form = reactive({
  accountingUnitId: '',
  vehicleId: '',
  scheduleClass: 'heavy_machinery',
  workCategory: 'planned_repair',
  serviceType: 'Planned Repair',
  procedureId: '',
  triggerReading: '0',
  projectedEngineRun: '0',
  estimatedDowntimeHours: '4',
  scheduleDate: todayIso(),
  modifiedServiceDate: '',
  startTime: '',
  specialConditions: '',
  status: 'scheduled',
  notes: '',
})

async function openCreate() {
  editing.value = null
  formError.value = ''
  previewNo.value = ''
  const defaultUnit = unitId.value || opts.accountingUnits.value[0]?.value || ''
  Object.assign(form, {
    accountingUnitId: defaultUnit,
    vehicleId: opts.vehicles.value[0]?.value || '',
    scheduleClass: 'heavy_machinery',
    workCategory: 'planned_repair',
    serviceType: 'Planned Repair',
    procedureId: '',
    triggerReading: '0',
    projectedEngineRun: '0',
    estimatedDowntimeHours: '4',
    scheduleDate: todayIso(),
    modifiedServiceDate: '',
    startTime: '',
    specialConditions: '',
    status: 'scheduled',
    notes: '',
  })
  showModal.value = true
  if (defaultUnit) {
    try {
      const n = await api.schedules.nextNumber(defaultUnit)
      previewNo.value = n.nextNumber
    } catch { /* ignore */ }
  }
}

function openEdit(row: MaintenanceScheduleRecord) {
  editing.value = row
  previewNo.value = row.scheduleNumber
  formError.value = ''
  Object.assign(form, {
    vehicleId: row.vehicleId,
    scheduleClass: row.scheduleClass || 'heavy_machinery',
    workCategory: row.workCategory || 'maintenance_schedule',
    serviceType: row.serviceType || 'Service',
    procedureId: row.procedureId || '',
    triggerReading: row.triggerReading || '0',
    projectedEngineRun: row.projectedEngineRun || '0',
    estimatedDowntimeHours: row.estimatedDowntimeHours || '4',
    scheduleDate: row.scheduleDate?.slice(0, 10) || todayIso(),
    modifiedServiceDate: row.modifiedServiceDate?.slice(0, 10) || '',
    startTime: row.startTime || '',
    specialConditions: row.specialConditions || '',
    status: ['job_created', 'completed'].includes(row.status) ? 'scheduled' : row.status,
    notes: row.notes || '',
  })
  showModal.value = true
}

async function save() {
  if (saving.value) return
  const resolvedUnit = editing.value ? editing.value.accountingUnitId : (form.accountingUnitId || unitId.value)
  if (!resolvedUnit) {
    formError.value = 'Accounting unit is required.'
    return
  }
  if (!form.vehicleId || !form.scheduleDate) {
    formError.value = 'Vehicle and schedule date are required.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      accountingUnitId: resolvedUnit,
      vehicleId: form.vehicleId,
      scheduleClass: form.scheduleClass,
      workCategory: form.workCategory,
      serviceType: form.serviceType,
      procedureId: form.procedureId || null,
      triggerReading: String(form.triggerReading || '0'),
      projectedEngineRun: String(form.projectedEngineRun || '0'),
      estimatedDowntimeHours: String(form.estimatedDowntimeHours || '0'),
      scheduleDate: form.scheduleDate,
      modifiedServiceDate: form.modifiedServiceDate || null,
      startTime: form.startTime.trim(),
      specialConditions: form.specialConditions.trim(),
      status: form.status,
      notes: form.notes.trim(),
    }
    if (editing.value) {
      await api.schedules.update(editing.value.id, { ...body, version: editing.value.version })
      toast.success('Schedule updated')
    } else {
      await api.schedules.create(body)
      toast.success('Schedule created')
    }
    showModal.value = false
    await load()
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function createJobCard(row: MaintenanceScheduleRecord) {
  try {
    const res = await api.schedules.createJobCard(row.id)
    toast.success(`Job Card ${res.jobNumber} created`, 'Open Workshop Job Cards to assign staff & issue parts.')
    await load()
  } catch (e) {
    toast.error('Failed to create Job Card', fleetErrorMessage(e))
  }
}

async function raiseRequisition(row: MaintenanceScheduleRecord) {
  try {
    const res = await api.schedules.raiseRequisition(row.id)
    toast.success(`SCM Requisition ${res.requisitionNumber} raised`, 'Parts requested from Asset Group blueprint.')
    await load()
  } catch (e) {
    toast.error('Cannot raise requisition', fleetErrorMessage(e))
  }
}

const confirmRow = ref<MaintenanceScheduleRecord | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  try {
    await api.schedules.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    toast.success('Schedule deleted')
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const columns = [
  { key: 'scheduleNumber', label: 'Schedule No.' },
  { key: 'assetNo', label: 'Equipment / Vehicle' },
  { key: 'serviceType', label: 'Work / Category' },
  { key: 'scheduleDate', label: 'Schedule / Modified' },
  { key: 'triggerReading', label: 'Trigger / Projected' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Maintenance schedules & forecast" subtitle="Forecasted PM services, heavy & light equipment schedules, planned repairs, breakdown tickets and SCM requisitions." icon="calendar-days">
      <BaseButton variant="secondary" icon="arrow-path" @click="openForecast">Run PM forecast</BaseButton>
      <BaseButton icon="plus" @click="openCreate">Add schedule / repair</BaseButton>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="grid gap-3 border-b border-line p-4 sm:grid-cols-4">
        <TextInput v-model="q" placeholder="Search schedule, asset or conditions…" />
        <FleetSelect v-model="classFilter" :options="SCHEDULE_CLASSES" placeholder="All equipment classes" />
        <FleetSelect v-model="categoryFilter" :options="WORK_CATEGORIES" placeholder="All work categories" />
        <FleetSelect
          v-model="statusFilter"
          :options="[
            { value: 'forecasted', label: 'Forecasted' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'job_created', label: 'Job created' },
            { value: 'completed', label: 'Completed' },
            { value: 'deferred', label: 'Deferred' },
          ]"
          placeholder="All statuses"
        />
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="filteredRows" :loading="loading" empty="No maintenance schedules found.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'scheduleNumber'">
            <div class="font-semibold text-ink">{{ row.scheduleNumber }}</div>
            <div class="text-[11px] text-ink-faint">{{ humanLabel(row.scheduleClass) }}</div>
          </template>
          <template v-else-if="col.key === 'assetNo'">
            <div class="font-medium">{{ row.assetNo }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.registrationNo || row.makeModel || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'serviceType'">
            <div class="font-medium">{{ row.serviceType }}</div>
            <div class="text-[11px] text-ink-faint">{{ humanLabel(row.workCategory) }} {{ row.procedureCode ? `· ${row.procedureCode}` : '' }}</div>
          </template>
          <template v-else-if="col.key === 'scheduleDate'">
            <div>{{ formatDate(row.modifiedServiceDate || row.scheduleDate) }}</div>
            <div class="text-[11px] text-ink-faint">Est. {{ row.estimatedDowntimeHours }} hrs {{ row.startTime ? `· ${row.startTime}` : '' }}</div>
          </template>
          <template v-else-if="col.key === 'triggerReading'">
            <div class="tnum">{{ Number(row.triggerReading || 0).toLocaleString() }}</div>
            <div class="text-[11px] text-ink-faint tnum">Run: +{{ Number(row.projectedEngineRun || 0).toLocaleString() }}</div>
          </template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">
              {{ humanLabel(row.status) }}
            </span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex flex-wrap justify-end gap-1">
            <BaseButton v-if="!row.jobCardId && ['forecasted', 'scheduled'].includes(row.status)" size="sm" @click="createJobCard(row)">Create job card</BaseButton>
            <BaseButton v-if="row.status !== 'cancelled'" size="sm" variant="secondary" @click="raiseRequisition(row)">Raise SCM req</BaseButton>
            <BaseButton v-if="!row.jobCardId && row.status !== 'completed'" size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton v-if="!row.jobCardId && row.status !== 'completed'" size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell :open="showForecast" title="Forecast run for live equipment" width="max-w-md" @close="showForecast = false">
      <form class="space-y-3.5" @submit.prevent="runForecast">
        <p class="text-xs text-ink-soft">
          Projects upcoming Minor &amp; Major PM services using each live vehicle's active PM trigger intervals and daily utilization schedule.
        </p>
        <FormField label="Accounting unit" required>
          <FleetSelect v-model="forecastForm.accountingUnitId" :options="opts.accountingUnits.value" placeholder="Select accounting unit…" />
        </FormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Start date" required><TextInput v-model="forecastForm.fromDate" type="date" /></FormField>
          <FormField label="Forecast horizon (days)" required><TextInput v-model="forecastForm.horizonDays" type="number" min="1" max="365" /></FormField>
        </div>
        <p v-if="forecastError" role="alert" class="text-sm text-rose-600">{{ forecastError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showForecast = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="forecastSaving">Generate forecast</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showModal" :title="editing ? `Schedule ${editing.scheduleNumber}` : `New maintenance schedule ${previewNo ? `(${previewNo})` : ''}`" width="max-w-2xl" @close="showModal = false">
      <form class="space-y-3.5" @submit.prevent="save">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField v-if="!editing" label="Accounting unit" required class="sm:col-span-2">
            <FleetSelect v-model="form.accountingUnitId" :options="opts.accountingUnits.value" placeholder="Select accounting unit…" />
          </FormField>
          <FormField label="Vehicle / equipment" required><FleetSelect v-model="form.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" :disabled="!!editing" /></FormField>
          <FormField label="Schedule class"><FleetSelect v-model="form.scheduleClass" :options="SCHEDULE_CLASSES" :allow-empty="false" /></FormField>
          <FormField label="Work category"><FleetSelect v-model="form.workCategory" :options="WORK_CATEGORIES" :allow-empty="false" /></FormField>
          <FormField label="Service type"><FleetSelect v-model="form.serviceType" :options="SERVICE_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Standard procedure (PCode)"><FleetSelect v-model="form.procedureId" :options="opts.procedureOptions.value" placeholder="None" /></FormField>
          <FormField label="Status"><FleetSelect v-model="form.status" :options="SCHEDULE_EDIT_STATUSES" :allow-empty="false" /></FormField>
          <FormField label="Schedule date" required><TextInput v-model="form.scheduleDate" type="date" /></FormField>
          <FormField label="Modified service date"><TextInput v-model="form.modifiedServiceDate" type="date" /></FormField>
          <FormField label="Trigger reading"><TextInput v-model="form.triggerReading" type="number" step="any" /></FormField>
          <FormField label="Est. downtime (hrs)"><TextInput v-model="form.estimatedDowntimeHours" type="number" step="any" /></FormField>
          <FormField label="Start time"><TextInput v-model="form.startTime" placeholder="e.g. 07:30" /></FormField>
          <FormField label="Special conditions"><TextInput v-model="form.specialConditions" placeholder="e.g. 1000 hrs major kit + oil" /></FormField>
        </div>
        <FormField label="Notes"><TextareaInput v-model="form.notes" :rows="2" /></FormField>
        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">Save schedule</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Delete schedule?"
      :message="`Delete ${confirmRow?.scheduleNumber}?`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
  </section>
</template>
