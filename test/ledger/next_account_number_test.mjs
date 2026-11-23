import assert from 'node:assert/strict'
import { getNextAvailableAccountNumber } from '../../frontend/app/features/ledger/account-number.ts'

let checks = 0

// Test 1: Empty existing accounts returns minAccount
assert.equal(getNextAvailableAccountNumber({ minAccount: 1000, maxAccount: 1099 }, []), '1000')
checks++

// Test 2: Sequential used accounts starting at minAccount returns next consecutive number
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1099 },
    [{ accountNumber: '1000' }]
  ),
  '1001'
)
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1099 },
    [{ accountNumber: '1000' }, { accountNumber: '1001' }, { accountNumber: '1002' }]
  ),
  '1003'
)
checks += 2

// Test 3: Gaps in existing accounts returns the lowest available number
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1099 },
    [{ accountNumber: '1000' }, { accountNumber: '1002' }]
  ),
  '1001'
)
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1099 },
    [{ accountNumber: '1001' }, { accountNumber: '1002' }]
  ),
  '1000'
)
checks += 2

// Test 4: Existing accounts outside the range are ignored
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1099 },
    [{ accountNumber: '999' }, { accountNumber: '1100' }, { accountNumber: '2000' }]
  ),
  '1000'
)
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1099 },
    [{ accountNumber: '999' }, { accountNumber: '1000' }, { accountNumber: '1100' }]
  ),
  '1001'
)
checks += 2

// Test 5: Exhausted range returns empty string
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1002 },
    [{ accountNumber: '1000' }, { accountNumber: '1001' }, { accountNumber: '1002' }]
  ),
  ''
)
checks++

// Test 6: Single-number range
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 5000, maxAccount: 5000 }, []),
  '5000'
)
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 5000, maxAccount: 5000 }, [{ accountNumber: '5000' }]),
  ''
)
checks += 2

// Test 7: Exclude account ID during edit
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1009 },
    [
      { id: 'acc-1', accountNumber: '1000' },
      { id: 'acc-2', accountNumber: '1001' },
      { id: 'acc-3', accountNumber: '1002' },
    ],
    'acc-2' // acc-2 has 1001, so 1001 becomes available!
  ),
  '1001'
)
checks++

// Test 8: Leading zeros and whitespace normalization
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1009 },
    [{ accountNumber: ' 01000 ' }]
  ),
  '1001'
)
checks++

// Test 9: Invalid account numbers (non-numeric, negative strings, nulls) are safely ignored
assert.equal(
  getNextAvailableAccountNumber(
    { minAccount: 1000, maxAccount: 1009 },
    [{ accountNumber: null }, { accountNumber: '' }, { accountNumber: 'invalid' }, { accountNumber: '-5' }]
  ),
  '1000'
)
checks++

// Test 10: Null or invalid control
assert.equal(getNextAvailableAccountNumber(null, []), '')
assert.equal(getNextAvailableAccountNumber(undefined, []), '')
assert.equal(getNextAvailableAccountNumber({ minAccount: NaN, maxAccount: 1000 }, []), '')
assert.equal(getNextAvailableAccountNumber({ minAccount: -1, maxAccount: 1000 }, []), '')
checks += 4

// Test 11: Reversed min/max gracefully handled
assert.equal(
  getNextAvailableAccountNumber({ minAccount: 1010, maxAccount: 1000 }, [{ accountNumber: '1000' }]),
  '1001'
)
checks++

// Test 12: Huge range performance test (must execute instantaneously without freezing)
const start = performance.now()
const nextHuge = getNextAvailableAccountNumber(
  { minAccount: 1000, maxAccount: 2000000000 },
  [{ accountNumber: '1000' }, { accountNumber: '1001' }, { accountNumber: '1002' }]
)
const elapsed = performance.now() - start
assert.equal(nextHuge, '1003')
assert.ok(elapsed < 100, `Large range took ${elapsed}ms, should be <100ms`)
checks += 2

// Test 13: Simulation of consecutive creations
const existing = []
const control = { minAccount: 2000, maxAccount: 2004 }
for (let i = 0; i < 5; i++) {
  const nextNum = getNextAvailableAccountNumber(control, existing)
  assert.equal(nextNum, String(2000 + i))
  existing.push({ id: `acc-${i}`, accountNumber: nextNum })
}
assert.equal(getNextAvailableAccountNumber(control, existing), '')
checks += 6

console.log(`${checks} next available account number unit checks passed!`)
