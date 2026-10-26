<script setup lang="ts">
import type { TenantAccount } from '../features/tenant-account'
const search = ref(''), tenantId = ref(''), mode = ref('override'), confirmation = ref('')
const busy = ref(false), message = ref(''), failure = ref('')
const { data, error, pending, refresh } = await useAsyncData('system-number-sync-tenants', () => useRequestFetch()<{ items: TenantAccount[] }>('/api/host/tenants', { query: { search: search.value } }), { watch: [search] })
const selected = computed(() => data.value?.items.find(tenant => tenant.id === tenantId.value))
watch([tenantId, mode], () => { confirmation.value = ''; message.value = ''; failure.value = '' })
watch(search, () => { tenantId.value = '' })
async function sync() {
  if (!selected.value || confirmation.value !== 'SYNC' || busy.value) return
  busy.value = true; message.value = ''; failure.value = ''
  try {
    const result = await $fetch<{ deleted: number; updated: number; copied: number }>('/api/host/system-numbers/sync', { method: 'POST', body: { tenantId: tenantId.value, mode: mode.value, confirmation: confirmation.value } })
    message.value = `Sync complete for ${selected.value.name}: ${result.updated} updated, ${result.copied} copied/restored, ${result.deleted} hard-deleted.`
    confirmation.value = ''
  } catch (e: any) { failure.value = e?.data?.statusMessage || 'Sync failed. No partial changes were saved. Refresh before retrying.' }
  finally { busy.value = false }
}
</script>
<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e]">
    <h2 class="text-lg font-semibold">Sync system numbers to a tenant</h2>
    <p class="mt-2 text-sm text-slate-500">Copy the current host templates to one tenant. This includes Last No: resetting counters can reuse previously issued numbers. Existing documents are not changed.</p>
    <form class="mt-4 space-y-4" @submit.prevent="sync">
      <fieldset :disabled="busy" class="space-y-4">
        <label class="block text-sm">Find tenant by organization or account ID<input v-model="search" maxlength="200" class="mt-1 block w-full rounded border bg-transparent p-2" /></label>
        <p v-if="pending" role="status">Loading tenants…</p>
        <p v-if="error" role="alert">Could not load tenants. <button type="button" class="underline" @click="refresh()">Retry</button></p>
        <label class="block text-sm">Tenant<select v-model="tenantId" :disabled="pending || !!error" required class="mt-1 block w-full rounded border bg-transparent p-2"><option value="">Select a tenant</option><option v-for="tenant in data?.items" :key="tenant.id" :value="tenant.id">{{ tenant.name }} · {{ tenant.accountId }}</option></select></label>
        <p v-if="!pending && !error && !data?.items.length" class="text-sm">No matching tenants.</p>
        <label class="block text-sm">Sync mode<select v-model="mode" class="mt-1 block w-full rounded border bg-transparent p-2"><option value="override">Override by module and key</option><option value="replace">Hard-delete all and recreate</option></select></label>
        <p v-if="mode === 'override'" class="text-sm text-slate-500">Overwrite matching keys within each module, add missing host templates, and retain tenant-only entries. Matching entries keep their IDs.</p>
        <p v-else role="alert" class="text-sm text-rose-600">Permanently deletes ALL system numbers for the selected tenant, including archived entries, then creates new IDs from host templates. This cannot be undone.</p>
        <label class="block text-sm">Type SYNC to confirm<span v-if="selected" class="font-semibold"> for {{ selected.name }} ({{ selected.accountId }})</span><input v-model="confirmation" autocomplete="off" class="mt-1 block w-full rounded border bg-transparent p-2" /></label>
      </fieldset>
      <button :disabled="busy || pending || !!error || !selected || confirmation !== 'SYNC'" class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ busy ? 'Syncing…' : 'Sync selected tenant' }}</button>
      <p v-if="message" role="status" class="text-sm text-emerald-700">{{ message }}</p>
      <p v-if="failure" role="alert" class="text-sm text-rose-600">{{ failure }}</p>
    </form>
  </section>
</template>
