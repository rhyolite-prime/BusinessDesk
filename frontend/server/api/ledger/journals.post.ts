import type { CreateJournalDraftInput, JournalLineSummary, JournalSummary } from '../../../app/features/ledger/types'
import { ledgerOrganizationalUnits } from '../../../app/features/ledger/organization-data'
import { demoAccounts, demoJournals } from '../../utils/ledger-demo'
import { requireBusinessDeskSession } from '../../utils/auth'

const decimalScale = BigInt(1_000_000)

function parseAmount(amount: string): bigint | null {
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

export default defineEventHandler(async (event): Promise<JournalSummary> => {
  const session = await requireBusinessDeskSession(event)
  const body = await readBody<Partial<CreateJournalDraftInput>>(event)
  const description = String(body?.description ?? '').trim()
  const batchDate = String(body?.batchDate ?? '').trim()
  const lines = Array.isArray(body?.lines) ? body.lines : []
  const parsedDate = new Date(`${batchDate}T00:00:00Z`)

  if (!description || description.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(batchDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== batchDate || lines.length < 2 || lines.length > 1000) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a description, valid date, and between two and 1000 journal lines.' })
  }

  const normalizedLines = lines.map((line) => {
    const accountId = String(line?.accountId ?? '').trim()
    const accountName = String(line?.accountName ?? '').trim()
    const referenceNumber = String(line?.referenceNumber ?? '').trim()
    const lineDescription = String(line?.description ?? '').trim()
    const organizationUnitId = String(line?.organizationUnitId ?? '').trim()
    const transactionDate = String(line?.transactionDate ?? batchDate).trim()
    const chequeNumber = String(line?.chequeNumber ?? '').trim()
    const debit = String(line?.debit ?? '0')
    const credit = String(line?.credit ?? '0')
    const debitUnits = parseAmount(debit)
    const creditUnits = parseAmount(credit)
    const parsedTransactionDate = new Date(`${transactionDate}T00:00:00Z`)

    if (!accountId || accountId.length > 80 || referenceNumber.length > 80 || !referenceNumber || lineDescription.length > 300 || chequeNumber.length > 80 || organizationUnitId.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) || Number.isNaN(parsedTransactionDate.getTime()) || parsedTransactionDate.toISOString().slice(0, 10) !== transactionDate || debitUnits === null || creditUnits === null || (debitUnits > BigInt(0) && creditUnits > BigInt(0)) || (debitUnits === BigInt(0) && creditUnits === BigInt(0))) {
      throw createError({ statusCode: 400, statusMessage: 'Each line needs a reference, account, valid transaction date, and exactly one non-negative debit or credit amount.' })
    }
    if (organizationUnitId && !ledgerOrganizationalUnits.some((unit) => unit.id === organizationUnitId)) {
      throw createError({ statusCode: 400, statusMessage: 'Select a valid organizational unit for each journal line.' })
    }
    return { accountId, accountName, referenceNumber, description: lineDescription, organizationUnitId, transactionDate, chequeNumber, debit, credit, debitUnits, creditUnits }
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
    if (!demoAccounts.some((account) => account.id === line.accountId && account.status === 'Active')) {
      throw createError({ statusCode: 400, statusMessage: 'Select an active account from the chart of accounts for every journal line.' })
    }
  }

  const totalDebit = formatAmount(normalizedLines.reduce((sum, line) => sum + line.debitUnits, BigInt(0)))
  const totalCredit = formatAmount(normalizedLines.reduce((sum, line) => sum + line.creditUnits, BigInt(0)))
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
    preparer: 'K. Agyeman',
    organizationUnitName: ledgerOrganizationalUnits.find((unit) => unit.id === organizationUnitId)?.path,
    lineCount: journalLines.length,
    lines: journalLines,
  }
  demoJournals.unshift(journal)
  setResponseStatus(event, 201)
  return journal
})
