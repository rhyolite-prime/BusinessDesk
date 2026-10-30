import type { AccountsResponse, DashboardResponse, LedgerAccount } from '../../app/features/ledger/types'

export const demoAccounts: LedgerAccount[] = [
  { id: 'acc-1000', accountNumber: '1000', name: 'Cash on Hand', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-petty-cash', balance: '12450.00', status: 'Active' },
  { id: 'acc-12307', accountNumber: '12307', name: 'Petty Cash — CBS', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-petty-cash', balance: '1482.00', status: 'Active' },
  { id: 'acc-1010', accountNumber: '1010', name: 'Bank — Main Operating', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-bank-accounts', balance: '548219.75', status: 'Active' },
  { id: 'acc-1020', accountNumber: '1020', name: 'Bank — USD Account', group: 'Current Assets', accountType: 'Asset', currency: 'USD', accountHeaderId: 'control-bank-accounts', balance: '18750.00', status: 'Active' },
  { id: 'acc-1100', accountNumber: '1100', name: 'Trade Receivables', group: 'Current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-receivables', balance: '193420.83', status: 'Active' },
  { id: 'acc-1500', accountNumber: '1500', name: 'Office Equipment', group: 'Non-current Assets', accountType: 'Asset', currency: 'GHS', accountHeaderId: 'control-ppe', balance: '88400.00', status: 'Active' },
  { id: 'acc-2000', accountNumber: '2000', name: 'Trade Payables', group: 'Current Liabilities', accountType: 'Liability', currency: 'GHS', accountHeaderId: 'control-payables', balance: '98210.40', status: 'Active' },
  { id: 'acc-2200', accountNumber: '2200', name: 'Withholding Tax Payable', group: 'Current Liabilities', accountType: 'Liability', currency: 'GHS', accountHeaderId: 'control-tax-payables', balance: '18450.00', status: 'Active' },
  { id: 'acc-3000', accountNumber: '3000', name: 'Stated Capital', group: 'Equity', accountType: 'Equity', currency: 'GHS', accountHeaderId: 'control-share-capital', balance: '400000.00', status: 'Active' },
  { id: 'acc-4000', accountNumber: '4000', name: 'Service Revenue', group: 'Revenue', accountType: 'Revenue', currency: 'GHS', accountHeaderId: 'control-operating-revenue', balance: '389250.00', status: 'Active' },
  { id: 'acc-5000', accountNumber: '5000', name: 'Operating Expenses', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '124180.43', status: 'Active' },
  { id: 'acc-50016', accountNumber: '50016', name: 'Transport & Travels', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '0.00', status: 'Active' },
  { id: 'acc-50018', accountNumber: '50018', name: 'Food & Entertainment', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '0.00', status: 'Active' },
  { id: 'acc-50023', accountNumber: '50023', name: 'PC Hardware Software', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '0.00', status: 'Active' },
  { id: 'acc-50029', accountNumber: '50029', name: 'Postal Expenses', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '0.00', status: 'Active' },
  { id: 'acc-50050', accountNumber: '50050', name: 'Telephone & Communications', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-operating-expenses', balance: '0.00', status: 'Active' },
  { id: 'acc-5100', accountNumber: '5100', name: 'Foreign Exchange Loss', group: 'Expenses', accountType: 'Expense', currency: 'GHS', accountHeaderId: 'control-fx-loss', balance: '1820.14', status: 'Inactive' },
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
  recentJournals: [],
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
