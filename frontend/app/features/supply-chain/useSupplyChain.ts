// Types + requests for the Supply Chain workspace (requisitions / purchase
// orders / goods receipts). Field names mirror the SCM service projections.
export interface RequisitionLine {
  id?: string
  lineNumber?: number
  itemId: string
  itemCode?: string
  itemName?: string
  uomId: string
  uomCode?: string
  quantity: string
  orderedQuantity?: string
  estimatedUnitCost?: string
  estimatedAmount?: string
  status?: string
  neededByDate?: string
  notes?: string
}
export interface Requisition {
  id: string
  version?: number
  requisitionNumber: string
  requestDate: string
  requiredByDate?: string | null
  priority?: string
  status: string
  warehouseId?: string | null
  warehouseName?: string | null
  purpose?: string
  estimatedTotal?: string
  cancelReason?: string | null
  rejectionReason?: string | null
  createdAt?: string
  lines?: RequisitionLine[]
  events?: { action: string; newStatus: string; version: number; createdAt: string }[]
  history?: { action: string; newStatus: string; version: number; createdAt: string }[]
}
export interface OrderLine {
  id?: string
  lineNumber?: number
  itemId: string
  itemCode?: string
  itemName?: string
  uomId: string
  uomCode?: string
  conversionFactor?: string
  quantity: string
  receivedQuantity?: string
  rejectedQuantity?: string
  unitCost: string
  discountRate?: string
  taxRate?: string
  lineTotal?: string
  requisitionLineId?: string | null
  status?: string
}
export interface PurchaseOrder {
  id: string
  version?: number
  orderNumber: string
  supplierId: string
  supplierName?: string
  orderDate: string
  expectedDeliveryDate?: string | null
  status: string
  warehouseId: string
  warehouseName?: string
  currencyCode?: string
  exchangeRate?: string
  subTotal?: string
  taxTotal?: string
  grandTotal?: string
  supplierReference?: string
  cancelReason?: string | null
  rejectionReason?: string | null
  lines?: OrderLine[]
  events?: { action: string; newStatus: string; version: number; createdAt: string }[]
  history?: { action: string; newStatus: string; version: number; createdAt: string }[]
}
export interface ReceiptLine {
  id?: string
  lineNumber?: number
  orderLineId: string
  orderLineNumber?: number
  itemId: string
  itemCode?: string
  itemName?: string
  uomId: string
  uomCode?: string
  quantityReceived: string
  quantityAccepted: string
  quantityRejected: string
  unitCost: string
  batchId?: string | null
  serialNumbers?: string[]
  rejectionReason?: string
  status?: string
}
export interface PurchaseReceipt {
  id: string
  version?: number
  receiptNumber: string
  purchaseOrderId: string
  orderNumber?: string
  supplierId: string
  supplierName?: string
  warehouseId: string
  warehouseName?: string
  receiptDate: string
  status: string
  deliveryNoteNumber?: string
  isPosted?: boolean
  notes?: string
  cancelReason?: string | null
  lines?: ReceiptLine[]
  events?: { action: string; newStatus: string; version: number; createdAt: string }[]
  history?: { action: string; newStatus: string; version: number; createdAt: string }[]
}
/** Normalised paged result used by every supply chain screen. */
interface Paged<T> { items: T[]; total: number }
/** Envelope the SCM service returns for list operations. */
interface ListEnvelope<T> { data?: T[]; totalCount?: number | string }

/** Keep the response bodies compact for UI code: drop empty query keys. */
const clean = (query: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export function useSupplyChain() {
  const request = useRequestFetch()
  // Dynamic resource paths and methods are outside Nuxt's typed-route overloads.
  const call = request as unknown as (url: string, opts?: Record<string, unknown>) => Promise<any>
  const unitId = useState<string>('ledger-accounting-unit', () => '')
  const toPage = <T,>(r: ListEnvelope<T>): Paged<T> => ({
    items: Array.isArray(r?.data) ? r.data : [],
    total: Number(r?.totalCount ?? 0),
  })
  function crud<T extends { history?: unknown[]; events?: unknown[] }>(resource: 'requisitions' | 'orders' | 'receipts') {
    const base = `/api/scm/${resource}`
    return {
      list: (unit = unitId.value, q = '', status = '', page = 1, size = 20) =>
        request<ListEnvelope<T>>(base, { query: clean({ accountingUnitId: unit, q, status, page, size }) }).then(toPage<T>),
      /** Detail: the service returns the audit trail as `history`; expose it as `events`. */
      get: (id: string) =>
        request<T>(`${base}/${id}`).then((row) => ({ ...row, events: row.events ?? row.history ?? [] }) as T),
      create: (body: Record<string, unknown>) =>
        request<{ id: string } & Record<string, unknown>>(base, { method: 'POST', body }),
      /** Draft replacement. The body must carry the record `version`. */
      update: (id: string, body: Record<string, unknown>) =>
        request(`${base}/${id}`, { method: 'PUT', body }),
      nextNumber: (unit = unitId.value) =>
        request<{ documentNumber: string }>(`${base}/next-number`, { query: { accountingUnitId: unit } })
          .then((r) => ({ number: r.documentNumber })),
      /** Workflow transitions. Every transition carries the record `version`. */
      action: (id: string, action: string, body: Record<string, unknown> = {}) =>
        call(`${base}/${id}/${action}`, { method: 'POST', body }),
      remove: (id: string, version: number) =>
        request(`${base}/${id}`, { method: 'DELETE', query: { version } }),
    }
  }
  return {
    request,
    unitId,
    suppliers: {
      list: (query = '') =>
        request<{ data: { id: string; name: string; accountNumber?: string; status?: string }[] }>(
          '/api/shared/suppliers',
          { query: { pageNo: 1, pageSize: 100, query } },
        ),
    },
    items: {
      list: (unit = '', q = '') =>
        request<ListEnvelope<{ id: string; itemCode: string; name: string; trackingMethod?: string; baseUomId?: string; status?: string; isPurchasable?: boolean }>>(
          '/api/inventory/items',
          { query: clean({ accountingUnitId: unit, q, size: 100 }) },
        ).then(toPage),
      options: (unit = '') =>
        request<ListEnvelope<{ id: string; code: string; name: string }>>('/api/inventory/uoms', {
          query: clean({ accountingUnitId: unit, size: 200 }),
        }).then(toPage),
    },
    warehouses: {
      list: (unit = '') =>
        request<ListEnvelope<{ id: string; code: string; name: string }>>('/api/inventory/warehouses', {
          query: clean({ accountingUnitId: unit, size: 100 }),
        }).then(toPage),
    },
    requisitions: crud<Requisition>('requisitions'),
    orders: crud<PurchaseOrder>('orders'),
    receipts: crud<PurchaseReceipt>('receipts'),
  }
}
