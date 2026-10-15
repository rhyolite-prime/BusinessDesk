import type { AccountsResponse, CreateAccountInput, CreateJournalDraftInput, DashboardResponse, JournalValidationResponse, JournalsResponse, JournalSummary, LedgerAccount } from './types'

export function useLedgerApi() {
  const requestFetch = useRequestFetch()
  const getRequest = <T>(path: string, query?: Record<string, string>) =>
    requestFetch<T>(`/api/ledger/${path}`, query ? { query } : undefined)
  const postRequest = <T>(path: string, body: CreateAccountInput | CreateJournalDraftInput) =>
    $fetch<T>(`/api/ledger/${path}`, { method: 'POST', body })

  return {
    dashboard: () => getRequest<DashboardResponse>('dashboard'),
    accounts: (query: Record<string, string> = {}) =>
      getRequest<AccountsResponse>('accounts', query),
    createAccount: (input: CreateAccountInput) =>
      postRequest<LedgerAccount>('accounts', input),
    journals: (query: Record<string, string> = {}) =>
      getRequest<JournalsResponse>('journals', query),
    createJournalDraft: (input: CreateJournalDraftInput) =>
      postRequest<JournalSummary>('journals', input),
    validateJournalDraft: (input: CreateJournalDraftInput) =>
      postRequest<JournalValidationResponse>('journals/validate', input),
  }
}
