import assert from 'node:assert/strict'
import {allocateBudgetTotal,budgetMicros,budgetDecimal,budgetTotal,budgetPeriods,displayBudgetAmount,percentBudgetAmount} from '../../frontend/app/features/ledger/budget-amounts.ts'
let checks=0
const eq=(a,b)=>{assert.deepEqual(a,b);checks++}
eq(budgetMicros('99999999999999.999999'),99999999999999999999n)
eq(budgetDecimal(99999999999999999999n),'99999999999999.999999')
for(const value of ['-1','1e3','01.2','NaN','Infinity','0.0000001','100000000000000',' 1','1.',undefined,1])eq(budgetMicros(value),null)
for(let n=1;n<=60;n++)for(const value of ['0','0.000001','0.01','1.01','99999999999999.999999']){
 const a=allocateBudgetTotal(value,n)
 eq(a.length,n);eq(a.every(v=>budgetMicros(v)>=0n),true);eq(budgetTotal(a),budgetDecimal(budgetMicros(value)))
}
eq(allocateBudgetTotal('0.000002',3),['0.000001','0.000001','0.000000'])
eq(allocateBudgetTotal('1',0),null);eq(allocateBudgetTotal('1',61),null)
eq(budgetTotal(['99999999999999.999999','0.000001']),'100000000000000.000000')
eq(displayBudgetAmount('100000000000000.000000'),'100,000,000,000,000')
eq(displayBudgetAmount('0.000001'),'0.000001');eq(budgetTotal(['-1']),'Invalid')
eq(percentBudgetAmount('0.000001','50'),'0.000001');eq(percentBudgetAmount('99999999999999.999999','100'),'99999999999999.999999');eq(percentBudgetAmount('99999999999999.999999','101'),null);eq(percentBudgetAmount('200','110.5'),'221.000000')
eq(budgetPeriods('1900-01','1900-01'),[{year:1900,month:1}]);eq(budgetPeriods('2999-12','2999-12'),[{year:2999,month:12}]);eq(budgetPeriods('2026-01','2030-12').length,60)
for(const [a,b] of [['2026-01','2031-01'],['1899-12','1900-01'],['2999-12','3000-01'],['2026-13','2027-02'],['bad','bad'],['2026-02','2026-01']])eq(budgetPeriods(a,b),[])
console.log(`${checks} exact budget amount/period checks passed`)
