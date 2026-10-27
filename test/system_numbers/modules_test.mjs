import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source = fs.readFileSync('frontend/app/features/shared/modules.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { Modules, moduleOptions, isKnownModule } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const header = fs.readFileSync('constants/BusinessDeskConsts.h', 'utf8').match(/enum class Modules\s*:\s*int\s*\{([^}]+)\}/)[1]
const entries = [...header.matchAll(/(\w+)\s*=\s*(\d+)/g)].map(([,name,id])=>[name,Number(id)])
assert.equal(entries.length,16)
assert.deepEqual(entries.map(([name,id])=>({name,id})),Object.entries(Modules).filter(([,id])=>typeof id==='number').map(([name,id])=>({name,id})))
assert.equal(moduleOptions.length,16)
assert.deepEqual(moduleOptions.map(option=>option.value),Array.from({length:16},(_,i)=>i+1))
assert.equal(moduleOptions[0].label,'General Ledger')
assert.equal(moduleOptions[14].label,'Customer Relationship Management')
for(const [,id] of entries) { assert.ok(isKnownModule(id)); assert.equal(typeof JSON.parse(JSON.stringify({moduleId:id})).moduleId,'number') }
for(const invalid of [0,17,-1,1.5,NaN])assert.equal(isKnownModule(invalid),false)
console.log('Module enum parity, labels, numeric payload and unsupported-value checks passed')
