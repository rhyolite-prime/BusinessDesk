<script setup lang="ts">
const mobileOpen = ref(false)
const { isDark, initializeTheme, toggleTheme } = useTheme()

onMounted(initializeTheme)
</script>

<template>
  <div class="min-h-screen bg-surface text-slate-800 dark:bg-[#101716] dark:text-slate-100">
    <SharedSidebar :mobile-open="mobileOpen" @close="mobileOpen = false" />
    <div class="min-h-screen transition-[padding] duration-200 lg:pl-[268px]">
      <SharedTopbar :dark="isDark" @toggle-menu="mobileOpen = true" @toggle-theme="toggleTheme" />
      <main class="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <slot />
      </main>
      <footer class="px-4 pb-6 pt-2 text-center text-[11px] text-slate-400 sm:px-6 lg:px-9">
        BusinessDesk Finance · Accounting workspace
      </footer>
    </div>
  </div>
</template>
