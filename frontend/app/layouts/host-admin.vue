<script setup lang="ts">
const { isDark, initializeTheme, toggleTheme } = useTheme()
onMounted(initializeTheme)
async function logout() { await $fetch('/api/host/logout', { method: 'POST' }); await navigateTo('/host/login') }
</script>
<template>
  <div class="min-h-screen bg-canvas text-ink">
    <header class="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#15201e]">
      <div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <NuxtLink to="/host/currencies" class="font-semibold">BusinessDesk · Host Administration</NuxtLink>
        <nav class="flex items-center gap-4 text-xs"><NuxtLink to="/host/currencies" class="text-brand-700 dark:text-brand-300">Shared config / Currencies</NuxtLink><button @click="toggleTheme">{{ isDark ? 'Light mode' : 'Dark mode' }}</button><button @click="logout">Sign out of host</button></nav>
      </div>
    </header>
    <main class="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8"><slot /></main>
  </div>
</template>
