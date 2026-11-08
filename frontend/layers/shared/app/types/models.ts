/**
 * Shared domain model — mirrors the Fineract / Mifos API vocabulary
 * (clients, loans, savings, accounting, organisation, system).
 * Imported by both the Nuxt app and the Nitro server via the
 * `@shared/types/models` alias configured in the shared layer.
 */

export type StatusTone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple'

export interface Office {
  id: number
  name: string
  parentId: number | null
  openingDate: string
  externalId: string
  status: 'active' | 'inactive'
}

export interface Staff {
  id: number
  firstname: string
  lastname: string
  displayName: string
  officeId: number
  isLoanOfficer: boolean
  position: string
  mobile: string
  status: 'active' | 'inactive'
}

export type ClientStatus = 'active' | 'pending' | 'closed' | 'transferred'

export interface ClientAddress { line1: string; town: string; city: string }

export interface Client {
  id: number
  accountNo: string
  firstname: string
  lastname: string
  displayName: string
  externalId: string
  status: ClientStatus
  clientType: 'individual' | 'business'
  businessName?: string
  submittedDate: string
  activationDate: string | null
  closedDate?: string | null
  officeId: number
  staffId: number | null
  mobile: string
  email: string
  gender: 'male' | 'female' | ''
  dob: string
  idType: string
  idNumber: string
  address: ClientAddress
  groupIds: number[]
  family?: { name: string; relationship: string; mobile: string }[]
  identifiers?: { type: string; number: string; status: string }[]
  documents?: { name: string; type: string; uploadedAt: string }[]
}

export interface Group {
  id: number
  name: string
  accountNo: string
  officeId: number
  staffId: number
  meetingDay: string
  formationDate: string
  status: 'active' | 'pending' | 'closed'
  memberIds: number[]
}

export interface LoanProduct {
  id: number
  name: string
  shortName: string
  description: string
  principalMin: number
  principalMax: number
  interestRateMin: number
  interestRateMax: number
  termMin: number
  termMax: number
  termFrequency: 'weeks' | 'months'
  repayEvery: number
  repayFrequency: 'weeks' | 'months'
  graceOnPrincipal: number
  active: boolean
}

export interface SavingsProduct {
  id: number
  name: string
  shortName: string
  description: string
  type: 'savings' | 'current' | 'fixed' | 'recurring'
  interestRate: number
  minOpeningBalance: number
  withdrawalFee: number
  lockinDays: number
  active: boolean
}

export interface Charge {
  id: number
  name: string
  chargeType: 'fee' | 'penalty'
  appliesTo: 'loan' | 'savings' | 'client'
  amountMode: 'flat' | 'percent'
  amount: number
  due: 'disbursement' | 'installment' | 'monthly' | 'withdrawal' | 'specified'
  active: boolean
}

export type LoanStatus =
  | 'submitted' | 'approved' | 'active' | 'closed'
  | 'rejected' | 'withdrawn' | 'writtenoff'

export interface ScheduleEntry {
  period: number
  dueDate: string
  principalDue: number
  interestDue: number
  feesDue: number
  totalDue: number
  principalPaid: number
  interestPaid: number
  feesPaid: number
  paidDate: string | null
}

export interface LoanTxn {
  id: number
  date: string
  type: 'disbursement' | 'repayment' | 'writeoff' | 'waiver'
  amount: number
  principal: number
  interest: number
  fees: number
  paymentType: string
  note?: string
  reversed?: boolean
}

export interface Loan {
  id: number
  accountNo: string
  clientId: number
  groupId: number | null
  productId: number
  officeId: number
  staffId: number
  status: LoanStatus
  purpose: string
  principal: number
  interestRate: number
  term: number
  termFrequency: 'weeks' | 'months'
  repayEvery: number
  repayFrequency: 'weeks' | 'months'
  submittedDate: string
  approvedDate: string | null
  disbursedDate: string | null
  closedDate: string | null
  rejectedDate?: string | null
  writtenOffDate?: string | null
  expectedMaturity: string | null
  schedule: ScheduleEntry[]
  transactions: LoanTxn[]
  paidPrincipal: number
  paidInterest: number
  paidFees: number
  outstanding: number
  overdueAmount: number
  collateral: string
  guarantor: string
}

export type SavingsStatus = 'submitted' | 'approved' | 'active' | 'dormant' | 'closed'

export interface SavingsTxn {
  id: number
  date: string
  type: 'deposit' | 'withdrawal' | 'interest' | 'fee'
  amount: number
  balanceAfter: number
  paymentType: string
  note?: string
}

export interface SavingsAccount {
  id: number
  accountNo: string
  clientId: number
  productId: number
  officeId: number
  staffId: number
  status: SavingsStatus
  submittedDate: string
  approvedDate: string | null
  activatedDate: string | null
  closedDate: string | null
  interestRate: number
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  transactions: SavingsTxn[]
}

export type GLType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

export interface GLAccount {
  id: number
  glCode: string
  name: string
  type: GLType
  parentId: number | null
  usage: 'header' | 'detail'
  tag: string
  manualEntriesAllowed: boolean
  description: string
}

export interface JournalEntry {
  id: number
  transactionId: string
  entryDate: string
  officeId: number
  glAccountId: number
  amount: number
  entryType: 'DEBIT' | 'CREDIT'
  note: string
  reversed: boolean
  user: string
}

export interface Closure {
  id: number
  officeId: number
  closingDate: string
  createdDate: string
  comments: string
  status: 'closed'
}

export interface UserAccount {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  officeId: number
  roleNames: string[]
  status: 'active' | 'disabled'
  lastLogin: string
}

export interface Role {
  id: number
  name: string
  description: string
  permissions: string[]
}

export type TaskStatus = 'pending' | 'approved' | 'rejected'

export interface CheckerTask {
  id: number
  createdDate: string
  entityType: 'LOAN' | 'SAVINGS' | 'CLIENT' | 'JOURNAL'
  action: string
  entityId: number
  entityLabel: string
  makerId: number
  makerName: string
  status: TaskStatus
  checkerId: number | null
  checkerName: string | null
  checkedDate: string | null
  note: string
  amount?: number
}

export interface AuditEntry {
  id: number
  timestamp: string
  entity: string
  action: string
  entityId: number
  entityName: string
  userId: number
  userName: string
  officeId: number
  result: 'success' | 'failure'
  notes: string
}

export interface PaymentType { id: number; name: string; isCash: boolean }

export interface Paged<T> {
  pageItems: T[]
  totalFilteredCount: number
  page: number
  size: number
}
