<script setup lang="ts">
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from '@lucide/vue'
import type { LoginChallenge } from '../composables/useBusinessDeskAuth'

definePageMeta({ layout: false })
useHead({ title: 'Sign in', titleTemplate: '%s · BusinessDesk' })

interface AuthenticationStatus {
  serviceConfigured: boolean
  demoMode: boolean
}

const { beginLogin, verifyTwoFactor, resendTwoFactor, cancelTwoFactor } = useBusinessDeskAuth()
const { data: authenticationStatus } = await useFetch<AuthenticationStatus>('/api/auth/status')
const form = reactive({ accountId: '', username: '', password: '' })
const otpCode = ref('')
const codeInput = ref<HTMLInputElement | null>(null)
const challenge = ref<LoginChallenge | null>(null)
const step = ref<'credentials' | 'verification'>('credentials')
const showPassword = ref(false)
const submitting = ref(false)
const verifying = ref(false)
const resending = ref(false)
const resendCountdown = ref(0)
const errorMessage = ref('')
const showDemoNotice = computed(() => authenticationStatus.value?.demoMode ?? false)
const showAuthUnavailableNotice = computed(() => Boolean(authenticationStatus.value && !authenticationStatus.value.serviceConfigured && !authenticationStatus.value.demoMode))
const canVerify = computed(() => /^\d{6}$/.test(otpCode.value))
let resendTimer: ReturnType<typeof setInterval> | undefined

function errorText(error: unknown, fallback: string) {
  const fetchError = error as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
  return fetchError.data?.statusMessage || fetchError.data?.message || fetchError.statusMessage || fetchError.message || fallback
}

function focusCodeInput() {
  nextTick(() => codeInput.value?.focus())
}

function clearOtp() {
  otpCode.value = ''
}

function handleOtpInput(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 6)
  otpCode.value = digits
  input.value = digits
}

function startResendTimer() {
  if (resendTimer) clearInterval(resendTimer)
  resendCountdown.value = 30
  resendTimer = setInterval(() => {
    if (resendCountdown.value <= 1) {
      resendCountdown.value = 0
      if (resendTimer) clearInterval(resendTimer)
      resendTimer = undefined
      return
    }
    resendCountdown.value -= 1
  }, 1000)
}

async function submitCredentials() {
  errorMessage.value = ''
  const credentials = {
    accountId: form.accountId.trim(),
    username: form.username.trim(),
    password: form.password,
  }
  if (!credentials.accountId || !credentials.username || !credentials.password) {
    errorMessage.value = 'Enter your account ID, username, and password to continue.'
    return
  }

  submitting.value = true
  try {
    const response = await beginLogin(credentials)
    challenge.value = response
    form.password = ''
    clearOtp()
    step.value = 'verification'
    startResendTimer()
    focusCodeInput()
  } catch (error: unknown) {
    errorMessage.value = errorText(error, 'We could not start sign-in. Check your details and try again.')
  } finally {
    submitting.value = false
  }
}

async function submitVerification() {
  errorMessage.value = ''
  if (!canVerify.value) {
    errorMessage.value = 'Enter all six digits to verify your sign-in.'
    return
  }

  verifying.value = true
  try {
    await verifyTwoFactor(otpCode.value)
    if (resendTimer) clearInterval(resendTimer)
    challenge.value = null
    await navigateTo('/modules')
  } catch (error: unknown) {
    errorMessage.value = errorText(error, 'We could not verify that code. Check it and try again.')
  } finally {
    verifying.value = false
  }
}

async function resendCode() {
  if (resendCountdown.value > 0 || resending.value) return
  errorMessage.value = ''
  resending.value = true
  try {
    const response = await resendTwoFactor()
    if (challenge.value) {
      challenge.value = { ...challenge.value, ...response }
    }
    clearOtp()
    startResendTimer()
    focusCodeInput()
  } catch (error: unknown) {
    errorMessage.value = errorText(error, 'We could not resend the code. Try again shortly.')
  } finally {
    resending.value = false
  }
}

async function useDifferentDetails() {
  await cancelTwoFactor()
  if (resendTimer) clearInterval(resendTimer)
  challenge.value = null
  step.value = 'credentials'
  errorMessage.value = ''
  clearOtp()
}

onBeforeUnmount(() => {
  if (resendTimer) clearInterval(resendTimer)
  if (challenge.value) void cancelTwoFactor()
})
</script>

<template>
  <main class="min-h-screen flex bg-[#f4f6fa] font-sora text-slate-900 dark:bg-[#101716] dark:text-slate-100">
    <section
      class="relative hidden overflow-hidden p-10 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between"
      style="background: linear-gradient(150deg, #1b4b42, #0c231c)"
      aria-label="BusinessDesk"
    >
      <div class="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-white/[0.05]" />
      <div class="pointer-events-none absolute -bottom-10 -left-20 h-72 w-72 rounded-full bg-white/[0.05]" />

      <NuxtLink to="/" class="relative flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8a33d] text-sm font-extrabold text-[#0c231c] shadow-md">BD</span>
        <span class="min-w-0">
          <span class="block truncate text-[15px] font-bold leading-tight">BusinessDesk</span>
          <span class="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-white/55">Business management</span>
        </span>
      </NuxtLink>

      <div class="relative max-w-lg py-12">
        <h2 class="text-2xl font-bold leading-snug">One workspace for the people who keep business moving.</h2>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Bring finance and operations together—from everyday ledger work to the decisions that shape your institution.
        </p>
        <div class="mt-8 flex items-center gap-2 text-xs font-medium text-white/70">
          <ShieldCheck :size="15" class="text-[#e8a33d]" />
          A more confident way to work
        </div>
      </div>

      <p class="relative text-[11px] text-white/40">BusinessDesk · Financial operations</p>
    </section>

    <section class="flex flex-1 items-center justify-center p-6 sm:p-8">
      <div class="w-full max-w-md">
        <div class="mb-8 flex justify-center lg:hidden">
          <NuxtLink to="/" class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8a33d] text-sm font-extrabold text-[#0c231c] shadow-md">BD</span>
            <span>
              <span class="block text-[15px] font-bold leading-tight text-slate-900 dark:text-white">BusinessDesk</span>
              <span class="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-slate-400">Business management</span>
            </span>
          </NuxtLink>
        </div>

        <div v-if="step === 'credentials'">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your organization credentials.</p>

          <form class="mt-7 space-y-4" @submit.prevent="submitCredentials">
            <label class="block">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Account ID</span>
              <input
                v-model="form.accountId"
                name="accountId"
                type="text"
                autocomplete="organization"
                required
                maxlength="80"
                placeholder="e.g. ACC-01"
                class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label class="block">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Username</span>
              <input
                v-model="form.username"
                name="username"
                type="text"
                autocomplete="username"
                required
                maxlength="100"
                placeholder="Enter your username"
                class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label class="block">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</span>
              <span class="relative mt-1.5 block">
                <input
                  v-model="form.password"
                  name="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  maxlength="256"
                  placeholder="Enter your password"
                  class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </span>
            </label>

            <p v-if="errorMessage" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ errorMessage }}</p>

            <button
              type="submit"
              :disabled="submitting"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
            >
              <span v-if="submitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {{ submitting ? 'Signing in…' : 'Continue' }}
              <ArrowRight v-if="!submitting" :size="17" />
            </button>
          </form>

          <div v-if="showDemoNotice" class="mt-6 rounded-lg bg-brand-50 px-4 py-3 text-xs text-slate-600 dark:bg-brand-900/25 dark:text-slate-300">
            <p class="mb-1 font-semibold text-brand-700 dark:text-brand-300">Preview sign-in</p>
            <p>Use any non-empty account ID, username, and password. The mock verification code appears in the next step.</p>
            <p class="mt-1 text-slate-500 dark:text-slate-400">This is demo authentication only; no real identity is checked.</p>
          </div>
          <div v-else-if="showAuthUnavailableNotice" class="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <p class="font-semibold text-slate-700 dark:text-slate-200">Authentication service not connected</p>
            <p class="mt-1">Configure <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">AUTH_API_BASE_URL</code> to enable real sign-in.</p>
          </div>

          <p class="mt-6 text-center text-sm text-slate-400">Need help signing in? Contact your system administrator.</p>
        </div>

        <div v-else>
          <div class="mb-6 flex items-center gap-3">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <ShieldCheck :size="24" />
            </span>
            <div>
              <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Two-factor authentication</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">Signing in as <strong class="text-slate-800 dark:text-slate-200">{{ form.username }}</strong></p>
            </div>
          </div>

          <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Enter the six-digit verification code for <strong class="text-slate-800 dark:text-slate-100">{{ challenge?.maskedDestination || 'your registered contact' }}</strong>.
          </p>

          <div v-if="challenge?.demo && challenge.demoCode" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
            <p>Preview only: use code <strong class="tabular-nums text-base">{{ challenge.demoCode }}</strong>.</p>
            <p class="mt-1 text-amber-700/80 dark:text-amber-200/75">No email or SMS is sent in this mock flow.</p>
          </div>

          <form class="mt-5 space-y-4" @submit.prevent="submitVerification">
            <label class="block">
              <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Verification code</span>
              <input
                ref="codeInput"
                :value="otpCode"
                name="verificationCode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                autocomplete="one-time-code"
                placeholder="123 456"
                aria-label="Six-digit verification code"
                class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                @input="handleOtpInput"
              />
            </label>

            <p v-if="errorMessage" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ errorMessage }}</p>

            <button
              type="submit"
              :disabled="verifying || !canVerify"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
            >
              <span v-if="verifying" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {{ verifying ? 'Verifying…' : 'Verify and sign in' }}
              <ArrowRight v-if="!verifying" :size="17" />
            </button>
          </form>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              class="text-sm font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-brand-300 dark:hover:text-brand-200"
              :disabled="resendCountdown > 0 || resending"
              @click="resendCode"
            >
              {{ resending ? 'Resending…' : resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code' }}
            </button>
            <button type="button" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" @click="useDifferentDetails">
              <ArrowLeft :size="14" /> Back to sign in
            </button>
          </div>

          <p class="mt-6 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-400 dark:border-slate-800 dark:text-slate-500">
            A second verification step is required before your workspace opens. The preview code is mock-only; production verification must be provided by the configured authentication service.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
