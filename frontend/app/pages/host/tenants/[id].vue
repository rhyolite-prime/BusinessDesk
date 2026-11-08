<script setup lang="ts">
import type { TenantAccount } from '../../../features/tenant-account'
definePageMeta({ layout: 'host-admin' })
const route = useRoute(),
  id = String(route.params.id)
const { data, error, pending, refresh } = await useAsyncData(
  `host-tenant-${id}`,
  () =>
    useRequestFetch()<TenantAccount>(
      `/api/host/tenants/${encodeURIComponent(id)}`,
    ),
)
</script>
<template>
  <div class="space-y-5">
    <NuxtLink to="/host/tenants" class="text-xs text-brand-700"
      >← Tenant accounts</NuxtLink
    >
    <p v-if="pending">Loading account…</p>
    <p v-if="error" role="alert" class="text-sm text-rose-600">
      {{ error.statusMessage || error.message || 'Account unavailable.' }}
      <button class="underline" @click="refresh()">Retry</button>
    </p>
    <div
      v-if="data && !error"
      class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e]"
    >
      <TenantAccountPanel
        :key="data.id"
        :account="data"
        host
        @refresh="refresh()"
      />
    </div>
  </div>
</template>
