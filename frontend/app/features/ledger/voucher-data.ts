import type { VoucherTaxes, VoucherTaxSummary } from './voucher-tax'
import type { Journal } from './journal-types'
export type LedgerVoucherType =
  'supplier-payment' | 'employee-payment' | 'customer-receipt'
export type LedgerVoucherStatus =
  'Draft' | 'Pending approval' | 'Approved' | 'Posted' | 'Reversed' | 'Voided'
export type LedgerPaymentMethod =
  'Cash' | 'Cheque' | 'Bank transfer' | 'Mobile money'

export interface VoucherPayee {
  id: string
  name: string
  code: string
}

export interface LedgerVoucherLine {
  id: string
  invoiceNumber: string
  referenceNumber: string
  accountId: string
  accountNumber: string
  accountName: string
  description: string
  organizationUnitId: string
  organizationUnitName: string
  localAmount: string
  foreignAmount: string
  isWithhold: boolean
  /** Independent employee-payment line flag; omitted on other voucher types. */
  isImprest?: boolean
}

export interface LedgerVoucherRetention {
  id: string
  accountId: string
  accountNumber: string
  accountName: string
  description: string
  value: string
  isPercentage: boolean
  amount: string
}

export interface LedgerVoucher {
  version?: number
  requestId?: string
  periodId?: string | null
  taxes?: VoucherTaxes
  baseCurrencyCode?: string
  taxSummary?: VoucherTaxSummary
  proposedJournal?: Pick<
    Journal,
    | 'accountingUnitId'
    | 'batchDate'
    | 'description'
    | 'periodId'
    | 'isMultiCurrency'
    | 'lines'
  >
  journalId?: string | null

  accountingUnitId?: string
  id: string
  voucherNumber: string
  batchNumber: string
  type: LedgerVoucherType
  payeeId: string
  payeeName: string
  entryDate: string
  paymentDate?: string
  receiptDate?: string
  bankAccountId: string
  bankAccountName: string
  bankGlAccountId: string
  bankGlAccountName: string
  mode: LedgerPaymentMethod
  currencyCode: string
  exchangeRate: string
  multiCurrency: boolean
  chequeNumber: string
  description: string
  totalAmount: string
  foreignTotal: string
  retentionsTotal: string
  netAmount: string
  status: LedgerVoucherStatus
  lines: LedgerVoucherLine[]
  retentions: LedgerVoucherRetention[]
  preparer: string
  createdAt: string
  updatedAt: string
}

export interface LedgerVoucherLineInput {
  invoiceNumber: string
  referenceNumber: string
  accountId: string
  description: string
  organizationUnitId: string
  localAmount: string
  foreignAmount: string
  isWithhold: boolean
  /** Independent employee-payment line flag; omitted on other voucher types. */
  isImprest?: boolean
}

export interface LedgerVoucherRetentionInput {
  accountId: string
  description: string
  value: string
  isPercentage: boolean
}

export interface CreateLedgerVoucherInput {
  version?: number
  requestId?: string
  periodId?: string | null
  taxes?: VoucherTaxes

  accountingUnitId?: string
  type: LedgerVoucherType
  payeeId: string
  entryDate: string
  paymentDate?: string
  receiptDate?: string
  bankAccountId: string
  bankAccountName: string
  bankGlAccountId: string
  bankGlAccountName: string
  mode: LedgerPaymentMethod
  currencyCode: string
  exchangeRate: string
  multiCurrency: boolean
  chequeNumber: string
  description: string
  lines: LedgerVoucherLineInput[]
  retentions: LedgerVoucherRetentionInput[]
}

export interface LedgerVouchersResponse {
  items: LedgerVoucher[]
  total: number
}

export interface VoucherTypeMetadata {
  value: LedgerVoucherType
  label: string
  shortLabel: string
  payeeLabel: string
  description: string
  prefix: string
  accountDirection: 'debit' | 'credit'
  dateLabel: 'Payment date' | 'Receipt date'
}

export const voucherTypeMetadata: VoucherTypeMetadata[] = [
  {
    value: 'supplier-payment',
    label: 'Supplier payment voucher',
    shortLabel: 'Supplier payment',
    payeeLabel: 'Supplier / payee',
    description:
      'Record a payment to a supplier and allocate it across ledger accounts.',
    prefix: 'SPV',
    accountDirection: 'debit',
    dateLabel: 'Payment date',
  },
  {
    value: 'employee-payment',
    label: 'Employee payment voucher',
    shortLabel: 'Employee payment',
    payeeLabel: 'Employee / payee',
    description:
      'Record staff reimbursements, advances, and other employee payments.',
    prefix: 'EPV',
    accountDirection: 'debit',
    dateLabel: 'Payment date',
  },
  {
    value: 'customer-receipt',
    label: 'Customer receipt voucher',
    shortLabel: 'Customer receipt',
    payeeLabel: 'Customer',
    description:
      'Record cash or bank receipts from customers against ledger accounts.',
    prefix: 'CRV',
    accountDirection: 'credit',
    dateLabel: 'Receipt date',
  },
]

export const voucherPayees: Record<LedgerVoucherType, VoucherPayee[]> = {
  'supplier-payment': [
    {
      id: 'supplier-adom-trading',
      name: 'Adom Trading Company',
      code: 'SUP-0001',
    },
    {
      id: 'supplier-bluewave',
      name: 'Bluewave Office Supplies',
      code: 'SUP-0002',
    },
    {
      id: 'supplier-golden-coast',
      name: 'Golden Coast Logistics',
      code: 'SUP-0003',
    },
    {
      id: 'supplier-kasoa-tech',
      name: 'Kasoa Technologies Ltd.',
      code: 'SUP-0004',
    },
  ],
  'employee-payment': [
    { id: 'employee-akua-mensah', name: 'Akua Mensah', code: 'EMP-0012' },
    { id: 'employee-kwame-osei', name: 'Kwame Osei', code: 'EMP-0019' },
    { id: 'employee-efua-boateng', name: 'Efua Boateng', code: 'EMP-0026' },
    { id: 'employee-kofi-agyeman', name: 'Kofi Agyeman', code: 'EMP-0031' },
  ],
  'customer-receipt': [
    {
      id: 'customer-akua-consulting',
      name: 'Akua Consulting Co.',
      code: 'CUS-0007',
    },
    {
      id: 'customer-northstar',
      name: 'Northstar Services Ltd.',
      code: 'CUS-0011',
    },
    {
      id: 'customer-heritage',
      name: 'Heritage Property Group',
      code: 'CUS-0018',
    },
    {
      id: 'customer-kofi-enterprises',
      name: 'Kofi Enterprises',
      code: 'CUS-0023',
    },
  ],
}

export const voucherPaymentMethods: LedgerPaymentMethod[] = [
  'Cash',
  'Cheque',
  'Bank transfer',
  'Mobile money',
]
export const voucherStatuses: LedgerVoucherStatus[] = [
  'Draft',
  'Pending approval',
  'Approved',
  'Posted',
  'Reversed',
  'Voided',
]

export function isLedgerVoucherType(
  value: unknown,
): value is LedgerVoucherType {
  return voucherTypeMetadata.some((type) => type.value === value)
}

export function voucherTypeInfo(type: LedgerVoucherType): VoucherTypeMetadata {
  return (
    voucherTypeMetadata.find((item) => item.value === type) ??
    voucherTypeMetadata[0]!
  )
}

export function payeesForVoucherType(type: LedgerVoucherType): VoucherPayee[] {
  return voucherPayees[type]
}
