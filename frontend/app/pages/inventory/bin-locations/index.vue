<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import { useInventoryOptions } from '../../../features/inventory/useInventoryOptions'
import type { MasterField } from '../../../features/inventory/components/InventoryMasterTable.vue'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Bin locations' })

const api = useInventory()
const unitId = useInventoryUnitId()
const opts = useInventoryOptions()

const fields = computed<MasterField[]>(() => [
  { key: 'warehouseId', label: 'Warehouse', type: 'select', required: true, options: opts.warehouses.value },
  { key: 'code', label: 'Bin code', required: true },
  { key: 'zone', label: 'Zone' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])

const api_ = {
  list: (query: Record<string, any>) => api.binLocations.list({ ...query, accountingUnitId: unitId.value }),
  create: (body: Record<string, unknown>) => api.binLocations.create(body),
  update: (id: string, body: Record<string, unknown>) => api.binLocations.update(id, body),
  remove: (id: string, version: number) => api.binLocations.remove(id, version),
}

const columns = [
  { key: 'code', label: 'Bin' },
  { key: 'warehouseName', label: 'Warehouse' },
  { key: 'zone', label: 'Zone' },
  { key: 'capacity', label: 'Capacity' },
]
</script>

<template>
  <InventoryMasterTable
    title="Bin location"
    subtitle="Bins and zones inside each warehouse, used for put-away and transfers."
    icon="map-pin"
    :api="api_"
    :columns="columns"
    :fields="fields"
    :ready="!!unitId"
    create-label="New bin"
    :defaults="{ isActive: true }"
  />
</template>
