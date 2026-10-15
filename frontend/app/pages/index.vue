<script setup lang="ts">
definePageMeta({ layout: false })
await navigateTo('/modules', { replace: true })
</script>

<template>
  <div class="min-h-screen bg-canvas" aria-label="Opening module manager" />
</template>
