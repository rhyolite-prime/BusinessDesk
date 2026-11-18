import type { DashboardFilters, JournalStatusCode } from './types'

export const dashboardStatuses: { value: JournalStatusCode; label: string; color: string }[] = [
  { value: 'posted', label: 'Posted', color: '#1e5d50' },
  { value: 'pending_approval', label: 'Pending approval', color: '#d97706' },
  { value: 'approved', label: 'Approved', color: '#2563eb' },
  { value: 'draft', label: 'Draft', color: '#7c3aed' },
  { value: 'rejected', label: 'Rejected', color: '#e11d48' },
  { value: 'voided', label: 'Voided', color: '#64748b' },
  { value: 'reversed', label: 'Reversed', color: '#94a3b8' },
]

export function dashboardDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day))
  return year! >= 1900 && year! <= 2999 && date.toISOString().slice(0, 10) === value
}

const uuid = (value: string) => /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)
  && value !== '00000000-0000-0000-0000-000000000000'
const keys = ['accountingUnitId', 'dateFrom', 'dateTo', 'costCenterId', 'includeChildCostCenters', 'source', 'currencyId', 'status']

/** Shared by the browser and BFF; reject repeated, unknown and scope-override params. */
export function parseDashboardFilters(query: Record<string, unknown>): DashboardFilters {
  if (Object.keys(query).some(key => !keys.includes(key))) throw new Error('Unsupported dashboard filter.')
  function text(key: string) {
    const value = query[key] ?? ''
    if (typeof value !== 'string') throw new Error('Each dashboard filter must have one value.')
    return value
  }
  const unit = text('accountingUnitId'), dateFrom = text('dateFrom'), dateTo = text('dateTo')
  if (!uuid(unit)) throw new Error('Select an accounting unit.')
  if (!dashboardDate(dateFrom) || !dashboardDate(dateTo)) throw new Error('Enter valid from and through dates (1900–2999).')
  if (dateFrom > dateTo) throw new Error('The from date must be on or before the through date.')
  const costCenterId = text('costCenterId'), currencyId = text('currencyId'), source = text('source'), status = text('status')
  if (costCenterId && costCenterId !== 'unassigned' && !uuid(costCenterId)) throw new Error('Select a valid cost center.')
  if (currencyId && !uuid(currencyId)) throw new Error('Select a valid transaction currency.')
  if (new TextEncoder().encode(source).length > 40 || /[\u0000-\u001f\u007f]/.test(source)) throw new Error('Select a valid transaction source.')
  if (status && !dashboardStatuses.some(option => option.value === status)) throw new Error('Select a valid journal status.')
  const children = query.includeChildCostCenters ?? true
  if (![true, false, 'true', 'false'].includes(children as boolean | string)) throw new Error('Invalid child cost center filter.')
  return {
    accountingUnitId: unit.toLowerCase(), dateFrom, dateTo,
    costCenterId: costCenterId.toLowerCase(), currencyId: currencyId.toLowerCase(), source,
    status: status as DashboardFilters['status'], includeChildCostCenters: children === true || children === 'true',
  }
}

export type DashboardDatePreset = 'month-to-date' | 'quarter-to-date' | 'year-to-date' | 'fiscal-year-to-date' | 'last-month'

export function dashboardDateRange(preset: DashboardDatePreset, today = new Date(), fiscalMonth = 1) {
  const year = today.getFullYear(), month = today.getMonth()
  let from = new Date(year, month, 1), through = today
  if (preset === 'quarter-to-date') from = new Date(year, Math.floor(month / 3) * 3, 1)
  if (preset === 'year-to-date') from = new Date(year, 0, 1)
  if (preset === 'fiscal-year-to-date') from = new Date(month + 1 < fiscalMonth ? year - 1 : year, fiscalMonth - 1, 1)
  if (preset === 'last-month') { from = new Date(year, month - 1, 1); through = new Date(year, month, 0) }
  const format = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  return { dateFrom: format(from), dateTo: format(through) }
}

export function dashboardSourceLabel(source: string) {
  return source.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}
