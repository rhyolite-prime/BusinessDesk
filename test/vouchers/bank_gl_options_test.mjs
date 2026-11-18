import assert from 'node:assert/strict'
import { voucherBankGlOptions } from '../../frontend/app/features/ledger/voucher-bank-options.ts'

const accounts = [{ id: 'bank', name: 'Operating bank' }, { id: 'payable', name: 'Payables' }, { id: 'expense', name: 'Expenses' }]
const link = (accountId, accountingUnitId = 'hq', isActive = true) => ({ accountId, accountingUnitId, isActive })
const banks = [link('bank'), link('bank'), link('payable', 'hq', false), link('expense', 'branch'), link('unavailable-gl')]
assert.deepEqual(voucherBankGlOptions(accounts, banks, 'hq'), [accounts[0]], 'only eligible GLs with active bank links in this unit; duplicate links do not duplicate choices')
assert.deepEqual(voucherBankGlOptions(accounts, banks, 'branch'), [accounts[2]], 'unit scope is authoritative')
assert.deepEqual(voucherBankGlOptions(accounts, [], 'hq'), [], 'no links means no choices, never all chart accounts')
assert.deepEqual(voucherBankGlOptions([], banks, 'hq'), [], 'no eligible GLs means no choices')
assert.deepEqual(voucherBankGlOptions(accounts, banks, ''), [], 'missing scope cannot expose unrelated bank GLs')
assert.equal(accounts.length, 3, 'input catalog is not mutated')
assert.equal(banks.length, 5, 'bank catalog is not mutated')
console.log('7 voucher bank GL option checks passed')
