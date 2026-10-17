<script setup lang="ts">
import { getBusinessModule, moduleDashboardPath } from '../features/modules/catalog'

const route = useRoute()
const mobileOpen = ref(false)
const { isDark, initializeTheme, toggleTheme } = useTheme()

const currentModule = computed(() => {
  if (route.path.startsWith('/ledger')) return getBusinessModule('general-ledger')!
  return getBusinessModule(route.params.module) ?? getBusinessModule('general-ledger')!
})
const currentDashboard = computed(() => moduleDashboardPath(currentModule.value))

onMounted(initializeTheme)
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink dark:text-ink">
    <SharedSidebar
      :mobile-open="mobileOpen"
      :module-id="currentModule.id"
      :module-name="currentModule.name"
      :dashboard-to="currentDashboard"
      @close="mobileOpen = false"
    />
    <div class="min-h-screen transition-[padding] duration-200 lg:pl-[264px]">
      <SharedTopbar
        :dark="isDark"
        :module-id="currentModule.id"
        :module-name="currentModule.name"
        :dashboard-to="currentDashboard"
        @toggle-menu="mobileOpen = true"
        @toggle-theme="toggleTheme"
      />
      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <slot />
      </main>
      <footer class="px-4 pb-6 pt-2 text-center text-[11px] text-slate-400 sm:px-6 lg:px-9">
        BusinessDesk 720 · {{ currentModule.name }} workspace
      </footer>
    </div>
  </div>
</template>
