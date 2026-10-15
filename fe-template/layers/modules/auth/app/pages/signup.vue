<script setup lang="ts">
useHead({ title: 'Platform signup' })
definePageMeta({ layout: 'auth' })
const router = useRouter()
const toast = useToast()
const api = useApi()

const step = ref<'form' | '2fa'>('form')
const form = reactive({
  institution: '', fullname: '', email: '', phone: '',
  password: '', confirm: '', terms: false,
})
const busy = ref(false)
const setup = ref<any>(null)
const code = ref('')

async function proceed() {
  if (!form.institution || !form.fullname || !form.email) return toast.error('Please complete institution and your name')
  if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
  if (form.password !== form.confirm) return toast.error('Passwords do not match')
  if (!form.terms) return toast.error('Please accept the terms to continue')
  busy.value = true
  try {
    const username = form.email.split('@')[0].replace(/[^a-z0-9.]/g, '.')
    // provision a TOTP secret for this future user
    setup.value = await api.get('/auth/setup-2fa', { username })
    step.value = '2fa'
  } catch (e: any) {
    toast.error('Could not start enrolment', e.message)
  } finally { busy.value = false }
}

async function finalize() {
  busy.value = true
  try {
    const res: any = await api.post('/auth/signup', { ...form, totpSecret: setup.value.secret })
    toast.success('Tenant provisioned', res.message)
    router.replace('/login')
  } catch (e: any) {
    toast.error('Signup failed', e.message)
  } finally { busy.value = false }
}

let timer: any
onMounted(() => {
  timer = setInterval(async () => {
    if (step.value === '2fa' && setup.value?.secret && form.email) {
      try {
        const username = form.email.split('@')[0].replace(/[^a-z0-9.]/g, '.')
        setup.value = await $fetch('/api/auth/setup-2fa', { query: { username } })
      } catch (e) { /* ignore */ }
    }
  }, 5000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div>
    <!-- Step 1: institution + admin -->
    <div v-if="step === 'form'">
      <h1 class="text-2xl font-bold text-ink">Create your platform account</h1>
      <p class="text-sm text-ink-faint mt-1">Provision a new tenant for your institution.</p>

      <form class="space-y-4 mt-6" @submit.prevent="proceed">
        <FormField label="Institution name" required>
          <TextInput v-model="form.institution" placeholder="e.g. SikaTrust Microfinance" />
        </FormField>
        <FormField label="Administrator full name" required>
          <TextInput v-model="form.fullname" placeholder="Adjoa Mensah" />
        </FormField>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Work email" required>
            <TextInput v-model="form.email" type="email" placeholder="you@institution.com" />
          </FormField>
          <FormField label="Phone">
            <TextInput v-model="form.phone" placeholder="+233 …" />
          </FormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <FormField label="Password" required>
            <TextInput v-model="form.password" type="password" placeholder="8+ characters" />
          </FormField>
          <FormField label="Confirm password" required>
            <TextInput v-model="form.confirm" type="password" placeholder="Repeat" />
          </FormField>
        </div>
        <label class="flex items-start gap-3 text-xs text-ink-soft cursor-pointer">
          <input v-model="form.terms" type="checkbox" class="mt-0.5 w-4 h-4 rounded border-line accent-[var(--brand-primary)]" />
          I accept the platform terms and consent to white-label provisioning for my institution.
        </label>
        <BaseButton type="submit" block :disabled="busy" icon="shield-check">
          {{ busy ? 'Preparing…' : 'Continue to 2FA set-up' }}
        </BaseButton>
      </form>

      <p class="text-sm text-ink-faint mt-6 text-center">
        Already have an account? <NuxtLink to="/login" class="text-primary font-semibold hover:underline">Sign in</NuxtLink>
      </p>
    </div>

    <!-- Step 2: enrol Google Authenticator -->
    <div v-else>
      <h1 class="text-2xl font-bold text-ink">Set up Google Authenticator</h1>
      <p class="text-sm text-ink-faint mt-1">Required for admin sign-in. Scan the QR, then confirm with a code.</p>

      <div class="mt-6 flex flex-col items-center rounded-2xl border border-line p-6 bg-canvas/50">
        <img v-if="setup" :src="setup.qr" alt="Enrolment QR" class="rounded-lg bg-white border border-line p-2 w-48 h-48" />
        <p class="text-xs text-ink-faint mt-4 text-center">Scan with Google Authenticator / Authy<br />or enter this key manually:</p>
        <code class="mt-2 text-xs bg-white border border-line rounded px-2 py-1 select-all tracking-wider">{{ setup?.secret }}</code>
      </div>

      <form class="space-y-4 mt-5" @submit.prevent="finalize">
        <FormField label="Enter the 6-digit code to confirm" required>
          <TextInput v-model="code" placeholder="123 456" maxlength="6" inputmode="numeric"
            class="!text-center !text-2xl !tracking-[0.5em] !font-bold !py-3" />
        </FormField>
        <div class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
          Demo code: <strong class="tnum text-base">{{ setup?.demoCode }}</strong> (refreshes each 30s)
        </div>
        <BaseButton type="submit" block variant="success" icon="check" :disabled="busy || code.length !== 6">
          {{ busy ? 'Provisioning tenant…' : 'Confirm & create account' }}
        </BaseButton>
      </form>

      <button class="mt-4 text-sm text-ink-faint hover:text-ink w-full text-center" @click="step = 'form'">← Back</button>
    </div>
  </div>
</template>
