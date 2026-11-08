/** Server-only auxiliary types (not part of the shared client model). */

export interface Holiday {
  id: number
  name: string
  description: string
  fromDate: string
  toDate: string
  officeId: number
  status: 'active' | 'deleted'
}

export interface DB {
  seededAt: string
  offices: import('@shared/types/models').Office[]
  staff: import('@shared/types/models').Staff[]
  clients: import('@shared/types/models').Client[]
  groups: import('@shared/types/models').Group[]
  loanProducts: import('@shared/types/models').LoanProduct[]
  savingsProducts: import('@shared/types/models').SavingsProduct[]
  charges: import('@shared/types/models').Charge[]
  loans: import('@shared/types/models').Loan[]
  savings: import('@shared/types/models').SavingsAccount[]
  glAccounts: import('@shared/types/models').GLAccount[]
  journals: import('@shared/types/models').JournalEntry[]
  closures: import('@shared/types/models').Closure[]
  users: import('@shared/types/models').UserAccount[]
  roles: import('@shared/types/models').Role[]
  tasks: import('@shared/types/models').CheckerTask[]
  audit: import('@shared/types/models').AuditEntry[]
  paymentTypes: import('@shared/types/models').PaymentType[]
  holidays: Holiday[]
  counters: Record<string, number>
  currentUser: { id: number; username: string; name: string; role: string; officeId: number }
}
