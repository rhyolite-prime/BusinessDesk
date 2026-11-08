import type {
  BalanceRecord,
  InventoryDashboard,
  ItemRecord,
  StockDocument,
  TransactionRecord,
  UomRecord,
  CategoryRecord,
  WarehouseRecord,
} from './inventory-types'

/** Shared paged-list response shape from the domain services. */
interface Paged<T> { items: T[]; total: number }

export function useInventory() {
  const request = useRequestFetch()
  // Shared accounting-unit selection with the ledger workspace, so operators
  // moving between modules keep the same unit context.
  const unitId = useState<string>('ledger-accounting-unit', () => '')
  async function units() {
    const rows: { id: string; code: string; name: string; isActive: boolean; baseCurrencyId: string }[] = []
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
  const list = <T,>(resource: string, query: Record<string, unknown>) =>
    request<Paged<T>>(`/api/inventory/${resource}`, { query })
  return {
    request,
    unitId,
    units,
    dashboard: () => request<InventoryDashboard>('/api/inventory/summary'),
    items: {
      list: (unit = unitId.value, q = '', page = 1, size = 20) =>
        list<ItemRecord>('items', { accountingUnitId: unit, q, page, size }),
      get: (id: string) => request<ItemRecord>('/api/inventory/items/' + id),
      card: (id: string) =>
        request<{ item: ItemRecord; balances: BalanceRecord[]; options?: unknown }>(
          `/api/inventory/items/${id}/card`,
        ),
      create: (body: Record<string, unknown>) =>
        request('/api/inventory/items', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request('/api/inventory/items/' + id, { method: 'PUT', body }),
      remove: (id: string, version: number) =>
        request('/api/inventory/items/' + id, { method: 'DELETE', query: { version } }),
    },
    uoms: {
      list: (unit = unitId.value, size = 200) => list<UomRecord>('uoms', { accountingUnitId: unit, size }),
    },
    categories: {
      list: (unit = unitId.value, size = 200) =>
        list<CategoryRecord>('item-categories', { accountingUnitId: unit, size }),
    },
    warehouses: {
      list: (unit = unitId.value, q = '', page = 1, size = 100) =>
        list<WarehouseRecord>('warehouses', { accountingUnitId: unit, q, page, size }),
      create: (body: Record<string, unknown>) =>
        request('/api/inventory/warehouses', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request('/api/inventory/warehouses/' + id, { method: 'PUT', body }),
      remove: (id: string, version: number) =>
        request('/api/inventory/warehouses/' + id, { method: 'DELETE', query: { version } }),
    },
    balances: {
      list: (unit = unitId.value, filters: { itemId?: string; warehouseId?: string } = {}, page = 1) =>
        list<BalanceRecord>('balances', { accountingUnitId: unit, page, size: 50, ...filters }),
    },
    ledger: {
      list: (
        unit = unitId.value,
        filters: { itemId?: string; warehouseId?: string; dateFrom?: string; dateTo?: string } = {},
        page = 1,
      ) => list<TransactionRecord>('ledger', { accountingUnitId: unit, page, size: 50, ...filters }),
    },
    documents: {
      list: (
        unit = unitId.value,
        filters: { documentType?: string; status?: string; dateFrom?: string; dateTo?: string } = {},
        page = 1,
      ) => list<StockDocument>('documents', { accountingUnitId: unit, page, size: 20, ...filters }),
      get: (id: string) => request<StockDocument>(`/api/inventory/documents/${id}`),
      create: (body: Record<string, unknown>) =>
        request<{ id: string; documentNumber: string }>('/api/inventory/documents', {
          method: 'POST',
          body,
        }),
      nextNumber: (unit = unitId.value, documentType = 'receipt') =>
        request<{ number: string }>('/api/inventory/documents/next-number', {
          query: { accountingUnitId: unit, documentType },
        }),
      action: (id: string, action: string, body: Record<string, unknown> = {}) =>
        request(`/api/inventory/documents/${id}/${action}`, { method: 'POST', body }),
      remove: (id: string, version: number) =>
        request('/api/inventory/documents/' + id, { method: 'DELETE', query: { version } }),
    },
  }
}
