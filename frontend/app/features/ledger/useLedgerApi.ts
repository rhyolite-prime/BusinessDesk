import type { AccountDetail, AccountDetailInput } from './account-detail-types'
import { standardAccountTypes } from './setup-data'
import type { AccountsResponse, DashboardResponse, LedgerAccount } from './types'

export function useLedgerApi() {
  const requestFetch = useRequestFetch()
  const getRequest = <T>(path: string, query?: Record<string, string>) =>
    requestFetch<T>(`/api/ledger/${path}`, query ? { query } : undefined)
  const selectedUnit = useState<string>('ledger-accounting-unit', () => '')
  // Older ledger pickers retain their display shape, but read only live,
  // explicitly scoped accounts. Never silently choose a unit or use demo rows.
  async function accountOptions(query: Record<string, string> = {}): Promise<AccountsResponse> {
    const unit = query.accountingUnitId || selectedUnit.value
    if (!unit) throw new Error('Select an accounting unit on Chart of Account Details before loading account choices.')
    async function pages<T>(resource: string): Promise<T[]> {
      const rows: T[] = []
      for (let pageNo = 1; ; pageNo++) {
        if (pageNo > 50) throw new Error('Too many account choices. Contact your administrator.')
        const result = await requestFetch<{ data: T[]; totalPages: number }>(`/api/ledger/${resource}`, { query: { accountingUnitId: unit, pageNo, pageSize: 200 } })
        rows.push(...result.data)
        if (!result.data.length || pageNo >= result.totalPages) return rows
      }
    }
    const [rows, heads, currencies, unitRow] = await Promise.all([pages<AccountDetail>('accounts'), pages<{ id: string; name: string }>('account-heads'), requestFetch<{ id: string; code: string }[]>('/api/ledger/accounting-unit-currencies'), requestFetch<{ baseCurrencyId: string }>(`/api/ledger/accounting-units/${unit}`)])
    const term = (query.search || '').trim().toLowerCase()
    const items: LedgerAccount[] = rows.map<LedgerAccount>(row => ({ id: row.id, accountNumber: row.accountNumber, name: row.accountName,
      group: heads.find(head => head.id === row.accountGroupId)?.name || 'Unavailable head', accountType: standardAccountTypes[row.accountType] || 'Unknown',
      currency: currencies.find(currency => currency.id === (row.currencyId || unitRow.baseCurrencyId))?.code || '', accountHeaderId: row.accountHeaderId,
      balance: '', status: row.status === 'active' ? 'Active' : 'Inactive' }))
      .filter(row => Boolean(row.currency) && (!query.status || row.status.toLowerCase() === query.status.toLowerCase()) && (!term || `${row.accountNumber} ${row.name} ${row.group}`.toLowerCase().includes(term)))
    return { items, total: items.length }
  }

  return {
    dashboard: () => getRequest<DashboardResponse>('dashboard'),
    accounts: accountOptions,
    createAccount: (input: AccountDetailInput) =>
      requestFetch<AccountDetail>('/api/ledger/accounts', { method: 'POST', body: input }),
    updateAccount: (id: string, input: AccountDetailInput) =>
      requestFetch<AccountDetail>(`/api/ledger/accounts/${encodeURIComponent(id)}`, { method: 'PUT', body: input }),
    deleteAccount: (id: string, accountingUnitId: string) =>
      requestFetch<{ id: string; deleted: boolean }>(`/api/ledger/accounts/${encodeURIComponent(id)}`, { method: 'DELETE', query: { accountingUnitId } }),
  }
}
