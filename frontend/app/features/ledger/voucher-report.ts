import type { LedgerVoucher } from './voucher-data'
import type { EmbeddedReport } from '../reports/report-types'

export interface VoucherReportCell { text: string; span?: number; bold?: boolean; align?: 'left' | 'center' | 'right' }
export interface VoucherReportRow { cells: VoucherReportCell[]; header?: boolean }
export interface VoucherReport extends EmbeddedReport { voucherRows: VoucherReportRow[] }

const amount = (value: string | undefined) => {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return '—'
  return (new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format as unknown as (v: string) => string)(value)
}
const foreignAmount = (value: string | undefined) => {
  if (!value || !/^\d+(\.\d+)?$/.test(value)) return '—'
  return (new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format as unknown as (v: string) => string)(value)
}
const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const tens = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
function underThousand(n: number): string {
  const h = Math.floor(n / 100), rest = n % 100
  return [h ? `${ones[h]} Hundred` : '', rest < 20 ? (rest ? ones[rest] : '') : `${tens[Math.floor(rest / 10)]}${rest % 10 ? `-${ones[rest % 10]}` : ''}`].filter(Boolean).join(' ')
}
export function voucherAmountInWords(value: string, currency: string): string {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) return '—'
  const [whole = '0', fraction = ''] = value.split('.')
  let cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
  if (fraction.length > 2 && Number(fraction[2]) >= 5) cents++
  let integer = cents / 100n
  const groups = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion']
  const words: string[] = []
  for (let i = 0; integer && i < groups.length; i++, integer /= 1000n) {
    const part = Number(integer % 1000n)
    if (part) words.unshift(`${underThousand(part)}${groups[i] ? ` ${groups[i]}` : ''}`)
  }
  if (integer) return `${currency} ${amount(value)}`
  const minor = cents % 100n
  return `${words.join(' ') || 'Zero'} ${currency}${minor ? ` and ${String(minor).padStart(2, '0')}/100` : ''} Only`
}
const cell = (text: string, span = 1, bold = false, align: VoucherReportCell['align'] = 'left'): VoucherReportCell => ({ text, span, bold, align })
const date = (v?: string) => v || '—'

/** An immutable report made from the server's saved voucher and calculation snapshot. */
export function voucherReport(voucher: LedgerVoucher, companyName = ''): VoucherReport {
  if (!voucher.taxSummary || !voucher.id || !Array.isArray(voucher.lines)) throw new Error('The saved voucher did not include its calculation snapshot.')
  const currency = voucher.baseCurrencyCode || voucher.currencyCode
  const receipt = voucher.type === 'customer-receipt'
  const title = receipt ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER'
  const summary = voucher.taxSummary
  const rows: VoucherReportRow[] = [
    { cells: [cell('Batch No.', 1, true), cell(voucher.batchNumber || '—', 2), cell(title, 2, true, 'center'), cell('Voucher date', 1, true), cell(date(voucher.entryDate))] },
    { cells: [cell(receipt ? 'Received from' : 'Pay to the order of', 2, true), cell(voucher.payeeName || '—', 5)] },
    { cells: [cell('The sum of', 1, true), cell(voucherAmountInWords(summary.net, currency), 4), cell(`${currency} ${amount(summary.net)}`, 2, true, 'right')] },
    { cells: [cell('In settlement of the following:', 7, true)] },
    { header: true, cells: [cell(receipt ? 'Receipt date' : 'Payment date', 1, true), cell('WH?', 1, true), cell('Invoice / Ref.', 1, true), cell('Description', 1, true), cell(receipt ? 'Credit G/L' : 'Debit G/L', 1, true), cell(receipt ? 'Debit G/L' : 'Credit G/L', 1, true), cell(`Amount · ${currency}`, 1, true, 'right')] },
  ]
  voucher.lines.forEach((line, index) => {
    const account = [line.accountNumber, line.accountName].filter(Boolean).join(' — ') || line.accountId || '—'
    rows.push({ cells: [cell(date(receipt ? voucher.receiptDate : voucher.paymentDate)), cell(receipt ? '—' : line.isWithhold ? 'Yes' : 'No'), cell([line.invoiceNumber, line.referenceNumber].filter(Boolean).join(' / ') || '—'), cell(line.description || voucher.description || '—'), cell(account), cell(voucher.bankGlAccountName || '—'), cell(`${amount(summary.lines[index]?.gross || line.localAmount)}${voucher.multiCurrency ? `\n${voucher.currencyCode} ${foreignAmount(line.foreignAmount)}` : ''}`, 1, false, 'right')] })
  })
  const details = [
    ['Cheque No.', voucher.chequeNumber || '—'], ['Bank account', voucher.bankAccountName || '—'],
    ['Payment mode', voucher.mode || '—'], ['Cost centers', [...new Set(voucher.lines.map(line => line.organizationUnitName).filter(Boolean))].join(', ') || '—'],
  ]
  if (voucher.multiCurrency) details.push(['Foreign currency / rate', `${voucher.currencyCode} / ${voucher.exchangeRate}`])
  const taxLabel = (label: string, key: keyof NonNullable<LedgerVoucher['taxes']>) => voucher.taxes?.[key]?.enabled ? `${label} (${voucher.taxes[key].rate}%)` : label
  const totals: [string, string][] = [['Total invoice amount', summary.gross], [taxLabel('NHIL', 'nhil'), summary.nhil], [taxLabel('GETFund levy', 'getfund'), summary.getfund], [taxLabel('VAT', 'vat'), summary.vat], [taxLabel('CST', 'cst'), summary.cst], [taxLabel('COVID levy', 'covid'), summary.covid], [taxLabel('Income withheld', 'incomeWithholding'), summary.incomeWithholding], [taxLabel('VAT withheld', 'vatWithholding'), summary.vatWithholding], ['Retention', summary.retained], [receipt ? 'Net received' : 'Net amount paid', summary.net]]
  totals.forEach(([label, value], index) => {
    const detail = details[index]
    rows.push({ cells: [cell(detail ? `${detail[0]}: ${detail[1]}` : '', 4), cell(label, 2, index === totals.length - 1), cell(amount(value), 1, index === totals.length - 1, 'right')] })
  })
  if (voucher.retentions?.length) {
    rows.push({ cells: [cell('Retention details', 7, true)] })
    for (const retention of voucher.retentions) rows.push({ cells: [cell(retention.description || 'Retention', 3), cell(`${retention.isPercentage ? `${retention.value}%` : 'Fixed'} · ${[retention.accountNumber, retention.accountName].filter(Boolean).join(' — ') || '—'}`, 3), cell(amount(retention.amount), 1, false, 'right')] })
  }
  return { id: `voucher-${voucher.voucherNumber || voucher.id}`.replace(/[^a-zA-Z0-9_-]/g, '-'), title, companyName: companyName || 'Company profile not available', subtitle: `Voucher ${voucher.voucherNumber} · ${voucher.status} · Base currency ${currency}`, generatedAt: voucher.updatedAt || voucher.createdAt || '', columns: [], sections: [{ title: '', rows: voucher.lines.map(line => [line.description]) }], landscape: true, voucherRows: rows }
}
