<script setup lang="ts">
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Performance · Human Resources' })
</script>
<template><div class="space-y-6"><header><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People / Development</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Performance</h1><p class="mt-2 text-sm text-ink-soft">Keep a record of employee reviews and conversations.</p></header><HrWorkflow kind="review" /></div></template>
