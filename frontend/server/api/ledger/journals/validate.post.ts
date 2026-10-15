import type { CreateJournalDraftInput, JournalValidationResponse } from '../../../../app/features/ledger/types'
import { requireBusinessDeskSession } from '../../../utils/auth'

const decimalScale = BigInt(1_000_000)

function parseAmount(value: unknown): bigint | null {
  const amount = String(value ?? '')
  if (amount.length > 64 || !/^\d+(\.\d{1,6})?$/.test(amount)) return null

  const [whole, fraction = ''] = amount.split('.')
  const normalizedWhole = (whole ?? '0').replace(/^0+/, '') || '0'
  if (normalizedWhole.length > 14) return null
  return BigInt(normalizedWhole) * decimalScale + BigInt(fraction.padEnd(6, '0'))
}

function formatAmount(units: bigint): string {
  const whole = units / decimalScale
  const fraction = String(units % decimalScale).padStart(6, '0')
  return `${whole}.${fraction}`
}

export default defineEventHandler(async (event): Promise<JournalValidationResponse> => {
  const session = await requireBusinessDeskSession(event)
  const body = await readBody<Partial<CreateJournalDraftInput>>(event)
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')

  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<JournalValidationResponse>(`${baseUrl}/api/v1/ledger/journals/validate`, {
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

  const description = String(body?.description ?? '').trim()
  const batchDate = String(body?.batchDate ?? '').trim()
  const lines = Array.isArray(body?.lines) ? body.lines : []
  const errors: string[] = []
  const parsedDate = new Date(`${batchDate}T00:00:00Z`)

  if (!description || description.length > 200) errors.push('Journal description is required and must not exceed 200 characters.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(batchDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== batchDate) {
    errors.push('Journal date must be a real calendar date in YYYY-MM-DD format.')
  }
  if (lines.length < 2) errors.push('A journal draft must contain at least two lines.')
  if (lines.length > 1000) errors.push('A journal draft cannot contain more than 1000 lines.')

  let debitTotal = BigInt(0)
  let creditTotal = BigInt(0)
  for (const [index, line] of lines.slice(0, 1000).entries()) {
    const lineNumber = index + 1
    const accountId = String(line.accountId ?? '').trim()
    const lineDescription = String(line.description ?? '')
    if (!accountId || accountId.length > 80) errors.push(`Line ${lineNumber}: account is required and must not exceed 80 characters.`)
    if (lineDescription.length > 300) errors.push(`Line ${lineNumber}: description must not exceed 300 characters.`)

    const debit = parseAmount(line.debit)
    const credit = parseAmount(line.credit)
    if (debit === null) errors.push(`Line ${lineNumber}: debit must be a non-negative decimal with at most 14 whole digits and 6 decimal places.`)
    if (credit === null) errors.push(`Line ${lineNumber}: credit must be a non-negative decimal with at most 14 whole digits and 6 decimal places.`)
    if (debit === null || credit === null) continue
    if (debit > BigInt(0) && credit > BigInt(0)) errors.push(`Line ${lineNumber}: enter an amount on either debit or credit, not both.`)
    if (debit === BigInt(0) && credit === BigInt(0)) errors.push(`Line ${lineNumber}: either debit or credit must be greater than zero.`)
    debitTotal += debit
    creditTotal += credit
  }

  const valid = errors.length === 0
  return {
    valid,
    balanced: valid && debitTotal === creditTotal,
    debitTotal: formatAmount(debitTotal),
    creditTotal: formatAmount(creditTotal),
    errors,
  }
})
