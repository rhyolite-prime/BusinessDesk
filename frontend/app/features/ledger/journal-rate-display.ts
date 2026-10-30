import { parseLedgerRate } from './money.ts'
// Presentation only: do not round saved financial values when opening a draft.
export function journalRateDisplay(value: string): string {
  const units = parseLedgerRate(value)
  if (units === null) return value
  const rounded = (units + 500000n) / 1000000n
  return `${rounded / 10000n}.${String(rounded % 10000n).padStart(4, '0')}`
}
