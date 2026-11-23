export interface AccountControlRange {
  minAccount: number
  maxAccount: number
}

export interface ExistingAccountDetail {
  accountNumber?: string | null
  id?: string | null
}

/**
 * Computes the next available whole-number account number within the control's
 * allowable [minAccount, maxAccount] range.
 *
 * Scans integers sequentially starting from minAccount up to maxAccount.
 * Returns the first number that is not currently used by any existing account
 * in the accounting unit (optionally excluding an account currently being edited).
 * Returns an empty string if no number within the range is available or if input is invalid.
 */
export function getNextAvailableAccountNumber(
  control: AccountControlRange | null | undefined,
  existingAccounts: ExistingAccountDetail[] = [],
  excludeAccountId?: string | null
): string {
  if (!control) return ''

  const rawMin = control.minAccount
  const rawMax = control.maxAccount

  if (
    typeof rawMin !== 'number' ||
    typeof rawMax !== 'number' ||
    !Number.isSafeInteger(rawMin) ||
    !Number.isSafeInteger(rawMax)
  ) {
    return ''
  }

  const min = Math.min(rawMin, rawMax)
  const max = Math.max(rawMin, rawMax)

  if (min < 0 || max > 2147483647) {
    return ''
  }

  const usedInRange = new Set<number>()
  for (const acc of existingAccounts) {
    if (excludeAccountId && acc.id === excludeAccountId) {
      continue
    }
    const raw = String(acc.accountNumber ?? '').trim()
    if (/^\d+$/.test(raw)) {
      const num = Number(raw)
      if (Number.isSafeInteger(num) && num >= min && num <= max) {
        usedInRange.add(num)
      }
    }
  }

  // By pigeonhole principle, if there are K used numbers in range,
  // the first unused number starting from min must be <= min + K.
  const limit = Math.min(max, min + usedInRange.size)
  for (let candidate = min; candidate <= limit; candidate++) {
    if (!usedInRange.has(candidate)) {
      return String(candidate)
    }
  }

  return ''
}

export const findNextAvailableAccountNumber = getNextAvailableAccountNumber
