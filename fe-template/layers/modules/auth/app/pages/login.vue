<script setup lang="ts">
useHead({ title: 'Sign in' })
definePageMeta({ layout: 'auth' })
const route = useRoute()
const router = useRouter()
const toast = useToast()
const api = useApi()

const step = ref<'credentials' | '2fa' | 'enrol'>('credentials')
const form = reactive({ username: 'a.mensah', password: 'demo1234' })
const code = ref('')
const challengeId = ref('')
const pendingName = ref('')
const enrol = ref<any>(null)
const busy = ref(false)
const redirect = computed(() => String(route.query.redirect ?? '/'))

async function signIn() {
  busy.value = true
  try {
    const res: any = await api.post('/auth/login', form)
    challengeId.value = res.challengeId
    pendingName.value = res.displayName
    // try verifying with no code? No — check whether the user already enrolled.
    // We attempt enrol setup; if a secret already exists it returns the same one.
    const setup: any = await api.get('/auth/setup-2fa', { username: res.username })
    enrol.value = setup
    // Distinguish: if this secret was auto-created we can't know, so always allow
    // verifying; show enrol QR as a fallback when verification fails.
    step.value = '2fa'
  } catch (e: any) {
    toast.error('Sign-in failed', e.message)
  } finally { busy.value = false }
}

async function verify() {
  busy.value = true
  try {
    await api.post('/auth/verify-2fa', { challengeId: challengeId.value, code: code.value })
    toast.success('Welcome back', 'You are signed in.')
    // full navigation so the SSR guard re-evaluates with the new session
    await nextTick()
    window.location.assign(redirect.value && redirect.value !== '/login' ? redirect.value : '/')
  } catch (e: any) {
    toast.error('Verification failed', e.message)
  } finally { busy.value = false }
}

// keep the demo code hint live
let timer: any
onMounted(() => {
  timer = setInterval(async () => {
    if (step.value === '2fa' && enrol.value?.secret) {
      try { enrol.value = await $fetch('/api/auth/setup-2fa', { query: { username: form.username } }) } catch (e) { /* ignore */ }
    }
  }, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div>
    <div v-if="step === 'credentials'">
      <h1 class="text-2xl font-bold text-ink">Sign in</h1>
      <p class="text-sm text-ink-faint mt-1">Enter your operator credentials.</p>

      <form class="space-y-4 mt-7" @submit.prevent="signIn">
        <FormField label="Username">
          <TextInput v-model="form.username" placeholder="a.mensah" autocomplete="username" />
        </FormField>
        <FormField label="Password">
          <TextInput v-model="form.password" type="password" placeholder="••••••••" autocomplete="current-password" />
        </FormField>
        <BaseButton type="submit" block :disabled="busy" icon="arrow-right">
          {{ busy ? 'Signing in…' : 'Continue' }}
        </BaseButton>
      </form>

      <div class="mt-6 rounded-lg bg-primary-soft px-4 py-3 text-xs text-ink-soft">
        <p class="font-semibold text-primary mb-1">Demo credentials</p>
        <p>Username <code class="bg-white px-1.5 py-0.5 rounded">a.mensah</code> · password <code class="bg-white px-1.5 py-0.5 rounded">demo1234</code></p>
        <p class="mt-1 text-ink-faint">Any seeded user works; the password is <code>demo1234</code>.</p>
      </div>

      <p class="text-sm text-ink-faint mt-6 text-center">
        New institution? <NuxtLink to="/signup" class="text-primary font-semibold hover:underline">Create a platform account</NuxtLink>
      </p>
    </div>

    <!-- 2FA -->
    <div v-else>
      <div class="flex items-center gap-3 mb-6">
        <span class="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center">
          <AppIcon name="shield-check" :size="24" />
        </span>
        <div>
          <h1 class="text-2xl font-bold text-ink">Two-factor authentication</h1>
          <p class="text-sm text-ink-faint">Signed in as <strong class="text-ink">{{ pendingName }}</strong></p>
        </div>
      </div>

      <p class="text-sm text-ink-soft leading-relaxed">
        Open <strong>Google Authenticator</strong> (or Authy / Microsoft Authenticator) and enter the
        6-digit code for <strong>TL Core Banking</strong>.
      </p>

      <!-- Enrolment QR (shown for first-time users) -->
      <details v-if="enrol" class="mt-4 rounded-xl border border-line bg-canvas/60 p-4">
        <summary class="text-xs font-semibold text-ink-soft cursor-pointer select-none">
          First time? Show enrolment QR for Google Authenticator
        </summary>
        <div class="mt-4 flex flex-col items-center text-center">
          <img :src="enrol.qr" alt="2FA QR code" class="rounded-lg border border-line bg-white p-2 w-44 h-44" />
          <p class="text-[11px] text-ink-faint mt-3">Scan with Google Authenticator, or enter this key manually:</p>
          <code class="mt-1 text-xs bg-white border border-line rounded px-2 py-1 select-all tracking-wider">{{ enrol.secret }}</code>
        </div>
      </details>

      <form class="space-y-4 mt-5" @submit.prevent="verify">
        <FormField label="Authenticator code" required>
          <TextInput v-model="code" placeholder="123 456" maxlength="6" inputmode="numeric"
            class="!text-center !text-2xl !tracking-[0.5em] !font-bold !py-3" />
        </FormField>
        <div v-if="enrol" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
          <p>Demo: your current code is <strong class="tnum text-base">{{ enrol.demoCode }}</strong>
             (refreshes every {{ enrol.demoCodeExpiresIn }}s). In production this hint is removed.</p>
        </div>
        <BaseButton type="submit" block variant="success" icon="check" :disabled="busy || code.length !== 6">
          {{ busy ? 'Verifying…' : 'Verify & sign in' }}
        </BaseButton>
      </form>

      <button class="mt-5 text-sm text-ink-faint hover:text-ink w-full text-center"
        @click="step = 'credentials'">← Back to sign in</button>
    </div>
  </div>
</template>
