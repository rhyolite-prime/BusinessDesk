import assert from 'node:assert/strict'
import {journalRateDisplay} from '../../frontend/app/features/ledger/journal-rate-display.ts'
const cases=[['1','1.0000'],['12.5','12.5000'],['1.1234499999','1.1234'],['1.1234500000','1.1235'],['9999999999.9999999999','10000000000.0000'],['',''],['bad','bad']]
for(const [input,expected] of cases)assert.equal(journalRateDisplay(input),expected)
console.log(`${cases.length} journal rate display checks passed`)
