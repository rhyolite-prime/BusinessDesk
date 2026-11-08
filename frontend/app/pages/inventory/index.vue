<script setup lang="ts">
import { useInventory } from '../../features/inventory/useInventory'
import {
  emptyDashboard,
  type BalanceRecord,
  type InventoryDashboard,
  type ItemRecord,
  type StockDocument,
  type UomRecord,
  type CategoryRecord,
  type WarehouseRecord,
  type DocumentLine,
} from '../../features/inventory/inventory-types'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Inventory' })

const api = useInventory()
const { unitId } = api
const message = (e: any) => e?.data?.statusMessage || e?.statusMessage || 'Request failed. Please retry.'

interface Unit { id: string; code: string; name: string; baseCurrencyId: string }
const units = ref<Unit[]>([])
const dash = ref<InventoryDashboard>(emptyDashboard())
const loadingUnits = ref(true)
const loadingDash = ref(false)
const topError = ref('')
const tab = ref<'items' | 'documents' | 'balances' | 'warehouses'>('items')
const tabs = computed(() => [
  { key: 'items', label: 'Items', count: itemTotal.value },
  { key: 'documents', label: 'Stock documents', count: docTotal.value },
  { key: 'balances', label: 'Stock balances' },
  { key: 'warehouses', label: 'Warehouses', count: whTotal.value },
])
const activeUnit = computed(() => units.value.find((u) => u.id === unitId.value))

/* ---------------------------------- items --------------------------------- */
const items = ref<ItemRecord[]>([])
const itemTotal = ref(0)
const itemPage = ref(1)
const itemSize = 20
const itemQuery = ref('')
const itemLoading = ref(false)
const itemError = ref('')
const itemOptions = ref<CategoryRecord[]>([]) // categories
const uoms = ref<UomRecord[]>([])
const showItemForm = ref(false)
const editingItem = ref<ItemRecord | null>(null)
const itemSaving = ref(false)
const itemFormError = ref('')
const itemForm = reactive({
  itemCode: '',
  name: '',
  itemType: 'stock',
  itemCategoryId: '',
  baseUomId: '',
  trackingMethod: 'none',
  valuationMethod: 'weighted_average',
  description: '',
  isPurchasable: true,
  isActive: true,
})
const deleteTarget = ref<{ kind: 'item' | 'warehouse' | 'document'; id: string; version: number; label: string } | null>(null)
const deleteError = ref('')
const deleteBusy = ref(false)

async function loadItems() {
  if (!unitId.value) return
  itemLoading.value = true
  itemError.value = ''
  try {
    const r = await api.items.list(unitId.value, itemQuery.value, itemPage.value, itemSize)
    items.value = r.items
    itemTotal.value = r.total
  } catch (e) {
    items.value = []
    itemError.value = message(e)
  } finally {
    itemLoading.value = false
  }
}
async function loadItemOptions() {
  if (!unitId.value) return
  try {
    const [cats, uomRows] = await Promise.all([api.categories.list(), api.uoms.list()])
    itemOptions.value = cats.items.filter((c) => c.isActive !== false)
    uoms.value = uomRows.items.filter((u) => u.isActive !== false)
    if (!itemForm.baseUomId && uoms.value.length) itemForm.baseUomId = uoms.value[0].id
  } catch {
    /* picker lists optional; the item form still validates server-side */
  }
}
function openItemCreate() {
  editingItem.value = null
  itemFormError.value = ''
  Object.assign(itemForm, {
    itemCode: '', name: '', itemType: 'stock', itemCategoryId: '', baseUomId: uoms.value.find((u) => u.isBase)?.id || uoms.value[0]?.id || '',
    trackingMethod: 'none', valuationMethod: 'weighted_average', description: '', isPurchasable: true, isActive: true,
  })
  showItemForm.value = true
}
async function openItemEdit(item: ItemRecord) {
  const detail = await api.items.get(item.id).catch((e) => (itemError.value = message(e), null))
  if (!detail) return
  editingItem.value = detail
  itemFormError.value = ''
  const row = detail as ItemRecord & { description?: string; itemType?: string; itemCategoryId?: string; status?: string }
  Object.assign(itemForm, {
    itemCode: row.itemCode, name: row.name, itemType: row.itemType || 'stock', itemCategoryId: row.itemCategoryId || '',
    baseUomId: row.baseUomId || '', trackingMethod: row.trackingMethod || 'none', valuationMethod: row.valuationMethod || 'weighted_average',
    description: row.description || '', isPurchasable: row.isPurchasable !== false, isActive: row.status !== 'inactive',
  })
  showItemForm.value = true
}
async function saveItem() {
  if (itemSaving.value) return
  const unit = activeUnit.value
  if (!unit || !unit.baseCurrencyId) {
    itemFormError.value = 'Select an accounting unit with a base currency first.'
    return
  }
  itemSaving.value = true
  itemFormError.value = ''
  try {
    const body: Record<string, unknown> = {
      accountingUnitId: unit.id,
      itemCode: itemForm.itemCode.trim(),
      name: itemForm.name.trim(),
      itemType: itemForm.itemType,
      baseUomId: itemForm.baseUomId,
      trackingMethod: itemForm.trackingMethod,
      valuationMethod: itemForm.valuationMethod,
      currencyId: unit.baseCurrencyId,
      isPurchasable: itemForm.isPurchasable,
      isActive: itemForm.isActive,
    }
    if (itemForm.itemCategoryId) body.itemCategoryId = itemForm.itemCategoryId
    if (itemForm.description.trim()) body.description = itemForm.description.trim()
    if (editingItem.value) await api.items.update(editingItem.value.id, body)
    else await api.items.create({ ...body, requestKey: crypto.randomUUID() })
    showItemForm.value = false
    await loadItems()
  } catch (e) {
    itemFormError.value = message(e)
  } finally {
    itemSaving.value = false
  }
}

/* -------------------------------- warehouses ------------------------------- */
const whRows = ref<WarehouseRecord[]>([])
const whTotal = ref(0)
const whLoading = ref(false)
const whError = ref('')
const showWhForm = ref(false)
const editingWh = ref<WarehouseRecord | null>(null)
const whSaving = ref(false)
const whFormError = ref('')
const whForm = reactive({ code: '', name: '', warehouseType: 'physical', address: '', isActive: true, allowNegativeStock: false })
async function loadWarehouses() {
  if (!unitId.value) return
  whLoading.value = true
  whError.value = ''
  try {
    const r = await api.warehouses.list(unitId.value)
    whRows.value = r.items
    whTotal.value = r.total
  } catch (e) {
    whRows.value = []
    whError.value = message(e)
  } finally {
    whLoading.value = false
  }
}
function openWhCreate() {
  editingWh.value = null
  whFormError.value = ''
  Object.assign(whForm, { code: '', name: '', warehouseType: 'physical', address: '', isActive: true, allowNegativeStock: false })
  showWhForm.value = true
}
function openWhEdit(row: WarehouseRecord) {
  editingWh.value = row
  whFormError.value = ''
  Object.assign(whForm, {
    code: row.code, name: row.name, warehouseType: row.warehouseType || 'physical',
    address: row.address || '', isActive: row.isActive !== false, allowNegativeStock: !!row.allowNegativeStock,
  })
  showWhForm.value = true
}
async function saveWarehouse() {
  if (whSaving.value || !unitId.value) return
  whSaving.value = true
  whFormError.value = ''
  try {
    const body: Record<string, unknown> = {
      accountingUnitId: unitId.value,
      code: whForm.code.trim(),
      name: whForm.name.trim(),
      warehouseType: whForm.warehouseType,
      isActive: whForm.isActive,
      allowNegativeStock: whForm.allowNegativeStock,
    }
    if (whForm.address.trim()) body.address = whForm.address.trim()
    if (editingWh.value) await api.warehouses.update(editingWh.value.id, body)
    else await api.warehouses.create({ ...body, requestKey: crypto.randomUUID() })
    showWhForm.value = false
    await loadWarehouses()
  } catch (e) {
    whFormError.value = message(e)
  } finally {
    whSaving.value = false
  }
}

/* --------------------------------- balances -------------------------------- */
const balances = ref<BalanceRecord[]>([])
const balanceTotal = ref(0)
const balancePage = ref(1)
const balanceLoading = ref(false)
const balanceError = ref('')
async function loadBalances() {
  if (!unitId.value) return
  balanceLoading.value = true
  balanceError.value = ''
  try {
    const r = await api.balances.list(unitId.value, {}, balancePage.value)
    balances.value = r.items
    balanceTotal.value = r.total
  } catch (e) {
    balances.value = []
    balanceError.value = message(e)
  } finally {
    balanceLoading.value = false
  }
}

/* --------------------------------- documents ------------------------------- */
const docReasons: Record<string, { value: string; label: string }[]> = {
  receipt: [
    { value: 'purchase_receipt', label: 'Purchase receipt' },
    { value: 'opening_balance', label: 'Opening balance' },
    { value: 'customer_return', label: 'Customer return' },
    { value: 'production_receipt', label: 'Production receipt' },
    { value: 'adjustment_in', label: 'Adjustment (in)' },
  ],
  issue: [
    { value: 'sales_issue', label: 'Sales issue' },
    { value: 'operational_issue', label: 'Operational issue' },
    { value: 'supplier_return', label: 'Supplier return' },
    { value: 'production_consumption', label: 'Production consumption' },
    { value: 'adjustment_out', label: 'Adjustment (out)' },
  ],
  transfer: [{ value: 'transfer', label: 'Transfer' }],
  adjustment: [
    { value: 'adjustment_in', label: 'Adjustment (in)' },
    { value: 'adjustment_out', label: 'Adjustment (out)' },
  ],
  count: [{ value: 'stock_count', label: 'Stock count' }],
}
const docStatusChip = (status: string) => ({
  draft: 'bg-canvas text-ink-faint',
  submitted: 'bg-amber-50 text-amber-700',
  approved: 'bg-primary-soft text-primary',
  posted: 'bg-emerald-50 text-emerald-700',
  reversed: 'bg-purple-soft text-purple-600',
  cancelled: 'bg-rose-50 text-rose-600',
  rejected: 'bg-rose-50 text-rose-600',
}[status] || 'bg-canvas text-ink-faint')
const docs = ref<StockDocument[]>([])
const docTotal = ref(0)
const docPage = ref(1)
const docType = ref('')
const docStatus = ref('')
const docLoading = ref(false)
const docError = ref('')
async function loadDocs() {
  if (!unitId.value) return
  docLoading.value = true
  docError.value = ''
  try {
    const r = await api.documents.list(
      unitId.value,
      { documentType: docType.value || undefined, status: docStatus.value || undefined },
      docPage.value,
    )
    docs.value = r.items
    docTotal.value = r.total
  } catch (e) {
    docs.value = []
    docError.value = message(e)
  } finally {
    docLoading.value = false
  }
}

/* Document create wizard */
const showDocForm = ref(false)
const docSaving = ref(false)
const docFormError = ref('')
const docForm = reactive({
  documentType: 'receipt',
  movementReason: 'purchase_receipt',
  documentDate: new Date().toISOString().slice(0, 10),
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  referenceNumber: '',
  notes: '',
  number: '',
})
const docLines = ref<DocumentLine[]>([])
const pickerItems = ref<ItemRecord[]>([])
watch(() => docForm.documentType, (type) => {
  const first = docReasons[type]?.[0]?.value || ''
  docForm.movementReason = first
  if (unitId.value && showDocForm.value) void previewNumber(type)
})
async function previewNumber(type: string) {
  try {
    docForm.number = (await api.documents.nextNumber(unitId.value, type)).number
  } catch {
    docForm.number = 'Assigned on save'
  }
}
function addDocLine() {
  const item = pickerItems.value[0]
  if (!item) return
  docLines.value.push({
    itemId: item.id,
    uomId: item.baseUomId || '',
    quantity: '1',
    unitCost: null,
    description: '',
    lineNumber: docLines.value.length + 1,
    quantityBase: '',
    serialNumbers: [],
  })
}
async function openDocCreate() {
  if (!unitId.value) return
  docFormError.value = ''
  docLines.value = []
  try {
    const r = await api.items.list(unitId.value, '', 1, 100)
    pickerItems.value = r.items.filter((i) => (i.status || 'active') === 'active' && i.isPurchasable !== false)
  } catch (e) {
    docFormError.value = message(e)
    return
  }
  Object.assign(docForm, {
    documentType: 'receipt', movementReason: 'purchase_receipt',
    documentDate: new Date().toISOString().slice(0, 10),
    sourceWarehouseId: whRows.value[0]?.id || '',
    destinationWarehouseId: '', referenceNumber: '', notes: '', number: '',
  })
  showDocForm.value = true
  await previewNumber('receipt')
  addDocLine()
}
function setDocLineItem(line: DocumentLine, itemId: string) {
  line.itemId = itemId
  const item = pickerItems.value.find((i) => i.id === itemId)
  if (item) line.uomId = item.baseUomId || ''
}
function lineSerials(line: DocumentLine): string {
  return (line.serialNumbers || []).join(', ')
}
function setLineSerials(line: DocumentLine, value: string) {
  line.serialNumbers = value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500)
}
function lineIsSerial(line: DocumentLine): boolean {
  return pickerItems.value.find((i) => i.id === line.itemId)?.trackingMethod === 'serial'
}
async function saveDocument() {
  if (docSaving.value || !unitId.value || !activeUnit.value) return
  docFormError.value = ''
  if (!docLines.value.length) {
    docFormError.value = 'Add at least one line.'
    return
  }
  for (const [index, line] of docLines.value.entries()) {
    const qty = Number(line.quantity)
    if (!line.itemId || !Number.isFinite(qty) || qty <= 0) {
      docFormError.value = `Line ${index + 1}: enter an item and a quantity above zero.`
      return
    }
    const item = pickerItems.value.find((i) => i.id === line.itemId)
    if (item?.trackingMethod === 'serial' && (line.serialNumbers || []).length !== qty) {
      docFormError.value = `Line ${index + 1}: serial-tracked items need exactly ${qty} serial numbers.`
      return
    }
  }
  if (docForm.documentType === 'transfer' && (!docForm.destinationWarehouseId || docForm.destinationWarehouseId === docForm.sourceWarehouseId)) {
    docFormError.value = 'Transfers need a different destination warehouse.'
    return
  }
  docSaving.value = true
  try {
    const type = docForm.documentType
    const body: Record<string, unknown> = {
      accountingUnitId: unitId.value,
      documentType: type,
      movementReason: docForm.movementReason,
      documentDate: docForm.documentDate,
      currencyId: activeUnit.value.baseCurrencyId,
      requestKey: crypto.randomUUID(),
      referenceNumber: docForm.referenceNumber.trim(),
      notes: docForm.notes.trim(),
      lines: docLines.value.map((line, index) => ({
        lineNumber: index + 1,
        itemId: line.itemId,
        uomId: line.uomId,
        quantity: String(line.quantity).trim(),
        ...(line.unitCost && Number(line.unitCost) > 0 ? { unitCost: String(line.unitCost).trim() } : {}),
        ...(line.description?.trim() ? { description: line.description.trim() } : {}),
        ...((line.serialNumbers || []).length ? { serialNumbers: line.serialNumbers } : {}),
      })),
    }
    if (type === 'transfer') {
      body.sourceWarehouseId = docForm.sourceWarehouseId
      body.destinationWarehouseId = docForm.destinationWarehouseId
    } else if (type === 'adjustment') {
      body.adjustmentWarehouseId = docForm.sourceWarehouseId
    } else if (type === 'count') {
      body.warehouseId = docForm.sourceWarehouseId
    } else {
      body.sourceWarehouseId = docForm.sourceWarehouseId
    }
    await api.documents.create(body)
    showDocForm.value = false
    docPage.value = 1
    await loadDocs()
  } catch (e) {
    docFormError.value = message(e)
  } finally {
    docSaving.value = false
  }
}

/* Document detail + workflow actions */
const showDocDetail = ref(false)
const docDetail = ref<StockDocument | null>(null)
const docDetailLoading = ref(false)
const docActionBusy = ref(false)
const docActionError = ref('')
const reasonPrompt = ref<{ action: 'reject' | 'cancel'; label: string } | null>(null)
const reasonText = ref('')
async function openDocDetail(doc: StockDocument) {
  showDocDetail.value = true
  docDetailLoading.value = true
  docDetail.value = doc
  docActionError.value = ''
  try {
    docDetail.value = await api.documents.get(doc.id)
  } catch (e) {
    docActionError.value = message(e)
  } finally {
    docDetailLoading.value = false
  }
}
const docActions = computed(() => {
  const d = docDetail.value
  if (!d) return [] as { key: string; label: string; variant: 'primary' | 'secondary' | 'danger' | 'success' }[]
  switch (d.status) {
    case 'draft':
      return [
        { key: 'submit', label: 'Submit for approval', variant: 'primary' as const },
        { key: 'cancel', label: 'Cancel', variant: 'danger' as const },
      ]
    case 'submitted':
      return [
        { key: 'approve', label: 'Approve', variant: 'success' as const },
        { key: 'reject', label: 'Reject', variant: 'danger' as const },
      ]
    case 'approved':
      return [
        { key: 'post', label: 'Post to stock ledger', variant: 'primary' as const },
        { key: 'cancel', label: 'Cancel', variant: 'danger' as const },
      ]
    case 'posted':
      return [{ key: 'reverse', label: 'Reverse this document', variant: 'danger' as const }]
    default:
      return []
  }
})
async function runDocAction(action: string) {
  const d = docDetail.value
  if (!d || docActionBusy.value) return
  docActionBusy.value = true
  docActionError.value = ''
  try {
    const body: Record<string, unknown> = {}
    if (action === 'reject' || action === 'cancel') body.reason = reasonText.value.trim()
    await api.documents.action(d.id, action, body)
    reasonPrompt.value = null
    reasonText.value = ''
    docDetail.value = await api.documents.get(d.id)
    await loadDocs()
  } catch (e) {
    docActionError.value = message(e)
  } finally {
    docActionBusy.value = false
  }
}
function confirmDocAction(action: string) {
  docActionError.value = ''
  if (action === 'reject' || action === 'cancel') {
    reasonPrompt.value = { action, label: action === 'reject' ? 'Reject document' : 'Cancel document' }
    reasonText.value = ''
    return
  }
  void runDocAction(action)
}

/* ---------------------------------- deletes -------------------------------- */
async function runDelete() {
  if (!deleteTarget.value || deleteBusy.value) return
  const target = deleteTarget.value
  deleteBusy.value = true
  deleteError.value = ''
  try {
    if (target.kind === 'item') await api.items.remove(target.id, target.version)
    else if (target.kind === 'warehouse') await api.warehouses.remove(target.id, target.version)
    else await api.documents.remove(target.id, target.version)
    deleteTarget.value = null
    if (target.kind === 'document') {
      showDocDetail.value = false
      await loadDocs()
    } else if (target.kind === 'item') await loadItems()
    else await loadWarehouses()
  } catch (e) {
    deleteError.value = message(e)
  } finally {
    deleteBusy.value = false
  }
}

/* --------------------------------- bootstraps ------------------------------- */
async function loadDashboard() {
  if (!unitId.value) return
  loadingDash.value = true
  try {
    dash.value = await api.dashboard()
  } catch (e) {
    topError.value = message(e)
  } finally {
    loadingDash.value = false
  }
}
function loadTab() {
  if (!unitId.value) return
  if (tab.value === 'items') void loadItems()
  if (tab.value === 'warehouses') void loadWarehouses()
  if (tab.value === 'balances') void loadBalances()
  if (tab.value === 'documents') void loadDocs()
}
watch(unitId, () => { loadDashboard(); loadTab(); void loadItemOptions() })
watch(tab, loadTab)
watch(itemPage, () => { if (tab.value === 'items') void loadItems() })
watch(itemQuery, () => { itemPage.value = 1; void loadItems() })
watch(balancePage, () => { if (tab.value === 'balances') void loadBalances() })
watch(docPage, () => { if (tab.value === 'documents') void loadDocs() })
watch([docType, docStatus], () => { docPage.value = 1; void loadDocs() })
onMounted(async () => {
  try {
    units.value = (await api.units()) as Unit[]
    if (!unitId.value && units.value.length) unitId.value = units.value[0].id
    if (unitId.value) { loadDashboard(); loadTab(); void loadItemOptions() }
  } catch (e) {
    topError.value = message(e)
  } finally {
    loadingUnits.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Inventory" subtitle="Items, warehouses, stock balances and movement documents">
      <SelectInput
        v-model="unitId"
        :options="units.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` }))"
        placeholder="Select accounting unit"
        class="min-w-[220px]"
      />
      <BaseButton v-if="tab === 'items'" icon="plus" :disabled="!unitId" @click="openItemCreate">New item</BaseButton>
      <BaseButton v-else-if="tab === 'warehouses'" icon="plus" :disabled="!unitId" @click="openWhCreate">New warehouse</BaseButton>
      <BaseButton v-else-if="tab === 'documents'" icon="plus" :disabled="!unitId" @click="openDocCreate">New stock document</BaseButton>
    </PageHeader>

    <p v-if="topError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ topError }}</p>
    <p v-if="!loadingUnits && !units.length" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
      Inventory needs at least one accounting unit. Create one under General Ledger → Accounting Units first.
    </p>

    <div v-if="unitId" class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard :loading="loadingDash" label="Active items" :value="dash.items?.active ?? '—'" icon="cube" hint="Purchasable & service" />
      <StatCard :loading="loadingDash" label="Active warehouses" :value="dash.warehouses?.active ?? '—'" icon="building-office" hint="In this unit" />
      <StatCard :loading="loadingDash" label="Stock value" :value="formatDecimalAmount(dash.stockValue?.totalValue ?? '0')" icon="banknotes" hint="Current on hand value" />
      <StatCard :loading="loadingDash" label="Stock on hand" :value="formatDecimalAmount(dash.stockValue?.stockOnHand ?? '0')" icon="scale" hint="Total base quantity" />
      <StatCard :loading="loadingDash" label="Open documents" :value="dash.openDocuments?.count ?? '—'" icon="document-text" hint="Draft · submitted · approved" />
      <StatCard :loading="loadingDash" label="Low stock alerts" :value="dash.lowStock?.count ?? '—'" icon="exclamation-triangle" hint="Below reorder point" />
    </div>

    <Tabs v-model="tab" :tabs="tabs" />

    <!-- Items -->
    <section v-if="tab === 'items'" class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <TextInput v-model="itemQuery" placeholder="Search item code, name or barcode…" class="w-72" />
        <span class="text-xs text-ink-faint">{{ itemTotal }} items</span>
      </div>
      <p v-if="itemError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ itemError }}</p>
      <DataTable
        :columns="[
          { key: 'itemCode', label: 'Code' },
          { key: 'name', label: 'Item' },
          { key: 'categoryName', label: 'Category' },
          { key: 'baseUom', label: 'UOM' },
          { key: 'trackingMethod', label: 'Tracking' },
          { key: 'valuationMethod', label: 'Valuation' },
          { key: 'onHand', label: 'On hand', align: 'right' },
          { key: 'averageUnitCost', label: 'Avg cost', align: 'right' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: '', align: 'right' },
        ]"
        :rows="(items) as any[]"
        :loading="itemLoading"
        empty="No items yet — create your first stock item."
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'name'"><span class="font-medium text-ink">{{ row.name }}</span></template>
          <template v-else-if="col.key === 'trackingMethod'">{{ ({ none: 'None', batch: 'Batch', serial: 'Serial' } as Record<string, string>)[row.trackingMethod] || row.trackingMethod || 'None' }}</template>
          <template v-else-if="col.key === 'valuationMethod'">{{ ({ weighted_average: 'Weighted average', fifo: 'FIFO', standard: 'Standard' } as Record<string, string>)[row.valuationMethod] || row.valuationMethod }}</template>
          <template v-else-if="col.key === 'onHand'">{{ formatDecimalAmount(row.onHand ?? '0') }}</template>
          <template v-else-if="col.key === 'averageUnitCost'">{{ formatDecimalAmount(row.averageUnitCost ?? '0') }}</template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="(row.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas text-ink-faint'">{{ (row.status || 'active') === 'active' ? 'Active' : 'Inactive' }}</span>
          </template>
          <template v-else-if="col.key === 'actions'">
            <button class="mr-1 rounded-lg p-2 text-ink-faint hover:bg-canvas" aria-label="Edit item" @click="openItemEdit(row)"><AppIcon name="pencil-square" :size="15" /></button>
            <button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete item" @click="deleteError = ''; deleteTarget = { kind: 'item', id: row.id, version: row.version || 1, label: `${row.itemCode} — ${row.name}` }"><AppIcon name="x-mark" :size="15" /></button>
          </template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
      <div class="border-t border-line p-4"><Pagination v-model:page="itemPage" :size="itemSize" :total="itemTotal" /></div>
    </section>

    <!-- Documents -->
    <section v-else-if="tab === 'documents'" class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SelectInput v-model="docType" :options="[{ value: '', label: 'All types' }, { value: 'receipt', label: 'Receipts' }, { value: 'issue', label: 'Issues' }, { value: 'transfer', label: 'Transfers' }, { value: 'adjustment', label: 'Adjustments' }, { value: 'count', label: 'Stock counts' }]" class="w-44" />
        <SelectInput v-model="docStatus" :options="[{ value: '', label: 'All statuses' }, ...['draft', 'submitted', 'approved', 'posted', 'reversed', 'rejected', 'cancelled'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]" class="w-40" />
        <span class="text-xs text-ink-faint">{{ docTotal }} documents</span>
      </div>
      <p v-if="docError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ docError }}</p>
      <DataTable
        :columns="[
          { key: 'documentNumber', label: 'Number' },
          { key: 'documentType', label: 'Type' },
          { key: 'movementReason', label: 'Reason' },
          { key: 'documentDate', label: 'Date' },
          { key: 'sourceWarehouse', label: 'Warehouse' },
          { key: 'totalQuantity', label: 'Quantity', align: 'right' },
          { key: 'totalValue', label: 'Value', align: 'right' },
          { key: 'status', label: 'Status' },
        ]"
        :rows="(docs) as any[]"
        :loading="docLoading"
        empty="No stock documents match these filters."
        @row-click="openDocDetail"
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'documentNumber'"><span class="font-medium text-ink">{{ row.documentNumber }}</span></template>
          <template v-else-if="col.key === 'documentType'" ><span class="capitalize">{{ row.documentType }}</span></template>
          <template v-else-if="col.key === 'movementReason'"><span class="text-ink-faint">{{ (row.movementReason || '').replaceAll('_', ' ') }}</span></template>
          <template v-else-if="col.key === 'sourceWarehouse'">{{ row.sourceWarehouse || '—' }}</template>
          <template v-else-if="col.key === 'totalQuantity'">{{ formatDecimalAmount(row.totalQuantity ?? '0') }}</template>
          <template v-else-if="col.key === 'totalValue'">{{ formatDecimalAmount(row.totalValue ?? '0') }}</template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="docStatusChip(row.status)">{{ row.status }}</span>
          </template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
      <div class="border-t border-line p-4"><Pagination v-model:page="docPage" :size="20" :total="docTotal" /></div>
    </section>

    <!-- Balances -->
    <section v-else-if="tab === 'balances'" class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex items-center justify-between gap-3 border-b border-line p-4">
        <h2 class="text-sm font-semibold text-ink">Current on-hand balances (this unit's warehouses)</h2>
        <span class="text-xs text-ink-faint">{{ balanceTotal }} scopes</span>
      </div>
      <p v-if="balanceError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ balanceError }}</p>
      <DataTable
        :columns="[
          { key: 'itemCode', label: 'Item' },
          { key: 'warehouseName', label: 'Warehouse' },
          { key: 'batchNumber', label: 'Batch' },
          { key: 'quantityOnHand', label: 'On hand', align: 'right' },
          { key: 'available', label: 'Available', align: 'right' },
          { key: 'averageUnitCost', label: 'Avg cost', align: 'right' },
          { key: 'stockValue', label: 'Value', align: 'right' },
        ]"
        :rows="(balances) as any[]"
        :loading="balanceLoading"
        empty="No stock on hand yet — post a receipt to start."
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'itemCode'"><span class="font-medium text-ink">{{ row.itemCode }}</span> <span class="text-ink-faint">{{ row.itemName }}</span></template>
          <template v-else-if="col.key === 'batchNumber'">{{ row.batchNumber || '—' }}</template>
          <template v-else-if="['quantityOnHand', 'available', 'averageUnitCost', 'stockValue'].includes(col.key)">{{ formatDecimalAmount(row[col.key] ?? '0') }}</template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
      <div class="border-t border-line p-4"><Pagination v-model:page="balancePage" :size="50" :total="balanceTotal" /></div>
    </section>

    <!-- Warehouses -->
    <section v-else class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex items-center justify-between gap-3 border-b border-line p-4">
        <h2 class="text-sm font-semibold text-ink">Warehouses in this accounting unit</h2>
        <span class="text-xs text-ink-faint">{{ whTotal }} warehouses</span>
      </div>
      <p v-if="whError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ whError }}</p>
      <DataTable
        :columns="[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'warehouseType', label: 'Type' },
          { key: 'allowNegativeStock', label: 'Negative stock' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: '', align: 'right' },
        ]"
        :rows="(whRows) as any[]"
        :loading="whLoading"
        empty="No warehouses yet — create one to start moving stock."
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'name'"><span class="font-medium text-ink">{{ row.name }}</span></template>
          <template v-else-if="col.key === 'warehouseType'"><span class="capitalize">{{ row.warehouseType || 'physical' }}</span></template>
          <template v-else-if="col.key === 'allowNegativeStock'">{{ row.allowNegativeStock ? 'Allowed' : 'Blocked' }}</template>
          <template v-else-if="col.key === 'status'">
            <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="row.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas text-ink-faint'">{{ row.isActive !== false ? 'Active' : 'Inactive' }}</span>
          </template>
          <template v-else-if="col.key === 'actions'">
            <button class="mr-1 rounded-lg p-2 text-ink-faint hover:bg-canvas" aria-label="Edit warehouse" @click="openWhEdit(row)"><AppIcon name="pencil-square" :size="15" /></button>
            <button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete warehouse" @click="deleteError = ''; deleteTarget = { kind: 'warehouse', id: row.id, version: row.version || 1, label: `${row.code} — ${row.name}` }"><AppIcon name="x-mark" :size="15" /></button>
          </template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
    </section>

    <!-- Item form -->
    <ModalShell :open="showItemForm" :title="editingItem ? 'Edit item' : 'New item'" width="max-w-2xl" @close="!itemSaving && (showItemForm = false)">
      <form @submit.prevent="saveItem">
        <fieldset :disabled="itemSaving" class="grid gap-4 sm:grid-cols-2">
          <FormField label="Item code" required><TextInput v-model="itemForm.itemCode" placeholder="SKU-001" /></FormField>
          <FormField label="Name" required><TextInput v-model="itemForm.name" placeholder="Widget" /></FormField>
          <FormField label="Category"><SelectInput v-model="itemForm.itemCategoryId" :options="[{ value: '', label: 'Uncategorized' }, ...itemOptions.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]" /></FormField>
          <FormField label="Base UOM" required><SelectInput v-model="itemForm.baseUomId" :options="uoms.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` }))" placeholder="Select UOM" /></FormField>
          <FormField label="Item type" required><SelectInput v-model="itemForm.itemType" :options="['stock', 'non_stock', 'service', 'kit'].map((v) => ({ value: v, label: v.replace('_', ' ') }))" /></FormField>
          <FormField label="Tracking" required><SelectInput v-model="itemForm.trackingMethod" :options="[{ value: 'none', label: 'Not tracked' }, { value: 'batch', label: 'Batch / lot' }, { value: 'serial', label: 'Serial numbers' }]" /></FormField>
          <FormField label="Valuation method" required><SelectInput v-model="itemForm.valuationMethod" :options="[{ value: 'weighted_average', label: 'Weighted average' }, { value: 'fifo', label: 'FIFO (first in, first out)' }, { value: 'standard', label: 'Standard cost' }]" /></FormField>
          <FormField label="Purchasing"><SelectInput :model-value="itemForm.isPurchasable ? 'yes' : 'no'" :options="[{ value: 'yes', label: 'Purchasable' }, { value: 'no', label: 'Not purchasable' }]" @update:model-value="itemForm.isPurchasable = $event === 'yes'" /></FormField>
          <p v-if="itemFormError" role="alert" class="sm:col-span-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ itemFormError }}</p>
          <footer class="sm:col-span-2 flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showItemForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="itemSaving || !itemForm.baseUomId">{{ itemSaving ? 'Saving…' : editingItem ? 'Save changes' : 'Create item' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Warehouse form -->
    <ModalShell :open="showWhForm" :title="editingWh ? 'Edit warehouse' : 'New warehouse'" @close="!whSaving && (showWhForm = false)">
      <form @submit.prevent="saveWarehouse">
        <fieldset :disabled="whSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Code" required><TextInput v-model="whForm.code" placeholder="MAIN" /></FormField>
            <FormField label="Name" required><TextInput v-model="whForm.name" placeholder="Main store" /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" required><SelectInput v-model="whForm.warehouseType" :options="['physical', 'transit', 'quarantine', 'virtual'].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))" /></FormField>
            <FormField label="Address"><TextInput v-model="whForm.address" placeholder="Optional location" /></FormField>
          </div>
          <div class="flex flex-wrap gap-6">
            <label class="flex items-center gap-2 text-sm"><input v-model="whForm.isActive" type="checkbox" class="h-4 w-4 rounded border-line" /> Active</label>
            <label class="flex items-center gap-2 text-sm"><input v-model="whForm.allowNegativeStock" type="checkbox" class="h-4 w-4 rounded border-line" /> Allow negative stock</label>
          </div>
          <p v-if="whFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ whFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showWhForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="whSaving">{{ whSaving ? 'Saving…' : editingWh ? 'Save changes' : 'Create warehouse' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Document wizard -->
    <ModalShell :open="showDocForm" title="New stock document" width="max-w-3xl" @close="!docSaving && (showDocForm = false)">
      <form @submit.prevent="saveDocument">
        <fieldset :disabled="docSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField label="Document type" required>
              <SelectInput v-model="docForm.documentType" :options="[{ value: 'receipt', label: 'Receipt (stock in)' }, { value: 'issue', label: 'Issue (stock out)' }, { value: 'transfer', label: 'Warehouse transfer' }, { value: 'adjustment', label: 'Adjustment' }, { value: 'count', label: 'Stock count' }]" />
            </FormField>
            <FormField label="Movement reason" required>
              <SelectInput v-model="docForm.movementReason" :options="docReasons[docForm.documentType] || []" />
            </FormField>
            <FormField label="Document date" required><TextInput v-model="docForm.documentDate" type="date" /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField :label="docForm.documentType === 'transfer' ? 'Source warehouse' : 'Warehouse'" required>
              <SelectInput v-model="docForm.sourceWarehouseId" :options="whRows.filter((w) => w.isActive !== false).map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))" placeholder="Select warehouse" />
            </FormField>
            <FormField v-if="docForm.documentType === 'transfer'" label="Destination warehouse" required>
              <SelectInput v-model="docForm.destinationWarehouseId" :options="whRows.filter((w) => w.isActive !== false && w.id !== docForm.sourceWarehouseId).map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))" placeholder="Select warehouse" />
            </FormField>
            <FormField label="Document number">
              <TextInput :model-value="docForm.number" disabled placeholder="Assigned on save" />
              <template #default><p class="text-[11px] text-ink-faint">Preview only — the number is reserved when the draft is created.</p></template>
            </FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Reference"><TextInput v-model="docForm.referenceNumber" placeholder="Supplier invoice, delivery note…" /></FormField>
            <FormField label="Notes"><TextInput v-model="docForm.notes" placeholder="Optional" /></FormField>
          </div>

          <div class="rounded-xl border border-line">
            <header class="flex items-center justify-between border-b border-line px-4 py-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lines</p>
              <BaseButton size="sm" variant="secondary" icon="plus" :disabled="!pickerItems.length || docLines.length >= 200" @click="addDocLine">Add line</BaseButton>
            </header>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-line text-left text-[11px] uppercase text-ink-faint">
                <th class="px-3 py-2">Item</th>
                <th class="px-3 py-2 w-28">Quantity</th>
                <th class="px-3 py-2 w-32">Unit cost</th>
                <th class="px-3 py-2">Serials / notes</th>
                <th class="px-3 py-2 w-10" />
              </tr></thead>
              <tbody>
                <tr v-for="(line, index) in docLines" :key="index" class="border-b border-line/60 align-top">
                  <td class="px-3 py-2">
                    <SelectInput :model-value="line.itemId" :options="pickerItems.map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.name}` }))" @update:model-value="setDocLineItem(line, String($event))" />
                  </td>
                  <td class="px-3 py-2"><TextInput v-model="line.quantity" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.unitCost ?? ''" type="number" min="0" step="any" placeholder="auto" @update:model-value="line.unitCost = $event" /></td>
                  <td class="px-3 py-2">
                    <TextInput v-if="lineIsSerial(line)" :model-value="lineSerials(line)" placeholder="Comma-separated serial numbers" @update:model-value="setLineSerials(line, $event)" />
                    <TextInput v-else :model-value="line.description ?? ''" placeholder="Optional note" @update:model-value="line.description = $event" />
                  </td>
                  <td class="px-3 py-2 text-right"><button type="button" class="rounded p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Remove line" :disabled="docLines.length <= 1" @click="docLines.splice(index, 1)"><AppIcon name="x-mark" :size="14" /></button></td>
                </tr>
              </tbody>
            </table>
            <p v-if="!pickerItems.length" class="px-4 py-3 text-xs text-amber-700">No active purchasable items in this unit yet — create items first.</p>
          </div>

          <p v-if="docFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ docFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showDocForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="docSaving || !docForm.sourceWarehouseId || !docLines.length">{{ docSaving ? 'Saving…' : 'Create draft' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Document detail -->
    <ModalShell :open="showDocDetail" :title="docDetail ? `${docDetail.documentNumber} — ${docDetail.documentType}` : 'Stock document'" width="max-w-3xl" @close="showDocDetail = false">
      <div v-if="docDetail" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="docStatusChip(docDetail.status)">{{ docDetail.status }}</span>
          <span class="text-xs text-ink-faint">{{ docDetail.movementReason?.replaceAll('_', ' ') }} · {{ docDetail.documentDate }}</span>
          <span class="text-xs text-ink-faint">{{ docDetail.sourceWarehouse }}<template v-if="docDetail.destinationWarehouse"> → {{ docDetail.destinationWarehouse }}</template></span>
          <span class="ml-auto text-sm font-semibold text-ink">{{ docDetail.currencyCode || '' }} {{ formatDecimalAmount(docDetail.totalValue ?? '0') }}</span>
        </div>
        <p v-if="docDetail.referenceNumber || docDetail.notes" class="text-xs text-ink-faint">
          <template v-if="docDetail.referenceNumber">Reference: {{ docDetail.referenceNumber }}.</template>
          <template v-if="docDetail.notes"> {{ docDetail.notes }}</template>
        </p>
        <DataTable
          :columns="[
            { key: 'lineNumber', label: '#' },
            { key: 'itemCode', label: 'Item' },
            { key: 'quantity', label: 'Quantity', align: 'right' },
            { key: 'unitCost', label: 'Unit cost', align: 'right' },
            { key: 'lineValue', label: 'Value', align: 'right' },
            { key: 'description', label: 'Notes' },
          ]"
          :rows="(docDetail.lines || []) as any[]"
          :loading="docDetailLoading"
          row-key="lineNumber"
          empty="No lines."
        >
          <template #cell="{ col, row }">
            <template v-if="col.key === 'itemCode'"><span class="font-medium text-ink">{{ row.itemCode }}</span> <span class="text-ink-faint">{{ row.itemName }}</span></template>
            <template v-else-if="['quantity', 'unitCost', 'lineValue'].includes(col.key)">{{ formatDecimalAmount(row[col.key] ?? '0') }}</template>
            <template v-else-if="col.key === 'description'">{{ (row.serialNumbers || []).length ? `Serials: ${row.serialNumbers.join(', ')}` : row.description || '' }}</template>
            <template v-else>{{ row[col.key] }}</template>
          </template>
        </DataTable>

        <div v-if="docDetail.events?.length" class="rounded-xl border border-line">
          <p class="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Workflow history</p>
          <ul class="divide-y divide-line/60">
            <li v-for="event in docDetail.events.slice().reverse()" :key="event.version" class="flex items-center gap-3 px-4 py-2 text-xs">
              <span class="w-24 text-ink-faint">{{ event.createdAt?.slice(0, 16).replace('T', ' ') }}</span>
              <span class="font-medium capitalize text-ink">{{ event.action }}</span>
              <span class="capitalize text-ink-faint">{{ event.previousStatus || '—' }} → {{ event.newStatus }}</span>
              <span v-if="event.reason" class="text-rose-600">{{ event.reason }}</span>
              <span class="ml-auto text-ink-faint">{{ event.actor }}</span>
            </li>
          </ul>
        </div>

        <p v-if="docActionError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ docActionError }}</p>

        <div v-if="reasonPrompt" class="rounded-xl border border-line p-4">
          <FormField :label="`${reasonPrompt.label} — reason`" required>
            <TextInput v-model="reasonText" placeholder="Required (max 500 characters)" />
          </FormField>
          <div class="mt-3 flex justify-end gap-3">
            <BaseButton size="sm" variant="secondary" @click="reasonPrompt = null">Back</BaseButton>
            <BaseButton size="sm" variant="danger" :disabled="docActionBusy || !reasonText.trim()" @click="runDocAction(reasonPrompt.action)">{{ docActionBusy ? 'Working…' : 'Confirm' }}</BaseButton>
          </div>
        </div>

        <footer class="flex items-center justify-end gap-3 border-t border-line pt-4">
          <BaseButton v-if="docDetail.status === 'draft'" variant="danger" :disabled="docActionBusy" @click="deleteError = ''; deleteTarget = { kind: 'document', id: docDetail.id, version: docDetail.version || 1, label: docDetail.documentNumber }">Delete draft</BaseButton>
          <BaseButton v-for="btn in docActions" :key="btn.key" :variant="btn.variant" :disabled="docActionBusy" @click="confirmDocAction(btn.key)">{{ btn.label }}</BaseButton>
        </footer>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Delete record"
      :message="`Delete ${deleteTarget?.label ?? 'this record'}? Draft documents and unused records can always be recreated.`"
      confirm-label="Delete"
      tone="danger"
      :loading="deleteBusy"
      @confirm="runDelete"
      @cancel="deleteTarget = null"
    />
    <p v-if="deleteError && !deleteTarget" role="alert" class="fixed bottom-4 right-4 z-[80] rounded-lg bg-rose-600 px-4 py-3 text-sm text-white shadow-lg">{{ deleteError }}</p>
  </div>
</template>
