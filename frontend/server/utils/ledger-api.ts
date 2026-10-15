import type { H3Event } from 'h3'

export async function getLedgerResource<T>(event: H3Event, resource: string, query: Record<string, unknown>, demo: () => T): Promise<T> {
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')

  if (baseUrl) {
    return (await $fetch<T>(`${baseUrl}/api/v1/ledger/${resource}`, {
      query,
      headers: {
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
