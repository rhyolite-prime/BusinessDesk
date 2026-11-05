import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source=await readFile(new URL('../../frontend/app/features/ledger/account-control-name-tree.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {buildControlNameTree:build,filterControlNameTree:filter}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const c=(id,name,min,max,parent=null)=>({id,accountHeaderName:name,minAccount:min,maxAccount:max,parentAccountHeaderId:parent,accountGroupId:id,isActive:true})
const records=[c('bio','Assets / Biological Assets',15000,15999),c('cocoa','Revenue / Cocoa Revenue',44999,45999),c('current','Assets / Current Assets',10000,10999),c('assets','Assets',10000,19999),c('cash','Assets / Current Assets / Cash',10000,10009),c('expense','Expense / Finance Costs',62000,62999),c('equity','Equity / Reserves',33000,33999),c('liability','Liabilities / Lease Liabilities',27000,27999)]
const snapshot=JSON.stringify(records),rows=build(records)
assert.deepEqual(rows.filter(r=>r.depth===0).map(r=>r.label),['Assets','Liabilities','Equity','Revenue','Expense'])
assert.deepEqual(rows.filter(r=>r.control).map(r=>r.control.id),['assets','current','cash','bio','liability','equity','cocoa','expense'])
assert.equal(rows.find(r=>r.control?.id==='cash').depth,2)
assert.equal(rows.find(r=>r.control?.id==='current').hasChildren,true)
assert.equal(rows.find(r=>r.label==='Revenue').control,null,'missing prefixes become display-only groups')
assert.equal(JSON.stringify(records),snapshot,'preprocessing does not mutate API records')
assert.deepEqual(filter(rows,'Cash').map(r=>r.label),['Assets','Current Assets','Cash'])
assert.deepEqual(filter(rows,'15000').map(r=>r.label),['Assets','Biological Assets'])
assert.deepEqual(filter(rows,'Revenue Cocoa').map(r=>r.label),['Revenue','Cocoa Revenue'])
assert.deepEqual(filter(rows,'not found'),[])
assert.equal(filter(rows,'').length,rows.length)
assert.equal(build([c('a',' Assets / / Inventory ',0,1)])[1].label,'Inventory')
assert.equal(build([c('blank',' / ',0,0)])[0].label,'Unnamed control')
assert.equal(build([c('a','Assets / Cash',0,1),c('b','Assets / Cash',2,3)]).filter(r=>r.control).length,2,'duplicate names never lose records')
assert.deepEqual(build(records.map(r=>({...r,parentAccountHeaderId:'irrelevant-cycle'}))).map(r=>r.path),rows.map(r=>r.path),'parent IDs never determine presentation')
assert.equal(build([]).length,0)
assert.equal(build([c('a','Assets / Assets',0,1)])[1].depth,1,'repeated legitimate node names remain')
console.log('17 account-control name hierarchy checks passed')
