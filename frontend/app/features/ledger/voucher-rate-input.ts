import { journalRateDisplay } from './journal-rate-display.ts'
import { parseLedgerRate } from './money.ts'

// Display only. Fetched/saved rates retain their full precision until explicitly edited.
export const voucherRateDisplay = journalRateDisplay

// Accept partial decimal entry, round pasted/typed excess precision exactly, and
// reject invalid syntax rather than silently turning it into a different rate.
export function voucherRateInput(value: string): string | null {
  const text = value.trim()
  if (text.length > 64 || !/^\d*(?:\.\d*)?$/.test(text)) return null
  if (text === '' || text === '.') return text
  const normalized = text.startsWith('.') ? `0${text}` : text
  const [whole = '0', fraction = ''] = normalized.split('.')
  if (parseLedgerRate(whole) === null) return null
  if (fraction.length <= 4) return normalized
  const rounded = voucherRateDisplay(`${whole}.${fraction.slice(0, 5)}`)
  return parseLedgerRate(rounded) === null ? null : rounded
}
