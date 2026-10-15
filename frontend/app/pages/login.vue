<script setup lang="ts">
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole } from '@lucide/vue'

definePageMeta({ layout: false })
useHead({ title: 'Sign in', titleTemplate: '%s · BusinessDesk' })

interface AuthenticationStatus {
  serviceConfigured: boolean
  demoMode: boolean
}

const { login } = useBusinessDeskAuth()
const { data: authenticationStatus } = await useFetch<AuthenticationStatus>('/api/auth/status')
const form = reactive({ accountId: '', username: '', password: '' })
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const showDemoNotice = computed(() => authenticationStatus.value?.demoMode ?? false)
const showAuthUnavailableNotice = computed(() => Boolean(authenticationStatus.value && !authenticationStatus.value.serviceConfigured && !authenticationStatus.value.demoMode))

async function submitLogin() {
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
    await login(credentials)
    await navigateTo('/modules')
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
    errorMessage.value = fetchError.data?.statusMessage || fetchError.data?.message || fetchError.statusMessage || fetchError.message || 'We could not sign you in. Check your details and try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#f4f7f5] text-slate-900 dark:bg-[#101716] dark:text-slate-100">
    <div class="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[minmax(440px,0.94fr)_1.06fr]">
      <section class="relative hidden overflow-hidden bg-[#123b34] px-12 py-12 text-white lg:my-4 lg:ml-4 lg:flex lg:min-h-[calc(100vh-2rem)] lg:flex-col lg:rounded-[28px] lg:px-14 xl:px-[76px]">
        <div class="pointer-events-none absolute -right-36 -top-24 h-[440px] w-[440px] rounded-full border border-white/[0.08]" />
        <div class="pointer-events-none absolute -right-20 -top-8 h-[320px] w-[320px] rounded-full border border-white/[0.09]" />
        <div class="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-emerald-300/[0.07] blur-2xl" />
        <div class="pointer-events-none absolute right-[16%] top-[38%] h-2 w-2 rounded-full bg-emerald-200/80 shadow-[0_0_28px_10px_rgba(110,231,183,0.14)]" />

        <div class="relative z-10 flex items-center gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/15 bg-white/10 text-[15px] font-bold tracking-tight shadow-lg shadow-black/10">BD</span>
          <span>
            <span class="block text-[17px] font-semibold tracking-tight">BusinessDesk</span>
            <span class="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/60">Business management</span>
          </span>
        </div>

        <div class="relative z-10 my-auto max-w-[540px] py-14">
          <span class="inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-emerald-50/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/85">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-300" /> One connected workspace
          </span>
          <h1 class="mt-7 text-[42px] font-semibold leading-[1.12] tracking-[-0.04em] xl:text-[52px]">Clarity for every part of your business.</h1>
          <p class="mt-5 max-w-[430px] text-[15px] leading-7 text-emerald-50/65">Bring finance and operations into one calm, reliable workspace—built to help your team make confident decisions.</p>

          <div class="mt-12 max-w-[470px] rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/10 backdrop-blur-sm">
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <span class="flex items-center gap-2 text-[11px] font-semibold text-white/85"><span class="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-300/15 text-emerald-200"><Building2 :size="13" /></span> Finance workspace</span>
              <span class="rounded-full bg-emerald-200/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-100/80">Organization account</span>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-3">
              <div v-for="item in [{ label: 'Ledger', value: 'In balance' }, { label: 'Workflows', value: 'Connected' }, { label: 'Reporting', value: 'Up to date' }]" :key="item.label" class="rounded-xl bg-black/10 px-3 py-3">
                <span class="block text-[9px] font-medium uppercase tracking-wide text-white/45">{{ item.label }}</span>
                <span class="mt-1.5 block text-[11px] font-semibold text-white/85">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="relative z-10 flex items-center justify-between text-[10px] text-emerald-50/45">
          <span>BusinessDesk · Finance workspace</span>
          <span class="inline-flex items-center gap-1.5"><Building2 :size="13" /> Organization sign-in</span>
        </div>
      </section>

      <section class="flex min-h-screen flex-col justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
        <div class="mx-auto w-full max-w-[430px]">
          <div class="mb-12 flex items-center gap-3 lg:hidden">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">BD</span>
            <span>
              <span class="block text-[16px] font-semibold tracking-tight">BusinessDesk</span>
              <span class="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Business management</span>
            </span>
          </div>

          <div class="mb-8">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Welcome back</p>
            <h2 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-slate-900 dark:text-white sm:text-[34px]">Sign in to your account</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Use your organization account to access your BusinessDesk workspace.</p>
          </div>

          <div v-if="showDemoNotice" class="mb-5 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25">
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"><LockKeyhole :size="11" /></span>
            <p class="text-[11px] leading-5 text-amber-900/80 dark:text-amber-200/80"><span class="font-semibold">Preview sign-in.</span> Any non-empty account ID, username, and password will open the module manager in this demo environment.</p>
          </div>
          <div v-else-if="showAuthUnavailableNotice" class="mb-5 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><LockKeyhole :size="11" /></span>
            <p class="text-[11px] leading-5 text-slate-600 dark:text-slate-300"><span class="font-semibold">Authentication service not connected.</span> Real sign-in will be available after an authentication service is configured with <code class="rounded bg-white px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">AUTH_API_BASE_URL</code>.</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitLogin">
            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Account ID</span>
              <span class="relative block">
                <Building2 :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input v-model="form.accountId" name="accountId" type="text" autocomplete="organization" required maxlength="80" placeholder="e.g. ACC-01" class="h-[48px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-brand-900/30" />
              </span>
            </label>

            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Username</span>
              <span class="relative block">
                <svg aria-hidden="true" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="4" /></svg>
                <input v-model="form.username" name="username" type="text" autocomplete="username" required maxlength="100" placeholder="Enter your username" class="h-[48px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-brand-900/30" />
              </span>
            </label>

            <label class="block">
              <span class="mb-1.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">Password</span>
              <span class="relative block">
                <LockKeyhole :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input v-model="form.password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required maxlength="256" placeholder="Enter your password" class="h-[48px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100/80 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-brand-900/30" />
                <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
                  <EyeOff v-if="showPassword" :size="16" /><Eye v-else :size="16" />
                </button>
              </span>
            </label>

            <p v-if="errorMessage" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{{ errorMessage }}</p>

            <button type="submit" :disabled="submitting" class="mt-2 inline-flex h-[49px] w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(30,93,80,0.18)] transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-wait disabled:opacity-70 dark:focus:ring-brand-900/50">
              <span v-if="submitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {{ submitting ? 'Signing in…' : 'Sign in' }}
              <ArrowRight v-if="!submitting" :size="16" />
            </button>
          </form>

          <div class="mt-7 flex items-start gap-2.5 border-t border-slate-200/80 pt-5 dark:border-slate-800">
            <Building2 :size="16" class="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <p class="text-[11px] leading-5 text-slate-500 dark:text-slate-400">Your account ID connects you to the correct organization. Contact your system administrator if you need access assistance.</p>
          </div>
        </div>

        <p class="mx-auto mt-12 w-full max-w-[430px] text-center text-[10px] text-slate-400">© {{ new Date().getFullYear() }} BusinessDesk. All rights reserved.</p>
      </section>
    </div>
  </main>
</template>
