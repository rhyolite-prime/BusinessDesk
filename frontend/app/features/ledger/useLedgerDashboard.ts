import { costCenterOptions } from './cost-center-options'
import { dashboardDateRange, parseDashboardFilters, type DashboardDatePreset } from './dashboard-filters'
import type { DashboardFilters, DashboardOptions, DashboardResponse } from './types'
import { useLedgerApi } from './useLedgerApi'

export function useLedgerDashboard() {
  const api = useLedgerApi(), { user } = useBusinessDeskAuth()
  const selectedUnit = useState<string>('ledger-accounting-unit', () => '')
  const emptyOptions = (): DashboardOptions => ({ accountingUnits: [], costCenters: [], currencies: [], sources: [] })
  const options = shallowRef<DashboardOptions>(emptyOptions())
  const data = shallowRef<DashboardResponse | null>(null)
  const optionsPending = ref(true), pending = ref(false), optionsError = ref(''), error = ref(''), ready = ref(false)
  const datePreset = ref<DashboardDatePreset | 'custom'>('year-to-date')
  const filters = reactive<DashboardFilters>({
    accountingUnitId: selectedUnit.value, ...dashboardDateRange('year-to-date'),
    costCenterId: '', includeChildCostCenters: true, source: '', currencyId: '', status: '',
  })
  const validation = computed(() => {
    if (!ready.value || !options.value.accountingUnits.length) return ''
    try { parseDashboardFilters({ ...filters }); return '' }
    catch (error) { return error instanceof Error ? error.message : 'Check the dashboard filters.' }
  })
  const costCenters = computed(() => costCenterOptions(options.value.costCenters))
  const identity = () => `${user.value?.accountId}:${user.value?.username}`
  let generation = 0, optionsGeneration = 0, controller: AbortController | undefined
  function invalidate() {
    generation++
    controller?.abort()
    data.value = null
    error.value = ''
    pending.value = false
  }
  async function refresh() {
    invalidate()
    if (!ready.value || validation.value || !filters.accountingUnitId) return
    const current = generation, who = identity()
    controller = new AbortController()
    pending.value = true
    try {
      const response = await api.dashboard(parseDashboardFilters({ ...filters }), controller.signal)
      if (current === generation && who === identity()) data.value = response
    } catch (failure: any) {
      if (current === generation && who === identity())
        error.value = failure?.data?.statusMessage || 'Ledger dashboard could not be loaded. Please retry.'
    } finally {
      if (current === generation && who === identity()) pending.value = false
    }
  }
  async function refreshOptions() {
    const current = ++optionsGeneration, who = identity()
    ready.value = false
    optionsPending.value = true
    optionsError.value = ''
    options.value = emptyOptions()
    invalidate()
    try {
      const response = await api.dashboardOptions()
      if (current !== optionsGeneration || who !== identity()) return
      options.value = response
      if (!response.accountingUnits.some(unit => unit.id === filters.accountingUnitId))
        filters.accountingUnitId = response.accountingUnits[0]?.id || ''
      // Removed dimensions must never survive a catalog refresh silently.
      if (filters.costCenterId !== 'unassigned' && !response.costCenters.some(center => center.id === filters.costCenterId)) filters.costCenterId = ''
      if (!response.currencies.some(currency => currency.id === filters.currencyId)) filters.currencyId = ''
      if (!response.sources.includes(filters.source)) filters.source = ''
      selectedUnit.value = filters.accountingUnitId
      ready.value = true
    } catch (failure: any) {
      if (current === optionsGeneration && who === identity())
        optionsError.value = failure?.data?.statusMessage || 'Dashboard filter options could not be loaded.'
    } finally {
      if (current === optionsGeneration && who === identity()) optionsPending.value = false
    }
  }
  function applyDatePreset() {
    if (datePreset.value === 'custom') return
    const unit = options.value.accountingUnits.find(unit => unit.id === filters.accountingUnitId)
    Object.assign(filters, dashboardDateRange(datePreset.value, new Date(), unit?.fiscalYearStartMonth || 1))
  }
  function resetFilters() {
    datePreset.value = 'year-to-date'
    Object.assign(filters, dashboardDateRange('year-to-date'), {
      costCenterId: '', includeChildCostCenters: true, source: '', currencyId: '', status: '',
    })
  }
  watch(() => filters.accountingUnitId, unit => {
    selectedUnit.value = unit
    if (datePreset.value === 'fiscal-year-to-date') applyDatePreset()
  })
  watch(selectedUnit, unit => { filters.accountingUnitId = unit })
  watch([ready, () => JSON.stringify(filters)], () => { void refresh() }, { flush: 'post' })
  watch(identity, () => {
    optionsGeneration++
    ready.value = false
    options.value = emptyOptions()
    selectedUnit.value = ''
    filters.accountingUnitId = ''
    resetFilters()
    invalidate()
    if (user.value) void refreshOptions()
  })
  onMounted(refreshOptions)
  onBeforeUnmount(() => { optionsGeneration++; invalidate() })
  return { filters, datePreset, options, costCenters, data, pending, optionsPending, optionsError, error, validation, refresh, refreshOptions, applyDatePreset, resetFilters }
}
