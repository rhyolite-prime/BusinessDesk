<script setup lang="ts">
definePageMeta({ layout: 'host-admin' })
useHead({ title: 'Host currency catalog' })
</script>
<template><CurrencyCatalog :host="true" /></template>
