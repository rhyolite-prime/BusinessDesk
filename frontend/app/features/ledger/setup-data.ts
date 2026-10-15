export type StandardAccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

export interface LedgerAccountHead {
  id: string
  name: string
  parentId: string | null
  standardAccountType: StandardAccountType
  sortOrder: number
  isActive: boolean
}

export interface LedgerAccountControl {
  id: string
  accountGroupId: string
  parentAccountHeaderId: string | null
  accountHeaderName: string
  minAccount: number
  maxAccount: number
  isActive: boolean
}

export interface LedgerBankAccount {
  id: string
  bankName: string
  bankBranchName: string
  accountId: string
  accountNumber: string
  accountType: string
  currency: string
  dateOpened: string
  location: string
  address: string
  contactPerson: string
  contactNumber: string
  chequeBookStart: string
  chequeBookEnd: string
  isActive: boolean
}

export const ledgerSetupIds = {
  assets: 'head-assets',
  currentAssets: 'head-current-assets',
  nonCurrentAssets: 'head-non-current-assets',
  liabilities: 'head-liabilities',
  currentLiabilities: 'head-current-liabilities',
  equity: 'head-equity',
  revenue: 'head-revenue',
  expenses: 'head-expenses',
  cashControl: 'control-cash',
  pettyCashControl: 'control-petty-cash',
  bankControl: 'control-bank-accounts',
  receivablesControl: 'control-receivables',
  ppeControl: 'control-ppe',
  payablesControl: 'control-payables',
  taxControl: 'control-tax-payables',
  equityControl: 'control-share-capital',
  revenueControl: 'control-operating-revenue',
  expensesControl: 'control-operating-expenses',
  fxControl: 'control-fx-loss',
} as const

export const standardAccountTypes: StandardAccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
export const ledgerCurrencyOptions = [
  { code: 'GHS', name: 'Ghana cedi' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Pound sterling' },
]
const accountHeadSeed: LedgerAccountHead[] = [
  { id: ledgerSetupIds.assets, name: 'Assets', parentId: null, standardAccountType: 'Asset', sortOrder: 10, isActive: true },
  { id: ledgerSetupIds.currentAssets, name: 'Current Assets', parentId: ledgerSetupIds.assets, standardAccountType: 'Asset', sortOrder: 20, isActive: true },
  { id: ledgerSetupIds.nonCurrentAssets, name: 'Non-current Assets', parentId: ledgerSetupIds.assets, standardAccountType: 'Asset', sortOrder: 30, isActive: true },
  { id: ledgerSetupIds.liabilities, name: 'Liabilities', parentId: null, standardAccountType: 'Liability', sortOrder: 40, isActive: true },
  { id: ledgerSetupIds.currentLiabilities, name: 'Current Liabilities', parentId: ledgerSetupIds.liabilities, standardAccountType: 'Liability', sortOrder: 50, isActive: true },
  { id: ledgerSetupIds.equity, name: 'Equity', parentId: null, standardAccountType: 'Equity', sortOrder: 60, isActive: true },
  { id: ledgerSetupIds.revenue, name: 'Revenue', parentId: null, standardAccountType: 'Revenue', sortOrder: 70, isActive: true },
  { id: ledgerSetupIds.expenses, name: 'Expenses', parentId: null, standardAccountType: 'Expense', sortOrder: 80, isActive: true },
]

const accountControlSeed: LedgerAccountControl[] = [
  { id: ledgerSetupIds.cashControl, accountGroupId: ledgerSetupIds.currentAssets, parentAccountHeaderId: null, accountHeaderName: 'Cash and cash equivalents', minAccount: 1000, maxAccount: 1099, isActive: true },
  { id: ledgerSetupIds.pettyCashControl, accountGroupId: ledgerSetupIds.currentAssets, parentAccountHeaderId: ledgerSetupIds.cashControl, accountHeaderName: 'Cash on hand', minAccount: 1000, maxAccount: 1009, isActive: true },
  { id: ledgerSetupIds.bankControl, accountGroupId: ledgerSetupIds.currentAssets, parentAccountHeaderId: ledgerSetupIds.cashControl, accountHeaderName: 'Bank accounts', minAccount: 1010, maxAccount: 1099, isActive: true },
  { id: ledgerSetupIds.receivablesControl, accountGroupId: ledgerSetupIds.currentAssets, parentAccountHeaderId: null, accountHeaderName: 'Trade receivables', minAccount: 1100, maxAccount: 1199, isActive: true },
  { id: ledgerSetupIds.ppeControl, accountGroupId: ledgerSetupIds.nonCurrentAssets, parentAccountHeaderId: null, accountHeaderName: 'Property, plant and equipment', minAccount: 1500, maxAccount: 1599, isActive: true },
  { id: ledgerSetupIds.payablesControl, accountGroupId: ledgerSetupIds.currentLiabilities, parentAccountHeaderId: null, accountHeaderName: 'Trade payables', minAccount: 2000, maxAccount: 2299, isActive: true },
  { id: ledgerSetupIds.taxControl, accountGroupId: ledgerSetupIds.currentLiabilities, parentAccountHeaderId: ledgerSetupIds.payablesControl, accountHeaderName: 'Tax payables', minAccount: 2200, maxAccount: 2299, isActive: true },
  { id: ledgerSetupIds.equityControl, accountGroupId: ledgerSetupIds.equity, parentAccountHeaderId: null, accountHeaderName: 'Share capital', minAccount: 3000, maxAccount: 3099, isActive: true },
  { id: ledgerSetupIds.revenueControl, accountGroupId: ledgerSetupIds.revenue, parentAccountHeaderId: null, accountHeaderName: 'Operating revenue', minAccount: 4000, maxAccount: 4099, isActive: true },
  { id: ledgerSetupIds.expensesControl, accountGroupId: ledgerSetupIds.expenses, parentAccountHeaderId: null, accountHeaderName: 'Operating expenses', minAccount: 5000, maxAccount: 5099, isActive: true },
  { id: ledgerSetupIds.fxControl, accountGroupId: ledgerSetupIds.expenses, parentAccountHeaderId: null, accountHeaderName: 'Foreign exchange loss', minAccount: 5100, maxAccount: 5199, isActive: true },
]

const bankAccountSeed: LedgerBankAccount[] = [
  {
    id: 'bank-account-demo-1', bankName: 'GCB Bank PLC', bankBranchName: 'Accra Main', accountId: 'acc-1010',
    accountNumber: 'BD-DEMO-001', accountType: 'Current Account', currency: 'GHS', dateOpened: '2023-06-12',
    location: 'Accra', address: 'Independence Avenue, Accra', contactPerson: 'Ama Owusu', contactNumber: '+233 20 000 0101',
    chequeBookStart: '00012001', chequeBookEnd: '00012100', isActive: true,
  },
  {
    id: 'bank-account-demo-2', bankName: 'Ecobank Ghana PLC', bankBranchName: 'Airport City', accountId: 'acc-1020',
    accountNumber: 'BD-DEMO-002', accountType: 'Current Account', currency: 'USD', dateOpened: '2024-01-08',
    location: 'Accra', address: 'Airport City, Accra', contactPerson: 'Kwame Osei', contactNumber: '+233 24 000 0202',
    chequeBookStart: '00034001', chequeBookEnd: '00034100', isActive: true,
  },
]

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useLedgerSetup() {
  const accountHeads = useState<LedgerAccountHead[]>('ledger-setup-account-heads', () => accountHeadSeed.map((head) => ({ ...head })))
  const accountControls = useState<LedgerAccountControl[]>('ledger-setup-account-controls', () => accountControlSeed.map((control) => ({ ...control })))
  const bankAccounts = useState<LedgerBankAccount[]>('ledger-setup-bank-accounts', () => bankAccountSeed.map((account) => ({ ...account })))

  function accountHeadPath(id: string | null | undefined) {
    const path: string[] = []
    const seen = new Set<string>()
    let head = accountHeads.value.find((item) => item.id === id)
    while (head && !seen.has(head.id)) {
      seen.add(head.id)
      path.unshift(head.name)
      head = accountHeads.value.find((item) => item.id === head?.parentId)
    }
    return path.join(' / ')
  }

  function accountControlPath(id: string | null | undefined) {
    const path: string[] = []
    const seen = new Set<string>()
    let control = accountControls.value.find((item) => item.id === id)
    while (control && !seen.has(control.id)) {
      seen.add(control.id)
      path.unshift(control.accountHeaderName)
      control = accountControls.value.find((item) => item.id === control?.parentAccountHeaderId)
    }
    return path.join(' / ')
  }

  function saveAccountHead(input: Omit<LedgerAccountHead, 'sortOrder'> & { sortOrder?: number }) {
    const index = accountHeads.value.findIndex((head) => head.id === input.id)
    if (index >= 0) {
      accountHeads.value[index] = { ...accountHeads.value[index], ...input }
      return accountHeads.value[index]
    }
    const sortOrder = input.sortOrder ?? Math.max(0, ...accountHeads.value.map((head) => head.sortOrder)) + 10
    const head: LedgerAccountHead = { ...input, id: input.id || makeId('head'), sortOrder }
    accountHeads.value.push(head)
    return head
  }

  function removeAccountHead(id: string) {
    const inUse = accountHeads.value.some((head) => head.parentId === id) || accountControls.value.some((control) => control.accountGroupId === id)
    if (inUse) return false
    accountHeads.value = accountHeads.value.filter((head) => head.id !== id)
    return true
  }

  function saveAccountControl(input: LedgerAccountControl) {
    const index = accountControls.value.findIndex((control) => control.id === input.id)
    if (index >= 0) {
      accountControls.value[index] = { ...input }
      return accountControls.value[index]
    }
    const control = { ...input, id: input.id || makeId('control') }
    accountControls.value.push(control)
    return control
  }

  function removeAccountControl(id: string) {
    if (accountControls.value.some((control) => control.parentAccountHeaderId === id)) return false
    accountControls.value = accountControls.value.filter((control) => control.id !== id)
    return true
  }

  function saveBankAccount(input: LedgerBankAccount) {
    const index = bankAccounts.value.findIndex((account) => account.id === input.id)
    if (index >= 0) {
      bankAccounts.value[index] = { ...input }
      return bankAccounts.value[index]
    }
    const account = { ...input, id: input.id || makeId('bank-account') }
    bankAccounts.value.unshift(account)
    return account
  }

  function removeBankAccount(id: string) {
    bankAccounts.value = bankAccounts.value.filter((account) => account.id !== id)
  }

  return {
    accountHeads,
    accountControls,
    bankAccounts,
    accountHeadPath,
    accountControlPath,
    saveAccountHead,
    removeAccountHead,
    saveAccountControl,
    removeAccountControl,
    saveBankAccount,
    removeBankAccount,
  }
}
