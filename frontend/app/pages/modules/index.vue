<script setup lang="ts">
import { ArrowRight, LockKeyhole, LogOut, Search, ShoppingCart, X } from '@lucide/vue'
import { workspaceSubscriptions } from '../../features/tenant-account'
import { businessModules, type BusinessModule, type ModuleDomain, moduleDashboardPath } from '../../features/modules/catalog'

definePageMeta({ layout: false })
useHead({ title: 'Module Manager' })

const { user, isDemo, logout, refreshSession } = useBusinessDeskAuth()
await refreshSession()
const subscriptionsOpen = ref(false)
const {data:entitlements,error:subscriptionError}=await useAsyncData('module-entitlements',()=>useRequestFetch()<{modules:Record<string,boolean>}>('/api/account/entitlements'))
function canOpen(module:BusinessModule) {const key=workspaceSubscriptions[module.id];return !!key && entitlements.value?.modules[key]===true}
const signingOut = ref(false)
const searchQuery = ref('')
const selectedDomain = ref<'All workspaces' | ModuleDomain>('All workspaces')

const domainFilters: Array<'All workspaces' | ModuleDomain> = [
  'All workspaces',
  'Finance',
  'Operations',
  'People & education',
  'Industry solutions',
]

const currentName = computed(() => user.value?.displayName || user.value?.username || 'BusinessDesk user')
const accountId = computed(() => user.value?.accountId || 'Account ID unavailable')
const initials = computed(() => currentName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'BD')
const liveCount = computed(() => businessModules.filter((module) => module.readiness === 'live').length)
const previewCount = computed(() => businessModules.filter((module) => module.readiness === 'preview').length)
const filteredModules = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return businessModules.filter((module) => {
    const matchesDomain = selectedDomain.value === 'All workspaces' || module.domain === selectedDomain.value
    const matchesQuery = !query || `${module.name} ${module.domain} ${module.category} ${module.description}`.toLowerCase().includes(query)
    return matchesDomain && matchesQuery
  })
})

function domainCount(domain: 'All workspaces' | ModuleDomain) {
  return domain === 'All workspaces' ? businessModules.length : businessModules.filter((module) => module.domain === domain).length
}

function moduleStatusLabel(module: BusinessModule) {
  return module.readiness === 'live' ? 'Live' : 'Preview'
}

function moduleActionLabel(module: BusinessModule) {
  return module.readiness === 'live' ? 'Open dashboard' : 'View dashboard preview'
}

async function signOut() {
  signingOut.value = true
  await logout()
}
</script>

<template>
  <main class="min-h-screen bg-[#f7f8fa] text-slate-800 dark:bg-[#101716] dark:text-slate-100">
    <div class="mx-auto max-w-[1600px] px-4 pb-8 pt-5 sm:px-6 lg:px-7">
      <header class="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">BusinessDesk ERP</p>
          <h1 class="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">Module manager</h1>
          <p class="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500 dark:text-slate-400">Choose a workspace for finance, operations, people, or your industry workflows.</p>
          <p class="mt-1.5 text-[10px] text-slate-400">Account: <span class="font-medium text-slate-500 dark:text-slate-300">{{ accountId }}</span></p>
        </div>

        <div class="flex items-center justify-between gap-3 sm:justify-end">
          <button type="button" class="inline-flex h-9 items-center gap-2 rounded-full border border-sky-200 bg-white px-4 text-[11px] font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800 dark:focus:ring-sky-950" @click="subscriptionsOpen = true">
            <ShoppingCart :size="14" /> Access & subscriptions
          </button>
          <span class="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <div class="flex min-w-0 items-center gap-2">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e5eee9] text-[10px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{{ initials }}</span>
            <span class="hidden max-w-[150px] sm:block">
              <span class="block truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{{ currentName }}</span>
              <span class="block truncate text-[9px] text-slate-400">{{ user?.username }}</span>
            </span>
          </div>
          <button type="button" :disabled="signingOut" aria-label="Sign out" title="Sign out" class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 dark:hover:bg-rose-950/40 dark:hover:text-rose-300" @click="signOut">
            <LogOut :size="15" />
          </button>
        </div>
      </header>

      <div class="mb-4 flex flex-wrap items-center gap-2" aria-label="Module summary">
        <span class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{{ businessModules.length }} workspaces</span>
        <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">{{ liveCount }} live module</span>
        <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">{{ previewCount }} preview dashboards</span>
      </div>

      <div v-if="isDemo" class="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/25">
        <LockKeyhole :size="13" class="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
        <p class="text-[10px] leading-4 text-amber-900/80 dark:text-amber-200/80"><span class="font-semibold">Preview-only session.</span> Authentication and module subscription services are not connected in this demo. Workspace labels show implementation readiness, not account entitlements.</p>
      </div>
      <p v-else class="mb-5 text-[10px] text-slate-400">Preview dashboards use placeholders until their operational services are connected. General Ledger is the currently integrated workspace.</p>

      <section aria-label="Find an ERP workspace" class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label class="relative block w-full lg:max-w-[320px]">
          <span class="sr-only">Search modules</span>
          <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="searchQuery" type="search" placeholder="Search modules…" class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-brand-700 dark:focus:ring-brand-950">
        </label>
        <div class="flex max-w-full gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter modules by domain">
          <button
            v-for="domain in domainFilters"
            :key="domain"
            type="button"
            :aria-pressed="selectedDomain === domain"
            class="shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-300"
            :class="selectedDomain === domain ? 'bg-brand-700 text-white shadow-sm dark:bg-brand-600' : 'border border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-brand-300'"
            @click="selectedDomain = domain"
          >
            {{ domain }} <span class="ml-1 opacity-70">{{ domainCount(domain) }}</span>
          </button>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Business modules">
        <article
          v-for="module in filteredModules"
          :key="module.id"
          class="relative flex min-h-[188px] flex-col rounded-[14px] border bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(30,93,80,0.08)] dark:bg-[#15201e]"
          :class="module.readiness === 'live' ? 'border-brand-200 hover:border-brand-300 dark:border-brand-900 dark:hover:border-brand-700' : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'"
        >
          <span
            class="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold"
            :class="module.readiness === 'live'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300'"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="module.readiness === 'live' ? 'bg-emerald-500' : 'bg-amber-500'" />
            {{ moduleStatusLabel(module) }}
          </span>

          <div class="flex min-w-0 items-center gap-3 pr-14">
            <span class="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <component :is="module.icon" :size="19" :stroke-width="1.8" />
            </span>
            <h2 class="text-[13px] font-semibold leading-5 text-slate-700 dark:text-slate-200">{{ module.name }}</h2>
          </div>

          <p class="mt-2.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400">{{ module.category }}</p>
          <p class="mt-1 text-[9px] leading-[1.55] text-slate-400 dark:text-slate-500">{{ module.description }}</p>
          <NuxtLink
            :to="canOpen(module) ? moduleDashboardPath(module) : '/account'"
            class="mt-auto inline-flex w-fit items-center gap-1 pt-3 text-[10px] font-semibold transition"
            :class="module.readiness === 'live' ? 'text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200' : 'text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300'"
          >
            {{ canOpen(module) ? moduleActionLabel(module) : 'Subscription required' }} <ArrowRight :size="12" />
          </NuxtLink>
        </article>
      </section>

      <div v-if="filteredModules.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No workspaces match your search.</p>
        <p class="mt-1 text-xs text-slate-400">Try another module name or choose a different domain.</p>
        <button type="button" class="mt-4 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300" @click="searchQuery = ''; selectedDomain = 'All workspaces'">Clear filters</button>
      </div>

      <Teleport to="body">
        <div v-if="subscriptionsOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="presentation" @click.self="subscriptionsOpen = false" @keydown.esc="subscriptionsOpen = false">
          <section role="dialog" aria-modal="true" aria-labelledby="subscriptions-title" class="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#15201e]">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-brand-300">Organization workspaces</p>
                <h2 id="subscriptions-title" class="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Access & subscriptions</h2>
              </div>
              <button type="button" aria-label="Close access dialog" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" @click="subscriptionsOpen = false"><X :size="17" /></button>
            </div>
            <div class="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25">
              <p class="text-xs font-semibold text-amber-900 dark:text-amber-200">{{ subscriptionError ? 'Subscription verification unavailable. Module access is not assumed.' : 'Module access is verified against your tenant subscription.' }}</p>
              <p class="mt-1 text-[11px] leading-5 text-amber-900/75 dark:text-amber-200/75">Live and Preview labels describe implementation readiness only. Account administrators can review fees, renewal dates and billing records or request changes from the host.</p>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div class="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700"><p class="text-[10px] text-slate-400">Live module</p><p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ liveCount }}</p></div>
              <div class="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700"><p class="text-[10px] text-slate-400">Preview workspaces</p><p class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ previewCount }}</p></div>
            </div>
            <div class="mt-5 flex justify-end gap-3"><NuxtLink to="/account" class="rounded-lg border px-4 py-2.5 text-xs font-semibold text-brand-700">Account &amp; subscription</NuxtLink>
              <button type="button" class="rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-800" @click="subscriptionsOpen = false">Close</button>
            </div>
          </section>
        </div>
      </Teleport>
    </div>
  </main>
</template>
