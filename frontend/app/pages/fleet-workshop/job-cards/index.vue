<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { JobCardAssignmentRecord, JobCardLineRecord, JobCardRecord, JobMilestoneRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import {
  BILLING_SCOPES,
  JOB_LINE_TYPES,
  JOB_PRIORITIES,
  JOB_ROLES,
  JOB_SOURCE_TYPES,
  JOB_TYPES,
  MILESTONE_STATUSES,
  fleetErrorMessage,
  fleetStatusTone,
  humanLabel,
  todayIso,
} from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Job cards & major projects' })

const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<JobCardRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const q = ref('')
const statusFilter = ref('')
const scopeFilter = ref('')
const projectsOnly = ref(false)
const loading = ref(false)
const error = ref('')

const filteredRows = computed(() =>
  rows.value.filter((r) => {
    if (scopeFilter.value && r.billingScope !== scopeFilter.value) return false
    if (projectsOnly.value && !r.isMajorProject) return false
    return true
  }),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.jobCards.list({
      accountingUnitId: unitId.value || undefined,
      status: statusFilter.value || undefined,
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

watch([unitId, statusFilter, page], load)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; void load() }, 250)
})
onMounted(load)

/* ------------------------ Create / Edit Job Header ------------------------ */
const showModal = ref(false)
const editing = ref<JobCardRecord | null>(null)
const saving = ref(false)
const formError = ref('')
const previewNo = ref('')

const form = reactive({
  vehicleId: '',
  coupledTrailerId: '',
  jobType: 'corrective_repair',
  billingScope: 'internal_fleet',
  customerId: '',
  costCenterId: '',
  procedureId: '',
  warehouseId: '',
  openedDate: todayIso(),
  meterReadingIn: '0',
  downtimeHours: '0',
  locationSite: 'Main Workshop',
  priority: 'normal',
  isMajorProject: false,
  paymentStatus: 'not_applicable',
  reportedFault: '',
  diagnosis: '',
  workPerformed: '',
})

function onVehicleChange(vid: string) {
  form.vehicleId = vid
  const v = opts.vehicleMap.value[vid]
  if (v) form.meterReadingIn = v.currentMeterReading || '0'
}

async function openCreate() {
  if (!unitId.value) { toast.error('Select an accounting unit first.'); return }
  editing.value = null
  formError.value = ''
  previewNo.value = ''
  Object.assign(form, {
    vehicleId: opts.vehicles.value[0]?.value || '',
    coupledTrailerId: '',
    jobType: 'corrective_repair',
    billingScope: 'internal_fleet',
    customerId: '',
    costCenterId: '',
    procedureId: '',
    warehouseId: opts.invWarehouses.value[0]?.value || '',
    openedDate: todayIso(),
    meterReadingIn: '0',
    downtimeHours: '0',
    locationSite: 'Main Workshop',
    priority: 'normal',
    isMajorProject: false,
    paymentStatus: 'not_applicable',
    reportedFault: '',
    diagnosis: '',
    workPerformed: '',
  })
  onVehicleChange(form.vehicleId)
  showModal.value = true
  try {
    const n = await api.jobCards.nextNumber(unitId.value)
    previewNo.value = n.nextNumber
  } catch { /* ignore */ }
}

function openEdit(row: JobCardRecord) {
  editing.value = row
  previewNo.value = row.jobNumber
  formError.value = ''
  Object.assign(form, {
    vehicleId: row.vehicleId,
    coupledTrailerId: row.coupledTrailerId || '',
    jobType: row.jobType || 'corrective_repair',
    billingScope: row.billingScope || 'internal_fleet',
    customerId: row.customerId || '',
    costCenterId: row.costCenterId || '',
    procedureId: row.procedureId || '',
    warehouseId: row.warehouseId || '',
    openedDate: row.openedDate?.slice(0, 10) || todayIso(),
    meterReadingIn: row.meterReadingIn || '0',
    downtimeHours: row.downtimeHours || '0',
    locationSite: row.locationSite || 'Main Workshop',
    priority: row.priority || 'normal',
    isMajorProject: Boolean(row.isMajorProject),
    paymentStatus: row.paymentStatus || 'not_applicable',
    reportedFault: row.reportedFault || '',
    diagnosis: row.diagnosis || '',
    workPerformed: row.workPerformed || '',
  })
  showModal.value = true
}

async function saveHeader() {
  if (saving.value) return
  if (!form.vehicleId) {
    formError.value = 'Vehicle / asset is required.'
    return
  }
  if (form.billingScope === 'customer_billable' && !form.customerId) {
    formError.value = 'Select a customer for customer-billable jobs.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body: Record<string, unknown> = {
      accountingUnitId: editing.value ? editing.value.accountingUnitId : unitId.value,
      vehicleId: form.vehicleId,
      coupledTrailerId: form.coupledTrailerId || null,
      jobType: form.jobType,
      billingScope: form.billingScope,
      customerId: form.customerId || null,
      costCenterId: form.costCenterId || null,
      procedureId: form.procedureId || null,
      warehouseId: form.warehouseId || null,
      openedDate: form.openedDate,
      meterReadingIn: String(form.meterReadingIn || '0'),
      downtimeHours: String(form.downtimeHours || '0'),
      locationSite: form.locationSite.trim() || 'Main Workshop',
      priority: form.priority,
      isMajorProject: form.isMajorProject,
      paymentStatus: form.paymentStatus,
      reportedFault: form.reportedFault.trim(),
      diagnosis: form.diagnosis.trim(),
      workPerformed: form.workPerformed.trim(),
    }
    let saved: JobCardRecord
    if (editing.value) {
      saved = await api.jobCards.update(editing.value.id, { ...body, version: editing.value.version })
      toast.success(`Job Card ${saved.jobNumber} updated`)
    } else {
      saved = await api.jobCards.create(body)
      toast.success(`Job Card ${saved.jobNumber} created`)
    }
    showModal.value = false
    await load()
    await openDetail(saved)
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

/* ------------------------ Job Card Workbench Detail ----------------------- */
const detailJob = ref<JobCardRecord | null>(null)
const detailTab = ref<'summary' | 'lines' | 'staff' | 'milestones' | 'accounting' | 'audit'>('summary')
const detailLoading = ref(false)
const detailBusy = ref(false)

async function openDetail(row: JobCardRecord, tab: typeof detailTab.value = 'summary') {
  detailTab.value = tab
  detailLoading.value = true
  detailJob.value = row
  try {
    detailJob.value = await api.jobCards.get(row.id)
    assignmentsDraft.value = (detailJob.value.assignments || []).map((a) => ({ ...a }))
  } catch (e) {
    toast.error('Failed to load Job Card', fleetErrorMessage(e))
  } finally {
    detailLoading.value = false
  }
}

/* Lifecycle transitions */
const cancelReason = ref('')
const showCancelPrompt = ref(false)
const completeModal = ref(false)
const completeForm = reactive({ meterReadingOut: '0', downtimeHours: '0', diagnosis: '', workPerformed: '' })

async function runTransition(action: string, extra: Record<string, unknown> = {}) {
  if (!detailJob.value || detailBusy.value) return
  detailBusy.value = true
  try {
    detailJob.value = await api.jobCards.transition(detailJob.value.id, {
      action,
      version: detailJob.value.version,
      ...extra,
    })
    toast.success(`Job Card ${detailJob.value.jobNumber}: ${humanLabel(action)}`)
    await load()
  } catch (e) {
    toast.error('Transition failed', fleetErrorMessage(e))
  } finally {
    detailBusy.value = false
  }
}

function openCompleteModal() {
  if (!detailJob.value) return
  Object.assign(completeForm, {
    meterReadingOut: detailJob.value.meterReadingOut || detailJob.value.meterReadingIn || '0',
    downtimeHours: detailJob.value.downtimeHours || '0',
    diagnosis: detailJob.value.diagnosis || '',
    workPerformed: detailJob.value.workPerformed || '',
  })
  completeModal.value = true
}

async function submitComplete() {
  await runTransition('complete', {
    meterReadingOut: String(completeForm.meterReadingOut || '0'),
    downtimeHours: String(completeForm.downtimeHours || '0'),
    diagnosis: completeForm.diagnosis.trim(),
    workPerformed: completeForm.workPerformed.trim(),
  })
  completeModal.value = false
}

async function submitCancel() {
  if (!cancelReason.value.trim()) {
    toast.error('Cancellation reason is required.')
    return
  }
  await runTransition('cancel', { reason: cancelReason.value.trim() })
  showCancelPrompt.value = false
  cancelReason.value = ''
}

/* Job Lines */
const showLineModal = ref(false)
const editingLine = ref<JobCardLineRecord | null>(null)
const lineSaving = ref(false)
const lineError = ref('')
const lineForm = reactive({
  lineType: 'spare_part',
  sourceType: 'inventory_issue',
  description: '',
  positionOrSide: '',
  invItemId: '',
  uomId: '',
  warehouseId: '',
  supplierId: '',
  employeeId: '',
  quantity: '1',
  unitCost: '0',
  unitPrice: '0',
  isBillable: false,
  isPaid: false,
  locationNote: '',
  entryDate: todayIso(),
})

function openAddLine() {
  editingLine.value = null
  lineError.value = ''
  Object.assign(lineForm, {
    lineType: 'spare_part',
    sourceType: 'inventory_issue',
    description: '',
    positionOrSide: '',
    invItemId: '',
    uomId: '',
    warehouseId: detailJob.value?.warehouseId || opts.invWarehouses.value[0]?.value || '',
    supplierId: '',
    employeeId: '',
    quantity: '1',
    unitCost: '0',
    unitPrice: '0',
    isBillable: detailJob.value?.billingScope === 'customer_billable',
    isPaid: false,
    locationNote: '',
    entryDate: todayIso(),
  })
  showLineModal.value = true
}

function openEditLine(l: JobCardLineRecord) {
  editingLine.value = l
  lineError.value = ''
  Object.assign(lineForm, {
    lineType: l.lineType,
    sourceType: l.sourceType,
    description: l.description,
    positionOrSide: l.positionOrSide || '',
    invItemId: l.invItemId || '',
    uomId: l.uomId || '',
    warehouseId: l.warehouseId || '',
    supplierId: l.supplierId || '',
    employeeId: l.employeeId || '',
    quantity: l.quantity || '1',
    unitCost: l.unitCost || '0',
    unitPrice: l.unitPrice || '0',
    isBillable: Boolean(l.isBillable),
    isPaid: Boolean(l.isPaid),
    locationNote: l.locationNote || '',
    entryDate: l.entryDate?.slice(0, 10) || todayIso(),
  })
  showLineModal.value = true
}

function onLineItemChange(itemId: string) {
  lineForm.invItemId = itemId
  if (itemId) {
    const label = opts.invItems.value.find((i) => i.value === itemId)?.label || ''
    if (!lineForm.description.trim() && label) {
      lineForm.description = label.includes('—') ? label.split('—').slice(1).join('—').trim() : label
    }
    if (opts.invItemBaseUom.value[itemId]) lineForm.uomId = opts.invItemBaseUom.value[itemId]
    if (opts.invItemCost.value[itemId]) lineForm.unitCost = opts.invItemCost.value[itemId]
  }
}

async function saveLine() {
  if (!detailJob.value || lineSaving.value) return
  if (!lineForm.description.trim()) {
    lineError.value = 'Line description is required.'
    return
  }
  lineSaving.value = true
  lineError.value = ''
  try {
    const body: Record<string, unknown> = {
      lineType: lineForm.lineType,
      sourceType: lineForm.sourceType,
      description: lineForm.description.trim(),
      positionOrSide: lineForm.positionOrSide.trim(),
      invItemId: lineForm.invItemId || null,
      uomId: lineForm.uomId || null,
      warehouseId: lineForm.warehouseId || null,
      supplierId: lineForm.supplierId || null,
      employeeId: lineForm.employeeId || null,
      quantity: String(lineForm.quantity || '1'),
      unitCost: String(lineForm.unitCost || '0'),
      unitPrice: String(lineForm.unitPrice || '0'),
      isBillable: lineForm.isBillable,
      isPaid: lineForm.isPaid,
      locationNote: lineForm.locationNote.trim(),
      entryDate: lineForm.entryDate,
    }
    if (editingLine.value) {
      detailJob.value = await api.jobCards.updateLine(detailJob.value.id, editingLine.value.id, {
        ...body,
        version: editingLine.value.version || 1,
      })
      toast.success('Job line updated')
    } else {
      detailJob.value = await api.jobCards.addLine(detailJob.value.id, body)
      toast.success('Job line added')
    }
    showLineModal.value = false
    await load()
  } catch (e) {
    lineError.value = fleetErrorMessage(e)
  } finally {
    lineSaving.value = false
  }
}

async function removeLine(lineId: string) {
  if (!detailJob.value) return
  try {
    detailJob.value = await api.jobCards.deleteLine(detailJob.value.id, lineId)
    toast.success('Line removed')
    await load()
  } catch (e) {
    toast.error('Cannot delete line', fleetErrorMessage(e))
  }
}

async function issueParts() {
  if (!detailJob.value || detailBusy.value) return
  detailBusy.value = true
  try {
    detailJob.value = await api.jobCards.issueParts(detailJob.value.id, {
      warehouseId: detailJob.value.warehouseId || opts.invWarehouses.value[0]?.value || undefined,
    })
    toast.success('Inventory parts issued & posted to GL')
    await load()
  } catch (e) {
    toast.error('Issue parts failed', fleetErrorMessage(e))
  } finally {
    detailBusy.value = false
  }
}

async function raiseRequisition() {
  if (!detailJob.value || detailBusy.value) return
  detailBusy.value = true
  try {
    detailJob.value = await api.jobCards.raiseRequisition(detailJob.value.id)
    toast.success('Supply Chain requisition raised')
    await load()
  } catch (e) {
    toast.error('Requisition failed', fleetErrorMessage(e))
  } finally {
    detailBusy.value = false
  }
}

/* Technician Assignments */
const assignmentsDraft = ref<JobCardAssignmentRecord[]>([])
const staffSaving = ref(false)
function addAssignment() {
  assignmentsDraft.value.push({
    employeeId: opts.employees.value[0]?.value || '',
    roleOnJob: 'mechanic',
    hoursEstimated: '4',
    hoursWorked: '0',
    hourlyCostRate: '0',
    hourlyBillRate: '0',
    workNotes: '',
  })
}
async function saveAssignments() {
  if (!detailJob.value || staffSaving.value) return
  staffSaving.value = true
  try {
    detailJob.value = await api.jobCards.replaceAssignments(
      detailJob.value.id,
      assignmentsDraft.value.filter((a) => a.employeeId),
    )
    assignmentsDraft.value = (detailJob.value.assignments || []).map((a) => ({ ...a }))
    toast.success('Technician assignments saved')
    await load()
  } catch (e) {
    toast.error('Failed to save staff assignments', fleetErrorMessage(e))
  } finally {
    staffSaving.value = false
  }
}

/* Major Project Milestones */
const showMilestoneModal = ref(false)
const editingMs = ref<JobMilestoneRecord | null>(null)
const msSaving = ref(false)
const msError = ref('')
const msForm = reactive({
  milestoneCode: '',
  title: '',
  phase: 'execution',
  ownerEmployeeId: '',
  plannedStartDate: todayIso(),
  plannedEndDate: '',
  actualStartDate: '',
  actualEndDate: '',
  progressPct: 0,
  status: 'pending',
  deliverables: '',
  blockerNotes: '',
  sortOrder: 1,
})

function openAddMilestone() {
  editingMs.value = null
  msError.value = ''
  Object.assign(msForm, {
    milestoneCode: `MS-${(detailJob.value?.milestones?.length || 0) + 1}`,
    title: '',
    phase: 'execution',
    ownerEmployeeId: '',
    plannedStartDate: todayIso(),
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    progressPct: 0,
    status: 'pending',
    deliverables: '',
    blockerNotes: '',
    sortOrder: (detailJob.value?.milestones?.length || 0) + 1,
  })
  showMilestoneModal.value = true
}

function openEditMilestone(m: JobMilestoneRecord) {
  editingMs.value = m
  msError.value = ''
  Object.assign(msForm, {
    milestoneCode: m.milestoneCode || '',
    title: m.title,
    phase: m.phase || 'execution',
    ownerEmployeeId: m.ownerEmployeeId || '',
    plannedStartDate: m.plannedStartDate?.slice(0, 10) || '',
    plannedEndDate: m.plannedEndDate?.slice(0, 10) || '',
    actualStartDate: m.actualStartDate?.slice(0, 10) || '',
    actualEndDate: m.actualEndDate?.slice(0, 10) || '',
    progressPct: Number(m.progressPct || 0),
    status: m.status || 'pending',
    deliverables: m.deliverables || '',
    blockerNotes: m.blockerNotes || '',
    sortOrder: Number(m.sortOrder || 1),
  })
  showMilestoneModal.value = true
}

async function saveMilestone() {
  if (!detailJob.value || msSaving.value) return
  if (!msForm.title.trim()) {
    msError.value = 'Milestone title is required.'
    return
  }
  msSaving.value = true
  msError.value = ''
  try {
    const body = {
      milestoneCode: msForm.milestoneCode.trim(),
      title: msForm.title.trim(),
      phase: msForm.phase.trim() || 'execution',
      ownerEmployeeId: msForm.ownerEmployeeId || null,
      plannedStartDate: msForm.plannedStartDate || null,
      plannedEndDate: msForm.plannedEndDate || null,
      actualStartDate: msForm.actualStartDate || null,
      actualEndDate: msForm.actualEndDate || null,
      progressPct: Number(msForm.progressPct || 0),
      status: msForm.status,
      deliverables: msForm.deliverables.trim(),
      blockerNotes: msForm.blockerNotes.trim(),
      sortOrder: Math.max(1, Number(msForm.sortOrder || 1)),
    }
    if (editingMs.value) {
      detailJob.value = await api.jobCards.updateMilestone(detailJob.value.id, editingMs.value.id, {
        ...body,
        version: editingMs.value.version,
      })
      toast.success('Milestone updated')
    } else {
      detailJob.value = await api.jobCards.createMilestone(detailJob.value.id, body)
      toast.success('Milestone added')
    }
    showMilestoneModal.value = false
    await load()
  } catch (e) {
    msError.value = fleetErrorMessage(e)
  } finally {
    msSaving.value = false
  }
}

async function deleteMilestone(m: JobMilestoneRecord) {
  if (!detailJob.value) return
  try {
    detailJob.value = await api.jobCards.deleteMilestone(detailJob.value.id, m.id, m.version)
    toast.success('Milestone deleted')
    await load()
  } catch (e) {
    toast.error('Cannot delete milestone', fleetErrorMessage(e))
  }
}

/* GL & Cross-module handoffs */
async function postGl(mode: 'cost_recognition' | 'revenue_recognition') {
  if (!detailJob.value || detailBusy.value) return
  detailBusy.value = true
  try {
    detailJob.value = await api.jobCards.postGl(detailJob.value.id, {
      mode,
      periodId: opts.openPeriods.value[0]?.value || undefined,
    })
    toast.success(`Posted GL ${humanLabel(mode)}`)
    await load()
  } catch (e) {
    toast.error('GL posting failed', fleetErrorMessage(e))
  } finally {
    detailBusy.value = false
  }
}

async function runHandoff(targetModule: 'ap' | 'ar' | 'point_of_sale' | 'project_management') {
  if (!detailJob.value || detailBusy.value) return
  detailBusy.value = true
  try {
    await api.jobCards.handoff(detailJob.value.id, targetModule)
    toast.success(`Staged ${humanLabel(targetModule)} handoff`)
    detailJob.value = await api.jobCards.get(detailJob.value.id)
    await load()
  } catch (e) {
    toast.error('Handoff failed', fleetErrorMessage(e))
  } finally {
    detailBusy.value = false
  }
}

const confirmDeleteJob = ref<JobCardRecord | null>(null)
const deletingJob = ref(false)
async function performDeleteJob() {
  if (!confirmDeleteJob.value || deletingJob.value) return
  deletingJob.value = true
  try {
    await api.jobCards.remove(confirmDeleteJob.value.id, confirmDeleteJob.value.version)
    if (detailJob.value?.id === confirmDeleteJob.value.id) detailJob.value = null
    confirmDeleteJob.value = null
    toast.success('Draft Job Card deleted')
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deletingJob.value = false
  }
}

const columns = [
  { key: 'jobNumber', label: 'Job No. / Date' },
  { key: 'assetNo', label: 'Vehicle / Customer' },
  { key: 'jobType', label: 'Type / Scope' },
  { key: 'totalCost', label: 'Cost / Billable' },
  { key: 'status', label: 'Status / Payment' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Job cards & major projects" subtitle="Open repairs, issue Inventory parts, assign staff, track major overhaul milestones, post to GL and hand off to AR/AP/POS." icon="document-text">
      <template #actions>
        <BaseButton icon="plus" @click="openCreate">Open job card</BaseButton>
      </template>
    </PageHeader>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput v-model="q" placeholder="Search job number, asset, reg or customer…" class="max-w-xs" />
        <div class="w-44">
          <FleetSelect
            v-model="statusFilter"
            :options="[
              { value: 'draft', label: 'Draft' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'awaiting_parts', label: 'Awaiting parts' },
              { value: 'completed', label: 'Completed' },
              { value: 'invoiced', label: 'Invoiced' },
              { value: 'closed', label: 'Closed' },
            ]"
            placeholder="All statuses"
          />
        </div>
        <div class="w-48">
          <FleetSelect v-model="scopeFilter" :options="BILLING_SCOPES" placeholder="All billing scopes" />
        </div>
        <label class="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <input v-model="projectsOnly" type="checkbox" class="h-4 w-4" /> Major projects only
        </label>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="filteredRows" :loading="loading" empty="No job cards created yet.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'jobNumber'">
            <div class="flex items-center gap-1.5 font-semibold text-ink">
              <span>{{ row.jobNumber }}</span>
              <span v-if="row.isMajorProject" class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">Project</span>
            </div>
            <div class="text-[11px] text-ink-faint">{{ formatDate(row.openedDate) }} · {{ row.locationSite }}</div>
          </template>
          <template v-else-if="col.key === 'assetNo'">
            <div class="font-medium">{{ row.assetNo }} {{ row.registrationNo ? `(${row.registrationNo})` : '' }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.customerName || 'Internal fleet' }}</div>
          </template>
          <template v-else-if="col.key === 'jobType'">
            <div>{{ humanLabel(row.jobType) }}</div>
            <div class="text-[11px] text-ink-faint">{{ humanLabel(row.billingScope) }} · {{ humanLabel(row.priority) }}</div>
          </template>
          <template v-else-if="col.key === 'totalCost'">
            <div class="font-medium tnum">Cost: {{ formatCurrency(row.totalCost) }}</div>
            <div v-if="Number(row.billableGrandTotal || 0) > 0" class="text-[11px] text-emerald-700 tnum">
              Bill: {{ formatCurrency(row.billableGrandTotal) }}
            </div>
          </template>
          <template v-else-if="col.key === 'status'">
            <div class="flex flex-wrap gap-1">
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(row.status)">{{ humanLabel(row.status) }}</span>
              <span v-if="row.paymentStatus !== 'not_applicable'" class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(row.paymentStatus)">
                {{ humanLabel(row.paymentStatus) }}
              </span>
            </div>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex justify-end gap-1.5">
            <BaseButton size="sm" @click="openDetail(row)">Open workbench</BaseButton>
            <BaseButton v-if="!['closed', 'cancelled'].includes(row.status)" size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton v-if="row.status === 'draft'" size="sm" variant="danger" @click="confirmDeleteJob = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <!-- Header Create/Edit Modal -->
    <ModalShell :open="showModal" :title="editing ? `Edit Job Card ${editing.jobNumber}` : `Open Job Card ${previewNo ? `(${previewNo})` : ''}`" width="max-w-3xl" @close="showModal = false">
      <form class="space-y-3.5" @submit.prevent="saveHeader">
        <div class="grid gap-3 sm:grid-cols-3">
          <FormField label="Vehicle / asset" required><FleetSelect :model-value="form.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" :disabled="!!editing" @update:model-value="onVehicleChange" /></FormField>
          <FormField label="Job type"><FleetSelect v-model="form.jobType" :options="JOB_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Billing scope"><FleetSelect v-model="form.billingScope" :options="BILLING_SCOPES" :allow-empty="false" /></FormField>
          <FormField v-if="form.billingScope === 'customer_billable'" label="Customer" required><FleetSelect v-model="form.customerId" :options="opts.customers.value" placeholder="Select customer…" /></FormField>
          <FormField label="Opened date" required><TextInput v-model="form.openedDate" type="date" /></FormField>
          <FormField label="Priority"><FleetSelect v-model="form.priority" :options="JOB_PRIORITIES" :allow-empty="false" /></FormField>
          <FormField label="Warehouse"><FleetSelect v-model="form.warehouseId" :options="opts.invWarehouses.value" placeholder="Default warehouse" /></FormField>
          <FormField label="Procedure (PCode)"><FleetSelect v-model="form.procedureId" :options="opts.procedureOptions.value" placeholder="None" /></FormField>
          <FormField label="Coupled trailer"><FleetSelect v-model="form.coupledTrailerId" :options="opts.trailers.value" placeholder="None" /></FormField>
          <FormField label="Cost center"><FleetSelect v-model="form.costCenterId" :options="opts.costCenters.value" placeholder="None" /></FormField>
          <FormField label="Meter reading in"><TextInput v-model="form.meterReadingIn" type="number" step="any" /></FormField>
          <FormField label="Downtime (hrs)"><TextInput v-model="form.downtimeHours" type="number" step="any" /></FormField>
          <FormField label="Location / Bay"><TextInput v-model="form.locationSite" /></FormField>
        </div>
        <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.isMajorProject" type="checkbox" class="h-4 w-4" /> Treat as Major Overhaul / Project (enables multi-phase milestone tracking)</label>
        <FormField label="Reported fault / work request"><TextareaInput v-model="form.reportedFault" :rows="2" /></FormField>
        <FormField label="Diagnosis"><TextareaInput v-model="form.diagnosis" :rows="2" /></FormField>
        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">Save &amp; open workbench</BaseButton>
        </div>
      </form>
    </ModalShell>

    <!-- Full Interactive Job Card Workbench -->
    <ModalShell
      :open="!!detailJob"
      :title="detailJob ? `${detailJob.jobNumber} — ${detailJob.assetNo} ${detailJob.registrationNo ? `(${detailJob.registrationNo})` : ''}` : ''"
      width="max-w-5xl"
      @close="detailJob = null"
    >
      <div v-if="detailJob" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas/50 px-4 py-2.5 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border px-2.5 py-0.5 font-semibold" :class="fleetStatusTone(detailJob.status)">{{ humanLabel(detailJob.status) }}</span>
            <span class="text-ink-soft">{{ humanLabel(detailJob.jobType) }} · {{ humanLabel(detailJob.billingScope) }}</span>
            <span v-if="detailJob.customerName" class="font-medium text-ink">· {{ detailJob.customerName }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <BaseButton v-if="detailJob.status === 'draft'" size="sm" :loading="detailBusy" @click="runTransition('open')">Open job</BaseButton>
            <BaseButton v-if="['draft', 'open', 'awaiting_parts'].includes(detailJob.status)" size="sm" :loading="detailBusy" @click="runTransition('start')">Start / Resume</BaseButton>
            <BaseButton v-if="['open', 'in_progress'].includes(detailJob.status)" size="sm" variant="secondary" :loading="detailBusy" @click="runTransition('await_parts')">Await parts</BaseButton>
            <BaseButton v-if="['open', 'in_progress', 'awaiting_parts'].includes(detailJob.status)" size="sm" :loading="detailBusy" @click="openCompleteModal">Complete job</BaseButton>
            <BaseButton v-if="['completed', 'invoiced'].includes(detailJob.status)" size="sm" :loading="detailBusy" @click="runTransition('close')">Close job</BaseButton>
            <BaseButton v-if="detailJob.billingScope === 'customer_billable' && detailJob.paymentStatus !== 'paid'" size="sm" variant="secondary" :loading="detailBusy" @click="runTransition('mark_paid')">Mark paid</BaseButton>
            <BaseButton v-if="!['closed', 'cancelled'].includes(detailJob.status)" size="sm" variant="danger" @click="showCancelPrompt = true">Cancel</BaseButton>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 border-b border-line pb-3">
          <button
            v-for="t in [
              { id: 'summary', label: 'Summary & totals' },
              { id: 'lines', label: `Parts & costs (${detailJob.lines?.length ?? 0})` },
              { id: 'staff', label: `Technicians (${detailJob.assignments?.length ?? 0})` },
              { id: 'milestones', label: `Milestones (${detailJob.milestones?.length ?? 0})` },
              { id: 'accounting', label: 'GL & Module handoffs' },
              { id: 'audit', label: 'Audit log' },
            ] as const"
            :key="t.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
            :class="detailTab === t.id ? 'bg-primary text-white' : 'bg-canvas text-ink-soft hover:text-ink'"
            @click="detailTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="detailTab === 'summary'" class="space-y-4 text-xs">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-xl border border-line bg-canvas/40 p-3">
              <div class="text-ink-faint">Total internal cost</div>
              <div class="mt-1 text-base font-bold tnum">{{ formatCurrency(detailJob.totalCost) }}</div>
            </div>
            <div class="rounded-xl border border-line bg-canvas/40 p-3">
              <div class="text-ink-faint">Parts &amp; lubricants</div>
              <div class="mt-1 text-base font-bold tnum">{{ formatCurrency(Number(detailJob.partsCostTotal || 0) + Number(detailJob.lubricantsCostTotal || 0)) }}</div>
            </div>
            <div class="rounded-xl border border-line bg-canvas/40 p-3">
              <div class="text-ink-faint">Labour &amp; outsourced</div>
              <div class="mt-1 text-base font-bold tnum">{{ formatCurrency(Number(detailJob.internalLabourCostTotal || 0) + Number(detailJob.outsourcedCostTotal || 0)) }}</div>
            </div>
            <div class="rounded-xl border border-line bg-canvas/40 p-3">
              <div class="text-ink-faint">Billable grand total</div>
              <div class="mt-1 text-base font-bold text-emerald-700 tnum">{{ formatCurrency(detailJob.billableGrandTotal) }}</div>
            </div>
          </div>
          <div class="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
            <div><span class="font-semibold">Reported fault:</span> {{ detailJob.reportedFault || '—' }}</div>
            <div><span class="font-semibold">Diagnosis:</span> {{ detailJob.diagnosis || '—' }}</div>
            <div><span class="font-semibold">Work performed:</span> {{ detailJob.workPerformed || '—' }}</div>
            <div><span class="font-semibold">Meters &amp; downtime:</span> In {{ detailJob.meterReadingIn }} · Out {{ detailJob.meterReadingOut || '—' }} · {{ detailJob.downtimeHours }} hrs</div>
          </div>
        </div>

        <div v-else-if="detailTab === 'lines'" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2">
              <BaseButton size="sm" icon="plus" @click="openAddLine">Add cost / part line</BaseButton>
              <BaseButton size="sm" variant="secondary" :loading="detailBusy" @click="issueParts">Issue Inventory parts</BaseButton>
              <BaseButton size="sm" variant="secondary" :loading="detailBusy" @click="raiseRequisition">Raise SCM requisition</BaseButton>
            </div>
          </div>
          <div v-if="!detailJob.lines?.length" class="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">
            No parts, lubricants, labour or outsourced lines on this job card yet.
          </div>
          <div v-else class="overflow-x-auto rounded-xl border border-line">
            <table class="min-w-full text-left text-xs">
              <thead class="bg-canvas/70 text-[11px] uppercase text-ink-faint">
                <tr>
                  <th class="px-3 py-2"># / Type</th>
                  <th class="px-3 py-2">Description</th>
                  <th class="px-3 py-2">Qty</th>
                  <th class="px-3 py-2">Cost</th>
                  <th class="px-3 py-2">Billable</th>
                  <th class="px-3 py-2">Stock</th>
                  <th class="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="l in detailJob.lines" :key="l.id">
                  <td class="px-3 py-2">
                    <div class="font-semibold">{{ l.lineNumber }} · {{ humanLabel(l.lineType) }}</div>
                    <div class="text-[11px] text-ink-faint">{{ humanLabel(l.sourceType) }}</div>
                  </td>
                  <td class="px-3 py-2">
                    <div>{{ l.description }}</div>
                    <div class="text-[11px] text-ink-faint">{{ l.itemCode || l.supplierName || l.positionOrSide || '—' }}</div>
                  </td>
                  <td class="px-3 py-2 tnum">{{ l.quantity }}</td>
                  <td class="px-3 py-2 tnum">{{ formatCurrency(l.lineCost) }}</td>
                  <td class="px-3 py-2 tnum">{{ l.isBillable ? formatCurrency(l.lineBillableAmount) : '—' }}</td>
                  <td class="px-3 py-2">
                    <span v-if="l.stockIssued" class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Issued</span>
                    <span v-else-if="l.invItemId" class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pending</span>
                    <span v-else class="text-ink-faint">—</span>
                  </td>
                  <td class="px-3 py-2 text-right">
                    <button v-if="!l.stockIssued" type="button" class="mr-2 text-primary hover:underline" @click="openEditLine(l)">Edit</button>
                    <button v-if="!l.stockIssued" type="button" class="text-rose-600 hover:underline" @click="removeLine(l.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="detailTab === 'staff'" class="space-y-3">
          <div class="flex justify-between">
            <p class="text-xs text-ink-faint">Assign technicians and record actual hours worked; saves calculate internal labour &amp; billable amounts.</p>
            <BaseButton size="sm" icon="plus" @click="addAssignment">Assign technician</BaseButton>
          </div>
          <div v-if="!assignmentsDraft.length" class="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">No technicians assigned yet.</div>
          <div v-for="(a, idx) in assignmentsDraft" :key="idx" class="grid items-end gap-2 rounded-xl border border-line bg-canvas/40 p-3 sm:grid-cols-12">
            <FormField label="Technician" class="sm:col-span-3"><FleetSelect v-model="a.employeeId" :options="opts.employees.value" placeholder="Select staff…" /></FormField>
            <FormField label="Role" class="sm:col-span-2"><FleetSelect v-model="a.roleOnJob" :options="JOB_ROLES" :allow-empty="false" /></FormField>
            <FormField label="Est hrs" class="sm:col-span-1"><TextInput v-model="a.hoursEstimated" type="number" step="any" /></FormField>
            <FormField label="Worked" class="sm:col-span-1"><TextInput v-model="a.hoursWorked" type="number" step="any" /></FormField>
            <FormField label="Cost/hr" class="sm:col-span-2"><TextInput v-model="a.hourlyCostRate" type="number" step="any" /></FormField>
            <FormField label="Bill/hr" class="sm:col-span-2"><TextInput v-model="a.hourlyBillRate" type="number" step="any" /></FormField>
            <button type="button" class="pb-2 text-xs text-rose-600 hover:underline sm:col-span-1" @click="assignmentsDraft.splice(idx, 1)">×</button>
          </div>
          <div class="flex justify-end">
            <BaseButton :loading="staffSaving" @click="saveAssignments">Save technician assignments</BaseButton>
          </div>
        </div>

        <div v-else-if="detailTab === 'milestones'" class="space-y-3">
          <div class="flex justify-between">
            <p class="text-xs text-ink-faint">Major project phases, progress %, owners, target dates and blockers.</p>
            <BaseButton size="sm" icon="plus" @click="openAddMilestone">Add milestone</BaseButton>
          </div>
          <div v-if="!detailJob.milestones?.length" class="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-faint">No milestones added yet.</div>
          <div v-for="m in detailJob.milestones" :key="m.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3 text-xs">
            <div>
              <div class="font-semibold text-ink">{{ m.milestoneCode ? `${m.milestoneCode} · ` : '' }}{{ m.title }}</div>
              <div class="text-ink-faint">{{ m.phase }} · {{ m.ownerName || 'Unassigned' }} · Due {{ m.plannedEndDate ? formatDate(m.plannedEndDate) : '—' }}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-semibold tnum">{{ m.progressPct }}%</span>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(m.status)">{{ humanLabel(m.status) }}</span>
              <button type="button" class="text-primary hover:underline" @click="openEditMilestone(m)">Edit</button>
              <button type="button" class="text-rose-600 hover:underline" @click="deleteMilestone(m)">Delete</button>
            </div>
          </div>
        </div>

        <div v-else-if="detailTab === 'accounting'" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-2 rounded-xl border border-line p-4">
              <div class="text-xs font-semibold text-ink">General Ledger Journal Posting</div>
              <p class="text-xs text-ink-faint">Posts balanced double-entry journals using Fleet GL Settings.</p>
              <div class="flex flex-wrap gap-2 pt-1">
                <BaseButton size="sm" :disabled="!!detailJob.glCostJournalBatchId" :loading="detailBusy" @click="postGl('cost_recognition')">
                  {{ detailJob.glCostJournalBatchId ? 'Cost posted to GL' : 'Post cost recognition' }}
                </BaseButton>
                <BaseButton size="sm" variant="secondary" :disabled="detailJob.billingScope !== 'customer_billable' || !!detailJob.glRevenueJournalBatchId" :loading="detailBusy" @click="postGl('revenue_recognition')">
                  {{ detailJob.glRevenueJournalBatchId ? 'Revenue posted to GL' : 'Post customer revenue' }}
                </BaseButton>
              </div>
            </div>
            <div class="space-y-2 rounded-xl border border-line p-4">
              <div class="text-xs font-semibold text-ink">Cross-Module Handoffs</div>
              <p class="text-xs text-ink-faint">Stage typed handoff payloads for Accounts Payable, AR, POS counter checkout, or Project Management.</p>
              <div class="flex flex-wrap gap-2 pt-1">
                <BaseButton size="sm" variant="secondary" :loading="detailBusy" @click="runHandoff('ap')">Stage AP bill</BaseButton>
                <BaseButton size="sm" variant="secondary" :disabled="detailJob.billingScope !== 'customer_billable'" :loading="detailBusy" @click="runHandoff('ar')">Stage AR invoice</BaseButton>
                <BaseButton size="sm" variant="secondary" :loading="detailBusy" @click="runHandoff('point_of_sale')">POS checkout</BaseButton>
                <BaseButton size="sm" variant="secondary" :loading="detailBusy" @click="runHandoff('project_management')">Sync Project Mgmt</BaseButton>
              </div>
            </div>
          </div>
          <div v-if="detailJob.crossModuleLinks?.length" class="space-y-1.5 rounded-xl border border-line p-3 text-xs">
            <div class="font-semibold text-ink">Recorded handoffs &amp; journals</div>
            <div v-for="lnk in detailJob.crossModuleLinks" :key="lnk.id" class="flex items-center justify-between border-t border-line/60 pt-1.5">
              <span>{{ humanLabel(lnk.targetModule) }} · {{ humanLabel(lnk.linkKind) }} ({{ lnk.targetReference || '—' }})</span>
              <span class="flex items-center gap-2">
                <span class="tnum font-medium">{{ formatCurrency(lnk.amount) }}</span>
                <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold" :class="fleetStatusTone(lnk.handoffStatus)">{{ humanLabel(lnk.handoffStatus) }}</span>
              </span>
            </div>
          </div>
        </div>

        <div v-else class="space-y-2 text-xs">
          <div v-if="!detailJob.history?.length" class="py-6 text-center text-ink-faint">No audit history yet.</div>
          <div v-for="ev in detailJob.history" :key="ev.id" class="flex items-center justify-between rounded-xl border border-line bg-canvas/40 px-3 py-2">
            <div>
              <span class="font-semibold text-ink">{{ humanLabel(ev.action) }}</span>
              <span class="ml-2 text-ink-soft">{{ ev.previousStatus ? `${humanLabel(ev.previousStatus)} -> ` : '' }}{{ humanLabel(ev.newStatus) }}</span>
              <span v-if="ev.reason" class="ml-2 text-ink-faint">· {{ ev.reason }}</span>
            </div>
            <span class="text-ink-faint">{{ formatDate(ev.createdAt) }}</span>
          </div>
        </div>
      </div>
    </ModalShell>

    <!-- Job Line Modal -->
    <ModalShell :open="showLineModal" :title="editingLine ? 'Edit job line' : 'Add part / labour / service line'" width="max-w-2xl" @close="showLineModal = false">
      <form class="space-y-3.5" @submit.prevent="saveLine">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Line type"><FleetSelect v-model="lineForm.lineType" :options="JOB_LINE_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Source type"><FleetSelect v-model="lineForm.sourceType" :options="JOB_SOURCE_TYPES" :allow-empty="false" /></FormField>
          <FormField label="Inventory item (optional)"><FleetSelect :model-value="lineForm.invItemId" :options="opts.invItems.value" placeholder="Manual / non-stock" @update:model-value="onLineItemChange" /></FormField>
          <FormField label="Warehouse"><FleetSelect v-model="lineForm.warehouseId" :options="opts.invWarehouses.value" placeholder="None" /></FormField>
          <FormField label="Description" required class="sm:col-span-2"><TextInput v-model="lineForm.description" /></FormField>
          <FormField label="UOM"><FleetSelect v-model="lineForm.uomId" :options="opts.invUoms.value" placeholder="None" /></FormField>
          <FormField label="Supplier (AP)"><FleetSelect v-model="lineForm.supplierId" :options="opts.suppliers.value" placeholder="None" /></FormField>
          <FormField label="Quantity" required><TextInput v-model="lineForm.quantity" type="number" step="any" /></FormField>
          <FormField label="Unit cost"><TextInput v-model="lineForm.unitCost" type="number" step="any" /></FormField>
          <FormField label="Billable unit price"><TextInput v-model="lineForm.unitPrice" type="number" step="any" /></FormField>
          <FormField label="Entry date"><TextInput v-model="lineForm.entryDate" type="date" /></FormField>
          <FormField label="Position / Side"><TextInput v-model="lineForm.positionOrSide" /></FormField>
          <FormField label="Location note"><TextInput v-model="lineForm.locationNote" /></FormField>
        </div>
        <div class="flex flex-wrap gap-5">
          <label class="flex items-center gap-2 text-xs font-medium"><input v-model="lineForm.isBillable" type="checkbox" class="h-4 w-4" /> Billable to customer</label>
          <label class="flex items-center gap-2 text-xs font-medium"><input v-model="lineForm.isPaid" type="checkbox" class="h-4 w-4" /> Paid</label>
        </div>
        <p v-if="lineError" role="alert" class="text-sm text-rose-600">{{ lineError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showLineModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="lineSaving">Save line</BaseButton>
        </div>
      </form>
    </ModalShell>

    <!-- Complete / Cancel / Milestone Modals -->
    <ModalShell :open="completeModal" title="Complete job card" width="max-w-lg" @close="completeModal = false">
      <form class="space-y-3.5" @submit.prevent="submitComplete">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Meter reading out"><TextInput v-model="completeForm.meterReadingOut" type="number" step="any" /></FormField>
          <FormField label="Total downtime (hrs)"><TextInput v-model="completeForm.downtimeHours" type="number" step="any" /></FormField>
        </div>
        <FormField label="Final diagnosis"><TextareaInput v-model="completeForm.diagnosis" :rows="2" /></FormField>
        <FormField label="Work performed summary"><TextareaInput v-model="completeForm.workPerformed" :rows="3" /></FormField>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="completeModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="detailBusy">Mark completed</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showCancelPrompt" title="Cancel job card" width="max-w-md" @close="showCancelPrompt = false">
      <form class="space-y-3.5" @submit.prevent="submitCancel">
        <FormField label="Cancellation reason" required><TextareaInput v-model="cancelReason" :rows="2" /></FormField>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showCancelPrompt = false">Keep open</BaseButton>
          <BaseButton type="submit" variant="danger" :loading="detailBusy">Confirm cancellation</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="showMilestoneModal" :title="editingMs ? 'Edit milestone' : 'Add project milestone'" width="max-w-xl" @close="showMilestoneModal = false">
      <form class="space-y-3.5" @submit.prevent="saveMilestone">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Code"><TextInput v-model="msForm.milestoneCode" /></FormField>
          <FormField label="Title" required><TextInput v-model="msForm.title" /></FormField>
          <FormField label="Phase"><TextInput v-model="msForm.phase" /></FormField>
          <FormField label="Owner"><FleetSelect v-model="msForm.ownerEmployeeId" :options="opts.employees.value" placeholder="None" /></FormField>
          <FormField label="Planned start"><TextInput v-model="msForm.plannedStartDate" type="date" /></FormField>
          <FormField label="Planned end"><TextInput v-model="msForm.plannedEndDate" type="date" /></FormField>
          <FormField label="Status"><FleetSelect v-model="msForm.status" :options="MILESTONE_STATUSES" :allow-empty="false" /></FormField>
          <FormField label="Progress (%)"><TextInput v-model="msForm.progressPct" type="number" min="0" max="100" /></FormField>
          <FormField label="Sort order"><TextInput v-model="msForm.sortOrder" type="number" min="1" /></FormField>
        </div>
        <FormField label="Deliverables"><TextareaInput v-model="msForm.deliverables" :rows="2" /></FormField>
        <FormField label="Blocker notes"><TextareaInput v-model="msForm.blockerNotes" :rows="2" /></FormField>
        <p v-if="msError" role="alert" class="text-sm text-rose-600">{{ msError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showMilestoneModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="msSaving">Save milestone</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmDeleteJob"
      title="Delete draft job card?"
      :message="`Delete ${confirmDeleteJob?.jobNumber}? Only draft job cards can be removed.`"
      confirm-label="Delete"
      tone="danger"
      :loading="deletingJob"
      @confirm="performDeleteJob"
      @cancel="confirmDeleteJob = null"
    />
  </section>
</template>
