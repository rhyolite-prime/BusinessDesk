// Dropdown sources shared by the inventory sub-route pages. Each list is scoped
// to the selected accounting unit and refreshed when the unit changes.
import { useInventory, useInventoryUnitId } from './useInventory'
import type { UnitRecord } from './inventory-types'

export interface SelectOption { value: string; label: string }

export function useInventoryOptions() {
  const api = useInventory()
  const unitId = useInventoryUnitId()
  const units = useState<UnitRecord[]>('inventory-units', () => [])

  const items = ref<SelectOption[]>([])
  /** Base unit per item, used to default the unit on new document lines. */
  const itemBaseUom = ref<Record<string, string>>({})
  const uoms = ref<SelectOption[]>([])
  const categories = ref<SelectOption[]>([])
  const warehouses = ref<SelectOption[]>([])
  const bins = ref<SelectOption[]>([])
  const suppliers = ref<SelectOption[]>([])

  const unit = computed(() => units.value.find((u) => u.id === unitId.value))

  async function load() {
    if (!unitId.value) return
    const unit = unitId.value
    const [i, u, c, w, b, s] = await Promise.all([
      api.items.list(unit, '', 1, 100),
      api.uoms.list({ size: 200 }),
      api.categories.options(),
      api.warehouses.list(unit, '', 1, 100),
      api.binLocations.list({ accountingUnitId: unit, size: 200 }),
      api.request<{ data: { id: string; name: string }[] }>('/api/shared/suppliers', { query: { pageNo: 1, pageSize: 200 } }),
    ])
    items.value = i.items.map((r) => ({ value: r.id, label: `${r.itemCode} — ${r.name}` }))
    itemBaseUom.value = Object.fromEntries(i.items.map((r) => [r.id, r.baseUomId || '']))
    uoms.value = u.items.map((r: any) => ({ value: r.id, label: r.code }))
    categories.value = c.items.map((r: any) => ({ value: r.id, label: r.name }))
    warehouses.value = w.items.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))
    bins.value = b.items.map((r: any) => ({ value: r.id, label: `${r.warehouseName ? `${r.warehouseName} / ` : ''}${r.code}` }))
    suppliers.value = (s.data || []).map((r) => ({ value: r.id, label: r.name }))
  }

  watch(unitId, () => { void load().catch(() => {}) }, { immediate: true })

  return { unitId, unit, items, itemBaseUom, uoms, categories, warehouses, bins, suppliers, load }
}
