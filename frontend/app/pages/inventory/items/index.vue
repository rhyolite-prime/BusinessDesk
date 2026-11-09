<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import { useInventoryOptions } from '../../../features/inventory/useInventoryOptions'
import type { MasterField } from '../../../features/inventory/components/InventoryMasterTable.vue'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Inventory items' })

const api = useInventory()
const unitId = useInventoryUnitId()
const opts = useInventoryOptions()
const units = useState<{ id: string; baseCurrencyId: string }[]>('inventory-units', () => [])

const trackingOptions = [{ value: 'none', label: 'None' }, { value: 'batch', label: 'Batch' }, { value: 'serial', label: 'Serial' }]
const valuationOptions = [{ value: 'weighted_average', label: 'Weighted average' }, { value: 'fifo', label: 'FIFO' }, { value: 'standard', label: 'Standard cost' }]
const typeOptions = [{ value: 'stock', label: 'Stock' }, { value: 'non_stock', label: 'Non-stock' }, { value: 'service', label: 'Service' }, { value: 'kit', label: 'Kit' }]
const statusOptions = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'discontinued', label: 'Discontinued' }]

const fields = computed<MasterField[]>(() => [
  { key: 'itemCode', label: 'Item code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'itemType', label: 'Item type', type: 'select', required: true, options: typeOptions },
  { key: 'status', label: 'Status', type: 'select', required: true, options: statusOptions },
  { key: 'itemCategoryId', label: 'Category', type: 'select', options: opts.categories.value },
  { key: 'baseUomId', label: 'Base unit', type: 'select', required: true, options: opts.uoms.value },
  { key: 'trackingMethod', label: 'Tracking', type: 'select', required: true, options: trackingOptions },
  { key: 'valuationMethod', label: 'Valuation', type: 'select', required: true, options: valuationOptions },
  { key: 'standardCost', label: 'Standard cost', type: 'number' },
  { key: 'purchaseUnitCost', label: 'Purchase unit cost', type: 'number' },
  { key: 'saleUnitPrice', label: 'Sale unit price', type: 'number' },
  { key: 'reorderPoint', label: 'Reorder point', type: 'number' },
  { key: 'minStockLevel', label: 'Minimum stock', type: 'number' },
  { key: 'maxStockLevel', label: 'Maximum stock', type: 'number' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'isPurchasable', label: 'Purchasable', type: 'checkbox' },
  { key: 'isSellable', label: 'Sellable', type: 'checkbox' },
  { key: 'isTaxable', label: 'Taxable', type: 'checkbox' },
])

const currencyId = computed(() => units.value.find((u) => u.id === unitId.value)?.baseCurrencyId || '')

const api_ = {
  list: (query: Record<string, any>) => api.items.list(unitId.value, query.q ?? '', query.page ?? 1, query.size ?? 20),
  create: (body: Record<string, unknown>) => api.items.create({ ...body, currencyId: currencyId.value }),
  update: (id: string, body: Record<string, unknown>) => api.items.update(id, body),
  remove: (id: string, version: number) => api.items.remove(id, version),
}

const columns = [
  { key: 'itemCode', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'categoryName', label: 'Category' },
  { key: 'baseUom', label: 'Unit' },
  { key: 'trackingMethod', label: 'Tracking' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <InventoryMasterTable
    title="Item"
    subtitle="Stock, service and kit items with costing, tracking and reorder rules."
    icon="cube"
    :api="api_"
    :columns="columns"
    :fields="fields"
    :ready="!!unitId"
    create-label="New item"
    :defaults="{ status: 'active', itemType: 'stock', trackingMethod: 'none', valuationMethod: 'weighted_average', isPurchasable: true, isSellable: true, isTaxable: true }"
  />
</template>
