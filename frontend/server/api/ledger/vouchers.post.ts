import type { CreateLedgerVoucherInput, LedgerVoucher } from '../../../app/features/ledger/voucher-data'
import { nextDemoVoucherNumbers, saveDemoVoucher } from '../../utils/ledger-voucher-demo'
import { requireBusinessDeskSession } from '../../utils/auth'
import { normalizeVoucherInput } from '../../utils/ledger-voucher-validation'

export default defineEventHandler(async (event): Promise<LedgerVoucher> => {
  const session = await requireBusinessDeskSession(event)
  const body = await readBody<Partial<CreateLedgerVoucherInput>>(event)
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')

  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<LedgerVoucher>(`${baseUrl}/api/v1/ledger/vouchers`, {
      method: 'POST',
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

  const normalized = normalizeVoucherInput(body)
  const { voucherNumber, batchNumber } = nextDemoVoucherNumbers(normalized.type, normalized.entryDate.slice(0, 4))
  const now = new Date().toISOString()
  const voucher: LedgerVoucher = {
    ...normalized,
    id: `demo-${crypto.randomUUID()}`,
    voucherNumber,
    batchNumber,
    status: 'Draft',
    preparer: session.username,
    createdAt: now,
    updatedAt: now,
  }
  saveDemoVoucher(voucher)
  setResponseStatus(event, 201)
  return voucher
})
