import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=await readFile(new URL('../../frontend/app/features/reports/chart-of-accounts.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {chartOfAccountsReport:build}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const input={accounts:[{id:'b',accountType:0,accountHeaderId:'cash',accountNumber:'10010',accountName:'Cash ten',currencyId:null,status:'inactive'},{id:'a',accountType:0,accountHeaderId:'cash',accountNumber:'10002',accountName:'Cash two',currencyId:'usd',status:'active'},{id:'c',accountType:1,accountHeaderId:'due',accountNumber:'20000',accountName:'Payable',currencyId:null,status:'active'}],controls:[{id:'cash',accountHeaderName:'Assets / Cash'},{id:'due',accountHeaderName:'Liabilities / Accounts Payable'}],currencies:[{id:'ghs',name:'Ghana Cedi',code:'GHS'},{id:'usd',name:'US Dollar',code:'USD'}],companyName:'Example',unitName:'Head Office',baseCurrencyId:'ghs',generatedAt:'25 Oct 2026, 12:00'}
const snapshot=JSON.stringify(input),report=build(input)
assert.equal(report.sections.length,2)
assert.equal(report.sections[0].title,'Assets / Cash')
assert.deepEqual(report.sections[0].rows.map(row=>row[0]),['10002','10010'])
assert.equal(report.sections[0].rows[0][2],'US Dollar')
assert.equal(report.sections[0].rows[1][2],'Ghana Cedi')
assert.equal(build({...input,status:'active'}).sections.flatMap(s=>s.rows).length,2)
assert.equal(build({...input,type:'0'}).sections.flatMap(s=>s.rows).length,2)
assert.equal(build({...input,query:'payable'}).sections.length,1)
assert.equal(build({...input,query:'10002'}).sections[0].rows[0][1],'Cash two')
assert.equal(build({...input,query:'cash'}).sections[0].rows.length,2)
assert.equal(build({...input,query:'not found'}).sections.length,0)
assert.equal(build({...input,accounts:[]}).sections.length,0)
assert.equal(build({...input,controls:[]}).sections[0].title,'Asset / Unavailable control')
assert.equal(build({...input,currencies:[]}).sections[0].rows[0][2],'Unavailable currency')
assert.equal(build({...input,currencies:[]}).sections[0].rows[1][2],'Unit base currency (unavailable)')
assert.equal(build({...input,companyName:''}).companyName,'Company profile not configured')
assert.equal(JSON.stringify(input),snapshot,'source records remain immutable')
console.log('17 chart-of-accounts report checks passed')
