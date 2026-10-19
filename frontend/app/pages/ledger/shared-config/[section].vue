<script setup lang="ts">
definePageMeta({ layout: 'admin-ledger' })
const sections: Record<string, { title: string; description: string }> = {
  'company-profile': { title: 'Company profile', description: 'Company profile management is not implemented yet.' },
  'cost-centers': { title: 'Cost Centers', description: 'Cost center management is not implemented yet.' },
  'system-numbers': { title: 'System numbers', description: 'System numbering configuration is not implemented yet.' },
}
const route = useRoute()
const section = computed(() => sections[String(route.params.section)])
if (!section.value) throw createError({ statusCode: 404, statusMessage: 'Configuration page not found.' })
useHead(() => ({ title: section.value?.title }))
</script>
<template>
  <div v-if="section" class="space-y-6"><div><div class="mb-2 text-xs font-medium text-slate-400">Shared config</div><h1 class="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[30px]">{{ section.title }}</h1></div><section class="rounded-xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-[#15201e]"><p class="text-sm text-slate-500 dark:text-slate-400">{{ section.description }}</p><NuxtLink to="/ledger/shared-config/currencies" class="mt-4 inline-block text-xs font-semibold text-brand-700 underline dark:text-brand-300">Open Currencies</NuxtLink></section></div>
</template>
