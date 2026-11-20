<script setup lang="ts">
import { useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { FleetReportTab } from '../../../features/fleet-workshop/fleet-types'
import type { EmbeddedReport } from '../../../features/reports/report-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { fleetErrorMessage, humanLabel } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Fleet & workshop reports' })

const api = useFleetWorkshop()
const opts = useFleetOptions()

const tabs: Array<{ id: FleetReportTab; label: string; sub: string }> = [
  { id: 'forecast', label: 'Forecast', sub: 'Maintenance Schedules & Estimated BOM Material Cost' },
  { id: 'fuel_lubs', label: 'Fuel & Lubs', sub: 'Fuel Litres, Tolerance Breaches & Oil Changes' },
  { id: 'jobs', label: 'Jobs', sub: 'Job Cards Costing, Downtime & Customer Billing' },
  { id: 'tyres', label: 'Tyres', sub: 'Fitted, Spare, Retreaded & Usage Costing' },
  { id: 'major_components', label: 'Major Components', sub: 'Component Life, Hours & Cumulative Repair Cost' },
  { id: 'others', label: 'Others', sub: 'Fleet Availability, Meter Health & Stalled Register' },
]

const activeTab = ref<FleetReportTab>('jobs')
const vehicleId = ref('')
const assetGroupId = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const exchangeRate = ref('1')
const rows = ref<Record<string, any>[]>([])
const loading = ref(false)
const error = ref('')
const showViewer = ref(false)

async function runReport() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.reports.run({
      tab: activeTab.value,
      vehicleId: vehicleId.value || undefined,
      assetGroupId: assetGroupId.value || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      exchangeRate: exchangeRate.value || '1',
    })
    rows.value = res.rows || []
  } catch (e) {
    rows.value = []
    error.value = fleetErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch([activeTab, vehicleId, assetGroupId], runReport)
onMounted(runReport)

const columns = computed(() => {
  switch (activeTab.value) {
    case 'forecast':
      return [
        { key: 'scheduleNumber', label: 'Schedule' },
        { key: 'assetNo', label: 'Asset' },
        { key: 'model', label: 'Model' },
        { key: 'serviceType', label: 'Service Type' },
        { key: 'scheduleDate', label: 'Date' },
        { key: 'triggerReading', label: 'Target Reading' },
        { key: 'estimatedMaterialCost', label: 'Est. Material Cost', align: 'right' as const },
        { key: 'status', label: 'Status' },
      ]
    case 'fuel_lubs':
      return [
        { key: 'assetNo', label: 'Asset' },
        { key: 'registrationNo', label: 'Registration' },
        { key: 'fuelEvents', label: 'Fuel Logs', align: 'right' as const },
        { key: 'totalLitres', label: 'Litres', align: 'right' as const },
        { key: 'fuelCostConverted', label: 'Fuel Cost', align: 'right' as const },
        { key: 'outOfToleranceCount', label: 'Alerts', align: 'right' as const },
        { key: 'oilChangesCount', label: 'Oil Changes', align: 'right' as const },
        { key: 'lubricantsCostConverted', label: 'Lub. Cost', align: 'right' as const },
      ]
    case 'jobs':
      return [
        { key: 'jobNumber', label: 'Job No.' },
        { key: 'openedDate', label: 'Opened' },
        { key: 'assetNo', label: 'Asset' },
        { key: 'jobType', label: 'Type / Scope' },
        { key: 'partsCostConverted', label: 'Parts', align: 'right' as const },
        { key: 'labourCostConverted', label: 'Labour', align: 'right' as const },
        { key: 'outsourcedCostConverted', label: 'Outsourced', align: 'right' as const },
        { key: 'totalCostConverted', label: 'Total Cost', align: 'right' as const },
        { key: 'billableTotalConverted', label: 'Billable', align: 'right' as const },
      ]
    case 'tyres':
      return [
        { key: 'serialNo', label: 'Serial No.' },
        { key: 'brand', label: 'Brand / Size' },
        { key: 'assetNo', label: 'Asset / Pos' },
        { key: 'treadDepthMm', label: 'Tread (mm)', align: 'right' as const },
        { key: 'accumulatedUsage', label: 'Usage', align: 'right' as const },
        { key: 'purchaseCostConverted', label: 'Cost', align: 'right' as const },
        { key: 'status', label: 'Status' },
      ]
    case 'major_components':
      return [
        { key: 'componentCode', label: 'Code / Serial' },
        { key: 'componentType', label: 'Type' },
        { key: 'assetNo', label: 'Mounted On' },
        { key: 'condition', label: 'Condition' },
        { key: 'accumulatedHours', label: 'Accum. / Est. Hrs', align: 'right' as const },
        { key: 'repairCostConverted', label: 'Repair Cost', align: 'right' as const },
        { key: 'status', label: 'Status' },
      ]
    default:
      return [
        { key: 'assetNo', label: 'Asset No.' },
        { key: 'registrationNo', label: 'Registration' },
        { key: 'makeModel', label: 'Make & Model' },
        { key: 'ownershipType', label: 'Ownership' },
        { key: 'currentMeterReading', label: 'Cur / Cum Meter', align: 'right' as const },
        { key: 'status', label: 'Status' },
        { key: 'isMeterStalled', label: 'Meter Health' },
      ]
  }
})

const activeTabMeta = computed(() => tabs.find((t) => t.id === activeTab.value)!)

const embeddedReport = computed<EmbeddedReport>(() => {
  const cols = columns.value.map((c) => ({
    key: c.key,
    title: c.label,
    width: 14,
    alignment: (c.align === 'right' ? 'right' : 'left') as 'left' | 'right',
  }))
  const formattedRows = rows.value.map((r) =>
    columns.value.map((c) => {
      const val = r[c.key]
      if (c.key.includes('Cost') || c.key.includes('Total')) return formatDecimalAmount(val || '0')
      if (c.key === 'scheduleDate' || c.key === 'openedDate') return formatDate(val)
      if (c.key === 'isMeterStalled') return val ? 'Stalled' : 'Healthy'
      return String(val ?? '—')
    }),
  )
  return {
    id: `fleet-${activeTab.value}`,
    title: `FLEET & WORKSHOP — ${activeTabMeta.value.label.toUpperCase()} REPORT`,
    companyName: 'BusinessDesk Fleet & Workshop',
    subtitle: `${activeTabMeta.value.sub} · FX Rate: ${exchangeRate.value || '1'}${dateFrom.value || dateTo.value ? ` · ${dateFrom.value || 'Start'} to ${dateTo.value || 'Present'}` : ''}`,
    generatedAt: new Date().toLocaleString(),
    columns: cols,
    landscape: true,
    sections: [
      {
        title: activeTabMeta.value.label,
        hideHeading: true,
        rows: formattedRows,
      },
    ],
  }
})
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Fleet & workshop reports" subtitle="6-tab operational & cost reporting with exchange-rate conversion, PDF, Excel, Word and print export." icon="chart-bar-square">
      <BaseButton variant="secondary" icon="arrow-path" :loading="loading" @click="runReport">Run report</BaseButton>
      <BaseButton icon="document-text" :disabled="!rows.length" @click="showViewer = true">Print / Export PDF &amp; Excel</BaseButton>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap gap-1.5 border-b border-line p-4">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          :class="activeTab === t.id ? 'bg-primary text-white' : 'bg-canvas text-ink-soft hover:text-ink'"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="grid gap-3 border-b border-line bg-canvas/30 p-4 sm:grid-cols-5">
        <FormField label="Vehicle"><FleetSelect v-model="vehicleId" :options="opts.vehicles.value" placeholder="All vehicles" /></FormField>
        <FormField label="Asset group"><FleetSelect v-model="assetGroupId" :options="opts.assetGroups.value" placeholder="All groups" /></FormField>
        <FormField label="Date from"><TextInput v-model="dateFrom" type="date" /></FormField>
        <FormField label="Date to"><TextInput v-model="dateTo" type="date" /></FormField>
        <div class="flex items-end gap-2">
          <FormField label="Exchange rate (FX)" class="flex-1">
            <TextInput v-model="exchangeRate" type="number" step="any" />
          </FormField>
          <BaseButton size="sm" class="mb-0.5" @click="runReport">Apply</BaseButton>
        </div>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="rows" :loading="loading" empty="No records match the selected filters.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'scheduleDate' || col.key === 'openedDate'">{{ formatDate(row[col.key]) }}</template>
          <template v-else-if="col.key.includes('Cost') || col.key.includes('Total')">
            <span class="tnum font-medium">{{ formatDecimalAmount(row[col.key] || '0') }}</span>
          </template>
          <template v-else-if="col.key === 'jobType'">{{ humanLabel(row.jobType) }} · {{ humanLabel(row.billingScope) }}</template>
          <template v-else-if="col.key === 'brand'">{{ row.brand || '—' }} · {{ row.sizeSpec || '—' }}</template>
          <template v-else-if="col.key === 'componentCode'">{{ row.componentCode }} {{ row.serialNo ? `(${row.serialNo})` : '' }}</template>
          <template v-else-if="col.key === 'accumulatedHours'">
            <span class="tnum">{{ Number(row.accumulatedHours || 0).toLocaleString() }} / {{ Number(row.estimatedLifeHours || 0).toLocaleString() }}</span>
          </template>
          <template v-else-if="col.key === 'currentMeterReading'">
            <span class="tnum">{{ Number(row.currentMeterReading || 0).toLocaleString() }} / {{ Number(row.cumulativeMeterReading || 0).toLocaleString() }} {{ row.primaryMeterUnit }}</span>
          </template>
          <template v-else-if="col.key === 'isMeterStalled'">
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="row.isMeterStalled ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'">
              {{ row.isMeterStalled ? 'Stalled' : 'Healthy' }}
            </span>
          </template>
          <template v-else-if="col.key === 'status' || col.key === 'ownershipType'">{{ humanLabel(row[col.key]) }}</template>
        </template>
      </DataTable>
    </div>

    <ModalShell :open="showViewer" :title="activeTabMeta.label" width="max-w-6xl" @close="showViewer = false">
      <ClientOnly>
        <ReportViewer :report="embeddedReport" />
      </ClientOnly>
    </ModalShell>
  </section>
</template>
