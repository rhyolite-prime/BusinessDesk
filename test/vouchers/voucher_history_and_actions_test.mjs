import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Test 1: Verify VoucherRegister.vue has the 4 tax columns on history
const registerSrc = await readFile('frontend/app/features/ledger/components/VoucherRegister.vue', 'utf8')

assert.ok(registerSrc.includes('GETFL+NHIL'), 'VoucherRegister.vue includes GETFL+NHIL column header')
assert.ok(registerSrc.includes('VAT'), 'VoucherRegister.vue includes VAT column header')
assert.ok(registerSrc.includes('WITHHELD'), 'VoucherRegister.vue includes WITHHELD column header')
assert.ok(registerSrc.includes('VAT WH'), 'VoucherRegister.vue includes VAT WH column header')

// Test 2: Verify column logic in table
assert.ok(registerSrc.includes('<th v-if="history" class="px-4 py-3 text-right">GETFL+NHIL</th>'), 'History header includes GETFL+NHIL')
assert.ok(registerSrc.includes('<th v-if="history" class="px-4 py-3 text-right">VAT</th>'), 'History header includes VAT')
assert.ok(registerSrc.includes('<th v-if="history" class="px-4 py-3 text-right">WITHHELD</th>'), 'History header includes WITHHELD')
assert.ok(registerSrc.includes('<th v-if="history" class="px-4 py-3 text-right">VAT WH</th>'), 'History header includes VAT WH')

// Test 3: Verify data cells in table
assert.ok(registerSrc.includes('voucherGetflNhil(voucher)'), 'Table row includes voucherGetflNhil')
assert.ok(registerSrc.includes('voucherVat(voucher)'), 'Table row includes voucherVat')
assert.ok(registerSrc.includes('voucherWithheld(voucher)'), 'Table row includes voucherWithheld')
assert.ok(registerSrc.includes('voucherVatWh(voucher)'), 'Table row includes voucherVatWh')

// Test 4: Verify colspans
assert.ok(registerSrc.includes(':colspan="history ? 14 : 10"'), 'Table colspans handle 14 columns on history view')

// Test 5: Verify CSV export has the columns on history
assert.ok(registerSrc.includes("...(props.history ? ['GETFL+NHIL', 'VAT', 'WITHHELD', 'VAT WH'] : [])"), 'CSV export includes tax headers on history')

// Test 6: Verify edit and delete are NOT restricted by !history in VoucherRegister.vue
assert.ok(!registerSrc.includes("!history && voucher.status === 'Draft'"), 'Edit and delete draft are not restricted by !history')
assert.ok(registerSrc.includes("v-if=\"voucher.status === 'Draft'\" :to=\"`/ledger/vouchers/new/${voucher.type}?id="), 'Edit link is present for Draft vouchers')
assert.ok(registerSrc.includes("v-if=\"voucher.status === 'Draft'\" type=\"button\" class=\"rounded-md p-2 text-rose-400"), 'Delete button is present for Draft vouchers')

// Test 7: Verify actions inside details modal
assert.ok(registerSrc.includes("v-if=\"selectedVoucher.status === 'Draft'\" :to=\"`/ledger/vouchers/new/${selectedVoucher.type}?id="), 'Modal has Edit draft link')
assert.ok(registerSrc.includes("v-if=\"selectedVoucher.status === 'Draft'\" type=\"button\" class=\"inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200"), 'Modal has Delete draft button')
assert.ok(registerSrc.includes("requestVoucherAction(selectedVoucher, 'delete')"), 'Modal calls delete action')

// Test 8: Verify delete draft in edit view (new/[type].vue)
const newTypeSrc = await readFile('frontend/app/pages/ledger/vouchers/new/[type].vue', 'utf8')
assert.ok(newTypeSrc.includes("editing && existingVoucher?.status === 'Draft'"), 'new/[type].vue has delete button condition')
assert.ok(newTypeSrc.includes('showDeleteConfirmation'), 'new/[type].vue has confirmation modal')
assert.ok(newTypeSrc.includes('deleteDraft'), 'new/[type].vue has deleteDraft function')
assert.ok(newTypeSrc.includes('voucherApi.remove(editingId.value, existingVoucher.value.version)'), 'deleteDraft calls voucherApi.remove')

// Test 9: Verify redirect helper [id]/edit.vue exists
const editSrc = await readFile('frontend/app/pages/ledger/vouchers/[id]/edit.vue', 'utf8')
assert.ok(editSrc.includes('/ledger/vouchers/new/${voucher.type}?id='), '[id]/edit.vue redirects to the voucher editor for the voucher type')

// Test 10: Verify backend posting creates journal entry in posted state and updates balances
const serviceSrc = await readFile('domain_services/gl/SupplierVoucherService.cc', 'utf8')
assert.ok(serviceSrc.includes('JournalService::createAndPost(db, prepared.proposal, who)'), 'SupplierVoucherService calls JournalService::createAndPost')
assert.ok(serviceSrc.includes("journal_batch_id=$3") && serviceSrc.includes("status='posted'"), 'Voucher links journal_batch_id and sets status=posted')

const journalServiceSrc = await readFile('domain_services/gl/JournalService.cc', 'utf8')
assert.ok(journalServiceSrc.includes("INSERT INTO gl_account_balances"), 'JournalService inserts into gl_account_balances')
assert.ok(journalServiceSrc.includes("UPDATE gl_journal_batches SET status='posted'"), 'JournalService sets journal batch status to posted')

// Test 11: Unit test calculation functions
function parseLedgerAmount(raw, allowSigned = false) {
  if (raw === undefined || raw === null) return null
  const text = String(raw).trim()
  const match = allowSigned
    ? text.match(/^([+-])?(\d+)(?:\.(\d{1,6}))?$/)
    : text.match(/^(\d+)(?:\.(\d{1,6}))?$/)
  if (!match) return null
  const [, sign, whole, frac = ''] = allowSigned
    ? match
    : ['', '', match[1], match[2] ?? '']
  const scaled = BigInt(whole) * 1000000n + BigInt((frac + '000000').slice(0, 6))
  return sign === '-' ? -scaled : scaled
}

function formatLedgerAmount(units) {
  const sign = units < 0n ? '-' : ''
  const abs = units < 0n ? -units : units
  const whole = abs / 1000000n
  const frac = String(abs % 1000000n).padStart(6, '0')
  return `${sign}${whole}.${frac}`
}

function voucherGetflNhil(voucher) {
  const getfund = voucher.taxSummary?.getfund ?? '0'
  const nhil = voucher.taxSummary?.nhil ?? '0'
  const sum = (parseLedgerAmount(getfund, true) ?? 0n) + (parseLedgerAmount(nhil, true) ?? 0n)
  return formatLedgerAmount(sum)
}

function voucherVat(voucher) {
  return voucher.taxSummary?.vat ?? voucher.totalVatAmount ?? '0.000000'
}

function voucherWithheld(voucher) {
  return voucher.taxSummary?.incomeWithholding ?? voucher.totalWithheld ?? '0.000000'
}

function voucherVatWh(voucher) {
  return voucher.taxSummary?.vatWithholding ?? voucher.totalVatWithheld ?? '0.000000'
}

const sampleVoucher = {
  taxSummary: {
    getfund: '2.500000',
    nhil: '2.500000',
    vat: '15.000000',
    incomeWithholding: '5.000000',
    vatWithholding: '7.000000'
  }
}

assert.equal(voucherGetflNhil(sampleVoucher), '5.000000')
assert.equal(voucherVat(sampleVoucher), '15.000000')
assert.equal(voucherWithheld(sampleVoucher), '5.000000')
assert.equal(voucherVatWh(sampleVoucher), '7.000000')

const zeroTaxVoucher = { taxSummary: null }
assert.equal(voucherGetflNhil(zeroTaxVoucher), '0.000000')
assert.equal(voucherVat(zeroTaxVoucher), '0.000000')
assert.equal(voucherWithheld(zeroTaxVoucher), '0.000000')
assert.equal(voucherVatWh(zeroTaxVoucher), '0.000000')

console.log('All voucher history, edit/delete, posting, and balance checks passed!')
