import { demoAccounts } from '../../../utils/ledger-demo'
import { requireBusinessDeskSession } from '../../../utils/auth'

export default defineEventHandler(async (event): Promise<{ id: string; deleted: boolean }> => {
  const session = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'An account id is required.' })

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')
  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    await $fetch(`${baseUrl}/api/v1/ledger/accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
    return { id, deleted: true }
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }

  const index = demoAccounts.findIndex((account) => account.id === id)
  if (index < 0) throw createError({ statusCode: 404, statusMessage: 'Ledger account not found.' })
  demoAccounts.splice(index, 1)
  return { id, deleted: true }
})
