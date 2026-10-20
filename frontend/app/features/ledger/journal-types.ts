export interface JournalLine {
  id?: string
  accountId: string
  accountName?: string
  accountNumber?: string
  currencyId: string
  currencyCode?: string
  currencyName?: string
  costCenterId: string | null
  organizationUnitId?: string | null
  organizationUnitName?: string
  exchangeRate: string
  debit: string
  credit: string
  baseDebit?: string
  baseCredit?: string
  description: string
  referenceNumber: string
  chequeNumber: string
  transactionDate: string
}
export interface Journal {
  id: string
  accountingUnitId: string
  batchNumber: string
  batchDate: string
  description: string
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'posted'
    | 'rejected'
    | 'voided'
    | 'reversed'
  version: number
  periodId: string | null
  isMultiCurrency: boolean
  totalDebit: string
  totalCredit: string
  lines: JournalLine[]
}
export interface JournalOptions {
  baseCurrencyId: string
  accounts: {
    id: string
    accountNumber: string
    name: string
    currencyId: string
  }[]
  currencies: { id: string; code: string; name: string }[]
  costCenters: { id: string; name: string }[]
  periods: { id: string; period: number; beginDate: string; endDate: string }[]
}
export const emptyJournalOptions = (): JournalOptions => ({
  baseCurrencyId: '',
  accounts: [],
  currencies: [],
  costCenters: [],
  periods: [],
})
export function journalLineInput(line: JournalLine) {
  const {
    id,
    accountId,
    currencyId,
    costCenterId,
    exchangeRate,
    debit,
    credit,
    description,
    referenceNumber,
    chequeNumber,
    transactionDate,
  } = line
  return {
    ...(id ? { id } : {}),
    accountId,
    currencyId,
    costCenterId: costCenterId || null,
    exchangeRate,
    debit: debit || '0',
    credit: credit || '0',
    description,
    referenceNumber,
    chequeNumber,
    transactionDate,
  }
}
