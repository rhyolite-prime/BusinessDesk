import type { H3Event } from 'h3'
import type { LedgerVoucher } from '../../app/features/ledger/voucher-data'
import type { VoucherTransition } from './ledger-voucher-demo'
import { getDemoVoucher, transitionDemoVoucher } from './ledger-voucher-demo'
import { requireBusinessDeskSession } from './auth'

export async function handleVoucherTransition(event: H3Event, action: VoucherTransition): Promise<LedgerVoucher> {
  const session = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Voucher id is required.' })
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')

  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<LedgerVoucher>(`${baseUrl}/api/v1/ledger/vouchers/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }
  if (!getDemoVoucher(id)) throw createError({ statusCode: 404, statusMessage: 'Voucher not found.' })
  const updated = transitionDemoVoucher(id, action, new Date().toISOString())
  if (!updated) {
    const expected = action === 'submit' ? 'Draft' : action === 'approve' ? 'Pending approval' : 'Approved'
    throw createError({ statusCode: 409, statusMessage: `This voucher can only be ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : 'posted'} while its status is ${expected}.` })
  }
  return updated
}
