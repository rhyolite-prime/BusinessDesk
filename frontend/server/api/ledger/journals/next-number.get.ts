import { getNextDemoJournalBatchNumber } from '../../../utils/ledger-demo'
import { requireBusinessDeskSession } from '../../../utils/auth'

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default defineEventHandler(async (event): Promise<{ batchNumber: string }> => {
  const session = await requireBusinessDeskSession(event)
  const batchDate = String(getQuery(event).batchDate ?? '').trim()
  if (!isRealDate(batchDate)) {
    throw createError({ statusCode: 400, statusMessage: 'Batch date must be a real calendar date in YYYY-MM-DD format.' })
  }

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')
  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<{ batchNumber: string }>(`${baseUrl}/api/v1/ledger/journals/next-number`, {
      query: { batchDate },
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }

  return { batchNumber: getNextDemoJournalBatchNumber(batchDate) }
})
