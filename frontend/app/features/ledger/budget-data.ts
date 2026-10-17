import { ledgerOrganizationalUnits, type LedgerOrganizationalUnit } from './organization-data'

export type LedgerBudgetStatus = 'draft' | 'submitted' | 'approved' | 'closed'

export interface LedgerBudgetDetail {
  id: string
  month: number
  year: number
  budgetAmount: number
  revisedAmount: number
}

export interface LedgerBudget {
  id: string
  accountId: string
  accountNumber: string
  accountName: string
  organizationUnitId: string
  organizationUnitName: string
  beginDate: string
  endDate: string
  status: LedgerBudgetStatus
  details: LedgerBudgetDetail[]
}

export type BudgetOrganizationalUnit = LedgerOrganizationalUnit
export const budgetOrganizationalUnits: BudgetOrganizationalUnit[] = ledgerOrganizationalUnits

function makeMonthlyDetails(
  budgetKey: string,
  year: number,
  amountForMonth: (month: number) => number,
  revisedForMonth: (month: number) => number = () => 0,
): LedgerBudgetDetail[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return {
      id: `${budgetKey}-line-${year}-${month}`,
      month,
      year,
      budgetAmount: amountForMonth(month),
      revisedAmount: revisedForMonth(month),
    }
  })
}

const budgetSeed: LedgerBudget[] = [
  {
    id: 'budget-revenue-2025',
    accountId: 'acc-4000',
    accountNumber: '4000',
    accountName: 'Service Revenue',
    organizationUnitId: 'ou-operations',
    organizationUnitName: 'Operations',
    beginDate: '2025-01-01',
    endDate: '2025-12-01',
    status: 'closed',
    details: makeMonthlyDetails('budget-revenue-2025', 2025, (month) => 42_000 + month * 250, (month) => 42_000 + month * 300),
  },
  {
    id: 'budget-revenue-2026',
    accountId: 'acc-4000',
    accountNumber: '4000',
    accountName: 'Service Revenue',
    organizationUnitId: 'ou-operations',
    organizationUnitName: 'Operations',
    beginDate: '2026-01-01',
    endDate: '2026-12-01',
    status: 'approved',
    details: makeMonthlyDetails('budget-revenue-2026', 2026, (month) => 46_000 + month * 300, (month) => 47_000 + month * 300),
  },
  {
    id: 'budget-expenses-2026',
    accountId: 'acc-5000',
    accountNumber: '5000',
    accountName: 'Operating Expenses',
    organizationUnitId: 'ou-finance',
    organizationUnitName: 'Finance & Administration',
    beginDate: '2026-01-01',
    endDate: '2026-12-01',
    status: 'draft',
    details: makeMonthlyDetails('budget-expenses-2026', 2026, (month) => 9_500 + month * 175),
  },
]

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useLedgerBudgets() {
  const budgets = useState<LedgerBudget[]>('ledger-budgets', () => budgetSeed.map((budget) => ({
    ...budget,
    details: budget.details.map((detail) => ({ ...detail })),
  })))

  function saveBudget(input: Omit<LedgerBudget, 'id'> & { id?: string }) {
    const index = budgets.value.findIndex((budget) => budget.id === input.id)
    if (index >= 0) {
      const updated: LedgerBudget = {
        ...input,
        id: input.id!,
        details: input.details.map((detail) => ({ ...detail })),
      }
      budgets.value[index] = updated
      return updated
    }

    const created: LedgerBudget = {
      ...input,
      id: input.id || makeId('budget'),
      details: input.details.map((detail) => ({ ...detail, id: detail.id || makeId('budget-line') })),
    }
    budgets.value.unshift(created)
    return created
  }

  function removeBudget(id: string) {
    budgets.value = budgets.value.filter((budget) => budget.id !== id)
  }

  return { budgets, saveBudget, removeBudget }
}
