// Shared option lists for Fleet & Workshop screens (vehicles, asset groups,
// procedures, Inventory items/UOMs/warehouses, cost centers, HR employees,
// customers, suppliers, currencies, and open GL periods).
import { useFleetUnitId, useFleetWorkshop } from './useFleetWorkshop'
import type { FleetUnitRecord, VehicleOptions } from './fleet-types'

export interface FleetSelectOption { value: string; label: string }

export function useFleetOptions() {
  const api = useFleetWorkshop()
  const unitId = useFleetUnitId()
  const units = useState<FleetUnitRecord[]>('fleet-units', () => [])

  const vehicleOptions = ref<VehicleOptions>({
    accountingUnits: [],
    assetGroups: [],
    costCenters: [],
    employees: [],
    suppliers: [],
    customers: [],
    trailers: [],
    currencies: [],
  })
  const vehicles = ref<FleetSelectOption[]>([])
  const vehicleList = ref<Array<{ id: string; assetNo: string; registrationNo: string; primaryMeterUnit: string; currentMeterReading: string; cumulativeMeterReading: string }>>([])
  const procedureOptions = ref<FleetSelectOption[]>([])
  const invItems = ref<FleetSelectOption[]>([])
  const invItemBaseUom = ref<Record<string, string>>({})
  const invItemCost = ref<Record<string, string>>({})
  const invUoms = ref<FleetSelectOption[]>([])
  const invWarehouses = ref<FleetSelectOption[]>([])
  const openPeriods = ref<FleetSelectOption[]>([])

  const assetGroups = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.assetGroups.map((g) => ({ value: g.id, label: `${g.code} — ${g.model}` })),
  )
  const costCenters = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.costCenters.map((c) => ({ value: c.id, label: c.name })),
  )
  const employees = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.employees.map((e) => ({
      value: e.id,
      label: e.employeeIdentifier ? `${e.employeeIdentifier} — ${e.name}` : e.name,
    })),
  )
  const suppliers = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.suppliers.map((s) => ({
      value: s.id,
      label: s.accountNumber ? `${s.accountNumber} — ${s.name}` : s.name,
    })),
  )
  const customers = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.customers.map((c) => ({
      value: c.id,
      label: c.accountNumber ? `${c.accountNumber} — ${c.name}` : c.name,
    })),
  )
  const trailers = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.trailers.map((t) => ({
      value: t.id,
      label: t.registrationNo ? `${t.assetNo} (${t.registrationNo})` : t.assetNo,
    })),
  )
  const currencies = computed<FleetSelectOption[]>(() =>
    vehicleOptions.value.currencies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
  )

  async function loadShared() {
    const [vo, vehs, procs, uoms] = await Promise.all([
      api.vehicles.options().catch(() => vehicleOptions.value),
      api.vehicles.list({ accountingUnitId: unitId.value || undefined, size: 100 }).catch(() => ({ items: [], total: 0 })),
      api.procedures.list({ size: 100 }).catch(() => ({ items: [], total: 0 })),
      api.request<{ data: Array<{ id: string; code: string; name?: string }> }>('/api/inventory/uoms', { query: { size: 200 } }).catch(() => ({ data: [] })),
    ])
    vehicleOptions.value = vo
    vehicleList.value = vehs.items
    vehicles.value = vehs.items.map((v) => ({
      value: v.id,
      label: v.registrationNo ? `${v.assetNo} (${v.registrationNo}) — ${v.makeModel || v.assetType || ''}` : `${v.assetNo} — ${v.makeModel || ''}`,
    }))
    procedureOptions.value = procs.items.map((p) => ({ value: p.id, label: `${p.pcode} — ${p.description}` }))
    invUoms.value = (uoms.data || []).map((u) => ({ value: u.id, label: u.name ? `${u.code} — ${u.name}` : u.code }))
  }

  async function loadUnitScoped() {
    const unit = unitId.value
    if (!unit) return
    const [itemsRes, whRes, periodsRes] = await Promise.all([
      api.request<{ data: Array<{ id: string; itemCode: string; name: string; baseUomId?: string; averageUnitCost?: string; standardCost?: string }> }>(
        '/api/inventory/items',
        { query: { accountingUnitId: unit, size: 100 } },
      ).catch(() => ({ data: [] })),
      api.request<{ data: Array<{ id: string; code: string; name: string }> }>(
        '/api/inventory/warehouses',
        { query: { accountingUnitId: unit, size: 100 } },
      ).catch(() => ({ data: [] })),
      api.request<{ data: Array<{ id: string; name?: string; period?: string; status?: string }> }>(
        '/api/ledger/accounting-periods',
        { query: { accountingUnitId: unit, pageNo: 1, pageSize: 100 } },
      ).catch(() => ({ data: [] })),
    ])
    const itemList = itemsRes.data || []
    invItems.value = itemList.map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.name}` }))
    invItemBaseUom.value = Object.fromEntries(itemList.map((i) => [i.id, i.baseUomId || '']))
    invItemCost.value = Object.fromEntries(itemList.map((i) => [i.id, i.averageUnitCost || i.standardCost || '0']))
    invWarehouses.value = (whRes.data || []).map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }))
    openPeriods.value = (periodsRes.data || [])
      .filter((p) => !p.status || p.status === 'open')
      .map((p) => ({ value: p.id, label: p.name || p.period || p.id }))
  }

  async function loadAll() {
    await Promise.all([loadShared(), loadUnitScoped()])
  }

  watch(unitId, () => {
    void loadAll().catch(() => {})
  }, { immediate: true })

  const vehicleMap = computed(() =>
    Object.fromEntries(vehicleList.value.map((v) => [v.id, v])),
  )

  return {
    unitId,
    units,
    vehicleOptions,
    vehicles,
    vehicleMap,
    assetGroups,
    procedureOptions,
    costCenters,
    employees,
    suppliers,
    customers,
    trailers,
    currencies,
    invItems,
    invItemBaseUom,
    invItemCost,
    invUoms,
    invWarehouses,
    openPeriods,
    loadAll,
    loadShared,
    loadUnitScoped,
  }
}
