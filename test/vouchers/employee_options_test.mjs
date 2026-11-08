import assert from 'node:assert/strict'
import {loadEmployeeVoucherOptions} from '../../frontend/app/features/employees/voucher-options.ts'
const employee=n=>({id:`employee-${n}`,employeeIdentifier:`EMP-${n}`,name:`Employee ${n}`,status:0})
let checks=0
const check=(v,label)=>{assert.ok(v,label);checks++}
const pages=[]
const records=await loadEmployeeVoucherOptions(async q=>{pages.push(q);return {data:[employee(q.pageNo)],totalCount:2}})
check(records.length===2&&pages.length===2&&pages[1].pageNo===2&&pages[0].pageSize===100,'totalCount pagination, not legacy totalPages')
check((await loadEmployeeVoucherOptions(async()=>({data:[],totalCount:0}))).length===0,'empty database remains empty')
for(const invalid of [{data:null,totalCount:1},{data:[],totalCount:-1},{data:[],totalCount:1.5},{data:[{...employee(1),name:null}],totalCount:1},{data:[],totalCount:2}]){
 await assert.rejects(()=>loadEmployeeVoucherOptions(async()=>invalid));checks++
}
await assert.rejects(()=>loadEmployeeVoucherOptions(async()=>{throw new Error('Database unavailable')}),/Database unavailable/);checks++
await assert.rejects(()=>loadEmployeeVoucherOptions(async q=>({data:[employee(q.pageNo)],totalCount:101})),/supported voucher lookup size/);checks++
console.log(`${checks} employee voucher option checks passed`)
