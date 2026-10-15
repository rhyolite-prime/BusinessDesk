import type { AccountsResponse, CreateAccountInput, CreateJournalDraftInput, DashboardResponse, JournalValidationResponse, JournalsResponse, JournalSummary, LedgerAccount } from './types'

export function useLedgerApi() {
  const request = <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) =>
    $fetch<T>(`/api/ledger/${path}`, options)

  return {
    dashboard: () => request<DashboardResponse>('dashboard'),
    accounts: (query: Record<string, string> = {}) =>
      request<AccountsResponse>('accounts', { query }),
    createAccount: (input: CreateAccountInput) =>
      request<LedgerAccount>('accounts', { method: 'POST', body: input }),
    journals: (query: Record<string, string> = {}) =>
      request<JournalsResponse>('journals', { query }),
    createJournalDraft: (input: CreateJournalDraftInput) =>
      request<JournalSummary>('journals', { method: 'POST', body: input }),
    validateJournalDraft: (input: CreateJournalDraftInput) =>
      request<JournalValidationResponse>('journals/validate', { method: 'POST', body: input }),
  }
}
