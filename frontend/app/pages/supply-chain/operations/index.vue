<script setup lang="ts">
import { useSupplyChain, type PurchaseOrder, type PurchaseReceipt, type Requisition, type ReceiptLine, type OrderLine, type RequisitionLine } from '../../../features/supply-chain/useSupplyChain'

definePageMeta({ layout: 'admin-supply-chain' })
useHead({ title: 'Supply chain operations' })

interface Unit { id: string; code: string; name: string; baseCurrencyId: string; isActive?: boolean }
interface OptionRow { id: string; name?: string; code?: string; itemCode?: string }

interface InvoiceColumn { key: string; label: string; align?: 'left' | 'right' | 'center' }

const api = useSupplyChain()
const { unitId } = api
const inventory = useInventoryish()
const message = (e: any) => e?.data?.statusMessage || e?.statusMessage || 'Request failed. Please retry.'

const units = ref<Unit[]>([])
const suppliers = ref<OptionRow[]>([])
const warehouses = ref<OptionRow[]>([])
const items = ref<(OptionRow & { baseUomId?: string; baseUom?: string; trackingMethod?: string })[]>([])
const topError = ref('')
const loadingUnits = ref(true)
// The sidebar opens each workspace with ?tab=; the query picks the starting tab.
const route = useRoute()
const tabKeys = ['requisitions', 'orders', 'receipts'] as const
const tabFromQuery = (value: unknown) => (tabKeys as readonly string[]).includes(String(value)) ? (String(value) as typeof tabKeys[number]) : 'requisitions'
const tab = ref<'requisitions' | 'orders' | 'receipts'>(tabFromQuery(route.query.tab))
watch(() => route.query.tab, (value) => { tab.value = tabFromQuery(value) })
const tabs = computed(() => [
  { key: 'requisitions', label: 'Purchase requisitions', count: reqTotal.value },
  { key: 'orders', label: 'Purchase orders', count: poTotal.value },
  { key: 'receipts', label: 'Goods receipts', count: grnTotal.value },
])
const activeUnit = computed(() => units.value.find((u) => u.id === unitId.value))
const statusChip = (status: string) => ({
  draft: 'bg-canvas text-ink-faint',
  submitted: 'bg-amber-50 text-amber-700',
  approved: 'bg-primary-soft text-primary',
  sent: 'bg-blue-50 text-blue-700',
  partially_ordered: 'bg-blue-50 text-blue-700',
  ordered: 'bg-blue-50 text-blue-700',
  partially_received: 'bg-purple-soft text-purple-600',
  received: 'bg-emerald-50 text-emerald-700',
  posted: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-canvas text-ink-faint',
  cancelled: 'bg-rose-50 text-rose-600',
  rejected: 'bg-rose-50 text-rose-600',
  reversed: 'bg-purple-soft text-purple-600',
}[status] || 'bg-canvas text-ink-faint')

function useInventoryish() {
  const unitsFn = async () => {
    const rows: Unit[] = []
    for (let pageNo = 1; ; pageNo++) {
      const r = await useRequestFetch()<{ data: Unit[]; totalPages: number }>('/api/ledger/accounting-units', { query: { pageNo, pageSize: 200 } })
      rows.push(...r.data)
      if (!r.data.length || pageNo >= r.totalPages || pageNo > 50) break
    }
    return rows.filter((u) => u.isActive !== false)
  }
  return { units: unitsFn }
}

/* ------------------------------- shared pickers ------------------------------ */
async function loadPickers() {
  if (!unitId.value) return
  try {
    const [sup, wh, it] = await Promise.all([api.suppliers.list(), api.warehouses.list(unitId.value), api.items.list(unitId.value)])
    suppliers.value = sup.data.map((s) => ({ id: s.id, name: s.name, accountNumber: s.accountNumber } as OptionRow))
    warehouses.value = wh.items
    items.value = it.items as typeof items.value
  } catch (e) {
    topError.value = message(e)
  }
}

/* -------------------------------- requisitions ------------------------------- */
const reqs = ref<Requisition[]>([])
const reqTotal = ref(0)
const reqPage = ref(1)
const reqStatus = ref('')
const reqLoading = ref(false)
const reqError = ref('')
async function loadReqs() {
  if (!unitId.value) return
  reqLoading.value = true
  reqError.value = ''
  try {
    const r = await api.requisitions.list(unitId.value, '', reqStatus.value, reqPage.value)
    reqs.value = r.items
    reqTotal.value = r.total
  } catch (e) {
    reqs.value = []
    reqError.value = message(e)
  } finally {
    reqLoading.value = false
  }
}
const showReqForm = ref(false)
const reqSaving = ref(false)
const reqFormError = ref('')
const editingReq = ref<Requisition | null>(null)
const reqForm = reactive({ requestDate: new Date().toISOString().slice(0, 10), requiredByDate: '', priority: 'normal', warehouseId: '', purpose: '', number: '' })
const reqLines = ref<RequisitionLine[]>([])
function addReqLine() {
  const item = items.value[0]
  if (!item) return
  reqLines.value.push({ itemId: item.id, uomId: item.baseUomId || '', quantity: '1', estimatedUnitCost: undefined, notes: '' })
}
async function openReqCreate() {
  if (!unitId.value) return
  editingReq.value = null
  reqFormError.value = ''
  reqLines.value = []
  Object.assign(reqForm, { requestDate: new Date().toISOString().slice(0, 10), requiredByDate: '', priority: 'normal', warehouseId: warehouses.value[0]?.id || '', purpose: '', number: '' })
  showReqForm.value = true
  try {
    reqForm.number = (await api.requisitions.nextNumber(unitId.value)).number
  } catch {
    reqForm.number = 'Assigned on save'
  }
  addReqLine()
}
async function openReqEdit(row: Requisition) {
  const detail = await api.requisitions.get(row.id).catch((e) => (reqError.value = message(e), null))
  if (!detail) return
  editingReq.value = detail
  reqFormError.value = ''
  Object.assign(reqForm, {
    requestDate: detail.requestDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    requiredByDate: detail.requiredByDate?.slice(0, 10) || '',
    priority: detail.priority || 'normal',
    warehouseId: detail.warehouseId || '',
    purpose: detail.purpose || '',
    number: detail.requisitionNumber,
  })
  reqLines.value = (detail.lines || []).map((l) => ({ itemId: l.itemId, uomId: l.uomId, quantity: l.quantity, estimatedUnitCost: l.estimatedUnitCost, neededByDate: l.neededByDate?.slice(0, 10) || undefined, notes: l.notes || '' }))
  showReqForm.value = true
}
async function saveReq() {
  if (reqSaving.value || !unitId.value) return
  reqFormError.value = ''
  if (!reqLines.value.length) { reqFormError.value = 'Add at least one line.'; return }
  for (const [index, line] of reqLines.value.entries()) {
    if (!line.itemId || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) {
      reqFormError.value = `Line ${index + 1}: select an item and a quantity above zero.`
      return
    }
  }
  reqSaving.value = true
  try {
    const lines = reqLines.value.map((line) => ({
      itemId: line.itemId,
      uomId: line.uomId,
      quantity: String(line.quantity).trim(),
      ...(line.estimatedUnitCost && Number(line.estimatedUnitCost) >= 0 ? { estimatedUnitCost: String(line.estimatedUnitCost) } : {}),
      ...(line.neededByDate ? { neededByDate: line.neededByDate } : {}),
      ...(line.notes?.trim() ? { notes: line.notes.trim() } : {}),
    }))
    const body: Record<string, unknown> = {
      accountingUnitId: unitId.value,
      requestDate: reqForm.requestDate,
      priority: reqForm.priority,
      ...(reqForm.requiredByDate ? { requiredByDate: reqForm.requiredByDate } : {}),
      ...(reqForm.warehouseId ? { warehouseId: reqForm.warehouseId } : {}),
      purpose: reqForm.purpose.trim(),
      lines,
    }
    if (editingReq.value) await api.requisitions.update(editingReq.value.id, { ...body, requestId: crypto.randomUUID(), version: editingReq.value.version })
    else await api.requisitions.create({ ...body, requestId: crypto.randomUUID() })
    showReqForm.value = false
    await loadReqs()
  } catch (e) {
    reqFormError.value = message(e)
  } finally {
    reqSaving.value = false
  }
}

/* --------------------------------- purchase orders --------------------------- */
const pos = ref<PurchaseOrder[]>([])
const poTotal = ref(0)
const poPage = ref(1)
const poStatus = ref('')
const poLoading = ref(false)
const poError = ref('')
async function loadPos() {
  if (!unitId.value) return
  poLoading.value = true
  poError.value = ''
  try {
    const r = await api.orders.list(unitId.value, '', poStatus.value, poPage.value)
    pos.value = r.items
    poTotal.value = r.total
  } catch (e) {
    pos.value = []
    poError.value = message(e)
  } finally {
    poLoading.value = false
  }
}
const showPoForm = ref(false)
const poSaving = ref(false)
const poFormError = ref('')
const editingPo = ref<PurchaseOrder | null>(null)
const poForm = reactive({ supplierId: '', orderDate: new Date().toISOString().slice(0, 10), expectedDeliveryDate: '', warehouseId: '', paymentTermsDays: 30, supplierReference: '', notes: '', number: '' })
const poLines = ref<OrderLine[]>([])
function addPoLine() {
  const item = items.value[0]
  if (!item) return
  poLines.value.push({ itemId: item.id, uomId: item.baseUomId || '', quantity: '1', unitCost: '0', discountRate: '0', taxRate: '0' })
}
async function openPoCreate(fromRequisition?: Requisition) {
  if (!unitId.value) return
  editingPo.value = null
  poFormError.value = ''
  poLines.value = []
  Object.assign(poForm, {
    supplierId: suppliers.value[0]?.id || '', orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: '', warehouseId: warehouses.value[0]?.id || '', paymentTermsDays: 30,
    supplierReference: '', notes: fromRequisition ? `Requisition ${fromRequisition.requisitionNumber}` : '', number: '',
  })
  showPoForm.value = true
  try {
    poForm.number = (await api.orders.nextNumber(unitId.value)).number
  } catch {
    poForm.number = 'Assigned on save'
  }
  addPoLine()
}
async function openPoEdit(row: PurchaseOrder) {
  const detail = await api.orders.get(row.id).catch((e) => (poError.value = message(e), null))
  if (!detail) return
  editingPo.value = detail
  poFormError.value = ''
  Object.assign(poForm, {
    supplierId: detail.supplierId, orderDate: detail.orderDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: detail.expectedDeliveryDate?.slice(0, 10) || '', warehouseId: detail.warehouseId,
    paymentTermsDays: 30, supplierReference: detail.supplierReference || '', notes: '', number: detail.orderNumber,
  })
  poLines.value = (detail.lines || []).map((l) => ({ itemId: l.itemId, uomId: l.uomId, quantity: l.quantity, unitCost: l.unitCost, discountRate: l.discountRate || '0', taxRate: l.taxRate || '0' }))
  showPoForm.value = true
}
function setPoLineItem(line: OrderLine, itemId: string) {
  line.itemId = itemId
  const item = items.value.find((i) => i.id === itemId)
  if (item) line.uomId = item.baseUomId || ''
}
async function savePo() {
  if (poSaving.value || !unitId.value) return
  poFormError.value = ''
  if (!poLines.value.length) { poFormError.value = 'Add at least one line.'; return }
  for (const [index, line] of poLines.value.entries()) {
    if (!line.itemId || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 || !Number.isFinite(Number(line.unitCost)) || Number(line.unitCost) < 0) {
      poFormError.value = `Line ${index + 1}: select an item with a quantity above zero and a non-negative cost.`
      return
    }
  }
  poSaving.value = true
  try {
    const lines = poLines.value.map((line) => ({
      itemId: line.itemId,
      uomId: line.uomId,
      quantity: String(line.quantity).trim(),
      unitCost: String(line.unitCost).trim(),
      discountRate: String(line.discountRate || '0'),
      taxRate: String(line.taxRate || '0'),
    }))
    const body: Record<string, unknown> = {
      accountingUnitId: unitId.value,
      supplierId: poForm.supplierId,
      orderDate: poForm.orderDate,
      ...(poForm.expectedDeliveryDate ? { expectedDeliveryDate: poForm.expectedDeliveryDate } : {}),
      warehouseId: poForm.warehouseId,
      paymentTermsDays: poForm.paymentTermsDays,
      ...(poForm.supplierReference.trim() ? { supplierReference: poForm.supplierReference.trim() } : {}),
      ...(poForm.notes.trim() ? { notes: poForm.notes.trim() } : {}),
      lines,
    }
    if (editingPo.value) await api.orders.update(editingPo.value.id, { ...body, requestId: crypto.randomUUID(), version: editingPo.value.version })
    else await api.orders.create({ ...body, requestId: crypto.randomUUID() })
    showPoForm.value = false
    await loadPos()
  } catch (e) {
    poFormError.value = message(e)
  } finally {
    poSaving.value = false
  }
}

/* ---------------------------------- receipts --------------------------------- */
const grns = ref<PurchaseReceipt[]>([])
const grnTotal = ref(0)
const grnPage = ref(1)
const grnStatus = ref('')
const grnLoading = ref(false)
const grnError = ref('')
async function loadGrns() {
  if (!unitId.value) return
  grnLoading.value = true
  grnError.value = ''
  try {
    const r = await api.receipts.list(unitId.value, '', grnStatus.value, grnPage.value)
    grns.value = r.items
    grnTotal.value = r.total
  } catch (e) {
    grns.value = []
    grnError.value = message(e)
  } finally {
    grnLoading.value = false
  }
}
const showGrnForm = ref(false)
const grnSaving = ref(false)
const grnFormError = ref('')
const grnForm = reactive({ orderId: '', receiptDate: new Date().toISOString().slice(0, 10), deliveryNoteNumber: '', notes: '', number: '' })
const grnOrder = ref<PurchaseOrder | null>(null)
const grnLines = ref<ReceiptLine[]>([])
const receivableOrders = ref<PurchaseOrder[]>([])
async function loadReceivableOrders() {
  if (!unitId.value) return
  const out: PurchaseOrder[] = []
  for (const status of ['sent', 'partially_received']) {
    const r = await api.orders.list(unitId.value, '', status, 1, 50)
    out.push(...r.items)
  }
  receivableOrders.value = out.sort((a, b) => b.orderDate.localeCompare(a.orderDate))
}
async function pickGrnOrder(orderId: string) {
  grnForm.orderId = orderId
  grnOrder.value = null
  grnLines.value = []
  if (!orderId) return
  const detail = await api.orders.get(orderId).catch(() => null)
  if (!detail) return
  grnOrder.value = detail
  grnLines.value = (detail.lines || [])
    .filter((l) => (parseFloat(l.quantity) - parseFloat(l.receivedQuantity || '0') - parseFloat(l.rejectedQuantity || '0')) > 0)
    .map((l) => ({
      orderLineId: l.id || '',
      orderLineNumber: l.lineNumber,
      itemId: l.itemId,
      itemCode: l.itemCode,
      uomId: l.uomId,
      quantityReceived: String(Math.max(0, parseFloat(l.quantity) - parseFloat(l.receivedQuantity || '0') - parseFloat(l.rejectedQuantity || '0'))),
      quantityAccepted: String(Math.max(0, parseFloat(l.quantity) - parseFloat(l.receivedQuantity || '0') - parseFloat(l.rejectedQuantity || '0'))),
      quantityRejected: '0',
      unitCost: l.unitCost,
      rejectionReason: '',
    }))
}
async function openGrnCreate(order?: PurchaseOrder) {
  if (!unitId.value) return
  grnFormError.value = ''
  grnOrder.value = null
  grnLines.value = []
  Object.assign(grnForm, { orderId: '', receiptDate: new Date().toISOString().slice(0, 10), deliveryNoteNumber: '', notes: '', number: '' })
  showGrnForm.value = true
  try {
    grnForm.number = (await api.receipts.nextNumber(unitId.value)).number
  } catch {
    grnForm.number = 'Assigned on save'
  }
  await loadReceivableOrders()
  if (order) await pickGrnOrder(order.id)
}
function grnAccepted(line: ReceiptLine) {
  return Math.max(0, parseFloat(line.quantityReceived || '0') - parseFloat(line.quantityRejected || '0'))
}
async function saveGrn() {
  if (grnSaving.value || !unitId.value) return
  grnFormError.value = ''
  if (!grnForm.orderId) { grnFormError.value = 'Select the purchase order being received.'; return }
  const lines = grnLines.value.filter((l) => parseFloat(l.quantityReceived || '0') > 0)
  if (!lines.length) { grnFormError.value = 'Enter a received quantity above zero on at least one line.'; return }
  for (const line of lines) {
    if (parseFloat(line.quantityRejected || '0') > parseFloat(line.quantityReceived || '0')) {
      grnFormError.value = `Line ${line.orderLineNumber || ''}: rejected quantity cannot exceed the received quantity.`
      return
    }
    if (parseFloat(line.quantityRejected || '0') > 0 && !line.rejectionReason?.trim()) {
      grnFormError.value = `Line ${line.orderLineNumber || ''}: give a reason for the rejected quantity.`
      return
    }
  }
  grnSaving.value = true
  try {
    await api.receipts.create({
      accountingUnitId: unitId.value,
      purchaseOrderId: grnForm.orderId,
      receiptDate: grnForm.receiptDate,
      ...(grnForm.deliveryNoteNumber.trim() ? { deliveryNoteNumber: grnForm.deliveryNoteNumber.trim() } : {}),
      ...(grnForm.notes.trim() ? { notes: grnForm.notes.trim() } : {}),
      requestId: crypto.randomUUID(),
      lines: lines.map((line) => ({
        orderLineId: line.orderLineId,
        quantityReceived: String(line.quantityReceived).trim(),
        quantityAccepted: String(grnAccepted(line)),
        quantityRejected: String(line.quantityRejected || '0').trim(),
        ...(parseFloat(line.quantityRejected || '0') > 0 ? { rejectionReason: line.rejectionReason!.trim() } : {}),
      })),
    })
    showGrnForm.value = false
    grnPage.value = 1
    await loadGrns()
  } catch (e) {
    grnFormError.value = message(e)
  } finally {
    grnSaving.value = false
  }
}

/* ------------------------------ detail + actions ------------------------------ */
const detail = ref<{ kind: 'requisitions' | 'orders' | 'receipts'; row: Requisition | PurchaseOrder | PurchaseReceipt } | null>(null)
const detailLines = ref<(RequisitionLine | OrderLine | ReceiptLine)[]>([])
const detailBusy = ref(false)
const detailError = ref('')
const reasonPrompt = ref<{ action: string; label: string } | null>(null)
const reasonText = ref('')
const detailDelete = ref<{ kind: 'requisitions' | 'orders' | 'receipts'; id: string; version: number; number: string } | null>(null)
const detailDeleteError = ref('')
const detailDeleteBusy = ref(false)

async function openDetail(kind: 'requisitions' | 'orders' | 'receipts', row: { id: string }) {
  detailBusy.value = true
  detailError.value = ''
  try {
    const full = await api[kind].get(row.id)
    detail.value = { kind, row: full as never }
    detailLines.value = ((full as { lines?: RequisitionLine[] | OrderLine[] | ReceiptLine[] }).lines || []) as never
  } catch (e) {
    detailError.value = message(e)
  } finally {
    detailBusy.value = false
  }
}
const detailHeader = computed(() => {
  if (!detail.value) return { number: '', status: '', date: '', party: '', extra: '' }
  const { kind, row } = detail.value
  if (kind === 'requisitions') {
    const r = row as Requisition
    return { number: r.requisitionNumber, status: r.status, date: r.requestDate?.slice(0, 10) || '', party: r.warehouseName || '', extra: r.purpose || '' }
  }
  if (kind === 'orders') {
    const o = row as PurchaseOrder
    return { number: o.orderNumber, status: o.status, date: o.orderDate?.slice(0, 10) || '', party: o.supplierName || '', extra: o.supplierReference ? `Ref ${o.supplierReference}` : '' }
  }
  const g = row as PurchaseReceipt
  return { number: g.receiptNumber, status: g.status, date: g.receiptDate?.slice(0, 10) || '', party: g.supplierName || '', extra: g.orderNumber ? `Against ${g.orderNumber}` : '' }
})
const detailActions = computed(() => {
  if (!detail.value) return [] as { key: string; label: string; variant: 'primary' | 'secondary' | 'danger' | 'success' }[]
  const { kind, row } = detail.value
  const status = (row as { status: string }).status
  const table: Record<string, Record<string, { key: string; label: string; variant: 'primary' | 'secondary' | 'danger' | 'success' }[]>> = {
    requisitions: {
      draft: [{ key: 'submit', label: 'Submit', variant: 'primary' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      submitted: [{ key: 'approve', label: 'Approve', variant: 'success' }, { key: 'reject', label: 'Reject', variant: 'danger' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      approved: [{ key: 'close', label: 'Close', variant: 'secondary' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      partially_ordered: [{ key: 'close', label: 'Close', variant: 'secondary' }],
      ordered: [{ key: 'close', label: 'Close', variant: 'secondary' }],
    },
    orders: {
      draft: [{ key: 'submit', label: 'Submit', variant: 'primary' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      submitted: [{ key: 'approve', label: 'Approve', variant: 'success' }, { key: 'reject', label: 'Reject', variant: 'danger' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      approved: [{ key: 'send', label: 'Send to supplier', variant: 'primary' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      sent: [{ key: 'close', label: 'Close', variant: 'secondary' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      partially_received: [{ key: 'close', label: 'Close', variant: 'secondary' }],
      received: [{ key: 'close', label: 'Close', variant: 'secondary' }],
    },
    receipts: {
      draft: [{ key: 'post', label: 'Post receipt to stock', variant: 'primary' }, { key: 'cancel', label: 'Cancel', variant: 'danger' }],
      posted: [{ key: 'reverse', label: 'Reverse this receipt', variant: 'danger' }],
    },
  }
  return table[kind][status] || []
})
async function runAction(action: string) {
  if (!detail.value || detailBusy.value) return
  detailBusy.value = true
  detailError.value = ''
  try {
    // Every transition carries the record version so stale updates are rejected.
    const body: Record<string, unknown> = { version: detail.value.row.version }
    if (reasonPrompt.value) body.reason = reasonText.value.trim()
    await api[detail.value.kind].action(detail.value.row.id, action, body)
    reasonPrompt.value = null
    reasonText.value = ''
    const full = await api[detail.value.kind].get(detail.value.row.id)
    detail.value = { kind: detail.value.kind, row: full as never }
    detailLines.value = ((full as { lines?: unknown[] }).lines || []) as never
    await loadTab()
  } catch (e) {
    detailError.value = message(e)
  } finally {
    detailBusy.value = false
  }
}
function confirmAction(action: string) {
  detailError.value = ''
  if (action === 'reject' || action === 'cancel') {
    reasonPrompt.value = { action, label: action === 'reject' ? 'Reject' : 'Cancel' }
    reasonText.value = ''
    return
  }
  void runAction(action)
}
function rowDelete(kind: 'requisitions' | 'orders' | 'receipts', row: { id: string; version?: number }, number: string) {
  detailDeleteError.value = ''
  detailDelete.value = { kind, id: row.id, version: row.version || 1, number }
}
async function runRowDelete() {
  if (!detailDelete.value || detailDeleteBusy.value) return
  const target = detailDelete.value
  detailDeleteBusy.value = true
  detailDeleteError.value = ''
  try {
    await api[target.kind].remove(target.id, target.version)
    detailDelete.value = null
    detail.value = null
    await loadTab()
  } catch (e) {
    detailDeleteError.value = message(e)
  } finally {
    detailDeleteBusy.value = false
  }
}
const poLineColumns: InvoiceColumn[] = [
  { key: 'itemCode', label: 'Item' },
  { key: 'quantity', label: 'Ordered', align: 'right' },
  { key: 'receivedQuantity', label: 'Received', align: 'right' },
  { key: 'unitCost', label: 'Unit cost', align: 'right' },
  { key: 'lineTotal', label: 'Total', align: 'right' },
]
const reqLineColumns: InvoiceColumn[] = [
  { key: 'itemCode', label: 'Item' },
  { key: 'quantity', label: 'Requested', align: 'right' },
  { key: 'orderedQuantity', label: 'Ordered', align: 'right' },
  { key: 'estimatedUnitCost', label: 'Est. cost', align: 'right' },
]
const grnLineColumns: InvoiceColumn[] = [
  { key: 'itemCode', label: 'Item' },
  { key: 'quantityReceived', label: 'Received', align: 'right' },
  { key: 'quantityAccepted', label: 'Accepted', align: 'right' },
  { key: 'quantityRejected', label: 'Rejected', align: 'right' },
  { key: 'unitCost', label: 'Unit cost', align: 'right' },
]

/* --------------------------------- bootstraps -------------------------------- */
function loadTab() {
  if (!unitId.value) return
  if (tab.value === 'requisitions') void loadReqs()
  if (tab.value === 'orders') void loadPos()
  if (tab.value === 'receipts') void loadGrns()
}
watch(unitId, () => { void loadPickers(); loadTab() })
watch(tab, loadTab)
watch([reqPage], () => { if (tab.value === 'requisitions') void loadReqs() })
watch([poPage], () => { if (tab.value === 'orders') void loadPos() })
watch([grnPage], () => { if (tab.value === 'receipts') void loadGrns() })
watch(reqStatus, () => { reqPage.value = 1; void loadReqs() })
watch(poStatus, () => { poPage.value = 1; void loadPos() })
watch(grnStatus, () => { grnPage.value = 1; void loadGrns() })
onMounted(async () => {
  try {
    units.value = await inventory.units()
    if (!unitId.value && units.value.length) unitId.value = units.value[0].id
    void loadPickers()
    loadTab()
  } catch (e) {
    topError.value = message(e)
  } finally {
    loadingUnits.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Supply chain operations" subtitle="Requisitions, purchase orders and goods receipts, connected to the stock ledger">
      <BaseButton v-if="tab === 'requisitions'" icon="plus" :disabled="!unitId" @click="openReqCreate">New requisition</BaseButton>
      <BaseButton v-else-if="tab === 'orders'" icon="plus" :disabled="!unitId" @click="openPoCreate()">New purchase order</BaseButton>
      <BaseButton v-else icon="plus" :disabled="!unitId" @click="openGrnCreate()">New receipt</BaseButton>
    </PageHeader>

    <p v-if="topError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ topError }}</p>
    <p v-if="!loadingUnits && !units.length" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
      Supply chain needs at least one accounting unit. Create one under General Ledger → Accounting Units, plus suppliers in the shared directories.
    </p>

    <Tabs v-model="tab" :tabs="tabs" />

    <!-- Requisitions -->
    <section v-if="tab === 'requisitions'" class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SelectInput v-model="reqStatus" :options="[{ value: '', label: 'All statuses' }, ...['draft', 'submitted', 'approved', 'partially_ordered', 'ordered', 'closed', 'cancelled', 'rejected'].map((s) => ({ value: s, label: s.replace('_', ' ') }))]" class="w-44" />
        <span class="text-xs text-ink-faint">{{ reqTotal }} requisitions</span>
      </div>
      <p v-if="reqError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ reqError }}</p>
      <DataTable
        :columns="[{ key: 'requisitionNumber', label: 'Number' }, { key: 'requestDate', label: 'Requested' }, { key: 'requiredByDate', label: 'Needed by' }, { key: 'warehouseName', label: 'Warehouse' }, { key: 'estimatedTotal', label: 'Estimate', align: 'right' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '', align: 'right' }]"
        :rows="(reqs) as any[]"
        :loading="reqLoading"
        empty="No requisitions yet."
        @row-click="openDetail('requisitions', $event)"
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'requisitionNumber'"><span class="font-medium text-ink">{{ row.requisitionNumber }}</span></template>
          <template v-else-if="col.key === 'requestDate'">{{ row.requestDate?.slice(0, 10) }}</template>
          <template v-else-if="col.key === 'requiredByDate'">{{ row.requiredByDate?.slice(0, 10) || '—' }}</template>
          <template v-else-if="col.key === 'warehouseName'">{{ row.warehouseName || '—' }}</template>
          <template v-else-if="col.key === 'estimatedTotal'">{{ formatDecimalAmount(row.estimatedTotal ?? '0') }}</template>
          <template v-else-if="col.key === 'status'"><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusChip(row.status)">{{ row.status.replace('_', ' ') }}</span></template>
          <template v-else-if="col.key === 'actions'">
            <BaseButton v-if="row.status === 'draft'" size="sm" variant="secondary" @click.stop="openReqEdit(row)">Edit</BaseButton>
            <BaseButton v-if="row.status === 'approved'" size="sm" variant="primary" @click.stop="openPoCreate(row)">Create PO</BaseButton>
          </template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
      <div class="border-t border-line p-4"><Pagination v-model:page="reqPage" :size="20" :total="reqTotal" /></div>
    </section>

    <!-- Orders -->
    <section v-else-if="tab === 'orders'" class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SelectInput v-model="poStatus" :options="[{ value: '', label: 'All statuses' }, ...['draft', 'submitted', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled', 'rejected'].map((s) => ({ value: s, label: s.replace('_', ' ') }))]" class="w-44" />
        <span class="text-xs text-ink-faint">{{ poTotal }} purchase orders</span>
      </div>
      <p v-if="poError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ poError }}</p>
      <DataTable
        :columns="[{ key: 'orderNumber', label: 'Number' }, { key: 'supplierName', label: 'Supplier' }, { key: 'orderDate', label: 'Order date' }, { key: 'expectedDeliveryDate', label: 'Expected' }, { key: 'grandTotal', label: 'Total', align: 'right' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '', align: 'right' }]"
        :rows="(pos) as any[]"
        :loading="poLoading"
        empty="No purchase orders yet."
        @row-click="openDetail('orders', $event)"
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'orderNumber'"><span class="font-medium text-ink">{{ row.orderNumber }}</span></template>
          <template v-else-if="col.key === 'orderDate'">{{ row.orderDate?.slice(0, 10) }}</template>
          <template v-else-if="col.key === 'expectedDeliveryDate'">{{ row.expectedDeliveryDate?.slice(0, 10) || '—' }}</template>
          <template v-else-if="col.key === 'grandTotal'">{{ row.currencyCode }} {{ formatDecimalAmount(row.grandTotal ?? '0') }}</template>
          <template v-else-if="col.key === 'status'"><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusChip(row.status)">{{ row.status.replace('_', ' ') }}</span></template>
          <template v-else-if="col.key === 'actions'">
            <BaseButton v-if="row.status === 'draft'" size="sm" variant="secondary" @click.stop="openPoEdit(row)">Edit</BaseButton>
            <BaseButton v-if="row.status === 'sent' || row.status === 'partially_received'" size="sm" variant="primary" @click.stop="openGrnCreate(row)">Receive</BaseButton>
          </template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
      <div class="border-t border-line p-4"><Pagination v-model:page="poPage" :size="20" :total="poTotal" /></div>
    </section>

    <!-- Receipts -->
    <section v-else class="rounded-xl border border-line bg-surface shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <SelectInput v-model="grnStatus" :options="[{ value: '', label: 'All statuses' }, ...['draft', 'posted', 'reversed', 'cancelled'].map((s) => ({ value: s, label: s }))]" class="w-44" />
        <span class="text-xs text-ink-faint">{{ grnTotal }} receipts</span>
      </div>
      <p v-if="grnError" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ grnError }}</p>
      <DataTable
        :columns="[{ key: 'receiptNumber', label: 'Number' }, { key: 'orderNumber', label: 'Purchase order' }, { key: 'supplierName', label: 'Supplier' }, { key: 'receiptDate', label: 'Receipt date' }, { key: 'status', label: 'Status' }]"
        :rows="(grns) as any[]"
        :loading="grnLoading"
        empty="No goods receipts yet."
        @row-click="openDetail('receipts', $event)"
      >
        <template #cell="{ col, row }">
          <template v-if="col.key === 'receiptNumber'"><span class="font-medium text-ink">{{ row.receiptNumber }}</span></template>
          <template v-else-if="col.key === 'receiptDate'">{{ row.receiptDate?.slice(0, 10) }}</template>
          <template v-else-if="col.key === 'status'"><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusChip(row.status)">{{ row.status.replace('_', ' ') }}</span></template>
          <template v-else>{{ row[col.key] }}</template>
        </template>
      </DataTable>
      <div class="border-t border-line p-4"><Pagination v-model:page="grnPage" :size="20" :total="grnTotal" /></div>
    </section>

    <!-- Requisition form -->
    <ModalShell :open="showReqForm" :title="editingReq ? 'Edit requisition' : 'New requisition'" width="max-w-3xl" @close="!reqSaving && (showReqForm = false)">
      <form @submit.prevent="saveReq">
        <fieldset :disabled="reqSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField label="Request date" required><TextInput v-model="reqForm.requestDate" type="date" /></FormField>
            <FormField label="Needed by"><TextInput v-model="reqForm.requiredByDate" type="date" /></FormField>
            <FormField label="Priority" required><SelectInput v-model="reqForm.priority" :options="['low', 'normal', 'high', 'urgent'].map((v) => ({ value: v, label: v }))" /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Deliver to warehouse"><SelectInput v-model="reqForm.warehouseId" :options="warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))" placeholder="Select warehouse" /></FormField>
            <FormField label="Number"><TextInput :model-value="reqForm.number" disabled /></FormField>
          </div>
          <FormField label="Purpose"><TextInput v-model="reqForm.purpose" placeholder="Restock warehouse for Q3 demand" /></FormField>

          <div class="rounded-xl border border-line">
            <header class="flex items-center justify-between border-b border-line px-4 py-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lines</p>
              <BaseButton size="sm" variant="secondary" icon="plus" :disabled="!items.length || reqLines.length >= 200" @click="addReqLine">Add line</BaseButton>
            </header>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-line text-left text-[11px] uppercase text-ink-faint">
                <th class="px-3 py-2">Item</th><th class="px-3 py-2 w-28">Quantity</th><th class="px-3 py-2 w-32">Est. unit cost</th><th class="px-3 py-2 w-36">Needed by</th><th class="px-3 py-2 w-10" />
              </tr></thead>
              <tbody>
                <tr v-for="(line, index) in reqLines" :key="index" class="border-b border-line/60">
                  <td class="px-3 py-2"><SelectInput :model-value="line.itemId" :options="items.map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.name}` }))" @update:model-value="line.itemId = String($event); line.uomId = items.find((i) => i.id === line.itemId)?.baseUomId || ''" /></td>
                  <td class="px-3 py-2"><TextInput v-model="line.quantity" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.estimatedUnitCost ?? ''" type="number" min="0" step="any" placeholder="optional" @update:model-value="line.estimatedUnitCost = $event" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.neededByDate ?? ''" type="date" @update:model-value="line.neededByDate = $event" /></td>
                  <td class="px-3 py-2 text-right"><button type="button" class="rounded p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Remove line" :disabled="reqLines.length <= 1" @click="reqLines.splice(index, 1)"><AppIcon name="x-mark" :size="14" /></button></td>
                </tr>
              </tbody>
            </table>
            <p v-if="!items.length" class="px-4 py-3 text-xs text-amber-700">Create items under Inventory first.</p>
          </div>

          <p v-if="reqFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ reqFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showReqForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="reqSaving || !reqLines.length">{{ reqSaving ? 'Saving…' : editingReq ? 'Save changes' : 'Create requisition' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Order form -->
    <ModalShell :open="showPoForm" :title="editingPo ? 'Edit purchase order' : 'New purchase order'" width="max-w-3xl" @close="!poSaving && (showPoForm = false)">
      <form @submit.prevent="savePo">
        <fieldset :disabled="poSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField label="Supplier" required><SelectInput v-model="poForm.supplierId" :options="suppliers.map((s) => ({ value: s.id, label: s.name || '' }))" placeholder="Select supplier" :disabled="!!editingPo" /></FormField>
            <FormField label="Order date" required><TextInput v-model="poForm.orderDate" type="date" /></FormField>
            <FormField label="Expected delivery"><TextInput v-model="poForm.expectedDeliveryDate" type="date" /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField label="Receiving warehouse" required><SelectInput v-model="poForm.warehouseId" :options="warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))" placeholder="Select warehouse" /></FormField>
            <FormField label="Payment terms (days)"><TextInput :model-value="String(poForm.paymentTermsDays)" type="number" min="0" max="365" @update:model-value="poForm.paymentTermsDays = Number($event) || 0" /></FormField>
            <FormField label="Number"><TextInput :model-value="poForm.number" disabled /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Supplier reference"><TextInput v-model="poForm.supplierReference" placeholder="Quote or pro-forma number" /></FormField>
            <FormField label="Notes"><TextInput v-model="poForm.notes" placeholder="Optional" /></FormField>
          </div>

          <div class="rounded-xl border border-line">
            <header class="flex items-center justify-between border-b border-line px-4 py-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lines</p>
              <BaseButton size="sm" variant="secondary" icon="plus" :disabled="!items.length || poLines.length >= 200" @click="addPoLine">Add line</BaseButton>
            </header>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-line text-left text-[11px] uppercase text-ink-faint">
                <th class="px-3 py-2">Item</th><th class="px-3 py-2 w-24">Quantity</th><th class="px-3 py-2 w-28">Unit cost</th><th class="px-3 py-2 w-20">Disc %</th><th class="px-3 py-2 w-20">Tax %</th><th class="px-3 py-2 w-10" />
              </tr></thead>
              <tbody>
                <tr v-for="(line, index) in poLines" :key="index" class="border-b border-line/60">
                  <td class="px-3 py-2"><SelectInput :model-value="line.itemId" :options="items.map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.name}` }))" @update:model-value="setPoLineItem(line, String($event))" /></td>
                  <td class="px-3 py-2"><TextInput v-model="line.quantity" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput v-model="line.unitCost" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.discountRate ?? '0'" type="number" min="0" max="100" step="any" @update:model-value="line.discountRate = $event" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.taxRate ?? '0'" type="number" min="0" max="100" step="any" @update:model-value="line.taxRate = $event" /></td>
                  <td class="px-3 py-2 text-right"><button type="button" class="rounded p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Remove line" :disabled="poLines.length <= 1" @click="poLines.splice(index, 1)"><AppIcon name="x-mark" :size="14" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="poFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ poFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showPoForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="poSaving || !poForm.supplierId || !poForm.warehouseId || !poLines.length">{{ poSaving ? 'Saving…' : editingPo ? 'Save changes' : 'Create order' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Receipt form -->
    <ModalShell :open="showGrnForm" title="New goods receipt" width="max-w-3xl" @close="!grnSaving && (showGrnForm = false)">
      <form @submit.prevent="saveGrn">
        <fieldset :disabled="grnSaving" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <FormField label="Purchase order" required>
              <SelectInput :model-value="grnForm.orderId" :options="receivableOrders.map((o) => ({ value: o.id, label: `${o.orderNumber} — ${o.supplierName || ''}` }))" placeholder="Select order" @update:model-value="pickGrnOrder(String($event))" />
            </FormField>
            <FormField label="Receipt date" required><TextInput v-model="grnForm.receiptDate" type="date" /></FormField>
            <FormField label="Number"><TextInput :model-value="grnForm.number" disabled /></FormField>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField label="Delivery note"><TextInput v-model="grnForm.deliveryNoteNumber" placeholder="Supplier delivery note number" /></FormField>
            <FormField label="Notes"><TextInput v-model="grnForm.notes" placeholder="Optional" /></FormField>
          </div>

          <div v-if="grnOrder" class="rounded-xl border border-line">
            <header class="border-b border-line px-4 py-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Lines — receiving against {{ grnOrder.orderNumber }}</p>
            </header>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-line text-left text-[11px] uppercase text-ink-faint">
                <th class="px-3 py-2">Item</th><th class="px-3 py-2 w-24">Received</th><th class="px-3 py-2 w-24">Rejected</th><th class="px-3 py-2">Rejection reason</th>
              </tr></thead>
              <tbody>
                <tr v-for="(line, index) in grnLines" :key="index" class="border-b border-line/60">
                  <td class="px-3 py-2">{{ line.itemCode }} <span class="text-ink-faint">— line {{ line.orderLineNumber }}</span></td>
                  <td class="px-3 py-2"><TextInput v-model="line.quantityReceived" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput v-model="line.quantityRejected" type="number" min="0" step="any" /></td>
                  <td class="px-3 py-2"><TextInput :model-value="line.rejectionReason ?? ''" :placeholder="parseFloat(line.quantityRejected || '0') > 0 ? 'Required' : 'Optional'" @update:model-value="line.rejectionReason = $event" /></td>
                </tr>
              </tbody>
            </table>
            <p class="px-4 py-2 text-[11px] text-ink-faint">Accepted = received − rejected. Posting a receipt moves accepted quantities into stock and closes open order quantities.</p>
          </div>

          <p v-if="grnFormError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ grnFormError }}</p>
          <footer class="flex justify-end gap-3 border-t border-line pt-4">
            <BaseButton variant="secondary" type="button" @click="showGrnForm = false">Cancel</BaseButton>
            <BaseButton type="submit" :disabled="grnSaving || !grnForm.orderId || !grnLines.length">{{ grnSaving ? 'Saving…' : 'Create receipt draft' }}</BaseButton>
          </footer>
        </fieldset>
      </form>
    </ModalShell>

    <!-- Detail + workflow -->
    <ModalShell :open="!!detail" :title="detailHeader.number" width="max-w-3xl" @close="detail = null">
      <div v-if="detail" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="statusChip(detailHeader.status)">{{ detailHeader.status.replace('_', ' ') }}</span>
          <span class="text-xs text-ink-faint">{{ detailHeader.date }}</span>
          <span class="text-xs font-medium text-ink">{{ detailHeader.party }}</span>
          <span v-if="detailHeader.extra" class="text-xs text-ink-faint">{{ detailHeader.extra }}</span>
        </div>
        <DataTable
          :columns="detail.kind === 'requisitions' ? reqLineColumns : detail.kind === 'orders' ? poLineColumns : grnLineColumns"
          :rows="(detailLines) as any[]"
          :loading="detailBusy"
          row-key="lineNumber"
          empty="No lines."
        >
          <template #cell="{ col, row }">
            <template v-if="col.key === 'itemCode'"><span class="font-medium text-ink">{{ row.itemCode }}</span> <span class="text-ink-faint">{{ row.itemName }}</span></template>
            <template v-else-if="col.align === 'right'">{{ formatDecimalAmount(row[col.key] ?? '0') }}</template>
            <template v-else>{{ row[col.key] }}</template>
          </template>
        </DataTable>

        <div v-if="(detail.row as { events?: { action: string; newStatus: string; createdAt: string }[] }).events?.length" class="rounded-xl border border-line">
          <p class="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Workflow history</p>
          <ul class="divide-y divide-line/60">
            <li v-for="event in ((detail.row as { events?: { action: string; newStatus: string; createdAt: string }[] }).events || []).slice().reverse()" :key="event.createdAt + event.action" class="flex items-center gap-3 px-4 py-2 text-xs">
              <span class="w-36 text-ink-faint">{{ event.createdAt?.slice(0, 16).replace('T', ' ') }}</span>
              <span class="font-medium capitalize text-ink">{{ event.action }}</span>
              <span class="text-ink-faint">→ {{ event.newStatus }}</span>
            </li>
          </ul>
        </div>

        <p v-if="detailError" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ detailError }}</p>
        <div v-if="reasonPrompt" class="rounded-xl border border-line p-4">
          <FormField :label="`${reasonPrompt.label} reason`" required><TextInput v-model="reasonText" placeholder="Required (max 500 characters)" /></FormField>
          <div class="mt-3 flex justify-end gap-3">
            <BaseButton size="sm" variant="secondary" @click="reasonPrompt = null">Back</BaseButton>
            <BaseButton size="sm" variant="danger" :disabled="detailBusy || !reasonText.trim()" @click="runAction(reasonPrompt.action)">{{ detailBusy ? 'Working…' : 'Confirm' }}</BaseButton>
          </div>
        </div>
        <footer class="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          <BaseButton v-if="detail.row.status === 'draft'" variant="danger" :disabled="detailBusy" @click="rowDelete(detail.kind, detail.row as never, detailHeader.number)">Delete draft</BaseButton>
          <BaseButton v-if="detail.kind === 'orders' && (detail.row.status === 'sent' || detail.row.status === 'partially_received')" variant="primary" :disabled="detailBusy" @click="openGrnCreate(detail.row as PurchaseOrder)">Receive goods</BaseButton>
          <BaseButton v-for="btn in detailActions" :key="btn.key" :variant="btn.variant" :disabled="detailBusy" @click="confirmAction(btn.key)">{{ btn.label }}</BaseButton>
        </footer>
      </div>
    </ModalShell>

    <ConfirmDialog
      :open="!!detailDelete"
      title="Delete draft"
      :message="`Delete draft ${detailDelete?.number ?? ''}? This cannot be undone.`"
      confirm-label="Delete"
      tone="danger"
      :loading="detailDeleteBusy"
      @confirm="runRowDelete"
      @cancel="detailDelete = null"
    />
    <p v-if="detailDeleteError && !detailDelete" role="alert" class="fixed bottom-4 right-4 z-[80] rounded-lg bg-rose-600 px-4 py-3 text-sm text-white shadow-lg">{{ detailDeleteError }}</p>
  </div>
</template>
