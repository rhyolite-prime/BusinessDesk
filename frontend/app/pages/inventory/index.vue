<script setup lang="ts">
import { useInventory, useInventoryUnitId } from '../../features/inventory/useInventory'
import { emptyDashboard, type InventoryDashboard } from '../../features/inventory/inventory-types'
import { inventoryPages } from '../../features/inventory/navigation'

definePageMeta({ layout: 'admin-inventory' })
useHead({ title: 'Inventory' })

const api = useInventory()
const unitId = useInventoryUnitId()
const dash = ref<InventoryDashboard>(emptyDashboard())
const loading = ref(false)
const error = ref('')

async function load() {
  if (!unitId.value) return
  loading.value = true
  error.value = ''
  try {
    dash.value = await api.dashboard(unitId.value)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Could not load the inventory summary.'
  } finally {
    loading.value = false
  }
}
watch(unitId, load)
onMounted(load)

const links = inventoryPages.filter((p) => p.path !== '/inventory')
</script>

<template>
  <section class="space-y-8">
    <PageHeader title="Inventory" subtitle="Stock, movements and period health for the selected accounting unit." icon="cube" />

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Stock value" :value="dash.stockValue ? formatCurrency(dash.stockValue) : '—'" icon="scale" tone="green" />
      <StatCard label="Items" :value="dash.items ?? 0" icon="cube" tone="primary" />
      <StatCard label="Pending documents" :value="dash.pendingDocuments ?? 0" icon="document-text" tone="amber" />
      <StatCard label="Low-stock items" :value="dash.lowStockItems ?? 0" icon="information-circle" tone="red" />
      <StatCard label="Active warehouses" :value="dash.activeWarehouses ?? 0" icon="building-office" tone="blue" />
      <StatCard label="Movements (30 days)" :value="dash.movements30d ?? 0" icon="arrow-path" tone="purple" />
      <StatCard label="Batches expiring (30 days)" :value="dash.batchesExpiring30d ?? 0" icon="tag" tone="amber" />
    </div>

    <div>
      <h2 class="mb-3 text-sm font-semibold">Workspaces</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink v-for="link in links" :key="link.path" :to="link.path" class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary dark:border-slate-800 dark:bg-slate-900">
          <div class="font-semibold">{{ link.title }}</div>
          <p class="mt-1 text-sm text-slate-500">{{ link.description }}</p>
        </NuxtLink>
      </div>
    </div>
    <p v-if="loading" class="text-xs text-slate-400">Refreshing…</p>
  </section>
</template>
