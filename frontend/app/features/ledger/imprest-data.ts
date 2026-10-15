import { convertLedgerAmount, formatLedgerAmount, parseLedgerAmount, parseLedgerRate } from './money'

export type ImprestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'posted'
  | 'retired'
  | 'refunded'
  | 'written_off'
  | 'converted'
  | 'reversed'

export type ImprestSettlementStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed'

export interface ImprestEmployee {
  id: string
  employeeIdentifier: string
  employeeName: string
  departmentName: string
  organizationUnitId: string
}

export interface LedgerImprest {
  id: string
  imprestNumber: string
  employeeId: string
  employeeIdentifier: string
  employeeName: string
  imprestCategoryId: string
  imprestCategoryName: string
  amount: string
  balance: string
  disbursementDate: string
  expectedRetirementDate: string
  creditAccountId: string
  creditAccountName: string
  paymentMethod: string
  chequeNumber: string
  debitAccountId: string
  debitAccountName: string
  referenceNumber: string
  description: string
  organizationUnitId: string
  organizationUnitName: string
  currencyCode: string
  currencyName: string
  buyRate: string
  sellRate: string
  status: ImprestStatus
  postedToGl: boolean
  journalBatchId?: string
}

export interface LedgerImprestRetirementLine {
  id: string
  receiptDate: string
  receiptNumber: string
  description: string
  amount: string
  debitAccountId: string
  creditAccountId: string
  organizationUnitId: string
}

export interface LedgerImprestRetirement {
  id: string
  imprestId: string
  imprestNumber: string
  employeeId: string
  employeeName: string
  retirementDate: string
  amountRetired: string
  currencyCode: string
  exchangeRate: string
  retiredBy: string
  status: ImprestSettlementStatus
  postedToGl: boolean
  details: LedgerImprestRetirementLine[]
}

export interface LedgerImprestRefund {
  id: string
  imprestId: string
  imprestNumber: string
  employeeId: string
  employeeName: string
  refundDate: string
  amount: string
  currencyCode: string
  exchangeRate: string
  refundType: 'employee_refund_company' | 'company_refund_employee'
  receiptDate: string
  receiptNumber: string
  refundReceivedBy: string
  debitAccountId: string
  creditAccountId: string
  notes: string
  status: ImprestSettlementStatus
  postedToGl: boolean
}

export interface LedgerImprestWriteOff {
  id: string
  imprestId: string
  imprestNumber: string
  employeeId: string
  employeeName: string
  writeOffDate: string
  amount: string
  currencyCode: string
  exchangeRate: string
  authorizedBy: string
  writtenOffBy: string
  debitAccountId: string
  creditAccountId: string
  notes: string
  status: ImprestSettlementStatus
  postedToGl: boolean
}

export interface LedgerPayrollLoanType {
  id: string
  name: string
  description: string
}

export interface PayrollLoanConversionSource {
  imprestId: string
  imprestNumber: string
  categoryId: string
  categoryName: string
  outstandingAmount: string
  currencyCode: string
  exchangeRate: string
  payrollAmountGhs: string
}

export interface LedgerPayrollLoanConversion {
  id: string
  conversionNumber: string
  employeeId: string
  employeeIdentifier: string
  employeeName: string
  loanDate: string
  loanTypeId: string
  loanTypeName: string
  deductionStarts: string
  durationMonths: number
  deductThisMonth: boolean
  principalAmountGhs: string
  monthlyDeductionGhs: string
  sources: PayrollLoanConversionSource[]
  status: 'draft' | 'converted'
  createdAt: string
  convertedAt?: string
}

export interface SavePayrollLoanConversionInput {
  id?: string
  employeeId: string
  loanDate: string
  loanTypeId: string
  deductionStarts: string
  durationMonths: number
  deductThisMonth: boolean
  selectedImprestIds: string[]
}

export type SaveImprestInput = Omit<LedgerImprest, 'id' | 'balance' | 'status' | 'postedToGl' | 'journalBatchId'> & { id?: string }
export type SaveRetirementInput = Omit<LedgerImprestRetirement, 'id' | 'imprestNumber' | 'employeeName' | 'amountRetired' | 'status' | 'postedToGl' | 'details'> & {
  id?: string
  details: Array<Omit<LedgerImprestRetirementLine, 'id'>>
}
export type SaveRefundInput = Omit<LedgerImprestRefund, 'id' | 'imprestNumber' | 'employeeName' | 'status' | 'postedToGl'> & { id?: string }
export type SaveWriteOffInput = Omit<LedgerImprestWriteOff, 'id' | 'imprestNumber' | 'employeeName' | 'status' | 'postedToGl'> & { id?: string }

export const imprestEmployees: ImprestEmployee[] = [
  { id: 'employee-ama-owusu', employeeIdentifier: 'EMP-0124', employeeName: 'Ama Owusu', departmentName: 'Operations', organizationUnitId: 'ou-operations' },
  { id: 'employee-kwame-osei', employeeIdentifier: 'EMP-0188', employeeName: 'Kwame Osei', departmentName: 'Finance & Administration', organizationUnitId: 'ou-finance' },
  { id: 'employee-abena-mensah', employeeIdentifier: 'EMP-0221', employeeName: 'Abena Mensah', departmentName: 'Sales & Marketing', organizationUnitId: 'ou-sales' },
  { id: 'employee-kojo-appiah', employeeIdentifier: 'EMP-0255', employeeName: 'Kojo Appiah', departmentName: 'Operations', organizationUnitId: 'ou-kumasi' },
  { id: 'employee-efua-sarpong', employeeIdentifier: 'EMP-0300', employeeName: 'Efua Sarpong', departmentName: 'Finance & Administration', organizationUnitId: 'ou-accra' },
]

export const payrollLoanTypes: LedgerPayrollLoanType[] = [
  { id: 'staff-payroll-loan', name: 'Staff payroll loan', description: 'Recoverable employee loan collected through payroll deductions.' },
  { id: 'salary-advance', name: 'Salary advance', description: 'Short-term salary advance recovered from a future payroll.' },
  { id: 'emergency-loan', name: 'Emergency loan', description: 'Employee emergency assistance recovered in instalments.' },
]

const imprestSeed: LedgerImprest[] = [
  {
    id: 'imprest-0106', imprestNumber: 'IMP-2026-0106', employeeId: 'employee-kojo-appiah', employeeIdentifier: 'EMP-0255', employeeName: 'Kojo Appiah',
    imprestCategoryId: 'imprest-category-field', imprestCategoryName: 'Field operations', amount: '8500.000000', balance: '3500.000000',
    disbursementDate: '2026-08-01', expectedRetirementDate: '2026-08-31', creditAccountId: 'acc-1010', creditAccountName: 'Bank — Main Operating',
    paymentMethod: 'Bank transfer', chequeNumber: '', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'TRV-KSI-0801',
    description: 'Kumasi field inspections', organizationUnitId: 'ou-kumasi', organizationUnitName: 'Kumasi Branch', currencyCode: 'GHS', currencyName: 'Ghana cedi',
    buyRate: '1.0000000000', sellRate: '1.0000000000', status: 'posted', postedToGl: true,
  },
  {
    id: 'imprest-0112', imprestNumber: 'IMP-2026-0112', employeeId: 'employee-ama-owusu', employeeIdentifier: 'EMP-0124', employeeName: 'Ama Owusu',
    imprestCategoryId: 'imprest-category-travel', imprestCategoryName: 'Travel advance', amount: '4800.000000', balance: '1500.000000',
    disbursementDate: '2026-09-20', expectedRetirementDate: '2026-10-20', creditAccountId: 'acc-1010', creditAccountName: 'Bank — Main Operating',
    paymentMethod: 'Bank transfer', chequeNumber: '', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'TRV-ACR-0920',
    description: 'Regional stakeholder visits', organizationUnitId: 'ou-operations', organizationUnitName: 'Operations', currencyCode: 'GHS', currencyName: 'Ghana cedi',
    buyRate: '1.0000000000', sellRate: '1.0000000000', status: 'posted', postedToGl: true,
  },
  {
    id: 'imprest-0116', imprestNumber: 'IMP-2026-0116', employeeId: 'employee-efua-sarpong', employeeIdentifier: 'EMP-0300', employeeName: 'Efua Sarpong',
    imprestCategoryId: 'imprest-category-training', imprestCategoryName: 'Training expenses', amount: '2200.000000', balance: '0.000000',
    disbursementDate: '2026-08-01', expectedRetirementDate: '2026-08-31', creditAccountId: 'acc-1010', creditAccountName: 'Bank — Main Operating',
    paymentMethod: 'Cheque', chequeNumber: '00012814', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'TRN-ACR-0801',
    description: 'Finance systems training', organizationUnitId: 'ou-accra', organizationUnitName: 'Accra Operations', currencyCode: 'GHS', currencyName: 'Ghana cedi',
    buyRate: '1.0000000000', sellRate: '1.0000000000', status: 'retired', postedToGl: true,
  },
  {
    id: 'imprest-0120', imprestNumber: 'IMP-2026-0120', employeeId: 'employee-kwame-osei', employeeIdentifier: 'EMP-0188', employeeName: 'Kwame Osei',
    imprestCategoryId: 'imprest-category-travel', imprestCategoryName: 'Travel advance', amount: '1800.000000', balance: '0.000000',
    disbursementDate: '2026-07-20', expectedRetirementDate: '2026-08-20', creditAccountId: 'acc-1020', creditAccountName: 'Bank — USD Account',
    paymentMethod: 'Bank transfer', chequeNumber: '', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'TRV-USD-0720',
    description: 'Supplier conference travel', organizationUnitId: 'ou-finance', organizationUnitName: 'Finance & Administration', currencyCode: 'USD', currencyName: 'US dollar',
    buyRate: '12.5000000000', sellRate: '12.5000000000', status: 'refunded', postedToGl: true,
  },
  {
    id: 'imprest-0122', imprestNumber: 'IMP-2026-0122', employeeId: 'employee-abena-mensah', employeeIdentifier: 'EMP-0221', employeeName: 'Abena Mensah',
    imprestCategoryId: 'imprest-category-emergency', imprestCategoryName: 'Emergency support', amount: '900.000000', balance: '600.000000',
    disbursementDate: '2026-09-12', expectedRetirementDate: '2026-09-22', creditAccountId: 'acc-1010', creditAccountName: 'Bank — Main Operating',
    paymentMethod: 'Cash', chequeNumber: '', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'EMR-SLS-0912',
    description: 'Urgent customer-site response', organizationUnitId: 'ou-sales', organizationUnitName: 'Sales & Marketing', currencyCode: 'GHS', currencyName: 'Ghana cedi',
    buyRate: '1.0000000000', sellRate: '1.0000000000', status: 'posted', postedToGl: true,
  },
  {
    id: 'imprest-0124', imprestNumber: 'IMP-2026-0124', employeeId: 'employee-ama-owusu', employeeIdentifier: 'EMP-0124', employeeName: 'Ama Owusu',
    imprestCategoryId: 'imprest-category-travel', imprestCategoryName: 'Travel advance', amount: '2500.000000', balance: '2500.000000',
    disbursementDate: '2026-10-14', expectedRetirementDate: '2026-11-14', creditAccountId: 'acc-1010', creditAccountName: 'Bank — Main Operating',
    paymentMethod: 'Bank transfer', chequeNumber: '', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'TRV-ACR-1014',
    description: 'Site survey and accommodation', organizationUnitId: 'ou-operations', organizationUnitName: 'Operations', currencyCode: 'GHS', currencyName: 'Ghana cedi',
    buyRate: '1.0000000000', sellRate: '1.0000000000', status: 'draft', postedToGl: false,
  },
  {
    id: 'imprest-0126', imprestNumber: 'IMP-2026-0126', employeeId: 'employee-kwame-osei', employeeIdentifier: 'EMP-0188', employeeName: 'Kwame Osei',
    imprestCategoryId: 'imprest-category-field', imprestCategoryName: 'Field operations', amount: '1500.000000', balance: '900.000000',
    disbursementDate: '2026-10-02', expectedRetirementDate: '2026-10-30', creditAccountId: 'acc-1020', creditAccountName: 'Bank — USD Account',
    paymentMethod: 'Bank transfer', chequeNumber: '', debitAccountId: 'acc-1000', debitAccountName: 'Cash on Hand', referenceNumber: 'FLD-USD-1002',
    description: 'Regional supplier follow-up', organizationUnitId: 'ou-finance', organizationUnitName: 'Finance & Administration', currencyCode: 'USD', currencyName: 'US dollar',
    buyRate: '12.5000000000', sellRate: '12.5000000000', status: 'posted', postedToGl: true,
  },
]

const retirementSeed: LedgerImprestRetirement[] = [
  {
    id: 'retirement-0106', imprestId: 'imprest-0106', imprestNumber: 'IMP-2026-0106', employeeId: 'employee-kojo-appiah', employeeName: 'Kojo Appiah',
    retirementDate: '2026-08-26', amountRetired: '5000.000000', currencyCode: 'GHS', exchangeRate: '1.0000000000', retiredBy: 'Kojo Appiah', status: 'posted', postedToGl: true,
    details: [
      { id: 'retirement-0106-line-1', receiptDate: '2026-08-10', receiptNumber: 'RCPT-0894', description: 'Fuel and local transport', amount: '3200.000000', debitAccountId: 'acc-5000', creditAccountId: 'acc-1000', organizationUnitId: 'ou-kumasi' },
      { id: 'retirement-0106-line-2', receiptDate: '2026-08-18', receiptNumber: 'RCPT-0915', description: 'Field accommodation', amount: '1800.000000', debitAccountId: 'acc-5000', creditAccountId: 'acc-1000', organizationUnitId: 'ou-kumasi' },
    ],
  },
  {
    id: 'retirement-0112', imprestId: 'imprest-0112', imprestNumber: 'IMP-2026-0112', employeeId: 'employee-ama-owusu', employeeName: 'Ama Owusu',
    retirementDate: '2026-10-07', amountRetired: '3300.000000', currencyCode: 'GHS', exchangeRate: '1.0000000000', retiredBy: 'Ama Owusu', status: 'posted', postedToGl: true,
    details: [{ id: 'retirement-0112-line-1', receiptDate: '2026-10-05', receiptNumber: 'RCPT-1057', description: 'Regional travel receipts', amount: '3300.000000', debitAccountId: 'acc-5000', creditAccountId: 'acc-1000', organizationUnitId: 'ou-operations' }],
  },
  {
    id: 'retirement-0116', imprestId: 'imprest-0116', imprestNumber: 'IMP-2026-0116', employeeId: 'employee-efua-sarpong', employeeName: 'Efua Sarpong',
    retirementDate: '2026-09-03', amountRetired: '2200.000000', currencyCode: 'GHS', exchangeRate: '1.0000000000', retiredBy: 'Efua Sarpong', status: 'posted', postedToGl: true,
    details: [{ id: 'retirement-0116-line-1', receiptDate: '2026-08-28', receiptNumber: 'RCPT-0992', description: 'Training materials and venue', amount: '2200.000000', debitAccountId: 'acc-5000', creditAccountId: 'acc-1000', organizationUnitId: 'ou-accra' }],
  },
  {
    id: 'retirement-0126', imprestId: 'imprest-0126', imprestNumber: 'IMP-2026-0126', employeeId: 'employee-kwame-osei', employeeName: 'Kwame Osei',
    retirementDate: '2026-10-12', amountRetired: '600.000000', currencyCode: 'USD', exchangeRate: '12.5000000000', retiredBy: 'Kwame Osei', status: 'posted', postedToGl: true,
    details: [{ id: 'retirement-0126-line-1', receiptDate: '2026-10-10', receiptNumber: 'RCPT-1098', description: 'Supplier site transport', amount: '600.000000', debitAccountId: 'acc-5000', creditAccountId: 'acc-1000', organizationUnitId: 'ou-finance' }],
  },
]

const refundSeed: LedgerImprestRefund[] = [
  {
    id: 'refund-0120', imprestId: 'imprest-0120', imprestNumber: 'IMP-2026-0120', employeeId: 'employee-kwame-osei', employeeName: 'Kwame Osei',
    refundDate: '2026-08-18', amount: '1800.000000', currencyCode: 'USD', exchangeRate: '12.5000000000', refundType: 'employee_refund_company',
    receiptDate: '2026-08-18', receiptNumber: 'RF-USD-0031', refundReceivedBy: 'Finance Desk', debitAccountId: 'acc-1020', creditAccountId: 'acc-1000',
    notes: 'Unspent conference advance returned', status: 'posted', postedToGl: true,
  },
]

const writeOffSeed: LedgerImprestWriteOff[] = [
  {
    id: 'writeoff-0122', imprestId: 'imprest-0122', imprestNumber: 'IMP-2026-0122', employeeId: 'employee-abena-mensah', employeeName: 'Abena Mensah',
    writeOffDate: '2026-09-20', amount: '300.000000', currencyCode: 'GHS', exchangeRate: '1.0000000000', authorizedBy: 'Finance Manager', writtenOffBy: 'Finance Desk',
    debitAccountId: 'acc-5000', creditAccountId: 'acc-1000', notes: 'Approved loss of supporting receipt', status: 'posted', postedToGl: true,
  },
]

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeAmount(value: string) {
  const units = parseLedgerAmount(value)
  return units === null ? null : formatLedgerAmount(units)
}

function normalizeRate(value: string) {
  const units = parseLedgerRate(value)
  if (units === null) return null
  const scale = BigInt(10_000_000_000)
  const whole = units / scale
  const fraction = String(units % scale).padStart(10, '0')
  return `${whole}.${fraction}`
}

function amountUnits(value: string) {
  return parseLedgerAmount(value) ?? BigInt(0)
}

export function useLedgerImprests() {
  const imprests = useState<LedgerImprest[]>('ledger-imprests', () => imprestSeed.map((item) => ({ ...item })))
  const retirements = useState<LedgerImprestRetirement[]>('ledger-imprest-retirements', () => retirementSeed.map((item) => ({ ...item, details: item.details.map((line) => ({ ...line })) })))
  const refunds = useState<LedgerImprestRefund[]>('ledger-imprest-refunds', () => refundSeed.map((item) => ({ ...item })))
  const writeOffs = useState<LedgerImprestWriteOff[]>('ledger-imprest-writeoffs', () => writeOffSeed.map((item) => ({ ...item })))
  const payrollLoanConversions = useState<LedgerPayrollLoanConversion[]>('ledger-payroll-loan-conversions', () => [])

  function nextImprestNumber() {
    const year = new Date().getFullYear()
    const pattern = new RegExp(`^IMP-${year}-(\\d+)$`)
    const highest = imprests.value.reduce((sequence, imprest) => {
      const match = imprest.imprestNumber.match(pattern)
      return match ? Math.max(sequence, Number(match[1])) : sequence
    }, 0)
    return `IMP-${year}-${String(highest + 1).padStart(4, '0')}`
  }

  function nextPayrollLoanConversionNumber() {
    const year = new Date().getFullYear()
    const pattern = new RegExp(`^PLC-${year}-(\\d+)$`)
    const highest = payrollLoanConversions.value.reduce((sequence, conversion) => {
      const match = conversion.conversionNumber.match(pattern)
      return match ? Math.max(sequence, Number(match[1])) : sequence
    }, 0)
    return `PLC-${year}-${String(highest + 1).padStart(4, '0')}`
  }

  function reservedByDraftUnits(imprestId: string, excludeConversionId = '') {
    return payrollLoanConversions.value
      .filter((conversion) => conversion.status === 'draft' && conversion.id !== excludeConversionId)
      .flatMap((conversion) => conversion.sources)
      .filter((source) => source.imprestId === imprestId)
      .reduce((total, source) => total + amountUnits(source.outstandingAmount), BigInt(0))
  }

  function availableBalanceForImprest(imprestId: string, excludeConversionId = '') {
    const imprest = imprests.value.find((item) => item.id === imprestId)
    if (!imprest) return '0.000000'
    const available = amountUnits(imprest.balance) - reservedByDraftUnits(imprestId, excludeConversionId)
    return formatLedgerAmount(available > BigInt(0) ? available : BigInt(0))
  }

  function hasUnpostedSettlement(imprestId: string) {
    return retirements.value.some((item) => item.imprestId === imprestId && item.status !== 'posted' && item.status !== 'reversed')
      || refunds.value.some((item) => item.imprestId === imprestId && item.status !== 'posted' && item.status !== 'reversed')
      || writeOffs.value.some((item) => item.imprestId === imprestId && item.status !== 'posted' && item.status !== 'reversed')
  }

  function settledAmountUnits(imprestId: string) {
    const retirementTotal = retirements.value
      .filter((item) => item.imprestId === imprestId && item.status !== 'reversed')
      .reduce((total, item) => total + amountUnits(item.amountRetired), BigInt(0))
    const refundTotal = refunds.value
      .filter((item) => item.imprestId === imprestId && item.status !== 'reversed')
      .reduce((total, item) => total + amountUnits(item.amount), BigInt(0))
    const writeOffTotal = writeOffs.value
      .filter((item) => item.imprestId === imprestId && item.status !== 'reversed')
      .reduce((total, item) => total + amountUnits(item.amount), BigInt(0))
    const payrollLoanTotal = payrollLoanConversions.value
      .filter((conversion) => conversion.status === 'converted')
      .flatMap((conversion) => conversion.sources)
      .filter((source) => source.imprestId === imprestId)
      .reduce((total, source) => total + amountUnits(source.outstandingAmount), BigInt(0))
    return retirementTotal + refundTotal + writeOffTotal + payrollLoanTotal
  }

  function hasSettlements(imprestId: string) {
    return retirements.value.some((item) => item.imprestId === imprestId)
      || refunds.value.some((item) => item.imprestId === imprestId)
      || writeOffs.value.some((item) => item.imprestId === imprestId)
      || payrollLoanConversions.value.some((conversion) => conversion.sources.some((source) => source.imprestId === imprestId))
  }

  function refreshImprestBalance(imprestId: string) {
    const imprest = imprests.value.find((item) => item.id === imprestId)
    if (!imprest) return
    const remaining = amountUnits(imprest.amount) - settledAmountUnits(imprestId)
    const balance = remaining > BigInt(0) ? remaining : BigInt(0)
    imprest.balance = formatLedgerAmount(balance)
    if (balance > BigInt(0)) {
      imprest.status = imprest.postedToGl ? 'posted' : 'draft'
      return
    }

    const entries = [
      ...retirements.value.filter((item) => item.imprestId === imprestId).map((item) => ({ date: item.retirementDate, status: item.status, kind: 'retired' as const })),
      ...refunds.value.filter((item) => item.imprestId === imprestId).map((item) => ({ date: item.refundDate, status: item.status, kind: 'refunded' as const })),
      ...writeOffs.value.filter((item) => item.imprestId === imprestId).map((item) => ({ date: item.writeOffDate, status: item.status, kind: 'written_off' as const })),
      ...payrollLoanConversions.value
        .filter((conversion) => conversion.status === 'converted' && conversion.sources.some((source) => source.imprestId === imprestId))
        .map((conversion) => ({ date: conversion.convertedAt || conversion.loanDate, status: conversion.status, kind: 'converted' as const })),
    ].filter((item) => item.status !== 'reversed').sort((a, b) => b.date.localeCompare(a.date))
    if (entries.some((item) => item.status !== 'posted' && item.status !== 'converted')) imprest.status = 'pending_approval'
    else if (entries[0]) imprest.status = entries[0].kind
  }

  function saveImprest(input: SaveImprestInput) {
    const existing = input.id ? imprests.value.find((item) => item.id === input.id) : undefined
    const amount = normalizeAmount(input.amount)
    const buyRate = normalizeRate(input.buyRate)
    const sellRate = normalizeRate(input.sellRate)
    if (!amount || amountUnits(amount) <= BigInt(0) || !buyRate || !sellRate || parseLedgerRate(buyRate)! <= BigInt(0) || parseLedgerRate(sellRate)! <= BigInt(0)) return null
    if (existing && (existing.postedToGl || hasSettlements(existing.id))) return null
    const saved: LedgerImprest = {
      ...input,
      id: existing?.id || input.id || makeId('imprest'),
      amount,
      balance: amount,
      buyRate,
      sellRate,
      status: 'draft',
      postedToGl: false,
    }
    const index = existing ? imprests.value.findIndex((item) => item.id === existing.id) : -1
    if (index >= 0) imprests.value[index] = saved
    else imprests.value.unshift(saved)
    return saved
  }

  function removeImprest(id: string) {
    const imprest = imprests.value.find((item) => item.id === id)
    if (!imprest || imprest.postedToGl || hasSettlements(id)) return false
    imprests.value = imprests.value.filter((item) => item.id !== id)
    return true
  }

  function postImprest(id: string) {
    const imprest = imprests.value.find((item) => item.id === id)
    if (!imprest || imprest.status !== 'draft') return false
    imprest.status = 'posted'
    imprest.postedToGl = true
    return true
  }

  function saveRetirement(input: SaveRetirementInput) {
    const imprest = imprests.value.find((item) => item.id === input.imprestId)
    if (!imprest || !imprest.postedToGl) return null
    const existing = input.id ? retirements.value.find((item) => item.id === input.id) : undefined
    if (existing?.postedToGl || (existing && existing.imprestId !== imprest.id)) return null
    const exchangeRate = normalizeRate(input.exchangeRate)
    const parsedLineUnits = input.details.map((line) => parseLedgerAmount(line.amount))
    if (!exchangeRate || parseLedgerRate(exchangeRate)! <= BigInt(0) || parsedLineUnits.some((units) => units === null || units <= BigInt(0))) return null
    const lineUnits = parsedLineUnits as bigint[]
    const retiredUnits = lineUnits.reduce((total, units) => total + units, BigInt(0))
    const available = amountUnits(imprest.balance) + (existing ? amountUnits(existing.amountRetired) : BigInt(0))
    if (retiredUnits <= BigInt(0) || retiredUnits > available) return null
    const retirement: LedgerImprestRetirement = {
      ...input,
      id: existing?.id || input.id || makeId('retirement'),
      imprestNumber: imprest.imprestNumber,
      employeeName: imprest.employeeName,
      amountRetired: formatLedgerAmount(retiredUnits),
      exchangeRate,
      status: 'draft',
      postedToGl: false,
      details: input.details.map((line, index) => ({ ...line, amount: formatLedgerAmount(lineUnits[index]!), id: makeId('retirement-line') })),
    }
    const index = existing ? retirements.value.findIndex((item) => item.id === existing.id) : -1
    if (index >= 0) retirements.value[index] = retirement
    else retirements.value.unshift(retirement)
    refreshImprestBalance(imprest.id)
    return retirement
  }

  function removeRetirement(id: string) {
    const retirement = retirements.value.find((item) => item.id === id)
    if (!retirement || retirement.postedToGl) return false
    retirements.value = retirements.value.filter((item) => item.id !== id)
    refreshImprestBalance(retirement.imprestId)
    return true
  }

  function postRetirement(id: string) {
    const retirement = retirements.value.find((item) => item.id === id)
    if (!retirement || retirement.status !== 'draft') return false
    retirement.status = 'posted'
    retirement.postedToGl = true
    refreshImprestBalance(retirement.imprestId)
    return true
  }

  function saveRefund(input: SaveRefundInput) {
    const imprest = imprests.value.find((item) => item.id === input.imprestId)
    if (!imprest || !imprest.postedToGl) return null
    const existing = input.id ? refunds.value.find((item) => item.id === input.id) : undefined
    if (existing?.postedToGl || (existing && existing.imprestId !== imprest.id)) return null
    const amount = normalizeAmount(input.amount)
    const exchangeRate = normalizeRate(input.exchangeRate)
    if (!amount || !exchangeRate || amountUnits(amount) <= BigInt(0) || parseLedgerRate(exchangeRate)! <= BigInt(0)) return null
    const available = amountUnits(imprest.balance) + (existing ? amountUnits(existing.amount) : BigInt(0))
    const refundUnits = amountUnits(amount)
    if (refundUnits > available) return null
    const refund: LedgerImprestRefund = {
      ...input,
      id: existing?.id || input.id || makeId('refund'),
      imprestNumber: imprest.imprestNumber,
      employeeName: imprest.employeeName,
      amount,
      exchangeRate,
      status: 'draft',
      postedToGl: false,
    }
    const index = existing ? refunds.value.findIndex((item) => item.id === existing.id) : -1
    if (index >= 0) refunds.value[index] = refund
    else refunds.value.unshift(refund)
    refreshImprestBalance(imprest.id)
    return refund
  }

  function removeRefund(id: string) {
    const refund = refunds.value.find((item) => item.id === id)
    if (!refund || refund.postedToGl) return false
    refunds.value = refunds.value.filter((item) => item.id !== id)
    refreshImprestBalance(refund.imprestId)
    return true
  }

  function postRefund(id: string) {
    const refund = refunds.value.find((item) => item.id === id)
    if (!refund || refund.status !== 'draft') return false
    refund.status = 'posted'
    refund.postedToGl = true
    refreshImprestBalance(refund.imprestId)
    return true
  }

  function saveWriteOff(input: SaveWriteOffInput) {
    const imprest = imprests.value.find((item) => item.id === input.imprestId)
    if (!imprest || !imprest.postedToGl) return null
    const existing = input.id ? writeOffs.value.find((item) => item.id === input.id) : undefined
    if (existing?.postedToGl || (existing && existing.imprestId !== imprest.id)) return null
    const amount = normalizeAmount(input.amount)
    const exchangeRate = normalizeRate(input.exchangeRate)
    if (!amount || !exchangeRate || amountUnits(amount) <= BigInt(0) || parseLedgerRate(exchangeRate)! <= BigInt(0)) return null
    const available = amountUnits(imprest.balance) + (existing ? amountUnits(existing.amount) : BigInt(0))
    const writeOffUnits = amountUnits(amount)
    if (writeOffUnits > available) return null
    const writeOff: LedgerImprestWriteOff = {
      ...input,
      id: existing?.id || input.id || makeId('writeoff'),
      imprestNumber: imprest.imprestNumber,
      employeeName: imprest.employeeName,
      amount,
      exchangeRate,
      status: 'draft',
      postedToGl: false,
    }
    const index = existing ? writeOffs.value.findIndex((item) => item.id === existing.id) : -1
    if (index >= 0) writeOffs.value[index] = writeOff
    else writeOffs.value.unshift(writeOff)
    refreshImprestBalance(imprest.id)
    return writeOff
  }

  function removeWriteOff(id: string) {
    const writeOff = writeOffs.value.find((item) => item.id === id)
    if (!writeOff || writeOff.postedToGl) return false
    writeOffs.value = writeOffs.value.filter((item) => item.id !== id)
    refreshImprestBalance(writeOff.imprestId)
    return true
  }

  function postWriteOff(id: string) {
    const writeOff = writeOffs.value.find((item) => item.id === id)
    if (!writeOff || writeOff.status !== 'draft') return false
    writeOff.status = 'posted'
    writeOff.postedToGl = true
    refreshImprestBalance(writeOff.imprestId)
    return true
  }

  function savePayrollLoanConversion(input: SavePayrollLoanConversionInput) {
    const existing = input.id ? payrollLoanConversions.value.find((item) => item.id === input.id) : undefined
    if (input.id && (!existing || existing.status !== 'draft')) return null
    const employee = imprestEmployees.find((item) => item.id === input.employeeId)
    const loanType = payrollLoanTypes.find((item) => item.id === input.loanTypeId)
    const duration = Number(input.durationMonths)
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
      const parsed = new Date(`${value}T00:00:00.000Z`)
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    }
    const selectedIds = [...new Set(input.selectedImprestIds)]
    if (!employee || !loanType || !validDate(input.loanDate) || !validDate(input.deductionStarts)
      || input.deductionStarts < input.loanDate || !Number.isInteger(duration) || duration < 1 || duration > 60 || !selectedIds.length) return null

    const sources: PayrollLoanConversionSource[] = []
    let principalUnits = BigInt(0)
    for (const imprestId of selectedIds) {
      const imprest = imprests.value.find((item) => item.id === imprestId)
      const rate = imprest ? parseLedgerRate(imprest.sellRate) : null
      const availableUnits = imprest
        ? amountUnits(imprest.balance) - reservedByDraftUnits(imprest.id, existing?.id)
        : BigInt(0)
      if (!imprest || !imprest.postedToGl || imprest.employeeId !== employee.id || hasUnpostedSettlement(imprest.id)
        || rate === null || rate <= BigInt(0) || availableUnits <= BigInt(0)) return null
      const payrollAmountUnits = convertLedgerAmount(availableUnits, rate)
      if (payrollAmountUnits <= BigInt(0)) return null
      sources.push({
        imprestId: imprest.id,
        imprestNumber: imprest.imprestNumber,
        categoryId: imprest.imprestCategoryId,
        categoryName: imprest.imprestCategoryName,
        outstandingAmount: formatLedgerAmount(availableUnits),
        currencyCode: imprest.currencyCode,
        exchangeRate: imprest.sellRate,
        payrollAmountGhs: formatLedgerAmount(payrollAmountUnits),
      })
      principalUnits += payrollAmountUnits
    }

    const monthlyUnits = principalUnits / BigInt(duration)
    if (principalUnits <= BigInt(0) || monthlyUnits <= BigInt(0)) return null
    const saved: LedgerPayrollLoanConversion = {
      id: existing?.id || input.id || makeId('payroll-loan-conversion'),
      conversionNumber: existing?.conversionNumber || nextPayrollLoanConversionNumber(),
      employeeId: employee.id,
      employeeIdentifier: employee.employeeIdentifier,
      employeeName: employee.employeeName,
      loanDate: input.loanDate,
      loanTypeId: loanType.id,
      loanTypeName: loanType.name,
      deductionStarts: input.deductionStarts,
      durationMonths: duration,
      deductThisMonth: input.deductThisMonth,
      principalAmountGhs: formatLedgerAmount(principalUnits),
      monthlyDeductionGhs: formatLedgerAmount(monthlyUnits),
      sources,
      status: 'draft',
      createdAt: existing?.createdAt || new Date().toISOString(),
    }
    const index = existing ? payrollLoanConversions.value.findIndex((item) => item.id === existing.id) : -1
    if (index >= 0) payrollLoanConversions.value[index] = saved
    else payrollLoanConversions.value.unshift(saved)
    return saved
  }

  function removePayrollLoanConversion(id: string) {
    const conversion = payrollLoanConversions.value.find((item) => item.id === id)
    if (!conversion || conversion.status !== 'draft') return false
    payrollLoanConversions.value = payrollLoanConversions.value.filter((item) => item.id !== id)
    return true
  }

  function convertPayrollLoanConversion(id: string) {
    const conversion = payrollLoanConversions.value.find((item) => item.id === id)
    if (!conversion || conversion.status !== 'draft' || !conversion.sources.length) return false
    for (const source of conversion.sources) {
      const imprest = imprests.value.find((item) => item.id === source.imprestId)
      const availableUnits = imprest
        ? amountUnits(imprest.balance) - reservedByDraftUnits(imprest.id, conversion.id)
        : BigInt(0)
      if (!imprest || !imprest.postedToGl || imprest.employeeId !== conversion.employeeId || hasUnpostedSettlement(imprest.id)
        || availableUnits < amountUnits(source.outstandingAmount)) return false
    }
    conversion.status = 'converted'
    conversion.convertedAt = new Date().toISOString()
    for (const source of conversion.sources) refreshImprestBalance(source.imprestId)
    return true
  }

  return {
    employees: imprestEmployees,
    imprests,
    retirements,
    refunds,
    writeOffs,
    payrollLoanConversions,
    nextImprestNumber,
    nextPayrollLoanConversionNumber,
    availableBalanceForImprest,
    hasUnpostedSettlement,
    hasSettlements,
    saveImprest,
    removeImprest,
    postImprest,
    saveRetirement,
    removeRetirement,
    postRetirement,
    saveRefund,
    removeRefund,
    postRefund,
    saveWriteOff,
    removeWriteOff,
    postWriteOff,
    savePayrollLoanConversion,
    removePayrollLoanConversion,
    convertPayrollLoanConversion,
  }
}
