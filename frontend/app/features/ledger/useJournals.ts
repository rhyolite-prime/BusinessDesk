import type { Journal, JournalOptions } from './journal-types'
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
  return {
    request,
    unitId,
    units,
    options: (unit = unitId.value) =>
      request<JournalOptions>('/api/ledger/journals/options', {
        query: { accountingUnitId: unit },
      }),
    list: (unit = unitId.value) =>
      request<{ items: Journal[]; total: number }>('/api/ledger/journals', {
        query: { accountingUnitId: unit },
      }),
    get: (id: string, unit = unitId.value) =>
      request<Journal>(`/api/ledger/journals/${id}`, {
        query: { accountingUnitId: unit },
      }),
  }
}
