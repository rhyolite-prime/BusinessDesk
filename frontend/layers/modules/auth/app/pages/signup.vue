<script setup lang="ts">
useHead({ title: 'Request a tenant account' })
definePageMeta({ layout: 'auth' })
</script>

<template>
  <div class="space-y-5">
    <h1 class="text-2xl font-bold text-ink">Request a tenant account</h1>
    <p class="text-sm text-ink-soft leading-relaxed">
      Contact your platform administrator to provision your institution and administrator account.
      Tenant accounts are created through the permission-protected management API.
    </p>
    <p class="text-sm text-ink-faint leading-relaxed">
      Already have an account? Sign in with your account ID, username or email, and password.
      If your institution requires two-factor authentication, you can set up your authenticator during sign-in.
    </p>
    <NuxtLink to="/login" class="inline-block text-primary font-semibold hover:underline">Back to sign in →</NuxtLink>
  </div>
</template>
