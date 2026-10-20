import { useBankAccounts } from './useBankAccounts'
import { useDefaultGlNumbers } from './useDefaultGlNumbers'
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

export interface LedgerImprestCategory {
  id: string
  name: string
}

export interface LedgerPettyCashRecipient {
  id: string
  recipient: string
  phoneNo: string
  email: string
}

export interface LedgerDefaultGlNumbers {
  id: string
  accountPayablesBankAccountId: string
  payrollBankAccountId: string
  salesBankAccountId: string
  accountsReceivableBankAccountId: string
  accountsReceivableAccountId: string
  accountsPayableAccountId: string
  withholdingTaxAccountId: string
  imprestCategoryId: string
  creditPurchasesAccountId: string
  advanceFromCustomerAccountId: string
  covidTaxReceivedAccountId: string
  communicationsServiceTaxReceivedAccountId: string
  inventoryAccountId: string
  salesRevenueAccountId: string
  stockPurchasesAccountId: string
  currentEarningsAccountId: string
  retainedEarningsAccountId: string
  vatReceivedAccountId: string
  vatRate: number
  imprestGlAccountId: string
  pettyCashGlAccountId: string
  purchasesBankAccountId: string
  advanceToSupplierAccountId: string
  covidTaxPaidAccountId: string
  communicationsServiceTaxPaidAccountId: string
  goodsInTransitAccountId: string
  unrealizedFxLossAccountId: string
  unrealizedFxGainAccountId: string
  realizedFxLossAccountId: string
  realizedFxGainAccountId: string
  vatPaidAccountId: string
  getflReceivedAccountId: string
  getflPaidAccountId: string
  nhilReceivedAccountId: string
  nhilPaidAccountId: string
  socialSecurityEmployerPortionDefaultExpenseGl: string
  socialSecurityEmployeePortionDefaultExpenseGl: string
  socialSecurityEmployerPortionDefaultLiabilityGl: string
  socialSecurityEmployeePortionDefaultLiabilityGl: string
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

const imprestCategorySeed: LedgerImprestCategory[] = [
  { id: 'imprest-category-travel', name: 'Travel advance' },
  { id: 'imprest-category-field', name: 'Field operations' },
  { id: 'imprest-category-training', name: 'Training expenses' },
  { id: 'imprest-category-emergency', name: 'Emergency support' },
]

const pettyCashRecipientSeed: LedgerPettyCashRecipient[] = [
  { id: 'petty-cash-recipient-ama', recipient: 'Ama Owusu', phoneNo: '+233 24 555 0101', email: 'ama.owusu@example.com' },
  { id: 'petty-cash-recipient-kwame', recipient: 'Kwame Osei', phoneNo: '+233 20 555 0202', email: 'kwame.osei@example.com' },
  { id: 'petty-cash-recipient-abena', recipient: 'Abena Mensah', phoneNo: '+233 50 555 0303', email: 'abena.mensah@example.com' },
]

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useLedgerSetup() {
  const { defaultGlNumbers } = useDefaultGlNumbers()
  const accountHeads = useState<LedgerAccountHead[]>('ledger-setup-account-heads', () => accountHeadSeed.map((head) => ({ ...head })))
  const accountControls = useState<LedgerAccountControl[]>('ledger-setup-account-controls', () => accountControlSeed.map((control) => ({ ...control })))
  const { bankAccounts } = useBankAccounts()
  const imprestCategories = useState<LedgerImprestCategory[]>('ledger-setup-imprest-categories', () => imprestCategorySeed.map((category) => ({ ...category })))
  const pettyCashRecipients = useState<LedgerPettyCashRecipient[]>('ledger-setup-petty-cash-recipients', () => pettyCashRecipientSeed.map((recipient) => ({ ...recipient })))

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

  function saveImprestCategory(input: Omit<LedgerImprestCategory, 'id'> & { id?: string }) {
    const id = input.id || makeId('imprest-category')
    const category = { id, name: input.name.trim() }
    const index = imprestCategories.value.findIndex((item) => item.id === id)
    if (index >= 0) imprestCategories.value[index] = category
    else imprestCategories.value.unshift(category)
    return category
  }

  function removeImprestCategory(id: string) {
    imprestCategories.value = imprestCategories.value.filter((category) => category.id !== id)
    return true
  }

  function savePettyCashRecipient(input: Omit<LedgerPettyCashRecipient, 'id'> & { id?: string }) {
    const id = input.id || makeId('petty-cash-recipient')
    const recipient = {
      id,
      recipient: input.recipient.trim(),
      phoneNo: input.phoneNo.trim(),
      email: input.email.trim().toLowerCase(),
    }
    const index = pettyCashRecipients.value.findIndex((item) => item.id === id)
    if (index >= 0) pettyCashRecipients.value[index] = recipient
    else pettyCashRecipients.value.unshift(recipient)
    return recipient
  }

  function removePettyCashRecipient(id: string) {
    pettyCashRecipients.value = pettyCashRecipients.value.filter((recipient) => recipient.id !== id)
  }

  return {
    accountHeads,
    accountControls,
    bankAccounts,
    imprestCategories,
    pettyCashRecipients,
    defaultGlNumbers,
    accountHeadPath,
    accountControlPath,
    saveAccountHead,
    removeAccountHead,
    saveAccountControl,
    removeAccountControl,
    saveImprestCategory,
    removeImprestCategory,
    savePettyCashRecipient,
    removePettyCashRecipient,
  }
}
