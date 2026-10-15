export interface LedgerMetric {
  key: string
  label: string
  amount: string
  currency: string
  changeLabel: string
  direction: 'up' | 'down' | 'neutral'
  note?: string
}

export interface DashboardResponse {
  accountingUnit: { id: string; name: string; code: string; baseCurrency: string }
  asOf: string
  metrics: LedgerMetric[]
  cashPosition: { label: string; amount: string; currency: string; change: string }[]
  recentJournals: JournalSummary[]
}

export interface LedgerAccount {
  id: string
  accountNumber: string
  name: string
  group: string
  accountType: string
  currency: string
  accountHeaderId?: string
  balance: string
  status: 'Active' | 'Inactive'
}

export interface JournalLineSummary {
  id?: string
  accountId: string
  accountNumber?: string
  accountName?: string
  referenceNumber?: string
  description: string
  organizationUnitId?: string
  organizationUnitName?: string
  transactionDate?: string
  chequeNumber?: string
  debit: string
  credit: string
}

export interface JournalSummary {
  id: string
  batchNumber: string
  description: string
  date: string
  source: string
  debit: string
  credit: string
  status: 'Draft' | 'Pending approval' | 'Approved' | 'Posted' | 'Reversed'
  preparer: string
  organizationUnitName?: string
  lineCount?: number
  lines?: JournalLineSummary[]
}

export interface CreateAccountInput {
  accountNumber: string
  name: string
  group: string
  accountType: string
  currency: string
  accountHeaderId?: string
  status?: 'Active' | 'Inactive'
}

export interface CreateJournalDraftInput {
  batchDate: string
  description: string
  organizationUnitId?: string
  lines: Array<{
    accountId: string
    accountName: string
    referenceNumber?: string
    description: string
    organizationUnitId?: string
    transactionDate?: string
    chequeNumber?: string
    debit: string
    credit: string
  }>
}

export interface JournalValidationResponse {
  valid: boolean
  balanced: boolean
  debitTotal: string
  creditTotal: string
  errors: string[]
}

export interface AccountsResponse {
  items: LedgerAccount[]
  total: number
}

export interface JournalsResponse {
  items: JournalSummary[]
  total: number
}
