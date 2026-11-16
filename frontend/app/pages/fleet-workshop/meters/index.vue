<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { MeterChangeRecord, MeterReadingRecord, StalledMeterRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { fleetErrorMessage, humanLabel, todayIso } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Meters & stalled alerts' })

const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const activeTab = ref<'readings' | 'changes' | 'stalled'>('readings')
const vehicleFilter = ref('')

const readings = ref<MeterReadingRecord[]>([])
const readingsTotal = ref(0)
const readingsPage = ref(1)

const changes = ref<MeterChangeRecord[]>([])
const changesTotal = ref(0)
const changesPage = ref(1)

const stalled = ref<StalledMeterRecord[]>([])
const stalledTotal = ref(0)
const stalledPage = ref(1)

const size = 20
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (activeTab.value === 'readings') {
      const r = await api.meterReadings.list({ vehicleId: vehicleFilter.value || undefined, page: readingsPage.value, size })
      readings.value = r.items
      readingsTotal.value = r.total
    } else if (activeTab.value === 'changes') {
      const r = await api.meterChanges.list({ vehicleId: vehicleFilter.value || undefined, page: changesPage.value, size })
      changes.value = r.items
      changesTotal.value = r.total
    } else {
      const r = await api.stalledMeters.list()
      stalled.value = r.items
      stalledTotal.value = r.total
    }
  } catch (e) {
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([activeTab, vehicleFilter, unitId, readingsPage, changesPage, stalledPage], load)
onMounted(load)

/* ------------------------ Record Meter Reading ---------------------------- */
const showReadingModal = ref(false)
const readingSaving = ref(false)
const readingError = ref('')
const readingForm = reactive({
  vehicleId: '',
  logDate: todayIso(),
  reading: '',
  source: 'manual',
  isStalledEstimate: false,
  notes: '',
})

function onReadingVehicleChange(vehicleId: string) {
  readingForm.vehicleId = vehicleId
  const v = opts.vehicleMap.value[vehicleId]
  if (v) readingForm.reading = v.currentMeterReading || '0'
}

async function saveReading() {
  if (readingSaving.value) return
  if (!readingForm.vehicleId || !readingForm.logDate) {
    readingError.value = 'Vehicle and log date are required.'
    return
  }
  readingSaving.value = true
  readingError.value = ''
  try {
    await api.meterReadings.create({
      vehicleId: readingForm.vehicleId,
      logDate: readingForm.logDate,
      reading: String(readingForm.reading || '0'),
      source: readingForm.source,
      isStalledEstimate: readingForm.isStalledEstimate,
      notes: readingForm.notes.trim(),
    })
    showReadingModal.value = false
    toast.success('Meter reading recorded')
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    readingError.value = fleetErrorMessage(e)
  } finally {
    readingSaving.value = false
  }
}

/* ------------------------ Meter Replacement / Reset ----------------------- */
const showChangeModal = ref(false)
const changeSaving = ref(false)
const changeError = ref('')
const changeForm = reactive({
  vehicleId: '',
  lastDateOnOldMeter: todayIso(),
  changeDate: todayIso(),
  oldMeterReading: '0',
  newMeterReading: '0',
  replacementLabel: '1st replacement',
  engineChanged: false,
  meterStalled: false,
  notes: '',
})

function onChangeVehicleChange(vehicleId: string) {
  changeForm.vehicleId = vehicleId
  const v = opts.vehicleMap.value[vehicleId]
  if (v) changeForm.oldMeterReading = v.currentMeterReading || '0'
}

async function saveChange() {
  if (changeSaving.value) return
  if (!changeForm.vehicleId) {
    changeError.value = 'Vehicle is required.'
    return
  }
  changeSaving.value = true
  changeError.value = ''
  try {
    await api.meterChanges.create({
      vehicleId: changeForm.vehicleId,
      lastDateOnOldMeter: changeForm.lastDateOnOldMeter,
      changeDate: changeForm.changeDate,
      oldMeterReading: String(changeForm.oldMeterReading || '0'),
      newMeterReading: String(changeForm.newMeterReading || '0'),
      replacementLabel: changeForm.replacementLabel.trim() || '1st replacement',
      engineChanged: changeForm.engineChanged,
      meterStalled: changeForm.meterStalled,
      notes: changeForm.notes.trim(),
    })
    showChangeModal.value = false
    toast.success('Meter change recorded and cumulative reading preserved')
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    changeError.value = fleetErrorMessage(e)
  } finally {
    changeSaving.value = false
  }
}

/* ------------------------ Resolve Stalled Meter --------------------------- */
const resolveTarget = ref<StalledMeterRecord | null>(null)
const resolveSaving = ref(false)
const resolveError = ref('')
const resolveForm = reactive({
  newReading: '',
  resolvedDate: todayIso(),
  notes: '',
})

function openResolve(row: StalledMeterRecord) {
  resolveTarget.value = row
  resolveError.value = ''
  resolveForm.newReading = row.currentMeterReading || '0'
  resolveForm.resolvedDate = todayIso()
  resolveForm.notes = ''
}

async function submitResolve() {
  if (!resolveTarget.value || resolveSaving.value) return
  resolveSaving.value = true
  resolveError.value = ''
  try {
    await api.vehicles.resolveStalledMeter(resolveTarget.value.vehicleId, {
      newReading: String(resolveForm.newReading || '0'),
      resolvedDate: resolveForm.resolvedDate,
      notes: resolveForm.notes.trim(),
    })
    resolveTarget.value = null
    toast.success('Stalled meter resolved')
    await Promise.all([load(), opts.loadShared()])
  } catch (e) {
    resolveError.value = fleetErrorMessage(e)
  } finally {
    resolveSaving.value = false
  }
}

const readingCols = [
  { key: 'logDate', label: 'Date' },
  { key: 'assetNo', label: 'Vehicle' },
  { key: 'reading', label: 'Current reading' },
  { key: 'engineRunDelta', label: 'Delta' },
  { key: 'cumulativeReading', label: 'Cumulative' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
]

const changeCols = [
  { key: 'changeDate', label: 'Change date' },
  { key: 'assetNo', label: 'Vehicle' },
  { key: 'replacementLabel', label: 'Replacement / Flags' },
  { key: 'oldMeterReading', label: 'Old reading' },
  { key: 'newMeterReading', label: 'New reading' },
  { key: 'notes', label: 'Notes' },
]

const stalledCols = [
  { key: 'assetNo', label: 'Asset No.' },
  { key: 'registrationNo', label: 'Registration' },
  { key: 'makeModel', label: 'Make & model' },
  { key: 'currentMeterReading', label: 'Last reading' },
  { key: 'stalledSinceDate', label: 'Stalled since' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Meters & stalled alerts" subtitle="Daily odometer/hour-meter logs, meter replacements preserving lifetime cumulative totals, and stalled meter resolution." icon="clock">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <BaseButton variant="secondary" @click="showChangeModal = true">Log meter change</BaseButton>
          <BaseButton icon="plus" @click="showReadingModal = true">Record meter reading</BaseButton>
        </div>
      </template>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div class="flex gap-1.5">
          <button
            v-for="t in [
              { id: 'readings', label: 'Meter readings' },
              { id: 'changes', label: 'Meter changes (Replace / Reset)' },
              { id: 'stalled', label: 'Stalled meters queue' },
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

        <div v-if="activeTab !== 'stalled'" class="w-64">
          <FleetSelect v-model="vehicleFilter" :options="opts.vehicles.value" placeholder="All vehicles…" />
        </div>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable v-if="activeTab === 'readings'" :columns="readingCols" :rows="readings" :loading="loading" empty="No meter readings recorded.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'logDate'">{{ formatDate(row.logDate) }}</template>
          <template v-else-if="col.key === 'assetNo'">
            <span class="font-semibold">{{ row.assetNo }}</span>
            <span v-if="row.isStalledEstimate" class="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Stalled est.</span>
          </template>
          <template v-else-if="col.key === 'reading'"><span class="tnum font-medium">{{ Number(row.reading).toLocaleString() }} {{ row.meterUnit }}</span></template>
          <template v-else-if="col.key === 'engineRunDelta'"><span class="tnum text-emerald-700">+{{ Number(row.engineRunDelta || 0).toLocaleString() }}</span></template>
          <template v-else-if="col.key === 'cumulativeReading'"><span class="tnum text-ink-soft">{{ Number(row.cumulativeReading).toLocaleString() }} {{ row.meterUnit }}</span></template>
          <template v-else-if="col.key === 'source'">{{ humanLabel(row.source) }}</template>
        </template>
      </DataTable>

      <DataTable v-else-if="activeTab === 'changes'" :columns="changeCols" :rows="changes" :loading="loading" empty="No meter replacements or resets recorded.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'changeDate'">
            <div>{{ formatDate(row.changeDate) }}</div>
            <div class="text-[11px] text-ink-faint">Old end: {{ formatDate(row.lastDateOnOldMeter) }}</div>
          </template>
          <template v-else-if="col.key === 'assetNo'">{{ row.assetNo }} {{ row.registrationNo ? `(${row.registrationNo})` : '' }}</template>
          <template v-else-if="col.key === 'replacementLabel'">
            <div>{{ row.replacementLabel || 'Replacement' }}</div>
            <div class="text-[11px] text-ink-faint">
              {{ row.engineChanged ? 'Engine changed · ' : '' }}{{ row.meterStalled ? 'Meter stalled' : 'Active' }}
            </div>
          </template>
          <template v-else-if="col.key === 'oldMeterReading'"><span class="tnum">{{ Number(row.oldMeterReading).toLocaleString() }}</span></template>
          <template v-else-if="col.key === 'newMeterReading'"><span class="tnum font-semibold">{{ Number(row.newMeterReading).toLocaleString() }}</span></template>
        </template>
      </DataTable>

      <DataTable v-else :columns="stalledCols" :rows="stalled" :loading="loading" empty="No stalled meters detected.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'currentMeterReading'">
            <span class="tnum">{{ Number(row.currentMeterReading).toLocaleString() }} {{ row.primaryMeterUnit }}</span>
          </template>
          <template v-else-if="col.key === 'stalledSinceDate'">{{ row.stalledSinceDate ? formatDate(row.stalledSinceDate) : '—' }}</template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end">
            <BaseButton size="sm" @click="openResolve(row)">Resolve stalled meter</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-if="activeTab === 'readings'" v-model:page="readingsPage" :size="size" :total="readingsTotal" />
        <Pagination v-else-if="activeTab === 'changes'" v-model:page="changesPage" :size="size" :total="changesTotal" />
        <Pagination v-else v-model:page="stalledPage" :size="size" :total="stalledTotal" />
      </div>
    </div>

    <ModalShell :open="showReadingModal" title="Record daily meter reading" width="max-w-lg" @close="showReadingModal = false">
      <form class="space-y-3.5" @submit.prevent="saveReading">
        <FormField label="Vehicle / equipment" required>
          <FleetSelect :model-value="readingForm.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" @update:model-value="onReadingVehicleChange" />
        </FormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Log date" required><TextInput v-model="readingForm.logDate" type="date" /></FormField>
          <FormField label="Source">
            <FleetSelect
              v-model="readingForm.source"
              :options="[
                { value: 'manual', label: 'Manual / Daily log' },
                { value: 'fuel_log', label: 'Fuel log' },
                { value: 'lubricant_log', label: 'Lubricant log' },
                { value: 'job_card', label: 'Job card' },
              ]"
              :allow-empty="false"
            />
          </FormField>
          <FormField label="Meter reading" required class="sm:col-span-2"><TextInput v-model="readingForm.reading" type="number" step="any" /></FormField>
        </div>
        <label class="flex items-center gap-2 text-xs font-medium"><input v-model="readingForm.isStalledEstimate" type="checkbox" class="h-4 w-4" /> Flag meter as stalled / estimated</label>
        <FormField label="End of day note / remarks"><TextareaInput v-model="readingForm.notes" :rows="2" /></FormField>
        <p v-if="readingError" role="alert" class="text-sm text-rose-600">{{ readingError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showReadingModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="readingSaving">Save reading</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showChangeModal" title="Record meter replacement / reset" width="max-w-lg" @close="showChangeModal = false">
      <form class="space-y-3.5" @submit.prevent="saveChange">
        <FormField label="Vehicle / equipment" required>
          <FleetSelect :model-value="changeForm.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" @update:model-value="onChangeVehicleChange" />
        </FormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Last date on old meter" required><TextInput v-model="changeForm.lastDateOnOldMeter" type="date" /></FormField>
          <FormField label="Change date" required><TextInput v-model="changeForm.changeDate" type="date" /></FormField>
          <FormField label="Old meter reading"><TextInput v-model="changeForm.oldMeterReading" type="number" step="any" /></FormField>
          <FormField label="New meter reading"><TextInput v-model="changeForm.newMeterReading" type="number" step="any" /></FormField>
          <FormField label="Replacement label" class="sm:col-span-2"><TextInput v-model="changeForm.replacementLabel" placeholder="e.g. 1st replacement" /></FormField>
        </div>
        <div class="flex flex-wrap gap-5">
          <label class="flex items-center gap-2 text-xs font-medium"><input v-model="changeForm.engineChanged" type="checkbox" class="h-4 w-4" /> Engine changed</label>
          <label class="flex items-center gap-2 text-xs font-medium"><input v-model="changeForm.meterStalled" type="checkbox" class="h-4 w-4" /> Meter stalled</label>
        </div>
        <FormField label="Notes"><TextareaInput v-model="changeForm.notes" :rows="2" /></FormField>
        <p v-if="changeError" role="alert" class="text-sm text-rose-600">{{ changeError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showChangeModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="changeSaving">Record meter change</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="!!resolveTarget" :title="`Resolve stalled meter — ${resolveTarget?.assetNo}`" width="max-w-md" @close="resolveTarget = null">
      <form class="space-y-3.5" @submit.prevent="submitResolve">
        <FormField label="Verified reading" required><TextInput v-model="resolveForm.newReading" type="number" step="any" /></FormField>
        <FormField label="Resolved date" required><TextInput v-model="resolveForm.resolvedDate" type="date" /></FormField>
        <FormField label="Resolution notes"><TextareaInput v-model="resolveForm.notes" :rows="2" /></FormField>
        <p v-if="resolveError" role="alert" class="text-sm text-rose-600">{{ resolveError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="resolveTarget = null">Cancel</BaseButton>
          <BaseButton type="submit" :loading="resolveSaving">Resolve stalled meter</BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
