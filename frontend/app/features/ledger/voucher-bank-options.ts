interface BankLink {
  accountId: string
  accountingUnitId: string
  isActive: boolean
}

/** Header bank GLs are the intersection of eligible GLs and active bank links. */
export function voucherBankGlOptions<T extends { id: string }>(
  accounts: readonly T[],
  banks: readonly BankLink[],
  accountingUnitId: string,
): T[] {
  if (!accountingUnitId) return []
  const linkedIds = new Set(banks
    .filter(bank => bank.isActive && bank.accountingUnitId === accountingUnitId)
    .map(bank => bank.accountId))
  return accounts.filter(account => linkedIds.has(account.id))
}
