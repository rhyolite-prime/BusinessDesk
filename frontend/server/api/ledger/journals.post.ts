import type { CreateJournalDraftInput, JournalLineSummary, JournalSummary } from '../../../app/features/ledger/types'
import { formatLedgerAmount } from '../../../app/features/ledger/money'
import { ledgerOrganizationalUnits } from '../../../app/features/ledger/organization-data'
import { normalizeJournalLineAmounts } from '../../utils/ledger-journal-amounts'
import { demoAccounts, demoJournals } from '../../utils/ledger-demo'
import { requireBusinessDeskSession } from '../../utils/auth'

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default defineEventHandler(async (event): Promise<JournalSummary> => {
  const session = await requireBusinessDeskSession(event)
  const body = await readBody<Partial<CreateJournalDraftInput>>(event)
  const description = String(body?.description ?? '').trim()
  const batchDate = String(body?.batchDate ?? '').trim()
  const sourceLines = Array.isArray(body?.lines) ? body.lines : []
  const isMultiCurrency = Boolean(body?.isMultiCurrency) || sourceLines.some((line) => String(line?.currencyCode ?? 'GHS').trim().toUpperCase() !== 'GHS')

  if (!description || description.length > 200 || !isRealDate(batchDate) || sourceLines.length < 2 || sourceLines.length > 1000) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a description, valid date, and between two and 1000 journal lines.' })
  }

  const normalizedLines = sourceLines.map((line, index) => {
    const lineNumber = index + 1
    const accountId = String(line?.accountId ?? '').trim()
    const accountName = String(line?.accountName ?? '').trim()
    const referenceNumber = String(line?.referenceNumber ?? '').trim()
    const lineDescription = String(line?.description ?? '').trim()
    const organizationUnitId = String(line?.organizationUnitId ?? '').trim()
    const transactionDate = String(line?.transactionDate ?? batchDate).trim()
    const chequeNumber = String(line?.chequeNumber ?? '').trim()

    if (!accountId || accountId.length > 80 || !referenceNumber || referenceNumber.length > 80 || lineDescription.length > 300 || chequeNumber.length > 80 || organizationUnitId.length > 80 || !isRealDate(transactionDate)) {
      throw createError({ statusCode: 400, statusMessage: `Line ${lineNumber} needs a reference, account, valid transaction date, and valid line details.` })
    }
    if (organizationUnitId && !ledgerOrganizationalUnits.some((unit) => unit.id === organizationUnitId)) {
      throw createError({ statusCode: 400, statusMessage: `Line ${lineNumber}: select a valid organizational unit.` })
    }

    const amounts = normalizeJournalLineAmounts(line, lineNumber, isMultiCurrency)
    if (!amounts.value) throw createError({ statusCode: 400, statusMessage: amounts.errors.join(' ') })

    return {
      accountId,
      accountName,
      referenceNumber,
      description: lineDescription,
      organizationUnitId,
      transactionDate,
      chequeNumber,
      ...amounts.value,
    }
  })

  const config = useRuntimeConfig(event)
  const baseUrl = String(config.ledgerApiBaseUrl || '').replace(/\/$/, '')
  if (baseUrl) {
    if (session.demo || !session.accessToken) {
      throw createError({ statusCode: 403, statusMessage: 'Demo sign-in cannot access a configured ledger service.' })
    }
    return await $fetch<JournalSummary>(`${baseUrl}/api/v1/ledger/journals`, {
      method: 'POST',
      body: {
        batchDate,
        description,
        isMultiCurrency,
        organizationUnitId: String(body?.organizationUnitId ?? '').trim() || undefined,
        status: 'draft',
        lines: normalizedLines.map((line) => ({
          accountId: line.accountId,
          accountName: line.accountName,
          referenceNumber: line.referenceNumber,
          description: line.description,
          organizationUnitId: line.organizationUnitId || undefined,
          transactionDate: line.transactionDate,
          chequeNumber: line.chequeNumber || undefined,
          currencyCode: line.currencyCode,
          currencyName: line.currencyName,
          exchangeRate: line.exchangeRate,
          foreignDebit: line.foreignDebit,
          foreignCredit: line.foreignCredit,
          debit: line.debit,
          credit: line.credit,
        })),
      },
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-request-id': getHeader(event, 'x-request-id') || crypto.randomUUID(),
      },
    })
  }

  if (process.env.NODE_ENV === 'production' && !config.public.demoMode) {
    throw createError({ statusCode: 503, statusMessage: 'Ledger API is not configured', data: { code: 'LEDGER_API_UNAVAILABLE' } })
  }

  for (const line of normalizedLines) {
    const account = demoAccounts.find((item) => item.id === line.accountId && item.status === 'Active')
    if (!account) {
      throw createError({ statusCode: 400, statusMessage: 'Select an active account from the chart of accounts for every journal line.' })
    }
    if (account.currency.toUpperCase() !== line.currencyCode) {
      throw createError({ statusCode: 400, statusMessage: `Account ${account.accountNumber} is assigned to ${account.currency}; use its account currency on the journal line.` })
    }
  }

  const totalDebit = formatLedgerAmount(normalizedLines.reduce((sum, line) => sum + line.debitUnits, BigInt(0)))
  const totalCredit = formatLedgerAmount(normalizedLines.reduce((sum, line) => sum + line.creditUnits, BigInt(0)))
  const batchNumber = `GJ-${batchDate.slice(0, 4)}-${String(37 + demoJournals.length).padStart(4, '0')}`
  const organizationUnitId = String(body?.organizationUnitId ?? '').trim()
  if (organizationUnitId && !ledgerOrganizationalUnits.some((unit) => unit.id === organizationUnitId)) {
    throw createError({ statusCode: 400, statusMessage: 'Select a valid organizational unit for the journal batch.' })
  }

  const journalLines: JournalLineSummary[] = normalizedLines.map((line) => {
    const account = demoAccounts.find((item) => item.id === line.accountId)
    const unit = ledgerOrganizationalUnits.find((item) => item.id === line.organizationUnitId)
    return {
      id: `demo-${crypto.randomUUID()}`,
      accountId: line.accountId,
      accountNumber: account?.accountNumber,
      accountName: account?.name ?? line.accountName,
      referenceNumber: line.referenceNumber,
      description: line.description,
      organizationUnitId: line.organizationUnitId || undefined,
      organizationUnitName: unit?.path,
      transactionDate: line.transactionDate,
      chequeNumber: line.chequeNumber || undefined,
      currencyCode: line.currencyCode,
      currencyName: line.currencyName,
      exchangeRate: line.exchangeRate,
      foreignDebit: line.foreignDebit,
      foreignCredit: line.foreignCredit,
      debit: line.debit,
      credit: line.credit,
    }
  })
  const journal: JournalSummary = {
    id: `demo-${crypto.randomUUID()}`,
    batchNumber,
    description,
    date: batchDate,
    source: 'General journal',
    debit: totalDebit,
    credit: totalCredit,
    status: 'Draft',
    preparer: session.username,
    organizationUnitName: ledgerOrganizationalUnits.find((unit) => unit.id === organizationUnitId)?.path,
    isMultiCurrency,
    lineCount: journalLines.length,
    lines: journalLines,
  }
  demoJournals.unshift(journal)
  setResponseStatus(event, 201)
  return journal
})
