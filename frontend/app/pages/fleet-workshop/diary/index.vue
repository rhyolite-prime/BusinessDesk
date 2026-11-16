<script setup lang="ts">
import { useFleetUnitId, useFleetWorkshop } from '../../../features/fleet-workshop/useFleetWorkshop'
import { useFleetOptions } from '../../../features/fleet-workshop/useFleetOptions'
import type { DiaryAllocationRecord, DiaryEntryRecord } from '../../../features/fleet-workshop/fleet-types'
import FleetSelect from '../../../features/fleet-workshop/components/FleetSelect.vue'
import { DIARY_CATEGORIES, fleetErrorMessage, fleetStatusTone, humanLabel, todayIso } from '../../../features/fleet-workshop/fleet-helpers'

definePageMeta({ layout: 'admin-fleet' })
useHead({ title: 'Workshop diary ledger' })

const api = useFleetWorkshop()
const unitId = useFleetUnitId()
const opts = useFleetOptions()
const toast = useToast()

const rows = ref<DiaryEntryRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 25
const paidFilter = ref('')
const q = ref('')
const loading = ref(false)
const error = ref('')

const unpaidSum = computed(() => rows.value.filter((r) => !r.isPaid).reduce((a, r) => a + Number(r.totalAmount || 0), 0))
const paidSum = computed(() => rows.value.filter((r) => r.isPaid).reduce((a, r) => a + Number(r.totalAmount || 0), 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await api.diaryEntries.list({
      accountingUnitId: unitId.value || undefined,
      isPaid: paidFilter.value || undefined,
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

watch([unitId, paidFilter, page], load)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; void load() }, 250)
})
onMounted(load)

/* ------------------------ Create / Edit Diary Entry ----------------------- */
const showModal = ref(false)
const editing = ref<DiaryEntryRecord | null>(null)
const saving = ref(false)
const formError = ref('')
const previewNo = ref('')
const form = reactive({
  entryDate: todayIso(),
  vehicleId: '',
  registrationNoSnapshot: '',
  entryCategory: 'parts',
  description: '',
  positionOrSide: '',
  locationOrVendor: '',
  supplierId: '',
  invItemId: '',
  employeeId: '',
  quantity: '1',
  unitAmount: '0',
  totalAmount: '0',
  isPaid: false,
  paymentReference: '',
  notes: '',
})

watch([() => form.quantity, () => form.unitAmount], () => {
  const qty = Number(form.quantity || 0)
  const p = Number(form.unitAmount || 0)
  if (!Number.isNaN(qty) && !Number.isNaN(p) && p > 0) {
    form.totalAmount = (qty * p).toFixed(2)
  }
})

function onVehicleChange(vid: string) {
  form.vehicleId = vid
  const v = opts.vehicleMap.value[vid]
  if (v) form.registrationNoSnapshot = v.registrationNo || v.assetNo
}

async function openCreate() {
  if (!unitId.value) { toast.error('Select an accounting unit first.'); return }
  editing.value = null
  formError.value = ''
  previewNo.value = ''
  Object.assign(form, {
    entryDate: todayIso(),
    vehicleId: '',
    registrationNoSnapshot: '',
    entryCategory: 'parts',
    description: '',
    positionOrSide: '',
    locationOrVendor: '',
    supplierId: '',
    invItemId: '',
    employeeId: '',
    quantity: '1',
    unitAmount: '0',
    totalAmount: '0',
    isPaid: false,
    paymentReference: '',
    notes: '',
  })
  showModal.value = true
  try {
    const n = await api.diaryEntries.nextNumber(unitId.value)
    previewNo.value = n.nextNumber
  } catch { /* ignore */ }
}

function openEdit(row: DiaryEntryRecord) {
  editing.value = row
  previewNo.value = row.entryNumber
  formError.value = ''
  Object.assign(form, {
    entryDate: row.entryDate?.slice(0, 10) || todayIso(),
    vehicleId: row.vehicleId || '',
    registrationNoSnapshot: row.registrationNo || '',
    entryCategory: row.entryCategory || 'parts',
    description: row.description || '',
    positionOrSide: row.positionOrSide || '',
    locationOrVendor: row.locationOrVendor || '',
    supplierId: row.supplierId || '',
    invItemId: row.invItemId || '',
    employeeId: row.employeeId || '',
    quantity: row.quantity || '1',
    unitAmount: row.unitAmount || '0',
    totalAmount: row.totalAmount || '0',
    isPaid: Boolean(row.isPaid),
    paymentReference: row.paymentReference || '',
    notes: row.notes || '',
  })
  showModal.value = true
}

async function save() {
  if (saving.value) return
  if (!form.description.trim()) {
    formError.value = 'Description is required.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const base = {
      entryDate: form.entryDate,
      vehicleId: form.vehicleId || null,
      registrationNoSnapshot: form.registrationNoSnapshot.trim(),
      entryCategory: form.entryCategory,
      description: form.description.trim(),
      positionOrSide: form.positionOrSide.trim(),
      locationOrVendor: form.locationOrVendor.trim(),
      supplierId: form.supplierId || null,
      invItemId: form.invItemId || null,
      employeeId: form.employeeId || null,
      quantity: String(form.quantity || '1'),
      unitAmount: String(form.unitAmount || '0'),
      totalAmount: String(form.totalAmount || '0'),
      isPaid: form.isPaid,
      paymentReference: form.paymentReference.trim(),
      notes: form.notes.trim(),
    }
    if (editing.value) {
      await api.diaryEntries.update(editing.value.id, { ...base, version: editing.value.version })
      toast.success('Diary entry updated')
    } else {
      await api.diaryEntries.create({ accountingUnitId: unitId.value, ...base })
      toast.success('Diary entry logged')
    }
    showModal.value = false
    await load()
  } catch (e) {
    formError.value = fleetErrorMessage(e)
  } finally {
    saving.value = false
  }
}

/* ------------------------ Mark Paid Modal --------------------------------- */
const payRow = ref<DiaryEntryRecord | null>(null)
const paySaving = ref(false)
const payRef = ref('')

async function submitPay() {
  if (!payRow.value || paySaving.value) return
  paySaving.value = true
  try {
    await api.diaryEntries.markPaid(payRow.value.id, payRef.value.trim())
    payRow.value = null
    toast.success('Marked as paid')
    await load()
  } catch (e) {
    toast.error('Failed to mark paid', fleetErrorMessage(e))
  } finally {
    paySaving.value = false
  }
}

/* ------------------------ Split Across Vehicles (Allocate) ---------------- */
const allocRow = ref<DiaryEntryRecord | null>(null)
const allocLines = ref<DiaryAllocationRecord[]>([])
const allocSaving = ref(false)
const allocError = ref('')

const allocSum = computed(() => allocLines.value.reduce((a, l) => a + Number(l.allocatedAmount || 0), 0))

async function openAlloc(row: DiaryEntryRecord) {
  allocRow.value = row
  allocError.value = ''
  try {
    const full = await api.diaryEntries.get(row.id)
    if (full.allocations?.length) {
      allocLines.value = full.allocations.map((a) => ({ ...a }))
    } else {
      allocLines.value = [{
        vehicleId: row.vehicleId || opts.vehicles.value[0]?.value || '',
        allocatedQuantity: row.quantity || '1',
        allocatedAmount: row.totalAmount || '0',
        notes: '',
      }]
    }
  } catch (e) {
    allocError.value = fleetErrorMessage(e)
  }
}

function addAllocLine() {
  allocLines.value.push({
    vehicleId: opts.vehicles.value[0]?.value || '',
    allocatedQuantity: '1',
    allocatedAmount: '0',
    notes: '',
  })
}

function splitEqually() {
  if (!allocRow.value || !allocLines.value.length) return
  const totalAmt = Number(allocRow.value.totalAmount || 0)
  const totalQty = Number(allocRow.value.quantity || 1)
  const eachAmt = Math.floor((totalAmt / allocLines.value.length) * 100) / 100
  const eachQty = Math.floor((totalQty / allocLines.value.length) * 100) / 100
  let remAmt = totalAmt
  let remQty = totalQty
  allocLines.value.forEach((l, i) => {
    if (i === allocLines.value.length - 1) {
      l.allocatedAmount = remAmt.toFixed(2)
      l.allocatedQuantity = Math.max(0.01, remQty).toFixed(2)
    } else {
      l.allocatedAmount = eachAmt.toFixed(2)
      l.allocatedQuantity = Math.max(0.01, eachQty).toFixed(2)
      remAmt -= eachAmt
      remQty -= eachQty
    }
  })
}

async function saveAlloc() {
  if (!allocRow.value || allocSaving.value) return
  if (allocLines.value.some((l) => !l.vehicleId)) {
    allocError.value = 'Every split line needs a vehicle.'
    return
  }
  allocSaving.value = true
  allocError.value = ''
  try {
    await api.diaryEntries.allocate(
      allocRow.value.id,
      allocLines.value.map((l) => ({
        vehicleId: l.vehicleId,
        allocatedQuantity: String(l.allocatedQuantity || '1'),
        allocatedAmount: String(l.allocatedAmount || '0'),
        notes: (l.notes || '').trim(),
      })),
    )
    allocRow.value = null
    toast.success('Diary entry split across vehicles')
    await load()
  } catch (e) {
    allocError.value = fleetErrorMessage(e)
  } finally {
    allocSaving.value = false
  }
}

async function promoteToJobs(row: DiaryEntryRecord) {
  try {
    const res = await api.diaryEntries.promote(row.id)
    const count = res.promotedJobCardIds?.length || 1
    toast.success('Promoted to Job Card(s)', `${count} job card(s) created from diary ${row.entryNumber}.`)
    await load()
  } catch (e) {
    toast.error('Promotion failed', fleetErrorMessage(e))
  }
}

const confirmRow = ref<DiaryEntryRecord | null>(null)
const deleting = ref(false)
async function confirmDelete() {
  if (!confirmRow.value || deleting.value) return
  deleting.value = true
  try {
    await api.diaryEntries.remove(confirmRow.value.id, confirmRow.value.version)
    confirmRow.value = null
    toast.success('Diary entry deleted')
    await load()
  } catch (e) {
    toast.error('Delete failed', fleetErrorMessage(e))
  } finally {
    deleting.value = false
  }
}

const columns = [
  { key: 'entryNumber', label: 'Entry / Date' },
  { key: 'description', label: 'Work / Parts description' },
  { key: 'registrationNo', label: 'Vehicle / Location' },
  { key: 'totalAmount', label: 'Qty · Amount' },
  { key: 'isPaid', label: 'Payment' },
  { key: 'status', label: 'Status' },
  { key: '_actions', label: '', align: 'right' as const },
]
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Workshop diary ledger" subtitle="Fast field & workshop notebook for repairs, parts, workmanship and cash payouts — split across vehicles and promote to Job Cards." icon="pencil-square">
      <template #actions>
        <BaseButton icon="plus" @click="openCreate">New diary entry</BaseButton>
      </template>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-3">
      <StatCard label="Unpaid on current view" :value="formatCurrency(unpaidSum)" icon="exclamation-triangle" tone="amber" />
      <StatCard label="Paid on current view" :value="formatCurrency(paidSum)" icon="banknotes" tone="green" />
      <StatCard label="Total diary lines" :value="total" icon="pencil-square" tone="blue" />
    </div>

    <div class="rounded-2xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <TextInput v-model="q" placeholder="Search entry, reg, vendor or description…" class="max-w-xs" />
        <div class="flex gap-1.5 text-xs">
          <button
            v-for="p in [
              { id: '', label: 'All payments' },
              { id: 'false', label: 'Unpaid' },
              { id: 'true', label: 'Paid' },
            ]"
            :key="p.id"
            type="button"
            class="rounded-full border px-3 py-1 font-medium"
            :class="paidFilter === p.id ? 'border-primary bg-primary text-white' : 'border-line text-ink-soft'"
            @click="paidFilter = p.id"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <p v-if="error" role="alert" class="p-4 text-sm text-rose-600">{{ error }}</p>

      <DataTable :columns="columns" :rows="rows" :loading="loading" empty="No workshop diary entries logged.">
        <template #cell="{ col, row }">
          <template v-if="col.key === 'entryNumber'">
            <div class="font-semibold text-ink">{{ row.entryNumber }}</div>
            <div class="text-[11px] text-ink-faint">{{ formatDate(row.entryDate) }}</div>
          </template>
          <template v-else-if="col.key === 'description'">
            <div class="font-medium text-ink">{{ row.description }}</div>
            <div class="text-[11px] text-ink-faint">{{ humanLabel(row.entryCategory) }} {{ row.positionOrSide ? `· ${row.positionOrSide}` : '' }}</div>
          </template>
          <template v-else-if="col.key === 'registrationNo'">
            <div>{{ row.assetNo ? `${row.assetNo} (${row.registrationNo})` : (row.registrationNo || 'Multi / Unassigned') }}</div>
            <div class="text-[11px] text-ink-faint">{{ row.locationOrVendor || '—' }}</div>
          </template>
          <template v-else-if="col.key === 'totalAmount'">
            <div class="font-semibold tnum">{{ formatCurrency(row.totalAmount) }}</div>
            <div class="text-[11px] text-ink-faint tnum">Qty {{ row.quantity }} × {{ formatCurrency(row.unitAmount) }}</div>
          </template>
          <template v-else-if="col.key === 'isPaid'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.isPaid ? 'paid' : 'unpaid')">
              {{ row.isPaid ? 'Paid' : 'Unpaid' }}
            </span>
          </template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold" :class="fleetStatusTone(row.status)">
              {{ humanLabel(row.status) }}
            </span>
          </template>
          <div v-else-if="col.key === '_actions'" class="flex flex-wrap justify-end gap-1">
            <BaseButton v-if="!row.isPaid" size="sm" variant="secondary" @click="payRow = row; payRef = ''">Mark paid</BaseButton>
            <BaseButton v-if="row.status !== 'promoted_to_job'" size="sm" variant="ghost" @click="openAlloc(row)">Split vehicles</BaseButton>
            <BaseButton v-if="row.status !== 'promoted_to_job'" size="sm" @click="promoteToJobs(row)">Promote to job</BaseButton>
            <BaseButton v-if="row.status === 'logged'" size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton v-if="row.status === 'logged'" size="sm" variant="danger" @click="confirmRow = row">Delete</BaseButton>
          </div>
        </template>
      </DataTable>

      <div class="border-t border-line p-4">
        <Pagination v-model:page="page" :size="size" :total="total" />
      </div>
    </div>

    <ModalShell :open="showModal" :title="editing ? `Diary entry ${editing.entryNumber}` : `New workshop diary entry ${previewNo ? `(${previewNo})` : ''}`" width="max-w-2xl" @close="showModal = false">
      <form class="space-y-3.5" @submit.prevent="save">
        <div class="grid gap-3 sm:grid-cols-2">
          <FormField label="Entry date" required><TextInput v-model="form.entryDate" type="date" /></FormField>
          <FormField label="Category"><FleetSelect v-model="form.entryCategory" :options="DIARY_CATEGORIES" :allow-empty="false" /></FormField>
          <FormField label="Vehicle (optional if splitting later)"><FleetSelect :model-value="form.vehicleId" :options="opts.vehicles.value" placeholder="Unassigned / multi-vehicle" @update:model-value="onVehicleChange" /></FormField>
          <FormField label="Reg. / Vehicle note"><TextInput v-model="form.registrationNoSnapshot" placeholder="e.g. GT 6499-24 & GT 6291-24" /></FormField>
          <FormField label="Work / Parts description" required class="sm:col-span-2">
            <TextInput v-model="form.description" placeholder="e.g. Rear hub bolt studs & welding workmanship" />
          </FormField>
          <FormField label="Position / Side"><TextInput v-model="form.positionOrSide" placeholder="e.g. Front LH / Rear" /></FormField>
          <FormField label="Location or vendor"><TextInput v-model="form.locationOrVendor" placeholder="e.g. Suame Magazine / Workshop" /></FormField>
          <FormField label="Quantity"><TextInput v-model="form.quantity" type="number" step="any" /></FormField>
          <FormField label="Unit amount"><TextInput v-model="form.unitAmount" type="number" step="any" /></FormField>
          <FormField label="Total amount" required><TextInput v-model="form.totalAmount" type="number" step="any" /></FormField>
          <FormField label="Supplier"><FleetSelect v-model="form.supplierId" :options="opts.suppliers.value" placeholder="Optional supplier" /></FormField>
          <FormField label="Inventory item (optional)"><FleetSelect v-model="form.invItemId" :options="opts.invItems.value" placeholder="None" /></FormField>
          <FormField label="Technician / Employee"><FleetSelect v-model="form.employeeId" :options="opts.employees.value" placeholder="None" /></FormField>
        </div>
        <div class="flex flex-wrap items-center gap-4 pt-1">
          <label class="flex items-center gap-2 text-xs font-medium"><input v-model="form.isPaid" type="checkbox" class="h-4 w-4" /> Paid immediately</label>
          <TextInput v-if="form.isPaid" v-model="form.paymentReference" placeholder="Payment ref / voucher" class="flex-1" />
        </div>
        <FormField label="Notebook remarks"><TextareaInput v-model="form.notes" :rows="2" /></FormField>
        <p v-if="formError" role="alert" class="text-sm text-rose-600">{{ formError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
          <BaseButton type="submit" :loading="saving">Save entry</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="!!payRow" :title="`Mark paid — ${payRow?.entryNumber}`" width="max-w-md" @close="payRow = null">
      <form class="space-y-3.5" @submit.prevent="submitPay">
        <p class="text-sm font-semibold text-ink">Amount: {{ formatCurrency(payRow?.totalAmount || '0') }}</p>
        <FormField label="Payment / cash voucher reference"><TextInput v-model="payRef" placeholder="e.g. PC-042" /></FormField>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="payRow = null">Cancel</BaseButton>
          <BaseButton type="submit" :loading="paySaving">Mark paid</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="!!allocRow" :title="`Split across vehicles — ${allocRow?.entryNumber}`" width="max-w-2xl" @close="allocRow = null">
      <div v-if="allocRow" class="space-y-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2 text-xs">
          <span>Entry total: <strong class="tnum">{{ formatCurrency(allocRow.totalAmount) }}</strong></span>
          <span>Allocated sum: <strong class="tnum" :class="Math.abs(allocSum - Number(allocRow.totalAmount)) > 0.01 ? 'text-rose-600' : 'text-emerald-700'">{{ formatCurrency(allocSum) }}</strong></span>
          <div class="flex gap-1.5">
            <BaseButton size="sm" variant="secondary" @click="splitEqually">Split equally</BaseButton>
            <BaseButton size="sm" icon="plus" @click="addAllocLine">Add vehicle</BaseButton>
          </div>
        </div>
        <div v-for="(l, idx) in allocLines" :key="idx" class="grid items-end gap-2 sm:grid-cols-12">
          <FormField label="Vehicle" class="sm:col-span-5"><FleetSelect v-model="l.vehicleId" :options="opts.vehicles.value" placeholder="Select vehicle…" /></FormField>
          <FormField label="Qty" class="sm:col-span-2"><TextInput v-model="l.allocatedQuantity" type="number" step="any" /></FormField>
          <FormField label="Amount" class="sm:col-span-2"><TextInput v-model="l.allocatedAmount" type="number" step="any" /></FormField>
          <FormField label="Notes" class="sm:col-span-2"><TextInput v-model="l.notes" /></FormField>
          <button type="button" class="pb-2 text-xs text-rose-600 hover:underline sm:col-span-1" @click="allocLines.splice(idx, 1)">×</button>
        </div>
        <p v-if="allocError" role="alert" class="text-sm text-rose-600">{{ allocError }}</p>
        <div class="flex justify-end gap-2 border-t border-line pt-4">
          <BaseButton variant="secondary" @click="allocRow = null">Cancel</BaseButton>
          <BaseButton :loading="allocSaving" @click="saveAlloc">Save vehicle split</BaseButton>
        </div>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!confirmRow"
      title="Delete diary entry?"
      :message="`Delete ${confirmRow?.entryNumber} (${confirmRow?.description})?`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="confirmRow = null"
    />
  </section>
</template>
