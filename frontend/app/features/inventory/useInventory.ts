import type {
  BalanceRecord,
  BatchRecord,
  BinLocationRecord,
  CategoryRecord,
  InventoryDashboard,
  ItemRecord,
  ItemSupplierRecord,
  ItemWarehouseRecord,
  PeriodCloseRecord,
  SerialRecord,
  SnapshotRecord,
  StockDocument,
  TransactionRecord,
  UomConversionRecord,
  UnitRecord,
  UomRecord,
  WarehouseRecord,
} from './inventory-types'

/** Normalised paged result used by every inventory screen. */
export interface Page<T> { items: T[]; total: number }

/** Envelope the inventory service returns for list operations. */
interface ListEnvelope<T> { data?: T[]; totalCount?: number | string }

export type InventoryQuery = Record<string, string | number | undefined>

const toPage = <T,>(r: ListEnvelope<T>): Page<T> => ({
  items: Array.isArray(r?.data) ? r.data : [],
  total: Number(r?.totalCount ?? 0),
})

/** Keep the response bodies compact for UI code: drop nulls/undefined query keys. */
const clean = (query: InventoryQuery) =>
  Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))

/** Shared accounting-unit selection with the ledger workspace, so operators
 * moving between modules keep the same unit context. */
export function useInventoryUnitId() {
  return useState<string>('ledger-accounting-unit', () => '')
}

export function useInventory() {
  const request = useRequestFetch()
  // Dynamic resource paths and methods are outside Nuxt's typed-route overloads.
  const call = request as unknown as (url: string, opts?: Record<string, unknown>) => Promise<any>
  const unitId = useInventoryUnitId()

  async function units(): Promise<UnitRecord[]> {
    const rows: UnitRecord[] = []
    for (let pageNo = 1; ; pageNo++) {
      if (pageNo > 50) throw new Error('Too many accounting units')
      const r = await request<{ data: typeof rows; totalPages: number }>(
        '/api/ledger/accounting-units',
        { query: { pageNo, pageSize: 200 } },
      )
      rows.push(...r.data)
      if (!r.data.length || pageNo >= r.totalPages) break
    }
    return rows.filter((u) => u.isActive)
  }

  const list = <T,>(resource: string, query: InventoryQuery) =>
    request<ListEnvelope<T>>(`/api/inventory/${resource}`, { query: clean(query) }).then(toPage<T>)

  /** Generic master-record endpoints: list / get / create / update / soft delete. */
  function master<T>(resource: string) {
    const base = `/api/inventory/${resource}`
    return {
      list: (query: InventoryQuery = {}) => list<T>(resource, query),
      get: (id: string) => request<T>(`${base}/${id}`),
      create: (body: Record<string, unknown>) =>
        call(base, { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        call(`${base}/${id}`, { method: 'PUT', body }),
      remove: (id: string, version: number) =>
        request(`${base}/${id}`, { method: 'DELETE', query: { version } }),
    }
  }

  const items = master<ItemRecord>('items')
  const warehouses = master<WarehouseRecord>('warehouses')

  return {
    request,
    unitId,
    units,
    dashboard: (unit = unitId.value) =>
      request<InventoryDashboard>('/api/inventory/summary', { query: clean({ accountingUnitId: unit }) }),

    items: {
      ...items,
      list: (unit = unitId.value, q = '', page = 1, size = 20) =>
        list<ItemRecord>('items', { accountingUnitId: unit, q, page, size }),
      /** Item detail with balances, recent movements and UOM conversions. */
      card: (id: string) =>
        request<ItemRecord & {
          balances: BalanceRecord[]
          recentMovements: TransactionRecord[]
          uomConversions: UomConversionRecord[]
        }>(`/api/inventory/items/${id}/card`),
    },

    uoms: master<UomRecord>('uoms'),
    categories: {
      ...master<CategoryRecord>('item-categories'),
      /** Dropdown source: active categories in the catalog. */
      options: () => list<CategoryRecord>('item-categories', { size: 100 }),
    },

    warehouses: {
      ...warehouses,
      list: (unit = unitId.value, q = '', page = 1, size = 100) =>
        list<WarehouseRecord>('warehouses', { accountingUnitId: unit, q, page, size }),
    },

    binLocations: master<BinLocationRecord>('bin-locations'),
    itemWarehouses: master<ItemWarehouseRecord>('item-warehouses'),
    itemSuppliers: master<ItemSupplierRecord>('item-suppliers'),
    itemUomConversions: master<UomConversionRecord>('item-uom-conversions'),
    batches: master<BatchRecord>('batches'),
    serials: master<SerialRecord>('serials'),

    balances: {
      list: (unit = unitId.value, filters: { itemId?: string; warehouseId?: string } = {}, page = 1, size = 50) =>
        list<BalanceRecord>('balances', { accountingUnitId: unit, page, size, ...filters }),
    },
    ledger: {
      list: (
        unit = unitId.value,
        filters: { itemId?: string; warehouseId?: string; dateFrom?: string; dateTo?: string } = {},
        page = 1,
        size = 50,
      ) => list<TransactionRecord>('ledger', { accountingUnitId: unit, page, size, ...filters }),
    },

    snapshots: {
      list: (unit = unitId.value, page = 1, size = 20) =>
        list<SnapshotRecord>('snapshots', { accountingUnitId: unit, page, size }),
      get: (id: string) => request<SnapshotRecord>(`/api/inventory/snapshots/${id}`),
      /** Capture a valuation snapshot of the unit's current stock. */
      capture: (body: { accountingUnitId: string; asOfDate: string; notes: string }) =>
        request<{ id: string; itemCount: number; totalQuantity: string; totalValue: string }>(
          '/api/inventory/snapshots',
          { method: 'POST', body },
        ),
    },
    closes: {
      list: (unit = unitId.value, page = 1, size = 20) =>
        list<PeriodCloseRecord>('closes', { accountingUnitId: unit, page, size }),
      get: (id: string) => request<PeriodCloseRecord>(`/api/inventory/closes/${id}`),
      /** Dry run: computes blockers for the period without sealing it. */
      prepare: (body: { accountingUnitId: string; periodId: string }) =>
        request<PeriodCloseRecord>('/api/inventory/closes', { method: 'POST', body: { ...body, action: 'prepare' } }),
      /** Seal the period. Rejected while stock documents remain unposted. */
      close: (body: { accountingUnitId: string; periodId: string }) =>
        request<PeriodCloseRecord>('/api/inventory/closes', { method: 'POST', body: { ...body, action: 'close' } }),
    },

    documents: {
      list: (
        unit = unitId.value,
        filters: { documentType?: string; status?: string; dateFrom?: string; dateTo?: string } = {},
        page = 1,
        size = 20,
      ) => list<StockDocument>('documents', { accountingUnitId: unit, page, size, ...filters }),
      get: (id: string) => request<StockDocument>(`/api/inventory/documents/${id}`),
      create: (body: Record<string, unknown>) =>
        request<{ id: string; documentNumber: string }>('/api/inventory/documents', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request<StockDocument>(`/api/inventory/documents/${id}`, { method: 'PUT', body }),
      nextNumber: (unit = unitId.value, documentType = 'receipt') =>
        request<{ documentNumber: string; reserved: boolean }>('/api/inventory/documents/next-number', {
          query: { accountingUnitId: unit, documentType },
        }).then((r) => ({ number: r.documentNumber })),
      /** Workflow transitions. Every transition carries the document version. */
      action: (id: string, action: string, body: Record<string, unknown> = {}) =>
        request<StockDocument>(`/api/inventory/documents/${id}/${action}`, { method: 'POST', body }),
      remove: (id: string, version: number) =>
        request('/api/inventory/documents/' + id, { method: 'DELETE', query: { version } }),
    },
  }
}
