<script setup lang="ts">
import { hrNavigationGroups, hrSearchItems } from '../features/hr/navigation'
const route = useRoute()
const mobileOpen = ref(false)
const { isDark, initializeTheme, toggleTheme } = useTheme()
const pageTitle = computed(() => route.path === '/hr/my-profile' ? 'My profile' : route.path === '/hr/profile-requests' ? 'Profile requests' : route.path === '/hr/employees' ? 'Employee directory' : route.path === '/hr/leave' ? 'Time off' : route.path === '/hr/balances' ? 'Leave estimate' : route.path === '/hr/recruitment' ? 'Recruitment' : route.path === '/hr/onboarding' ? 'Onboarding' : route.path === '/hr/performance' ? 'Performance' : 'HR overview')
onMounted(initializeTheme)
</script>
<template>
  <div class="min-h-screen bg-canvas text-ink">
    <SharedSidebar :mobile-open="mobileOpen" module-id="human-resource" module-name="Human Resources" dashboard-to="/hr" :navigation-groups="hrNavigationGroups" @close="mobileOpen = false" />
    <div class="min-h-screen transition-[padding] duration-200 lg:pl-[264px]">
      <SharedTopbar :dark="isDark" module-id="human-resource" module-name="Human Resources" dashboard-to="/hr" :page-title="pageTitle" :search-items="hrSearchItems" @toggle-menu="mobileOpen = true" @toggle-theme="toggleTheme" />
      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9"><slot /></main>
      <ToastHost />
      <footer class="px-4 pb-6 pt-2 text-center text-[11px] text-slate-400">BusinessDesk 720 ERP · Human Resources</footer>
    </div>
  </div>
</template>
