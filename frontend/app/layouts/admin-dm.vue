<script setup lang="ts">
import { getBusinessModule, moduleDashboardPath } from '../features/modules/catalog'
import { documentNavigationGroups, documentPageByPath, documentSearchItems } from '../features/documents/navigation'
import { useDocumentsUnitId } from '../features/documents/useDocuments'

interface UnitRecord {
  id: string
  code: string
  name: string
  isActive?: boolean
}

const route = useRoute()
const mobileOpen = ref(false)
const { isDark, initializeTheme, toggleTheme } = useTheme()

const currentModule = getBusinessModule('document-management')!
const currentDashboard = computed(() => moduleDashboardPath(currentModule))
const pageTitle = computed(() => documentPageByPath(route.path)?.title ?? currentModule.name)

const unitId = useDocumentsUnitId()
const units = useState<UnitRecord[]>('dm-units', () => [])
const unitError = ref('')
const unitOptions = computed(() => units.value.map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` })))

async function loadUnits() {
  unitError.value = ''
  try {
    const r = await $fetch<{ data: UnitRecord[]; totalCount: number }>('/api/ledger/accounting-units', {
      query: { pageNo: 1, pageSize: 200 },
    }).catch(() => ({ data: [] as UnitRecord[], totalCount: 0 }))
    units.value = r.data || []
    if (!unitId.value && units.value.length) {
      unitId.value = units.value[0].id
    }
  } catch (e: any) {
    unitError.value = e?.data?.statusMessage || 'Could not load accounting units.'
  }
}

onMounted(() => {
  initializeTheme()
  void loadUnits()
})
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink dark:text-ink">
    <SharedSidebar
      :mobile-open="mobileOpen"
      :module-id="currentModule.id"
      :module-name="currentModule.name"
      :dashboard-to="currentDashboard"
      :navigation-groups="documentNavigationGroups"
      @close="mobileOpen = false"
    />
    <div class="min-h-screen transition-[padding] duration-200 lg:pl-[264px]">
      <SharedTopbar
        :dark="isDark"
        :module-id="currentModule.id"
        :module-name="currentModule.name"
        :dashboard-to="currentDashboard"
        :page-title="pageTitle"
        :search-items="documentSearchItems"
        @toggle-menu="mobileOpen = true"
        @toggle-theme="toggleTheme"
      />
      <div class="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-6 lg:px-9">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <label for="dm-unit-select" class="text-slate-500 dark:text-slate-400">Accounting unit</label>
          <SelectInput
            id="dm-unit-select"
            v-model="unitId"
            :options="unitOptions"
            placeholder="Select accounting unit"
            class="min-w-[240px] max-w-xs"
          />
          <span v-if="unitError" role="alert" class="text-xs text-red-600">{{ unitError }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <NuxtLink to="/documents/explorer" class="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink-soft hover:border-primary/40 hover:text-primary">
            Explorer
          </NuxtLink>
          <NuxtLink to="/documents/search" class="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink-soft hover:border-primary/40 hover:text-primary">
            Search
          </NuxtLink>
          <NuxtLink to="/documents/approvals" class="rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink-soft hover:border-primary/40 hover:text-primary">
            Approvals
          </NuxtLink>
        </div>
      </div>
      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-6 lg:px-9">
        <slot />
      </main>
      <ToastHost />
      <footer class="px-4 pb-6 pt-2 text-center text-[11px] text-slate-400 sm:px-6 lg:px-9">
        BusinessDesk 720 ERP · Document Management workspace
      </footer>
    </div>
  </div>
</template>
