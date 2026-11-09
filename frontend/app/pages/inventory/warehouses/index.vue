<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'
import type { MasterField } from '../../../features/inventory/components/InventoryMasterTable.vue'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Warehouses' })

const api = useInventory()
const unitId = useInventoryUnitId()

const typeOptions = ['warehouse', 'store', 'van', 'consignment', 'bonded', 'virtual'].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))
const fields: MasterField[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'warehouseType', label: 'Type', type: 'select', required: true, options: typeOptions },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'phoneNo', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'allowsNegativeStock', label: 'Allows negative stock', type: 'checkbox' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
]

const api_ = {
  list: (query: Record<string, any>) => api.warehouses.list(unitId.value, query.q ?? '', query.page ?? 1, query.size ?? 20),
  create: (body: Record<string, unknown>) => api.warehouses.create({ ...body, accountingUnitId: unitId.value }),
  update: (id: string, body: Record<string, unknown>) => api.warehouses.update(id, body),
  remove: (id: string, version: number) => api.warehouses.remove(id, version),
}

const columns = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'warehouseType', label: 'Type' },
  { key: 'allowsNegativeStock', label: 'Negative stock', format: (r: any) => (r.allowsNegativeStock ? 'Yes' : 'No') },
  { key: 'isActive', label: 'Active', format: (r: any) => (r.isActive === false ? 'No' : 'Yes') },
]
</script>

<template>
  <InventoryMasterTable
    title="Warehouse"
    subtitle="Physical, transit and virtual locations that hold stock for the unit."
    icon="building-office"
    :api="api_"
    :columns="columns"
    :fields="fields"
    :ready="!!unitId"
    create-label="New warehouse"
    :defaults="{ warehouseType: 'warehouse', allowsNegativeStock: false, isActive: true }"
  />
</template>
