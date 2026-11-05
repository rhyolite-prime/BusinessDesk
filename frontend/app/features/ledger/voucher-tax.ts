import type { CreateLedgerVoucherInput } from './voucher-data'
export const taxKeys = [
  'nhil',
  'getfund',
  'vat',
  'cst',
  'covid',
  'incomeWithholding',
  'vatWithholding',
] as const
export type TaxKey = (typeof taxKeys)[number]
export type VoucherTaxes = Record<
  TaxKey,
  { enabled: boolean; rate: string; accountId?: string | null }
>
export const taxLabels: Record<TaxKey, string> = {
  nhil: 'NHIL',
  getfund: 'GETFund levy',
  vat: 'VAT',
  cst: 'CST',
  covid: 'COVID levy',
  incomeWithholding: 'Income withholding',
  vatWithholding: 'VAT withholding',
}
export interface VoucherTaxSummary extends Record<
  TaxKey | 'gross' | 'base' | 'retained' | 'net',
  string
> {
  lines: Array<Record<TaxKey | 'gross' | 'base', string>>
  retentions: string[]
  rounding: string
}
export function defaultVoucherTaxes(): VoucherTaxes {
  return Object.fromEntries(
    taxKeys.map((k) => [
      k,
      {
        enabled: false,
        rate: '0',
        ...(k.endsWith('Withholding') ? { accountId: null } : {}),
      },
    ]),
  ) as VoucherTaxes
}
const scale = 1000000n,
  cent = 10000n,
  percent = 100000000n,
  maxMoney = 99999999999999999999n
export function voucherDecimal(s: string, digits = 6): bigint {
  const re =
    digits === 10
      ? /^(0|[1-9][0-9]{0,9})(\.[0-9]{1,10})?$/
      : /^(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?$/
  if (typeof s !== 'string' || !re.test(s))
    throw new Error(
      'Amounts/rates must be bounded non-negative decimal strings.',
    )
  const [whole = '0', fraction = ''] = s.split('.')
  return (
    BigInt(whole) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0'))
  )
}
export function voucherRound(n: bigint, d = cent): bigint {
  return (n + d / 2n) / d
}
export function voucherMoney(n: bigint): string {
  if (n < 0n || n > maxMoney) throw new Error('Amount outside numeric(20,6).')
  return `${n / scale}.${String(n % scale).padStart(6, '0')}`
}
export function calculateVoucher(
  body: Pick<
    CreateLedgerVoucherInput,
    'taxes' | 'lines' | 'retentions' | 'multiCurrency' | 'exchangeRate'
  >,
): VoucherTaxSummary {
  const taxes = body.taxes ?? defaultVoucherTaxes()
  let totalRate = 0n
  for (const k of taxKeys) {
    const t = taxes[k],
      rate = voucherDecimal(t.rate)
    if (rate > percent || (t.enabled && rate === 0n))
      throw new Error(
        'Enabled tax rates must be greater than zero and at most 100 percent.',
      )
    if (t.enabled && k !== 'incomeWithholding' && k !== 'vatWithholding')
      totalRate += rate
  }
  if (taxes.cst.enabled && taxes.covid.enabled)
    throw new Error('CST and COVID levy are mutually exclusive.')
  const sums = Object.fromEntries(taxKeys.map((k) => [k, 0n])) as Record<
    TaxKey,
    bigint
  >
  let gross = 0n,
    base = 0n,
    deduct = 0n
  const lines = body.lines.map((line) => {
    let amount = voucherDecimal(
      body.multiCurrency ? line.foreignAmount : line.localAmount,
    )
    if (body.multiCurrency)
      amount = voucherRound(
        amount * voucherDecimal(body.exchangeRate, 10),
        10000000000n,
      )
    amount = voucherRound(amount) * cent
    if (amount === 0n)
      throw new Error(
        'Every voucher row must remain positive after cent rounding.',
      )
    gross += amount
    const denominator = percent + totalRate
    const row = {
      gross: voucherMoney(amount),
      base: voucherMoney(
        line.isWithhold
          ? voucherRound(amount * percent, denominator * cent) * cent
          : amount,
      ),
    } as VoucherTaxSummary['lines'][number]
    if (line.isWithhold) base += voucherDecimal(row.base)
    for (const k of taxKeys) {
      const v =
        line.isWithhold && taxes[k].enabled
          ? voucherRound(
              amount * voucherDecimal(taxes[k].rate),
              denominator * cent,
            ) * cent
          : 0n
      sums[k] += v
      row[k] = voucherMoney(v)
      if (k === 'incomeWithholding' || k === 'vatWithholding') deduct += v
    }
    return row
  })
  let retained = 0n
  const retentions = body.retentions.map((r) => {
    let v = voucherDecimal(r.value)
    if (r.isPercentage) {
      if (v > percent)
        throw new Error('Retention percentage cannot exceed 100.')
      v = voucherRound(gross * v, percent * cent) * cent
    } else v = voucherRound(v) * cent
    if (v === 0n) throw new Error('Retention must be positive after rounding.')
    retained += v
    return voucherMoney(v)
  })
  if (deduct + retained > gross)
    throw new Error('Deductions exceed the gross payment.')
  return {
    ...Object.fromEntries(taxKeys.map((k) => [k, voucherMoney(sums[k])])),
    gross: voucherMoney(gross),
    base: voucherMoney(base),
    retained: voucherMoney(retained),
    net: voucherMoney(gross - deduct - retained),
    lines,
    retentions,
    rounding: 'legacy-cent-half-up',
  } as VoucherTaxSummary
}
