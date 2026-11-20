export const fleetErrorMessage = (e: any) =>
  e?.data?.statusMessage || e?.statusMessage || (e instanceof Error ? e.message : '') || 'Request failed. Please retry.'

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const formatFleetDate = (value?: string | null) => {
  if (!value) return '—'
  const isoDay = String(value).slice(0, 10)
  const date = new Date(`${isoDay}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export const humanLabel = (value?: string | null) => {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const fleetStatusTone = (status?: string | null) => {
  const s = (status || '').toLowerCase()
  if (['active', 'posted', 'completed', 'closed', 'paid', 'excellent', 'good', 'fitted', 'new'].includes(s))
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
  if (['in_progress', 'in_workshop', 'scheduled', 'job_created', 'allocated', 'promoted_to_job', 'rebuilt', 'retread'].includes(s))
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
  if (['draft', 'logged', 'open', 'forecasted', 'awaiting_parts', 'unpaid', 'pending', 'staged', 'fair', 'in_repair', 'used', 'in_stock'].includes(s))
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
  if (['breakdown', 'blocked', 'cancelled', 'reversed', 'scrapped', 'disposed', 'decommissioned', 'poor', 'failed', 'critical', 'high'].includes(s))
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
}

export const ASSET_CLASSES = [
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'light_vehicle', label: 'Light Vehicle' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'stationary_plant', label: 'Stationary Plant' },
  { value: 'mining_equipment', label: 'Mining Equipment' },
  { value: 'other', label: 'Other' },
]

export const ASSET_TYPES = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'dump_truck', label: 'Dump Truck' },
  { value: 'dozer', label: 'Dozer' },
  { value: 'grader', label: 'Grader' },
  { value: 'wheel_loader', label: 'Wheel Loader' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'truck_head', label: 'Truck Head' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'crane', label: 'Crane' },
  { value: 'service_van', label: 'Service Van' },
  { value: 'other', label: 'Other' },
]

export const TRIGGER_METRICS = [
  { value: 'hours', label: 'Hours' },
  { value: 'kilometers', label: 'Kilometers' },
  { value: 'miles', label: 'Miles' },
  { value: 'tonnes', label: 'Tonnes' },
  { value: 'dates', label: 'Dates' },
]

export const METER_UNITS = [
  { value: 'hours', label: 'Hours' },
  { value: 'kilometers', label: 'Kilometers' },
  { value: 'miles', label: 'Miles' },
  { value: 'tonnes', label: 'Tonnes' },
]

export const OWNERSHIP_TYPES = [
  { value: 'company_owned', label: 'Company owned' },
  { value: 'hired_equipment', label: 'Hired equipment' },
  { value: 'customer_vehicle', label: 'Customer vehicle (Workshop)' },
]

export const VEHICLE_CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'breakdown', label: 'Breakdown' },
]

export const VEHICLE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'in_workshop', label: 'In workshop' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'decommissioned', label: 'Decommissioned' },
  { value: 'disposed', label: 'Disposed' },
]

export const CONSUMPTION_UNITS = [
  { value: 'litres_per_hour', label: 'Litres / hour' },
  { value: 'litres_per_100km', label: 'Litres / 100 km' },
  { value: 'km_per_litre', label: 'Km / litre' },
]

export const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Straight line' },
  { value: 'declining_balance', label: 'Declining balance' },
  { value: 'units_of_production', label: 'Units of production' },
  { value: 'none', label: 'None' },
]

export const SERVICE_TIERS = [
  { value: 'minor_service', label: 'Minor service' },
  { value: 'major_service', label: 'Major service' },
  { value: 'routine', label: 'Routine' },
  { value: 'lubrication', label: 'Lubrication' },
]

export const PROCEDURE_CATEGORIES = [
  { value: 'service', label: 'Service' },
  { value: 'major_service', label: 'Major service' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'inspection', label: 'Inspection' },
]

export const TRADE_ROLES = [
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'welder', label: 'Welder' },
  { value: 'auto_body', label: 'Auto body' },
  { value: 'tyre_technician', label: 'Tyre technician' },
  { value: 'panel_beater', label: 'Panel beater' },
  { value: 'machinist', label: 'Machinist' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'driver', label: 'Driver / Operator' },
  { value: 'apprentice', label: 'Apprentice' },
]

export const SKILL_LEVELS = [
  { value: 'apprentice', label: 'Apprentice' },
  { value: 'junior', label: 'Junior' },
  { value: 'journeyman', label: 'Journeyman' },
  { value: 'senior', label: 'Senior' },
  { value: 'master', label: 'Master' },
]

export const LUBRICANT_TYPES = [
  { value: 'engine_oil', label: 'Engine oil' },
  { value: 'hydraulic_oil', label: 'Hydraulic oil' },
  { value: 'transmission_oil', label: 'Transmission oil' },
  { value: 'gear_oil', label: 'Gear oil' },
  { value: 'coolant', label: 'Coolant' },
  { value: 'grease', label: 'Grease' },
  { value: 'brake_fluid', label: 'Brake fluid' },
  { value: 'other', label: 'Other' },
]

export const COMPONENT_CONDITIONS = [
  { value: 'NEW', label: 'NEW' },
  { value: 'REBUILT', label: 'REBUILT' },
  { value: 'USED', label: 'USED' },
  { value: 'REMOVED', label: 'REMOVED' },
  { value: 'SCRAPPED', label: 'SCRAPPED' },
]

export const SCHEDULE_CLASSES = [
  { value: 'heavy_machinery', label: 'Heavy machinery' },
  { value: 'light_vehicle', label: 'Light vehicle' },
]

export const WORK_CATEGORIES = [
  { value: 'maintenance_schedule', label: 'Maintenance schedule' },
  { value: 'planned_repair', label: 'Planned repair' },
  { value: 'breakdown', label: 'Breakdown' },
]

export const SERVICE_TYPES = [
  { value: 'Service', label: 'Service' },
  { value: 'Major Service', label: 'Major Service' },
  { value: 'Planned Repair', label: 'Planned Repair' },
  { value: 'Breakdown', label: 'Breakdown' },
]

export const SCHEDULE_EDIT_STATUSES = [
  { value: 'forecasted', label: 'Forecasted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const JOB_TYPES = [
  { value: 'preventive_service', label: 'Preventive service' },
  { value: 'major_service', label: 'Major service' },
  { value: 'corrective_repair', label: 'Corrective repair' },
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'tyre_service', label: 'Tyre service' },
  { value: 'component_overhaul', label: 'Component overhaul' },
  { value: 'bodywork', label: 'Bodywork' },
  { value: 'major_project', label: 'Major project' },
]

export const BILLING_SCOPES = [
  { value: 'internal_fleet', label: 'Internal fleet' },
  { value: 'customer_billable', label: 'Customer billable' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'hired_equipment', label: 'Hired equipment' },
]

export const JOB_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export const JOB_LINE_TYPES = [
  { value: 'spare_part', label: 'Spare part' },
  { value: 'tyre', label: 'Tyre' },
  { value: 'lubricant', label: 'Lubricant' },
  { value: 'internal_labour', label: 'Internal labour' },
  { value: 'outsourced_repair', label: 'Outsourced repair' },
  { value: 'electrical_service', label: 'Electrical service' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'other', label: 'Other' },
]

export const JOB_SOURCE_TYPES = [
  { value: 'inventory_issue', label: 'Inventory issue' },
  { value: 'direct_purchase_ap', label: 'Direct purchase (AP)' },
  { value: 'workshop_labour', label: 'Workshop labour' },
  { value: 'petty_cash', label: 'Petty cash' },
  { value: 'manual', label: 'Manual' },
]

export const JOB_ROLES = [
  { value: 'lead_mechanic', label: 'Lead mechanic' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'welder', label: 'Welder' },
  { value: 'tyre_technician', label: 'Tyre technician' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'helper', label: 'Helper' },
]

export const MILESTONE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const DIARY_CATEGORIES = [
  { value: 'parts', label: 'Parts & hubs' },
  { value: 'workmanship', label: 'Workmanship' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'tyres', label: 'Tyres' },
  { value: 'oil_change', label: 'Oil change' },
  { value: 'outsourced_repair', label: 'Outsourced repair' },
  { value: 'other', label: 'Other' },
]
