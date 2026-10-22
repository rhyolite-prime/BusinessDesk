<script setup lang="ts">
import type { TenantAccount } from '../../../features/tenant-account'
definePageMeta({ layout: 'host-admin' })
useHead({ title: 'Tenant management' })
const search = ref('')
const { data, error, pending, refresh } = await useAsyncData(
  'host-tenant-accounts',
  () =>
    useRequestFetch()<{ items: TenantAccount[] }>('/api/host/tenants', {
      query: { search: search.value },
    }),
  { watch: [search] },
)
</script>
<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Tenants</h1>
      <p class="mt-2 text-sm text-slate-500">
        Manage tenant subscriptions, billing records, security requirements and
        account change requests.
      </p>
    </div>
    <label class="block text-xs font-medium"
      >Search tenants<input
        v-model="search"
        maxlength="200"
        class="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-transparent px-3 dark:border-slate-700"
        placeholder="Organization name or account ID"
    /></label>
    <p v-if="error" role="alert" class="text-sm text-rose-600">
      {{
        error.statusMessage ||
        error.message ||
        'Tenant accounts could not be loaded.'
      }}
      <button class="underline" @click="refresh()">Retry</button>
    </p>
    <p v-if="pending" class="text-sm text-slate-500">Loading tenants…</p>
    <div
      class="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#15201e]"
    >
      <table class="w-full text-left text-sm">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="p-4">Organization</th>
            <th class="p-4">Account ID</th>
            <th class="p-4">Status</th>
            <th class="p-4">Current modules</th>
            <th class="p-4">Manage</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tenant in data?.items"
            :key="tenant.id"
            class="border-t border-slate-100 dark:border-slate-700"
          >
            <td class="p-4 font-medium">{{ tenant.name }}</td>
            <td class="p-4">{{ tenant.accountId }}</td>
            <td class="p-4">{{ tenant.isActive ? 'Active' : 'Suspended' }}</td>
            <td class="p-4">
              {{
                Object.values(tenant.modules).filter((m) => m.effective).length
              }}
            </td>
            <td class="p-4">
              <NuxtLink
                :to="`/host/tenants/${tenant.id}`"
                class="font-semibold text-brand-700"
                >Manage account</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="!pending && !error && !data?.items.length"
        class="p-6 text-sm text-slate-500"
      >
        No matching tenants.
      </p>
    </div>
    <p class="text-xs text-slate-500">
      Tenant provisioning remains available through the existing host tenant
      API. This screen does not expose infrastructure credentials.
    </p>
  </div>
</template>
