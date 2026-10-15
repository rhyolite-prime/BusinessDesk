import { convertLedgerAmount, formatLedgerAmount, LEDGER_RATE_SCALE, parseLedgerAmount, parseLedgerRate } from '../../app/features/ledger/money'
import { ledgerCurrencyOptions } from '../../app/features/ledger/setup-data'

const baseCurrencyCode = 'GHS'

export interface JournalLineMoneyInput {
  currencyCode?: unknown
  exchangeRate?: unknown
  foreignDebit?: unknown
  foreignCredit?: unknown
  debit?: unknown
  credit?: unknown
}

export interface NormalizedJournalLineAmounts {
  currencyCode: string
  currencyName: string
  exchangeRate: string
  foreignDebit: string
  foreignCredit: string
  debit: string
  credit: string
  debitUnits: bigint
  creditUnits: bigint
}

export interface JournalLineAmountsResult {
  value?: NormalizedJournalLineAmounts
  errors: string[]
}

function formatRate(rateUnits: bigint): string {
  const whole = rateUnits / LEDGER_RATE_SCALE
  const fraction = String(rateUnits % LEDGER_RATE_SCALE).padStart(10, '0')
  return `${whole}.${fraction}`
}

export function normalizeJournalLineAmounts(
  input: JournalLineMoneyInput,
  lineNumber: number,
  isMultiCurrency: boolean,
): JournalLineAmountsResult {
  const errors: string[] = []
  const currencyCode = String(input.currencyCode ?? baseCurrencyCode).trim().toUpperCase()
  const currency = ledgerCurrencyOptions.find((option) => option.code === currencyCode)

  if (!currency) errors.push(`Line ${lineNumber}: select a supported transaction currency.`)
  if (!isMultiCurrency && currencyCode !== baseCurrencyCode) {
    errors.push(`Line ${lineNumber}: enable multi-currency to use a currency other than ${baseCurrencyCode}.`)
  }

  const providedRate = String(input.exchangeRate ?? '').trim()
  const rateText = providedRate || (currencyCode === baseCurrencyCode ? '1' : '')
  const rateUnits = parseLedgerRate(rateText)
  if (rateUnits === null || rateUnits <= BigInt(0)) {
    errors.push(`Line ${lineNumber}: exchange rate must be positive and have at most 10 decimal places.`)
  } else if (currencyCode === baseCurrencyCode && rateUnits !== LEDGER_RATE_SCALE) {
    errors.push(`Line ${lineNumber}: ${baseCurrencyCode} lines must use an exchange rate of 1.`)
  }

  const debitInput = isMultiCurrency
    ? String(input.foreignDebit ?? (currencyCode === baseCurrencyCode ? input.debit : ''))
    : String(input.debit ?? '')
  const creditInput = isMultiCurrency
    ? String(input.foreignCredit ?? (currencyCode === baseCurrencyCode ? input.credit : ''))
    : String(input.credit ?? '')
  const transactionDebitUnits = parseLedgerAmount(debitInput, true)
  const transactionCreditUnits = parseLedgerAmount(creditInput, true)

  if (transactionDebitUnits === null) errors.push(`Line ${lineNumber}: debit must be a non-negative decimal with at most 14 whole digits and 6 decimal places.`)
  if (transactionCreditUnits === null) errors.push(`Line ${lineNumber}: credit must be a non-negative decimal with at most 14 whole digits and 6 decimal places.`)
  if (transactionDebitUnits !== null && transactionCreditUnits !== null) {
    if (transactionDebitUnits > BigInt(0) && transactionCreditUnits > BigInt(0)) {
      errors.push(`Line ${lineNumber}: enter an amount on either debit or credit, not both.`)
    }
    if (transactionDebitUnits === BigInt(0) && transactionCreditUnits === BigInt(0)) {
      errors.push(`Line ${lineNumber}: either debit or credit must be greater than zero.`)
    }
  }

  const safeRateUnits = rateUnits && rateUnits > BigInt(0) ? rateUnits : LEDGER_RATE_SCALE
  const safeDebitUnits = transactionDebitUnits ?? BigInt(0)
  const safeCreditUnits = transactionCreditUnits ?? BigInt(0)
  const baseDebitUnits = isMultiCurrency ? convertLedgerAmount(safeDebitUnits, safeRateUnits) : safeDebitUnits
  const baseCreditUnits = isMultiCurrency ? convertLedgerAmount(safeCreditUnits, safeRateUnits) : safeCreditUnits

  if ((safeDebitUnits > BigInt(0) && baseDebitUnits === BigInt(0)) || (safeCreditUnits > BigInt(0) && baseCreditUnits === BigInt(0))) {
    errors.push(`Line ${lineNumber}: converted ${baseCurrencyCode} amount must be greater than zero.`)
  }
  if (parseLedgerAmount(formatLedgerAmount(baseDebitUnits)) === null || parseLedgerAmount(formatLedgerAmount(baseCreditUnits)) === null) {
    errors.push(`Line ${lineNumber}: converted ${baseCurrencyCode} amount exceeds the supported range.`)
  }

  if (errors.length) return { errors }

  const debitUnits = baseDebitUnits
  const creditUnits = baseCreditUnits
  const foreignDebitUnits = isMultiCurrency ? safeDebitUnits : debitUnits
  const foreignCreditUnits = isMultiCurrency ? safeCreditUnits : creditUnits

  return {
    errors,
    value: {
      currencyCode,
      currencyName: currency?.name ?? currencyCode,
      exchangeRate: formatRate(safeRateUnits),
      foreignDebit: formatLedgerAmount(foreignDebitUnits),
      foreignCredit: formatLedgerAmount(foreignCreditUnits),
      debit: formatLedgerAmount(debitUnits),
      credit: formatLedgerAmount(creditUnits),
      debitUnits,
      creditUnits,
    },
  }
}
