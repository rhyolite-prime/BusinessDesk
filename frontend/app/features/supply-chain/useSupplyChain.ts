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
}
interface Paged<T> { items: T[]; total: number }

export function useSupplyChain() {
  const request = useRequestFetch()
  const unitId = useState<string>('ledger-accounting-unit', () => '')
  function crud<T>(resource: 'requisitions' | 'orders' | 'receipts') {
    return {
      list: (unit = unitId.value, q = '', status = '', page = 1, size = 20) =>
        request<Paged<T>>(`/api/scm/${resource}`, { query: { accountingUnitId: unit, q, status, page, size } }),
      get: (id: string) => request<T>(`/api/scm/${resource}/${id}`),
      create: (body: Record<string, unknown>) =>
        request<{ id: string } & Record<string, unknown>>(`/api/scm/${resource}`, { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request('/api/scm/' + resource + '/' + id, { method: 'PUT', body }),
      nextNumber: (unit = unitId.value) =>
        request<{ number: string }>(`/api/scm/${resource}/next-number`, { query: { accountingUnitId: unit } }),
      action: (id: string, action: string, body: Record<string, unknown> = {}) =>
        request(`/api/scm/${resource}/${id}/${action}`, { method: 'POST', body }),
      remove: (id: string, version: number) =>
        request('/api/scm/' + resource + '/' + id, { method: 'DELETE', query: { version } }),
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
        request<Paged<{ id: string; itemCode: string; name: string; trackingMethod?: string }>>(
          '/api/inventory/items',
          { query: { accountingUnitId: unit, q, size: 100 } },
        ),
      options: (unit = '') =>
        request<Paged<{ id: string; code: string; name: string }>>('/api/inventory/uoms', {
          query: { accountingUnitId: unit, size: 200 },
        }),
    },
    warehouses: {
      list: (unit = '') =>
        request<Paged<{ id: string; code: string; name: string }>>('/api/inventory/warehouses', {
          query: { accountingUnitId: unit, size: 100 },
        }),
    },
    requisitions: crud<Requisition>('requisitions'),
    orders: crud<PurchaseOrder>('orders'),
    receipts: crud<PurchaseReceipt>('receipts'),
  }
}
