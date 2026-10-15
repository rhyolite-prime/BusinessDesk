import type { CreateAccountInput, LedgerAccount } from '../../../app/features/ledger/types'
import { demoAccounts } from '../../utils/ledger-demo'
import { requireBusinessDeskSession } from '../../utils/auth'

export default defineEventHandler(async (event): Promise<LedgerAccount> => {
  const session = await requireBusinessDeskSession(event)
  const body = await readBody<Partial<CreateAccountInput>>(event)
  const accountNumber = String(body?.accountNumber ?? '').trim()
  const name = String(body?.name ?? '').trim()
  const group = String(body?.group ?? '').trim()
  const accountType = String(body?.accountType ?? '').trim()
  const currency = String(body?.currency ?? 'GHS').trim().toUpperCase()
  const accountHeaderId = String(body?.accountHeaderId ?? '').trim()
  const status = String(body?.status ?? 'Active').trim()

  const allowedTypes = new Set(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'])
  const allowedStatuses = new Set(['Active', 'Inactive'])
  if (!accountNumber || accountNumber.length > 80 || !name || name.length > 200 || !group || group.length > 160 || !allowedTypes.has(accountType) || !/^[A-Z]{3}$/.test(currency) || accountHeaderId.length > 80 || !allowedStatuses.has(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid account number, name, group, type, and currency.' })
  }

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')
  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<LedgerAccount>(`${baseUrl}/api/v1/ledger/accounts`, {
      method: 'POST',
      body: { accountNumber, name, group, accountType, currency, status, ...(accountHeaderId ? { accountHeaderId } : {}) },
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }

  if (demoAccounts.some((account) => account.accountNumber.toLowerCase() === accountNumber.toLowerCase())) {
    throw createError({ statusCode: 409, statusMessage: 'That account number is already in use.' })
  }

  const account: LedgerAccount = {
    id: `demo-${crypto.randomUUID()}`,
    accountNumber,
    name,
    group,
    accountType,
    currency,
    ...(accountHeaderId ? { accountHeaderId } : {}),
    balance: '0.00',
    status: status as 'Active' | 'Inactive',
  }
  demoAccounts.unshift(account)
  setResponseStatus(event, 201)
  return account
})
