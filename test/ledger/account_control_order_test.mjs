// Run after installing frontend dependencies.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source = await readFile(new URL('../../frontend/app/features/ledger/account-control-order.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { sortAccountControlsByType: sort } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const heads = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Unknown'].map((standardAccountType, i) => ({ id: `head-${i}`, standardAccountType }))
const control = (id, type) => ({ id, accountGroupId: `head-${type}` })
// Deliberately unordered, with siblings and an unresolved head.
const controls = [control('expense', 4), control('revenue', 3), control('asset-b', 0), control('equity', 2), control('liability', 1), control('asset-a', 0), control('unknown', 5), control('unresolved', 99)]
const snapshot = JSON.stringify({ controls, heads })
assert.deepEqual(sort(controls, heads).map(row => row.id), ['unknown', 'unresolved', 'asset-b', 'asset-a', 'liability', 'equity', 'revenue', 'expense'])
assert.equal(JSON.stringify({ controls, heads }), snapshot, 'sorting must not mutate API data')
assert.deepEqual(sort([], heads), [])
assert.deepEqual(sort(controls, []), controls, 'unresolved types retain their relative order')
assert.deepEqual(sort([control('single', 2)], heads), [control('single', 2)])
const ordered = sort(controls, heads)
assert.deepEqual(sort(ordered, heads), ordered, 'sorting is idempotent')
assert.equal(ordered[0], controls[6], 'original control objects and IDs are preserved')
console.log('7 account control ordering checks passed')
