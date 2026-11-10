<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import { useInventoryOptions } from '../../../features/inventory/useInventoryOptions'
import InventoryMasterTable, { type MasterField } from '../../../features/inventory/components/InventoryMasterTable.vue'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Units & categories' })

const api = useInventory()
const unitId = useInventoryUnitId()
const opts = useInventoryOptions()

const uomFields: MasterField[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'uomType', label: 'Measure type', type: 'select', required: true, options: ['quantity', 'weight', 'volume', 'length', 'area', 'time'].map((v) => ({ value: v, label: v })) },
  { key: 'decimalPlaces', label: 'Decimal places', type: 'integer' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
]
const categoryFields = computed<MasterField[]>(() => [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'parentId', label: 'Parent category', type: 'select', options: opts.categories.value },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])

const uomApi = {
  list: (query: Record<string, any>) => api.uoms.list({ ...query }),
  create: (body: Record<string, unknown>) => api.uoms.create(body),
  update: (id: string, body: Record<string, unknown>) => api.uoms.update(id, body),
  remove: (id: string, version: number) => api.uoms.remove(id, version),
}
const categoryApi = {
  list: (query: Record<string, any>) => api.categories.list({ ...query }),
  create: (body: Record<string, unknown>) => api.categories.create(body),
  update: (id: string, body: Record<string, unknown>) => api.categories.update(id, body),
  remove: (id: string, version: number) => api.categories.remove(id, version),
}
</script>

<template>
  <div class="space-y-10">
    <InventoryMasterTable
      title="Unit of measure"
      subtitle="Units used to count, buy and sell each item."
      icon="list-bullet"
      :api="uomApi"
      :columns="[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'uomType', label: 'Type' }, { key: 'decimalPlaces', label: 'Decimals' }]"
      :fields="uomFields"
      :ready="!!unitId"
      create-label="New unit"
      :defaults="{ uomType: 'quantity', isActive: true }"
    />
    <InventoryMasterTable
      title="Item category"
      subtitle="Hierarchy used to group items for reporting and defaults."
      icon="list-bullet"
      :api="categoryApi"
      :columns="[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'parentName', label: 'Parent' }, { key: 'itemCount', label: 'Items' }]"
      :fields="categoryFields"
      :ready="!!unitId"
      create-label="New category"
      :defaults="{ isActive: true }"
    />
  </div>
</template>
