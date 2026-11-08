/**
 * Status vocabulary shared by every module — one place where Fineract
 * status codes become human labels and badge colours.
 */
import type { StatusTone } from '@shared/types/models'

const MAP: Record<string, { label: string; tone: StatusTone }> = {
  // clients / groups
  active: { label: 'Active', tone: 'green' },
  pending: { label: 'Pending', tone: 'amber' },
  closed: { label: 'Closed', tone: 'gray' },
  transferred: { label: 'Transferred', tone: 'blue' },
  // loans
  submitted: { label: 'Submitted', tone: 'amber' },
  approved: { label: 'Approved', tone: 'blue' },
  rejected: { label: 'Rejected', tone: 'red' },
  withdrawn: { label: 'Withdrawn', tone: 'gray' },
  writtenoff: { label: 'Written off', tone: 'red' },
  // savings
  dormant: { label: 'Dormant', tone: 'purple' },
  // maker-checker
  // tasks reuse pending/approved/rejected
  // generic
  inactive: { label: 'Inactive', tone: 'gray' },
  disabled: { label: 'Disabled', tone: 'red' },
  overdue: { label: 'Overdue', tone: 'red' },
  partial: { label: 'Partial', tone: 'amber' },
  upcoming: { label: 'Upcoming', tone: 'blue' },
  due: { label: 'Due', tone: 'amber' },
  paid: { label: 'Paid', tone: 'green' },
  success: { label: 'Success', tone: 'green' },
  failure: { label: 'Failed', tone: 'red' },
}

export function useStatusMeta() {
  const meta = (status: string | null | undefined) =>
    MAP[status ?? ''] ?? { label: (status ?? '—').replace(/^\w/, c => c.toUpperCase()), tone: 'gray' as StatusTone }

  /** Loan-aware: active + overdue amount → overdue badge. */
  const loanStatus = (loan: { status: string; overdueAmount: number }) => {
    if (loan.status === 'active' && loan.overdueAmount > 0) return { label: 'Overdue', tone: 'red' as StatusTone }
    return meta(loan.status)
  }

  return { meta, loanStatus }
}
