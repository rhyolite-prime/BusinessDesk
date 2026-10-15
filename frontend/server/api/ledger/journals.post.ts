import type { CreateJournalDraftInput, JournalSummary } from '../../../app/features/ledger/types'
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
    const lineDescription = String(line?.description ?? '').trim()
    const debit = String(line?.debit ?? '0')
    const credit = String(line?.credit ?? '0')
    const debitUnits = parseAmount(debit)
    const creditUnits = parseAmount(credit)

    if (!accountId || accountId.length > 80 || lineDescription.length > 300 || debitUnits === null || creditUnits === null || (debitUnits > BigInt(0) && creditUnits > BigInt(0)) || (debitUnits === BigInt(0) && creditUnits === BigInt(0))) {
      throw createError({ statusCode: 400, statusMessage: 'Each line needs a valid account, a valid description, and exactly one non-negative debit or credit amount.' })
    }
    return { accountId, description: lineDescription, debit, credit, debitUnits, creditUnits }
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
        status: 'draft',
        lines: normalizedLines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
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
    if (!demoAccounts.some((account) => account.id === line.accountId)) {
      throw createError({ statusCode: 400, statusMessage: 'Select an account from the chart of accounts for every journal line.' })
    }
  }

  const totalDebit = formatAmount(normalizedLines.reduce((sum, line) => sum + line.debitUnits, BigInt(0)))
  const totalCredit = formatAmount(normalizedLines.reduce((sum, line) => sum + line.creditUnits, BigInt(0)))
  const batchNumber = `GJ-${batchDate.slice(0, 4)}-${String(37 + demoJournals.length).padStart(4, '0')}`
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
  }
  demoJournals.unshift(journal)
  setResponseStatus(event, 201)
  return journal
})
