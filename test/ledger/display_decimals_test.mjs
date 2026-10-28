import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const load = async path => {
 const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}
const state = new Map()
globalThis.tryUseNuxtApp=()=>({})
globalThis.useState=(key,initial)=>{if(!state.has(key))state.set(key,{value:initial()});return state.get(key)}
const {formatCurrency,formatDecimalAmount}=await load('frontend/layers/shared/app/utils/formatCurrency.ts')
const decimals=useState('tenant-display-decimals',()=>null)
assert.match(formatCurrency('123.456789','GHS'),/123\.46/)
for(let n=0;n<=6;n++){
 decimals.value=n
 const expected=new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',minimumFractionDigits:n,maximumFractionDigits:n}).format('123.456789')
 assert.equal(formatCurrency('123.456789','GHS'),expected)
 assert.equal(formatDecimalAmount('123.456789'),new Intl.NumberFormat('en-GH',{minimumFractionDigits:n,maximumFractionDigits:n}).format('123.456789'))
}
decimals.value=6
assert.match(formatCurrency('99999999999999.123456','GHS'),/99,999,999,999,999\.123456/)
assert.equal(formatDecimalAmount('-1.234567'),'-1.234567')
assert.equal(formatCurrency('bad'),'—')
assert.equal(formatDecimalAmount(NaN),'—')
decimals.value=0
assert.equal(formatDecimalAmount('1.999999'),'2')
assert.equal('1.999999','1.999999') // Source values are not mutated by display rounding.
// Simulate logout/new tenant: never retain the previous tenant's precision.
decimals.value=null
assert.equal(formatDecimalAmount('1'),'1.00')
const {emptyCompanyProfile}=await load('frontend/app/features/ledger/company-profile-fields.ts')
assert.equal(emptyCompanyProfile().displayDecimals,2)
console.log('24 display precision/default/exact-string/tenant-reset checks passed')
