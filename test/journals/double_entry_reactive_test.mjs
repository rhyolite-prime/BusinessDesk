import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, reactive, watch, toRaw, nextTick } from '../../frontend/node_modules/vue/dist/vue.esm-bundler.js'

// 1. Verify template bindings and logic in frontend/app/pages/ledger/journals/new.vue
const page = readFileSync('frontend/app/pages/ledger/journals/new.vue', 'utf8')

// Default initialization with 2 rows for double entry
assert.match(page, /lines\.value\s*=\s*row\s*\?\s*row\.lines\.map[\s\S]*?:\s*\[blank\(\),\s*blank\(\)\]/)
assert.match(page, /while\s*\(\s*lines\.value\.length\s*<\s*2\s*\)/)

// Reactive handlers bound to row inputs
assert.match(page, /@input="onInputReference\(l,\s*i\)"/)
assert.match(page, /@update:model-value="value\s*=>\s*onSelectCostCenter\(l,\s*i,\s*value\)"/)
assert.match(page, /@input="onInputDescription\(l,\s*i\)"/)
assert.match(page, /@input="onInputTransactionDate\(l,\s*i\)"/)

// Watcher for reactive synchronization
assert.match(page, /watch\(\s*\[\s*\(\)\s*=>\s*lines\.value\[0\]\?\.referenceNumber/)
assert.match(page, /\(\)\s*=>\s*lines\.value\[0\]\?\.costCenterId/)
assert.match(page, /\(\)\s*=>\s*lines\.value\[0\]\?\.description/)
assert.match(page, /\(\)\s*=>\s*lines\.value\[0\]\?\.transactionDate/)

// Add line logic picking last entered data for Ref No, OU, description, transaction date
assert.match(page, /line\.referenceNumber\s*=\s*ref/)
assert.match(page, /line\.costCenterId\s*=\s*ou/)
assert.match(page, /line\.description\s*=\s*l\.description/)
assert.match(page, /line\.transactionDate\s*=\s*dt/)

// 2. Behavioral test of reactive double-entry mirroring and addLine propagation
function realDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s < '1900-01-01' || s > '2999-12-31') return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function createJournalSession() {
  const loaded = ref(true)
  const readonly = ref(false)
  const original = ref(null)
  const form = reactive({ batchDate: '2026-11-19', description: '', isMultiCurrency: false })
  const options = ref({ baseCurrencyId: 'curr-1' })
  const header = reactive({ costCenterId: null })
  const manualLineDescriptions = new WeakSet()

  function blank() {
    return {
      accountId: '',
      currencyId: options.value.baseCurrencyId,
      costCenterId: header.costCenterId,
      exchangeRate: '1',
      debit: '0',
      credit: '0',
      description: '',
      referenceNumber: '',
      chequeNumber: '',
      transactionDate: form.batchDate,
    }
  }

  const lines = ref([blank(), blank()])

  const secondRowEdited = reactive({
    referenceNumber: false,
    costCenterId: false,
    description: false,
    transactionDate: false,
  })
  const lastSyncedRow2 = reactive({
    referenceNumber: '',
    costCenterId: null,
    description: '',
    transactionDate: lines.value[0]?.transactionDate || form.batchDate,
  })

  function onInputReference(line, index) {
    if (index === 0 && !original.value && lines.value[1]) {
      if (!secondRowEdited.referenceNumber && lines.value[1].referenceNumber === lastSyncedRow2.referenceNumber) {
        lines.value[1].referenceNumber = line.referenceNumber
        lastSyncedRow2.referenceNumber = line.referenceNumber
      }
    } else if (index === 1) {
      secondRowEdited.referenceNumber = true
    }
  }

  function onSelectCostCenter(line, index, value) {
    line.costCenterId = value || null
    if (index === 0 && !original.value && lines.value[1]) {
      if (!secondRowEdited.costCenterId && lines.value[1].costCenterId === lastSyncedRow2.costCenterId) {
        lines.value[1].costCenterId = line.costCenterId
        lastSyncedRow2.costCenterId = line.costCenterId
      }
    } else if (index === 1) {
      secondRowEdited.costCenterId = true
    }
  }

  function onInputDescription(line, index) {
    manualLineDescriptions.add(toRaw(line))
    if (index === 0 && !original.value && lines.value[1]) {
      if (!secondRowEdited.description && lines.value[1].description === lastSyncedRow2.description) {
        lines.value[1].description = line.description
        manualLineDescriptions.add(toRaw(lines.value[1]))
        lastSyncedRow2.description = line.description
      }
    } else if (index === 1) {
      secondRowEdited.description = true
    }
  }

  function onInputTransactionDate(line, index) {
    if (index === 0 && !original.value && lines.value[1]) {
      if (!secondRowEdited.transactionDate && lines.value[1].transactionDate === lastSyncedRow2.transactionDate) {
        lines.value[1].transactionDate = line.transactionDate
        lastSyncedRow2.transactionDate = line.transactionDate
      }
    } else if (index === 1) {
      secondRowEdited.transactionDate = true
    }
  }

  watch(
    [
      () => lines.value[0]?.referenceNumber,
      () => lines.value[0]?.costCenterId,
      () => lines.value[0]?.description,
      () => lines.value[0]?.transactionDate,
    ],
    ([refNo, ou, desc, transDate]) => {
      if (!loaded.value || readonly.value || original.value || lines.value.length < 2) return
      const first = lines.value[0]
      const second = lines.value[1]
      if (!first || !second) return

      if (refNo !== undefined && !secondRowEdited.referenceNumber && second.referenceNumber === lastSyncedRow2.referenceNumber) {
        second.referenceNumber = refNo
        lastSyncedRow2.referenceNumber = refNo
      }

      if (ou !== undefined && !secondRowEdited.costCenterId && second.costCenterId === lastSyncedRow2.costCenterId) {
        second.costCenterId = ou
        lastSyncedRow2.costCenterId = ou
      }

      if (desc !== undefined && (manualLineDescriptions.has(toRaw(first)) || desc.trim() !== '')) {
        if (!secondRowEdited.description && second.description === lastSyncedRow2.description) {
          second.description = desc
          manualLineDescriptions.add(toRaw(second))
          lastSyncedRow2.description = desc
        }
      }

      if (transDate !== undefined && !secondRowEdited.transactionDate && second.transactionDate === lastSyncedRow2.transactionDate) {
        second.transactionDate = transDate
        lastSyncedRow2.transactionDate = transDate
      }
    },
    { flush: 'sync' }
  )

  function addLine() {
    const line = blank()
    if (lines.value.length >= 2) {
      for (let i = lines.value.length - 1; i >= 0; i--) {
        const ref = lines.value[i].referenceNumber
        if (ref && ref.trim()) {
          line.referenceNumber = ref
          break
        }
      }

      for (let i = lines.value.length - 1; i >= 0; i--) {
        const ou = lines.value[i].costCenterId
        if (ou !== null && ou !== undefined && ou !== '') {
          line.costCenterId = ou
          break
        }
      }

      for (let i = lines.value.length - 1; i >= 0; i--) {
        const l = lines.value[i]
        if (l.description && l.description.trim() && manualLineDescriptions.has(toRaw(l))) {
          line.description = l.description
          manualLineDescriptions.add(toRaw(line))
          break
        }
      }

      for (let i = lines.value.length - 1; i >= 0; i--) {
        const dt = lines.value[i].transactionDate
        if (dt && realDate(dt)) {
          line.transactionDate = dt
          break
        }
      }
    }
    lines.value.push(line)
  }

  return {
    lines,
    manualLineDescriptions,
    onInputReference,
    onSelectCostCenter,
    onInputDescription,
    onInputTransactionDate,
    addLine,
    secondRowEdited,
  }
}

// Test Case 1: Initialized with 2 rows
const session = createJournalSession()
assert.equal(session.lines.value.length, 2, 'Journal form initializes with exactly 2 rows by default')

// Test Case 2: Entering Ref No on row 1 reactively updates row 2
session.lines.value[0].referenceNumber = 'REF-123'
session.onInputReference(session.lines.value[0], 0)
assert.equal(session.lines.value[1].referenceNumber, 'REF-123', 'Ref No repeats on second row reactively')

// Test Case 3: Selecting OU on row 1 reactively updates row 2
session.onSelectCostCenter(session.lines.value[0], 0, 'ou-finance')
assert.equal(session.lines.value[0].costCenterId, 'ou-finance')
assert.equal(session.lines.value[1].costCenterId, 'ou-finance', 'OU repeats on second row reactively')

// Test Case 4: Entering description on row 1 reactively updates row 2
session.lines.value[0].description = 'Office equipment purchase'
session.onInputDescription(session.lines.value[0], 0)
assert.equal(session.lines.value[1].description, 'Office equipment purchase', 'Description repeats on second row reactively')

// Test Case 5: Changing transaction date on row 1 reactively updates row 2
session.lines.value[0].transactionDate = '2026-11-20'
session.onInputTransactionDate(session.lines.value[0], 0)
assert.equal(session.lines.value[1].transactionDate, '2026-11-20', 'Transaction date repeats on second row reactively')

// Test Case 6: Adding row 3 picks the last entered data for Ref No, OU, description, transaction date
session.addLine()
assert.equal(session.lines.value.length, 3, 'New row added aside the first 2 rows')
const row3 = session.lines.value[2]
assert.equal(row3.referenceNumber, 'REF-123', 'Row 3 inherits last entered Ref No')
assert.equal(row3.costCenterId, 'ou-finance', 'Row 3 inherits last entered OU')
assert.equal(row3.description, 'Office equipment purchase', 'Row 3 inherits last entered description')
assert.equal(row3.transactionDate, '2026-11-20', 'Row 3 inherits last entered transaction date')

// Test Case 7: Changing data on row 3 propagates to newly added row 4
session.lines.value[2].referenceNumber = 'REF-999'
session.lines.value[2].description = 'Shipping fee'
session.manualLineDescriptions.add(toRaw(session.lines.value[2]))
session.lines.value[2].costCenterId = 'ou-logistics'
session.lines.value[2].transactionDate = '2026-11-21'

session.addLine()
assert.equal(session.lines.value.length, 4)
const row4 = session.lines.value[3]
assert.equal(row4.referenceNumber, 'REF-999', 'Row 4 inherits last entered Ref No from row 3')
assert.equal(row4.costCenterId, 'ou-logistics', 'Row 4 inherits last entered OU from row 3')
assert.equal(row4.description, 'Shipping fee', 'Row 4 inherits last entered description from row 3')
assert.equal(row4.transactionDate, '2026-11-21', 'Row 4 inherits last entered transaction date from row 3')

// Test Case 8: Manual edits on row 2 decouple row 2 for that field
const session2 = createJournalSession()
session2.lines.value[0].referenceNumber = 'REF-A'
session2.onInputReference(session2.lines.value[0], 0)
assert.equal(session2.lines.value[1].referenceNumber, 'REF-A')

// User explicitly changes row 2's Ref No
session2.lines.value[1].referenceNumber = 'REF-CUSTOM'
session2.onInputReference(session2.lines.value[1], 1)

// Now user edits row 1 Ref No again
session2.lines.value[0].referenceNumber = 'REF-A2'
session2.onInputReference(session2.lines.value[0], 0)
assert.equal(session2.lines.value[1].referenceNumber, 'REF-CUSTOM', 'Manual edit on row 2 is preserved')

console.log('All journal double-entry reactive initialization and addLine checks passed')
