<script setup lang="ts">
import { Bell, ChevronDown, Menu, Moon, Search, Sun } from '@lucide/vue'

withDefaults(defineProps<{ dark: boolean }>(), { dark: false })
const emit = defineEmits<{ toggleMenu: []; toggleTheme: [] }>()
const searchOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-9 dark:border-slate-800 dark:bg-[#121d1b]/90">
    <div class="flex min-w-0 items-center gap-3">
      <button class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Open navigation" @click="emit('toggleMenu')">
        <Menu :size="20" />
      </button>
      <div class="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
        <span>Workspace</span>
        <span class="text-slate-300">/</span>
        <span class="font-semibold text-slate-700 dark:text-slate-200">General Ledger</span>
      </div>
      <div class="sm:hidden">
        <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">BusinessDesk</p>
        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">General Ledger</p>
      </div>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2">
      <div v-if="searchOpen" class="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex dark:border-slate-700 dark:bg-slate-900">
        <Search :size="15" class="text-slate-400" />
        <input autofocus type="search" placeholder="Search the ledger…" class="w-44 bg-transparent text-xs outline-none placeholder:text-slate-400 xl:w-56" @keydown.esc="searchOpen = false" />
        <kbd class="rounded border border-slate-200 bg-white px-1 text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">ESC</kbd>
      </div>
      <button class="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Search" @click="searchOpen = !searchOpen">
        <Search :size="17" />
      </button>
      <button class="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Notifications">
        <Bell :size="17" />
        <span class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#121d1b]" />
      </button>
      <button class="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'" @click="emit('toggleTheme')">
        <Sun v-if="dark" :size="17" />
        <Moon v-else :size="17" />
      </button>
      <div class="mx-1 hidden h-7 w-px bg-slate-200 sm:block dark:bg-slate-700" />
      <button class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
        <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eee9] text-[11px] font-bold text-brand-800">KA</span>
        <span class="hidden text-left sm:block">
          <span class="block text-xs font-semibold leading-4 text-slate-800 dark:text-slate-100">K. Agyeman</span>
          <span class="block text-[10px] leading-4 text-slate-400">Administrator</span>
        </span>
        <ChevronDown :size="14" class="hidden text-slate-400 sm:block" />
      </button>
    </div>
  </header>
</template>
