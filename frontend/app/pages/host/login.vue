<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Host administrator sign-in' })
const form = reactive({ usernameOrEmail: '', password: '' }), busy = ref(false), error = ref('')
async function login() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await $fetch('/api/host/login', { method: 'POST', body: { ...form } }); form.password = ''; await navigateTo('/host/currencies') }
  catch (e: any) { error.value = e?.data?.statusMessage || 'Host sign-in failed. Please retry.'; form.password = '' }
  finally { busy.value = false }
}
</script>
<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
    <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p class="text-xs font-medium text-brand-700">BusinessDesk Host Administration</p><h1 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Host sign-in</h1><p class="mt-2 text-sm text-slate-500">Only host administrators can manage the currency catalog shared by all companies. Tenant credentials do not grant access.</p>
      <form class="mt-6" @submit.prevent="login"><fieldset :disabled="busy" class="space-y-4">
        <label class="block text-sm text-slate-600 dark:text-slate-300">Username or email<input v-model="form.usernameOrEmail" autocomplete="username" required class="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" /></label>
        <label class="block text-sm text-slate-600 dark:text-slate-300">Password<input v-model="form.password" type="password" autocomplete="current-password" required class="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" /></label>
        <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p><button type="submit" class="h-10 w-full rounded-lg bg-brand-700 text-sm font-semibold text-white">{{ busy ? 'Signing in…' : 'Sign in as host' }}</button>
      </fieldset></form>
      <NuxtLink to="/login" class="mt-5 inline-block text-xs text-brand-700 underline">Tenant sign-in</NuxtLink>
    </section>
  </main>
</template>
