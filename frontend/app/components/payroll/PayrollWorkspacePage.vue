<script setup lang="ts">
import { AlertTriangle, ArrowDownToLine, ArrowRight, BadgeCheck, Banknote, CalendarDays, Calculator, Check, ChevronRight, Clock3, Download, Eye, FileCheck2, FileText, LockKeyhole, Mail, Pencil, Plus, RefreshCw, Search, Send, ShieldCheck, Trash2, Upload, Users, Wallet, X } from '@lucide/vue'
import type { PayrollDemoRecord } from '../../features/payroll/demo-data'
import { buildPayrollPageSeed, usePayrollDemoData } from '../../features/payroll/demo-data'
import type { PayrollPageDefinition } from '../../features/payroll/catalog'
import { sectionLabel } from '../../features/payroll/catalog'

interface PayrollColumn {
  key: string
  label: string
  sortable?: boolean
  class?: string
  align?: 'left' | 'right' | 'center'
}

const props = defineProps<{ page: PayrollPageDefinition }>()

const payroll = usePayrollDemoData()
const toast = useToast()
payroll.ensurePageRecords(props.page)

interface FormFieldDefinition {
  key: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'tel' | 'select'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  step?: string
}

const query = ref('')
const statusFilter = ref('All statuses')
const departmentFilter = ref('All departments')
const periodFilter = ref(payroll.cycle.value.period)
const isFormOpen = ref(false)
const formError = ref('')
const editingId = ref<string | null>(null)
const deleteTarget = ref<PayrollDemoRecord | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const fileNotice = ref('')
const importPreview = ref<PayrollDemoRecord[]>([])
const importFeedback = ref('')
const reportGenerated = ref(false)
const actionMessage = ref('')
const payslipsSent = ref(false)
const increasePercent = ref('4.5')
const increaseEffectiveDate = ref('2026-11-01')
const templateBody = useState('payroll-payslip-email-template', () => 'Hello {{employeeName}},\n\nYour payslip for {{period}} is ready. Sign in to the employee portal to view your pay details.\n\nRegards,\nPeople & Culture')
const formState = reactive<Record<string, string>>({})

const isReport = computed(() => props.page.kind === 'report')
const isImport = computed(() => props.page.kind === 'import')
const isApprovalPage = computed(() => props.page.id.includes('approvals'))
const isRunPayroll = computed(() => props.page.id === 'process-run-payroll')
const isPostPayroll = computed(() => props.page.id === 'process-post-payroll')
const isEmailPayslips = computed(() => props.page.id === 'process-email-payslips')
const isEmailTemplate = computed(() => props.page.id === 'process-payslip-email-template')
const isInitialization = computed(() => props.page.id === 'setup-initialize' || props.page.id === 'setup-initialize-pay-month')
const isSalaryIncrease = computed(() => props.page.kind === 'salary-increase')
const isSpecialEarnings = computed(() => props.page.id === 'process-special-earnings')
const isEditable = computed(() => ['resource', 'setup', 'entry'].includes(props.page.kind) || isSpecialEarnings.value)
const tableRecords = computed(() => payroll.recordsByPage.value[props.page.id] ?? [])
const departments = computed(() => [...new Set(payroll.employees.value.map((employee) => employee.department))])
const activeEmployeesCount = computed(() => payroll.employees.value.filter((employee) => employee.status === 'Active').length)
const allStatuses = computed(() => [...new Set(tableRecords.value.map((record) => String(record.status ?? record.importStatus ?? '')))].filter(Boolean))
const reportPeriodLabel = computed(() => {
  const [year, month] = periodFilter.value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year ?? 2026, (month ?? 10) - 1, 1)))
})
const templatePreview = computed(() => templateBody.value.replaceAll('{{employeeName}}', 'Ama Serwaa Owusu').replaceAll('{{period}}', reportPeriodLabel.value))

const fields = computed<FormFieldDefinition[]>(() => {
  const departmentOptions = departments.value.map((department) => ({ value: department, label: department }))
  const commonStatus = [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]
  const categoryOptions = ['Permanent', 'Contract', 'Part-time', 'Temporary'].map((value) => ({ value, label: value }))
  const employeeOptions = payroll.employees.value.map((employee) => ({ value: employee.employeeId, label: `${employee.employeeId} · ${employee.employeeName}` }))

  if (props.page.id === 'people-employee-bio-data') return [
    { key: 'employeeId', label: 'Employee ID', required: true, placeholder: 'EMP-0109' },
    { key: 'firstName', label: 'First name', required: true },
    { key: 'lastName', label: 'Last name', required: true },
    { key: 'otherName', label: 'Other name' },
    { key: 'email', label: 'Work email', type: 'email', required: true },
    { key: 'phone', label: 'Phone number', type: 'tel' },
    { key: 'department', label: 'Department', type: 'select', required: true, options: departmentOptions },
    { key: 'category', label: 'Employment category', type: 'select', required: true, options: categoryOptions },
    { key: 'hireDate', label: 'Hire date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: commonStatus },
  ]
  if (props.page.id === 'people-employee-salary-info') return [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true, options: employeeOptions },
    { key: 'grade', label: 'Salary grade / notch', required: true, placeholder: 'M2 · N4' },
    { key: 'baseSalary', label: 'Monthly basic salary (GHS)', type: 'number', required: true, step: '0.01' },
    { key: 'bank', label: 'Bank and account' },
    { key: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
    { key: 'status', label: 'Status', type: 'select', options: commonStatus },
  ]
  if (props.page.kind === 'resource') {
    if (props.page.id.includes('company-profile')) return [
      { key: 'name', label: 'Organization name', required: true, placeholder: 'Akan Business Services Ltd.' },
      { key: 'code', label: 'Company registration / TIN', required: true },
      { key: 'email', label: 'Payroll contact email', type: 'email' },
      { key: 'phone', label: 'Contact phone', type: 'tel' },
      { key: 'description', label: 'Office address' },
      { key: 'status', label: 'Status', type: 'select', options: commonStatus },
    ]
    if (props.page.id.includes('bank')) return [
      { key: 'code', label: 'Bank / branch code', required: true },
      { key: 'name', label: 'Bank and branch name', required: true },
      { key: 'account', label: 'Account number', required: true },
      { key: 'branch', label: 'Branch' },
      { key: 'status', label: 'Status', type: 'select', options: commonStatus },
    ]
    return [
      { key: 'code', label: 'Reference code', required: true },
      { key: 'name', label: 'Name', required: true },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', type: 'select', options: commonStatus },
    ]
  }
  if (props.page.kind === 'setup') {
    if (props.page.id.includes('tax') || props.page.id.includes('relief')) return [
      { key: 'code', label: 'Tax code', required: true },
      { key: 'name', label: 'Tax rule / relief', required: true },
      { key: 'rate', label: 'Rate (%)', type: 'number', step: '0.01' },
      { key: 'amount', label: 'Monthly limit (GHS)', type: 'number', step: '0.01' },
      { key: 'effectiveDate', label: 'Effective from', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: commonStatus },
    ]
    return [
      { key: 'code', label: 'Setup code', required: true },
      { key: 'name', label: 'Name', required: true },
      { key: 'description', label: 'Description / rule' },
      { key: 'rate', label: 'Rate (%)', type: 'number', step: '0.01' },
      { key: 'amount', label: 'Amount (GHS)', type: 'number', step: '0.01' },
      { key: 'effectiveDate', label: 'Effective date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: commonStatus },
    ]
  }
  if (props.page.kind === 'import') return [
    { key: 'employeeId', label: 'Employee ID', required: true },
    { key: 'employeeName', label: 'Employee name', required: true },
    { key: 'amount', label: 'Amount (GHS)', type: 'number', step: '0.01' },
    { key: 'effectiveDate', label: 'Effective date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: commonStatus },
  ]
  if (props.page.id.includes('loan') || props.page.id.includes('advance')) return [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true, options: employeeOptions },
    { key: 'loanType', label: 'Loan / advance type', required: true },
    { key: 'principal', label: 'Principal (GHS)', type: 'number', required: true, step: '0.01' },
    { key: 'balance', label: 'Outstanding balance (GHS)', type: 'number', step: '0.01' },
    { key: 'instalment', label: 'Monthly deduction (GHS)', type: 'number', step: '0.01' },
    { key: 'effectiveDate', label: 'Effective date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'Pending approval', label: 'Pending approval' }, ...commonStatus] },
  ]
  return [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true, options: employeeOptions },
    { key: 'category', label: 'Category', placeholder: props.page.title },
    { key: 'amount', label: 'Amount (GHS)', type: 'number', required: true, step: '0.01' },
    { key: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
    { key: 'description', label: 'Notes' },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'Draft', label: 'Draft' }, { value: 'Approved', label: 'Approved' }, { value: 'Active', label: 'Active' }] },
  ]
})

const tableColumns = computed<PayrollColumn[]>(() => {
  const keys: Array<{ key: string; label: string; align?: 'left' | 'right' }> = (() => {
    if (isImport.value) return [
      { key: 'file', label: 'Source file' }, { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'importStatus', label: 'Validation' }, { key: 'uploadedAt', label: 'Imported' },
    ]
    if (props.page.id.includes('days-worked')) return [
      { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'departmentName', label: 'Department' }, { key: 'daysWorked', label: 'Days worked', align: 'right' }, { key: 'status', label: 'Status' },
    ]
    if (isRunPayroll.value || isPostPayroll.value || isEmailPayslips.value || props.page.kind === 'report') {
      if (props.page.title.toLowerCase().includes('salary list')) return [
        { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'departmentName', label: 'Department' }, { key: 'grade', label: 'Grade / notch' }, { key: 'baseSalary', label: 'Basic salary', align: 'right' }, { key: 'status', label: 'Status' },
      ]
      if (props.page.title.toLowerCase().includes('loan')) return [
        { key: 'loanNumber', label: 'Loan ref' }, { key: 'employeeName', label: 'Employee' }, { key: 'loanType', label: 'Type' }, { key: 'balance', label: 'Balance', align: 'right' }, { key: 'instalment', label: 'Monthly deduction', align: 'right' }, { key: 'status', label: 'Status' },
      ]
      if (props.page.title.toLowerCase().includes('bank')) return [
        { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'bank', label: 'Bank account' }, { key: 'netPay', label: 'Net pay', align: 'right' }, { key: 'paymentMethod', label: 'Method' }, { key: 'status', label: 'Status' },
      ]
      if (['allowance', 'deduction', 'relief', 'contribution', 'pension', 'provident', 'ssnit', 'paye', 'tax'].some((term) => props.page.title.toLowerCase().includes(term))) return [
        { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'departmentName', label: 'Department' }, { key: 'code', label: 'Type' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'status', label: 'Status' },
      ]
      return [
        { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'departmentName', label: 'Department' }, { key: 'grossPay', label: 'Gross pay', align: 'right' }, { key: 'totalDeductions', label: 'Deductions', align: 'right' }, { key: 'netPay', label: 'Net pay', align: 'right' }, { key: 'status', label: 'Status' },
      ]
    }
    if (props.page.id === 'people-employee-bio-data' || props.page.id.includes('employees-directory') || props.page.title === 'Employees') return [
      { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'category', label: 'Category' }, { key: 'grade', label: 'Grade' }, { key: 'status', label: 'Status' },
    ]
    if (props.page.id.includes('loan') || props.page.id.includes('advance')) return [
      { key: 'loanNumber', label: 'Loan ref' }, { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'loanType', label: 'Type' }, { key: 'principal', label: 'Principal', align: 'right' }, { key: 'balance', label: 'Balance', align: 'right' }, { key: 'status', label: 'Status' },
    ]
    if (props.page.id.includes('salary-info')) return [
      { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'grade', label: 'Grade / notch' }, { key: 'baseSalary', label: 'Basic salary', align: 'right' }, { key: 'status', label: 'Status' },
    ]
    if (props.page.kind === 'resource') {
      if (props.page.id.includes('currency')) return [
        { key: 'code', label: 'Currency' }, { key: 'name', label: 'Currency name' }, { key: 'rate', label: 'Rate to GHS', align: 'right' }, { key: 'status', label: 'Status' },
      ]
      if (props.page.id.includes('bank')) return [
        { key: 'code', label: 'Bank code' }, { key: 'name', label: 'Bank / branch' }, { key: 'branch', label: 'Branch' }, { key: 'account', label: 'Account number' }, { key: 'status', label: 'Status' },
      ]
      if (props.page.id.includes('department')) return [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Department' }, { key: 'employeeCount', label: 'Employees', align: 'right' }, { key: 'description', label: 'Description' }, { key: 'status', label: 'Status' },
      ]
      return [
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'status', label: 'Status' },
      ]
    }
    if (props.page.kind === 'setup') return [
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Name / rule' }, { key: 'description', label: 'Description' }, { key: 'rate', label: 'Rate', align: 'right' }, { key: 'effectiveDate', label: 'Effective date' }, { key: 'status', label: 'Status' },
    ]
    return [
      { key: 'reference', label: 'Reference' }, { key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'departmentName', label: 'Department' }, { key: 'category', label: 'Type' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'effectiveDate', label: 'Effective date' }, { key: 'status', label: isApprovalPage.value ? 'Approval status' : 'Status' },
    ]
  })()
  const table: PayrollColumn[] = keys.map((column) => ({ ...column, sortable: column.key !== 'description' && column.key !== 'file', class: column.align === 'right' ? 'tnum' : undefined }))
  if (isEditable.value && !isInitialization.value && !isApprovalPage.value) table.push({ key: 'actions', label: 'Actions', align: 'right', sortable: false })
  if (isApprovalPage.value) table.push({ key: 'actions', label: 'Review', align: 'right', sortable: false })
  return table
})

const visibleRows = computed(() => {
  const term = query.value.trim().toLowerCase()
  return tableRecords.value.filter((record) => {
    const textMatch = !term || Object.values(record).some((value) => String(value).toLowerCase().includes(term))
    const state = String(record.status ?? record.importStatus ?? '')
    const statusMatch = statusFilter.value === 'All statuses' || state === statusFilter.value
    const departmentMatch = departmentFilter.value === 'All departments' || String(record.department ?? record.departmentName ?? '') === departmentFilter.value
    const periodMatch = !isReport.value || !record.period || record.period === periodFilter.value
    return textMatch && statusMatch && departmentMatch && periodMatch
  })
})

const totalAmount = computed(() => visibleRows.value.reduce((sum, row) => sum + Number(row.amount ?? row.netPay ?? 0), 0))
const payrollGross = computed(() => visibleRows.value.reduce((sum, row) => sum + Number(row.grossPay ?? 0), 0))
const payrollNet = computed(() => visibleRows.value.reduce((sum, row) => sum + Number(row.netPay ?? 0), 0))

function formatGhs(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value ?? '—')
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 2 }).format(amount)
}

function formatCell(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (['grossPay', 'totalDeductions', 'deductions', 'netPay', 'amount', 'baseSalary', 'principal', 'balance', 'instalment'].includes(key)) return formatGhs(value)
  if (key === 'rate') {
    const rate = Number(value).toLocaleString('en-GH', { maximumFractionDigits: 2 })
    return props.page.id.includes('currencies') ? rate : `${rate}%`
  }
  if (['effectiveDate', 'date', 'uploadedAt'].includes(key)) {
    const parsed = new Date(String(value))
    if (!Number.isNaN(parsed.getTime())) return new Intl.DateTimeFormat('en-GH', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed)
  }
  return String(value)
}

function statusTone(value: unknown): 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple' {
  const status = String(value ?? '').toLowerCase()
  if (status.includes('active') || status.includes('approved') || status.includes('complete') || status.includes('posted') || status.includes('valid')) return 'green'
  if (status.includes('pending') || status.includes('review') || status.includes('ready') || status.includes('draft')) return 'amber'
  if (status.includes('reject') || status.includes('excluded') || status.includes('inactive') || status.includes('error')) return 'red'
  if (status.includes('calculated') || status.includes('sent')) return 'blue'
  return 'gray'
}

function openCreate() {
  editingId.value = null
  formError.value = ''
  for (const key of Object.keys(formState)) delete formState[key]
  for (const field of fields.value) formState[field.key] = field.type === 'select' ? (field.options?.[0]?.value ?? '') : ''
  if (props.page.kind === 'entry' || isSpecialEarnings.value) {
    formState.effectiveDate = `${periodFilter.value || payroll.cycle.value.period}-01`
    formState.status ||= 'Draft'
  }
  isFormOpen.value = true
}

function openEdit(record: PayrollDemoRecord) {
  editingId.value = record.id
  formError.value = ''
  for (const key of Object.keys(formState)) delete formState[key]
  for (const field of fields.value) formState[field.key] = String(record[field.key] ?? '')
  isFormOpen.value = true
}

function saveRecord() {
  const missing = fields.value.find((field) => field.required && !String(formState[field.key] ?? '').trim())
  if (missing) {
    formError.value = `Enter ${missing.label.toLowerCase()} to continue.`
    return
  }
  const values: Record<string, string | number | boolean> = {}
  for (const field of fields.value) {
    const value = String(formState[field.key] ?? '').trim()
    if (!value) continue
    values[field.key] = field.type === 'number' ? Number(value) : value
  }
  if (values.employeeId && typeof values.employeeId === 'string') {
    const employee = payroll.employees.value.find((item) => item.employeeId === values.employeeId)
    if (employee) {
      values.employeeName = values.employeeName || employee.employeeName
      values.department = values.department || employee.department
      values.departmentName = values.departmentName || employee.department
      values.name = values.name || employee.employeeName
      values.code = values.code || employee.employeeId
    }
  }
  if (values.firstName || values.lastName) {
    values.employeeName = [values.firstName, values.otherName, values.lastName].filter(Boolean).join(' ')
    values.name = values.employeeName
    values.code = values.employeeId || ''
  }
  if (values.name && !values.description) values.description = `${values.name} · ${props.page.title}`
  const id = editingId.value ?? `${props.page.id}-${Date.now()}`
  const saved: PayrollDemoRecord = { ...values, id, status: values.status || 'Active' }
  const next = editingId.value
    ? tableRecords.value.map((record) => record.id === editingId.value ? saved : record)
    : [saved, ...tableRecords.value]
  payroll.setPageRecords(props.page.id, next)
  isFormOpen.value = false
  toast.success(editingId.value ? 'Record updated' : 'Record added', `${props.page.title} is saved in this browser preview.`)
}

function deleteRecord() {
  if (!deleteTarget.value) return
  payroll.setPageRecords(props.page.id, tableRecords.value.filter((record) => record.id !== deleteTarget.value?.id))
  toast.success('Record removed', 'The demo record has been removed from this browser preview.')
  deleteTarget.value = null
}

function reviewRecord(record: PayrollDemoRecord, status: 'Approved' | 'Rejected') {
  payroll.setPageRecords(props.page.id, tableRecords.value.map((item) => item.id === record.id ? { ...item, status } : item))
  toast.success(`Request ${status.toLowerCase()}`, `${String(record.employeeName ?? record.name ?? record.employeeId ?? 'Record')} updated in the local preview.`)
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(filename: string, columns: PayrollColumn[], rows: PayrollDemoRecord[]) {
  if (!import.meta.client) return
  const dataColumns = columns.filter((column) => column.key !== 'actions')
  const content = [
    dataColumns.map((column) => csvEscape(column.label)).join(','),
    ...rows.map((row) => dataColumns.map((column) => csvEscape(row[column.key])).join(',')),
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  toast.success('CSV downloaded', `${rows.length} local preview rows exported.`)
}

function exportRows() {
  const safeName = props.page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  downloadCsv(`${safeName}-${periodFilter.value}.csv`, tableColumns.value, visibleRows.value)
}

function generateReport() {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodFilter.value)) {
    toast.error('Select a valid payroll period', 'Choose the month to use for this report.')
    return
  }
  payroll.setPageRecords(props.page.id, buildPayrollPageSeed(props.page, periodFilter.value))
  reportGenerated.value = true
  actionMessage.value = `${reportPeriodLabel.value} report is ready. Results are based on demo data.`
  toast.success('Report generated', `${visibleRows.value.length} preview rows for ${reportPeriodLabel.value}.`)
}

function calculatePayroll() {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodFilter.value)) {
    toast.error('Select a valid payroll period', 'Choose the month to calculate.')
    return
  }
  const results = payroll.calculatePayroll(periodFilter.value)
  reportGenerated.value = true
  actionMessage.value = `Calculated ${results.length} employee pay lines for ${reportPeriodLabel.value}. No live posting has occurred.`
  toast.success('Payroll calculated', `${formatGhs(payroll.cycle.value.totalNet)} projected net pay · local preview only.`)
}

function postPayroll() {
  if (!payroll.postPayroll()) {
    toast.error('Calculation required', 'Calculate and review this pay period before posting the local preview.')
    return
  }
  actionMessage.value = 'The pay run is marked as posted in this browser preview only. No ledger journal or bank file was created.'
  toast.success('Preview run posted', 'No General Ledger, tax or bank service was contacted.')
}

function sendPayslips() {
  if (payroll.cycle.value.status !== 'Posted') {
    toast.error('Pay run not posted', 'Post the preview pay run before simulating payslip delivery.')
    return
  }
  payslipsSent.value = true
  actionMessage.value = `${payroll.employees.value.filter((employee) => employee.status === 'Active').length} payslip notices marked sent in the preview. No email was sent.`
  toast.success('Payslip delivery simulated', 'No email service is connected; no messages were sent.')
}

function saveTemplate() {
  toast.success('Template saved', 'The preview template is stored in this browser session only.')
}

function initializePeriod() {
  if (!/^\d{4}-\d{2}$/.test(periodFilter.value)) {
    toast.error('Select a valid pay month', 'Choose the payroll period to initialize.')
    return
  }
  payroll.setPeriod(periodFilter.value)
  payroll.ensurePageRecords(props.page)
  actionMessage.value = `${reportPeriodLabel.value} is selected as the active payroll period.`
  toast.success('Payroll period initialized', `${reportPeriodLabel.value} is active in this browser preview.`)
}

function applySalaryIncrease() {
  const value = Number(increasePercent.value)
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    toast.error('Enter a valid increase', 'The preview rate must be greater than 0 and no more than 100 percent.')
    return
  }
  const impact = payroll.employees.value.filter((employee) => employee.status === 'Active').reduce((total, employee) => total + employee.baseSalary * value / 100, 0)
  actionMessage.value = `${value}% increase preview prepared for ${payroll.employees.value.filter((employee) => employee.status === 'Active').length} employees. Monthly gross impact: ${formatGhs(impact)}.`
  toast.success('Salary change previewed', 'No employee salary records were changed.')
}

function parseCsv(text: string, filename: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = lines[0]!.split(',').map((header) => header.trim().replace(/^"|"$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ''))
  return lines.slice(1, 21).map((line, index) => {
    const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    const data: Record<string, string> = {}
    headers.forEach((header, headerIndex) => { data[header] = cells[headerIndex] ?? '' })
    const employeeId = data.employeeid || data.staffid || data.code || `IMPORT-${String(index + 1).padStart(3, '0')}`
    const employeeName = data.employeename || data.name || data.employee || 'New employee'
    const amountValue = Number(data.amount || data.salary || data.basicpay || 0)
    return {
      id: `csv-${props.page.id}-${Date.now()}-${index}`,
      file: filename,
      employeeId,
      employeeName,
      code: employeeId,
      name: employeeName,
      department: data.department || 'Unassigned',
      departmentName: data.department || 'Unassigned',
      amount: Number.isFinite(amountValue) ? amountValue : 0,
      effectiveDate: data.effectivedate || data.date || `${periodFilter.value}-01`,
      status: 'Validated',
      importStatus: 'Validated',
      uploadedAt: new Date().toISOString().slice(0, 10),
    } satisfies PayrollDemoRecord
  })
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  selectedFileName.value = file.name
  importFeedback.value = ''
  if (file.size > 10 * 1024 * 1024) {
    importPreview.value = []
    fileNotice.value = 'Files must be 10 MB or smaller.'
    return
  }
  if (file.name.toLowerCase().endsWith('.csv')) {
    const parsed = parseCsv(await file.text(), file.name)
    if (!parsed.length) {
      importPreview.value = []
      fileNotice.value = 'The CSV needs a header row and at least one data row.'
      importFeedback.value = 'No rows could be previewed.'
      return
    }
    importPreview.value = parsed
    fileNotice.value = `${parsed.length} rows parsed locally. Confirm column mapping and validation before applying the preview.`
    return
  }
  importPreview.value = tableRecords.value.slice(0, 5).map((record) => ({ ...record, file: file.name }))
  fileNotice.value = 'Workbook staged. This preview does not parse Excel files yet; sample rows are shown and no workbook data will be represented as imported.'
}

function simulateImport() {
  if (!importPreview.value.length) {
    toast.error('No import preview', 'Choose a CSV file or prepare a local sample preview first.')
    return
  }
  const additions = importPreview.value.map((record) => ({ ...record, status: 'Imported', importStatus: 'Imported' }))
  const combined = [...additions, ...tableRecords.value.filter((existing) => !additions.some((addition) => addition.id === existing.id))]
  payroll.setPageRecords(props.page.id, combined)
  importFeedback.value = `${additions.length} rows marked imported in the local preview.`
  toast.success('Demo import complete', 'No server records were changed.')
}

function downloadImportTemplate() {
  if (!import.meta.client) return
  const content = 'employeeId,employeeName,department,amount,effectiveDate\r\nEMP-0109,Sample Employee,Operations,250.00,2026-10-01'
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-template.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success('CSV template downloaded', 'Use the sample headings when preparing a local import preview.')
}

function openFilePicker() {
  importInput.value?.click()
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="page.title" :subtitle="page.description" :icon="page.icon">
      <BaseButton to="/payroll" variant="secondary" size="sm"><ArrowRight :size="14" class="rotate-180" /> Dashboard</BaseButton>
      <BaseButton v-if="isEditable && !isInitialization && !isApprovalPage" size="sm" @click="openCreate"><Plus :size="15" /> Add {{ page.title.toLowerCase().includes('employee') ? 'employee' : 'record' }}</BaseButton>
      <BaseButton v-if="isReport || isEditable || isImport" variant="secondary" size="sm" @click="exportRows"><Download :size="14" /> Export CSV</BaseButton>
    </PageHeader>

    <section class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/25" aria-label="Local preview notice">
      <LockKeyhole :size="16" class="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
      <div><p class="text-xs font-semibold text-amber-950 dark:text-amber-200">Local preview · no payroll API connected</p><p class="mt-1 text-[11px] leading-5 text-amber-900/80 dark:text-amber-200/75">Edits, approvals, imports and workflow actions update this browser preview only. This screen is guided by <span class="font-medium">{{ page.source }}</span>; production records and external payments are not connected.</p></div>
    </section>

    <section v-if="isReport" class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5" aria-label="Report filters">
      <div class="flex flex-wrap items-end gap-3">
        <FormField label="Payroll period"><TextInput v-model="periodFilter" type="month" /></FormField>
        <FormField label="Department"><SelectInput v-model="departmentFilter" :options="[{ value: 'All departments', label: 'All departments' }, ...departments.map((department) => ({ value: department, label: department }))]" /></FormField>
        <FormField label="Employee or reference"><div class="relative"><Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><TextInput v-model="query" placeholder="Search report results…" /></div></FormField>
        <BaseButton @click="generateReport"><FileText :size="15" /> Generate report</BaseButton>
        <span v-if="reportGenerated" class="pb-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"><BadgeCheck :size="14" class="mr-1 inline" /> {{ actionMessage || 'Preview report is ready.' }}</span>
      </div>
    </section>

    <section v-if="isInitialization" class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div class="flex items-start gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><CalendarDays :size="18" /></span><div><h2 class="text-base font-semibold text-ink">Set the active payroll month</h2><p class="mt-1 text-xs leading-5 text-ink-faint">Choose the period used by payroll entry, imports and processing previews.</p></div></div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2"><FormField label="Payroll month" required><TextInput v-model="periodFilter" type="month" /></FormField><div class="rounded-lg border border-line bg-canvas/60 px-3 py-2.5"><p class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Current workspace period</p><p class="mt-1 text-sm font-semibold text-ink">{{ reportPeriodLabel }}</p></div></div>
        <div class="mt-5 flex flex-wrap gap-2"><BaseButton @click="initializePeriod"><Check :size="15" /> Initialize period</BaseButton><BaseButton variant="secondary" @click="periodFilter = payroll.cycle.value.period"><RefreshCw :size="14" /> Use current period</BaseButton></div>
        <p v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{{ actionMessage }}</p>
      </article>
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6"><h2 class="text-sm font-semibold text-ink">Before you initialize</h2><ul class="mt-4 space-y-3 text-xs leading-5 text-ink-soft"><li class="flex gap-2"><Check :size="15" class="mt-0.5 shrink-0 text-emerald-600" />Confirm payroll setup tables and statutory rates are current.</li><li class="flex gap-2"><Check :size="15" class="mt-0.5 shrink-0 text-emerald-600" />Check employee status and effective-dated salary records.</li><li class="flex gap-2"><AlertTriangle :size="15" class="mt-0.5 shrink-0 text-amber-600" />This action changes only the local preview period; no live payroll is opened.</li></ul></article>
    </section>

    <section v-if="isRunPayroll" class="space-y-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article class="rounded-xl border border-line bg-surface p-4 shadow-sm"><div class="flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300"><Users :size="17" /></span><div><p class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Employees included</p><p class="mt-1 text-lg font-bold text-ink">{{ tableRecords.filter((record) => record.status !== 'Excluded').length }}</p></div></div></article>
        <article class="rounded-xl border border-line bg-surface p-4 shadow-sm"><div class="flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"><Banknote :size="17" /></span><div><p class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Gross pay preview</p><p class="mt-1 text-lg font-bold text-ink">{{ formatGhs(payrollGross) }}</p></div></div></article>
        <article class="rounded-xl border border-line bg-surface p-4 shadow-sm"><div class="flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/35 dark:text-violet-300"><Wallet :size="17" /></span><div><p class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Net pay preview</p><p class="mt-1 text-lg font-bold text-ink">{{ formatGhs(payrollNet) }}</p></div></div></article>
      </div>
      <div class="flex flex-col justify-between gap-4 rounded-xl border border-primary/15 bg-primary-soft/40 p-4 sm:flex-row sm:items-center sm:p-5"><div><p class="text-sm font-semibold text-ink">Calculate {{ reportPeriodLabel }} payroll</p><p class="mt-1 text-xs leading-5 text-ink-faint">Run local preview calculations and review employee-level results before posting.</p></div><div class="flex flex-wrap gap-2"><BaseButton variant="secondary" @click="periodFilter = payroll.cycle.value.period"><RefreshCw :size="14" /> Reset period</BaseButton><BaseButton @click="calculatePayroll"><Calculator :size="15" /> Calculate payroll</BaseButton></div></div>
      <p v-if="actionMessage" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">{{ actionMessage }}</p>
    </section>

    <section v-if="isPostPayroll" class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6"><div class="flex items-start justify-between gap-4"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Final review</p><h2 class="mt-1 text-lg font-semibold text-ink">Post {{ reportPeriodLabel }} pay run</h2><p class="mt-1 max-w-xl text-xs leading-5 text-ink-faint">Confirm the calculated preview and mark the local run as posted. No bank file, payslip or ledger journal will be produced.</p></div><span class="rounded-full border px-2.5 py-1 text-[10px] font-semibold" :class="payroll.cycle.value.status === 'Calculated' ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-300' : payroll.cycle.value.status === 'Posted' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300'">{{ payroll.cycle.value.status }}</span></div>
        <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div class="rounded-lg bg-canvas/60 p-3"><p class="text-[10px] text-ink-faint">Gross payroll</p><p class="mt-1 text-sm font-semibold text-ink">{{ formatGhs(payroll.cycle.value.totalGross || payrollGross) }}</p></div><div class="rounded-lg bg-canvas/60 p-3"><p class="text-[10px] text-ink-faint">Total deductions</p><p class="mt-1 text-sm font-semibold text-ink">{{ formatGhs(payroll.cycle.value.totalDeductions || (payrollGross - payrollNet)) }}</p></div><div class="rounded-lg bg-canvas/60 p-3"><p class="text-[10px] text-ink-faint">Net pay</p><p class="mt-1 text-sm font-semibold text-ink">{{ formatGhs(payroll.cycle.value.totalNet || payrollNet) }}</p></div></div>
        <div class="mt-5 flex flex-wrap items-center gap-3"><BaseButton :disabled="payroll.cycle.value.status !== 'Calculated'" @click="postPayroll"><ShieldCheck :size="15" /> Post local preview</BaseButton><NuxtLink v-if="payroll.cycle.value.status === 'Ready'" to="/payroll/process/run-payroll" class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Calculate payroll first <ChevronRight :size="14" /></NuxtLink></div><p v-if="actionMessage" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{{ actionMessage }}</p>
      </article>
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm"><h2 class="text-sm font-semibold text-ink">Posting checks</h2><div class="mt-4 space-y-3"><p v-for="check in ['Payroll period is initialized', 'Employee pay values are calculated', 'Exceptions are reviewed', 'Local posting confirmation']" :key="check" class="flex items-center gap-2 text-xs text-ink-soft"><Check :size="15" class="text-emerald-600" />{{ check }}</p></div><div class="mt-5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[11px] leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200"><AlertTriangle :size="14" class="mr-1 inline" />Preview posting does not issue payments or write to the General Ledger.</div></article>
    </section>

    <section v-if="isEmailPayslips" class="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Employee communication</p><h2 class="mt-1 text-lg font-semibold text-ink">Prepare payslip delivery</h2><p class="mt-1 max-w-2xl text-xs leading-5 text-ink-faint">Review recipients and preview delivery status. The preview never sends email or attaches a real payslip.</p></div><Badge :tone="payroll.cycle.value.status === 'Posted' ? 'green' : 'amber'" dot size="sm">{{ payroll.cycle.value.status === 'Posted' ? 'Ready to simulate' : 'Pay run not posted' }}</Badge></div>
      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div class="rounded-lg border border-line p-3"><p class="text-[10px] text-ink-faint">Recipients</p><p class="mt-1 text-lg font-bold text-ink">{{ payroll.employees.value.filter((employee) => employee.status === 'Active').length }}</p></div><div class="rounded-lg border border-line p-3"><p class="text-[10px] text-ink-faint">Delivery channel</p><p class="mt-1 text-sm font-semibold text-ink">Email · demo mode</p></div><div class="rounded-lg border border-line p-3"><p class="text-[10px] text-ink-faint">Current status</p><p class="mt-1 text-sm font-semibold text-ink">{{ payslipsSent ? 'Simulated' : 'Not sent' }}</p></div></div>
      <div class="mt-5 flex flex-wrap gap-2"><BaseButton :disabled="payroll.cycle.value.status !== 'Posted' || payslipsSent" @click="sendPayslips"><Send :size="14" /> {{ payslipsSent ? 'Preview marked sent' : 'Simulate payslip delivery' }}</BaseButton><BaseButton to="/payroll/process/payslip-email-template" variant="secondary"><Mail :size="14" /> Review email template</BaseButton></div>
      <p class="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11px] leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">No email addresses are contacted and no employee payslip is sent. This action only updates a local demo state.</p>
      <p v-if="actionMessage" class="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">{{ actionMessage }}</p>
    </section>

    <section v-if="isEmailTemplate" class="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm"><div class="flex items-start gap-3"><span class="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Mail :size="17" /></span><div><h2 class="text-sm font-semibold text-ink">Payslip email message</h2><p class="mt-1 text-xs leading-5 text-ink-faint">Edit the local message template and preview the supported placeholders.</p></div></div><FormField class="mt-5" label="Email body"><textarea v-model="templateBody" rows="10" class="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-6 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900" /></FormField><div class="mt-4 flex gap-2"><BaseButton @click="saveTemplate"><Check :size="14" /> Save local template</BaseButton><BaseButton variant="secondary" @click="templateBody = 'Hello {{employeeName}},\n\nYour payslip for {{period}} is ready. Sign in to the employee portal to view your pay details.\n\nRegards,\nPeople & Culture'"><RefreshCw :size="14" /> Reset</BaseButton></div></article>
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm"><div class="flex items-center gap-2"><Eye :size="16" class="text-primary" /><h2 class="text-sm font-semibold text-ink">Message preview</h2></div><div class="mt-4 whitespace-pre-wrap rounded-lg border border-line bg-canvas/55 p-4 text-xs leading-6 text-ink-soft">{{ templatePreview }}</div><div class="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-[11px] leading-5 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><FileText :size="14" class="mr-1 inline" />In production, the payslip PDF would be attached after payroll posting and the messaging service has been connected.</div></article>
    </section>

    <section v-if="isSalaryIncrease" class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Salary change preview</p><h2 class="mt-1 text-base font-semibold text-ink">Prepare {{ page.title.toLowerCase() }}</h2><p class="mt-1 text-xs leading-5 text-ink-faint">Preview the change before review. Applying changes does not update employee salary records in this demo.</p></div><span class="rounded-lg bg-primary-soft p-2 text-primary"><ArrowRight :size="17" /></span></div>
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[160px_190px_1fr_auto] sm:items-end"><FormField label="Increase (%)" required><TextInput v-model="increasePercent" type="number" min="0.01" max="100" step="0.1" /></FormField><FormField label="Effective date" required><TextInput v-model="increaseEffectiveDate" type="date" /></FormField><div class="rounded-lg bg-canvas/60 px-3 py-2.5"><p class="text-[10px] text-ink-faint">Affected employees</p><p class="mt-1 text-sm font-semibold text-ink">{{ activeEmployeesCount }}</p></div><BaseButton @click="applySalaryIncrease"><Calculator :size="14" /> Preview increase</BaseButton></div>
      <p v-if="actionMessage" class="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{{ actionMessage }}</p>
    </section>

    <section v-if="isImport" class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6"><div class="flex items-start gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300"><Upload :size="18" /></span><div><h2 class="text-base font-semibold text-ink">Upload payroll data</h2><p class="mt-1 text-xs leading-5 text-ink-faint">Stage a CSV file to inspect and validate rows before a local demo import.</p></div></div><input ref="importInput" type="file" accept=".csv,.xlsx,.xls" class="sr-only" @change="handleFileSelected"><button type="button" class="mt-5 flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-canvas/45 px-5 py-6 text-center transition hover:border-primary/40 hover:bg-primary-soft/20" @click="openFilePicker"><span class="grid h-11 w-11 place-items-center rounded-full bg-surface text-primary shadow-sm"><Upload :size="19" /></span><span class="mt-3 text-sm font-semibold text-ink">{{ selectedFileName || 'Choose a file to preview' }}</span><span class="mt-1 text-[11px] text-ink-faint">CSV parsing is local · Excel files can be staged only · Max 10 MB</span></button><p v-if="fileNotice" class="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[11px] leading-5 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-200">{{ fileNotice }}</p><div class="mt-4 flex flex-wrap gap-2"><BaseButton variant="secondary" size="sm" @click="downloadImportTemplate"><ArrowDownToLine :size="14" /> Download CSV template</BaseButton><BaseButton size="sm" :disabled="!importPreview.length" @click="simulateImport"><Check :size="14" /> Simulate local import</BaseButton></div><p v-if="importFeedback" class="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">{{ importFeedback }}</p></article>
      <article class="rounded-xl border border-line bg-surface p-5 shadow-sm"><h2 class="text-sm font-semibold text-ink">Import checklist</h2><div class="mt-4 space-y-3"><p v-for="item in ['Use the provided CSV header names', 'Check employee identifiers and required values', 'Review validation warnings before importing', 'Confirm that the selected period is correct']" :key="item" class="flex gap-2 text-xs leading-5 text-ink-soft"><Check :size="14" class="mt-0.5 shrink-0 text-emerald-600" />{{ item }}</p></div><div class="mt-5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[11px] leading-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200"><AlertTriangle :size="14" class="mr-1 inline" />Files are not uploaded to a server or stored outside this browser session. The local importer reads CSV only.</div></article>
    </section>

    <section v-if="isImport && importPreview.length" class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"><div class="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5"><div><h2 class="text-sm font-semibold text-ink">File preview</h2><p class="mt-1 text-[11px] text-ink-faint">{{ importPreview.length }} staged rows · no changes applied yet</p></div><Badge tone="blue" size="sm">Needs review</Badge></div><DataTable :columns="tableColumns" :rows="importPreview" empty="No file rows to preview."><template #cell="{ col, row, value }"><span v-if="col.key === 'status' || col.key === 'importStatus'"><Badge :tone="statusTone(value)" dot size="sm">{{ value }}</Badge></span><span v-else>{{ formatCell(col.key, value ?? row[col.key]) }}</span></template></DataTable></section>

    <section v-if="!isInitialization && !isRunPayroll && !isPostPayroll && !isEmailPayslips && !isEmailTemplate && !isSalaryIncrease" class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <header class="flex flex-col justify-between gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div><h2 class="text-sm font-semibold text-ink">{{ isReport ? 'Report results' : isImport ? 'Import register' : isApprovalPage ? 'Approval queue' : 'Records' }}</h2><p class="mt-1 text-[11px] text-ink-faint">{{ visibleRows.length }} of {{ tableRecords.length }} records<span v-if="isReport"> · {{ reportPeriodLabel }}</span></p></div>
        <div class="flex flex-wrap items-center gap-2"><label class="relative block min-w-[180px] flex-1 sm:max-w-[260px]"><Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input v-model="query" type="search" :placeholder="isReport ? 'Search report results…' : 'Search records…'" class="h-9 w-full rounded-lg border border-line bg-canvas/50 pl-9 pr-3 text-xs text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-2 focus:ring-primary/15"></label><select v-model="statusFilter" class="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink-soft outline-none focus:border-primary/40"><option>All statuses</option><option v-for="status in allStatuses" :key="status">{{ status }}</option></select></div>
      </header>
      <DataTable :columns="tableColumns" :rows="visibleRows" :sort-key="'employeeName'" empty="No records match these filters.">
        <template #cell="{ col, row, value }">
          <div v-if="col.key === 'actions' && isApprovalPage" class="flex justify-end gap-1"><button type="button" class="rounded-md p-1.5 text-emerald-700 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/40" :aria-label="`Approve ${row.employeeName || row.name || 'record'}`" title="Approve" @click="reviewRecord(row, 'Approved')"><Check :size="14" /></button><button type="button" class="rounded-md p-1.5 text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30" :aria-label="`Reject ${row.employeeName || row.name || 'record'}`" title="Reject" @click="reviewRecord(row, 'Rejected')"><X :size="14" /></button></div>
          <div v-else-if="col.key === 'actions'" class="flex justify-end gap-1"><button type="button" class="rounded-md p-1.5 text-ink-faint transition hover:bg-canvas hover:text-primary" :aria-label="`Edit ${row.name || row.employeeName || 'record'}`" title="Edit record" @click="openEdit(row)"><Pencil :size="14" /></button><button type="button" class="rounded-md p-1.5 text-ink-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" :aria-label="`Delete ${row.name || row.employeeName || 'record'}`" title="Delete record" @click="deleteTarget = row"><Trash2 :size="14" /></button></div>
          <span v-else-if="col.key === 'status' || col.key === 'importStatus'"><Badge :tone="statusTone(value)" dot size="sm">{{ value || '—' }}</Badge></span>
          <span v-else-if="col.key === 'employeeName' || col.key === 'name'" class="font-medium text-ink">{{ formatCell(col.key, value) }}</span>
          <span v-else>{{ formatCell(col.key, value) }}</span>
        </template>
      </DataTable>
      <div v-if="isRunPayroll || isReport" class="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/45 px-4 py-3 text-[11px] sm:px-5"><span class="text-ink-faint">{{ isRunPayroll ? 'Preview totals · GHS' : 'Report subtotal · demo records' }}</span><span class="flex flex-wrap gap-x-5 gap-y-1 font-semibold text-ink"><span v-if="isRunPayroll || isReport">Gross {{ formatGhs(payrollGross) }}</span><span>Deductions {{ formatGhs(visibleRows.reduce((sum, row) => sum + Number(row.totalDeductions ?? row.deductions ?? 0), 0)) }}</span><span>Net {{ formatGhs(payrollNet) }}</span></span></div>
      <div v-if="isApprovalPage" class="flex items-center gap-2 border-t border-line bg-canvas/45 px-4 py-3 text-[11px] text-ink-faint sm:px-5"><ShieldCheck :size="14" class="text-primary" />Approvals are local preview states and do not authorize a live payment.</div>
      <div v-if="isImport" class="flex items-center gap-2 border-t border-line bg-canvas/45 px-4 py-3 text-[11px] text-ink-faint sm:px-5"><FileCheck2 :size="14" class="text-primary" />Imported rows are stored in this browser preview only.</div>
    </section>

    <section v-if="isRunPayroll || isPostPayroll" class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"><div class="flex flex-col justify-between gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:px-5"><div><h2 class="text-sm font-semibold text-ink">Employee pay lines</h2><p class="mt-1 text-[11px] text-ink-faint">Review amounts and employment status before progressing the local workflow.</p></div><FormField v-if="isRunPayroll" label="Period"><TextInput v-model="periodFilter" type="month" /></FormField><span v-else class="text-xs font-medium text-ink-soft">{{ reportPeriodLabel }}</span></div><DataTable :columns="tableColumns" :rows="visibleRows" empty="No employee pay lines are available."><template #cell="{ col, value }"><span v-if="col.key === 'status'"><Badge :tone="statusTone(value)" dot size="sm">{{ value }}</Badge></span><span v-else>{{ formatCell(col.key, value) }}</span></template></DataTable></section>

    <section v-if="isEmailPayslips" class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"><div class="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5"><div><h2 class="text-sm font-semibold text-ink">Recipient list</h2><p class="mt-1 text-[11px] text-ink-faint">Active employees · demo contact information</p></div><Badge tone="gray" size="sm">No email sent</Badge></div><DataTable :columns="[{ key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'email', label: 'Email address' }, { key: 'netPay', label: 'Net pay', align: 'right' }, { key: 'status', label: 'Recipient status' }]" :rows="tableRecords.filter((record) => record.status !== 'Excluded')"><template #cell="{ col, value }"><span v-if="col.key === 'status'"><Badge :tone="payslipsSent ? 'green' : 'gray'" dot size="sm">{{ payslipsSent ? 'Simulated' : 'Queued' }}</Badge></span><span v-else>{{ formatCell(col.key, value) }}</span></template></DataTable></section>

    <section v-if="isSalaryIncrease" class="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"><div class="border-b border-line px-4 py-4 sm:px-5"><h2 class="text-sm font-semibold text-ink">Employees in preview scope</h2><p class="mt-1 text-[11px] text-ink-faint">Only active employees are included in the illustrative impact summary.</p></div><DataTable :columns="[{ key: 'employeeId', label: 'Employee ID' }, { key: 'employeeName', label: 'Employee' }, { key: 'department', label: 'Department' }, { key: 'grade', label: 'Grade' }, { key: 'baseSalary', label: 'Current monthly salary', align: 'right' }]" :rows="payroll.employees.value.filter((employee) => employee.status === 'Active')"><template #cell="{ col, value }"><span>{{ formatCell(col.key, value) }}</span></template></DataTable></section>

    <section v-if="actionMessage && !isReport && !isRunPayroll && !isPostPayroll && !isEmailPayslips && !isSalaryIncrease && !isInitialization" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">{{ actionMessage }}</section>

    <ModalShell :open="isFormOpen" :title="editingId ? `Edit ${page.title.toLowerCase()}` : `Add ${page.title.toLowerCase()}`" :subtitle="`Local preview · ${sectionLabel(page.section)}`" width="max-w-2xl" @close="isFormOpen = false">
      <form class="space-y-4" @submit.prevent="saveRecord">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2"><FormField v-for="field in fields" :key="field.key" :label="field.label" :required="field.required"><SelectInput v-if="field.type === 'select'" :model-value="formState[field.key]" :options="field.options ?? []" :placeholder="`Select ${field.label.toLowerCase()}`" @update:model-value="formState[field.key] = String($event)" /><TextInput v-else :model-value="formState[field.key]" :type="field.type ?? 'text'" :placeholder="field.placeholder" :step="field.step" @update:model-value="formState[field.key] = String($event)" /></FormField></div>
        <p v-if="formError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{{ formError }}</p>
        <p class="text-[11px] leading-5 text-ink-faint">Saving updates this browser's demo data only. No live payroll records are created.</p>
        <div class="flex justify-end gap-2"><BaseButton variant="secondary" @click="isFormOpen = false">Cancel</BaseButton><BaseButton type="submit"><Check :size="14" /> {{ editingId ? 'Save changes' : 'Add record' }}</BaseButton></div>
      </form>
    </ModalShell>

    <ConfirmDialog :open="Boolean(deleteTarget)" title="Delete preview record?" message="This record will be removed from the current browser preview. No live payroll data is affected." confirm-label="Delete record" tone="danger" @cancel="deleteTarget = null" @confirm="deleteRecord" />
  </div>
</template>
