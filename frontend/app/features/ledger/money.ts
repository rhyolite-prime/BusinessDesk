export const LEDGER_AMOUNT_SCALE = BigInt(1000000)
export const LEDGER_RATE_SCALE = BigInt(10000000000)

function normalizeWholePart(value: string): string | null {
  const normalized = value.replace(/^0+/, '') || '0'
  return normalized.length <= 14 ? normalized : null
}

export function parseLedgerAmount(value: string, blankAsZero = false): bigint | null {
  const amount = value.trim()
  if (!amount && blankAsZero) return BigInt(0)
  if (amount.length > 64 || !/^\d+(\.\d{1,6})?$/.test(amount)) return null
  const [whole = '0', fraction = ''] = amount.split('.')
  const normalizedWhole = normalizeWholePart(whole)
  if (normalizedWhole === null) return null
  return BigInt(normalizedWhole) * LEDGER_AMOUNT_SCALE + BigInt(fraction.padEnd(6, '0'))
}

export function parseLedgerRate(value: string): bigint | null {
  const rate = value.trim()
  if (rate.length > 64 || !/^\d+(\.\d{1,10})?$/.test(rate)) return null
  const [whole = '0', fraction = ''] = rate.split('.')
  const normalizedWhole = normalizeWholePart(whole)
  if (normalizedWhole === null) return null
  return BigInt(normalizedWhole) * LEDGER_RATE_SCALE + BigInt(fraction.padEnd(10, '0'))
}

export function formatLedgerAmount(units: bigint): string {
  const whole = units / LEDGER_AMOUNT_SCALE
  const fraction = String(units % LEDGER_AMOUNT_SCALE).padStart(6, '0')
  return `${whole}.${fraction}`
}

export function convertLedgerAmount(amountUnits: bigint, rateUnits: bigint): bigint {
  return (amountUnits * rateUnits + LEDGER_RATE_SCALE / BigInt(2)) / LEDGER_RATE_SCALE
}

export function percentageOfLedgerAmount(amountUnits: bigint, percentageUnits: bigint): bigint {
  const divisor = BigInt(100) * LEDGER_AMOUNT_SCALE
  return (amountUnits * percentageUnits + divisor / BigInt(2)) / divisor
}

export function sumLedgerAmounts(values: string[]): bigint | null {
  let total = BigInt(0)
  for (const value of values) {
    const units = parseLedgerAmount(value, true)
    if (units === null) return null
    total += units
  }
  return total
}
