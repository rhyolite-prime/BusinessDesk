import {
  parseLedgerAmount,
  parseLedgerRate,
  convertLedgerAmount,
  convertBaseToTransactionAmount,
  formatLedgerAmount,
} from './money.ts'

const maxScaled = 99999999999999999999n

/** Positive means a missing credit; negative means a missing debit (base micros). */
export function journalDeficit(
  lines: { debit: string; credit: string; exchangeRate: string }[],
): bigint | null {
  let debit = 0n,
    credit = 0n
  for (const line of lines) {
    const d = parseLedgerAmount(line.debit, true)
    const c = parseLedgerAmount(line.credit, true)
    const rate = parseLedgerRate(line.exchangeRate)
    if (
      d === null ||
      c === null ||
      rate === null ||
      rate <= 0n ||
      rate > maxScaled ||
      (d > 0n && c > 0n)
    )
      return null
    const bd = convertLedgerAmount(d, rate),
      bc = convertLedgerAmount(c, rate)
    if (bd > maxScaled || bc > maxScaled || (d + c > 0n && bd + bc === 0n))
      return null
    debit += bd
    credit += bc
    if (debit > maxScaled || credit > maxScaled) return null
  }
  return debit - credit
}

/** Convert a base deficit to transaction currency without floating-point math. */
export function journalBalancingAmounts(deficit: bigint, exchangeRate: string) {
  const rate = parseLedgerRate(exchangeRate)
  if (rate === null || rate <= 0n || rate > maxScaled) return null
  const needed = deficit < 0n ? -deficit : deficit
  const native = convertBaseToTransactionAmount(needed, rate)
  if (native > maxScaled || (needed > 0n && native === 0n)) return null
  return {
    debit: formatLedgerAmount(deficit < 0n ? native : 0n),
    credit: formatLedgerAmount(deficit > 0n ? native : 0n),
    exact: convertLedgerAmount(native, rate) === needed,
  }
}
