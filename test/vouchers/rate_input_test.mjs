import assert from 'node:assert/strict'
import { voucherRateDisplay, voucherRateInput } from '../../frontend/app/features/ledger/voucher-rate-input.ts'
let checks=0
for (const [input,expected] of [['1','1.0000'],['1.2345678901','1.2346'],['1.2344499999','1.2344'],['9.99995','10.0000'],['0.0000000001','0.0000'],['99999999999999.1234567890','99999999999999.1235'],['','']]) {
  assert.equal(voucherRateDisplay(input),expected);checks++
}
for (const [input,expected] of [['',''],['.','.'],['1.','1.'],['.5','0.5'],['1.23','1.23'],['1.2345','1.2345'],['1.234567890123456','1.2346'],['1.23444','1.2344'],['9.99995','10.0000'],['0.00001','0.0000'],['abc',null],['1e2',null],['-1',null],['1.2.3',null],['100000000000000',null],['99999999999999.99999',null]]) {
  assert.equal(voucherRateInput(input),expected);checks++
}
console.log(`${checks} voucher four-decimal rate input/display checks passed`)
