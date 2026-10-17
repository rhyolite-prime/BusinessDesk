import { createError } from 'h3'
import type { CreateLedgerVoucherInput, LedgerVoucher, LedgerVoucherLine, LedgerVoucherRetention } from '../../app/features/ledger/voucher-data'
import { formatLedgerAmount, parseLedgerAmount, parseLedgerRate, convertLedgerAmount, percentageOfLedgerAmount, LEDGER_AMOUNT_SCALE, LEDGER_RATE_SCALE } from '../../app/features/ledger/money'
import { ledgerCurrencyOptions, ledgerSetupIds } from '../../app/features/ledger/setup-data'
import { ledgerOrganizationalUnits } from '../../app/features/ledger/organization-data'
import { isLedgerVoucherType, payeesForVoucherType, voucherPaymentMethods } from '../../app/features/ledger/voucher-data'
import { demoAccounts } from './ledger-demo'

export type NormalizedVoucherFields = Omit<LedgerVoucher, 'id' | 'voucherNumber' | 'batchNumber' | 'status' | 'preparer' | 'createdAt' | 'updatedAt'>

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function requiredText(value: unknown, label: string, maximum: number): string {
  const text = String(value ?? '').trim()
  if (!text || text.length > maximum) {
    throw createError({ statusCode: 400, statusMessage: `${label} is required and must not exceed ${maximum} characters.` })
  }
  return text
}

export function normalizeVoucherInput(body: Partial<CreateLedgerVoucherInput>): NormalizedVoucherFields {
  if (!isLedgerVoucherType(body.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Select a supported voucher type.' })
  }
  const type = body.type
  const payeeId = requiredText(body.payeeId, 'Payee', 80)
  const payee = payeesForVoucherType(type).find((item) => item.id === payeeId)
  if (!payee) throw createError({ statusCode: 400, statusMessage: 'Select a valid payee for this voucher type.' })

  const entryDate = requiredText(body.entryDate, 'Entry date', 10)
  if (!isRealDate(entryDate)) throw createError({ statusCode: 400, statusMessage: 'Entry date must be a real calendar date in YYYY-MM-DD format.' })
  const isReceipt = type === 'customer-receipt'
  const effectiveDate = requiredText(isReceipt ? body.receiptDate : body.paymentDate, isReceipt ? 'Receipt date' : 'Payment date', 10)
  if (!isRealDate(effectiveDate)) throw createError({ statusCode: 400, statusMessage: `${isReceipt ? 'Receipt' : 'Payment'} date must be a real calendar date in YYYY-MM-DD format.` })

  const bankAccountId = requiredText(body.bankAccountId, 'Bank account', 80)
  const bankAccountName = requiredText(body.bankAccountName, 'Bank account name', 160)
  const bankGlAccountId = requiredText(body.bankGlAccountId, 'Bank G/L account', 80)
  const bankGlAccount = demoAccounts.find((account) => account.id === bankGlAccountId && account.status === 'Active')
  if (!bankGlAccount || bankGlAccount.accountHeaderId !== ledgerSetupIds.bankControl) {
    throw createError({ statusCode: 400, statusMessage: 'Select an active chart account linked to the bank-account control.' })
  }
  const mode = body.mode
  if (!mode || !voucherPaymentMethods.includes(mode)) throw createError({ statusCode: 400, statusMessage: 'Select a supported payment or receipt method.' })
  const chequeNumber = String(body.chequeNumber ?? '').trim()
  if (chequeNumber.length > 80 || (mode === 'Cheque' && !chequeNumber)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a cheque number when the payment method is cheque.' })
  }

  const currencyCode = String(body.currencyCode ?? '').trim().toUpperCase()
  if (!ledgerCurrencyOptions.some((currency) => currency.code === currencyCode)) {
    throw createError({ statusCode: 400, statusMessage: 'Select a supported transaction currency.' })
  }
  const multiCurrency = Boolean(body.multiCurrency)
  if (currencyCode !== 'GHS' && !multiCurrency) {
    throw createError({ statusCode: 400, statusMessage: 'Enable multi-currency for a transaction currency other than GHS.' })
  }
  const exchangeRate = String(body.exchangeRate ?? (currencyCode === 'GHS' ? '1' : '')).trim()
  const exchangeRateUnits = parseLedgerRate(exchangeRate)
  if (exchangeRateUnits === null || exchangeRateUnits <= BigInt(0)) {
    throw createError({ statusCode: 400, statusMessage: 'Exchange rate must be a positive decimal with at most 10 decimal places.' })
  }
  if (currencyCode === 'GHS' && exchangeRateUnits !== LEDGER_RATE_SCALE) {
    throw createError({ statusCode: 400, statusMessage: 'GHS vouchers must use an exchange rate of 1.' })
  }

  const description = String(body.description ?? '').trim()
  if (description.length > 300) throw createError({ statusCode: 400, statusMessage: 'Voucher description must not exceed 300 characters.' })
  const linesInput = Array.isArray(body.lines) ? body.lines : []
  if (linesInput.length < 1 || linesInput.length > 1000) {
    throw createError({ statusCode: 400, statusMessage: 'A voucher must contain between one and 1000 ledger lines.' })
  }

  let totalUnits = BigInt(0)
  let foreignTotalUnits = BigInt(0)
  const lines: LedgerVoucherLine[] = linesInput.map((line, index) => {
    const accountId = String(line?.accountId ?? '').trim()
    const account = demoAccounts.find((item) => item.id === accountId && item.status === 'Active')
    if (!account) throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: select an active G/L account.` })
    if (account.id === bankGlAccountId) throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: choose a non-bank offset account.` })

    const invoiceNumber = String(line?.invoiceNumber ?? '').trim()
    const referenceNumber = String(line?.referenceNumber ?? '').trim()
    const lineDescription = String(line?.description ?? '').trim()
    const organizationUnitId = String(line?.organizationUnitId ?? '').trim()
    if (invoiceNumber.length > 80 || referenceNumber.length > 80 || lineDescription.length > 300) {
      throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: invoice, reference, or description is too long.` })
    }
    const organizationUnit = organizationUnitId
      ? ledgerOrganizationalUnits.find((unit) => unit.id === organizationUnitId)
      : undefined
    if (organizationUnitId && !organizationUnit) {
      throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: select a valid organizational unit.` })
    }

    const localInput = parseLedgerAmount(String(line?.localAmount ?? ''), true)
    const foreignInput = parseLedgerAmount(String(line?.foreignAmount ?? ''), true)
    if (localInput === null || foreignInput === null) {
      throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: enter valid amounts with up to six decimal places.` })
    }
    let localUnits = localInput
    let foreignUnits = foreignInput
    if (multiCurrency) {
      if (foreignUnits <= BigInt(0)) throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: foreign amount must be greater than zero.` })
      localUnits = convertLedgerAmount(foreignUnits, exchangeRateUnits)
      if (localUnits <= BigInt(0)) throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: converted local amount must be greater than zero.` })
      foreignTotalUnits += foreignUnits
    } else {
      if (localUnits <= BigInt(0)) throw createError({ statusCode: 400, statusMessage: `Line ${index + 1}: local amount must be greater than zero.` })
      foreignUnits = BigInt(0)
    }
    totalUnits += localUnits

    return {
      id: `demo-${crypto.randomUUID()}`,
      invoiceNumber,
      referenceNumber,
      accountId: account.id,
      accountNumber: account.accountNumber,
      accountName: account.name,
      description: lineDescription,
      organizationUnitId,
      organizationUnitName: organizationUnit?.path ?? '',
      localAmount: formatLedgerAmount(localUnits),
      foreignAmount: formatLedgerAmount(foreignUnits),
      isWithhold: Boolean(line?.isWithhold),
    }
  })

  const withholdingBaseUnits = lines.reduce((sum, line) => {
    if (!line.isWithhold) return sum
    return sum + (parseLedgerAmount(line.localAmount, true) ?? BigInt(0))
  }, BigInt(0))
  const retentionsInput = Array.isArray(body.retentions) ? body.retentions : []
  if (isReceipt && retentionsInput.length) {
    throw createError({ statusCode: 400, statusMessage: 'Customer receipt vouchers do not support payment retentions.' })
  }
  if (retentionsInput.length > 100) throw createError({ statusCode: 400, statusMessage: 'A voucher cannot contain more than 100 retention lines.' })

  let retentionsTotalUnits = BigInt(0)
  const retentions: LedgerVoucherRetention[] = retentionsInput.map((retention, index) => {
    const accountId = String(retention?.accountId ?? '').trim()
    const account = demoAccounts.find((item) => item.id === accountId && item.status === 'Active')
    if (!account) throw createError({ statusCode: 400, statusMessage: `Retention ${index + 1}: select an active credit G/L account.` })
    const retentionDescription = requiredText(retention?.description, `Retention ${index + 1} description`, 160)
    const valueText = String(retention?.value ?? '').trim()
    const valueUnits = parseLedgerAmount(valueText)
    if (valueUnits === null || valueUnits <= BigInt(0)) {
      throw createError({ statusCode: 400, statusMessage: `Retention ${index + 1}: enter a positive amount or percentage.` })
    }
    const isPercentage = Boolean(retention?.isPercentage)
    if (isPercentage && valueUnits > BigInt(100) * LEDGER_AMOUNT_SCALE) {
      throw createError({ statusCode: 400, statusMessage: `Retention ${index + 1}: percentage cannot exceed 100%.` })
    }
    if (isPercentage && withholdingBaseUnits <= BigInt(0)) {
      throw createError({ statusCode: 400, statusMessage: `Retention ${index + 1}: mark at least one voucher line as withholdable.` })
    }
    const amountUnits = isPercentage ? percentageOfLedgerAmount(withholdingBaseUnits, valueUnits) : valueUnits
    if (amountUnits <= BigInt(0)) throw createError({ statusCode: 400, statusMessage: `Retention ${index + 1}: calculated retention must be greater than zero.` })
    retentionsTotalUnits += amountUnits
    return {
      id: `demo-${crypto.randomUUID()}`,
      accountId: account.id,
      accountNumber: account.accountNumber,
      accountName: account.name,
      description: retentionDescription,
      value: formatLedgerAmount(valueUnits),
      isPercentage,
      amount: formatLedgerAmount(amountUnits),
    }
  })

  if (retentionsTotalUnits > totalUnits) {
    throw createError({ statusCode: 400, statusMessage: 'Total retentions cannot be greater than the voucher amount.' })
  }

  const paymentDate = isReceipt ? undefined : effectiveDate
  const receiptDate = isReceipt ? effectiveDate : undefined
  const payeeName = payeesForVoucherType(type).find((item) => item.id === payeeId)?.name ?? ''
  return {
    type,
    payeeId,
    payeeName,
    entryDate,
    ...(paymentDate ? { paymentDate } : {}),
    ...(receiptDate ? { receiptDate } : {}),
    bankAccountId,
    bankAccountName,
    bankGlAccountId,
    bankGlAccountName: `${bankGlAccount.accountNumber} — ${bankGlAccount.name}`,
    mode,
    currencyCode,
    exchangeRate: formatRate(exchangeRateUnits),
    multiCurrency,
    chequeNumber,
    description,
    totalAmount: formatLedgerAmount(totalUnits),
    foreignTotal: formatLedgerAmount(foreignTotalUnits),
    retentionsTotal: formatLedgerAmount(retentionsTotalUnits),
    netAmount: formatLedgerAmount(totalUnits - retentionsTotalUnits),
    lines,
    retentions,
  }
}

function formatRate(rateUnits: bigint): string {
  const whole = rateUnits / LEDGER_RATE_SCALE
  const fraction = String(rateUnits % LEDGER_RATE_SCALE).padStart(10, '0')
  return `${whole}.${fraction}`
}
