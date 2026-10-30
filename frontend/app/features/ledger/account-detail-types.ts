export interface AccountDetail {
  id: string
  accountingUnitId: string
  accountHeaderId: string
  accountGroupId: string
  accountNumber: string
  accountName: string
  accountType: number
  currencyId: string | null
  status: 'active' | 'inactive'
  allowManualPosting: boolean
  isControlAccount: boolean
}
export interface AccountDetailInput {
  accountingUnitId: string
  accountHeaderId: string
  accountNumber: string
  accountName: string
  currencyId: string | null
  status: 'active' | 'inactive'
  allowManualPosting: boolean
  isControlAccount: boolean
}
