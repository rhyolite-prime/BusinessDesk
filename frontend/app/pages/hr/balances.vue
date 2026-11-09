<script setup lang="ts">
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Time-off estimate · Human Resources' })
const request = useRequestFetch(), { user } = useBusinessDeskAuth()
const employeeId = ref(''), year = ref(new Date().getFullYear()), loading = ref(false), error = ref('')
const balance = ref<{ year: number; entitlement: number; usedCalendarDays: number; estimatedRemaining: number } | null>(null)
let generation = 0
async function load() {
  const current = ++generation
  loading.value = true; balance.value = null; error.value = ''
  try {
    const data = await request<typeof balance.value>(`/api/hr/leave-balances/${employeeId.value}`, { query: { year: year.value } })
    if (current === generation) balance.value = data
  } catch (e: any) { if (current === generation) error.value = e?.data?.statusMessage || 'Unable to load estimate.' }
  finally { if (current === generation) loading.value = false }
}
watch([employeeId, year], () => { ++generation; balance.value = null; error.value = ''; loading.value = false })
watch(() => `${user.value?.accountId}:${user.value?.username}`, () => { ++generation; employeeId.value = ''; balance.value = null; error.value = ''; loading.value = false })
</script>
<template>
  <div class="space-y-6"><header><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People / Time off</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Annual leave estimate</h1><p class="mt-2 text-sm text-ink-soft">A simple calendar-year comparison, not a policy-calculated balance.</p></header>
    <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Uses the employee biodata entitlement minus approved annual leave in inclusive calendar days, clipped to the selected year. Weekends and holidays count; overlaps are counted more than once. No accrual, carryover, proration or approval enforcement is applied. Verify against your leave policy.</div>
    <form class="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm" @submit.prevent="load"><div class="grid gap-4 md:grid-cols-2"><HrEmployeePicker v-model="employeeId" /><div><label for="balance-year" class="mb-1 block text-xs font-semibold">Calendar year</label><input id="balance-year" v-model.number="year" type="number" min="1900" max="2999" step="1" required class="field"></div></div><button :disabled="loading || !employeeId" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ loading ? 'Loading…' : 'Calculate estimate' }}</button></form>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section v-if="balance" class="grid gap-4 md:grid-cols-3" aria-label="Annual leave estimate"><article class="rounded-2xl border border-line bg-surface p-5"><p class="text-sm text-ink-soft">Recorded entitlement</p><p class="mt-3 text-3xl font-semibold">{{ balance.entitlement }}</p><p class="mt-1 text-xs text-ink-faint">Days in employee biodata</p></article><article class="rounded-2xl border border-line bg-surface p-5"><p class="text-sm text-ink-soft">Approved annual leave</p><p class="mt-3 text-3xl font-semibold">{{ balance.usedCalendarDays }}</p><p class="mt-1 text-xs text-ink-faint">Calendar days in {{ balance.year }}</p></article><article class="rounded-2xl border border-line bg-surface p-5"><p class="text-sm text-ink-soft">Estimated remaining</p><p class="mt-3 text-3xl font-semibold">{{ balance.estimatedRemaining }}</p><p class="mt-1 text-xs text-ink-faint">May be negative; not an enforced balance</p></article></section>
    <NuxtLink to="/hr/leave" class="text-sm font-semibold text-primary">← Back to requests</NuxtLink>
  </div>
</template>
<style scoped>.field { width:100%; border:1px solid #cbd5e1; border-radius:.6rem; background:transparent; padding:.6rem .75rem; font-size:.875rem; }</style>
