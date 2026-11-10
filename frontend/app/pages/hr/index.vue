<script setup lang="ts">
import { ArrowRight, CalendarDays, UsersRound, Clock3, BriefcaseBusiness, ClipboardList, TrendingUp } from '@lucide/vue'
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Human Resources' })
const request = useRequestFetch()
const { user } = useBusinessDeskAuth()
const employees = ref<number | null>(null)
const leave = ref<{ pendingCount: number; awayCount: number } | null>(null)
const employeeError = ref('')
const leaveError = ref('')
let generation = 0
async function load() {
  const current = ++generation
  employees.value = null; leave.value = null; employeeError.value = ''; leaveError.value = ''
  await Promise.all([
    request<{ totalCount: number }>('/api/shared/employees', { query: { pageSize: 1 } }).then(data => { if (current === generation) employees.value = data.totalCount }).catch((e) => { if (current === generation) employeeError.value = e?.data?.statusMessage || 'Unable to load employees.' }),
    request<{ pendingCount: number; awayCount: number }>('/api/hr/leave-requests').then(data => { if (current === generation) leave.value = data }).catch((e) => { if (current === generation) leaveError.value = e?.data?.statusMessage || 'Unable to load leave requests.' }),
  ])
}
watch(() => `${user.value?.accountId}:${user.value?.username}`, load)
onMounted(load)
</script>
<template>
  <div class="space-y-7">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People workspace</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Human Resources</h1><p class="mt-2 text-sm text-ink-soft">A clearer view of your people and their time away.</p></div>
      <NuxtLink to="/hr/employees" class="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">View employees <ArrowRight :size="16" class="ml-1 inline" /></NuxtLink>
    </header>
    <section class="grid gap-4 md:grid-cols-3" aria-label="HR summary">
      <article class="rounded-2xl border border-line bg-surface p-5 shadow-sm"><UsersRound class="text-primary" :size="20"/><p class="mt-5 text-sm text-ink-soft">Employee records</p><p class="mt-1 text-3xl font-semibold">{{ employees ?? '—' }}</p><p class="mt-2 text-xs text-ink-faint">All live records, regardless of status</p><p v-if="employeeError" role="alert" class="mt-2 text-xs text-red-600">{{ employeeError }}</p></article>
      <article class="rounded-2xl border border-line bg-surface p-5 shadow-sm"><Clock3 class="text-amber-600" :size="20"/><p class="mt-5 text-sm text-ink-soft">Pending requests</p><p class="mt-1 text-3xl font-semibold">{{ leave?.pendingCount ?? '—' }}</p><p class="mt-2 text-xs text-ink-faint">Leave requests awaiting a decision</p><p v-if="leaveError" role="alert" class="mt-2 text-xs text-red-600">{{ leaveError }}</p></article>
      <article class="rounded-2xl border border-line bg-surface p-5 shadow-sm"><CalendarDays class="text-blue-600" :size="20"/><p class="mt-5 text-sm text-ink-soft">Away today</p><p class="mt-1 text-3xl font-semibold">{{ leave?.awayCount ?? '—' }}</p><p class="mt-2 text-xs text-ink-faint">Employees with approved leave today (server date)</p></article>
    </section>
    <section class="grid gap-4 lg:grid-cols-2">
      <NuxtLink to="/hr/employees" class="group rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-primary/40"><div class="flex justify-between"><span class="rounded-xl bg-primary-soft p-3 text-primary"><UsersRound :size="22" /></span><ArrowRight class="text-ink-faint group-hover:text-primary" :size="19" /></div><h2 class="mt-5 text-lg font-semibold">Your people</h2><p class="mt-2 text-sm leading-6 text-ink-soft">Search the directory and maintain employee profiles, contact details and employment information.</p></NuxtLink>
      <NuxtLink to="/hr/leave" class="group rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-primary/40"><div class="flex justify-between"><span class="rounded-xl bg-amber-50 p-3 text-amber-700"><CalendarDays :size="22" /></span><ArrowRight class="text-ink-faint group-hover:text-primary" :size="19" /></div><h2 class="mt-5 text-lg font-semibold">Time off</h2><p class="mt-2 text-sm leading-6 text-ink-soft">Record leave requests and keep track of approvals, rejections and cancellations.</p></NuxtLink>
    </section>
    <section class="grid gap-4 md:grid-cols-3">
      <NuxtLink to="/hr/recruitment" class="rounded-2xl border border-line bg-surface p-5 hover:border-primary/40"><BriefcaseBusiness :size="20" class="text-primary"/><h2 class="mt-4 font-semibold">Recruitment</h2><p class="mt-2 text-sm text-ink-soft">Organize openings and candidates.</p></NuxtLink>
      <NuxtLink to="/hr/onboarding" class="rounded-2xl border border-line bg-surface p-5 hover:border-primary/40"><ClipboardList :size="20" class="text-primary"/><h2 class="mt-4 font-semibold">Onboarding</h2><p class="mt-2 text-sm text-ink-soft">Track new-starter tasks.</p></NuxtLink>
      <NuxtLink to="/hr/performance" class="rounded-2xl border border-line bg-surface p-5 hover:border-primary/40"><TrendingUp :size="20" class="text-primary"/><h2 class="mt-4 font-semibold">Performance</h2><p class="mt-2 text-sm text-ink-soft">Record employee reviews.</p></NuxtLink>
    </section>
  </div>
</template>
