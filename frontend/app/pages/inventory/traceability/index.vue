<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import { useInventoryOptions } from '../../../features/inventory/useInventoryOptions'
import type { MasterField } from '../../../features/inventory/components/InventoryMasterTable.vue'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Batches & serials' })

const api = useInventory()
const unitId = useInventoryUnitId()
const opts = useInventoryOptions()

const batchFields = computed<MasterField[]>(() => [
  { key: 'itemId', label: 'Item', type: 'select', required: true, options: opts.items.value },
  { key: 'batchNumber', label: 'Batch number', required: true },
  { key: 'supplierBatchNumber', label: 'Supplier batch number' },
  { key: 'productionDate', label: 'Production date', type: 'date' },
  { key: 'expiryDate', label: 'Expiry date', type: 'date' },
  { key: 'qualityStatus', label: 'Quality status', type: 'select', required: true, options: ['pending', 'accepted', 'rejected', 'quarantine'].map((v) => ({ value: v, label: v })) },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])
const serialFields = computed<MasterField[]>(() => [
  { key: 'itemId', label: 'Item', type: 'select', required: true, options: opts.items.value },
  { key: 'serialNumber', label: 'Serial number', required: true },
  { key: 'warehouseId', label: 'Warehouse', type: 'select', options: opts.warehouses.value },
  { key: 'status', label: 'Status', type: 'select', options: ['in_stock', 'defective', 'retired', 'returned'].map((v) => ({ value: v, label: v })) },
  { key: 'warrantyExpiryDate', label: 'Warranty expiry', type: 'date' },
])

const batchApi = {
  list: (query: Record<string, any>) => api.batches.list({ ...query }),
  create: (body: Record<string, unknown>) => api.batches.create(body),
  update: (id: string, body: Record<string, unknown>) => api.batches.update(id, body),
  remove: (id: string, version: number) => api.batches.remove(id, version),
}
const serialApi = {
  list: (query: Record<string, any>) => api.serials.list({ ...query }),
  create: (body: Record<string, unknown>) => api.serials.create(body),
  update: (id: string, body: Record<string, unknown>) => api.serials.update(id, body),
  remove: (id: string, version: number) => api.serials.remove(id, version),
}
</script>

<template>
  <div class="space-y-10">
    <InventoryMasterTable
      title="Batch"
      subtitle="Lots of batch-tracked items with expiry and quality status."
      icon="tag"
      :api="batchApi"
      :columns="[{ key: 'batchNumber', label: 'Batch' }, { key: 'itemCode', label: 'Item' }, { key: 'expiryDate', label: 'Expiry' }, { key: 'qualityStatus', label: 'Quality' }]"
      :fields="batchFields"
      :ready="!!unitId"
      create-label="New batch"
      :defaults="{ qualityStatus: 'pending', isActive: true }"
    />
    <InventoryMasterTable
      title="Serial number"
      subtitle="Individually tracked units. Serials are retired rather than deleted."
      icon="tag"
      :api="serialApi"
      :columns="[{ key: 'serialNumber', label: 'Serial' }, { key: 'itemCode', label: 'Item' }, { key: 'warehouseName', label: 'Warehouse' }, { key: 'status', label: 'Status' }]"
      :fields="serialFields"
      :ready="!!unitId"
      :can-delete="false"
      create-label="New serial"
      :defaults="{ status: 'in_stock' }"
    />
  </div>
</template>
