<script setup lang="ts">
import { Activity, ArrowLeft, ArrowRight, Database, Info, Settings, ShieldCheck } from '@lucide/vue'
import { getBusinessModule, moduleDashboardPath } from '../../features/modules/catalog'

definePageMeta({ layout: 'admin-ledger' })

const route = useRoute()
const initialModule = getBusinessModule(route.params.module)

if (!initialModule) {
  throw createError({ statusCode: 404, statusMessage: 'ERP module not found' })
}

if (initialModule.id === 'general-ledger') {
  await navigateTo('/ledger', { replace: true })
}

const activeModule = computed(() => getBusinessModule(route.params.module) ?? initialModule)
const setupSteps = [
  { title: 'Connect operational data', description: 'Link the module to its service and business records.', icon: Database },
  { title: 'Configure roles & policies', description: 'Set workspace access, approvals, and operating preferences.', icon: ShieldCheck },
  { title: 'Prepare the workspace', description: 'Import or create verified records before day-to-day use.', icon: Settings },
]

useHead(() => ({ title: `${activeModule.value.name} overview` }))
</script>

<template>
  <div v-if="activeModule && activeModule.id !== 'general-ledger'" class="space-y-5">
    <header class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div class="min-w-0">
        <NuxtLink to="/modules" class="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-ink-faint transition hover:text-primary">
          <ArrowLeft :size="14" /> Module manager
        </NuxtLink>
        <div class="flex items-start gap-4">
          <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary-soft text-primary shadow-sm">
            <component :is="activeModule.icon" :size="25" :stroke-width="1.7" />
          </span>
          <div class="min-w-0 pt-0.5">
            <div class="mb-1.5 flex flex-wrap items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{{ activeModule.domain }} workspace</span>
              <span class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">Preview</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[30px]">{{ activeModule.name }}</h1>
            <p class="mt-1.5 max-w-3xl text-sm leading-6 text-ink-soft">{{ activeModule.description }}</p>
          </div>
        </div>
      </div>
      <NuxtLink to="/modules" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-ink-soft shadow-sm transition hover:border-primary/25 hover:bg-primary-soft/40 hover:text-primary">
        <ArrowLeft :size="14" /> All workspaces
      </NuxtLink>
    </header>

    <section class="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5 dark:border-amber-900/50 dark:bg-amber-950/25" aria-label="Preview data notice">
      <Info :size="17" class="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
      <div>
        <p class="text-xs font-semibold text-amber-950 dark:text-amber-200">Preview workspace — no operational service connected</p>
        <p class="mt-1 text-[11px] leading-5 text-amber-900/75 dark:text-amber-200/75">This module-specific landing page is ready for its ERP workflows. Live records, transactions, approvals, and reports are not connected, so no business figures are being presented as real.</p>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 md:grid-cols-3" :aria-label="`${activeModule.name} overview metrics`">
      <article v-for="metric in activeModule.metrics" :key="metric.label" class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <p class="text-xs font-medium text-ink-faint">{{ metric.label }}</p>
        <p class="mt-4 text-xl font-semibold tracking-tight text-ink">Not connected</p>
        <p class="mt-1.5 text-[11px] leading-5 text-ink-faint">{{ metric.context }}</p>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
      <div class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Workspace map</p>
            <h2 class="mt-1 text-base font-semibold text-ink">Core workflows</h2>
            <p class="mt-1 text-xs text-ink-faint">The main areas this module will bring together.</p>
          </div>
          <span class="rounded-lg bg-primary-soft p-2 text-primary"><Activity :size="17" /></span>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article v-for="(workflow, index) in activeModule.workflows" :key="workflow.title" class="rounded-lg border border-line bg-canvas/55 p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-ink-faint ring-1 ring-line">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Planned</span>
            </div>
            <h3 class="mt-3 text-xs font-semibold text-ink">{{ workflow.title }}</h3>
            <p class="mt-1.5 text-[11px] leading-5 text-ink-faint">{{ workflow.description }}</p>
          </article>
        </div>
      </div>

      <aside class="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Implementation readiness</p>
        <h2 class="mt-1 text-base font-semibold text-ink">Workspace setup</h2>
        <p class="mt-1 text-xs leading-5 text-ink-faint">These foundations must be connected before live work can begin.</p>

        <ol class="mt-5 space-y-4">
          <li v-for="(step, index) in setupSteps" :key="step.title" class="flex gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-faint"><component :is="step.icon" :size="15" /></span>
            <div class="min-w-0 flex-1 border-b border-line pb-3 last:border-0 last:pb-0">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="text-[11px] font-semibold text-ink">{{ step.title }}</h3>
                <span class="text-[9px] font-medium text-amber-700 dark:text-amber-300">Not configured</span>
              </div>
              <p class="mt-1 text-[10px] leading-4 text-ink-faint">{{ step.description }}</p>
              <span class="sr-only">Setup step {{ index + 1 }}</span>
            </div>
          </li>
        </ol>

        <NuxtLink to="/modules" class="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:text-primary-dark">
          Browse other workspaces <ArrowRight :size="14" />
        </NuxtLink>
      </aside>
    </section>

    <section class="flex flex-col justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 rounded-lg bg-canvas p-2 text-ink-faint"><Activity :size="16" /></span>
        <div>
          <h2 class="text-xs font-semibold text-ink">Recent activity</h2>
          <p class="mt-1 text-[11px] text-ink-faint">No live activity is available until this module is connected.</p>
        </div>
      </div>
      <NuxtLink :to="moduleDashboardPath(activeModule)" class="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint" aria-current="page">
        {{ activeModule.name }} overview <ArrowRight :size="13" />
      </NuxtLink>
    </section>
  </div>
</template>
