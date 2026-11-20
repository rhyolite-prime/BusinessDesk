import type {
  AssetGroupComponent,
  AssetGroupMaterial,
  AssetGroupRecord,
  CrossModuleLinkRecord,
  DiaryAllocationRecord,
  DiaryEntryRecord,
  FleetDashboardSummary,
  FleetReportResponse,
  FleetReportTab,
  FleetUnitRecord,
  FuelLogRecord,
  FuelToleranceAlertRecord,
  GlSettingsOptions,
  GlSettingsRecord,
  JobCardAssignmentRecord,
  JobCardRecord,
  LubricantLogRecord,
  MaintenanceScheduleRecord,
  MajorComponentRecord,
  MeterChangeRecord,
  MeterReadingRecord,
  PmTriggerRecord,
  ProcedureRecord,
  StalledMeterRecord,
  TyreRecord,
  VehicleOptions,
  VehicleRecord,
  WorkshopEmployeeRecord,
} from './fleet-types'

export interface FleetPage<T> { items: T[]; total: number; canWrite?: boolean }
interface ListEnvelope<T> { data?: T[]; totalCount?: number | string; canWrite?: boolean }
export type FleetQuery = Record<string, string | number | undefined>

const toPage = <T,>(r: ListEnvelope<T>): FleetPage<T> => ({
  items: Array.isArray(r?.data) ? r.data : [],
  total: Number(r?.totalCount ?? r?.data?.length ?? 0),
  canWrite: r?.canWrite,
})

const clean = (query: FleetQuery) =>
  Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))

/** Shared accounting-unit selection across ERP modules. */
export function useFleetUnitId() {
  return useState<string>('ledger-accounting-unit', () => '')
}

export function useFleetWorkshop() {
  const request = useRequestFetch()
  const call = request as unknown as (url: string, opts?: Record<string, unknown>) => Promise<any>
  const unitId = useFleetUnitId()

  async function units(): Promise<FleetUnitRecord[]> {
    const rows: FleetUnitRecord[] = []
    for (let pageNo = 1; ; pageNo++) {
      if (pageNo > 50) throw new Error('Too many accounting units')
      const r = await request<{ data: FleetUnitRecord[]; totalPages: number }>('/api/ledger/accounting-units', {
        query: { pageNo, pageSize: 200 },
      })
      rows.push(...r.data)
      if (!r.data.length || pageNo >= r.totalPages) break
    }
    return rows.filter((u) => u.isActive)
  }

  const list = <T,>(resource: string, query: FleetQuery = {}) =>
    request<ListEnvelope<T>>(`/api/fleet-workshop/${resource}`, { query: clean(query) }).then(toPage<T>)

  function master<T>(resource: string) {
    const base = `/api/fleet-workshop/${resource}`
    return {
      list: (query: FleetQuery = {}) => list<T>(resource, query),
      get: (id: string) => request<T>(`${base}/${id}`),
      create: (body: Record<string, unknown>) => call(base, { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) => call(`${base}/${id}`, { method: 'PUT', body }),
      remove: (id: string, version: number) => request(`${base}/${id}`, { method: 'DELETE', query: { version } }),
    }
  }

  const assetGroups = master<AssetGroupRecord>('asset-groups')
  const vehicles = master<VehicleRecord>('vehicles')
  const employees = master<WorkshopEmployeeRecord>('employees')
  const fuelLogs = master<FuelLogRecord>('fuel-logs')
  const lubricantLogs = master<LubricantLogRecord>('lubricant-logs')
  const majorComponents = master<MajorComponentRecord>('major-components')
  const tyres = master<TyreRecord>('tyres')
  const schedules = master<MaintenanceScheduleRecord>('schedules')
  const jobCards = master<JobCardRecord>('job-cards')
  const diaryEntries = master<DiaryEntryRecord>('diary-entries')

  return {
    request,
    unitId,
    units,

    dashboard: (unit = unitId.value) =>
      request<FleetDashboardSummary>('/api/fleet-workshop/dashboard/summary', {
        query: clean({ accountingUnitId: unit }),
      }),

    glSettings: {
      get: (unit = unitId.value) =>
        request<GlSettingsRecord>('/api/fleet-workshop/gl-settings', {
          query: clean({ accountingUnitId: unit }),
        }),
      options: (unit = unitId.value) =>
        request<GlSettingsOptions>('/api/fleet-workshop/gl-settings/options', {
          query: clean({ accountingUnitId: unit }),
        }),
      save: (body: Record<string, unknown>) =>
        call('/api/fleet-workshop/gl-settings', { method: 'PUT', body }),
    },

    assetGroups: {
      ...assetGroups,
      options: () => request<{ assetGroups: AssetGroupRecord[] }>('/api/fleet-workshop/asset-groups/options'),
      materials: (id: string) =>
        request<{ data: AssetGroupMaterial[] }>(`/api/fleet-workshop/asset-groups/${id}/materials`).then((r) => r.data || []),
      replaceMaterials: (id: string, materials: AssetGroupMaterial[]) =>
        call(`/api/fleet-workshop/asset-groups/${id}/materials`, { method: 'PUT', body: { materials } }) as Promise<AssetGroupRecord>,
      components: (id: string) =>
        request<{ data: AssetGroupComponent[] }>(`/api/fleet-workshop/asset-groups/${id}/components`).then((r) => r.data || []),
      replaceComponents: (id: string, components: AssetGroupComponent[]) =>
        call(`/api/fleet-workshop/asset-groups/${id}/components`, { method: 'PUT', body: { components } }) as Promise<AssetGroupRecord>,
    },

    procedures: master<ProcedureRecord>('procedures'),

    vehicles: {
      ...vehicles,
      options: () => request<VehicleOptions>('/api/fleet-workshop/vehicles/options'),
      nextNumber: (unit = unitId.value) =>
        request<{ nextNumber: string }>('/api/fleet-workshop/vehicles/next-number', {
          query: clean({ accountingUnitId: unit }),
        }),
      pmTriggers: (id: string) =>
        request<{ data: PmTriggerRecord[] }>(`/api/fleet-workshop/vehicles/${id}/pm-triggers`).then((r) => r.data || []),
      replacePmTriggers: (id: string, pmTriggers: PmTriggerRecord[]) =>
        call(`/api/fleet-workshop/vehicles/${id}/pm-triggers`, { method: 'PUT', body: { pmTriggers } }) as Promise<VehicleRecord>,
      handoffFa: (id: string) =>
        call(`/api/fleet-workshop/vehicles/${id}/handoff-fa`, { method: 'POST', body: {} }),
      resolveStalledMeter: (id: string, body: { resolvedDate: string; newReading: string; notes?: string }) =>
        call(`/api/fleet-workshop/vehicles/${id}/resolve-stalled-meter`, { method: 'POST', body }),
    },

    employees: {
      ...employees,
      options: () =>
        request<{ hrEmployees: Array<{ id: string; employeeIdentifier: string; name: string }> }>(
          '/api/fleet-workshop/employees/options',
        ),
    },

    meterReadings: {
      list: (query: FleetQuery = {}) => list<MeterReadingRecord>('meter-readings', query),
      create: (body: Record<string, unknown>) => call('/api/fleet-workshop/meter-readings', { method: 'POST', body }),
    },

    meterChanges: {
      list: (query: FleetQuery = {}) => list<MeterChangeRecord>('meter-changes', query),
      create: (body: Record<string, unknown>) => call('/api/fleet-workshop/meter-changes', { method: 'POST', body }),
    },

    stalledMeters: {
      list: () => list<StalledMeterRecord>('stalled-meters'),
      resolve: (vehicleId: string, body: { resolvedDate: string; newReading: string; notes?: string }) =>
        call(`/api/fleet-workshop/stalled-meters/${vehicleId}/resolve-stalled-meter`, { method: 'POST', body }),
    },

    fuelLogs: {
      ...fuelLogs,
      nextNumber: (unit = unitId.value) =>
        request<{ nextNumber: string }>('/api/fleet-workshop/fuel-logs/next-number', {
          query: clean({ accountingUnitId: unit }),
        }),
      post: (id: string, body: Record<string, unknown> = {}) =>
        call(`/api/fleet-workshop/fuel-logs/${id}/post`, { method: 'POST', body }) as Promise<FuelLogRecord>,
      reverse: (id: string, reason = 'Reversed from workshop') =>
        call(`/api/fleet-workshop/fuel-logs/${id}/reverse`, { method: 'POST', body: { reason } }) as Promise<FuelLogRecord>,
    },

    fuelTolerances: {
      list: (query: FleetQuery = {}) => list<FuelToleranceAlertRecord>('fuel-tolerances', query),
    },

    lubricantLogs: {
      ...lubricantLogs,
      nextNumber: (unit = unitId.value) =>
        request<{ nextNumber: string }>('/api/fleet-workshop/lubricant-logs/next-number', {
          query: clean({ accountingUnitId: unit }),
        }),
      post: (id: string) =>
        call(`/api/fleet-workshop/lubricant-logs/${id}/post`, { method: 'POST', body: {} }) as Promise<LubricantLogRecord>,
      reverse: (id: string) =>
        call(`/api/fleet-workshop/lubricant-logs/${id}/reverse`, { method: 'POST', body: {} }) as Promise<LubricantLogRecord>,
    },

    majorComponents: {
      ...majorComponents,
      action: (id: string, act: 'mount' | 'remove' | 'repair' | 'scrap', body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/major-components/${id}/${act}`, { method: 'POST', body }) as Promise<MajorComponentRecord>,
    },

    tyres: {
      ...tyres,
      action: (id: string, act: 'fit' | 'rotate' | 'repair' | 'remove' | 'retread' | 'scrap', body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/tyres/${id}/${act}`, { method: 'POST', body }) as Promise<TyreRecord>,
    },

    schedules: {
      ...schedules,
      nextNumber: (unit = unitId.value) =>
        request<{ nextNumber: string }>('/api/fleet-workshop/schedules/next-number', {
          query: clean({ accountingUnitId: unit }),
        }),
      generate: (body: { accountingUnitId?: string; horizonDays: number; fromDate?: string }) =>
        call('/api/fleet-workshop/schedules/generate', { method: 'POST', body }) as Promise<{
          generatedCount: number
          schedules: Array<{ id: string; scheduleNumber: string; vehicleId: string; assetNo: string; serviceType: string; daysOut: number }>
        }>,
      createJobCard: (id: string) =>
        call(`/api/fleet-workshop/schedules/${id}/create-job-card`, { method: 'POST', body: {} }) as Promise<{
          scheduleId: string
          jobCardId: string
          jobNumber: string
        }>,
      raiseRequisition: (id: string) =>
        call(`/api/fleet-workshop/schedules/${id}/requisitions`, { method: 'POST', body: {} }) as Promise<{
          scheduleId: string
          requisitionId: string
          requisitionNumber: string
        }>,
    },

    jobCards: {
      ...jobCards,
      nextNumber: (unit = unitId.value) =>
        request<{ nextNumber: string }>('/api/fleet-workshop/job-cards/next-number', {
          query: clean({ accountingUnitId: unit }),
        }),
      addLine: (id: string, body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/job-cards/${id}/lines`, { method: 'POST', body }) as Promise<JobCardRecord>,
      updateLine: (id: string, lineId: string, body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/job-cards/${id}/lines/${lineId}`, { method: 'PUT', body }) as Promise<JobCardRecord>,
      deleteLine: (id: string, lineId: string) =>
        call(`/api/fleet-workshop/job-cards/${id}/lines/${lineId}`, { method: 'DELETE' }) as Promise<JobCardRecord>,
      replaceAssignments: (id: string, assignments: JobCardAssignmentRecord[]) =>
        call(`/api/fleet-workshop/job-cards/${id}/assignments`, { method: 'PUT', body: { assignments } }) as Promise<JobCardRecord>,
      createMilestone: (id: string, body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/job-cards/${id}/milestones`, { method: 'POST', body }) as Promise<JobCardRecord>,
      updateMilestone: (id: string, milestoneId: string, body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/job-cards/${id}/milestones/${milestoneId}`, { method: 'PUT', body }) as Promise<JobCardRecord>,
      deleteMilestone: (id: string, milestoneId: string, version: number) =>
        request<JobCardRecord>(`/api/fleet-workshop/job-cards/${id}/milestones/${milestoneId}`, {
          method: 'DELETE',
          query: { version },
        }),
      issueParts: (id: string, body: { warehouseId?: string; documentDate?: string } = {}) =>
        call(`/api/fleet-workshop/job-cards/${id}/issue-parts`, { method: 'POST', body }) as Promise<JobCardRecord>,
      raiseRequisition: (id: string, body: Record<string, unknown> = {}) =>
        call(`/api/fleet-workshop/job-cards/${id}/requisitions`, { method: 'POST', body }) as Promise<JobCardRecord>,
      postGl: (id: string, body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/job-cards/${id}/post-gl`, { method: 'POST', body }) as Promise<JobCardRecord>,
      handoff: (id: string, targetModule: 'ap' | 'ar' | 'point_of_sale' | 'project_management', notes = '') =>
        call(`/api/fleet-workshop/job-cards/${id}/handoff`, { method: 'POST', body: { targetModule, notes } }),
      transition: (id: string, body: Record<string, unknown>) =>
        call(`/api/fleet-workshop/job-cards/${id}/transition`, { method: 'POST', body }) as Promise<JobCardRecord>,
    },

    diaryEntries: {
      ...diaryEntries,
      nextNumber: (unit = unitId.value) =>
        request<{ nextNumber: string }>('/api/fleet-workshop/diary-entries/next-number', {
          query: clean({ accountingUnitId: unit }),
        }),
      markPaid: (id: string, paymentReference = '') =>
        call(`/api/fleet-workshop/diary-entries/${id}/mark-paid`, {
          method: 'POST',
          body: { paymentReference },
        }) as Promise<DiaryEntryRecord>,
      allocate: (id: string, allocations: DiaryAllocationRecord[]) =>
        call(`/api/fleet-workshop/diary-entries/${id}/allocate`, {
          method: 'POST',
          body: { allocations },
        }) as Promise<DiaryEntryRecord>,
      promote: (id: string, jobCardId?: string) =>
        call(`/api/fleet-workshop/diary-entries/${id}/promote`, {
          method: 'POST',
          body: jobCardId ? { jobCardId } : {},
        }) as Promise<DiaryEntryRecord>,
    },

    moduleLinks: {
      list: (query: FleetQuery = {}) => list<CrossModuleLinkRecord>('module-links', query),
    },

    reports: {
      run: (query: {
        tab: FleetReportTab
        vehicleId?: string
        assetGroupId?: string
        dateFrom?: string
        dateTo?: string
        exchangeRate?: string
      }) => request<FleetReportResponse>('/api/fleet-workshop/reports', { query: clean(query) }),
    },
  }
}
