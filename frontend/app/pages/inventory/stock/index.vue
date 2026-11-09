<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Stock balances' })

const api = useInventory()
const unitId = useInventoryUnitId()

// Balances are maintained by posting stock documents, so this list is read-only.
const balanceApi = {
  list: (query: Record<string, any>) => api.balances.list(unitId.value, {}, query.page ?? 1, query.size ?? 20),
  create: async () => {},
  update: async () => {},
  remove: async () => {},
}

const columns = [
  { key: 'itemCode', label: 'Item' },
  { key: 'warehouseName', label: 'Warehouse' },
  { key: 'batchNumber', label: 'Batch' },
  { key: 'quantityOnHand', label: 'On hand' },
  { key: 'averageUnitCost', label: 'Average cost' },
  { key: 'stockValue', label: 'Value' },
]
</script>

<template>
  <InventoryMasterTable
    title="Stock balance"
    subtitle="On-hand quantities and values by item, warehouse and batch. Change stock through stock documents."
    icon="scale"
    :api="balanceApi"
    :columns="columns"
    :fields="[]"
    :ready="!!unitId"
    readonly
  />
</template>
