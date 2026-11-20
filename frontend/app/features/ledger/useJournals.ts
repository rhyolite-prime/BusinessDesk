import type { Journal, JournalOptions, JournalFilterParams } from './journal-types'
export function useJournals() {
  const request = useRequestFetch()
  const unitId = useState<string>('ledger-accounting-unit', () => '')
  async function units() {
    const rows: {
      id: string
      code: string
      name: string
      isActive: boolean
    }[] = []
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
  // Use the exact tenant-readable catalog displayed under Shared Config.
  async function currencies() {
    const rows: {
      id: string
      code: string
      name: string
      isActive: boolean
    }[] = []
    for (let pageNo = 1; ; pageNo++) {
      if (pageNo > 50) throw new Error('Too many currencies')
      const result = await request<{ data: typeof rows; totalPages: number }>(
        '/api/shared/currencies',
        { query: { pageNo, pageSize: 200 } },
      )
      rows.push(...result.data)
      if (!result.data.length || pageNo >= result.totalPages) break
    }
    return rows.filter((currency) => currency.isActive)
  }
  return {
    request,
    unitId,
    units,
    options: async (unit = unitId.value): Promise<JournalOptions> => {
      const [options, catalog] = await Promise.all([
        request<JournalOptions>('/api/ledger/journals/options', {
          query: { accountingUnitId: unit },
        }),
        currencies(),
      ])
      return { ...options, currencies: catalog }
    },
    nextNumber: (unit = unitId.value) =>
      request<{ batchNumber: string; reserved: boolean }>(
        '/api/ledger/journals/next-number',
        { query: { accountingUnitId: unit } },
      ),
    list: (unit = unitId.value, filters?: JournalFilterParams) => {
      const from = filters?.dateFrom || filters?.startDate
      const to = filters?.dateTo || filters?.endDate
      return request<{
        items: Journal[]
        total: number
        pageNo?: number
        pageSize?: number
        totalPages?: number
      }>('/api/ledger/journals', {
        query: {
          accountingUnitId: unit,
          ...(from ? { dateFrom: from } : {}),
          ...(to ? { dateTo: to } : {}),
          ...(filters?.status ? { status: filters?.status } : {}),
          ...(filters?.search ? { search: filters?.search } : {}),
          ...(filters?.pageNo ? { pageNo: filters?.pageNo } : {}),
          ...(filters?.pageSize ? { pageSize: filters?.pageSize } : {}),
        },
      })
    },
    get: (id: string, unit = unitId.value) =>
      request<Journal>(`/api/ledger/journals/${id}`, {
        query: { accountingUnitId: unit },
      }),
  }
}
