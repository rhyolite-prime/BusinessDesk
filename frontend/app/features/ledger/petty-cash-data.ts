export type LedgerPettyCashStatus = 'draft' | 'posted'
export type LedgerPettyCashJournalMode = 'consolidated' | 'non-consolidated'

export interface LedgerPettyCashLine {
  id: string
  transactionDate: string
  referenceNumber: string
  expenseAccountId: string
  description: string
  amount: string
  organizationUnitId: string
  recipientName: string
}

export interface LedgerPettyCashBatch {
  id: string
  batchDate: string
  batchNumber: string
  sourceDocumentNumber: string
  pettyCashAccountId: string
  batchOriginator: string
  currencyCode: string
  exchangeRate: string
  journalMode: LedgerPettyCashJournalMode
  status: LedgerPettyCashStatus
  createdAt: string
  lines: LedgerPettyCashLine[]
}

export type SaveLedgerPettyCashInput = Omit<LedgerPettyCashBatch, 'id' | 'status' | 'createdAt'> & {
  id?: string
}

const pettyCashSeed: LedgerPettyCashBatch[] = [
  {
    id: 'petty-cash-2026-0108',
    batchDate: '2026-05-11',
    batchNumber: '1560',
    sourceDocumentNumber: '',
    pettyCashAccountId: 'acc-12307',
    batchOriginator: 'Leticia',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    journalMode: 'non-consolidated',
    status: 'draft',
    createdAt: '2026-05-11T10:42:00.000Z',
    lines: [
      {
        id: 'petty-cash-2026-0108-line-1',
        transactionDate: '2026-05-11',
        referenceNumber: '00002',
        expenseAccountId: 'acc-50016',
        description: 'Cost of t&t for official errands',
        amount: '130.00',
        organizationUnitId: 'ou-cbs',
        recipientName: '',
      },
      {
        id: 'petty-cash-2026-0108-line-2',
        transactionDate: '2026-05-11',
        referenceNumber: '00003',
        expenseAccountId: 'acc-50018',
        description: 'Cost of lunch, drinks & water bought',
        amount: '942.00',
        organizationUnitId: 'ou-cbs',
        recipientName: '',
      },
      {
        id: 'petty-cash-2026-0108-line-3',
        transactionDate: '2026-05-11',
        referenceNumber: '00005',
        expenseAccountId: 'acc-50023',
        description: 'Cost of mouse trap bought',
        amount: '60.00',
        organizationUnitId: 'ou-cbs',
        recipientName: '',
      },
      {
        id: 'petty-cash-2026-0108-line-4',
        transactionDate: '2026-05-11',
        referenceNumber: '00003',
        expenseAccountId: 'acc-50029',
        description: 'Cost delivery services',
        amount: '300.00',
        organizationUnitId: 'ou-cbs',
        recipientName: '',
      },
      {
        id: 'petty-cash-2026-0108-line-5',
        transactionDate: '2026-05-11',
        referenceNumber: '00004',
        expenseAccountId: 'acc-50050',
        description: 'Cost of airtime data bought for HRM to register students',
        amount: '50.00',
        organizationUnitId: 'ou-cbs',
        recipientName: '',
      },
    ],
  },
  {
    id: 'petty-cash-2026-0107',
    batchDate: '2026-10-10',
    batchNumber: 'PC-2026-0107',
    sourceDocumentNumber: 'PC-INV-0107',
    pettyCashAccountId: 'acc-1000',
    batchOriginator: 'Kwame Osei',
    currencyCode: 'GHS',
    exchangeRate: '1.0000000000',
    journalMode: 'consolidated',
    status: 'posted',
    createdAt: '2026-10-10T15:06:00.000Z',
    lines: [
      {
        id: 'petty-cash-2026-0107-line-1',
        transactionDate: '2026-10-10',
        referenceNumber: 'RCPT-2198',
        expenseAccountId: 'acc-5000',
        description: 'Printer toner',
        amount: '680.00',
        organizationUnitId: 'ou-finance',
        recipientName: 'Ama Owusu',
      },
      {
        id: 'petty-cash-2026-0107-line-2',
        transactionDate: '2026-10-10',
        referenceNumber: 'RCPT-2202',
        expenseAccountId: 'acc-5000',
        description: 'Courier and dispatch',
        amount: '95.00',
        organizationUnitId: 'ou-finance',
        recipientName: 'Kojo Appiah',
      },
    ],
  },
]

function makeId() {
  return `petty-cash-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useLedgerPettyCash() {
  const batches = useState<LedgerPettyCashBatch[]>('ledger-petty-cash-batches', () =>
    pettyCashSeed.map((batch) => ({ ...batch, lines: batch.lines.map((line) => ({ ...line })) })),
  )

  function nextBatchNumber(batchDate: string) {
    const year = batchDate.slice(0, 4) || String(new Date().getFullYear())
    const pattern = new RegExp(`^PC-${year}-(\\d+)$`)
    const highestSequence = batches.value.reduce((highest, batch) => {
      const match = batch.batchNumber.match(pattern)
      return match ? Math.max(highest, Number(match[1])) : highest
    }, 0)
    return `PC-${year}-${String(highestSequence + 1).padStart(4, '0')}`
  }

  function saveBatch(input: SaveLedgerPettyCashInput) {
    const existing = input.id ? batches.value.find((batch) => batch.id === input.id) : undefined
    if (existing?.status === 'posted') return null

    const saved: LedgerPettyCashBatch = {
      ...input,
      id: existing?.id || input.id || makeId(),
      status: 'draft',
      createdAt: existing?.createdAt || new Date().toISOString(),
      lines: input.lines.map((line) => ({ ...line })),
    }
    const index = existing ? batches.value.findIndex((batch) => batch.id === existing.id) : -1
    if (index >= 0) batches.value[index] = saved
    else batches.value.unshift(saved)
    return saved
  }

  function postBatch(id: string) {
    const batch = batches.value.find((item) => item.id === id)
    if (!batch || batch.status !== 'draft') return false
    batch.status = 'posted'
    return true
  }

  return { batches, nextBatchNumber, saveBatch, postBatch }
}
