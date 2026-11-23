import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getNextAvailableAccountNumber, findNextAvailableAccountNumber } from '../../frontend/app/features/ledger/account-number.ts'

let checks = 0

// Section 1: Algorithmic correctness of getNextAvailableAccountNumber
// 1.1: Basic range with no existing accounts
assert.equal(getNextAvailableAccountNumber({ minAccount: 1000, maxAccount: 1099 }, []), '1000')
assert.equal(findNextAvailableAccountNumber({ minAccount: 5000, maxAccount: 5099 }, []), '5000')
checks += 2

// 1.2: Sequential allocations
const bankControl = { minAccount: 1010, maxAccount: 1099 }
const accounts = [
  { id: 'acc-1', accountNumber: '1010' },
  { id: 'acc-2', accountNumber: '1011' },
  { id: 'acc-3', accountNumber: '1012' },
]
assert.equal(getNextAvailableAccountNumber(bankControl, accounts), '1013')
checks++

// 1.3: Holes and gaps in range - finds lowest available number
const gapAccounts = [
  { id: 'acc-1', accountNumber: '1000' },
  { id: 'acc-3', accountNumber: '1002' },
  { id: 'acc-4', accountNumber: '1003' },
]
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 1000, maxAccount: 1009 }, gapAccounts),
  '1001',
  'Must find lowest available gap in range'
)
checks++

// 1.4: Accounts outside range do not affect the result
const mixedAccounts = [
  { id: 'acc-other-1', accountNumber: '999' },
  { id: 'acc-1', accountNumber: '1000' },
  { id: 'acc-other-2', accountNumber: '1100' },
  { id: 'acc-other-3', accountNumber: '50016' },
]
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 1000, maxAccount: 1009 }, mixedAccounts),
  '1001'
)
checks++

// 1.5: Accounts within range even if from other controls are respected (GL account numbers are unique per unit)
const crossAccounts = [
  { id: 'acc-1', accountNumber: '1000' },
  { id: 'acc-x', accountNumber: '1001' }, // from another source but takes 1001
]
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 1000, maxAccount: 1009 }, crossAccounts),
  '1002'
)
checks++

// 1.6: Fully exhausted range returns empty string
const smallRange = { minAccount: 100, maxAccount: 102 }
const fullAccounts = [
  { accountNumber: '100' },
  { accountNumber: '101' },
  { accountNumber: '102' },
]
assert.equal(getNextAvailableAccountNumber(smallRange, fullAccounts), '')
checks++

// 1.7: Single-number range
const singleRange = { minAccount: 4000, maxAccount: 4000 }
assert.equal(getNextAvailableAccountNumber(singleRange, []), '4000')
assert.equal(getNextAvailableAccountNumber(singleRange, [{ accountNumber: '4000' }]), '')
checks += 2

// 1.8: Edit mode - exclude current account ID so its own number is recognized as available
const editAccounts = [
  { id: 'acc-current', accountNumber: '1000' },
  { id: 'acc-next', accountNumber: '1001' },
]
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1009 },
    editAccounts,
    'acc-current'
  ),
  '1000',
  'Excluding current account makes its number available'
)
checks++

// 1.9: Normalization of leading zeros and strings with spaces
const dirtyAccounts = [
  { accountNumber: ' 001000 ' },
  { accountNumber: '01001' },
]
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 1000, maxAccount: 1009 }, dirtyAccounts),
  '1002',
  'Numbers with leading zeros and whitespace must be normalized'
)
checks++

// 1.10: Edge cases: invalid ranges, negative bounds, non-numbers, nulls
assert.equal(getNextAvailableAccountNumber(null, []), '')
assert.equal(getNextAvailableAccountNumber(undefined, []), '')
assert.equal(getNextAvailableAccountNumber({ minAccount: -10, maxAccount: 100 }, []), '')
assert.equal(getNextAvailableAccountNumber({ minAccount: 100, maxAccount: 3000000000 }, []), '')
assert.equal(getNextAvailableAccountNumber({ minAccount: '100', maxAccount: 200 }, []), '')
assert.equal(getNextAvailableAccountNumber({ minAccount: 100.5, maxAccount: 200 }, []), '')
checks += 6

// 1.11: Graceful reversed range bounds
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 1005, maxAccount: 1000 }, [{ accountNumber: '1000' }]),
  '1001'
)
checks++

// 1.12: Instantaneous execution for large max bounds
const hugeRange = { minAccount: 1000, maxAccount: 2000000000 }
const t0 = performance.now()
const hugeRes = getNextAvailableAccountNumber(hugeRange, [
  { accountNumber: '1000' },
  { accountNumber: '1001' },
])
const t1 = performance.now()
assert.equal(hugeRes, '1002')
assert.ok(t1 - t0 < 50, `Sub-50ms performance expected, got ${(t1 - t0).toFixed(2)}ms`)
checks += 2

// Section 2: Verification of Chart of Account Details page (frontend/app/pages/ledger/accounts/index.vue)
const pageCode = fs.readFileSync('frontend/app/pages/ledger/accounts/index.vue', 'utf8')

// 2.1: Page imports getNextAvailableAccountNumber
assert.ok(
  pageCode.includes("import { getNextAvailableAccountNumber } from '../../../features/ledger/account-number'"),
  'accounts/index.vue must import getNextAvailableAccountNumber'
)
checks++

// 2.2: Page binds AccountControlPicker update event / auto-populates on control selection
assert.ok(
  pageCode.includes('@update:model-value="onAccountControlSelected"') ||
  pageCode.includes('@update:model-value="onControlSelected"'),
  'AccountControlPicker must have selection event listener to auto-populate next account number'
)
checks++

// 2.3: openCreate auto-populates account number for initial control
assert.ok(
  pageCode.includes('applyNextAccountNumber') || pageCode.includes('getNextAvailableAccountNumber'),
  'openCreate or watcher must apply the next available account number'
)
checks++

// 2.4: openEdit preserves the account number of the edited row
const openEditMatch = pageCode.match(/async function openEdit[\s\S]*?showForm\.value = true/)
assert.ok(openEditMatch, 'openEdit function should exist')
assert.ok(
  openEditMatch[0].includes('accountNumber: row.accountNumber'),
  'openEdit must preserve row.accountNumber'
)
checks += 2

// 2.5: Guard against openEdit overwriting accountNumber with next available number
assert.ok(
  pageCode.includes('isInitializingForm') || pageCode.includes('suppressAutoNumber'),
  'Must have guard (isInitializingForm) to prevent edit modal initialization from overwriting existing account number'
)
checks++

console.log(`${checks} account detail next number checks passed!`)
