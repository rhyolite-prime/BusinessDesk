import type { LedgerVoucher } from '../../../../app/features/ledger/voucher-data'
import { getDemoVoucher } from '../../../utils/ledger-voucher-demo'
import { requireBusinessDeskSession } from '../../../utils/auth'

export default defineEventHandler(async (event): Promise<LedgerVoucher> => {
  const session = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Voucher id is required.' })

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')
  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<LedgerVoucher>(`${baseUrl}/api/v1/ledger/vouchers/${encodeURIComponent(id)}`, {
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }
  const voucher = getDemoVoucher(id)
  if (!voucher) throw createError({ statusCode: 404, statusMessage: 'Voucher not found.' })
  return voucher
})
