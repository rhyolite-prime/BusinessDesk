import type { CreateJournalDraftInput, JournalValidationResponse } from '../../../../app/features/ledger/types'
import { formatLedgerAmount } from '../../../../app/features/ledger/money'
import { demoAccounts } from '../../../utils/ledger-demo'
import { normalizeJournalLineAmounts } from '../../../utils/ledger-journal-amounts'
import { requireBusinessDeskSession } from '../../../utils/auth'

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default defineEventHandler(async (event): Promise<JournalValidationResponse> => {
  const session = await requireBusinessDeskSession(event)
  const body = await readBody<Partial<CreateJournalDraftInput>>(event)
  const lines = Array.isArray(body?.lines) ? body.lines : []
  const description = String(body?.description ?? '').trim()
  const batchDate = String(body?.batchDate ?? '').trim()
  const isMultiCurrency = Boolean(body?.isMultiCurrency) || lines.some((line) => String(line?.currencyCode ?? 'GHS').trim().toUpperCase() !== 'GHS')
  const errors: string[] = []

  if (!description || description.length > 200) errors.push('Journal description is required and must not exceed 200 characters.')
  if (!isRealDate(batchDate)) errors.push('Journal date must be a real calendar date in YYYY-MM-DD format.')
  if (lines.length < 2) errors.push('A journal draft must contain at least two lines.')
  if (lines.length > 1000) errors.push('A journal draft cannot contain more than 1000 lines.')

  const metadataErrors: string[] = []
  lines.slice(0, 1000).forEach((line, index) => {
    const referenceNumber = String(line?.referenceNumber ?? '').trim()
    const transactionDate = String(line?.transactionDate ?? batchDate).trim()
    if (!referenceNumber || referenceNumber.length > 80) metadataErrors.push(`Line ${index + 1}: reference number is required and must not exceed 80 characters.`)
    if (!isRealDate(transactionDate)) metadataErrors.push(`Line ${index + 1}: transaction date must be a real calendar date in YYYY-MM-DD format.`)
    const accountId = String(line?.accountId ?? '').trim()
    if (!accountId || accountId.length > 80) metadataErrors.push(`Line ${index + 1}: account is required and must not exceed 80 characters.`)
    if (String(line?.description ?? '').length > 300) metadataErrors.push(`Line ${index + 1}: description must not exceed 300 characters.`)
  })
  errors.push(...metadataErrors)

  const amountResults = lines.slice(0, 1000).map((line, index) => normalizeJournalLineAmounts(line, index + 1, isMultiCurrency))
  for (const result of amountResults) errors.push(...result.errors)

  if (errors.length) {
    return { valid: false, balanced: false, debitTotal: '0.000000', creditTotal: '0.000000', errors }
  }

  const normalizedLines = lines.slice(0, 1000).map((line, index) => {
    const amounts = amountResults[index]?.value!
    return {
      ...line,
      currencyCode: amounts.currencyCode,
      currencyName: amounts.currencyName,
      exchangeRate: amounts.exchangeRate,
      foreignDebit: amounts.foreignDebit,
      foreignCredit: amounts.foreignCredit,
      debit: amounts.debit,
      credit: amounts.credit,
    }
  })

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')
  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<JournalValidationResponse>(`${baseUrl}/api/v1/ledger/journals/validate`, {
      method: 'POST',
      body: { ...body, isMultiCurrency, lines: normalizedLines },
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }

  for (const [index, line] of normalizedLines.entries()) {
    const account = demoAccounts.find((item) => item.id === line.accountId && item.status === 'Active')
    if (!account) errors.push(`Line ${index + 1}: select an active account from the chart of accounts.`)
    else if (account.currency.toUpperCase() !== line.currencyCode) {
      errors.push(`Line ${index + 1}: account ${account.accountNumber} is assigned to ${account.currency}; use its account currency on the journal line.`)
    }
  }

  const debitUnits = amountResults.reduce((sum, result) => sum + (result.value?.debitUnits ?? BigInt(0)), BigInt(0))
  const creditUnits = amountResults.reduce((sum, result) => sum + (result.value?.creditUnits ?? BigInt(0)), BigInt(0))
  const valid = errors.length === 0
  return {
    valid,
    balanced: valid && debitUnits === creditUnits,
    debitTotal: formatLedgerAmount(debitUnits),
    creditTotal: formatLedgerAmount(creditUnits),
    errors,
  }
})
