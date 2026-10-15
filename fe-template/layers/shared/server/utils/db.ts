/**
 * Mock core-banking database (in-memory, deterministically seeded).
 *
 * Models the Fineract / Mifos domain: offices, staff, clients, groups,
 * loan & savings products, loan accounts with amortised schedules and
 * transactions, savings accounts with ledgers, a full chart of accounts
 * with double-entry journal postings, users/roles, maker-checker tasks
 * and an audit trail.
 *
 * State transitions (approve / disburse / repay / deposit ...) live here
 * so the same logic is reused by both direct API endpoints and the
 * maker-checker approval flow.
 */
import type {
  Office, Staff, Client, Group, LoanProduct, SavingsProduct, Charge,
  Loan, LoanTxn, ScheduleEntry, SavingsAccount, SavingsTxn,
  GLAccount, JournalEntry, Closure, UserAccount, Role, CheckerTask,
  AuditEntry, PaymentType, LoanStatus,
} from '@shared/types/models'
import type { DB, Holiday } from './types'

// ── deterministic RNG ───────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260903)
const r = (min: number, max: number) => min + rnd() * (max - min)
const ri = (min: number, max: number) => Math.floor(r(min, max + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const round2 = (n: number) => Math.round(n * 100) / 100

// ── date helpers (server "today" = environment date) ─────────────────────
const DAY = 86400000
export const todayISO = () => new Date().toISOString().slice(0, 10)
const dISO = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => dISO(new Date(Date.now() - n * DAY))
const daysAhead = (n: number) => dISO(new Date(Date.now() + n * DAY))
function addPeriod(dateISO: string, n: number, unit: 'weeks' | 'months'): string {
  const d = new Date(dateISO + 'T12:00:00Z')
  if (unit === 'weeks') d.setUTCDate(d.getUTCDate() + n * 7)
  else d.setUTCMonth(d.getUTCMonth() + n)
  return dISO(d)
}

// ── name pools (Ghana) ───────────────────────────────────────────────────
const MALE = ['Kofi', 'Kwame', 'Kojo', 'Kwesi', 'Yaw', 'Fiifi', 'Ekow', 'Kobina', 'Akwasi', 'Kwabena', 'Mensah', 'Selorm', 'Edem', 'Elorm', 'Tweneboah', 'Nana', 'Osei', 'Kojo', 'Ato', 'Kweku']
const FEMALE = ['Ama', 'Abena', 'Yaa', 'Adjoa', 'Esi', 'Akua', 'Afia', 'Efua', 'Akorfa', 'Dzifa', 'Afi', 'Serwaa', 'Akosua', 'Adwoa', 'Abina', 'Ekua', 'Ama', 'Dede', 'Ayeley', 'Lami']
const SURNAMES = ['Mensah', 'Owusu', 'Asante', 'Boateng', 'Osei', 'Acheampong', 'Appiah', 'Nyamekye', 'Adjei', 'Darko', 'Agyeman', 'Frimpong', 'Aidoo', 'Quaye', 'Tetteh', 'Annan', 'Sarpong', 'Agyei', 'Bonsu', 'Ankrah', 'Amponsah', 'Donkor', 'Gyasi', 'Kwarteng', 'Nti', 'Amoah', 'Yeboah', 'Opoku', 'Awuah', 'Baidoo']
const TOWNS = ['Osu', 'Makola', 'Madina', 'Tema Newtown', 'Nima', 'Kaneshie', 'Dansoman', 'Adum', 'Asawase', 'Tafo', 'Sekondi', 'Tarkwa', 'Saketumo', 'Lamashegu', 'Vitting', 'Pedu', 'Abakam', 'Koforidua Zongo', 'Ho Dome', 'Cape Coast North']
const CITIES = ['Accra', 'Kumasi', 'Takoradi', 'Tamale', 'Tema', 'Cape Coast']
const BUSINESSES = ['Ama Serwaa Provisions', 'Kwame Nyame Cold Store', 'Adjoa Beauty Spot', 'Osei & Sons Trading', 'Mama Akua Kenkey Base', 'Kumasi Spare Parts Depot', 'Esi Fashion House', 'Boateng Hardware', 'Suhum Mobile Money Point', 'Makola Textiles', 'Fiifi Phone Shop', 'Sister Efua Catering', 'Anloga Agro Inputs', 'Tema Auto Repairs', 'Yaa Beddings & More', 'Nana K. Woodworks', 'Tamale Shea Cooperative', 'Dansoman Bakery', 'Teshie Fish Mongers', 'Aboaso Poultry Farm']
const PURPOSES = ['Working capital / trading stock', 'Market wares expansion', 'Agriculture inputs (fertiliser, seeds)', 'Equipment purchase', 'School fees', 'Rent advance', 'Vehicle repairs & maintenance', 'Processing machine', 'Inventory top-up for festive season', 'Livestock restocking']
const COLLATERAL = ['Two guarantors (group cross-guarantee)', 'Radio / television set', 'Sewing machine', 'Refrigerator', 'Motorcycle (Nimdeɛ)', 'Generator set', 'Kiosk structure', 'Stock of goods (floating lien)', 'Salary domiciliation', 'None — character-based lending']
const MEETING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const GROUP_NAMES = ['Ahobraseye Savings Group', 'Nnɔnoɔma Women’s Collective', 'Boahemaa Traders Union', 'Akwaaba Susu Circle', 'Sika Mprospect Group', 'Ɛnne Yɛ Group', 'Adom Nwapa Collective', 'Nkosuo Market Group', 'Ayenkwa Youth Savers', 'Dwumadie Business Circle', 'Obaatanpa Women’s Group', 'Tumi Kura Cooperative', 'Aseda Susu Group', 'Ntoaso Farmers Circle', 'Ɛhira Yɛ Group', 'Mmaa Nkomo Collective', 'Ahwenepa Trading Group', 'Kukrudu Development Union']
const POSITIONS = ['Branch Manager', 'Loan Officer', 'Senior Loan Officer', 'Teller / Cashier', 'Customer Service Officer', 'Accountant', 'Internal Auditor', 'Relationship Officer']

// ── reference data ──────────────────────────────────────────────────────
const OFFICES_SEED: Omit<Office, 'id'>[] = [
  { name: 'Head Office — Accra', parentId: null, openingDate: '2018-01-15', externalId: 'OFF-HQ-001', status: 'active' },
  { name: 'Kumasi Branch', parentId: 1, openingDate: '2019-03-01', externalId: 'OFF-KMS-002', status: 'active' },
  { name: 'Takoradi Branch', parentId: 1, openingDate: '2020-06-12', externalId: 'OFF-TKD-003', status: 'active' },
  { name: 'Tamale Branch', parentId: 1, openingDate: '2021-02-20', externalId: 'OFF-TML-004', status: 'active' },
  { name: 'Tema Community 1 Branch', parentId: 1, openingDate: '2022-09-05', externalId: 'OFF-TMA-005', status: 'active' },
  { name: 'Cape Coast Branch', parentId: 1, openingDate: '2023-05-18', externalId: 'OFF-CC-006', status: 'active' },
]

const LOAN_PRODUCTS: Omit<LoanProduct, 'id'>[] = [
  { name: 'Market Trader Loan', shortName: 'MTL', description: 'Short-term working capital for market traders. Repaid weekly from sales.', principalMin: 200, principalMax: 5000, interestRateMin: 5, interestRateMax: 8, termMin: 8, termMax: 24, termFrequency: 'weeks', repayEvery: 1, repayFrequency: 'weeks', graceOnPrincipal: 0, active: true },
  { name: 'Susu Booster Loan', shortName: 'SBL', description: 'Top-up for consistent susu savers; limit grows with savings history.', principalMin: 300, principalMax: 8000, interestRateMin: 4, interestRateMax: 7, termMin: 16, termMax: 48, termFrequency: 'weeks', repayEvery: 2, repayFrequency: 'weeks', graceOnPrincipal: 1, active: true },
  { name: 'Micro Business Loan', shortName: 'MBL', description: 'Term loan for established micro and small businesses.', principalMin: 2000, principalMax: 50000, interestRateMin: 18, interestRateMax: 30, termMin: 4, termMax: 18, termFrequency: 'months', repayEvery: 1, repayFrequency: 'months', graceOnPrincipal: 1, active: true },
  { name: 'Salary Advance', shortName: 'SAL', description: 'Deducted-at-source advance for salaried workers.', principalMin: 1000, principalMax: 30000, interestRateMin: 12, interestRateMax: 20, termMin: 3, termMax: 12, termFrequency: 'months', repayEvery: 1, repayFrequency: 'months', graceOnPrincipal: 0, active: true },
  { name: 'Agri Value-Chain Loan', shortName: 'AGV', description: 'Seasonal finance for crop and livestock farmers; bullet-friendly grace period.', principalMin: 1500, principalMax: 40000, interestRateMin: 15, interestRateMax: 24, termMin: 6, termMax: 18, termFrequency: 'months', repayEvery: 1, repayFrequency: 'months', graceOnPrincipal: 3, active: true },
  { name: 'Group Enterprise Loan', shortName: 'GEL', description: 'Joint-liability lending through recognised solidarity groups.', principalMin: 500, principalMax: 15000, interestRateMin: 5, interestRateMax: 9, termMin: 20, termMax: 52, termFrequency: 'weeks', repayEvery: 1, repayFrequency: 'weeks', graceOnPrincipal: 0, active: true },
]

const SAVINGS_PRODUCTS: Omit<SavingsProduct, 'id'>[] = [
  { name: 'Susu Savings', shortName: 'SUSU', description: 'No-frills daily/weekly savings for individuals and groups.', type: 'savings', interestRate: 3, minOpeningBalance: 20, withdrawalFee: 0, lockinDays: 0, active: true },
  { name: 'Current Account', shortName: 'CUR', description: 'Transactional account for businesses; cheque book available.', type: 'current', interestRate: 0, minOpeningBalance: 100, withdrawalFee: 2, lockinDays: 0, active: true },
  { name: 'Fixed Deposit', shortName: 'FD', description: 'Lump-sum investment at premium rates, 90–365 day tenors.', type: 'fixed', interestRate: 12, minOpeningBalance: 500, withdrawalFee: 0, lockinDays: 90, active: true },
  { name: 'Recurring Deposit', shortName: 'RD', description: 'Disciplined monthly savings toward a target amount.', type: 'recurring', interestRate: 7, minOpeningBalance: 50, withdrawalFee: 5, lockinDays: 30, active: true },
  { name: 'Youth Savers', shortName: 'YTH', description: 'Custodial account for under-18s; free deposits.', type: 'savings', interestRate: 4, minOpeningBalance: 10, withdrawalFee: 0, lockinDays: 0, active: true },
]

const CHARGES: Omit<Charge, 'id'>[] = [
  { name: 'Loan processing fee', chargeType: 'fee', appliesTo: 'loan', amountMode: 'percent', amount: 2, due: 'disbursement', active: true },
  { name: 'Late repayment penalty', chargeType: 'penalty', appliesTo: 'loan', amountMode: 'percent', amount: 1.5, due: 'installment', active: true },
  { name: 'Loan application fee', chargeType: 'fee', appliesTo: 'loan', amountMode: 'flat', amount: 25, due: 'specified', active: true },
  { name: 'Savings withdrawal charge', chargeType: 'fee', appliesTo: 'savings', amountMode: 'flat', amount: 2, due: 'withdrawal', active: true },
  { name: 'Monthly ledger fee', chargeType: 'fee', appliesTo: 'savings', amountMode: 'flat', amount: 5, due: 'monthly', active: true },
  { name: 'Account opening fee', chargeType: 'fee', appliesTo: 'savings', amountMode: 'flat', amount: 10, due: 'specified', active: true },
  { name: 'Dormant account reactivation', chargeType: 'fee', appliesTo: 'savings', amountMode: 'flat', amount: 15, due: 'specified', active: true },
  { name: 'Card / cheque book request', chargeType: 'fee', appliesTo: 'client', amountMode: 'flat', amount: 30, due: 'specified', active: true },
]

const PAYMENT_TYPES: Omit<PaymentType, 'id'>[] = [
  { name: 'Cash', isCash: true },
  { name: 'Mobile Money — MTN', isCash: false },
  { name: 'Mobile Money — Telecel', isCash: false },
  { name: 'Bank Transfer', isCash: false },
  { name: 'Cheque', isCash: false },
]

// Chart of accounts (tag → account name). Tags are used by the posting engine.
const GL_SEED: { code: string; name: string; type: GLAccount['type']; tag?: string; usage: GLAccount['usage']; parent?: string; manual: boolean; desc: string }[] = [
  { code: '1000', name: 'Assets', type: 'ASSET', usage: 'header', manual: false, desc: '' },
  { code: '1100', name: 'Cash & Bank Balances', type: 'ASSET', tag: 'CASH', usage: 'detail', parent: '1000', manual: false, desc: 'Physical cash and nostro balances' },
  { code: '1200', name: 'Loan Portfolio', type: 'ASSET', tag: 'LOAN_PORTFOLIO', usage: 'detail', parent: '1000', manual: false, desc: 'Gross outstanding performing portfolio' },
  { code: '1300', name: 'Interest Receivable', type: 'ASSET', tag: 'INTEREST_RECEIVABLE', usage: 'detail', parent: '1000', manual: false, desc: 'Accrued interest not yet due' },
  { code: '1400', name: 'Fees Receivable', type: 'ASSET', tag: 'FEES_RECEIVABLE', usage: 'detail', parent: '1000', manual: false, desc: 'Accrued fees and penalties' },
  { code: '1500', name: 'Office Equipment', type: 'ASSET', tag: 'EQUIPMENT', usage: 'detail', parent: '1000', manual: true, desc: 'Furniture, computers and equipment' },
  { code: '2000', name: 'Liabilities', type: 'LIABILITY', usage: 'header', manual: false, desc: '' },
  { code: '2100', name: 'Savings Deposits (Control)', type: 'LIABILITY', tag: 'SAVINGS_CONTROL', usage: 'detail', parent: '2000', manual: false, desc: 'Customer deposit liability' },
  { code: '2200', name: 'Interest Payable on Deposits', type: 'LIABILITY', tag: 'INTEREST_PAYABLE', usage: 'detail', parent: '2000', manual: false, desc: 'Accrued deposit interest' },
  { code: '2300', name: 'Borrowed Funds', type: 'LIABILITY', tag: 'BORROWED_FUNDS', usage: 'detail', parent: '2000', manual: true, desc: 'Wholesale / refinance lines' },
  { code: '2900', name: 'Other Liabilities', type: 'LIABILITY', tag: 'OTHER_LIABILITY', usage: 'detail', parent: '2000', manual: true, desc: 'Sundry payables' },
  { code: '3000', name: 'Equity', type: 'EQUITY', usage: 'header', manual: false, desc: '' },
  { code: '3100', name: 'Share Capital', type: 'EQUITY', tag: 'EQUITY_CAPITAL', usage: 'detail', parent: '3000', manual: true, desc: 'Paid-up capital' },
  { code: '3200', name: 'Retained Earnings', type: 'EQUITY', tag: 'RETAINED_EARNINGS', usage: 'detail', parent: '3000', manual: false, desc: 'Accumulated surplus' },
  { code: '4000', name: 'Income', type: 'INCOME', usage: 'header', manual: false, desc: '' },
  { code: '4100', name: 'Interest Income on Loans', type: 'INCOME', tag: 'INTEREST_INCOME', usage: 'detail', parent: '4000', manual: false, desc: 'Interest earned on portfolio' },
  { code: '4200', name: 'Fee & Penalty Income', type: 'INCOME', tag: 'FEE_INCOME', usage: 'detail', parent: '4000', manual: false, desc: 'Processing fees, penalties, ledger fees' },
  { code: '4300', name: 'Other Operating Income', type: 'INCOME', tag: 'OTHER_INCOME', usage: 'detail', parent: '4000', manual: true, desc: 'Miscellaneous income' },
  { code: '5000', name: 'Expenses', type: 'EXPENSE', usage: 'header', manual: false, desc: '' },
  { code: '5100', name: 'Staff Salaries & Benefits', type: 'EXPENSE', tag: 'STAFF_COSTS', usage: 'detail', parent: '5000', manual: true, desc: 'Payroll and allowances' },
  { code: '5200', name: 'Rent & Utilities', type: 'EXPENSE', tag: 'RENT_UTILITIES', usage: 'detail', parent: '5000', manual: true, desc: 'Office rent, electricity, water' },
  { code: '5300', name: 'Loan Loss Provision', type: 'EXPENSE', tag: 'LOAN_LOSS_EXPENSE', usage: 'detail', parent: '5000', manual: false, desc: 'Provisioning on impaired portfolio' },
  { code: '5400', name: 'Loans Written Off', type: 'EXPENSE', tag: 'WRITTEN_OFF', usage: 'detail', parent: '5000', manual: false, desc: 'Charged-off principal' },
  { code: '5500', name: 'Deposit Interest Expense', type: 'EXPENSE', tag: 'DEPOSIT_INTEREST', usage: 'detail', parent: '5000', manual: false, desc: 'Interest paid to depositors' },
  { code: '5600', name: 'General Administration', type: 'EXPENSE', tag: 'ADMIN', usage: 'detail', parent: '5000', manual: true, desc: 'Stationery, transport, communications' },
]

// ── builders ─────────────────────────────────────────────────────────────
let txnSeq = 1
function nextTxnId() { return txnSeq++ }

function buildSchedule(principal: number, annualRatePct: number, periods: number, freq: 'weeks' | 'months', startDate: string, grace: number): ScheduleEntry[] {
  const per = freq === 'months' ? annualRatePct / 100 / 12 : annualRatePct / 100 / 52
  const inst = per === 0 ? principal / periods : (principal * per) / (1 - Math.pow(1 + per, -periods))
  const entries: ScheduleEntry[] = []
  let balance = principal
  for (let i = 1; i <= periods; i++) {
    const interestDue = round2(balance * per)
    let principalDue: number
    if (i === periods) principalDue = round2(balance)
    else principalDue = round2(Math.max(0, (grace > 0 && i <= grace) ? 0 : inst - interestDue))
    if (principalDue > balance) principalDue = round2(balance)
    balance = round2(balance - principalDue)
    const feesDue = i === 1 ? round2(principal * 0.02) : 0 // processing fee in period 1
    entries.push({
      period: i,
      dueDate: addPeriod(startDate, i, freq === 'months' ? 'months' : 'weeks'),
      principalDue, interestDue, feesDue,
      totalDue: round2(principalDue + interestDue + feesDue),
      principalPaid: 0, interestPaid: 0, feesPaid: 0, paidDate: null,
    })
  }
  return entries
}

function applyPayment(loan: Loan, amount: number, dateISO: string, paymentType: string, note = '') {
  const before = {
    f: round2(loan.schedule.reduce((s, e) => s + e.feesPaid, 0)),
    i: round2(loan.schedule.reduce((s, e) => s + e.interestPaid, 0)),
    p: round2(loan.schedule.reduce((s, e) => s + e.principalPaid, 0)),
  }
  let remaining = round2(amount)
  // Allocate fees → interest → principal across the schedule; future
  // installments may also be settled (advance payment / early settlement).
  for (const e of loan.schedule) {
    if (remaining <= 0.001) break
    const payFees = Math.min(remaining, Math.max(0, e.feesDue - e.feesPaid)); remaining = round2(remaining - payFees)
    const payInt = Math.min(remaining, Math.max(0, e.interestDue - e.interestPaid)); remaining = round2(remaining - payInt)
    const payPrin = Math.min(remaining, Math.max(0, e.principalDue - e.principalPaid)); remaining = round2(remaining - payPrin)
    e.feesPaid = round2(e.feesPaid + payFees)
    e.interestPaid = round2(e.interestPaid + payInt)
    e.principalPaid = round2(e.principalPaid + payPrin)
    const settled = e.principalPaid >= e.principalDue - 0.01 && e.interestPaid >= e.interestDue - 0.01 && e.feesPaid >= e.feesDue - 0.01
    if (settled && !e.paidDate) e.paidDate = dateISO
  }
  // split the transaction across fees / interest / principal actually settled
  const afterF = round2(loan.schedule.reduce((s, e) => s + e.feesPaid, 0))
  const afterI = round2(loan.schedule.reduce((s, e) => s + e.interestPaid, 0))
  const afterP = round2(loan.schedule.reduce((s, e) => s + e.principalPaid, 0))
  const dFee = round2(afterF - before.f)
  const dInt = round2(afterI - before.i)
  const dPrin = round2(afterP - before.p)
  const accepted = round2(amount - remaining)
  loan.transactions.push({
    id: nextTxnId(), date: dateISO, type: 'repayment',
    amount: accepted, fees: dFee, interest: dInt, principal: dPrin,
    paymentType, note: remaining > 0.01 ? `${note} (overpayment ${remaining.toFixed(2)} not accepted)` : note,
  })
  recomputeLoan(loan)
  return { accepted, change: remaining }
}

function recomputeLoan(loan: Loan) {
  const t = todayISO()
  const paidP = round2(loan.schedule.reduce((s, e) => s + e.principalPaid, 0))
  const paidI = round2(loan.schedule.reduce((s, e) => s + e.interestPaid, 0))
  const paidF = round2(loan.schedule.reduce((s, e) => s + e.feesPaid, 0))
  loan.paidPrincipal = paidP
  loan.paidInterest = paidI
  loan.paidFees = paidF
  // Outstanding = full remaining obligation of the account: every unpaid
  // principal, interest and fee of the amortised schedule. It is the exact
  // payoff amount and reaches zero when the loan closes.
  const dueP = loan.schedule.reduce((s, e) => s + e.principalDue, 0)
  const dueI = loan.schedule.reduce((s, e) => s + e.interestDue, 0)
  const dueF = loan.schedule.reduce((s, e) => s + e.feesDue, 0)
  loan.outstanding = round2(Math.max(0, dueP + dueI + dueF - paidP - paidI - paidF))
  loan.overdueAmount = round2(loan.schedule.reduce((s, e) => {
    if (e.dueDate < t) return s + Math.max(0, e.totalDue - e.principalPaid - e.interestPaid - e.feesPaid)
    return s
  }, 0))
  if (loan.status === 'active' && loan.outstanding <= 0.01) {
    loan.status = 'closed'
    loan.closedDate = t
    loan.overdueAmount = 0
  }
}

function buildDB(): DB {
  const db: DB = {
    seededAt: new Date().toISOString(),
    offices: [], staff: [], clients: [], groups: [],
    loanProducts: [], savingsProducts: [], charges: [],
    loans: [], savings: [], glAccounts: [], journals: [], closures: [],
    users: [], roles: [], tasks: [], audit: [], paymentTypes: [], holidays: [],
    counters: {}, currentUser: { id: 1, username: 'a.mensah', name: 'Adjoa Mensah', role: 'Super User', officeId: 1 },
  }
  const seq = (k: string) => { db.counters[k] = (db.counters[k] ?? 0) + 1; return db.counters[k] }

  // ── offices ──
  db.offices = OFFICES_SEED.map((o, i) => ({ ...o, id: i + 1 }))

  // ── staff ──
  const staffFirst = [...MALE.slice(0, 10), ...FEMALE.slice(0, 10)]
  for (let i = 0; i < 26; i++) {
    const gender = i % 2 === 0 ? 'male' : 'female'
    const first = gender === 'male' ? MALE[i % MALE.length] : FEMALE[i % FEMALE.length]
    const last = SURNAMES[(i * 7) % SURNAMES.length]
    db.staff.push({
      id: i + 1, firstname: first, lastname: last, displayName: `${first} ${last}`,
      officeId: (i % 6) + 1,
      isLoanOfficer: i % 3 !== 0 || POSITIONS[(i % POSITIONS.length)] === 'Senior Loan Officer',
      position: POSITIONS[i % POSITIONS.length],
      mobile: '+233 2' + ri(0, 9) + ' ' + ri(100, 999) + ' ' + ri(100, 999),
      status: rnd() < 0.92 ? 'active' : 'inactive',
    })
  }
  db.staff[0].position = 'Managing Director'
  db.staff[1].position = 'Head of Credit'
  void staffFirst

  // ── users & roles ──
  const rolePerms = (mod: string, actions: string[]) => actions.flatMap(a => [`${mod}.read`, `${mod}.${a}`])
  db.roles = [
    { id: 1, name: 'Super User', description: 'Unrestricted access to all modules and maker-checker bypass.', permissions: ['*'] },
    { id: 2, name: 'Branch Manager', description: 'Branch-level oversight and approvals.', permissions: ['clients.read', 'clients.write', 'loans.read', 'loans.approve', 'loans.disburse', 'savings.read', 'savings.approve', 'savings.write', 'accounting.read', 'reports.read', 'tasks.read', 'tasks.check', 'organization.read'] },
    { id: 3, name: 'Loan Officer', description: 'Client onboarding and loan origination.', permissions: ['clients.read', 'clients.write', 'groups.read', 'groups.write', 'loans.read', 'loans.write', 'savings.read', 'savings.write'] },
    { id: 4, name: 'Teller', description: 'Cash transactions over the counter.', permissions: ['clients.read', 'savings.read', 'savings.deposit', 'savings.withdraw', 'loans.read', 'loans.repay'] },
    { id: 5, name: 'Accountant', description: 'GL, journal entries and period closure.', permissions: [...rolePerms('accounting', ['write', 'close']), 'reports.read', 'clients.read'] },
    { id: 6, name: 'Internal Auditor', description: 'Read-only audit and inspection rights.', permissions: ['audit.read', 'reports.read', 'clients.read', 'loans.read', 'savings.read', 'accounting.read', 'tasks.read'] },
  ]
  const userSeed: [string, string, string, number[]][] = [
    ['a.mensah', 'Adjoa', 'Mensah', [1]],
    ['k.owusu', 'Kwame', 'Owusu', [2]],
    ['e.sarpong', 'Esi', 'Sarpong', [3]],
    ['f.ankrah', 'Fiifi', 'Ankrah', [3]],
    ['a.appiah', 'Ama', 'Appiah', [4]],
    ['y.darko', 'Yaw', 'Darko', [5]],
    ['s.aidoo', 'Serwaa', 'Aidoo', [6]],
    ['t.quaye', 'Tweneboah', 'Quaye', [2, 3]],
  ]
  db.users = userSeed.map(([username, fn, ln], i) => ({
    id: i + 1, username, firstname: fn, lastname: ln,
    email: `${username}@sikatrust.example`, officeId: (i % 6) + 1,
    roleNames: userSeed[i][3].map(rid => db.roles[rid - 1].name),
    status: i === 7 ? 'disabled' : 'active',
    lastLogin: daysAgo(ri(0, 40)),
  }))

  // ── products / charges / payment types ──
  db.loanProducts = LOAN_PRODUCTS.map((p, i) => ({ ...p, id: i + 1 }))
  db.savingsProducts = SAVINGS_PRODUCTS.map((p, i) => ({ ...p, id: i + 1 }))
  db.charges = CHARGES.map((c, i) => ({ ...c, id: i + 1 }))
  db.paymentTypes = PAYMENT_TYPES.map((p, i) => ({ ...p, id: i + 1 }))

  // ── chart of accounts ──
  const codeToId = new Map<string, number>()
  db.glAccounts = GL_SEED.map((g, i) => {
    const id = i + 1
    codeToId.set(g.code, id)
    return {
      id, glCode: g.code, name: g.name, type: g.type, tag: g.tag ?? '',
      parentId: g.parent ? codeToId.get(g.parent) ?? null : null,
      usage: g.usage, manualEntriesAllowed: g.manual, description: g.desc,
    }
  })
  const glByTag = (tag: string) => db.glAccounts.find(a => a.tag === tag)!

  // ── clients ──
  const mobile = () => '+233 2' + ri(0, 9) + ' ' + ri(100, 999) + ' ' + ri(100, 999)
  const idTypes = ['Ghana Card', 'Voter ID', "Driver's Licence", 'NHIS Card', 'Passport']
  for (let i = 0; i < 240; i++) {
    const isBusiness = rnd() < 0.22
    const gender = rnd() < 0.5 ? 'female' : 'male'
    const first = gender === 'female' ? pick(FEMALE) : pick(MALE)
    const last = pick(SURNAMES)
    const officeId = 1 + Math.floor(Math.pow(rnd(), 1.6) * 6)
    const officers = db.staff.filter(s => s.isLoanOfficer && s.officeId === officeId && s.status === 'active')
    const staffId = officers.length ? pick(officers).id : db.staff[0].id
    const roll = rnd()
    const status: Client['status'] = roll < 0.74 ? 'active' : roll < 0.86 ? 'pending' : roll < 0.94 ? 'closed' : 'transferred'
    const submittedDate = daysAgo(ri(5, 1100))
    const activationDate = status === 'pending' ? null : daysAgo(ri(3, Math.max(4, 1095 - 5))) 
    const dobYear = ri(1965, 2002)
    const c: Client = {
      id: i + 1,
      accountNo: 'CL-' + String(100001 + i),
      firstname: isBusiness ? '' : first,
      lastname: isBusiness ? '' : last,
      displayName: isBusiness ? pick(BUSINESSES) : `${first} ${last}`,
      externalId: 'EXT-C' + (90000 + ri(1000, 99999)),
      status, clientType: isBusiness ? 'business' : 'individual',
      businessName: isBusiness ? undefined : undefined,
      submittedDate,
      activationDate: status === 'pending' ? null : activationDate,
      closedDate: status === 'closed' ? daysAgo(ri(10, 400)) : null,
      officeId, staffId: status === 'pending' && rnd() < 0.5 ? null : staffId,
      mobile: mobile(),
      email: isBusiness ? `info@${first.toLowerCase()}.example` : `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      gender: isBusiness ? '' : (gender as 'male' | 'female'),
      dob: `${dobYear}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`,
      idType: pick(idTypes),
      idNumber: 'GHA-' + String(ri(100000000, 999999999)),
      address: { line1: `House ${ri(1, 400)}, ${pick(['Lom', 'Akp', 'Salaga', 'Ring', 'Market'])} Street`, town: pick(TOWNS), city: CITIES[(officeId - 1) % CITIES.length] },
      groupIds: [],
    }
    if (isBusiness) { c.businessName = c.displayName; c.firstname = first; c.lastname = last }
    if (rnd() < 0.7) {
      const rels = ['Spouse', 'Sibling', 'Child', 'Parent']
      c.family = Array.from({ length: ri(1, 2) }, () => ({
        name: `${pick([...MALE, ...FEMALE])} ${last}`,
        relationship: pick(rels), mobile: mobile(),
      }))
    }
    c.identifiers = [
      { type: 'National ID', number: c.idNumber, status: 'verified' },
      ...(rnd() < 0.4 ? [{ type: 'NHIS', number: 'NH' + ri(1000000, 9999999), status: 'active' as string }] : []),
    ]
    c.documents = rnd() < 0.6 ? [
      { name: 'ID Card Scan', type: 'PDF', uploadedAt: submittedDate },
      { name: 'Passport Photograph', type: 'JPG', uploadedAt: submittedDate },
    ] : [{ name: 'ID Card Scan', type: 'PDF', uploadedAt: submittedDate }]
    db.clients.push(c)
  }

  // ── groups ──
  for (let i = 0; i < 18; i++) {
    const officeId = (i % 6) + 1
    const officeClients = db.clients.filter(c => c.officeId === officeId && c.status === 'active')
    const members = officeClients.sort(() => rnd() - 0.5).slice(0, ri(6, 14))
    const officer = db.staff.find(s => s.id === members[0]?.staffId) ?? db.staff[0]
    const g: Group = {
      id: i + 1, name: GROUP_NAMES[i], accountNo: 'GR-' + String(20001 + i),
      officeId, staffId: officer.id, meetingDay: pick(MEETING_DAYS),
      formationDate: daysAgo(ri(200, 1500)),
      status: rnd() < 0.85 ? 'active' : 'pending',
      memberIds: members.map(m => m.id),
    }
    db.groups.push(g)
    members.forEach(m => m.groupIds.push(g.id))
  }

  // ── journal posting engine ──
  const ledgers: JournalEntry[] = []
  const postPair = (date: string, drTag: string, crTag: string, amount: number, note: string, officeId = 1) => {
    const txId = 'TXN-' + String(100000 + txnSeq++)
    const mk = (glAccountId: number, entryType: 'DEBIT' | 'CREDIT'): JournalEntry => ({
      id: 0, transactionId: txId, entryDate: date, officeId, glAccountId,
      amount: round2(amount), entryType, note, reversed: false, user: 'system.seed',
    })
    ledgers.push(mk(glByTag(drTag).id, 'DEBIT'), mk(glByTag(crTag).id, 'CREDIT'))
    return txId
  }

  // Opening balances (13 months ago)
  const opening = daysAgo(400)
  postPair(opening, 'CASH', 'EQUITY_CAPITAL', 850000, 'Opening capital & cash injection')
  postPair(opening, 'LOAN_PORTFOLIO', 'BORROWED_FUNDS', 620000, 'Opening loan portfolio book')
  postPair(opening, 'EQUIPMENT', 'CASH', 90000, 'Office equipment capitalised')

  // ── loans ──
  const loanOfficers = db.staff.filter(s => s.isLoanOfficer && s.status === 'active')
  const activeClients = db.clients.filter(c => c.status === 'active' || c.status === 'closed')
  let loanId = 0
  const makeLoan = (client: Client, disbursedAgoDays: number | null, forcedStatus?: Loan['status']): Loan => {
    loanId++
    const product = pick(db.loanProducts)
    const principal = round2(r(product.principalMin, product.principalMax) / 10) * 10
    const interestRate = round2(r(product.interestRateMin, product.interestRateMax) * 10) / 10
    const term = ri(product.termMin, product.termMax)
    const periods = Math.max(2, Math.round(term / product.repayEvery))
    const officer = loanOfficers.find(s => s.id === client.staffId) ?? pick(loanOfficers)
    const submittedDate = disbursedAgoDays === null ? daysAgo(ri(1, 25)) : daysAgo(disbursedAgoDays + ri(7, 20))
    const loan: Loan = {
      id: loanId, accountNo: 'LN-' + String(300000 + loanId),
      clientId: client.id, groupId: client.groupIds[0] ?? null,
      productId: product.id, officeId: client.officeId, staffId: officer.id,
      status: forcedStatus ?? 'submitted',
      purpose: pick(PURPOSES), principal, interestRate, term,
      termFrequency: product.termFrequency, repayEvery: product.repayEvery,
      repayFrequency: product.repayFrequency,
      submittedDate, approvedDate: null, disbursedDate: null, closedDate: null,
      expectedMaturity: null,
      schedule: [], transactions: [],
      paidPrincipal: 0, paidInterest: 0, paidFees: 0,
      outstanding: principal, overdueAmount: 0,
      collateral: product.shortName === 'GEL' ? 'Group cross-guarantee' : pick(COLLATERAL),
      guarantor: rnd() < 0.5 ? `${pick([...MALE, ...FEMALE])} ${pick(SURNAMES)} (${pick(['Spouse', 'Sibling', 'Business partner'])})` : '—',
    }

    if (forcedStatus === 'submitted' || disbursedAgoDays === null) {
      loan.status = 'submitted'
      loan.schedule = buildSchedule(principal, interestRate, periods, product.repayFrequency, daysAhead(14), product.graceOnPrincipal)
      return loan
    }
    if (forcedStatus === 'rejected') {
      loan.status = 'rejected'
      loan.approvedDate = null; loan.rejectedDate = daysAgo(disbursedAgoDays + ri(3, 6))
      loan.schedule = buildSchedule(principal, interestRate, periods, product.repayFrequency, daysAgo(ri(1, 10)), product.graceOnPrincipal)
      return loan
    }
    if (forcedStatus === 'approved') {
      loan.status = 'approved'
      loan.approvedDate = daysAgo(ri(1, 6))
      loan.schedule = buildSchedule(principal, interestRate, periods, product.repayFrequency, daysAhead(10), product.graceOnPrincipal)
      loan.expectedMaturity = loan.schedule[loan.schedule.length - 1].dueDate
      return loan
    }

    const disbursedDate = daysAgo(disbursedAgoDays)
    loan.approvedDate = daysAgo(disbursedAgoDays + ri(2, 5))
    loan.disbursedDate = disbursedDate
    loan.schedule = buildSchedule(principal, interestRate, periods, product.repayFrequency, disbursedDate, product.graceOnPrincipal)
    loan.expectedMaturity = loan.schedule[loan.schedule.length - 1].dueDate
    loan.transactions.push({
      id: nextTxnId(), date: disbursedDate, type: 'disbursement',
      amount: principal, principal, interest: 0, fees: 0,
      paymentType: 'Cash', note: 'Principal disbursed to client',
    })
    postPair(disbursedDate, 'LOAN_PORTFOLIO', 'CASH', principal, `Disbursement ${loan.accountNo}`, loan.officeId)
    const procFee = round2(principal * 0.02)
    postPair(disbursedDate, 'CASH', 'FEE_INCOME', procFee, `Processing fee ${loan.accountNo}`, loan.officeId)

    const t = todayISO()
    const fullyMatured = loan.expectedMaturity < t

    if (forcedStatus === 'writtenoff') {
      // a few early payments then default
      let guard = 0
      for (const e of loan.schedule) {
        if (guard >= ri(2, 5)) break
        if (e.dueDate < t && rnd() < 0.85) {
          const payDate = e.dueDate
          applyPayment(loan, e.totalDue, payDate, pick(PAYMENT_TYPES).name, 'Installment')
          postPair(payDate, 'CASH', 'LOAN_PORTFOLIO', e.principalDue, `Repayment ${loan.accountNo}`, loan.officeId)
          postPair(payDate, 'CASH', 'INTEREST_INCOME', e.interestDue, `Interest ${loan.accountNo}`, loan.officeId)
        }
        guard++
      }
      recomputeLoan(loan)
      loan.status = 'writtenoff'
      loan.writtenOffDate = daysAgo(ri(20, 120))
      loan.transactions.push({ id: nextTxnId(), date: loan.writtenOffDate!, type: 'writeoff', amount: loan.outstanding, principal: loan.outstanding, interest: 0, fees: 0, paymentType: '—', note: 'Written off per credit policy' })
      postPair(loan.writtenOffDate!, 'WRITTEN_OFF', 'LOAN_PORTFOLIO', loan.outstanding, `Write-off ${loan.accountNo}`, loan.officeId)
      loan.outstanding = 0; loan.overdueAmount = 0
      return loan
    }

    // normal repayment behaviour
    for (const e of loan.schedule) {
      if (e.dueDate >= t) break
      const roll = rnd()
      if (fullyMatured && forcedStatus !== 'active') {
        // matured loans: most closed
      }
      if (roll < 0.82 || (fullyMatured && rnd() < 0.9)) {
        const dueAgo = Math.max(0, Math.round((Date.now() - new Date(e.dueDate + 'T12:00:00Z').getTime()) / DAY))
        const payDate = daysAgo(Math.max(0, dueAgo + ri(-3, 2)))
        applyPayment(loan, e.totalDue, payDate < t ? payDate : t, pick(PAYMENT_TYPES).name, 'Installment')
        postPair(e.dueDate, 'CASH', 'LOAN_PORTFOLIO', e.principalDue, `Repayment ${loan.accountNo}`, loan.officeId)
        postPair(e.dueDate, 'CASH', 'INTEREST_INCOME', e.interestDue, `Interest ${loan.accountNo}`, loan.officeId)
      } else if (roll < 0.92) {
        const part = round2(e.totalDue * r(0.4, 0.85))
        applyPayment(loan, part, e.dueDate, pick(PAYMENT_TYPES).name, 'Partial installment')
        postPair(e.dueDate, 'CASH', 'LOAN_PORTFOLIO', part, `Partial repayment ${loan.accountNo}`, loan.officeId)
      }
      // else: missed → overdue
    }
    recomputeLoan(loan)

    if (fullyMatured && loan.outstanding <= 0.01) {
      loan.status = 'closed'; loan.closedDate = loan.expectedMaturity
    } else if (fullyMatured && rnd() < 0.5 && loan.overdueAmount > 0) {
      // settled an old overdue loan late → closed
      const settleDate = daysAgo(ri(20, 200))
      applyPayment(loan, loan.outstanding, settleDate, 'Cash', 'Final settlement')
      loan.status = 'closed'; loan.closedDate = settleDate
    } else {
      loan.status = 'active'
    }
    return loan
  }

  // distribution: 185 loans
  for (let i = 0; i < 185; i++) {
    const client = activeClients[i % activeClients.length]
    const roll = rnd()
    if (roll < 0.08) db.loans.push(makeLoan(client, null))                                   // submitted/pending approval
    else if (roll < 0.15) db.loans.push(makeLoan(client, null, 'rejected'))                  // rejected
    else if (roll < 0.20) { const l = makeLoan(client, ri(3, 14), 'approved'); db.loans.push(l) } // approved awaiting disbursal
    else if (roll < 0.24) db.loans.push(makeLoan(client, ri(300, 700), 'writtenoff'))        // written off
    else db.loans.push(makeLoan(client, ri(20, 600)))                                        // active / closed
  }
  db.counters.loans = loanId

  // ── savings accounts ──
  let savId = 0
  for (let i = 0; i < 210; i++) {
    const client = db.clients[ri(0, db.clients.length - 1)]
    if (client.status === 'pending' && rnd() < 0.5) continue
    const product = pick(db.savingsProducts)
    savId++
    const submittedDate = daysAgo(ri(10, 1000))
    const acc: SavingsAccount = {
      id: savId, accountNo: 'SV-' + String(400000 + savId),
      clientId: client.id, productId: product.id, officeId: client.officeId,
      staffId: client.staffId ?? loanOfficers[0].id,
      status: 'submitted', submittedDate, approvedDate: null, activatedDate: null, closedDate: null,
      interestRate: product.interestRate, balance: 0, totalDeposits: 0, totalWithdrawals: 0,
      transactions: [],
    }
    const roll = rnd()
    if (roll < 0.08) { db.savings.push(acc); continue } // submitted
    acc.status = 'approved'; acc.approvedDate = daysAgo(Math.max(2, Math.round((Date.now() - new Date(submittedDate).getTime()) / DAY) - ri(1, 4)))
    if (roll < 0.14) { db.savings.push(acc); continue } // approved, awaiting activation

    const activatedDate = daysAgo(Math.max(3, Math.round((Date.now() - new Date(acc.approvedDate!).getTime()) / DAY) - ri(0, 3)))
    acc.activatedDate = activatedDate; acc.status = 'active'
    const openingBal = product.minOpeningBalance + ri(0, 20) * 10
    let bal = openingBal
    let txId = 0
    const pushTxn = (type: SavingsTxn['type'], amount: number, date: string, pay: string, note?: string) => {
      txId++
      if (type === 'deposit' || type === 'interest') bal = round2(bal + amount)
      else bal = round2(bal - amount)
      acc.transactions.push({ id: txId, date, type, amount, balanceAfter: bal, paymentType: pay, note })
      if (type === 'deposit') { acc.totalDeposits = round2(acc.totalDeposits + amount); postPair(date, 'CASH', 'SAVINGS_CONTROL', amount, `Deposit ${acc.accountNo}`, acc.officeId) }
      if (type === 'withdrawal') { acc.totalWithdrawals = round2(acc.totalWithdrawals + amount); postPair(date, 'SAVINGS_CONTROL', 'CASH', amount, `Withdrawal ${acc.accountNo}`, acc.officeId) }
      if (type === 'interest') { postPair(date, 'DEPOSIT_INTEREST', 'INTEREST_PAYABLE', amount, `Interest accrual ${acc.accountNo}`, acc.officeId) }
      if (type === 'fee') { postPair(date, 'CASH', 'FEE_INCOME', amount, `Ledger fee ${acc.accountNo}`, acc.officeId) }
    }
    pushTxn('deposit', openingBal, activatedDate, pick(PAYMENT_TYPES).name, 'Opening deposit')

    // walk forward month by month
    const months = Math.floor((Date.now() - new Date(activatedDate).getTime()) / DAY / 30)
    let lastActive = activatedDate
    for (let m = 1; m <= months; m++) {
      const date = daysAgo(Math.max(0, months - m) * 30 + ri(0, 20))
      if (date < activatedDate) continue
      const dormant = rnd() < 0.06 && m > months - 8
      if (dormant) break
      const deposits = ri(1, 3)
      for (let d = 0; d < deposits; d++) {
        const amt = round2(r(20, product.type === 'current' ? 3000 : 800) / 5) * 5
        pushTxn('deposit', amt, date, pick(PAYMENT_TYPES).name)
      }
      if (bal > 100 && rnd() < 0.7 && product.type !== 'fixed') {
        const amt = round2(Math.min(bal * r(0.1, 0.6), product.type === 'current' ? 2500 : 600) / 5) * 5
        if (amt >= 5) pushTxn('withdrawal', amt, date, pick(PAYMENT_TYPES).name)
      }
      if (m % 3 === 0 && product.interestRate > 0 && bal > 0) {
        pushTxn('interest', round2(bal * (product.interestRate / 100) / 4), date, '—', 'Quarterly interest')
      }
      if (m % 1 === 0 && product.withdrawalFee > 0 && acc.transactions.some(t => t.type === 'withdrawal')) {
        pushTxn('fee', product.withdrawalFee, date, '—', 'Monthly ledger fee')
      }
      lastActive = date
    }
    acc.balance = bal

    if (roll > 0.96 && bal > 0) {
      // close: withdraw everything
      pushTxn('withdrawal', round2(bal), todayISO(), 'Cash', 'Account closure')
      acc.balance = 0; acc.status = 'closed'; acc.closedDate = todayISO()
    } else if ((Date.now() - new Date(lastActive).getTime()) / DAY > 240) {
      acc.status = 'dormant'
    } else {
      acc.status = 'active'
    }
    db.savings.push(acc)
  }
  db.counters.savings = savId

  // ── historical operational journals (random expenses / income) ──
  for (let m = 12; m >= 1; m--) {
    const base = daysAgo(m * 30 + ri(0, 20))
    postPair(base, 'STAFF_COSTS', 'CASH', round2(r(38000, 52000)), 'Monthly payroll')
    postPair(base, 'RENT_UTILITIES', 'CASH', round2(r(6000, 9000)), 'Rent & utilities')
    if (m % 2 === 0) postPair(base, 'ADMIN', 'CASH', round2(r(1500, 3500)), 'Administration & logistics')
    if (m % 3 === 0) postPair(base, 'LOAN_LOSS_EXPENSE', 'LOAN_PORTFOLIO', round2(r(4000, 12000)), 'Quarterly provisioning charge')
  }
  db.journals = ledgers.map((j, i) => ({ ...j, id: i + 1 }))

  // ── closures (months closed up to last month) ──
  let closureId = 0
  for (let m = 2; m <= 13; m++) {
    closureId++
    db.closures.push({
      id: closureId, officeId: 1,
      closingDate: daysAgo(m * 30 - 28),
      createdDate: daysAgo(m * 30 - 27),
      comments: 'Month-end books closed and reconciled.',
      status: 'closed',
    })
  }

  // ── holidays ──
  const holidays: Holiday[] = [
    { id: 1, name: 'Independence Day', description: 'National holiday — branches closed', fromDate: '2026-03-06', toDate: '2026-03-06', officeId: 1, status: 'active' },
    { id: 2, name: 'Eid al-Fitr', description: 'Muslim festive holiday', fromDate: '2026-03-20', toDate: '2026-03-21', officeId: 1, status: 'active' },
    { id: 3, name: 'Founders’ Day', description: 'Founders’ Day public holiday', fromDate: '2026-08-04', toDate: '2026-08-04', officeId: 1, status: 'active' },
    { id: 4, name: 'Farmers’ Day', description: 'Farmers’ Day — shortened hours', fromDate: '2026-12-04', toDate: '2026-12-04', officeId: 1, status: 'active' },
  ]
  db.holidays = holidays

  // ── maker-checker queue ──
  const pendingLoans = db.loans.filter(l => l.status === 'submitted').slice(0, 4)
  const pendingSavings = db.savings.filter(s => s.status === 'submitted').slice(0, 3)
  const pendingClients = db.clients.filter(c => c.status === 'pending').slice(0, 2)
  let taskId = 0
  const maker = db.users[2]
  const mkTask = (entityType: CheckerTask['entityType'], action: string, entityId: number, label: string, days: number, amount?: number): CheckerTask => {
    taskId++
    return {
      id: taskId, createdDate: daysAgo(days), entityType, action, entityId,
      entityLabel: label, makerId: maker.id, makerName: `${maker.firstname} ${maker.lastname}`,
      status: 'pending', checkerId: null, checkerName: null, checkedDate: null,
      note: 'Awaiting checker approval', amount,
    }
  }
  pendingLoans.forEach((l, i) => db.tasks.push(mkTask('LOAN', 'Loan Approval', l.id, `${l.accountNo} — ${db.clients.find(c => c.id === l.clientId)?.displayName}`, i + 1, l.principal)))
  pendingSavings.forEach((s, i) => db.tasks.push(mkTask('SAVINGS', 'Savings Approval', s.id, `${s.accountNo} — ${db.clients.find(c => c.id === s.clientId)?.displayName}`, i + 2)))
  pendingClients.forEach((c, i) => db.tasks.push(mkTask('CLIENT', 'Client Activation', c.id, `${c.accountNo} — ${c.displayName}`, i + 1)))

  // a few resolved tasks for history
  db.tasks.push(
    { id: ++taskId, createdDate: daysAgo(9), entityType: 'LOAN', action: 'Loan Disbursal', entityId: db.loans.find(l => l.status === 'active')!.id, entityLabel: 'LN-300014 — Yaa Darko', makerId: 3, makerName: 'Esi Sarpong', status: 'approved', checkerId: 1, checkerName: 'Adjoa Mensah', checkedDate: daysAgo(8), note: 'Verified collateral and KYC', amount: 4500 },
    { id: ++taskId, createdDate: daysAgo(12), entityType: 'JOURNAL', action: 'Manual Journal Entry', entityId: 0, entityLabel: 'JE — stationery purchase (GH₵ 1,240)', makerId: 6, makerName: 'Yaw Darko', status: 'rejected', checkerId: 1, checkerName: 'Adjoa Mensah', checkedDate: daysAgo(11), note: 'Receipt not attached — rejected' },
  )

  // ── audit trail (synthesised from recent activity) ──
  let auditId = 0
  const aud = (entity: string, action: string, entityId: number, name: string, days: number, user: string, result: 'success' | 'failure' = 'success', notes = '') => {
    auditId++
    db.audit.push({
      id: auditId, timestamp: daysAgo(days) + 'T' + String(ri(8, 17)).padStart(2, '0') + ':' + String(ri(10, 59)).padStart(2, '0') + ':00Z',
      entity, action, entityId, entityName: name,
      userId: db.users.find(u => u.username === user)?.id ?? 1,
      userName: db.users.find(u => u.username === user)?.firstname + ' ' + (db.users.find(u => u.username === user)?.lastname ?? ''),
      officeId: ri(1, 6), result, notes,
    })
  }
  for (let i = 0; i < 34; i++) {
    const kind = i % 6
    const days = ri(0, 45)
    if (kind === 0) { const l = db.loans[ri(0, db.loans.length - 1)]; aud('Loan', pick(['CREATE', 'APPROVE', 'DISBURSE', 'REPAYMENT']), l.id, l.accountNo, days, pick(['e.sarpong', 'f.ankrah', 'k.owusu'])) }
    else if (kind === 1) { const c = db.clients[ri(0, db.clients.length - 1)]; aud('Client', pick(['CREATE', 'ACTIVATE', 'UPDATE']), c.id, c.displayName, days, pick(['e.sarpong', 'f.ankrah', 'a.appiah'])) }
    else if (kind === 2) { const s = db.savings[ri(0, db.savings.length - 1)]; aud('Savings', pick(['DEPOSIT', 'WITHDRAWAL', 'APPROVE', 'ACTIVATE']), s.id, s.accountNo, days, pick(['a.appiah', 'f.ankrah'])) }
    else if (kind === 3) { aud('Journal Entry', pick(['CREATE', 'POST']), ri(100, 400), 'Manual JE', days, 'y.darko') }
    else if (kind === 4) { aud('Checker Task', pick(['APPROVE', 'REJECT']), ri(1, 9), 'Maker-checker task', days, 'a.mensah') }
    else { aud('User', 'LOGIN', 1, 'Console sign-in', days, pick(['a.mensah', 'k.owusu', 'e.sarpong']), rnd() < 0.1 ? 'failure' : 'success', rnd() < 0.1 ? 'Invalid credentials' : '') }
  }
  db.audit.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  db.counters.audit = auditId
  db.counters.tasks = taskId

  return db
}

// ── singleton (survives HMR in dev via globalThis) ───────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __tlCoreBankDB: DB | undefined
}
export function db(): DB {
  if (!globalThis.__tlCoreBankDB) globalThis.__tlCoreBankDB = buildDB()
  return globalThis.__tlCoreBankDB
}

export function nextId(d: DB, key: string): number {
  d.counters[key] = (d.counters[key] ?? 0) + 1
  return d.counters[key]
}

// ── audit helper (used by all mutating endpoints) ────────────────────────
export function logAudit(d: DB, entity: string, action: string, entityId: number, name: string, notes = '', result: 'success' | 'failure' = 'success') {
  const u = d.currentUser
  d.audit.unshift({
    id: nextId(d, 'audit'),
    timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    entity, action, entityId, entityName: name,
    userId: u.id, userName: u.name, officeId: u.officeId, result, notes,
  })
}

// ── journal posting (runtime, for live transactions) ─────────────────────
export function postJournal(d: DB, date: string, drTag: string, crTag: string, amount: number, note: string, officeId = 1): string {
  const txId = 'TXN-' + String(500000 + nextId(d, 'jeTxn'))
  const gl = (tag: string) => d.glAccounts.find(a => a.tag === tag)
  if (!gl(drTag) || !gl(crTag)) throw new Error(`Unknown GL tag: ${drTag}/${crTag}`)
  const mk = (glAccountId: number, entryType: 'DEBIT' | 'CREDIT'): JournalEntry => ({
    id: 0, transactionId: txId, entryDate: date, officeId, glAccountId,
    amount: round2(amount), entryType, note, reversed: false, user: d.currentUser.username,
  })
  d.journals.push(mk(gl(drTag)!.id, 'DEBIT'), mk(gl(crTag)!.id, 'CREDIT'))
  // re-index ids
  d.journals.forEach((j, i) => { j.id = i + 1 })
  return txId
}

// ── state transitions (shared by endpoints & maker-checker) ──────────────
export function clientAction(d: DB, id: number, action: 'activate' | 'close') {
  const c = d.clients.find(x => x.id === id)
  if (!c) throw err404('Client not found')
  if (action === 'activate') {
    if (c.status !== 'pending') throw err400(`Client is ${c.status}; only pending clients can be activated.`)
    c.status = 'active'; c.activationDate = todayISO()
  } else {
    if (c.status !== 'active') throw err400(`Client is ${c.status}; only active clients can be closed.`)
    c.status = 'closed'; c.closedDate = todayISO()
  }
  logAudit(d, 'Client', action.toUpperCase(), c.id, `${c.accountNo} — ${c.displayName}`)
  return c
}

export function createClient(d: DB, body: Partial<Client>): Client {
  const id = Math.max(0, ...d.clients.map(c => c.id)) + 1
  const first = (body.firstname ?? '').trim()
  const last = (body.lastname ?? '').trim()
  const business = (body.businessName ?? '').trim()
  const c: Client = {
    id, accountNo: 'CL-' + String(100000 + id),
    firstname: first, lastname: last,
    displayName: body.clientType === 'business' ? (business || `${first} ${last}`) : `${first} ${last}`,
    externalId: 'EXT-C' + (90000 + id * 7),
    status: body.activationDate ? 'active' : 'pending',
    clientType: body.clientType ?? 'individual',
    businessName: body.clientType === 'business' ? business : undefined,
    submittedDate: todayISO(),
    activationDate: body.activationDate ?? null,
    closedDate: null,
    officeId: body.officeId ?? 1,
    staffId: body.staffId ?? null,
    mobile: body.mobile ?? '', email: body.email ?? '',
    gender: body.gender ?? '', dob: body.dob ?? '',
    idType: body.idType ?? 'Ghana Card', idNumber: body.idNumber ?? '',
    address: body.address ?? { line1: '', town: '', city: '' },
    groupIds: [],
    identifiers: [{ type: 'National ID', number: body.idNumber ?? '—', status: 'pending verification' }],
    documents: [], family: [],
  }
  d.clients.unshift(c)
  logAudit(d, 'Client', 'CREATE', c.id, `${c.accountNo} — ${c.displayName}`, `Onboarded via ${body.staffId ? 'loan officer' : 'self-service'}`)
  return c
}

export function loanAction(d: DB, id: number, action: string, body: any = {}): Loan {
  const loan = d.loans.find(x => x.id === id)
  if (!loan) throw err404('Loan account not found')
  const date: string = body.date ?? todayISO()
  const client = d.clients.find(c => c.id === loan.clientId)
  const label = `${loan.accountNo} — ${client?.displayName ?? ''}`

  switch (action) {
    case 'approve':
      if (loan.status !== 'submitted') throw err400(`Loan is ${loan.status}; cannot approve.`)
      loan.status = 'approved'; loan.approvedDate = date
      logAudit(d, 'Loan', 'APPROVE', loan.id, label, body.note ?? '')
      break
    case 'reject':
      if (loan.status !== 'submitted') throw err400(`Loan is ${loan.status}; cannot reject.`)
      loan.status = 'rejected'; loan.rejectedDate = date
      logAudit(d, 'Loan', 'REJECT', loan.id, label, body.note ?? 'Rejected by checker')
      break
    case 'withdraw':
      if (loan.status !== 'submitted' && loan.status !== 'approved') throw err400(`Loan is ${loan.status}; cannot withdraw.`)
      loan.status = 'withdrawn'
      logAudit(d, 'Loan', 'WITHDRAW', loan.id, label)
      break
    case 'disburse': {
      if (loan.status !== 'approved') throw err400(`Loan is ${loan.status}; must be approved before disbursal.`)
      loan.status = 'active'; loan.disbursedDate = date
      loan.transactions.push({ id: nextTxnId(), date, type: 'disbursement', amount: loan.principal, principal: loan.principal, interest: 0, fees: 0, paymentType: body.paymentType ?? 'Cash', note: 'Principal disbursed to client' })
      postJournal(d, date, 'LOAN_PORTFOLIO', 'CASH', loan.principal, `Disbursement ${loan.accountNo}`, loan.officeId)
      postJournal(d, date, 'CASH', 'FEE_INCOME', round2(loan.principal * 0.02), `Processing fee ${loan.accountNo}`, loan.officeId)
      logAudit(d, 'Loan', 'DISBURSE', loan.id, label, `${body.paymentType ?? 'Cash'}`)
      break
    }
    case 'repayment': {
      if (loan.status !== 'active') throw err400(`Loan is ${loan.status}; repayments only on active loans.`)
      recomputeLoan(loan)
      const amount = round2(Number(body.amount ?? 0))
      if (!(amount > 0)) throw err400('A positive repayment amount is required.')
      if (amount > round2(loan.outstanding + 0.5))
        throw err400(`Amount exceeds outstanding balance (GH₵${loan.outstanding.toLocaleString()}).`)
      const before = { p: loan.paidPrincipal, i: loan.paidInterest, f: loan.paidFees }
      applyPayment(loan, amount, date, body.paymentType ?? 'Cash', body.note ?? 'Loan repayment')
      const dPrin = round2(loan.paidPrincipal - before.p)
      const dInt = round2(loan.paidInterest - before.i)
      const dFee = round2(loan.paidFees - before.f)
      if (dPrin > 0) postJournal(d, date, 'CASH', 'LOAN_PORTFOLIO', dPrin, `Repayment ${loan.accountNo}`, loan.officeId)
      if (dInt > 0) postJournal(d, date, 'CASH', 'INTEREST_INCOME', dInt, `Interest ${loan.accountNo}`, loan.officeId)
      if (dFee > 0) postJournal(d, date, 'CASH', 'FEE_INCOME', dFee, `Fees ${loan.accountNo}`, loan.officeId)
      logAudit(d, 'Loan', 'REPAYMENT', loan.id, label, `GH₵${amount} via ${body.paymentType ?? 'Cash'}`)
      break
    }
    case 'writeoff': {
      if (loan.status !== 'active') throw err400(`Loan is ${loan.status}; cannot write off.`)
      recomputeLoan(loan)
      loan.status = 'writtenoff'; loan.writtenOffDate = date
      loan.transactions.push({ id: nextTxnId(), date, type: 'writeoff', amount: loan.outstanding, principal: loan.outstanding, interest: 0, fees: 0, paymentType: '—', note: body.note ?? 'Written off per credit policy' })
      postJournal(d, date, 'WRITTEN_OFF', 'LOAN_PORTFOLIO', loan.outstanding, `Write-off ${loan.accountNo}`, loan.officeId)
      loan.outstanding = 0; loan.overdueAmount = 0
      logAudit(d, 'Loan', 'WRITE_OFF', loan.id, label, body.note ?? '')
      break
    }
    default:
      throw err400(`Unknown loan action: ${action}`)
  }
  return loan
}

export function createLoan(d: DB, body: any): Loan {
  const client = d.clients.find(c => c.id === Number(body.clientId))
  if (!client) throw err404('Client not found')
  const product = d.loanProducts.find(p => p.id === Number(body.productId))
  if (!product) throw err404('Loan product not found')
  const principal = round2(Number(body.principal ?? 0))
  if (!(principal >= product.principalMin && principal <= product.principalMax))
    throw err400(`Principal must be between GH₵${product.principalMin} and GH₵${product.principalMax} for ${product.name}.`)
  const interestRate = round2(Number(body.interestRate ?? product.interestRateMin))
  const term = Math.round(Number(body.term ?? product.termMin))
  const id = Math.max(0, ...d.loans.map(l => l.id)) + 1
  const periods = Math.max(2, Math.round(term / product.repayEvery))
  const loan: Loan = {
    id, accountNo: 'LN-' + String(300000 + id),
    clientId: client.id, groupId: client.groupIds[0] ?? null,
    productId: product.id, officeId: client.officeId, staffId: client.staffId ?? d.currentUser.id,
    status: 'submitted', purpose: body.purpose ?? 'Working capital',
    principal, interestRate, term,
    termFrequency: product.termFrequency, repayEvery: product.repayEvery, repayFrequency: product.repayFrequency,
    submittedDate: todayISO(), approvedDate: null, disbursedDate: null, closedDate: null, expectedMaturity: null,
    schedule: buildSchedule(principal, interestRate, periods, product.repayFrequency, daysAhead(14), product.graceOnPrincipal),
    transactions: [], paidPrincipal: 0, paidInterest: 0, paidFees: 0,
    outstanding: principal, overdueAmount: 0,
    collateral: body.collateral ?? 'Two guarantors', guarantor: body.guarantor ?? '—',
  }
  d.loans.unshift(loan)
  logAudit(d, 'Loan', 'CREATE', loan.id, `${loan.accountNo} — ${client.displayName}`, `${product.name}, GH₵${principal}`)
  return loan
}

export function savingsAction(d: DB, id: number, action: string, body: any = {}): SavingsAccount {
  const s = d.savings.find(x => x.id === id)
  if (!s) throw err404('Savings account not found')
  const date: string = body.date ?? todayISO()
  const client = d.clients.find(c => c.id === s.clientId)
  const label = `${s.accountNo} — ${client?.displayName ?? ''}`

  const addTxn = (type: SavingsTxn['type'], amount: number, pay: string, note?: string) => {
    s.transactions.push({ id: s.transactions.length + 1, date, type, amount: round2(amount), balanceAfter: round2(s.balance), paymentType: pay, note })
  }
  switch (action) {
    case 'approve':
      if (s.status !== 'submitted') throw err400(`Account is ${s.status}; cannot approve.`)
      s.status = 'approved'; s.approvedDate = date
      logAudit(d, 'Savings', 'APPROVE', s.id, label)
      break
    case 'activate': {
      if (s.status !== 'approved') throw err400(`Account is ${s.status}; must be approved first.`)
      const amt = round2(Number(body.amount ?? 0))
      const product = d.savingsProducts.find(p => p.id === s.productId)!
      if (amt < product.minOpeningBalance) throw err400(`Minimum opening balance for ${product.name} is GH₵${product.minOpeningBalance}.`)
      s.status = 'active'; s.activatedDate = date; s.balance = amt; s.totalDeposits = amt
      addTxn('deposit', amt, body.paymentType ?? 'Cash', 'Opening deposit')
      postJournal(d, date, 'CASH', 'SAVINGS_CONTROL', amt, `Opening deposit ${s.accountNo}`, s.officeId)
      logAudit(d, 'Savings', 'ACTIVATE', s.id, label, `Opening deposit GH₵${amt}`)
      break
    }
    case 'deposit': {
      if (s.status !== 'active' && s.status !== 'dormant') throw err400(`Account is ${s.status}; cannot deposit.`)
      const amt = round2(Number(body.amount ?? 0))
      if (!(amt > 0)) throw err400('Enter a positive deposit amount.')
      s.balance = round2(s.balance + amt); s.totalDeposits = round2(s.totalDeposits + amt)
      if (s.status === 'dormant') s.status = 'active'
      addTxn('deposit', amt, body.paymentType ?? 'Cash', body.note ?? 'Deposit')
      postJournal(d, date, 'CASH', 'SAVINGS_CONTROL', amt, `Deposit ${s.accountNo}`, s.officeId)
      logAudit(d, 'Savings', 'DEPOSIT', s.id, label, `GH₵${amt} via ${body.paymentType ?? 'Cash'}`)
      break
    }
    case 'withdraw': {
      if (s.status !== 'active' && s.status !== 'dormant') throw err400(`Account is ${s.status}; cannot withdraw.`)
      const amt = round2(Number(body.amount ?? 0))
      if (!(amt > 0)) throw err400('Enter a positive withdrawal amount.')
      if (amt > s.balance) throw err400(`Insufficient balance. Available: GH₵${s.balance.toLocaleString()}.`)
      const product = d.savingsProducts.find(p => p.id === s.productId)!
      const fee = product.withdrawalFee
      s.balance = round2(s.balance - amt - fee); s.totalWithdrawals = round2(s.totalWithdrawals + amt)
      addTxn('withdrawal', amt, body.paymentType ?? 'Cash', body.note ?? 'Withdrawal')
      if (fee > 0) addTxn('fee', fee, '—', 'Withdrawal charge')
      postJournal(d, date, 'SAVINGS_CONTROL', 'CASH', amt, `Withdrawal ${s.accountNo}`, s.officeId)
      if (s.status === 'dormant') s.status = 'active'
      logAudit(d, 'Savings', 'WITHDRAWAL', s.id, label, `GH₵${amt} via ${body.paymentType ?? 'Cash'}`)
      break
    }
    case 'close': {
      if (s.status !== 'active' && s.status !== 'dormant') throw err400(`Account is ${s.status}; cannot close.`)
      if (s.balance > 0) {
        addTxn('withdrawal', s.balance, 'Cash', 'Closing balance payout')
        postJournal(d, date, 'SAVINGS_CONTROL', 'CASH', s.balance, `Closure payout ${s.accountNo}`, s.officeId)
        s.totalWithdrawals = round2(s.totalWithdrawals + s.balance)
        s.balance = 0
      }
      s.status = 'closed'; s.closedDate = date
      logAudit(d, 'Savings', 'CLOSE', s.id, label)
      break
    }
    default:
      throw err400(`Unknown savings action: ${action}`)
  }
  return s
}

export function createSavings(d: DB, body: any): SavingsAccount {
  const client = d.clients.find(c => c.id === Number(body.clientId))
  if (!client) throw err404('Client not found')
  const product = d.savingsProducts.find(p => p.id === Number(body.productId))
  if (!product) throw err404('Savings product not found')
  const id = Math.max(0, ...d.savings.map(s => s.id)) + 1
  const acc: SavingsAccount = {
    id, accountNo: 'SV-' + String(400000 + id),
    clientId: client.id, productId: product.id, officeId: client.officeId,
    staffId: client.staffId ?? d.currentUser.id,
    status: 'submitted', submittedDate: todayISO(),
    approvedDate: null, activatedDate: null, closedDate: null,
    interestRate: product.interestRate, balance: 0, totalDeposits: 0, totalWithdrawals: 0,
    transactions: [],
  }
  d.savings.unshift(acc)
  logAudit(d, 'Savings', 'CREATE', acc.id, `${acc.accountNo} — ${client.displayName}`, product.name)
  return acc
}

// ── maker-checker effects ────────────────────────────────────────────────
export function resolveTask(d: DB, taskId: number, decision: 'approved' | 'rejected', note = '') {
  const task = d.tasks.find(t => t.id === taskId)
  if (!task) throw err404('Checker task not found')
  if (task.status !== 'pending') throw err400('Task has already been resolved.')
  task.status = decision
  task.checkerId = d.currentUser.id
  task.checkerName = d.currentUser.name
  task.checkedDate = todayISO()
  task.note = note || (decision === 'approved' ? 'Approved by checker' : 'Rejected by checker')

  if (decision === 'approved') {
    if (task.entityType === 'LOAN') loanAction(d, task.entityId, 'approve', { note: 'Approved via maker-checker' })
    else if (task.entityType === 'SAVINGS') savingsAction(d, task.entityId, 'approve', {})
    else if (task.entityType === 'CLIENT') clientAction(d, task.entityId, 'activate')
  } else {
    if (task.entityType === 'LOAN') { const l = d.loans.find(x => x.id === task.entityId); if (l?.status === 'submitted') loanAction(d, task.entityId, 'reject', { note }) }
  }
  logAudit(d, 'Checker Task', decision === 'approved' ? 'APPROVE' : 'REJECT', task.id, `${task.entityType} — ${task.action}`, note)
  return task
}

// ── errors ───────────────────────────────────────────────────────────────
export function err400(message: string) { return createError({ statusCode: 400, statusMessage: message, message }) }
export function err404(message: string) { return createError({ statusCode: 404, statusMessage: message, message }) }
