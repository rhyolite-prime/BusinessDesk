import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { voucherRateDisplay, voucherRateInput } from '../../frontend/app/features/ledger/voucher-rate-input.ts'

let checks = 0

// Test 1: Exchange rate formatting (4 dp)
assert.equal(voucherRateDisplay('1'), '1.0000')
assert.equal(voucherRateDisplay('1.0000000000'), '1.0000')
assert.equal(voucherRateDisplay('12.5'), '12.5000')
assert.equal(voucherRateDisplay('13.4000000000'), '13.4000')
assert.equal(voucherRateDisplay('16'), '16.0000')
assert.equal(voucherRateInput('1.2345'), '1.2345')
assert.equal(voucherRateInput('1.23456'), '1.2346')
checks += 7

// Test 2: Read petty-cash-data.ts and verify seed data has 4 dp exchange rate and optional batchOriginator
const dataContent = fs.readFileSync('frontend/app/features/ledger/petty-cash-data.ts', 'utf8')
assert.ok(dataContent.includes("exchangeRate: '1.0000'"), 'Seed data should use 4 dp exchange rate')
assert.ok(!dataContent.includes("exchangeRate: '1.0000000000'"), 'Old 10 dp exchange rate should be removed from seed data')
assert.ok(dataContent.includes('batchOriginator?: string'), 'batchOriginator should be optional in batch interface')
checks += 3

// Test 3: Check entry forms (new.vue and index.vue)
for (const filePath of ['frontend/app/pages/ledger/petty-cash/new.vue', 'frontend/app/pages/ledger/petty-cash/index.vue']) {
  const content = fs.readFileSync(filePath, 'utf8')

  // Requirement 1: Remove batchOriginator from petty cash form
  assert.ok(!content.includes('form.batchOriginator'), `${filePath} must not bind form.batchOriginator`)
  assert.ok(!content.includes('batchOriginator:'), `${filePath} PettyCashForm interface must not include batchOriginator`)
  assert.ok(!content.includes('Enter a batch originator'), `${filePath} must not validate batchOriginator`)

  // Requirement 2: Exchange rate 4 dp
  assert.ok(content.includes('voucherRateDisplay'), `${filePath} must use voucherRateDisplay`)
  assert.ok(content.includes('exchangeRateInput'), `${filePath} must have exchangeRateInput`)
  assert.ok(content.includes('Exchange rate · 4 dp') || content.includes('Exchange rate'), `${filePath} must have exchange rate field`)

  // Requirement 4: Proposed journal entries must be below Batch details card
  const batchDetailsIndex = content.indexOf('Batch details')
  const proposedJournalIndex = content.indexOf('Proposed journal entry')
  assert.ok(batchDetailsIndex > 0, `${filePath} must contain Batch details`)
  assert.ok(proposedJournalIndex > 0, `${filePath} must contain Proposed journal entry`)
  assert.ok(
    proposedJournalIndex > batchDetailsIndex,
    `${filePath} Proposed journal entry must appear after/below Batch details card`,
  )
  assert.ok(!content.includes('2xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,0.9fr)]'), `${filePath} must not use 2-column sidebar grid for proposed journal`)

  checks += 7
}

// Test 4: Check dedicated pages and register component
const registerContent = fs.readFileSync('frontend/app/pages/ledger/petty-cash/register.vue', 'utf8')
assert.ok(registerContent.includes('PettyCashRegister'), 'register.vue must render PettyCashRegister')

const historyContent = fs.readFileSync('frontend/app/pages/ledger/petty-cash/history.vue', 'utf8')
assert.ok(historyContent.includes('PettyCashRegister'), 'history.vue must render PettyCashRegister')

const compContent = fs.readFileSync('frontend/app/features/ledger/components/PettyCashRegister.vue', 'utf8')
assert.ok(compContent.includes('Batches in view'), 'PettyCashRegister must have summary cards')
assert.ok(compContent.includes('exportCsv'), 'PettyCashRegister must support CSV export')
assert.ok(compContent.includes('Proposed journal entry'), 'PettyCashRegister must show proposed journal entry in detail modal')
checks += 5

console.log(`${checks} petty cash checks passed successfully!`)
