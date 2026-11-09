<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../../features/inventory/useInventory'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Stock ledger' })

const api = useInventory()
const unitId = useInventoryUnitId()

// The ledger is immutable: every posted movement appears here and cannot be edited.
const ledgerApi = {
  list: (query: Record<string, any>) => api.ledger.list(unitId.value, {}, query.page ?? 1, query.size ?? 20),
  create: async () => {},
  update: async () => {},
  remove: async () => {},
}

const columns = [
  { key: 'transactionDate', label: 'Date' },
  { key: 'documentNumber', label: 'Document' },
  { key: 'documentType', label: 'Type' },
  { key: 'movementReason', label: 'Reason' },
  { key: 'itemCode', label: 'Item' },
  { key: 'warehouseName', label: 'Warehouse' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'balanceQuantity', label: 'Balance qty' },
  { key: 'balanceValue', label: 'Balance value' },
]
</script>

<template>
  <InventoryMasterTable
    title="Ledger entry"
    subtitle="Immutable stock transactions with running balances."
    icon="arrow-path"
    :api="ledgerApi"
    :columns="columns"
    :fields="[]"
    :ready="!!unitId"
    readonly
  />
</template>
