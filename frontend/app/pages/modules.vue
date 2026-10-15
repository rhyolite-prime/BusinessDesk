<script setup lang="ts">
import { Activity, ArrowRight, Banknote, BookOpenCheck, Boxes, Building2, ChartNoAxesCombined, LockKeyhole, LogOut, Search, WalletCards } from '@lucide/vue'
import type { Component } from 'vue'

definePageMeta({ layout: false })
useHead({ title: 'Module manager' })

interface BusinessModule {
  id: string
  name: string
  category: string
  description: string
  status: 'available' | 'coming-soon'
  icon: Component
  iconStyle: string
  to?: string
}

const { user, isDemo, logout } = useBusinessDeskAuth()
const search = ref('')
const signingOut = ref(false)

const businessModules: BusinessModule[] = [
  {
    id: 'general-ledger',
    name: 'General Ledger',
    category: 'Finance',
    description: 'Manage your chart of accounts, journals, balances, and financial reporting.',
    status: 'available',
    icon: BookOpenCheck,
    iconStyle: 'bg-[#e8f4ef] text-brand-700 dark:bg-brand-900/35 dark:text-brand-300',
    to: '/ledger',
  },
  {
    id: 'payables',
    name: 'Accounts Payable',
    category: 'Finance',
    description: 'Track supplier invoices, payment runs, approvals, and outstanding balances.',
    status: 'coming-soon',
    icon: Banknote,
    iconStyle: 'bg-[#fff2e8] text-[#bd6b2f] dark:bg-orange-900/25 dark:text-orange-300',
  },
  {
    id: 'receivables',
    name: 'Accounts Receivable',
    category: 'Finance',
    description: 'Manage customer billing, collections, receipts, and credit activity.',
    status: 'coming-soon',
    icon: WalletCards,
    iconStyle: 'bg-[#edf1ff] text-[#566bc3] dark:bg-indigo-900/25 dark:text-indigo-300',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    category: 'Operations',
    description: 'Follow stock levels, item movements, replenishment, and valuations.',
    status: 'coming-soon',
    icon: Boxes,
    iconStyle: 'bg-[#f3eefb] text-[#865bab] dark:bg-purple-900/25 dark:text-purple-300',
  },
  {
    id: 'business-units',
    name: 'Business units',
    category: 'Organization',
    description: 'Set up the teams and accounting units that make up your organization.',
    status: 'coming-soon',
    icon: Building2,
    iconStyle: 'bg-[#e9f1f4] text-[#477286] dark:bg-cyan-900/25 dark:text-cyan-300',
  },
  {
    id: 'analytics',
    name: 'Insights & reports',
    category: 'Insights',
    description: 'Explore operational trends and turn business data into clear decisions.',
    status: 'coming-soon',
    icon: ChartNoAxesCombined,
    iconStyle: 'bg-[#fff3d9] text-[#a7771d] dark:bg-amber-900/25 dark:text-amber-300',
  },
]

const filteredModules = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return businessModules
  return businessModules.filter((module) => `${module.name} ${module.category} ${module.description}`.toLowerCase().includes(query))
})
const availableModules = computed(() => businessModules.filter((module) => module.status === 'available').length)
const demoMode = computed(() => isDemo.value)
const currentName = computed(() => user.value?.displayName || user.value?.username || 'BusinessDesk user')
const accountId = computed(() => user.value?.accountId || 'Account ID unavailable')
const initials = computed(() => currentName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BD')

async function signOut() {
  signingOut.value = true
  await logout()
}
</script>

<template>
  <main class="min-h-screen bg-[#f5f7f6] text-slate-900 dark:bg-[#101716] dark:text-slate-100">
    <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-[#121d1b]/90">
      <div class="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between px-4 sm:px-7 lg:px-10">
        <NuxtLink to="/modules" class="flex items-center gap-3" aria-label="BusinessDesk module manager">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold tracking-tight text-white shadow-sm shadow-brand-900/15">BD</span>
          <span>
            <span class="block text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">BusinessDesk</span>
            <span class="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 sm:block">Business management</span>
          </span>
        </NuxtLink>

        <div class="flex items-center gap-2 sm:gap-3">
          <div class="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex dark:border-slate-700 dark:bg-slate-900/60">
            <Building2 :size="14" class="text-brand-700 dark:text-brand-300" />
            <div class="max-w-[150px]">
              <span class="block truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{{ accountId }}</span>
              <span class="block text-[9px] text-slate-400">Active account</span>
            </div>
          </div>
          <div class="mx-1 hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <div class="flex items-center gap-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5eee9] text-[11px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{{ initials }}</span>
            <span class="hidden max-w-[160px] sm:block">
              <span class="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{{ currentName }}</span>
              <span class="mt-0.5 block truncate text-[10px] text-slate-400">{{ user?.username }}</span>
            </span>
          </div>
          <button type="button" :disabled="signingOut" class="ml-1 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-900 dark:hover:bg-rose-950/30 dark:hover:text-rose-300" @click="signOut">
            <LogOut :size="14" />
            <span class="hidden sm:inline">{{ signingOut ? 'Signing out…' : 'Sign out' }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-[1480px] px-4 pb-12 pt-8 sm:px-7 sm:pt-11 lg:px-10 lg:pt-14">
      <div class="mx-auto max-w-[1180px]">
        <div class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div class="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              <span class="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/35 dark:text-brand-300"><Activity :size="12" /></span>
              Workspace <span class="text-slate-300">/</span> Module manager
            </div>
            <p class="text-[11px] font-semibold text-brand-700 dark:text-brand-300">Welcome, {{ currentName }}</p>
            <h1 class="mt-1.5 text-[30px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-[36px]">Your business workspace</h1>
            <p class="mt-2 max-w-[600px] text-sm leading-6 text-slate-500 dark:text-slate-400">Choose a module to get started. Your organization’s business tools are gathered here in one place.</p>
          </div>
          <label class="relative block w-full sm:max-w-[260px]">
            <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="search" type="search" placeholder="Find a module…" class="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900/30" />
          </label>
        </div>

        <div v-if="demoMode" class="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5 dark:border-amber-900/50 dark:bg-amber-950/25">
          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><LockKeyhole :size="11" /></span>
          <p class="text-[11px] leading-5 text-amber-900/80 dark:text-amber-200/80"><span class="font-semibold">Local demo session.</span> Sign-in is for preview navigation only; no identity provider or production authentication is connected.</p>
        </div>

        <section class="mb-9 grid gap-3 sm:grid-cols-3">
          <article class="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-[#15201e]">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><BookOpenCheck :size="17" /></span>
            <div><p class="text-[10px] text-slate-400">Ready to use</p><p class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ availableModules }} module{{ availableModules === 1 ? '' : 's' }}</p></div>
          </article>
          <article class="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-[#15201e]">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf1ff] text-[#566bc3] dark:bg-indigo-900/25 dark:text-indigo-300"><Boxes :size="17" /></span>
            <div><p class="text-[10px] text-slate-400">In the roadmap</p><p class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ businessModules.length - availableModules }} modules</p></div>
          </article>
          <article class="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-[#15201e]">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff2e8] text-[#bd6b2f] dark:bg-orange-900/25 dark:text-orange-300"><Building2 :size="17" /></span>
            <div class="min-w-0"><p class="text-[10px] text-slate-400">Signed in to</p><p class="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{{ accountId }}</p></div>
          </article>
        </section>

        <section>
          <div class="mb-4 flex items-center justify-between gap-3">
            <div><h2 class="text-sm font-semibold text-slate-900 dark:text-white">Business modules</h2><p class="mt-1 text-[11px] text-slate-400">Tools for finance, operations, and your organization</p></div>
            <span class="hidden items-center gap-1.5 text-[10px] text-slate-400 sm:inline-flex"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {{ availableModules }} available</span>
          </div>

          <div v-if="filteredModules.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article v-for="module in filteredModules" :key="module.id" class="group relative flex min-h-[225px] flex-col rounded-2xl border bg-white p-5 transition duration-200 dark:bg-[#15201e]" :class="module.status === 'available' ? 'border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.035)] hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_14px_30px_rgba(30,93,80,0.09)] dark:border-slate-800 dark:hover:border-brand-700' : 'border-slate-200/70 dark:border-slate-800/80'">
              <div class="flex items-start justify-between gap-3">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl" :class="module.iconStyle"><component :is="module.icon" :size="20" :stroke-width="1.8" /></span>
                <span v-if="module.status === 'available'" class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available</span>
                <span v-else class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400"><LockKeyhole :size="10" /> Coming soon</span>
              </div>
              <div class="mt-4 flex-1">
                <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{{ module.category }}</p>
                <h3 class="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">{{ module.name }}</h3>
                <p class="mt-2 text-[11px] leading-[1.65] text-slate-500 dark:text-slate-400">{{ module.description }}</p>
              </div>
              <NuxtLink v-if="module.to" :to="module.to" class="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 dark:focus:ring-brand-900/50">
                Open module <ArrowRight :size="14" />
              </NuxtLink>
              <div v-else class="mt-4 flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400 dark:bg-slate-900/60 dark:text-slate-500"><LockKeyhole :size="13" /> Not available yet</div>
            </article>
          </div>
          <div v-else class="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-[#15201e]">
            <Search :size="20" class="mx-auto text-slate-400" />
            <p class="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No modules found</p>
            <p class="mt-1 text-xs text-slate-400">Try another search term.</p>
          </div>
        </section>

        <footer class="mt-10 flex flex-col gap-2 border-t border-slate-200/80 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <span>BusinessDesk · Business management workspace</span>
          <span class="inline-flex items-center gap-1.5"><Building2 :size="12" /> Organization: {{ accountId }}</span>
        </footer>
      </div>
    </div>
  </main>
</template>
