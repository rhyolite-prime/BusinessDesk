import assert from 'node:assert/strict'
import { journalDeficit, journalBalancingAmounts } from '../../frontend/app/features/ledger/journal-deficit.ts'
let checks=0
const eq=(actual,expected)=>{assert.deepEqual(actual,expected);checks++}
const line=(debit='0',credit='0',exchangeRate='1')=>({debit,credit,exchangeRate})
eq(journalDeficit([line('100'),line('0','25')]),75000000n)
eq(journalBalancingAmounts(75000000n,'1'),{debit:'0.000000',credit:'75.000000',exact:true})
eq(journalDeficit([line('25'),line('0','100')]),-75000000n)
eq(journalBalancingAmounts(-75000000n,'1'),{debit:'75.000000',credit:'0.000000',exact:true})
eq(journalBalancingAmounts(0n,'1'),{debit:'0.000000',credit:'0.000000',exact:true})
eq(journalDeficit([line('10'),line('0','10')]),0n)
eq(journalDeficit([line('2.000001','0','12.5'),line('0','10')]),15000013n)
eq(journalBalancingAmounts(125000000n,'12.5'),{debit:'0.000000',credit:'10.000000',exact:true})
eq(journalBalancingAmounts(2n,'3'),{debit:'0.000000',credit:'0.000001',exact:false})
eq(journalBalancingAmounts(1n,'3'),null)
eq(journalDeficit([line('99999999999999.999999'),line('0','0.000001')]),99999999999999999998n)
eq(journalBalancingAmounts(-99999999999999999999n,'1'),{debit:'99999999999999.999999',credit:'0.000000',exact:true})
for(const invalid of [line('-1'),line('NaN'),line('1','1'),line('0.1234567'),line('1','0',''),line('1','0','0'),line('1','0','10000000000'),line('0.000001','0','0.0000000001'),line('99999999999999.999999','0','2')])eq(journalDeficit([invalid]),null)
eq(journalDeficit([line('99999999999999.999999'),line('1')]),null)
eq(journalDeficit([line('', '')]),0n)
eq(journalBalancingAmounts(100000000000000000000n,'1'),null)
eq(journalBalancingAmounts(1n,'0'),null)
eq(journalBalancingAmounts(1n,''),null)
console.log(`${checks} journal deficit checks passed`)
