import type { LedgerAccountControl, LedgerAccountHead, StandardAccountType } from './setup-data'

// Match the backend AccountType enum; unresolved classifications are Unknown (-1).
const accountTypeOrder: Record<StandardAccountType, number> = {
  Asset: 0,
  Liability: 1,
  Equity: 2,
  Revenue: 3,
  Expense: 4,
}

export function sortAccountControlsByType(
  controls: readonly LedgerAccountControl[],
  heads: readonly LedgerAccountHead[],
): LedgerAccountControl[] {
  const typeByHead = new Map(heads.map(head => [head.id, accountTypeOrder[head.standardAccountType] ?? -1]))
  // Sort a copy, retaining the existing order within each classification.
  return [...controls].sort((a, b) => (typeByHead.get(a.accountGroupId) ?? -1) - (typeByHead.get(b.accountGroupId) ?? -1))
}
