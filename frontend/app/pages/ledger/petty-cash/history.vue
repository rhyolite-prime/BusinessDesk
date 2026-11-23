<script setup lang="ts">
import PettyCashRegister from '../../../features/ledger/components/PettyCashRegister.vue'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Petty cash history' })
</script>

<template>
  <PettyCashRegister history />
</template>
