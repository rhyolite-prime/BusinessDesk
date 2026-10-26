<script setup lang="ts">
import { loadRememberedAccountId, saveRememberedAccountId } from '../utils/rememberedAccount'
useHead({ title: 'Account sign in' })
definePageMeta({ layout: 'auth' })
const toast = useToast()
const api = useApi()
const step = ref<'credentials' | '2fa'>('credentials')
const form = reactive({ accountId: '', usernameOrEmail: '', password: '' })
const code = ref('')
const enrol = ref<{ qr: string; secret: string; issuer: string; account: string } | null>(null)
const busy = ref(false)
const expiresAt = ref(0)
const now = ref(Date.now())
const remaining = computed(() => Math.max(0, Math.ceil((expiresAt.value - now.value) / 1000)))
const expired = computed(() => step.value === '2fa' && remaining.value === 0)
watch(expired, value => { if (value) { enrol.value = null; code.value = '' } })
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  // Read only after mount so SSR and the initial client render remain identical.
  if (!form.accountId) form.accountId = loadRememberedAccountId()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
watch(() => form.accountId, accountId => saveRememberedAccountId(accountId))
onUnmounted(() => { clearInterval(timer); form.password = ''; enrol.value = null })

function complete() {
  form.password = ''; enrol.value = null; code.value = ''
  // Do not follow an untrusted redirect query. Both paths land in module manager.
  window.location.assign('/modules')
}
function back() {
  if (busy.value) return
  step.value = 'credentials'; enrol.value = null; code.value = ''; form.password = ''
}
async function signIn() {
  if (busy.value) return
  busy.value = true
  enrol.value = null; code.value = ''
  try {
    const result = await api.post('/auth/login', { ...form })
    form.password = ''
    if (result.authenticated === true) return complete()
    if (result.requiresTwoFactorAuth !== true || !result.expiresIn) throw new Error('Invalid login challenge.')
    enrol.value = result.enrollment
    now.value = Date.now(); expiresAt.value = now.value + result.expiresIn * 1000
    step.value = '2fa'
  } catch (error: any) {
    form.password = ''
    toast.error('Sign-in failed', error.message)
  } finally { busy.value = false }
}
async function verify() {
  if (busy.value || expired.value || !/^\d{6}$/.test(code.value)) return
  busy.value = true
  try {
    const result = await api.post('/auth/verify-2fa', { code: code.value })
    if (result.authenticated !== true) throw new Error('Authentication did not complete.')
    complete()
  } catch (error: any) {
    code.value = ''
    toast.error('Verification failed', error.message)
  } finally { busy.value = false }
}
</script>

<template>
  <div>
    <div v-if="step === 'credentials'">
      <h1 class="text-2xl font-bold text-ink">Sign in</h1>
      <p class="text-sm text-ink-faint mt-1">Enter your account and user credentials.</p>

      <form class="space-y-4 mt-7" @submit.prevent="signIn">
        <FormField label="Account ID" required>
          <TextInput v-model="form.accountId" placeholder="Account ID" autocomplete="organization" required :disabled="busy" />
        </FormField>
        <FormField label="Username or email" required>
          <TextInput v-model="form.usernameOrEmail" placeholder="Username or email address" autocomplete="username" required :disabled="busy" />
        </FormField>
        <FormField label="Password" required>
          <TextInput v-model="form.password" type="password" placeholder="••••••••" autocomplete="current-password" required :disabled="busy" />
        </FormField>
        <BaseButton type="submit" block :disabled="busy" icon="arrow-right">
          {{ busy ? 'Signing in…' : 'Continue' }}
        </BaseButton>
      </form>
    </div>

    <!-- 2FA -->
    <div v-else>
      <div class="flex items-center gap-3 mb-6">
        <span class="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
          <AppIcon name="shield-check" :size="24" />
        </span>
        <div>
          <h1 class="text-2xl font-bold text-ink">Two-factor authentication</h1>
          <p class="text-sm text-ink-faint">Verifying <strong class="text-ink">{{ form.usernameOrEmail }}</strong> for {{ form.accountId }}</p>
        </div>
      </div>

      <p class="text-sm text-ink-soft leading-relaxed">
        Open <strong>Google Authenticator</strong> (or Authy / Microsoft Authenticator) and enter the
        6-digit code for your <strong>BusinessDesk</strong> account.
      </p>

      <!-- Enrolment QR (shown for first-time users) -->
      <details v-if="enrol" open class="mt-4 rounded-xl border border-line bg-canvas/60 p-4">
        <summary class="text-xs font-semibold text-ink-soft cursor-pointer select-none">
          Set up your authenticator — scan this QR code
        </summary>
        <div class="mt-4 flex flex-col items-center text-center">
          <img :src="enrol.qr" alt="2FA QR code" width="320" height="320" class="rounded-lg border border-line bg-white w-80 max-w-full h-auto" />
          <p class="text-[11px] text-ink-faint mt-3">Scan with Google Authenticator, or enter this key manually:</p>
          <code class="mt-1 text-xs bg-white border border-line rounded px-2 py-1 select-all tracking-wider">{{ enrol.secret }}</code>
        </div>
      </details>

      <form class="space-y-4 mt-5" @submit.prevent="verify">
        <FormField label="Authenticator code" required>
          <TextInput v-model="code" placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" :disabled="busy || expired"
            class="!text-center !text-2xl !tracking-[0.5em] !font-bold !py-3" />
        </FormField>
        <p class="text-xs" :class="expired ? 'text-red-600' : 'text-ink-faint'" role="status" aria-live="polite">
          {{ expired ? 'This challenge expired. Go back and sign in again.' : `Challenge expires in ${remaining} seconds.` }}
        </p>
        <BaseButton type="submit" block variant="success" icon="check" :disabled="busy || expired || !/^\d{6}$/.test(code)">
          {{ busy ? 'Verifying…' : 'Verify & sign in' }}
        </BaseButton>
      </form>

      <p v-if="!enrol" class="mt-4 text-xs text-ink-faint">Lost access to your authenticator? Contact your tenant administrator.</p>
      <button class="mt-5 text-sm text-ink-faint hover:text-ink w-full text-center"
        :disabled="busy" @click="back">← Back to sign in</button>
    </div>
  </div>
</template>
