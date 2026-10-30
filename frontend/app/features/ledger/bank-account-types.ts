export interface BankAccount {
  id: string
  accountingUnitId: string
  bankId: string
  bankName: string
  bankBranchId: string
  bankBranchName: string
  accountId: string
  accountName: string
  currencyId: string
  currencyName: string | null
  currencyCode: string | null
  accountNumber: string
  accountType: string
  address: string
  location: string
  contactPerson: string
  contactNumber: string
  chequeBookStart: string
  chequeBookEnd: string
  dateOpened: string | null
  isActive: boolean
}
export interface BankAccountOptions {
  banks: { id: string; name: string }[]
  branches: { id: string; bankId: string; name: string }[]
  accounts: { id: string; name: string; accountNumber: string; currencyId: string }[]
  currencies: { id: string; name: string; code: string }[]
}
export const emptyBankAccount = () => ({ bankId: '', bankBranchId: '', accountId: '', currencyId: '', accountNumber: '', accountType: 'Current Account', address: '', location: '', contactPerson: '', contactNumber: '', chequeBookStart: '', chequeBookEnd: '', dateOpened: '', isActive: true })
