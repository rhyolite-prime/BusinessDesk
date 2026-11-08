<script setup lang="ts">
useHead({ title: 'My Profile' })
const toast = useToast()
const { date, relative } = useFormat()
const { data: profile, refresh } = await useAsyncData('my-profile', () => $fetch<any>('/api/auth/profile'))
const form = reactive({ firstname: '', lastname: '', email: '', mobile: '' })
const busy = ref(false)

watch(profile, (p: any) => {
  if (p) Object.assign(form, { firstname: p.firstname, lastname: p.lastname, email: p.email, mobile: p.mobile ?? '' })
}, { immediate: true })

async function save() {
  busy.value = true
  try {
    await $fetch('/api/auth/profile', { method: 'PUT', body: { ...form } })
    toast.success('Profile updated')
    await refresh()
  } catch (e: any) { toast.error('Update failed', e?.data?.statusMessage ?? e.message) } finally { busy.value = false }
}
</script>

<template>
  <div v-if="profile" class="max-w-3xl mx-auto">
    <PageHeader title="My Profile" icon="user" subtitle="Your operator account and contact details." />

    <div class="grid md:grid-cols-3 gap-4">
      <BaseCard class="text-center">
        <span class="w-20 h-20 rounded-2xl bg-primary text-on-primary flex items-center justify-center text-2xl font-bold mx-auto">
          {{ profile.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}
        </span>
        <h3 class="font-semibold mt-3">{{ profile.name }}</h3>
        <p class="text-xs text-ink-faint">{{ profile.username }}</p>
        <div class="mt-3 flex justify-center gap-1.5 flex-wrap">
          <Badge v-for="r in profile.roleNames" :key="r" tone="blue">{{ r }}</Badge>
        </div>
        <p class="text-[11px] text-ink-faint mt-3">{{ profile.officeName }}</p>
      </BaseCard>

      <BaseCard class="md:col-span-2" title="Account details" icon="identification">
        <div class="grid sm:grid-cols-2 gap-4">
          <FormField label="First name"><TextInput v-model="form.firstname" /></FormField>
          <FormField label="Last name"><TextInput v-model="form.lastname" /></FormField>
          <FormField label="Email"><TextInput v-model="form.email" type="email" /></FormField>
          <FormField label="Mobile"><TextInput v-model="form.mobile" /></FormField>
        </div>
        <div class="flex justify-end mt-5">
          <BaseButton icon="check" :disabled="busy" @click="save">{{ busy ? 'Saving…' : 'Save changes' }}</BaseButton>
        </div>
      </BaseCard>
    </div>

    <BaseCard class="mt-4" title="Security summary" icon="shield-check">
      <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm max-w-xl">
        <div class="flex justify-between"><dt class="text-ink-faint">Two-factor auth</dt>
          <dd><Badge :tone="profile.hasTotp ? 'green' : 'amber'" dot>{{ profile.hasTotp ? 'Enrolled (Google Authenticator)' : 'Not enrolled' }}</Badge></dd></div>
        <div class="flex justify-between"><dt class="text-ink-faint">Password</dt><dd><NuxtLink to="/settings?tab=security" class="text-primary font-medium">Reset</NuxtLink></dd></div>
        <div class="flex justify-between"><dt class="text-ink-faint">2FA devices</dt><dd><NuxtLink to="/settings?tab=security" class="text-primary font-medium">Manage</NuxtLink></dd></div>
      </dl>
    </BaseCard>
  </div>
</template>
