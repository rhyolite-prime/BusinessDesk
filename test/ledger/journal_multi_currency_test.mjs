import assert from 'node:assert/strict'
import {journalDeficit,journalBalancingAmounts} from '../../frontend/app/features/ledger/journal-deficit.ts'
let checks=0
function balance(first,rate,expected,exact=true){const deficit=journalDeficit([first]);assert.notEqual(deficit,null);const result=journalBalancingAmounts(deficit,rate);assert.ok(result);assert.equal(result.debit,expected[0]);assert.equal(result.credit,expected[1]);assert.equal(result.exact,exact);checks++}
balance({debit:'2',credit:'0',exchangeRate:'12.5'},'10',['0.000000','2.500000'])
balance({debit:'25',credit:'0',exchangeRate:'1'},'12.5',['0.000000','2.000000'])
balance({debit:'0',credit:'2',exchangeRate:'12.5'},'1',['25.000000','0.000000'])
balance({debit:'2.000001',credit:'0',exchangeRate:'12.5'},'10',['0.000000','2.500001'],false)
assert.equal(journalDeficit([{debit:'2',credit:'0',exchangeRate:''}]),null);checks++
assert.equal(journalBalancingAmounts(25000000n,''),null);checks++
assert.equal(journalDeficit([{debit:'1',credit:'1',exchangeRate:'12.5'}]),null);checks++
console.log(`${checks} multi-currency balancing checks passed`)
