import { requireBusinessDeskSession } from '../../../utils/auth'
import {
  publicCurrencyRate,
  type CurrencyQuote,
} from '../../../utils/public-currency-rate'
const cache = new Map<string, { expires: number; quote: CurrencyQuote }>()
const pending = new Map<string, Promise<CurrencyQuote>>()
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  await requireBusinessDeskSession(event)
  const { from, to } = getQuery(event)
  if (
    typeof from !== 'string' ||
    typeof to !== 'string' ||
    !/^[A-Z]{3}$/.test(from) ||
    !/^[A-Z]{3}$/.test(to)
  )
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid three-letter currency symbols are required.',
    })
  const key = `${from}/${to}`,
    cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.quote
  try {
    let request = pending.get(key)
    if (!request) {
      if (pending.size >= 100) throw new Error('Busy')
      request = publicCurrencyRate(from, to, (url) =>
        $fetch(url, { timeout: 5000, retry: 0, redirect: 'error' }),
      )
      pending.set(key, request)
      void request.finally(() => pending.delete(key)).catch(() => {})
    }
    const quote = await request
    if (cache.size >= 200) cache.delete(cache.keys().next().value!)
    cache.set(key, { expires: Date.now() + 5 * 60000, quote })
    return quote
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage:
        'Daily exchange rate unavailable. Enter an exchange rate manually.',
    })
  }
})
