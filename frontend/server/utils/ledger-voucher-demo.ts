import type { LedgerVoucher, LedgerVoucherStatus, LedgerVoucherType } from '../../app/features/ledger/voucher-data'
import { demoAccounts } from './ledger-demo'

function accountLine(
  id: string,
  amount: string,
  referenceNumber: string,
  description: string,
  organizationUnitId = 'ou-operations',
  foreignAmount = '0.000000',
  isWithhold = false,
) {
  const account = demoAccounts.find((item) => item.id === id)!
  const unitNames: Record<string, string> = {
    'ou-accra': 'Head Office / Accra Operations',
    'ou-finance': 'Head Office / Finance & Administration',
    'ou-operations': 'Head Office / Operations',
    'ou-sales': 'Head Office / Sales & Marketing',
    'ou-kumasi': 'Kumasi Branch',
  }
  return {
    id: `seed-line-${id}-${referenceNumber}`,
    invoiceNumber: referenceNumber.startsWith('INV') ? referenceNumber : '',
    referenceNumber,
    accountId: account.id,
    accountNumber: account.accountNumber,
    accountName: account.name,
    description,
    organizationUnitId,
    organizationUnitName: unitNames[organizationUnitId] ?? '',
    localAmount: amount,
    foreignAmount,
    isWithhold,
  }
}

function retentionLine(id: string, description: string, value: string, amount: string) {
  const account = demoAccounts.find((item) => item.id === id)!
  return {
    id: `seed-retention-${id}-${description.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    accountId: account.id,
    accountNumber: account.accountNumber,
    accountName: account.name,
    description,
    value,
    isPercentage: true,
    amount,
  }
}

const seededAt = '2026-10-15T09:00:00.000Z'

export const demoVouchers: LedgerVoucher[] = [
  {
    id: 'voucher-supplier-posted-0042',
    voucherNumber: 'SPV-2026-0042',
    batchNumber: 'SPB-2026-0042',
    type: 'supplier-payment',
    payeeId: 'supplier-adom-trading',
    payeeName: 'Adom Trading Company',
    entryDate: '2026-10-08',
    paymentDate: '2026-10-09',
    bankAccountId: 'bank-account-demo-1',
    bankAccountName: 'GCB Bank PLC · BD-DEMO-001',
    bankGlAccountId: 'acc-1010',
    bankGlAccountName: '1010 — Bank — Main Operating',
    mode: 'Bank transfer',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    multiCurrency: false,
    chequeNumber: '',
    description: 'Office supplies and stationery',
    totalAmount: '7500.000000',
    foreignTotal: '0.000000',
    retentionsTotal: '375.000000',
    netAmount: '7125.000000',
    status: 'Posted',
    lines: [accountLine('acc-5000', '7500.000000', 'INV-AT-2198', 'Office stationery and printer supplies', 'ou-finance', '0.000000', true)],
    retentions: [retentionLine('acc-2200', 'Withholding tax', '5.000000', '375.000000')],
    preparer: 'K. Agyeman',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: 'voucher-supplier-draft-0043',
    voucherNumber: 'SPV-2026-0043',
    batchNumber: 'SPB-2026-0043',
    type: 'supplier-payment',
    payeeId: 'supplier-bluewave',
    payeeName: 'Bluewave Office Supplies',
    entryDate: '2026-10-14',
    paymentDate: '2026-10-15',
    bankAccountId: 'bank-account-demo-1',
    bankAccountName: 'GCB Bank PLC · BD-DEMO-001',
    bankGlAccountId: 'acc-1010',
    bankGlAccountName: '1010 — Bank — Main Operating',
    mode: 'Cheque',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    multiCurrency: false,
    chequeNumber: '00012038',
    description: 'Monthly office consumables',
    totalAmount: '2640.000000',
    foreignTotal: '0.000000',
    retentionsTotal: '0.000000',
    netAmount: '2640.000000',
    status: 'Draft',
    lines: [accountLine('acc-5000', '2640.000000', 'INV-BW-384', 'Office consumables', 'ou-finance')],
    retentions: [],
    preparer: 'K. Agyeman',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: 'voucher-employee-pending-0012',
    voucherNumber: 'EPV-2026-0012',
    batchNumber: 'EPB-2026-0012',
    type: 'employee-payment',
    payeeId: 'employee-akua-mensah',
    payeeName: 'Akua Mensah',
    entryDate: '2026-10-13',
    paymentDate: '2026-10-14',
    bankAccountId: 'bank-account-demo-1',
    bankAccountName: 'GCB Bank PLC · BD-DEMO-001',
    bankGlAccountId: 'acc-1010',
    bankGlAccountName: '1010 — Bank — Main Operating',
    mode: 'Mobile money',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    multiCurrency: false,
    chequeNumber: '',
    description: 'Field travel reimbursement',
    totalAmount: '1850.000000',
    foreignTotal: '0.000000',
    retentionsTotal: '0.000000',
    netAmount: '1850.000000',
    status: 'Pending approval',
    lines: [accountLine('acc-5000', '1850.000000', 'EXP-TR-101', 'Regional field visit transport and lodging', 'ou-operations')],
    retentions: [],
    preparer: 'E. Mensah',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: 'voucher-employee-approved-0011',
    voucherNumber: 'EPV-2026-0011',
    batchNumber: 'EPB-2026-0011',
    type: 'employee-payment',
    payeeId: 'employee-kwame-osei',
    payeeName: 'Kwame Osei',
    entryDate: '2026-10-07',
    paymentDate: '2026-10-08',
    bankAccountId: 'bank-account-demo-2',
    bankAccountName: 'Ecobank Ghana PLC · BD-DEMO-002',
    bankGlAccountId: 'acc-1020',
    bankGlAccountName: '1020 — Bank — USD Account',
    mode: 'Bank transfer',
    currencyCode: 'USD',
    exchangeRate: '12.5000000000',
    multiCurrency: true,
    chequeNumber: '',
    description: 'International travel advance',
    totalAmount: '6250.000000',
    foreignTotal: '500.000000',
    retentionsTotal: '0.000000',
    netAmount: '6250.000000',
    status: 'Approved',
    lines: [accountLine('acc-5000', '6250.000000', 'ADV-TR-44', 'Travel advance for regional conference', 'ou-operations', '500.000000')],
    retentions: [],
    preparer: 'E. Mensah',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: 'voucher-customer-posted-0038',
    voucherNumber: 'CRV-2026-0038',
    batchNumber: 'CRB-2026-0038',
    type: 'customer-receipt',
    payeeId: 'customer-akua-consulting',
    payeeName: 'Akua Consulting Co.',
    entryDate: '2026-10-12',
    receiptDate: '2026-10-12',
    bankAccountId: 'bank-account-demo-1',
    bankAccountName: 'GCB Bank PLC · BD-DEMO-001',
    bankGlAccountId: 'acc-1010',
    bankGlAccountName: '1010 — Bank — Main Operating',
    mode: 'Bank transfer',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    multiCurrency: false,
    chequeNumber: '',
    description: 'Consulting domain_services invoice settlement',
    totalAmount: '18750.000000',
    foreignTotal: '0.000000',
    retentionsTotal: '0.000000',
    netAmount: '18750.000000',
    status: 'Posted',
    lines: [accountLine('acc-1100', '18750.000000', 'INV-AC-483', 'Consulting domain_services — September', 'ou-sales')],
    retentions: [],
    preparer: 'M. Boateng',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: 'voucher-customer-draft-0039',
    voucherNumber: 'CRV-2026-0039',
    batchNumber: 'CRB-2026-0039',
    type: 'customer-receipt',
    payeeId: 'customer-northstar',
    payeeName: 'Northstar Services Ltd.',
    entryDate: '2026-10-15',
    receiptDate: '2026-10-15',
    bankAccountId: 'bank-account-demo-1',
    bankAccountName: 'GCB Bank PLC · BD-DEMO-001',
    bankGlAccountId: 'acc-1010',
    bankGlAccountName: '1010 — Bank — Main Operating',
    mode: 'Cash',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    multiCurrency: false,
    chequeNumber: '',
    description: 'Part-payment against service invoice',
    totalAmount: '4200.000000',
    foreignTotal: '0.000000',
    retentionsTotal: '0.000000',
    netAmount: '4200.000000',
    status: 'Draft',
    lines: [accountLine('acc-1100', '4200.000000', 'INV-NS-918', 'Part-payment against invoice', 'ou-sales')],
    retentions: [],
    preparer: 'M. Boateng',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
]

function cloneVoucher(voucher: LedgerVoucher): LedgerVoucher {
  return {
    ...voucher,
    lines: voucher.lines.map((line) => ({ ...line })),
    retentions: voucher.retentions.map((retention) => ({ ...retention })),
  }
}

export function filterDemoVouchers(query: Record<string, unknown>) {
  const search = String(query.search ?? '').trim().toLowerCase()
  const type = String(query.type ?? '').trim()
  const status = String(query.status ?? '').trim().toLowerCase()
  const startDate = String(query.startDate ?? '').trim()
  const endDate = String(query.endDate ?? '').trim()
  const items = demoVouchers
    .filter((voucher) => !type || voucher.type === type)
    .filter((voucher) => !status || voucher.status.toLowerCase().replace(/\s+/g, '_') === status.replace(/\s+/g, '_'))
    .filter((voucher) => !startDate || voucher.entryDate >= startDate)
    .filter((voucher) => !endDate || voucher.entryDate <= endDate)
    .filter((voucher) => !search || [
      voucher.voucherNumber,
      voucher.batchNumber,
      voucher.payeeName,
      voucher.description,
      voucher.bankAccountName,
      voucher.mode,
      voucher.status,
      voucher.currencyCode,
      ...voucher.lines.flatMap((line) => [line.invoiceNumber, line.referenceNumber, line.accountName, line.description]),
    ].some((value) => value.toLowerCase().includes(search)))
    .sort((left, right) => right.entryDate.localeCompare(left.entryDate) || right.createdAt.localeCompare(left.createdAt))
    .map(cloneVoucher)
  return { items, total: items.length }
}

export function getDemoVoucher(id: string): LedgerVoucher | undefined {
  const voucher = demoVouchers.find((item) => item.id === id)
  return voucher ? cloneVoucher(voucher) : undefined
}

export function saveDemoVoucher(voucher: LedgerVoucher): LedgerVoucher {
  const index = demoVouchers.findIndex((item) => item.id === voucher.id)
  if (index >= 0) demoVouchers[index] = cloneVoucher(voucher)
  else demoVouchers.unshift(cloneVoucher(voucher))
  return cloneVoucher(voucher)
}

export function nextDemoVoucherNumbers(type: LedgerVoucherType, year: string) {
  const prefix = type === 'supplier-payment' ? 'SPV' : type === 'employee-payment' ? 'EPV' : 'CRV'
  const batchPrefix = type === 'supplier-payment' ? 'SPB' : type === 'employee-payment' ? 'EPB' : 'CRB'
  const sequence = Math.max(0, ...demoVouchers
    .filter((voucher) => voucher.type === type && voucher.voucherNumber.startsWith(`${prefix}-${year}-`))
    .map((voucher) => Number(voucher.voucherNumber.split('-').at(-1)) || 0)) + 1
  const suffix = String(sequence).padStart(4, '0')
  return { voucherNumber: `${prefix}-${year}-${suffix}`, batchNumber: `${batchPrefix}-${year}-${suffix}` }
}

export function removeDemoVoucher(id: string): boolean {
  const index = demoVouchers.findIndex((item) => item.id === id)
  if (index < 0 || demoVouchers[index]?.status !== 'Draft') return false
  demoVouchers.splice(index, 1)
  return true
}

export type VoucherTransition = 'submit' | 'approve' | 'post'

export function transitionDemoVoucher(id: string, action: VoucherTransition, updatedAt: string): LedgerVoucher | undefined {
  const voucher = demoVouchers.find((item) => item.id === id)
  if (!voucher) return undefined
  const allowed: Record<VoucherTransition, { from: LedgerVoucherStatus; to: LedgerVoucherStatus }> = {
    submit: { from: 'Draft', to: 'Pending approval' },
    approve: { from: 'Pending approval', to: 'Approved' },
    post: { from: 'Approved', to: 'Posted' },
  }
  const transition = allowed[action]
  if (voucher.status !== transition.from) return undefined
  voucher.status = transition.to
  voucher.updatedAt = updatedAt
  return cloneVoucher(voucher)
}
