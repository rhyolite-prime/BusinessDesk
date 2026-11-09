<script setup lang="ts">
// Preserve old bookmarks without exposing the retired employee self-service page.
definePageMeta({ layout: false })
await navigateTo('/hr/profile-changes', { replace: true })
</script>
<template><div /></template>
