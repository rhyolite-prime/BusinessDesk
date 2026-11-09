<script setup lang="ts">
import { getBusinessModule, moduleDashboardPath } from '../features/modules/catalog'
import { inventoryNavigationGroups, inventoryPageByPath, inventorySearchItems } from '../features/inventory/navigation'
import { useInventory, useInventoryUnitId } from '../features/inventory/useInventory'
import type { UnitRecord } from '../features/inventory/inventory-types'

const route = useRoute()
const mobileOpen = ref(false)
const { isDark, initializeTheme, toggleTheme } = useTheme()

const currentModule = getBusinessModule('inventory')!
const currentDashboard = computed(() => moduleDashboardPath(currentModule))
const pageTitle = computed(() => inventoryPageByPath(route.path)?.title ?? currentModule.name)

// Accounting units are loaded once here so every inventory screen shares the
// same selection (stored in the ledger-accounting-unit state key).
const api = useInventory()
const unitId = useInventoryUnitId()
const units = useState<UnitRecord[]>('inventory-units', () => [])
const unitError = ref('')
const unitOptions = computed(() => units.value.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` })))

onMounted(async () => {
  initializeTheme()
  try {
    units.value = await api.units()
    if (!unitId.value && units.value.length) unitId.value = units.value[0].id
  } catch (e: any) {
    unitError.value = e?.data?.statusMessage || 'Could not load accounting units.'
  }
})
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink dark:text-ink">
    <SharedSidebar
      :mobile-open="mobileOpen"
      :module-id="currentModule.id"
      :module-name="currentModule.name"
      :dashboard-to="currentDashboard"
      :navigation-groups="inventoryNavigationGroups"
      @close="mobileOpen = false"
    />
    <div class="min-h-screen transition-[padding] duration-200 lg:pl-[264px]">
      <SharedTopbar
        :dark="isDark"
        :module-id="currentModule.id"
        :module-name="currentModule.name"
        :dashboard-to="currentDashboard"
        :page-title="pageTitle"
        :search-items="inventorySearchItems"
        @toggle-menu="mobileOpen = true"
        @toggle-theme="toggleTheme"
      />
      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <div class="mb-6 flex flex-wrap items-center gap-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Accounting unit</span>
          <SelectInput v-model="unitId" :options="unitOptions" placeholder="Select a unit" class="max-w-sm" />
          <span v-if="unitError" class="text-sm text-red-600">{{ unitError }}</span>
        </div>
        <slot />
      </main>
      <ToastHost />
      <footer class="px-4 pb-6 pt-2 text-center text-[11px] text-slate-400 sm:px-6 lg:px-9">
        BusinessDesk 720 ERP · Inventory workspace
      </footer>
    </div>
  </div>
</template>
