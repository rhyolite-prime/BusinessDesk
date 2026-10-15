import {
  Banknote,
  BookOpenCheck,
  Boxes,
  Factory,
  Files,
  FolderKanban,
  Handshake,
  Home,
  PackageCheck,
  Printer,
  ReceiptText,
  School,
  ShoppingCart,
  Truck,
  UsersRound,
  WalletCards,
} from '@lucide/vue'
import type { Component } from 'vue'

export type ModuleDomain = 'Finance' | 'Operations' | 'People & education' | 'Industry solutions'
export type ModuleReadiness = 'live' | 'preview'

export interface ModuleMetric {
  label: string
  context: string
}

export interface ModuleWorkflow {
  title: string
  description: string
}

export interface BusinessModule {
  id: string
  name: string
  domain: ModuleDomain
  category: string
  description: string
  readiness: ModuleReadiness
  icon: Component
  metrics: ModuleMetric[]
  workflows: ModuleWorkflow[]
}

/**
 * The module manager and workspace landing pages use one catalog so every
 * listed module has a stable route and consistent ERP terminology.
 */
export const businessModules: BusinessModule[] = [
  {
    id: 'general-ledger',
    name: 'General Ledger',
    domain: 'Finance',
    category: 'Finance & accounting',
    description: 'Manage the chart of accounts, journal entries, account balances, and financial reporting.',
    readiness: 'live',
    icon: BookOpenCheck,
    metrics: [],
    workflows: [],
  },
  {
    id: 'school-information-system',
    name: 'School Information System',
    domain: 'People & education',
    category: 'Education operations',
    description: 'Coordinate admissions, student records, classes, attendance, assessments, and school communications.',
    readiness: 'preview',
    icon: School,
    metrics: [
      { label: 'Enrolled students', context: 'Student record summary' },
      { label: 'Class attendance', context: 'Attendance tracking' },
      { label: 'Assessment cycles', context: 'Exams and results' },
    ],
    workflows: [
      { title: 'Admissions & enrolment', description: 'Manage student intake and maintain complete learner records.' },
      { title: 'Classes & attendance', description: 'Organize class groups, timetables, and daily attendance.' },
      { title: 'Assessments & results', description: 'Coordinate examinations, grading, and academic reporting.' },
    ],
  },
  {
    id: 'payroll',
    name: 'Payroll',
    domain: 'Finance',
    category: 'People & compensation',
    description: 'Prepare payroll cycles, employee compensation, statutory deductions, payslips, and approvals.',
    readiness: 'preview',
    icon: Banknote,
    metrics: [
      { label: 'Employees in payroll', context: 'Compensation records' },
      { label: 'Pay runs', context: 'Payroll cycle status' },
      { label: 'Pending approvals', context: 'Payroll review queue' },
    ],
    workflows: [
      { title: 'Payroll runs', description: 'Prepare, review, and close recurring compensation cycles.' },
      { title: 'Deductions & benefits', description: 'Maintain employee deductions and compensation components.' },
      { title: 'Payslips & approvals', description: 'Review payroll changes and provide employee pay statements.' },
    ],
  },
  {
    id: 'print-intelligence',
    name: 'Print Intelligence',
    domain: 'Operations',
    category: 'Workplace operations',
    description: 'Track printer health, consumables, service needs, usage patterns, and print costs across the organization.',
    readiness: 'preview',
    icon: Printer,
    metrics: [
      { label: 'Devices monitored', context: 'Printer fleet overview' },
      { label: 'Consumables', context: 'Supply levels and usage' },
      { label: 'Print costs', context: 'Usage and cost reporting' },
    ],
    workflows: [
      { title: 'Device fleet', description: 'Maintain a view of printers, locations, and device status.' },
      { title: 'Consumables & service', description: 'Coordinate supply replenishment and maintenance needs.' },
      { title: 'Usage & cost reports', description: 'Review print volumes and departmental cost allocation.' },
    ],
  },
  {
    id: 'accounts-payable',
    name: 'Accounts Payable',
    domain: 'Finance',
    category: 'Finance & procurement',
    description: 'Manage supplier records, bills, approval routing, payment schedules, and payables visibility.',
    readiness: 'preview',
    icon: ReceiptText,
    metrics: [
      { label: 'Supplier balances', context: 'Open payables summary' },
      { label: 'Bills for approval', context: 'Invoice review queue' },
      { label: 'Scheduled payments', context: 'Payment run status' },
    ],
    workflows: [
      { title: 'Supplier invoices', description: 'Capture supplier bills and match them to supporting records.' },
      { title: 'Approvals & payment runs', description: 'Route invoices for review and prepare scheduled payments.' },
      { title: 'Supplier statements', description: 'Reconcile supplier balances and review outstanding items.' },
    ],
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable',
    domain: 'Finance',
    category: 'Finance & customer billing',
    description: 'Create customer invoices, record receipts, and monitor outstanding balances and collection activity.',
    readiness: 'preview',
    icon: WalletCards,
    metrics: [
      { label: 'Open invoices', context: 'Customer billing summary' },
      { label: 'Receipts', context: 'Incoming payment activity' },
      { label: 'Overdue accounts', context: 'Collection follow-up' },
    ],
    workflows: [
      { title: 'Customer billing', description: 'Prepare invoices and maintain customer account details.' },
      { title: 'Receipt allocation', description: 'Record incoming payments and apply them to open invoices.' },
      { title: 'Collections', description: 'Prioritize follow-up on overdue balances and disputes.' },
    ],
  },
  {
    id: 'fixed-assets',
    name: 'Fixed Assets',
    domain: 'Finance',
    category: 'Finance & asset control',
    description: 'Maintain the asset register, track depreciation, and manage asset transfers, reviews, and disposals.',
    readiness: 'preview',
    icon: PackageCheck,
    metrics: [
      { label: 'Registered assets', context: 'Asset register summary' },
      { label: 'Depreciation runs', context: 'Period depreciation status' },
      { label: 'Assets for review', context: 'Upcoming asset checks' },
    ],
    workflows: [
      { title: 'Asset register', description: 'Record ownership, location, custodian, and acquisition details.' },
      { title: 'Depreciation & valuation', description: 'Organize depreciation schedules and asset valuations.' },
      { title: 'Transfers & disposals', description: 'Track asset movements, retirement, and disposal approvals.' },
    ],
  },
  {
    id: 'point-of-sale',
    name: 'Point of Sale',
    domain: 'Operations',
    category: 'Sales operations',
    description: 'Coordinate checkout activity, sales records, register operations, receipts, and stock updates.',
    readiness: 'preview',
    icon: ShoppingCart,
    metrics: [
      { label: 'Sales activity', context: 'Point-of-sale transactions' },
      { label: 'Open registers', context: 'Till and shift status' },
      { label: 'Stock alerts', context: 'Item availability' },
    ],
    workflows: [
      { title: 'Checkout & sales', description: 'Support counter sales, pricing, and receipt workflows.' },
      { title: 'Cash-up & shift close', description: 'Review register activity and reconcile till balances.' },
      { title: 'Item availability', description: 'Keep sales teams informed about current stock levels.' },
    ],
  },
  {
    id: 'human-resource',
    name: 'Human Resources',
    domain: 'People & education',
    category: 'People operations',
    description: 'Centralize employee records, recruitment, onboarding, leave, performance, and workforce administration.',
    readiness: 'preview',
    icon: UsersRound,
    metrics: [
      { label: 'Active employees', context: 'Workforce summary' },
      { label: 'Open vacancies', context: 'Recruitment activity' },
      { label: 'Leave approvals', context: 'Team review queue' },
    ],
    workflows: [
      { title: 'Employee records', description: 'Maintain employee profiles, roles, and organizational details.' },
      { title: 'Recruitment & onboarding', description: 'Coordinate candidate pipelines and new-starter tasks.' },
      { title: 'Leave & performance', description: 'Manage leave requests, reviews, and employee development.' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    domain: 'Operations',
    category: 'Stock & warehouse',
    description: 'Track stock on hand, warehouse movements, cycle counts, and replenishment across locations.',
    readiness: 'preview',
    icon: Boxes,
    metrics: [
      { label: 'Stock on hand', context: 'Inventory balance' },
      { label: 'Reorder alerts', context: 'Items below threshold' },
      { label: 'Stock movements', context: 'Warehouse activity' },
    ],
    workflows: [
      { title: 'Stock ledger', description: 'Review item quantities, valuations, and movement history.' },
      { title: 'Replenishment', description: 'Set reorder thresholds and coordinate purchase requests.' },
      { title: 'Warehouse transfers', description: 'Manage stock transfers, counts, and adjustments.' },
    ],
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    domain: 'Operations',
    category: 'Procurement & logistics',
    description: 'Coordinate suppliers, purchase orders, inbound logistics, deliveries, and supply planning.',
    readiness: 'preview',
    icon: Truck,
    metrics: [
      { label: 'Open purchase orders', context: 'Procurement pipeline' },
      { label: 'Inbound deliveries', context: 'Expected receipts' },
      { label: 'Supplier reviews', context: 'Vendor performance' },
    ],
    workflows: [
      { title: 'Supplier management', description: 'Maintain supplier records and procurement relationships.' },
      { title: 'Purchasing', description: 'Prepare purchase requests, orders, and approval workflows.' },
      { title: 'Delivery tracking', description: 'Monitor expected receipts and delivery milestones.' },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    domain: 'Operations',
    category: 'Production operations',
    description: 'Plan production orders, bills of materials, work centres, and material consumption.',
    readiness: 'preview',
    icon: Factory,
    metrics: [
      { label: 'Production orders', context: 'Work order pipeline' },
      { label: 'Material requirements', context: 'Production inputs' },
      { label: 'Work centre load', context: 'Capacity overview' },
    ],
    workflows: [
      { title: 'Production planning', description: 'Organize demand, schedules, and production order priorities.' },
      { title: 'Bills of materials', description: 'Maintain product structures and required components.' },
      { title: 'Work order tracking', description: 'Follow production progress and material consumption.' },
    ],
  },
  {
    id: 'document-management',
    name: 'Document Management',
    domain: 'Operations',
    category: 'Records & approvals',
    description: 'Organize business documents, versions, access, approvals, retention, and fast retrieval.',
    readiness: 'preview',
    icon: Files,
    metrics: [
      { label: 'Documents indexed', context: 'Records library' },
      { label: 'Pending approvals', context: 'Document review queue' },
      { label: 'Recent uploads', context: 'Latest records activity' },
    ],
    workflows: [
      { title: 'Document library', description: 'Classify, organize, and retrieve business records.' },
      { title: 'Review & approvals', description: 'Route documents for review and maintain decision history.' },
      { title: 'Retention & access', description: 'Apply retention policies and role-based document access.' },
    ],
  },
  {
    id: 'property-rentals',
    name: 'Property Rentals',
    domain: 'Industry solutions',
    category: 'Property management',
    description: 'Manage rental units, lease agreements, tenant accounts, rent schedules, and maintenance requests.',
    readiness: 'preview',
    icon: Home,
    metrics: [
      { label: 'Occupied units', context: 'Property occupancy' },
      { label: 'Rent due', context: 'Upcoming tenant payments' },
      { label: 'Maintenance requests', context: 'Open property issues' },
    ],
    workflows: [
      { title: 'Units & leases', description: 'Maintain property details, availability, and lease terms.' },
      { title: 'Rent collections', description: 'Track rent schedules, receipts, and tenant balances.' },
      { title: 'Maintenance', description: 'Coordinate inspections, service requests, and repair follow-up.' },
    ],
  },
  {
    id: 'customer-relationship-management',
    name: 'Customer Relationship Management',
    domain: 'Operations',
    category: 'Customer & sales management',
    description: 'Coordinate prospects, customer accounts, sales opportunities, service interactions, and follow-up across the customer lifecycle.',
    readiness: 'preview',
    icon: Handshake,
    metrics: [
      { label: 'Active customer accounts', context: 'Customer relationship summary' },
      { label: 'Open opportunities', context: 'Sales pipeline status' },
      { label: 'Service requests', context: 'Customer care queue' },
    ],
    workflows: [
      { title: 'Leads & customer records', description: 'Maintain prospect and customer profiles, contacts, and communication history.' },
      { title: 'Sales opportunities', description: 'Track opportunity stages, expected value, ownership, and next actions.' },
      { title: 'Customer service', description: 'Record service requests and coordinate timely customer follow-up.' },
    ],
  },
  {
    id: 'project-management',
    name: 'Project Management',
    domain: 'Operations',
    category: 'Projects & delivery',
    description: 'Plan project portfolios, coordinate tasks and milestones, manage delivery budgets, and monitor team capacity.',
    readiness: 'preview',
    icon: FolderKanban,
    metrics: [
      { label: 'Active projects', context: 'Project portfolio summary' },
      { label: 'Milestones at risk', context: 'Delivery health and due dates' },
      { label: 'Team capacity', context: 'Resource planning overview' },
    ],
    workflows: [
      { title: 'Project portfolio', description: 'Organize project charters, owners, priorities, and delivery plans.' },
      { title: 'Tasks & milestones', description: 'Coordinate responsibilities, dependencies, deadlines, and status updates.' },
      { title: 'Time & cost controls', description: 'Compare planned budgets and capacity with actual project delivery.' },
    ],
  },
]

export function getBusinessModule(id?: string | string[]) {
  const moduleId = Array.isArray(id) ? id[0] : id
  return businessModules.find((businessModule) => businessModule.id === moduleId)
}

export function moduleDashboardPath(module: Pick<BusinessModule, 'id'> | string) {
  const moduleId = typeof module === 'string' ? module : module.id
  return moduleId === 'general-ledger' ? '/ledger' : `/modules/${moduleId}`
}
