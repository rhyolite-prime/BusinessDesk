import assert from 'node:assert/strict'
import {employeeLineFlags} from '../../frontend/app/features/ledger/employee-line-flags.ts'
let checks=0
for(const isWithhold of [false,true]) {
 assert.deepEqual(employeeLineFlags({isWithhold}),{isImprest:isWithhold,isWithhold:false});checks++
 for(const isImprest of [false,true]) {
  assert.deepEqual(employeeLineFlags({isImprest,isWithhold}),{isImprest,isWithhold});checks++
 }
}
console.log(`${checks} employee line flag checks passed`)
