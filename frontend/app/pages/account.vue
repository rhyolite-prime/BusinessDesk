<script setup lang="ts">
import type { TenantAccount } from '../features/tenant-account'
definePageMeta({ layout: false })
useHead({ title: 'Account & subscription' })
const { data, error, pending, refresh } = await useAsyncData(
  'tenant-account',
  () => useRequestFetch()<TenantAccount>('/api/account'),
)
</script>
<template>
  <main class="min-h-screen bg-canvas px-4 py-8 text-ink">
    <div class="mx-auto max-w-6xl space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold">Account &amp; Subscription</h1>
          <p class="mt-2 text-sm text-slate-500">
            Review account terms and billing records. Host-controlled settings
            are read-only.
          </p>
        </div>
        <NuxtLink to="/modules" class="text-sm text-brand-700"
          >← Module manager</NuxtLink
        >
      </div>
      <p v-if="pending">Loading account…</p>
      <p
        v-if="error"
        role="alert"
        class="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
      >
        {{
          error.statusMessage ||
          error.message ||
          'Tenant administrator access is required, or the account service is unavailable.'
        }}
        <button class="underline" @click="refresh()">Retry</button>
      </p>
      <div
        v-if="data && !error"
        class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e]"
      >
        <TenantAccountPanel :account="data" @refresh="refresh()" />
      </div>
    </div>
  </main>
</template>
