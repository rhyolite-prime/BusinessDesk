// Guard the generated model's positional mappings after a physical column drop.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const cc=readFileSync(new URL('../../models/GlJournalLines.cc',import.meta.url),'utf8')
const header=readFileSync(new URL('../../models/GlJournalLines.h',import.meta.url),'utf8')
let checks=0
const check=(ok,label)=>{assert.ok(ok,label);checks++}
const fields=[...cc.matchAll(/^\{"([a-z_]+)",/gm)].map(m=>m[1])
check(fields.length===41,'model has 41 remaining columns')
check(!/cost_center_id|CostCenterId|costCenterId_/.test(cc+header),'removed field has no generated mappings')
check(/return 41;/.test(header)&&/dirtyFlag_\[41\]/.test(header),'model and dirty array counts match')
check(fields[8]==='reference_number'&&fields[40]==='line_number','positions shift after removed column')
const cases=[...cc.matchAll(/case (\d+):/g)].map(m=>Number(m[1]))
check(JSON.stringify(cases)===JSON.stringify(fields.map((_,i)=>i)),'JSON validators cover exactly the remaining positions')
const offsets=[...cc.matchAll(/index = offset \+ (\d+);/g)].map(m=>Number(m[1]))
check(JSON.stringify(offsets)===JSON.stringify(fields.map((_,i)=>i)),'row constructor uses correct physical result positions')
for(const m of cc.matchAll(/if\(dirtyFlag_\[(\d+)\]\)\s*\{\s*ret.push_back\(getColumnName\((\d+)\)\);/g))check(m[1]===m[2],'update column position matches its dirty bit')
check(!/getColumnName\(41\)|case 41:/.test(cc),'no out-of-range column lookups')
console.log(`${checks} journal model schema checks passed`)
