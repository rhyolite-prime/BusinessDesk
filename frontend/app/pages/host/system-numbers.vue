<script setup lang="ts">
definePageMeta({ layout: 'host-admin' })
useHead({ title: 'Host system numbers' })
</script>
<template><div class="space-y-6"><SystemNumberCatalog host /><SystemNumberTenantSync /></div></template>
