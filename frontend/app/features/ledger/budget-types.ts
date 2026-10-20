export type LedgerBudgetStatus = "draft" | "submitted" | "approved" | "closed";
export interface LedgerBudgetDetail {
  id: string;
  month: number;
  year: number;
  budgetAmount: string;
  revisedAmount: string;
}
export interface LedgerBudget {
  id: string;
  accountingUnitId: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  organizationUnitId: string | null;
  organizationUnitName: string;
  costCenterId: string | null;
  costCenterName: string;
  beginDate: string;
  endDate: string;
  status: LedgerBudgetStatus;
  details: LedgerBudgetDetail[];
}
