<script setup lang="ts">
import { moduleLabel } from '../features/shared/modules'
import type { TenantAccount } from '../features/tenant-account'
const search = ref(''), tenantIds = ref<string[]>([]), mode = ref('override'), confirmation = ref('')
const busy = ref(false), message = ref(''), failure = ref('')
const { data, error, pending, refresh } = await useAsyncData('system-number-sync-tenants', () => useRequestFetch()<{ items: TenantAccount[] }>('/api/host/tenants', { query: { search: search.value } }), { watch: [search] })
const selected = computed(() => tenantIds.value.map(id => data.value?.items.find(tenant => tenant.id === id)).filter((tenant): tenant is TenantAccount => !!tenant))
const scope = ref('all'), templateIds = ref<string[]>([]), templates = ref<{id:string;moduleId:number;itemName:string;key:string}[]>([]), templateError = ref(''), templatesLoading = ref(false)
async function loadTemplates() {
 templatesLoading.value = true; templateError.value = ''; const loaded: typeof templates.value = []
 try {
  let page = 1, pages = 1
  do {
   const result = await $fetch<{data: typeof templates.value; totalPages:number}>('/api/host/system-numbers', {query:{pageNo:page,pageSize:200}})
   loaded.push(...result.data); pages = result.totalPages; page++
  } while(page <= pages)
  templates.value = loaded; templateIds.value = templateIds.value.filter(id => loaded.some(template => template.id === id))
 } catch { templateError.value = 'Could not load system numbers. Retry before syncing.' }
 finally { templatesLoading.value = false }
}
onMounted(loadTemplates)
watch(scope, () => { confirmation.value = ''; if(scope.value === 'specific') mode.value = 'override' })
watch([tenantIds, mode, templateIds], () => { confirmation.value = ''; message.value = ''; failure.value = '' })
watch(search, () => { tenantIds.value = [] })
async function sync() {
  if (!selected.value.length || confirmation.value !== 'SYNC' || busy.value || (scope.value === 'specific' && (!templateIds.value.length || templatesLoading.value || templateError.value))) return
  busy.value = true; message.value = ''; failure.value = ''
  try {
    const results: string[] = []
    for (const tenant of selected.value) {
      try {
        const result = await $fetch<{ deleted: number; updated: number; copied: number }>('/api/host/system-numbers/sync', { method: 'POST', body: { tenantId: tenant.id, mode: mode.value, confirmation: confirmation.value, ...(scope.value === 'specific' ? {templateIds: templateIds.value} : {}) } })
        results.push(`${tenant.name}: ${result.updated} updated, ${result.copied} copied/restored, ${result.deleted} hard-deleted.`)
      } catch (e: any) { results.push(`${tenant.name}: FAILED — ${e?.data?.statusMessage || 'Sync could not be confirmed; refresh before retrying.'}`) }
    }
    message.value = results.join(' ')
    confirmation.value = ''
  } catch (e: any) { failure.value = e?.data?.statusMessage || 'Sync failed. No partial changes were saved. Refresh before retrying.' }
  finally { busy.value = false }
}
</script>
<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15201e]">
    <h2 class="text-lg font-semibold">Sync system numbers to a tenant</h2>
    <p class="mt-2 text-sm text-slate-500">Copy the current host templates to the selected tenants. Each tenant is synced in its own transaction. This includes Last No: resetting counters can reuse previously issued numbers. Existing documents are not changed.</p>
    <form class="mt-4 space-y-4" @submit.prevent="sync">
      <fieldset :disabled="busy" class="space-y-4">
        <label class="block text-sm">Find tenant by organization or account ID<input v-model="search" maxlength="200" class="mt-1 block w-full rounded border bg-transparent p-2" /></label>
        <p v-if="pending" role="status">Loading tenants…</p>
        <p v-if="error" role="alert">Could not load tenants. <button type="button" class="underline" @click="refresh()">Retry</button></p>
        <label class="block text-sm">Tenants (select one or more)<select v-model="tenantIds" multiple :disabled="pending || !!error" required class="mt-1 block w-full rounded border bg-transparent p-2"><option v-for="tenant in data?.items" :key="tenant.id" :value="tenant.id">{{ tenant.name }} · {{ tenant.accountId }}</option></select></label>
        <p v-if="!pending && !error && !data?.items.length" class="text-sm">No matching tenants.</p>
        <label class="block text-sm">System numbers to sync<select v-model="scope" class="mt-1 block w-full rounded border bg-transparent p-2"><option value="all">All host templates</option><option value="specific">Specific system numbers</option></select></label>
        <div v-if="scope === 'specific'" class="space-y-2">
          <p v-if="templatesLoading" role="status">Loading system numbers…</p>
          <p v-if="templateError" role="alert">{{ templateError }} <button type="button" class="underline" @click="loadTemplates">Retry</button></p>
          <fieldset :disabled="templatesLoading || !!templateError" class="max-h-64 space-y-2 overflow-auto rounded border p-3"><legend>Select templates ({{ templateIds.length }} selected)</legend><label v-for="template in templates" :key="template.id" class="flex gap-2 text-sm"><input v-model="templateIds" type="checkbox" :value="template.id" />{{ moduleLabel(template.moduleId) }} · {{ template.itemName }} ({{ template.key }})</label><p v-if="!templatesLoading && !templates.length">No active host templates.</p></fieldset>
          <p class="text-sm text-slate-500">Only the selected templates will be synced. Other system numbers remain unchanged.</p>
        </div>
        <label class="block text-sm">Sync mode<select v-model="mode" class="mt-1 block w-full rounded border bg-transparent p-2"><option value="override">Override by module and key</option><option v-if="scope === 'all'" value="replace">Hard-delete all and recreate</option></select></label>
        <p v-if="mode === 'override'" class="text-sm text-slate-500">Overwrite matching keys within each module, add missing host templates, and retain tenant-only entries. Matching entries keep their IDs.</p>
        <p v-else role="alert" class="text-sm text-rose-600">Permanently deletes ALL system numbers for the selected tenant, including archived entries, then creates new IDs from host templates. This cannot be undone.</p>
        <label class="block text-sm">Type SYNC to confirm<span v-if="selected.length" class="font-semibold"> for {{ selected.map(tenant => `${tenant.name} (${tenant.accountId})`).join(", ") }}</span><input v-model="confirmation" autocomplete="off" class="mt-1 block w-full rounded border bg-transparent p-2" /></label>
      </fieldset>
      <button :disabled="busy || pending || !!error || !selected.length || (scope === 'specific' && (!templateIds.length || templatesLoading || !!templateError)) || confirmation !== 'SYNC'" class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ busy ? 'Syncing…' : 'Sync selected tenants' }}</button>
      <p v-if="message" role="status" class="text-sm text-emerald-700">{{ message }}</p>
      <p v-if="failure" role="alert" class="text-sm text-rose-600">{{ failure }}</p>
    </form>
  </section>
</template>
