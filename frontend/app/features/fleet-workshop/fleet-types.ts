// Types for the Fleet & Workshop Management workspace (Mcguan CMMS + workshop
// diary ledger). Field names mirror the camelCase jsonb projections emitted by
// domain_services/fleet_workshop.

export interface FleetUnitRecord {
  id: string
  code: string
  name: string
  baseCurrencyId: string
  isActive: boolean
}

export interface FleetDashboardSummary {
  fleet: {
    totalVehicles: number
    active: number
    inWorkshop: number
    breakdown: number
    heavyMachinery: number
    stalledMeters: number
  }
  workshop: {
    openJobs: number
    awaitingParts: number
    unbilledCustomerJobs: number
    majorProjects: number
    jobCostTotal: string
    billableTotal: string
  }
  schedules: {
    scheduledWorks: number
    dueWithin7Days: number
  }
  fuel: {
    totalLogs: number
    toleranceAlerts: number
    litresPosted: string
    costPosted: string
  }
  diary: {
    unpaidCount: number
    unpaidAmount: string
  }
  crossModuleLinks: Array<{
    targetModule: string
    handoffStatus: string
    count: number
  }>
}

export const emptyFleetDashboard = (): FleetDashboardSummary => ({
  fleet: { totalVehicles: 0, active: 0, inWorkshop: 0, breakdown: 0, heavyMachinery: 0, stalledMeters: 0 },
  workshop: { openJobs: 0, awaitingParts: 0, unbilledCustomerJobs: 0, majorProjects: 0, jobCostTotal: '0', billableTotal: '0' },
  schedules: { scheduledWorks: 0, dueWithin7Days: 0 },
  fuel: { totalLogs: 0, toleranceAlerts: 0, litresPosted: '0', costPosted: '0' },
  diary: { unpaidCount: 0, unpaidAmount: '0' },
  crossModuleLinks: [],
})

export interface GlSettingsRecord {
  id?: string
  version?: number
  accountingUnitId: string
  defaultWarehouseId?: string | null
  defaultWarehouseName?: string
  repairsExpenseAccountId?: string | null
  fuelExpenseAccountId?: string | null
  lubricantsExpenseAccountId?: string | null
  tyresExpenseAccountId?: string | null
  outsourcedRepairsExpenseAccountId?: string | null
  electricalExpenseAccountId?: string | null
  internalLabourRecoveryAccountId?: string | null
  workshopLabourRevenueAccountId?: string | null
  workshopPartsRevenueAccountId?: string | null
  workshopWipAccountId?: string | null
  fleetClearingApAccountId?: string | null
  fleetReceivableArAccountId?: string | null
  defaultLabourRate: string
  defaultTaxRate: string
  canWrite?: boolean
}

export interface GlSettingsOptions {
  accountingUnitId: string
  accounts: Array<{ id: string; accountNumber: string; name: string }>
  warehouses: Array<{ id: string; code: string; name: string }>
}

export interface AssetGroupMaterial {
  id?: string
  serviceTier: 'minor_service' | 'major_service' | 'routine' | 'lubrication'
  itemId: string
  itemCode?: string
  itemName?: string
  uomId: string
  uomCode?: string
  quantity: string
  isLubricant: boolean
  notes: string
}

export interface AssetGroupComponent {
  id?: string
  componentType: string
  slotLabel: string
  expectedLifeHours: string
  isRequired: boolean
  notes: string
}

export interface AssetGroupRecord {
  id: string
  version: number
  code: string
  model: string
  modelType: string
  assetClass: string
  assetType: string
  defaultTriggerMetric: string
  serviceFrequency: string
  serviceDowntimeHours: string
  majorServiceFrequency: string
  majorServiceDowntimeHours: string
  tolerance: string
  routineServiceDelay: string
  weekdayUtilization: string
  weekdayDays: number
  saturdayUtilization: string
  sundayUtilization: string
  description: string
  isActive: boolean
  materialCount?: number
  componentCount?: number
  materials?: AssetGroupMaterial[]
  components?: AssetGroupComponent[]
  canWrite?: boolean
}

export interface ProcedureRecord {
  id: string
  version: number
  pcode: string
  description: string
  procedureText: string
  checklistItems: string[]
  serviceCategory: string
  estimatedHours: string
  assetGroupId?: string | null
  assetGroupCode?: string
  status: string
  canWrite?: boolean
}

export interface PmTriggerRecord {
  id?: string
  triggerType: string
  serviceFrequency: string
  serviceDowntimeHours: string
  majorServiceFrequency: string
  majorServiceDowntimeHours: string
  serviceTolerance: string
  routineServiceDelay: string
  lastServiceReading: string
  lastMajorServiceReading: string
  lastServiceDate?: string | null
  lastMajorServiceDate?: string | null
  isActive: boolean
}

export interface VehicleRecord {
  id: string
  version: number
  accountingUnitId: string
  assetNo: string
  registrationNo: string
  assetGroupId?: string | null
  assetGroupCode?: string
  assetClass?: string
  assetType?: string
  ownershipType: string
  isMiningEquipment: boolean
  isHeavyMachinery: boolean
  isTrailerUnit: boolean
  coupledTrailerId?: string | null
  departmentName?: string
  maintenanceDepartmentName?: string
  costCenterId?: string | null
  costCenterName?: string
  logDate?: string | null
  condition: string
  status: string
  makeModel: string
  modelNo?: string
  serialNo: string
  chassisNo?: string
  engineNo?: string
  manufactureDate?: string | null
  purchaseAmount?: string
  purchaseDate?: string | null
  currencyId?: string | null
  dateInstalled?: string | null
  vendorSupplierId?: string | null
  vendorName?: string
  customerId?: string | null
  customerName?: string
  assignedEmployeeId?: string | null
  assignedEmployeeName?: string
  fixedAssetId?: string | null
  residualValue?: string
  usefulLifeMonths?: number
  depreciationMethod?: string
  accumulatedDepreciation?: string
  weekdayUtilization?: string
  weekdayDays?: number
  saturdayUtilization?: string
  sundayUtilization?: string
  trackFuelConsumption?: boolean
  idealConsumptionRate?: string
  consumptionUnit?: string
  toleranceBelowPct?: string
  toleranceAbovePct?: string
  useFuelLogForPm?: boolean
  primaryMeterUnit: string
  currentMeterReading: string
  cumulativeMeterReading: string
  isMeterStalled: boolean
  stalledSinceDate?: string | null
  lastMeterLogDate?: string | null
  notes?: string
  pmTriggers?: PmTriggerRecord[]
  canWrite?: boolean
}

export interface VehicleOptions {
  accountingUnits: FleetUnitRecord[]
  assetGroups: Array<{ id: string; code: string; model: string; assetClass: string; assetType: string }>
  costCenters: Array<{ id: string; name: string }>
  employees: Array<{ id: string; employeeIdentifier: string; name: string }>
  suppliers: Array<{ id: string; accountNumber: string; name: string }>
  customers: Array<{ id: string; accountNumber: string; name: string }>
  trailers: Array<{ id: string; assetNo: string; registrationNo: string }>
  currencies: Array<{ id: string; code: string; name: string }>
}

export interface WorkshopEmployeeRecord {
  id: string
  version: number
  employeeId: string
  employeeIdentifier: string
  employeeName: string
  email?: string
  phone?: string
  tradeRole: string
  skillLevel: string
  hourlyCostRate: string
  hourlyChargeRate: string
  currencyId?: string | null
  bayAssignment: string
  certifications: string[]
  isActive: boolean
  notes: string
  canWrite?: boolean
}

export interface MeterChangeRecord {
  id: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  changeDate: string
  lastDateOnOldMeter: string
  oldMeterReading: string
  newMeterReading: string
  replacementLabel: string
  engineChanged: boolean
  meterStalled: boolean
  cumulativeOffsetDelta: string
  notes: string
}

export interface StalledMeterRecord {
  vehicleId: string
  assetNo: string
  registrationNo: string
  makeModel: string
  primaryMeterUnit: string
  currentMeterReading: string
  cumulativeMeterReading: string
  stalledSinceDate?: string | null
  lastMeterLogDate?: string | null
}

export interface MeterReadingRecord {
  id: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  logDate: string
  reading: string
  engineRunDelta: string
  cumulativeReading: string
  meterUnit: string
  isStalledEstimate: boolean
  source: string
  notes: string
}

export interface FuelLogRecord {
  id: string
  version: number
  accountingUnitId: string
  fuelLogNumber: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  logDate: string
  meterReading: string
  previousMeterReading: string
  fuelItemId?: string | null
  uomId?: string | null
  warehouseId?: string | null
  invStockDocumentId?: string | null
  journalBatchId?: string | null
  quantityLitres: string
  unitCost: string
  totalCost: string
  currencyId?: string | null
  actualConsumptionRate: string
  idealConsumptionRate: string
  variancePct: string
  withinTolerance: boolean
  stationOrPump: string
  driverEmployeeId?: string | null
  costCenterId?: string | null
  supplierId?: string | null
  status: string
  notes: string
  canWrite?: boolean
}

export interface FuelToleranceAlertRecord {
  id: string
  fuelLogNumber: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  logDate: string
  quantityLitres: string
  actualRate: string
  idealRate: string
  variancePct: string
  consumptionUnit: string
  toleranceBelowPct: string
  toleranceAbovePct: string
  stationOrPump: string
}

export interface LubricantLogRecord {
  id: string
  version: number
  accountingUnitId: string
  lubricantLogNumber: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  logDate: string
  meterReading: string
  lubricantType: string
  itemId?: string | null
  uomId?: string | null
  warehouseId?: string | null
  invStockDocumentId?: string | null
  journalBatchId?: string | null
  quantity: string
  unitCost: string
  totalCost: string
  currencyId?: string | null
  isOilChange: boolean
  costCenterId?: string | null
  status: string
  notes: string
  canWrite?: boolean
}

export interface ComponentEventRecord {
  id: string
  vehicleId?: string | null
  eventType: string
  eventDate: string
  cumOdoReading: string
  condition: string
  scrapped: boolean
  repairCost: string
  jobCardId?: string | null
  notes: string
  version: number
}

export interface MajorComponentRecord {
  id: string
  version: number
  componentCode: string
  serialNo: string
  componentType: string
  description: string
  manufacturer: string
  condition: string
  status: string
  currentVehicleId?: string | null
  assetNo: string
  registrationNo: string
  mountedDate?: string | null
  mountedCumOdo: string
  estimatedLifeHours: string
  accumulatedHours: string
  purchaseCost: string
  cumulativeRepairCost: string
  invItemId?: string | null
  invSerialId?: string | null
  notes: string
  history?: ComponentEventRecord[]
  canWrite?: boolean
}

export interface TyreEventRecord {
  id: string
  vehicleId?: string | null
  eventType: string
  eventDate: string
  axlePosition: string
  meterReading: string
  treadDepthMm: string
  cost: string
  locationNote: string
  jobCardId?: string | null
  notes: string
  version: number
}

export interface TyreRecord {
  id: string
  version: number
  serialNo: string
  brand: string
  sizeSpec: string
  pattern: string
  invItemId?: string | null
  invSerialId?: string | null
  status: string
  currentVehicleId?: string | null
  assetNo: string
  registrationNo: string
  axlePosition: string
  fittedDate?: string | null
  fittedMeterReading: string
  currentTreadDepthMm: string
  purchaseCost: string
  accumulatedMeterUsage: string
  supplierId?: string | null
  purchaseLocation: string
  notes: string
  history?: TyreEventRecord[]
  canWrite?: boolean
}

export interface MaintenanceScheduleRecord {
  id: string
  version: number
  accountingUnitId: string
  scheduleNumber: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  makeModel: string
  scheduleClass: string
  workCategory: string
  serviceType: string
  scheduleDate: string
  modifiedServiceDate?: string | null
  estimatedDowntimeHours: string
  triggerReading: string
  projectedEngineRun: string
  specialConditions: string
  procedureId?: string | null
  procedureCode: string
  startTime: string
  status: string
  jobCardId?: string | null
  notes: string
  canWrite?: boolean
}

export interface JobCardLineRecord {
  id: string
  version?: number
  lineNumber: number
  lineType: string
  sourceType: string
  description: string
  positionOrSide: string
  invItemId?: string | null
  itemCode?: string
  uomId?: string | null
  warehouseId?: string | null
  invStockDocumentId?: string | null
  supplierId?: string | null
  supplierName?: string
  apInvoiceId?: string | null
  employeeId?: string | null
  tyreId?: string | null
  majorComponentId?: string | null
  glExpenseAccountId?: string | null
  glRevenueAccountId?: string | null
  quantity: string
  unitCost: string
  lineCost: string
  unitPrice: string
  lineBillableAmount: string
  isBillable: boolean
  isPaid: boolean
  stockIssued: boolean
  locationNote: string
  entryDate: string
}

export interface JobCardAssignmentRecord {
  id?: string
  employeeId: string
  employeeName?: string
  roleOnJob: string
  hoursEstimated: string
  hoursWorked: string
  hourlyCostRate: string
  hourlyBillRate: string
  workNotes: string
}

export interface JobMilestoneRecord {
  id: string
  version: number
  milestoneCode: string
  title: string
  phase: string
  ownerEmployeeId?: string | null
  ownerName?: string
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  actualStartDate?: string | null
  actualEndDate?: string | null
  progressPct: number
  status: string
  dependsOnMilestoneId?: string | null
  deliverables: string
  blockerNotes: string
  sortOrder: number
}

export interface JobCardEventRecord {
  id: string
  action: string
  previousStatus?: string | null
  newStatus: string
  reason: string
  version: number
  createdAt: string
}

export interface CrossModuleLinkRecord {
  id: string
  accountingUnitId?: string
  sourceEntityType?: string
  sourceEntityId?: string
  targetModule: string
  linkKind: string
  targetEntityId?: string | null
  targetReference: string
  handoffStatus: string
  amount: string
  currencyId?: string | null
  journalBatchId?: string | null
  payload?: unknown
  createdAt?: string
  postedAt?: string | null
}

export interface JobCardRecord {
  id: string
  version: number
  accountingUnitId: string
  jobNumber: string
  vehicleId: string
  assetNo: string
  registrationNo: string
  makeModel?: string
  coupledTrailerId?: string | null
  trailerRegistrationNo?: string
  jobType: string
  billingScope: string
  customerId?: string | null
  customerName?: string
  costCenterId?: string | null
  costCenterName?: string
  scheduleId?: string | null
  procedureId?: string | null
  warehouseId?: string | null
  currencyId?: string
  currencyCode?: string
  exchangeRate?: string
  openedDate: string
  scheduledStartAt?: string | null
  actualStartAt?: string | null
  targetCompletionAt?: string | null
  completedAt?: string | null
  closedAt?: string | null
  meterReadingIn?: string
  meterReadingOut?: string
  downtimeHours?: string
  locationSite: string
  reportedFault?: string
  diagnosis?: string
  workPerformed?: string
  priority: string
  isMajorProject: boolean
  status: string
  paymentStatus: string
  partsCostTotal?: string
  internalLabourCostTotal?: string
  outsourcedCostTotal?: string
  lubricantsCostTotal?: string
  totalCost: string
  billablePartsTotal?: string
  billableLabourTotal?: string
  billableOtherTotal?: string
  taxTotal?: string
  billableGrandTotal: string
  invIssueDocumentId?: string | null
  glCostJournalBatchId?: string | null
  glRevenueJournalBatchId?: string | null
  arInvoiceId?: string | null
  posOrderId?: string | null
  projectId?: string | null
  lines?: JobCardLineRecord[]
  assignments?: JobCardAssignmentRecord[]
  milestones?: JobMilestoneRecord[]
  history?: JobCardEventRecord[]
  crossModuleLinks?: CrossModuleLinkRecord[]
  canWrite?: boolean
}

export interface DiaryAllocationRecord {
  id?: string
  vehicleId: string
  assetNo?: string
  registrationNo?: string
  allocatedQuantity: string
  allocatedAmount: string
  linkedJobCardId?: string | null
  notes: string
}

export interface DiaryEntryRecord {
  id: string
  version: number
  accountingUnitId: string
  entryNumber: string
  entryDate: string
  vehicleId?: string | null
  assetNo?: string
  registrationNo: string
  entryCategory: string
  description: string
  positionOrSide: string
  locationOrVendor: string
  supplierId?: string | null
  invItemId?: string | null
  employeeId?: string | null
  quantity: string
  unitAmount: string
  totalAmount: string
  currencyId?: string
  isPaid: boolean
  paidAt?: string | null
  paymentReference: string
  linkedJobCardId?: string | null
  linkedJobLineId?: string | null
  status: string
  notes: string
  allocations?: DiaryAllocationRecord[]
  promotedJobCardIds?: string[]
  canWrite?: boolean
}

export type FleetReportTab = 'forecast' | 'fuel_lubs' | 'jobs' | 'tyres' | 'major_components' | 'others'

export interface FleetReportResponse {
  tab: FleetReportTab
  exchangeRate: string
  rows: Record<string, any>[]
}
