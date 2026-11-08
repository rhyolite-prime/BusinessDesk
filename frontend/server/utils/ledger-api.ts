import { createError, type H3Event } from 'h3'
import { requireBusinessDeskSession } from './auth'

export async function getLedgerResource<T>(event: H3Event, resource: string, query: Record<string, unknown>, demo: () => T): Promise<T> {
  const session = await requireBusinessDeskSession(event)
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')

  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return (await $fetch<T>(`${baseUrl}/api/v1/ledger/${resource}`, {
      query,
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })) as T
  }

  if (process.env.NODE_ENV !== 'production' || config.public.demoMode) {
    return demo()
  }

  throw createError({
    statusCode: 503,
    statusMessage: 'Ledger API is not configured',
    data: { code: 'LEDGER_API_UNAVAILABLE' },
  })
}
