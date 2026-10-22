// Run with node test/ledger/account_head_tree_test.mjs after installing frontend dependencies.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source = await readFile(new URL('../../frontend/app/features/ledger/account-head-tree.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { buildAccountHeadTree: build, filterAccountHeadTree: filter } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const head = (id, name, parentId = null, sortOrder = 0, standardAccountType = 'Asset') => ({ id, name, parentId, sortOrder, standardAccountType, isActive: true })
// Deliberately interleaved API order: grandchildren/children arrive before roots,
// including parents returned on a later API page.
const records = [
  head('bank', 'Bank', 'current', 0),
  head('revenue', 'Revenue', null, 1, 'Revenue'),
  head('cash', 'Cash', 'current', 2),
  head('fixed', 'Fixed assets', 'assets', 3),
  head('assets', 'Assets', null, 4),
  head('current', 'Current assets', 'assets', 5),
]
const original = JSON.stringify(records)
const rows = build(records)
assert.deepEqual(rows.map(row => row.head.id), ['revenue', 'assets', 'fixed', 'current', 'bank', 'cash'])
assert.deepEqual(rows.map(row => row.depth), [0, 0, 1, 1, 2, 2])
assert.equal(rows.find(row => row.head.id === 'bank').path, 'Assets / Current assets / Bank')
assert.equal(JSON.stringify(records), original, 'building the tree must not mutate fetched records')
assert.deepEqual(filter(rows, 'bank').map(row => row.head.id), ['assets', 'current', 'bank'], 'search retains ancestors')
assert.deepEqual(filter(rows, 'current').map(row => row.head.id), ['assets', 'current', 'bank', 'cash'], 'parent search includes its subtree')
assert.deepEqual(filter(rows, '', 'Revenue').map(row => row.head.id), ['revenue'])
assert.deepEqual(filter(rows, 'bank', 'Revenue'), [])
assert.deepEqual(filter(rows, '  BANK ').map(row => row.head.id), ['assets', 'current', 'bank'])
assert.deepEqual(filter(rows).map(row => row.head.id), rows.map(row => row.head.id))
assert.deepEqual(filter(rows, 'not found'), [])
assert.deepEqual(build([]), [])
const malformed = build([head('orphan', 'Orphan', 'missing'), head('self', 'Self', 'self'), head('a', 'Cycle A', 'b'), head('b', 'Cycle B', 'a')])
assert.equal(malformed.length, 4, 'orphan/self/cycle records are all rendered exactly once')
assert.equal(new Set(malformed.map(row => row.head.id)).size, 4)
assert.equal(malformed.find(row => row.head.id === 'orphan').depth, 0, 'missing parent does not add phantom indentation')
assert.equal(malformed.find(row => row.head.id === 'self').depth, 0)
assert.equal(build([records[0], records[0]]).length, 1, 'duplicate records never duplicate row keys')
const deep = Array.from({ length: 1000 }, (_, index) => head(String(index), String(index), index ? String(index - 1) : null))
assert.equal(build(deep.reverse()).at(-1).depth, 999, 'iterative traversal handles deep input without recursion')
console.log('18 account-head hierarchy regression checks passed')
