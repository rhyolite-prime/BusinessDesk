import assert from 'node:assert/strict'
import {voucherDescription} from '../../frontend/app/features/ledger/voucher-description.ts'
const data={type:'Supplier payment',payee:'API Supplier',mode:'Bank transfer',date:'2026-10-22',currency:'EUR',amount:'10.000000',invoices:['INV-42','INV-42',' '],references:['PO-1']}
const text=voucherDescription(data)
assert.ok(text.includes('Supplier payment')&&text.includes('API Supplier')&&text.includes('Bank transfer'))
assert.ok(text.includes('2026-10-22')&&text.includes('EUR 10.000000'))
assert.equal(text.match(/INV-42/g).length,1)
assert.ok(text.includes('Ref PO-1'))
assert.ok(voucherDescription({...data,payee:'x'.repeat(500)}).length<=300)
console.log('5 voucher description checks passed')
