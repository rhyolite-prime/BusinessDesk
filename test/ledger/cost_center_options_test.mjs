import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const compile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const tree=compile(await readFile(new URL('../../frontend/app/features/ledger/account-head-tree.ts',import.meta.url),'utf8'))
let source=compile(await readFile(new URL('../../frontend/app/features/ledger/cost-center-options.ts',import.meta.url),'utf8'));source=source.replace("'./account-head-tree'",`'data:text/javascript;base64,${Buffer.from(tree).toString('base64')}'`)
const {costCenterOptions:build}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const records=[{id:'t',name:'Team',parentId:'o'},{id:'o',name:'Operations',parentId:'h'},{id:'h',name:'Head office',parentId:null},{id:'b',name:'Branch',parentId:null},{id:'bo',name:'Operations',parentId:'b'}],snapshot=JSON.stringify(records),options=build(records)
assert.equal(options.find(row=>row.id==='t').label,'Head office / Operations / Team')
assert.equal(options.find(row=>row.id==='t').type,'Head office / Operations')
assert.equal(options.find(row=>row.id==='bo').type,'Branch')
assert.equal(options.filter(row=>row.label.endsWith('Operations')).length,2)
assert.equal(JSON.stringify(records),snapshot)
assert.equal(build([{id:'a',name:'Legacy flat option'}])[0].type,'Top-level cost centers')
assert.equal(build([{id:'a',name:'Missing parent',parentId:'missing'}])[0].label,'Missing parent')
assert.equal(build([{id:'a',name:'A',parentId:'b'},{id:'b',name:'B',parentId:'a'}]).length,2)
console.log('8 cost-center picker hierarchy checks passed')

assert.equal(options.find(row=>row.id==='t').groupKey,'parent:o')
assert.equal(options.find(row=>row.id==='o').groupKey,'parent:h')
assert.equal(options.find(row=>row.id==='h').groupKey,'root')
const duplicates=build([{id:'a',name:'Same',parentId:null},{id:'b',name:'Same',parentId:null},{id:'ac',name:'Child',parentId:'a'},{id:'bc',name:'Child',parentId:'b'}])
assert.notEqual(duplicates.find(row=>row.id==='ac').groupKey,duplicates.find(row=>row.id==='bc').groupKey,'same parent names never merge distinct parent UUIDs')
console.log('4 immediate-parent grouping checks passed')
