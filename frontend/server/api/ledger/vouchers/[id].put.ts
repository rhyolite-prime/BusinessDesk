import type { CreateLedgerVoucherInput, LedgerVoucher } from '../../../../app/features/ledger/voucher-data'
import { getDemoVoucher, saveDemoVoucher } from '../../../utils/ledger-voucher-demo'
import { requireBusinessDeskSession } from '../../../utils/auth'
import { normalizeVoucherInput } from '../../../utils/ledger-voucher-validation'

export default defineEventHandler(async (event): Promise<LedgerVoucher> => {
  const session = await requireBusinessDeskSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Voucher id is required.' })
  const body = await readBody<Partial<CreateLedgerVoucherInput>>(event)
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')

  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<LedgerVoucher>(`${baseUrl}/api/v1/ledger/vouchers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }

  const existing = getDemoVoucher(id)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Voucher not found.' })
  if (existing.status !== 'Draft') throw createError({ statusCode: 409, statusMessage: 'Only draft vouchers can be edited.' })
  if (existing.type !== body.type) throw createError({ statusCode: 400, statusMessage: 'The voucher type cannot be changed.' })

  const normalized = normalizeVoucherInput(body)
  const voucher: LedgerVoucher = {
    ...normalized,
    id: existing.id,
    voucherNumber: existing.voucherNumber,
    batchNumber: existing.batchNumber,
    status: 'Draft',
    preparer: existing.preparer,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  return saveDemoVoucher(voucher)
})
