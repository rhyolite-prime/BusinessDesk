<script setup lang="ts">
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Recruitment · Human Resources' })
const tab = ref<'vacancy' | 'candidate'>('vacancy')
</script>
<template><div class="space-y-6"><header><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People / Hiring</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Recruitment</h1><p class="mt-2 text-sm text-ink-soft">Organize openings and keep your hiring pipeline moving.</p></header><div class="flex gap-2" role="group" aria-label="Recruitment view"><button v-for="item in (['vacancy', 'candidate'] as const)" :key="item" :aria-pressed="tab === item" class="rounded-lg px-4 py-2 text-sm font-semibold" :class="tab === item ? 'bg-primary text-white' : 'border border-line bg-surface text-ink-soft'" @click="tab = item">{{ item === 'vacancy' ? 'Job openings' : 'Candidates' }}</button></div><HrWorkflow :key="tab" :kind="tab" /></div></template>
