<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import { useInventoryOptions } from '../../../features/inventory/useInventoryOptions'
import InventoryMasterTable, { type MasterField } from '../../../features/inventory/components/InventoryMasterTable.vue'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Item settings' })

const api = useInventory()
const unitId = useInventoryUnitId()
const opts = useInventoryOptions()
const units = useState<{ id: string; baseCurrencyId: string }[]>('inventory-units', () => [])
const currencyId = computed(() => units.value.find((u) => u.id === unitId.value)?.baseCurrencyId || '')

const itemWarehouseFields = computed<MasterField[]>(() => [
  { key: 'itemId', label: 'Item', type: 'select', required: true, options: opts.items.value },
  { key: 'warehouseId', label: 'Warehouse', type: 'select', required: true, options: opts.warehouses.value },
  { key: 'defaultBinId', label: 'Default bin', type: 'select', options: opts.bins.value },
  { key: 'reorderPoint', label: 'Reorder point', type: 'number' },
  { key: 'reorderQuantity', label: 'Reorder quantity', type: 'number' },
  { key: 'minStockLevel', label: 'Minimum stock', type: 'number' },
  { key: 'maxStockLevel', label: 'Maximum stock', type: 'number' },
  { key: 'safetyStock', label: 'Safety stock', type: 'number' },
  { key: 'leadTimeDays', label: 'Lead time (days)', type: 'integer' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])
const itemSupplierFields = computed<MasterField[]>(() => [
  { key: 'itemId', label: 'Item', type: 'select', required: true, options: opts.items.value },
  { key: 'supplierId', label: 'Supplier', type: 'select', required: true, options: opts.suppliers.value },
  { key: 'supplierItemCode', label: 'Supplier item code' },
  { key: 'supplierItemName', label: 'Supplier item name' },
  { key: 'purchaseUomId', label: 'Purchase unit', type: 'select', options: opts.uoms.value },
  { key: 'unitPrice', label: 'Unit price', type: 'number' },
  { key: 'leadTimeDays', label: 'Lead time (days)', type: 'integer' },
  { key: 'minOrderQuantity', label: 'Minimum order qty', type: 'number' },
  { key: 'orderMultiple', label: 'Order multiple', type: 'number' },
  { key: 'isPreferred', label: 'Preferred supplier', type: 'checkbox' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])
const conversionFields = computed<MasterField[]>(() => [
  { key: 'itemId', label: 'Item', type: 'select', required: true, options: opts.items.value },
  { key: 'fromUomId', label: 'From unit', type: 'select', required: true, options: opts.uoms.value },
  { key: 'toUomId', label: 'To unit', type: 'select', required: true, options: opts.uoms.value },
  { key: 'factor', label: 'Factor', type: 'number', required: true, hint: 'Quantity of the "to" unit in one "from" unit.' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])

const iwApi = {
  list: (query: Record<string, any>) => api.itemWarehouses.list({ ...query }),
  create: (body: Record<string, unknown>) => api.itemWarehouses.create(body),
  update: (id: string, body: Record<string, unknown>) => api.itemWarehouses.update(id, body),
  remove: (id: string, version: number) => api.itemWarehouses.remove(id, version),
}
const isApi = {
  list: (query: Record<string, any>) => api.itemSuppliers.list({ ...query }),
  create: (body: Record<string, unknown>) => api.itemSuppliers.create({ ...body, currencyId: currencyId.value }),
  update: (id: string, body: Record<string, unknown>) => api.itemSuppliers.update(id, body),
  remove: (id: string, version: number) => api.itemSuppliers.remove(id, version),
}
const convApi = {
  list: (query: Record<string, any>) => api.itemUomConversions.list({ ...query }),
  create: (body: Record<string, unknown>) => api.itemUomConversions.create(body),
  update: (id: string, body: Record<string, unknown>) => api.itemUomConversions.update(id, body),
  remove: (id: string, version: number) => api.itemUomConversions.remove(id, version),
}
</script>

<template>
  <div class="space-y-10">
    <InventoryMasterTable
      title="Item location planning"
      subtitle="Reorder levels and default bins per item and warehouse."
      icon="cog-6-tooth"
      :api="iwApi"
      :columns="[{ key: 'itemCode', label: 'Item' }, { key: 'warehouseName', label: 'Warehouse' }, { key: 'defaultBinCode', label: 'Default bin' }, { key: 'reorderPoint', label: 'Reorder point' }]"
      :fields="itemWarehouseFields"
      :ready="!!unitId"
      create-label="New planning row"
      :defaults="{ isActive: true }"
    />
    <InventoryMasterTable
      title="Item supplier"
      subtitle="Approved suppliers, prices and lead times per item."
      icon="cog-6-tooth"
      :api="isApi"
      :columns="[{ key: 'itemCode', label: 'Item' }, { key: 'supplierName', label: 'Supplier' }, { key: 'unitPrice', label: 'Unit price' }, { key: 'isPreferred', label: 'Preferred', format: (r: any) => (r.isPreferred ? 'Yes' : 'No') }]"
      :fields="itemSupplierFields"
      :ready="!!unitId"
      create-label="New supplier link"
      :defaults="{ isPreferred: false, isActive: true }"
    />
    <InventoryMasterTable
      title="Unit conversion"
      subtitle="Conversion factors between units for a single item."
      icon="cog-6-tooth"
      :api="convApi"
      :columns="[{ key: 'itemCode', label: 'Item' }, { key: 'fromUom', label: 'From' }, { key: 'toUom', label: 'To' }, { key: 'factor', label: 'Factor' }]"
      :fields="conversionFields"
      :ready="!!unitId"
      create-label="New conversion"
      :defaults="{ isActive: true }"
    />
  </div>
</template>
