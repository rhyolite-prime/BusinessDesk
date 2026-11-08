import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { calculateVoucher, defaultVoucherTaxes } from '../../frontend/app/features/ledger/voucher-tax.ts'
const base = () => ({ taxes: defaultVoucherTaxes(), lines: [{ localAmount: '120', foreignAmount: '10', isWithhold: true }], retentions: [], multiCurrency: false, exchangeRate: '12' })
const cases = []
let b = base()
for (const [k, rate] of [['nhil', '2.5'], ['getfund', '2.5'], ['vat', '15'], ['incomeWithholding', '5'], ['vatWithholding', '7']]) Object.assign(b.taxes[k], { enabled: true, rate })
b.retentions.push({ value: '10', isPercentage: true }); cases.push(structuredClone(b))
assert.equal(calculateVoucher(b).net, '96.000000')
for (const key of ['cst', 'covid']) { const x = structuredClone(b); Object.assign(x.taxes[key], { enabled: true, rate: key === 'cst' ? '5' : '1' }); cases.push(x) }
for (const [key, rate, gross] of [['cst', '5', '125'], ['covid', '1', '121']]) {
 const x = structuredClone(b); x.lines[0].localAmount = gross; Object.assign(x.taxes[key], { enabled: true, rate });
 assert.equal(calculateVoucher(x).base, '100.000000'); assert.equal(calculateVoucher(x)[key], `${rate}.000000`); cases.push(x)
}
let seed = 54321
const next = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n }
for (let i = 0; i < 800; i++) {
  const x = base(); x.multiCurrency = !!next(2); x.exchangeRate = ['1', '1.25', '12.1234567890', '0.0000000001'][next(4)]
  x.lines = Array.from({ length: next(6) + 1 }, () => ({ localAmount: `${next(99999)}.${String(next(1000000)).padStart(6, '0')}`, foreignAmount: `${next(99999)}.${String(next(1000000)).padStart(6, '0')}`, isWithhold: !!next(2) }))
  for (const k of Object.keys(x.taxes)) Object.assign(x.taxes[k], { enabled: k !== 'covid' && !!next(2), rate: ['0', '1', '2.5', '7', '15.123456', '100'][next(6)] })
  if (next(2)) x.retentions = [{ value: next(2) ? '2.5' : '0.01', isPercentage: !!next(2) }]
  cases.push(x)
}
for (const amount of ['0.005', '0.004999', '99999999999999.999999', '1e4', '-1', '0.0000001']) { const x = base(); x.lines[0].localAmount = amount; cases.push(x) }
const centCase = base();centCase.lines = [{ localAmount: '0.10', isWithhold: true }, { localAmount: '0.10', isWithhold: true }];Object.assign(centCase.taxes.incomeWithholding, { enabled: true, rate: '5' });cases.push(centCase)
assert.equal(calculateVoucher(centCase).incomeWithholding, '0.020000', 'round rows before summing, half up')
const mixed = structuredClone(b);mixed.lines.push({ localAmount: '30', isWithhold: false });cases.push(mixed)
assert.equal(calculateVoucher(mixed).net, '123.000000', 'unflagged gross remains untaxed, percentage retention uses whole gross')
const output = spawnSync(process.env.VOUCHER_MATH_DRIVER, [], { input: cases.map(x => JSON.stringify(x)).join('\n') + '\n', encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
assert.equal(output.status, 0, output.stderr)
const rows = output.stdout.trim().split('\n').map(x => JSON.parse(x))
assert.equal(rows.length, cases.length)
for (let i = 0; i < cases.length; i++) {
  let actual
  try { actual = { result: calculateVoucher(cases[i]) } } catch { actual = { error: true } }
  assert.deepEqual(rows[i], actual, `C++/TypeScript exact decimal agreement, vector ${i}`)
}
console.log(`${cases.length} native/browser calculation parity vectors and 7 known-result checks passed`)
