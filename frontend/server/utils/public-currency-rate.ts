// Public indicative daily quotes, never a posting-time dependency. Only ISO-style
// symbols go to fixed provider hosts; credentials and journal data never leave.
export type CurrencyQuote = {
  from: string
  to: string
  rate: string
  date: string
  source: string
}
export function normalizeSuggestedRate(value: unknown): string {
  if (typeof value !== 'number' && typeof value !== 'string')
    throw new Error('Invalid rate')
  const text = String(value)
  const match = /^(\d{1,30})(?:\.(\d{1,30}))?(?:e([+-]?\d{1,2}))?$/i.exec(text)
  if (!match || text.length > 80) throw new Error('Invalid rate')
  const exponent = Number(match[3] || 0) - (match[2]?.length || 0) + 10
  if (Math.abs(exponent) > 60) throw new Error('Invalid rate')
  const digits = BigInt(match[1]! + (match[2] || ''))
  const divisor = exponent < 0 ? 10n ** BigInt(-exponent) : 1n
  const scaled =
    exponent < 0
      ? (digits + divisor / 2n) / divisor
      : digits * 10n ** BigInt(exponent)
  if (scaled <= 0n || scaled > 99999999999999999999n)
    throw new Error('Rate outside ledger precision')
  return `${scaled / 10000000000n}.${String(scaled % 10000000000n).padStart(10, '0')}`
}
export async function publicCurrencyRate(
  from: string,
  to: string,
  fetcher: (url: string) => Promise<unknown>,
  now = new Date(),
): Promise<CurrencyQuote> {
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to))
    throw new Error('Invalid currency symbols')
  if (from === to)
    return {
      from,
      to,
      rate: '1',
      date: now.toISOString().slice(0, 10),
      source: 'Base currency',
    }
  const symbol = from.toLowerCase(),
    target = to.toLowerCase()
  const endpoints = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${symbol}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${symbol}.json`,
  ]
  for (const url of endpoints) {
    try {
      const body = (await fetcher(url)) as {
        date?: unknown
        [key: string]: unknown
      }
      if (
        !body ||
        typeof body.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.date)
      )
        throw new Error('Invalid quote date')
      const timestamp = Date.parse(`${body.date}T00:00:00Z`),
        age = now.getTime() - timestamp
      if (
        !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== body.date ||
        age < -86400000 ||
        age > 7 * 86400000
      )
        throw new Error('Stale quote')
      const values = body[symbol] as Record<string, unknown> | undefined
      const rate = normalizeSuggestedRate(values?.[target])
      return {
        from,
        to,
        rate,
        date: body.date,
        source: 'Fawaz Ahmed Currency API',
      }
    } catch {
      /* Try the documented independent fallback, then require manual entry. */
    }
  }
  throw new Error('Daily quote unavailable')
}
