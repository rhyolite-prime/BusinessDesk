<script setup lang="ts">
import { UserRound, Send } from '@lucide/vue'
definePageMeta({ layout: 'admin-hr' })
useHead({ title: 'Employee contact changes · Human Resources' })
type ContactKey = 'personalEmail' | 'primaryPhoneNumber' | 'secondaryPhoneNumber' | 'residenceAddress' | 'cityOrLocation'
type Profile = Record<ContactKey, string> & { id: string; version: number; employeeIdentifier: string; firstName: string; otherName: string; lastName: string; departmentName: string; companyEmail: string; canSubmit: boolean }
const fields: { key: ContactKey; label: string; type: string; max: number }[] = [
  { key: 'personalEmail', label: 'Personal email', type: 'email', max: 100 },
  { key: 'primaryPhoneNumber', label: 'Primary phone', type: 'tel', max: 20 },
  { key: 'secondaryPhoneNumber', label: 'Secondary phone', type: 'tel', max: 20 },
  { key: 'residenceAddress', label: 'Residential address', type: 'text', max: 150 },
  { key: 'cityOrLocation', label: 'City or location', type: 'text', max: 100 },
]
const request = useRequestFetch(), { user } = useBusinessDeskAuth()
const employeeId = ref(''), profile = ref<Profile | null>(null), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const form = reactive<Record<ContactKey, string>>({ personalEmail: '', primaryPhoneNumber: '', secondaryPhoneNumber: '', residenceAddress: '', cityOrLocation: '' })
let generation = 0, lifecycle = 0
const changes = computed(() => {
  const result: Partial<Record<ContactKey, string>> = {}
  if (profile.value) for (const f of fields) if (form[f.key].trim() !== profile.value[f.key]) result[f.key] = form[f.key].trim()
  return result
})
async function load() {
  const current = ++generation, id = employeeId.value
  profile.value = null; error.value = ''; notice.value = ''
  for (const f of fields) form[f.key] = ''
  if (!id) { loading.value = false; return }
  loading.value = true
  try {
    const data = await request<Profile>(`/api/hr/profile/employees/${id}` as string)
    if (current !== generation) return
    profile.value = data
    for (const f of fields) form[f.key] = data[f.key]
  } catch (e: any) { if (current === generation) error.value = e?.data?.statusMessage || 'Unable to load the employee profile.' }
  finally { if (current === generation) loading.value = false }
}
async function submit() {
  if (!profile.value || !profile.value.canSubmit || busy.value || !Object.keys(changes.value).length) return
  const current = lifecycle, selected = employeeId.value, version = profile.value.version
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request('/api/hr/profile/requests', { method: 'POST', body: { employeeId: selected, employeeVersion: version, changes: changes.value } })
    if (current !== lifecycle || selected !== employeeId.value || !profile.value) return
    notice.value = 'Contact changes were submitted for review. A different authorized reviewer must approve them before they are applied.'
    for (const f of fields) form[f.key] = profile.value[f.key]
  } catch (e: any) { if (current === lifecycle) error.value = e?.data?.statusMessage || 'Unable to submit the request.' }
  finally { if (current === lifecycle) busy.value = false }
}
watch(employeeId, load)
watch(() => `${user.value?.accountId}:${user.value?.username}`, () => { ++lifecycle; ++generation; employeeId.value = ''; profile.value = null; busy.value = false; loading.value = false; notice.value = ''; error.value = ''; for (const f of fields) form[f.key] = '' })
onBeforeUnmount(() => { ++lifecycle; ++generation })
</script>
<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-[.16em] text-primary">People / Administration</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Employee contact changes</h1><p class="mt-2 text-sm text-ink-soft">Select an employee and submit contact changes for review.</p></div><NuxtLink to="/hr/profile-requests" class="text-sm font-semibold text-primary">Review requests →</NuxtLink></header>
    <p v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{{ error }}</p><p v-if="notice" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{{ notice }}</p>
    <fieldset :disabled="busy" class="rounded-2xl border border-line bg-surface p-6 shadow-sm"><legend class="sr-only">Choose an employee</legend><HrEmployeePicker v-model="employeeId" /></fieldset>
    <div v-if="loading" class="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-faint">Loading employee contact details…</div>
    <template v-else-if="profile">
      <section class="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm"><span class="rounded-2xl bg-primary-soft p-4 text-primary"><UserRound :size="24" /></span><div><h2 class="text-xl font-semibold">{{ [profile.firstName, profile.otherName, profile.lastName].filter(Boolean).join(' ') }}</h2><p class="mt-1 text-sm text-ink-soft">{{ profile.employeeIdentifier }}<span v-if="profile.departmentName"> · {{ profile.departmentName }}</span></p><p v-if="profile.companyEmail" class="mt-1 text-xs text-ink-faint">{{ profile.companyEmail }}</p></div></section>
      <form class="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm" @submit.prevent="submit"><div><h2 class="font-semibold">Contact details</h2><p class="mt-1 text-sm text-ink-soft">Only changed fields are submitted. Another authorized administrator must review the request.</p></div><div class="grid gap-4 md:grid-cols-2"><div v-for="field in fields" :key="field.key"><label :for="field.key" class="mb-1 block text-xs font-semibold">{{ field.label }}</label><input :id="field.key" v-model="form[field.key]" :type="field.type" :maxlength="field.max" :disabled="!profile.canSubmit || busy" class="field"></div></div><div v-if="profile.canSubmit" class="flex flex-wrap items-center gap-3"><button :disabled="busy || !Object.keys(changes).length" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send :size="15" class="mr-1 inline" /> {{ busy ? 'Sending…' : 'Submit for review' }}</button><button type="button" class="text-sm text-ink-soft" :disabled="busy" @click="load">Reload employee</button></div><p v-else class="text-sm text-ink-faint">Read-only access. Contact a profile administrator to submit changes.</p></form>
    </template>
  </div>
</template>
<style scoped>.field { width:100%; border:1px solid #cbd5e1; border-radius:.6rem; background:transparent; padding:.65rem .75rem; font-size:.875rem; }</style>
