<script setup lang="ts">
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  BookOpenCheck,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Coins,
  Files,
  LayoutDashboard,
  ListTree,
  Settings2,
  WalletCards,
  X,
} from '@lucide/vue'
import type { Component } from 'vue'

const props = defineProps<{ mobileOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()

interface NavigationLink {
  label: string
  to?: string
  icon: Component
  comingSoon?: boolean
}

interface NavigationGroup {
  title: string
  links: NavigationLink[]
}

const groups: NavigationGroup[] = [
  {
    title: 'Workspace',
    links: [{ label: 'Overview', to: '/ledger', icon: LayoutDashboard }],
  },
  {
    title: 'General ledger',
    links: [
      { label: 'Chart of accounts', to: '/ledger/accounts', icon: ListTree },
      { label: 'Journal entries', to: '/ledger/journals', icon: BookOpenCheck },
      { label: 'Payments', icon: WalletCards, comingSoon: true },
      { label: 'Receipts', icon: Banknote, comingSoon: true },
      { label: 'Budgets', icon: Coins, comingSoon: true },
    ],
  },
  {
    title: 'Insights',
    links: [
      { label: 'Financial reports', icon: ChartNoAxesCombined, comingSoon: true },
      { label: 'Activity log', icon: Activity, comingSoon: true },
    ],
  },
]

const setupLinks: NavigationLink[] = [
  { label: 'Accounting units', icon: Building2, comingSoon: true },
  { label: 'Bank accounts', icon: ArrowLeftRight, comingSoon: true },
  { label: 'Preferences', icon: Settings2, comingSoon: true },
]

function isActive(path?: string) {
  if (!path) return false
  if (path === '/ledger') return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <div v-if="props.mobileOpen" class="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] lg:hidden" @click="emit('close')" />
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-[#121d1b] lg:translate-x-0"
    :class="props.mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex h-[76px] items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
      <NuxtLink to="/ledger" class="flex items-center gap-3" @click="emit('close')">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm shadow-brand-900/15">
          <span class="text-sm font-bold tracking-tight">BD</span>
        </span>
        <span class="min-w-0">
          <span class="block text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">BusinessDesk</span>
          <span class="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.13em] text-slate-400">Finance workspace</span>
        </span>
      </NuxtLink>
      <button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Close navigation" @click="emit('close')">
        <X :size="18" />
      </button>
    </div>

    <div class="px-4 pt-4">
      <button class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:border-brand-200 dark:border-slate-700 dark:bg-slate-900/60">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <Building2 :size="16" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">Accra Operations</span>
          <span class="mt-0.5 block text-[11px] text-slate-500">Accounting unit</span>
        </span>
        <ChevronDown :size="15" class="text-slate-400" />
      </button>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      <section v-for="group in groups" :key="group.title">
        <h2 class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{{ group.title }}</h2>
        <div class="space-y-1">
          <div v-for="link in group.links" :key="link.to ?? link.label">
            <NuxtLink
              v-if="link.to"
              :to="link.to"
              class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors"
              :class="isActive(link.to)
                ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/35 dark:text-brand-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'"
              @click="emit('close')"
            >
              <component :is="link.icon" :size="17" :stroke-width="1.8" :class="isActive(link.to) ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'" />
              <span class="flex-1">{{ link.label }}</span>
              <span v-if="isActive(link.to)" class="h-1.5 w-1.5 rounded-full bg-brand-600" />
            </NuxtLink>
            <button v-else type="button" disabled :title="`${link.label} is planned for a later GL phase`" class="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-400 dark:text-slate-600">
              <component :is="link.icon" :size="17" :stroke-width="1.8" class="text-slate-300 dark:text-slate-700" />
              <span class="flex-1">{{ link.label }}</span>
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">Soon</span>
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Configuration</h2>
        <div class="space-y-1">
          <div v-for="link in setupLinks" :key="link.to ?? link.label">
            <NuxtLink
              v-if="link.to"
              :to="link.to"
              class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors"
              :class="isActive(link.to)
                ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/35 dark:text-brand-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'"
              @click="emit('close')"
            >
              <component :is="link.icon" :size="17" :stroke-width="1.8" :class="isActive(link.to) ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'" />
              <span class="flex-1">{{ link.label }}</span>
              <span v-if="isActive(link.to)" class="h-1.5 w-1.5 rounded-full bg-brand-600" />
            </NuxtLink>
            <button v-else type="button" disabled :title="`${link.label} is planned for a later GL phase`" class="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-slate-400 dark:text-slate-600">
              <component :is="link.icon" :size="17" :stroke-width="1.8" class="text-slate-300 dark:text-slate-700" />
              <span class="flex-1">{{ link.label }}</span>
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">Soon</span>
            </button>
          </div>
        </div>
      </section>
    </nav>

    <div class="border-t border-slate-100 p-3 dark:border-slate-800">
      <a href="#help" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70">
        <CircleHelp :size="17" />
        Help &amp; support
      </a>
      <div class="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[#d7e8e1] text-xs font-bold text-brand-800">KA</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">K. Agyeman</span>
          <span class="mt-0.5 block truncate text-[11px] text-slate-500">Finance administrator</span>
        </span>
        <Files :size="16" class="text-slate-400" />
      </div>
    </div>
  </aside>
</template>
