<script setup lang="ts">
import { getBusinessModule, moduleDashboardPath } from '../features/modules/catalog'
import { payrollNavigationGroups, payrollQuickLinks, getPayrollPageByPath } from '../features/payroll/catalog'

const route = useRoute()
const mobileOpen = ref(false)
const { isDark, initializeTheme, toggleTheme } = useTheme()

const currentModule = getBusinessModule('payroll')!
const currentDashboard = computed(() => moduleDashboardPath(currentModule))
const pageTitle = computed(() => route.path === '/payroll'
  ? 'Payroll dashboard'
  : getPayrollPageByPath(route.path)?.title ?? 'Payroll workspace')
const searchItems = payrollQuickLinks.map((item) => ({
  label: item.label,
  detail: item.detail,
  to: item.to,
}))

onMounted(initializeTheme)
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink dark:text-ink">
    <SharedSidebar
      :mobile-open="mobileOpen"
      :module-id="currentModule.id"
      :module-name="currentModule.name"
      :dashboard-to="currentDashboard"
      :navigation-groups="payrollNavigationGroups"
      @close="mobileOpen = false"
    />
    <div class="min-h-screen transition-[padding] duration-200 lg:pl-[264px]">
      <SharedTopbar
        :dark="isDark"
        :module-id="currentModule.id"
        :module-name="currentModule.name"
        :dashboard-to="currentDashboard"
        :page-title="pageTitle"
        :search-items="searchItems"
        @toggle-menu="mobileOpen = true"
        @toggle-theme="toggleTheme"
      />
      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <slot />
      </main>
      <ToastHost />
      <footer class="px-4 pb-6 pt-2 text-center text-[11px] text-slate-400 sm:px-6 lg:px-9">
        BusinessDesk ERP · Payroll workspace · Preview data only
      </footer>
    </div>
  </div>
</template>
