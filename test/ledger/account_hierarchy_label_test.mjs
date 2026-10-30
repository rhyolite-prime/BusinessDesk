import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'
const source = await readFile(new URL('../../frontend/app/features/ledger/account-hierarchy-label.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { joinAccountHierarchyPaths: join } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
assert.equal(join('Assets / Current Assets', 'Assets / Current Assets'), 'Assets / Current Assets')
assert.equal(join('Assets', 'Assets'), 'Assets')
assert.equal(join('Liabilities / Accounts Payable', 'Liabilities / Accounts Payable'), 'Liabilities / Accounts Payable')
assert.equal(join('Assets / Current Assets', 'Cash / Petty cash'), 'Assets / Current Assets / Cash / Petty cash', 'distinct legacy names remain visible')
assert.equal(join('Assets', 'Assets / Current Assets', 'Assets / Current Assets / Cash'), 'Assets / Current Assets / Cash', 'nested derived control paths merge without repeats')
assert.equal(join('Assets / Current Assets', join('Assets / Current Assets', 'Assets / Current Assets', 'Petty cash')), 'Assets / Current Assets / Petty cash')
assert.equal(join('Assets / Assets', 'Assets / Assets'), 'Assets / Assets', 'legitimate repeated node names are retained')
assert.equal(join('Assets / Cash', 'Cash / Bank'), 'Assets / Cash / Bank')
assert.equal(join('', 'Assets', ''), 'Assets')
assert.equal(join(), '')
assert.equal(join('Assets', 'assets'), 'Assets / assets', 'do not collapse distinct case-sensitive names')
console.log('11 account hierarchy label checks passed')
