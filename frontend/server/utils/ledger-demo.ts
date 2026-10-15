import type { AccountsResponse, DashboardResponse, JournalsResponse, LedgerAccount, JournalSummary } from '../../app/features/ledger/types'

export const demoAccounts: LedgerAccount[] = [
  { id: 'acc-1000', accountNumber: '1000', name: 'Cash on Hand', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-petty-cash', balance: '12450.00', status: 'Active' },
  { id: 'acc-1010', accountNumber: '1010', name: 'Bank — Main Operating', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-bank-accounts', balance: '548219.75', status: 'Active' },
  { id: 'acc-1020', accountNumber: '1020', name: 'Bank — USD Account', group: 'Current Assets', accountType: 'Asset', currency: 'USD', accountHeaderId: 'control-bank-accounts', balance: '18750.00', status: 'Active' },
  { id: 'acc-1100', accountNumber: '1100', name: 'Trade Receivables', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-receivables', balance: '193420.83', status: 'Active' },
  { id: 'acc-1500', accountNumber: '1500', name: 'Office Equipment', group: 'Non-current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-ppe', balance: '88400.00', status: 'Active' },
  { id: 'acc-2000', accountNumber: '2000', name: 'Trade Payables', group: 'Current Liabilities', accountType: 'Liability', currency: 'GHS', accountHeaderId: 'control-payables', balance: '98210.40', status: 'Active' },
  { id: 'acc-2200', accountNumber: '2200', name: 'Withholding Tax Payable', group: 'Current Liabilities', accountType: 'Liability', currency: 'GHS', accountHeaderId: 'control-tax-payables', balance: '18450.00', status: 'Active' },
  { id: 'acc-3000', accountNumber: '3000', name: 'Stated Capital', group: 'Equity', accountType: 'Equity', currency: 'GHS', accountHeaderId: 'control-share-capital', balance: '400000.00', status: 'Active' },
  { id: 'acc-4000', accountNumber: '4000', name: 'Service Revenue', group: 'Revenue', accountType: 'Revenue', currency: 'GHS', accountHeaderId: 'control-operating-revenue', balance: '389250.00', status: 'Active' },
  { id: 'acc-5000', accountNumber: '5000', name: 'Operating Expenses', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '124180.43', status: 'Active' },
  { id: 'acc-5100', accountNumber: '5100', name: 'Foreign Exchange Loss', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-fx-loss', balance: '1820.14', status: 'Inactive' },
]

export const demoJournals: JournalSummary[] = [
  { id: 'jrn-001', batchNumber: 'GJ-2026-0042', description: 'Monthly depreciation — April', date: '2026-04-30', source: 'General journal', debit: '12500.00', credit: '12500.00', status: 'Posted', preparer: 'E. Mensah' },
  { id: 'jrn-002', batchNumber: 'GJ-2026-0041', description: 'Accrual — utilities', date: '2026-04-29', source: 'General journal', debit: '4830.00', credit: '4830.00', status: 'Pending approval', preparer: 'K. Agyeman' },
  { id: 'jrn-003', batchNumber: 'PV-2026-0118', description: 'Office supplies — Adom Trading', date: '2026-04-28', source: 'Payment voucher', debit: '2640.00', credit: '2640.00', status: 'Approved', preparer: 'M. Boateng' },
  { id: 'jrn-004', batchNumber: 'RC-2026-0076', description: 'Consulting receipt — Akua Co.', date: '2026-04-27', source: 'Cash receipt', debit: '18750.00', credit: '18750.00', status: 'Posted', preparer: 'E. Mensah' },
  { id: 'jrn-005', batchNumber: 'GJ-2026-0040', description: 'FX revaluation — USD balances', date: '2026-04-26', source: 'Revaluation', debit: '1820.14', credit: '1820.14', status: 'Draft', preparer: 'K. Agyeman' },
  { id: 'jrn-006', batchNumber: 'GJ-2026-0039', description: 'Correction — duplicate accrual', date: '2026-04-24', source: 'Reversal', debit: '930.00', credit: '930.00', status: 'Reversed', preparer: 'M. Boateng' },
]

export const demoDashboard: DashboardResponse = {
  accountingUnit: { id: 'unit-accra', name: 'Accra Operations', code: 'ACC-01', baseCurrency: 'GHS' },
  asOf: '2026-04-30',
  metrics: [
    { key: 'assets', label: 'Total assets', amount: '1248420.58', currency: 'GHS', changeLabel: '+8.2% vs last month', direction: 'up', note: 'Posted balances' },
    { key: 'liabilities', label: 'Total liabilities', amount: '482310.12', currency: 'GHS', changeLabel: '−2.4% vs last month', direction: 'down', note: 'Posted balances' },
    { key: 'revenue', label: 'Revenue', amount: '389250.00', currency: 'GHS', changeLabel: '+12.6% vs last month', direction: 'up', note: 'Year to date' },
    { key: 'expenditure', label: 'Expenditure', amount: '124180.43', currency: 'GHS', changeLabel: '+3.1% vs last month', direction: 'neutral', note: 'Year to date' },
  ],
  cashPosition: [
    { label: 'Cash on hand', amount: '12450.00', currency: 'GHS', change: '+2.1%' },
    { label: 'Main operating bank', amount: '548219.75', currency: 'GHS', change: '+5.8%' },
    { label: 'USD bank account', amount: '18750.00', currency: 'USD', change: 'As at 30 Apr' },
  ],
  recentJournals: demoJournals.slice(0, 5),
}

export function filterDemoAccounts(query: Record<string, unknown>): AccountsResponse {
  const search = String(query.search ?? '').trim().toLowerCase()
  const status = String(query.status ?? '').trim().toLowerCase()
  const items = demoAccounts.filter((account) => {
    const matchesSearch = !search || [account.accountNumber, account.name, account.group, account.accountType].some((value) => value.toLowerCase().includes(search))
    const matchesStatus = !status || account.status.toLowerCase() === status
    return matchesSearch && matchesStatus
  })
  return { items, total: items.length }
}

export function filterDemoJournals(query: Record<string, unknown>): JournalsResponse {
  const search = String(query.search ?? '').trim().toLowerCase()
  const status = String(query.status ?? '').trim().toLowerCase()
  const items = demoJournals.filter((journal) => {
    const matchesSearch = !search || [journal.batchNumber, journal.description, journal.source, journal.preparer].some((value) => value.toLowerCase().includes(search))
    const matchesStatus = !status || journal.status.toLowerCase().includes(status)
    return matchesSearch && matchesStatus
  })
  return { items, total: items.length }
}
