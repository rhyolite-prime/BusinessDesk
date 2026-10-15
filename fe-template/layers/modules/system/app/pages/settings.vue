<script setup lang="ts">
useHead({ title: 'Settings' })
const route = useRoute()
const toast = useToast()
const api = useApi()
const { brand, presets, applyPreset, activePreset } = useBrand()

const tab = ref(String(route.query.tab ?? 'general'))
watch(() => route.query.tab, (v) => { if (v) tab.value = String(v) })

// ── password reset ──
const pw = reactive({ current: '', next: '', confirm: '' })
const pwBusy = ref(false)
async function resetPassword() {
  if (pw.next !== pw.confirm) return toast.error('New passwords do not match')
  pwBusy.value = true
  try {
    const res: any = await api.post('/auth/reset-password', { current: pw.current, next: pw.next })
    toast.success('Password updated', res.message)
    pw.current = ''; pw.next = ''; pw.confirm = ''
  } catch (e: any) { toast.error('Reset failed', e.message) } finally { pwBusy.value = false }
}

// ── 2FA management ──
const { data: profile } = await useAsyncData('profile-2fa', () => $fetch<any>('/api/auth/profile'))
const setup = ref<any>(null)
async function showEnrol() {
  try { setup.value = await api.get('/auth/setup-2fa', { username: profile.value?.username }) }
  catch (e: any) { toast.error('Could not load enrolment', e.message) }
}
let t2: any
onMounted(() => {
  t2 = setInterval(async () => { if (setup.value && profile.value?.username) setup.value = await api.get('/auth/setup-2fa', { username: profile.value.username }) }, 5000)
})
onUnmounted(() => clearInterval(t2))
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <PageHeader title="Settings" icon="cog-6-tooth" subtitle="Account security and white-label preferences." />

    <Tabs v-model="tab" :tabs="[
      { key: 'general', label: 'General', icon: 'sparkles' },
      { key: 'security', label: 'Security & 2FA', icon: 'shield-check' },
    ]" />

    <div class="mt-5">
      <!-- General / white-label -->
      <BaseCard v-if="tab === 'general'" title="White-label theme" subtitle="Preview and switch your institution's branding. Tenants set defaults in app.config.ts." icon="sparkles">
        <div class="grid sm:grid-cols-2 gap-3">
          <button v-for="p in presets" :key="p.key" type="button"
            class="flex items-center gap-3 p-4 rounded-xl border-2 text-left transition"
            :class="activePreset === p.key ? 'border-primary bg-primary-soft/50' : 'border-line hover:border-ink-faint'"
            @click="applyPreset(p); toast.success('Theme applied', p.label)">
            <span class="flex -space-x-1.5">
              <span class="w-7 h-7 rounded-full ring-2 ring-white" :style="{ background: p.theme.primary }" />
              <span class="w-7 h-7 rounded-full ring-2 ring-white" :style="{ background: p.theme.accent }" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-ink truncate">{{ p.label }}</span>
              <span class="block text-[11px] text-ink-faint truncate">{{ p.tagline }}</span>
            </span>
            <AppIcon v-if="activePreset === p.key" name="check" :size="16" class="text-primary ml-auto" />
          </button>
        </div>
        <div class="mt-4 rounded-lg bg-canvas p-4 text-xs text-ink-faint leading-relaxed">
          Active: <strong class="text-ink">{{ brand.institutionName }}</strong> ·
          currency <strong class="text-ink">{{ brand.currency.code }}</strong> ·
          product <strong class="text-ink">{{ brand.productName }}</strong>
        </div>
      </BaseCard>

      <!-- Security -->
      <div v-else class="space-y-4">
        <BaseCard title="Reset password" subtitle="Change the password for your operator account." icon="shield-check">
          <div class="grid sm:grid-cols-2 gap-4 max-w-lg">
            <FormField label="Current password"><TextInput v-model="pw.current" type="password" placeholder="demo1234" /></FormField>
            <div class="hidden sm:block" />
            <FormField label="New password"><TextInput v-model="pw.next" type="password" /></FormField>
            <FormField label="Confirm new password"><TextInput v-model="pw.confirm" type="password" /></FormField>
          </div>
          <div class="flex justify-end mt-5">
            <BaseButton variant="secondary" icon="check" :disabled="pwBusy || !pw.next" @click="resetPassword">
              {{ pwBusy ? 'Updating…' : 'Update password' }}
            </BaseButton>
          </div>
        </BaseCard>

        <BaseCard title="Two-factor authentication" subtitle="Google Authenticator (TOTP)." icon="cog-6-tooth">
          <div class="flex items-start gap-4">
            <span class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              :class="profile?.hasTotp ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
              <AppIcon :name="profile?.hasTotp ? 'check-circle' : 'exclamation-triangle'" :size="22" />
            </span>
            <div class="flex-1">
              <p class="text-sm font-semibold text-ink">{{ profile?.hasTotp ? 'Authenticator enrolled' : 'Authenticator not confirmed' }}</p>
              <p class="text-xs text-ink-faint mt-0.5">
                {{ profile?.hasTotp ? 'Your account is protected with TOTP. Re-scan the QR to move devices.' : 'Complete enrolment by scanning the QR with Google Authenticator.' }}
              </p>
              <BaseButton size="sm" variant="secondary" icon="identification" class="mt-3" @click="showEnrol">
                {{ setup ? 'Refresh QR' : 'View / re-scan QR' }}
              </BaseButton>
            </div>
          </div>

          <div v-if="setup" class="mt-5 flex flex-col sm:flex-row gap-5 items-center rounded-xl bg-canvas/70 p-5">
            <img :src="setup.qr" alt="2FA QR" class="rounded-lg bg-white border border-line p-2 w-40 h-40" />
            <div class="text-sm">
              <p class="font-semibold text-ink">Scan with Google Authenticator</p>
              <p class="text-xs text-ink-faint mt-1">Or enter this key manually:</p>
              <code class="block mt-2 text-xs bg-white border border-line rounded px-2 py-1 select-all tracking-wider break-all">{{ setup.secret }}</code>
              <div class="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Demo current code: <strong class="tnum text-base">{{ setup.demoCode }}</strong>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
