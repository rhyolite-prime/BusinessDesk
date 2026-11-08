import type { PayrollPageDefinition } from './catalog'

export interface PayrollEmployee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  otherName: string
  employeeName: string
  department: string
  category: string
  grade: string
  status: 'Active' | 'On leave' | 'Inactive'
  gender: 'Female' | 'Male'
  email: string
  phone: string
  baseSalary: number
  bank: string
  hireDate: string
}

export interface PayrollDemoRecord extends Record<string, string | number | boolean> {
  id: string
}

export interface PayrollCycleState {
  period: string
  status: 'Ready' | 'Calculated' | 'Posted'
  lastCalculatedAt: string
  lastPostedAt: string
  totalGross: number
  totalDeductions: number
  totalNet: number
}

const employeeSeed: PayrollEmployee[] = [
  { id: 'pay-emp-001', employeeId: 'EMP-0101', firstName: 'Ama', lastName: 'Owusu', otherName: 'Serwaa', employeeName: 'Ama Serwaa Owusu', department: 'Finance & Administration', category: 'Permanent', grade: 'M2 · N4', status: 'Active', gender: 'Female', email: 'ama.owusu@example.com', phone: '+233 24 555 0101', baseSalary: 12800, bank: 'GCB Bank · 0020014421', hireDate: '2020-03-16' },
  { id: 'pay-emp-002', employeeId: 'EMP-0102', firstName: 'Kwame', lastName: 'Osei', otherName: '', employeeName: 'Kwame Osei', department: 'Operations', category: 'Permanent', grade: 'M3 · N2', status: 'Active', gender: 'Male', email: 'kwame.osei@example.com', phone: '+233 20 555 0102', baseSalary: 10400, bank: 'Absa Bank · 0020014422', hireDate: '2019-11-04' },
  { id: 'pay-emp-003', employeeId: 'EMP-0103', firstName: 'Abena', lastName: 'Mensah', otherName: 'Akua', employeeName: 'Abena Akua Mensah', department: 'Sales & Marketing', category: 'Permanent', grade: 'M2 · N3', status: 'Active', gender: 'Female', email: 'abena.mensah@example.com', phone: '+233 55 555 0103', baseSalary: 9200, bank: 'Ecobank · 0020014423', hireDate: '2021-07-19' },
  { id: 'pay-emp-004', employeeId: 'EMP-0104', firstName: 'Kojo', lastName: 'Appiah', otherName: '', employeeName: 'Kojo Appiah', department: 'Operations', category: 'Permanent', grade: 'M1 · N5', status: 'Active', gender: 'Male', email: 'kojo.appiah@example.com', phone: '+233 27 555 0104', baseSalary: 7650, bank: 'CalBank · 0020014424', hireDate: '2022-01-10' },
  { id: 'pay-emp-005', employeeId: 'EMP-0105', firstName: 'Efua', lastName: 'Sarpong', otherName: 'Esi', employeeName: 'Efua Esi Sarpong', department: 'Finance & Administration', category: 'Permanent', grade: 'M3 · N1', status: 'On leave', gender: 'Female', email: 'efua.sarpong@example.com', phone: '+233 24 555 0105', baseSalary: 11600, bank: 'GCB Bank · 0020014425', hireDate: '2018-06-25' },
  { id: 'pay-emp-006', employeeId: 'EMP-0106', firstName: 'Yaw', lastName: 'Boateng', otherName: '', employeeName: 'Yaw Boateng', department: 'Information Technology', category: 'Contract', grade: 'S2 · N3', status: 'Active', gender: 'Male', email: 'yaw.boateng@example.com', phone: '+233 50 555 0106', baseSalary: 8350, bank: 'Stanbic Bank · 0020014426', hireDate: '2023-09-11' },
  { id: 'pay-emp-007', employeeId: 'EMP-0107', firstName: 'Akosua', lastName: 'Addo', otherName: 'Nana', employeeName: 'Akosua Nana Addo', department: 'Human Resources', category: 'Permanent', grade: 'M2 · N1', status: 'Active', gender: 'Female', email: 'akosua.addo@example.com', phone: '+233 26 555 0107', baseSalary: 9800, bank: 'Fidelity Bank · 0020014427', hireDate: '2020-10-05' },
  { id: 'pay-emp-008', employeeId: 'EMP-0108', firstName: 'Kofi', lastName: 'Asare', otherName: '', employeeName: 'Kofi Asare', department: 'Sales & Marketing', category: 'Part-time', grade: 'S1 · N2', status: 'Inactive', gender: 'Male', email: 'kofi.asare@example.com', phone: '+233 20 555 0108', baseSalary: 4800, bank: 'Zenith Bank · 0020014428', hireDate: '2024-02-12' },
]

const departmentSeed = [
  { code: 'FIN', name: 'Finance & Administration', description: 'Finance, procurement and corporate administration', status: 'Active' },
  { code: 'OPS', name: 'Operations', description: 'Field operations and service delivery', status: 'Active' },
  { code: 'SAL', name: 'Sales & Marketing', description: 'Sales, partnerships and customer growth', status: 'Active' },
  { code: 'IT', name: 'Information Technology', description: 'Business systems, infrastructure and security', status: 'Active' },
  { code: 'HR', name: 'Human Resources', description: 'People operations and employee domain_services', status: 'Active' },
]

const allowanceSeed = [
  { code: 'TRAN', name: 'Transport allowance', amount: 650, status: 'Active' },
  { code: 'MEAL', name: 'Meal allowance', amount: 420, status: 'Active' },
  { code: 'COMM', name: 'Communication allowance', amount: 250, status: 'Active' },
]

const deductionSeed = [
  { code: 'SSNIT', name: 'Tier 1 SSNIT', amount: 5.5, status: 'Active' },
  { code: 'T2', name: 'Tier 2 pension', amount: 5, status: 'Active' },
  { code: 'UNION', name: 'Union dues', amount: 95, status: 'Active' },
]

const currencySeed = [
  { code: 'GHS', name: 'Ghana cedi', rate: 1, status: 'Active' },
  { code: 'USD', name: 'US dollar', rate: 12.45, status: 'Active' },
  { code: 'EUR', name: 'Euro', rate: 13.55, status: 'Active' },
]

const bankSeed = [
  { code: 'GCB-ACR', name: 'GCB Bank · Accra Main', account: '0020014421', branch: 'Accra Main', status: 'Active' },
  { code: 'ABSA-OSU', name: 'Absa Bank · Osu Branch', account: '0020014422', branch: 'Osu', status: 'Active' },
  { code: 'ECO-ACR', name: 'Ecobank · Accra Central', account: '0020014423', branch: 'Accra Central', status: 'Active' },
]

const loanSeed = [
  { loanNumber: 'LN-2026-0041', employeeId: 'EMP-0101', employeeName: 'Ama Serwaa Owusu', loanType: 'Staff loan', principal: 18000, balance: 10500, instalment: 750, status: 'Active' },
  { loanNumber: 'LN-2026-0042', employeeId: 'EMP-0103', employeeName: 'Abena Akua Mensah', loanType: 'Emergency loan', principal: 8000, balance: 4000, instalment: 500, status: 'Active' },
  { loanNumber: 'LN-2026-0043', employeeId: 'EMP-0105', employeeName: 'Efua Esi Sarpong', loanType: 'Salary advance', principal: 3600, balance: 1200, instalment: 600, status: 'Active' },
]

function toAmount(value: number) {
  return Number(value.toFixed(2))
}

function baseEmployeeRows(period: string): PayrollDemoRecord[] {
  return employeeSeed.map((employee, index) => {
    const grossPay = toAmount(employee.baseSalary + [680, 510, 720, 420, 600, 450, 810, 200][index]!)
    const deduction = toAmount(grossPay * (index % 3 === 0 ? 0.185 : 0.162))
    return {
      id: `${period}-${employee.id}`,
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      email: employee.email,
      department: employee.department,
      departmentName: employee.department,
      category: employee.category,
      grade: employee.grade,
      status: employee.status === 'Inactive' ? 'Excluded' : 'Ready',
      period,
      grossPay,
      deductions: deduction,
      totalDeductions: deduction,
      netPay: toAmount(grossPay - deduction),
      amount: toAmount([480, 320, 250, 180, 400, 210, 350, 140][index]!),
      effectiveDate: `${period}-01`,
      date: `${period}-25`,
      reference: `PAY-${period.replace('-', '')}-${String(index + 1).padStart(3, '0')}`,
      code: employee.employeeId,
      name: employee.employeeName,
      description: `${employee.department} · ${employee.category}`,
      paymentMethod: 'Bank transfer',
      bank: employee.bank,
      loanType: index % 2 ? 'Staff loan' : 'Salary advance',
      balance: toAmount([10500, 0, 4000, 0, 1200, 0, 0, 0][index]!),
      instalment: toAmount([750, 0, 500, 0, 600, 0, 0, 0][index]!),
    }
  })
}

function keyIncludes(page: PayrollPageDefinition, words: string[]) {
  const text = `${page.id} ${page.title} ${page.source}`.toLowerCase()
  return words.some((word) => text.includes(word.toLowerCase()))
}

function namedRows(page: PayrollPageDefinition, names: string[], period: string) {
  return names.map((name, index) => ({
    id: `${page.id}-${index + 1}`,
    code: `${page.id.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    name,
    description: `${name} · ${page.title}`,
    type: name,
    rate: [1, 5, 10, 15][index % 4]!,
    amount: [650, 420, 250, 180][index % 4]!,
    status: index === names.length - 1 && names.length > 3 ? 'Inactive' : 'Active',
    effectiveDate: `${period}-01`,
  }))
}

function employeeDirectoryRows() {
  return employeeSeed.map((employee) => ({
    id: employee.id,
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    firstName: employee.firstName,
    lastName: employee.lastName,
    department: employee.department,
    departmentName: employee.department,
    category: employee.category,
    grade: employee.grade,
    status: employee.status,
    email: employee.email,
    phone: employee.phone,
    effectiveDate: employee.hireDate,
    baseSalary: employee.baseSalary,
    code: employee.employeeId,
    name: employee.employeeName,
    amount: employee.baseSalary,
  }))
}

function loanRows(period: string) {
  return loanSeed.map((row) => ({
    id: row.loanNumber,
    ...row,
    employee: row.employeeName,
    code: row.loanNumber,
    name: row.employeeName,
    amount: row.instalment,
    effectiveDate: `${period}-01`,
  }))
}

function componentRows(rows: PayrollDemoRecord[], component: 'allowance' | 'deduction') {
  const source = component === 'allowance' ? allowanceSeed : deductionSeed
  return rows.map((row, index) => {
    const item = source[index % source.length]!
    const amount = component === 'allowance'
      ? item.amount
      : toAmount(Number(row.grossPay ?? 0) * Number(item.amount) / 100)
    return {
      ...row,
      id: `${component}-${row.id}`,
      code: item.code,
      name: item.name,
      amount,
      status: index === 7 ? 'Draft' : 'Approved',
    }
  })
}

export function buildPayrollPageSeed(page: PayrollPageDefinition, period = '2026-10'): PayrollDemoRecord[] {
  const payrollRows = baseEmployeeRows(period)
  const text = `${page.id} ${page.title}`.toLowerCase()

  if (page.kind === 'import') {
    return payrollRows.map((row, index) => ({
      ...row,
      id: `import-${row.id}`,
      file: `payroll-${period}.csv`,
      importStatus: index === 7 ? 'Needs review' : 'Validated',
      status: index === 7 ? 'Needs review' : 'Validated',
      rows: 1,
      uploadedAt: `${period}-14`,
    }))
  }

  if (page.kind === 'resource') {
    if (text.includes('company profile')) return [{
      id: 'company-profile-1', code: 'GH-AC-042021', name: 'Akan Business Services Ltd.',
      description: '8 Independence Avenue, Ridge, Accra, Ghana', email: 'payroll@example.com',
      phone: '+233 30 255 0142', status: 'Active',
    }]
    if (text.includes('department')) return departmentSeed.map((row, index) => ({ id: `department-${index + 1}`, ...row, employeeCount: [26, 41, 19, 12, 8][index]! }))
    if (text.includes('currency')) return currencySeed.map((row) => ({ id: `currency-${row.code}`, ...row, description: `${row.name} · demo exchange rate` }))
    if (text.includes('bank') || text.includes('branch')) return bankSeed.map((row, index) => ({ id: `bank-${index + 1}`, ...row, description: `${row.branch} payroll account`, paymentCount: [32, 21, 14][index]! }))
    if (text.includes('customer')) return namedRows(page, ['Aster Trading Co.', 'Northshore Supplies', 'Goldline Services', 'Meridian Foods'], period)
    if (text.includes('supplier')) return namedRows(page, ['Coastal Office Supplies', 'BluePeak Logistics', 'Adom Utilities', 'Accra Print House'], period)
    if (text.includes('relationship')) return namedRows(page, ['Spouse', 'Parent', 'Child', 'Sibling'], period)
    if (text.includes('nationalit') || text.includes('countr')) return namedRows(page, ['Ghanaian', 'Nigerian', 'Liberian', 'Other'], period)
    if (text.includes('religion')) return namedRows(page, ['Christianity', 'Islam', 'Traditional', 'Other'], period)
    if (text.includes('group')) return namedRows(page, text.includes('supplier') ? ['Local supplier', 'International supplier', 'Services'] : ['Corporate customer', 'Retail customer', 'Partner'], period)
    return namedRows(page, ['General', 'Operations', 'Finance', 'People & Culture'], period)
  }

  if (page.kind === 'setup') {
    if (text.includes('tax') || text.includes('relief')) {
      return [
        { id: `${page.id}-1`, code: 'PAYE-BAND-01', name: 'Monthly tax band 1', description: 'First progressive band', rate: 0, amount: 490, status: 'Active', effectiveDate: `${period}-01` },
        { id: `${page.id}-2`, code: 'PAYE-BAND-02', name: 'Monthly tax band 2', description: 'Second progressive band', rate: 5, amount: 110, status: 'Active', effectiveDate: `${period}-01` },
        { id: `${page.id}-3`, code: 'PAYE-BAND-03', name: 'Monthly tax band 3', description: 'Third progressive band', rate: 10, amount: 130, status: 'Active', effectiveDate: `${period}-01` },
        { id: `${page.id}-4`, code: 'RELIEF-CHILD', name: 'Child education relief', description: 'Annual statutory relief cap', rate: 0, amount: 1200, status: 'Active', effectiveDate: `${period}-01` },
      ]
    }
    if (text.includes('allowance')) return allowanceSeed.map((row, index) => ({ id: `${page.id}-${index + 1}`, ...row, description: 'Monthly employee allowance', rate: 0, effectiveDate: `${period}-01` }))
    if (text.includes('deduction') || text.includes('ssnit') || text.includes('pension')) return deductionSeed.map((row, index) => ({ id: `${page.id}-${index + 1}`, ...row, description: 'Statutory or employee deduction', rate: Number(row.amount), effectiveDate: `${period}-01` }))
    if (text.includes('loan')) return namedRows(page, ['Staff loan', 'Emergency loan', 'Salary advance', 'Education loan'], period).map((row, index) => ({ ...row, code: ['STAFF', 'EMERG', 'ADV', 'EDU'][index]!, rate: 0, amount: [24, 12, 1, 36][index]!, description: 'Maximum repayment term in months' }))
    if (text.includes('category')) return namedRows(page, ['Permanent', 'Contract', 'Part-time', 'Temporary'], period)
    if (text.includes('status')) return namedRows(page, ['Active', 'On leave', 'Inactive', 'Terminated'], period)
    if (text.includes('rank') || text.includes('grade') || text.includes('notch')) return namedRows(page, ['M1 · N1', 'M2 · N3', 'M3 · N2', 'S1 · N2'], period)
    if (text.includes('calendar') || text.includes('month')) return [
      { id: `${page.id}-1`, code: period, name: 'October 2026 payroll', description: 'Monthly payroll calendar', rate: 0, amount: 31, status: 'Active', effectiveDate: `${period}-01` },
      { id: `${page.id}-2`, code: '2026-11', name: 'November 2026 payroll', description: 'Next monthly payroll period', rate: 0, amount: 30, status: 'Planned', effectiveDate: '2026-11-01' },
    ]
    if (text.includes('signature')) return [{ id: `${page.id}-1`, code: 'IRS-SIGN-01', name: 'Authorized payroll signatory', description: 'Payroll authorization profile · demo', status: 'Active', effectiveDate: `${period}-01` }]
    return namedRows(page, ['Standard', 'Operations', 'Finance', 'People & Culture'], period)
  }

  if (page.id.includes('employee-directory') || page.id.includes('employee-bio-data') || page.title === 'Employees') return employeeDirectoryRows()
  if (text.includes('loan') || text.includes('advance')) return loanRows(period)
  if (page.kind === 'salary-increase') return employeeDirectoryRows()
  if (text.includes('allowance') || text.includes('benefit') || text.includes('earning') || text.includes('bonus')) return componentRows(payrollRows, 'allowance')
  if (text.includes('deduction') || text.includes('ssnit') || text.includes('provident') || text.includes('pension') || text.includes('relief') || text.includes('tax') || text.includes('contribution')) return componentRows(payrollRows, 'deduction')
  if (text.includes('days-worked')) return payrollRows.map((row, index) => ({ ...row, daysWorked: [22, 21, 22, 20, 22, 21, 22, 10][index]! }))
  return payrollRows
}

export function usePayrollDemoData() {
  const employees = useState<PayrollEmployee[]>('payroll-demo-employees', () => employeeSeed.map((employee) => ({ ...employee })))
  const recordsByPage = useState<Record<string, PayrollDemoRecord[]>>('payroll-demo-page-records', () => ({}))
  const cycle = useState<PayrollCycleState>('payroll-demo-cycle', () => ({
    period: '2026-10',
    status: 'Ready',
    lastCalculatedAt: '',
    lastPostedAt: '',
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
  }))
  const notifications = useState<string[]>('payroll-demo-notifications', () => [
    'Two salary changes are scheduled for the next pay run.',
    'One loan application is awaiting approval.',
    'October SSNIT contribution data is ready for review.',
  ])

  function ensurePageRecords(page: PayrollPageDefinition) {
    if (!recordsByPage.value[page.id]) {
      recordsByPage.value[page.id] = buildPayrollPageSeed(page, cycle.value.period)
    }
    return recordsByPage.value[page.id] ?? []
  }

  function setPageRecords(pageId: string, records: PayrollDemoRecord[]) {
    recordsByPage.value = { ...recordsByPage.value, [pageId]: records }
  }

  function calculatePayroll(period: string) {
    const results = baseEmployeeRows(period).filter((row) => row.status !== 'Excluded')
    cycle.value = {
      period,
      status: 'Calculated',
      lastCalculatedAt: new Date().toISOString(),
      lastPostedAt: '',
      totalGross: results.reduce((total, row) => total + Number(row.grossPay), 0),
      totalDeductions: results.reduce((total, row) => total + Number(row.totalDeductions), 0),
      totalNet: results.reduce((total, row) => total + Number(row.netPay), 0),
    }
    recordsByPage.value = {
      ...recordsByPage.value,
      'process-run-payroll': results,
      'process-post-payroll': results,
      'process-email-payslips': results,
      'enquiries-payroll-transactions': results,
      'reports-monthly-pay-register': results,
    }
    return results
  }

  function postPayroll() {
    if (cycle.value.status !== 'Calculated') return false
    cycle.value.status = 'Posted'
    cycle.value.lastPostedAt = new Date().toISOString()
    return true
  }

  function setPeriod(period: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return
    cycle.value = { period, status: 'Ready', lastCalculatedAt: '', lastPostedAt: '', totalGross: 0, totalDeductions: 0, totalNet: 0 }
    recordsByPage.value = { ...recordsByPage.value, 'process-run-payroll': baseEmployeeRows(period) }
  }

  function addNotification(message: string) {
    notifications.value = [message, ...notifications.value].slice(0, 6)
  }

  return {
    employees,
    recordsByPage,
    cycle,
    notifications,
    ensurePageRecords,
    setPageRecords,
    calculatePayroll,
    postPayroll,
    setPeriod,
    addNotification,
  }
}
