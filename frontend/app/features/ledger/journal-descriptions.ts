import type { JournalLine, JournalOptions } from './journal-types'
import { parseLedgerAmount } from './money.ts'

// Limits match server byte validation, including non-ASCII catalog names.
export function limitJournalDescription(value: string, limit: number): string {
  let result = '',
    length = 0
  const encoder = new TextEncoder()
  for (const character of value) {
    const size = encoder.encode(character).length
    if (length + size > limit) break
    result += character
    length += size
  }
  return result
}
export function suggestBatchDescription(context: {
  batchDate: string
  isMultiCurrency: boolean
  currencyId: string
  lines: JournalLine[]
  options: JournalOptions
}): string {
  const accounts = [
    ...new Set(
      context.lines
        .map(
          (line) =>
            context.options.accounts.find((a) => a.id === line.accountId)?.name,
        )
        .filter(Boolean),
    ),
  ].slice(0, 2)
  const currencies = [
    ...new Set(
      context.lines
        .map(
          (line) =>
            context.options.currencies.find((c) => c.id === line.currencyId)
              ?.code,
        )
        .filter(Boolean),
    ),
  ]
  if (!currencies.length) {
    const code = context.options.currencies.find(
      (c) => c.id === context.currencyId,
    )?.code
    if (code) currencies.push(code)
  }
  return limitJournalDescription(
    [
      context.isMultiCurrency ? 'Multi-currency journal' : 'Local journal',
      context.batchDate,
      currencies.join('/'),
      accounts.join(' / '),
    ]
      .filter(Boolean)
      .join(' · '),
    200,
  )
}
export function suggestLineDescription(
  line: JournalLine,
  options: JournalOptions,
): string {
  const debit = parseLedgerAmount(line.debit, true),
    credit = parseLedgerAmount(line.credit, true)
  const side =
    debit !== null && credit !== null && debit > 0n && credit === 0n
      ? 'Debit'
      : debit !== null && credit !== null && credit > 0n && debit === 0n
        ? 'Credit'
        : 'Journal entry'
  return limitJournalDescription(
    [
      side,
      options.accounts.find((a) => a.id === line.accountId)?.name,
      options.currencies.find((c) => c.id === line.currencyId)?.code,
      line.transactionDate,
      line.referenceNumber.trim(),
      options.costCenters.find((c) => c.id === line.costCenterId)?.name,
    ]
      .filter(Boolean)
      .join(' · '),
    300,
  )
}
