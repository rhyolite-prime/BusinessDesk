<script setup lang="ts">
import PayrollWorkspacePage from '../../components/payroll/PayrollWorkspacePage.vue'
import { getPayrollPageByPath } from '../../features/payroll/catalog'

definePageMeta({ layout: 'admin-payroll' })

const route = useRoute()
const page = computed(() => getPayrollPageByPath(route.path))

if (!getPayrollPageByPath(route.path)) {
  throw createError({ statusCode: 404, statusMessage: 'Payroll workspace page not found' })
}

useHead(() => ({ title: `${page.value?.title ?? 'Payroll'} · Payroll` }))
</script>

<template>
  <PayrollWorkspacePage v-if="page" :key="page.id" :page="page" />
</template>
