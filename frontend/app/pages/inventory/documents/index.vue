<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import { useInventoryOptions } from '../../../features/inventory/useInventoryOptions'
import type { StockDocument } from '../../../features/inventory/inventory-types'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Stock documents' })

const api = useInventory()
const unitId = useInventoryUnitId()
const opts = useInventoryOptions()
const request = useRequestFetch()
const message = (e: any) => e?.data?.statusMessage || e?.statusMessage || 'Request failed. Please retry.'
const today = () => new Date().toISOString().slice(0, 10)

/* ------------------------------- movement types ------------------------------ */
// Reasons mirror the backend's reasons() map. Each document type accepts only its own list.
const reasonsByType: Record<string, string[]> = {
  receipt: ['purchase_receipt', 'opening_balance', 'customer_return', 'production_receipt', 'other_receipt'],
  issue: ['sales_issue', 'production_issue', 'damage', 'expiry', 'sample', 'internal_use', 'other_issue'],
  transfer: ['inter_warehouse', 'van_replenishment', 'other_transfer'],
  adjustment: ['recount', 'shrinkage', 'write_off', 'other_adjustment'],
  count: ['cycle_count', 'annual_count'],
}
const typeOptions = Object.keys(reasonsByType).map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))
const reasonOptions = (type: string) => (reasonsByType[type] || []).map((v) => ({ value: v, label: v.replace(/_/g, ' ') }))

/* ---------------------------------- list ------------------------------------ */
const docs = ref<StockDocument[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const filterType = ref('')
const filterStatus = ref('')
const loading = ref(false)
const listError = ref('')

async function load() {
  if (!unitId.value) return
  loading.value = true
  listError.value = ''
  try {
    const r = await api.documents.list(unitId.value, { documentType: filterType.value || undefined, status: filterStatus.value || undefined }, page.value, size)
    docs.value = r.items
    total.value = r.total
  } catch (e) {
    docs.value = []
    listError.value = message(e)
  } finally {
    loading.value = false
  }
}
watch([unitId, filterType, filterStatus], () => { page.value = 1; void load() })
watch(page, load)
onMounted(load)

// Workflow buttons per status. Cancel and reverse need a reason; the server enforces the rules.
const nextActions = (status: string): { action: string; label: string; reason?: boolean; tone?: 'primary' | 'danger' }[] => {
  if (status === 'draft') return [{ action: 'submit', label: 'Submit' }, { action: 'cancel', label: 'Cancel', reason: true, tone: 'danger' }]
  if (status === 'submitted') return [{ action: 'approve', label: 'Approve' }, { action: 'cancel', label: 'Cancel', reason: true, tone: 'danger' }]
  if (status === 'approved') return [{ action: 'post', label: 'Post' }, { action: 'cancel', label: 'Cancel', reason: true, tone: 'danger' }]
  if (status === 'posted') return [{ action: 'reverse', label: 'Reverse', reason: true, tone: 'danger' }]
  return []
}

const busyId = ref('')
const actionError = ref('')
const reasonFor = ref<{ doc: StockDocument; action: string; label: string } | null>(null)
const reasonText = ref('')

async function runAction(doc: StockDocument, action: string, reason = '') {
  busyId.value = doc.id
  actionError.value = ''
  try {
    await api.documents.action(doc.id, action, { version: doc.version, ...(reason ? { reason } : {}) })
    await load()
  } catch (e) {
    actionError.value = message(e)
  } finally {
    busyId.value = ''
  }
}
function startAction(doc: StockDocument, action: string, label: string, needsReason?: boolean) {
  if (needsReason) {
    reasonText.value = ''
    reasonFor.value = { doc, action, label }
    return
  }
  void runAction(doc, action)
}
async function confirmReason() {
  if (!reasonFor.value || !reasonText.value.trim()) return
  const { doc, action } = reasonFor.value
  reasonFor.value = null
  await runAction(doc, action, reasonText.value.trim())
}

/* ----------------------------------- form ----------------------------------- */
const showForm = ref(false)
const editing = ref<StockDocument | null>(null)
const saving = ref(false)
const formError = ref('')
const requestId = ref('')
const numberPreview = ref('')

const header = reactive({
  documentType: 'receipt',
  movementReason: 'purchase_receipt',
  documentDate: today(),
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  supplierId: '',
  customerId: '',
  referenceNumber: '',
  notes: '',
})

interface FormLine {
  itemId: string
  uomId: string
  quantity: string
  countedQuantity: string
  unitCost: string
  batchId: string
  batchCode: string
  expiryDate: string
  sourceBinId: string
  destinationBinId: string
  serialText: string
  description: string
}
const lines = ref<FormLine[]>([])
const blankLine = (): FormLine => ({ itemId: '', uomId: '', quantity: '', countedQuantity: '', unitCost: '0', batchId: '', batchCode: '', expiryDate: '', sourceBinId: '', destinationBinId: '', serialText: '', description: '' })

const customers = ref<{ value: string; label: string }[]>([])
const isCount = computed(() => header.documentType === 'count')
const isTransfer = computed(() => header.documentType === 'transfer')

// Changing the type resets the reason to the first valid one for that type.
watch(() => header.documentType, (type) => {
  header.movementReason = reasonsByType[type]?.[0] || ''
  if (type !== 'transfer') header.destinationWarehouseId = ''
})

async function loadCustomers() {
  const r = await request<{ data: { id: string; name: string }[] }>('/api/shared/customers', { query: { pageNo: 1, pageSize: 200 } }).catch(() => ({ data: [] as { id: string; name: string }[] }))
  customers.value = r.data.map((c) => ({ value: c.id, label: c.name }))
}

async function previewNumber() {
  if (!unitId.value) return
  numberPreview.value = (await api.documents.nextNumber(unitId.value, header.documentType).catch(() => ({ number: '' }))).number
}

async function openCreate() {
  editing.value = null
  formError.value = ''
  requestId.value = crypto.randomUUID()
  Object.assign(header, { documentType: 'receipt', movementReason: 'purchase_receipt', documentDate: today(), sourceWarehouseId: opts.warehouses.value[0]?.value || '', destinationWarehouseId: '', supplierId: '', customerId: '', referenceNumber: '', notes: '' })
  lines.value = [blankLine()]
  showForm.value = true
  void loadCustomers()
  void previewNumber()
}

async function openEdit(doc: StockDocument) {
  const detail = await api.documents.get(doc.id).catch((e) => { actionError.value = message(e); return null })
  if (!detail) return
  if (detail.status !== 'draft') { actionError.value = 'Only draft documents can be edited.'; return }
  editing.value = detail
  formError.value = ''
  requestId.value = crypto.randomUUID()
  Object.assign(header, {
    documentType: detail.documentType,
    movementReason: detail.movementReason,
    documentDate: detail.documentDate?.slice(0, 10) || today(),
    sourceWarehouseId: detail.sourceWarehouseId,
    destinationWarehouseId: detail.destinationWarehouseId || '',
    supplierId: (detail as any).supplierId || '',
    customerId: (detail as any).customerId || '',
    referenceNumber: detail.referenceNumber || '',
    notes: detail.notes || '',
  })
  lines.value = (detail.lines || []).map((l) => ({
    itemId: l.itemId, uomId: l.uomId, quantity: l.quantity, countedQuantity: l.countedQuantity || '', unitCost: l.unitCost || '0',
    batchId: l.batchId || '', batchCode: '', expiryDate: '', sourceBinId: l.sourceBinId || '', destinationBinId: l.destinationBinId || '',
    serialText: (l.serialNumbers || []).join(', '), description: l.description || '',
  }))
  if (!lines.value.length) lines.value = [blankLine()]
  showForm.value = true
  void loadCustomers()
  numberPreview.value = detail.documentNumber
}

function setLineItem(line: FormLine, itemId: string) {
  line.itemId = itemId
  line.uomId = opts.itemBaseUom.value[itemId] || ''
}

function buildBody() {
  if (!header.sourceWarehouseId) throw new Error('Select the source warehouse.')
  if (isTransfer.value && !header.destinationWarehouseId) throw new Error('Select the destination warehouse for a transfer.')
  if (isTransfer.value && header.destinationWarehouseId === header.sourceWarehouseId) throw new Error('Transfer warehouses must differ.')
  if (header.movementReason === 'purchase_receipt' && !header.supplierId) throw new Error('Select a supplier for a purchase receipt.')
  if ((header.movementReason === 'sales_issue' || header.movementReason === 'customer_return') && !header.customerId) throw new Error('Select a customer for this movement reason.')
  if (!lines.value.length) throw new Error('Add at least one line.')

  const body: Record<string, unknown> = {
    accountingUnitId: unitId.value,
    documentType: header.documentType,
    movementReason: header.movementReason,
    documentDate: header.documentDate,
    sourceWarehouseId: header.sourceWarehouseId,
    referenceNumber: header.referenceNumber.trim(),
    notes: header.notes.trim(),
    requestId: requestId.value,
  }
  if (isTransfer.value) body.destinationWarehouseId = header.destinationWarehouseId
  if (header.supplierId) body.supplierId = header.supplierId
  if (header.customerId) body.customerId = header.customerId

  body.lines = lines.value.map((line, index) => {
    const n = index + 1
    if (!line.itemId) throw new Error(`Line ${n}: select an item.`)
    if (!line.uomId) throw new Error(`Line ${n}: select a unit.`)
    const out: Record<string, unknown> = {
      itemId: line.itemId,
      uomId: line.uomId,
      unitCost: (line.unitCost || '0').trim(),
      batchCode: line.batchCode.trim(),
      description: line.description.trim(),
    }
    if (isCount.value) {
      if (!line.countedQuantity.trim()) throw new Error(`Line ${n}: enter the counted quantity.`)
      out.countedQuantity = line.countedQuantity.trim()
    } else {
      if (!line.quantity.trim()) throw new Error(`Line ${n}: enter a quantity.`)
      out.quantity = line.quantity.trim()
    }
    if (line.batchId) out.batchId = line.batchId
    if (line.expiryDate) out.expiryDate = line.expiryDate
    if (line.sourceBinId) out.sourceBinId = line.sourceBinId
    if (isTransfer.value && line.destinationBinId) out.destinationBinId = line.destinationBinId
    const serials = line.serialText.split(',').map((s) => s.trim()).filter(Boolean)
    if (serials.length) out.serialNumbers = serials
    return out
  })
  return body
}

async function saveDocument() {
  if (saving.value) return
  formError.value = ''
  saving.value = true
  try {
    const body = buildBody()
    if (editing.value) await api.documents.update(editing.value.id, { ...body, version: editing.value.version })
    else await api.documents.create(body)
    showForm.value = false
    await load()
  } catch (e: any) {
    formError.value = e instanceof Error && !(e as any).data ? e.message : message(e)
  } finally {
    saving.value = false
  }
}

const addLine = () => lines.value.push(blankLine())
const removeLine = (i: number) => { if (lines.value.length > 1) lines.value.splice(i, 1) }
</script>

<template>
  <section class="space-y-5">
    <PageHeader title="Stock documents" subtitle="Receipts, issues, transfers, adjustments and counts. Posting updates stock and the ledger." icon="document-text" />

    <div v-if="!unitId" class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Select an accounting unit to continue.</div>

    <div v-else class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <SelectInput v-model="filterType" :options="[{ value: '', label: 'All types' }, ...typeOptions]" class="max-w-[180px]" />
        <SelectInput v-model="filterStatus" :options="[{ value: '', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'approved', label: 'Approved' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'reversed', label: 'Reversed' }]" class="max-w-[180px]" />
        <span class="text-sm text-slate-500">{{ total }} document{{ total === 1 ? '' : 's' }}</span>
        <div class="ml-auto"><BaseButton icon="plus" @click="openCreate">New document</BaseButton></div>
      </div>

      <p v-if="listError" class="p-4 text-sm text-red-600">{{ listError }}</p>
      <p v-if="actionError" class="p-4 text-sm text-red-600">{{ actionError }}</p>

      <DataTable
        :columns="[{ key: 'documentNumber', label: 'Number' }, { key: 'documentType', label: 'Type' }, { key: 'movementReason', label: 'Reason' }, { key: 'documentDate', label: 'Date' }, { key: 'sourceWarehouse', label: 'Warehouse' }, { key: 'status', label: 'Status' }, { key: 'totalValue', label: 'Value', align: 'right' }, { key: '_actions', label: '', align: 'right' }]"
        :rows="docs"
        :loading="loading"
        empty="No stock documents yet."
      >
        <template #cell="{ col, row }">
          <div v-if="col.key === '_actions'" class="flex flex-wrap justify-end gap-2">
            <BaseButton v-if="row.status === 'draft'" size="sm" variant="ghost" @click="openEdit(row)">Edit</BaseButton>
            <BaseButton v-for="a in nextActions(row.status)" :key="a.action" size="sm" :variant="a.tone === 'danger' ? 'danger' : 'secondary'" :disabled="busyId === row.id" @click="startAction(row, a.action, a.label, a.reason)">{{ a.label }}</BaseButton>
          </div>
          <span v-else-if="col.key === 'status'" class="capitalize">{{ row.status }}</span>
          <span v-else-if="col.key === 'documentType' || col.key === 'movementReason'" class="capitalize">{{ String(row[col.key] ?? '').replace(/_/g, ' ') }}</span>
          <span v-else>{{ (row as any)[col.key] ?? '—' }}</span>
        </template>
      </DataTable>

      <div class="border-t border-slate-200 p-4 dark:border-slate-800"><Pagination v-model:page="page" :size="size" :total="total" /></div>
    </div>

    <ModalShell :open="showForm" :title="editing ? `Edit ${editing.documentNumber}` : `New stock document${numberPreview ? ` ${numberPreview}` : ''}`" width="max-w-4xl" @close="showForm = false">
      <form class="space-y-5" @submit.prevent="saveDocument">
        <div class="grid gap-4 sm:grid-cols-3">
          <FormField label="Document type" required>
            <SelectInput v-model="header.documentType" :options="typeOptions" :disabled="!!editing" />
          </FormField>
          <FormField label="Movement reason" required>
            <SelectInput v-model="header.movementReason" :options="reasonOptions(header.documentType)" />
          </FormField>
          <FormField label="Document date" required>
            <TextInput v-model="header.documentDate" type="date" />
          </FormField>
          <FormField label="Source warehouse" required>
            <SelectInput v-model="header.sourceWarehouseId" :options="opts.warehouses.value" placeholder="Select warehouse" />
          </FormField>
          <FormField v-if="isTransfer" label="Destination warehouse" required>
            <SelectInput v-model="header.destinationWarehouseId" :options="opts.warehouses.value" placeholder="Select warehouse" />
          </FormField>
          <FormField v-if="header.movementReason === 'purchase_receipt'" label="Supplier" required>
            <SelectInput v-model="header.supplierId" :options="opts.suppliers.value" placeholder="Select supplier" />
          </FormField>
          <FormField v-if="header.movementReason === 'sales_issue' || header.movementReason === 'customer_return'" label="Customer" required>
            <SelectInput v-model="header.customerId" :options="customers" placeholder="Select customer" />
          </FormField>
          <FormField label="Reference">
            <TextInput v-model="header.referenceNumber" />
          </FormField>
          <FormField label="Notes" class="sm:col-span-3">
            <TextInput v-model="header.notes" />
          </FormField>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Lines</h3>
            <BaseButton size="sm" variant="secondary" icon="plus" @click="addLine">Add line</BaseButton>
          </div>
          <div v-for="(line, i) in lines" :key="i" class="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-6 dark:border-slate-800">
            <FormField label="Item" required class="sm:col-span-2"><SelectInput :model-value="line.itemId" :options="opts.items.value" placeholder="Select item" @update:model-value="(v: string) => setLineItem(line, v)" /></FormField>
            <FormField label="Unit" required><SelectInput v-model="line.uomId" :options="opts.uoms.value" placeholder="Unit" /></FormField>
            <FormField v-if="!isCount" label="Quantity" required><TextInput v-model="line.quantity" type="number" step="any" /></FormField>
            <FormField v-else label="Counted qty" required><TextInput v-model="line.countedQuantity" type="number" step="any" /></FormField>
            <FormField label="Unit cost"><TextInput v-model="line.unitCost" type="number" step="any" /></FormField>
            <FormField label="Batch code" hint="New batch, or leave blank when a batch is selected"><TextInput v-model="line.batchCode" /></FormField>
            <FormField label="Expiry"><TextInput v-model="line.expiryDate" type="date" /></FormField>
            <FormField label="Source bin"><SelectInput v-model="line.sourceBinId" :options="opts.bins.value" placeholder="None" /></FormField>
            <FormField v-if="isTransfer" label="Destination bin"><SelectInput v-model="line.destinationBinId" :options="opts.bins.value" placeholder="None" /></FormField>
            <FormField label="Serial numbers" hint="Comma separated" class="sm:col-span-2"><TextInput v-model="line.serialText" /></FormField>
            <FormField label="Description" class="sm:col-span-3"><TextInput v-model="line.description" /></FormField>
            <div class="flex items-end justify-end sm:col-span-1">
              <BaseButton size="sm" variant="ghost" :disabled="lines.length < 2" @click="removeLine(i)">Remove</BaseButton>
            </div>
          </div>
        </div>

        <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="showForm = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save draft' }}</BaseButton>
        </div>
      </form>
    </ModalShell>

    <ModalShell :open="!!reasonFor" :title="`${reasonFor?.label ?? ''} ${reasonFor?.doc.documentNumber ?? ''}`" @close="reasonFor = null">
      <form class="space-y-4" @submit.prevent="confirmReason">
        <FormField label="Reason" required><TextInput v-model="reasonText" /></FormField>
        <div class="flex justify-end gap-2">
          <BaseButton variant="secondary" @click="reasonFor = null">Back</BaseButton>
          <BaseButton type="submit" variant="danger" :disabled="!reasonText.trim()">{{ reasonFor?.label }}</BaseButton>
        </div>
      </form>
    </ModalShell>
  </section>
</template>
