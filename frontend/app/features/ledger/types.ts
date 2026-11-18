export type JournalStatusCode = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'rejected' | 'voided' | 'reversed'

export interface DashboardFilters {
  accountingUnitId: string
  dateFrom: string
  dateTo: string
  costCenterId: string
  includeChildCostCenters: boolean
  source: string
  currencyId: string
  /** Activity only; financial indicators always use posted entries. */
  status: JournalStatusCode | ''
}

export interface DashboardOptions {
  accountingUnits: { id: string; name: string; code: string; baseCurrency: string; fiscalYearStartMonth: number }[]
  costCenters: { id: string; name: string; parentId: string | null }[]
  currencies: { id: string; name: string; code: string }[]
  sources: string[]
}

export interface LedgerMetric {
  key: string
  label: string
  amount: string
  currency: string
  note: string
}

export interface DashboardResponse {
  accountingUnit: { id: string; name: string; code: string; baseCurrency: string }
  asOf: string
  filters: DashboardFilters
  metrics: LedgerMetric[]
  cashPosition: { label: string; amount: string; currency: string }[]
  postedLineCount: number
  unclassifiedLineCount: number
  reclassifiedLineCount: number
  journalCount: number
  pendingApprovalCount: number
  journalStatuses: { status: JournalStatusCode; label: string; count: number }[]
  pendingJournals: JournalSummary[]
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
  currencyCode?: string
  currencyName?: string
  exchangeRate?: string
  foreignDebit?: string
  foreignCredit?: string
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
  status: 'Draft' | 'Pending approval' | 'Approved' | 'Posted' | 'Rejected' | 'Voided' | 'Reversed'
  preparer: string
  organizationUnitName?: string
  isMultiCurrency?: boolean
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

export interface AccountsResponse {
  items: LedgerAccount[]
  total: number
}
