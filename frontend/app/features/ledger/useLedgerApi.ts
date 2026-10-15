import type { AccountsResponse, CreateAccountInput, CreateJournalDraftInput, DashboardResponse, JournalValidationResponse, JournalsResponse, JournalSummary, LedgerAccount } from './types'

export function useLedgerApi() {
  const requestFetch = useRequestFetch()
  const getRequest = <T>(path: string, query?: Record<string, string>) =>
    requestFetch<T>(`/api/ledger/${path}`, query ? { query } : undefined)
  const postRequest = <T>(path: string, body: CreateAccountInput | CreateJournalDraftInput) =>
    $fetch<T>(`/api/ledger/${path}`, { method: 'POST', body })
  const patchRequest = <T>(path: string, body: CreateAccountInput) =>
    $fetch<T>(`/api/ledger/${path}`, { method: 'PATCH', body })
  const deleteRequest = <T>(path: string) =>
    $fetch<T>(`/api/ledger/${path}`, { method: 'DELETE' })

  return {
    dashboard: () => getRequest<DashboardResponse>('dashboard'),
    accounts: (query: Record<string, string> = {}) =>
      getRequest<AccountsResponse>('accounts', query),
    createAccount: (input: CreateAccountInput) =>
      postRequest<LedgerAccount>('accounts', input),
    updateAccount: (id: string, input: CreateAccountInput) =>
      patchRequest<LedgerAccount>(`accounts/${encodeURIComponent(id)}`, input),
    deleteAccount: (id: string) =>
      deleteRequest<{ id: string; deleted: boolean }>(`accounts/${encodeURIComponent(id)}`),
    journals: (query: Record<string, string> = {}) =>
      getRequest<JournalsResponse>('journals', query),
    createJournalDraft: (input: CreateJournalDraftInput) =>
      postRequest<JournalSummary>('journals', input),
    validateJournalDraft: (input: CreateJournalDraftInput) =>
      postRequest<JournalValidationResponse>('journals/validate', input),
  }
}
