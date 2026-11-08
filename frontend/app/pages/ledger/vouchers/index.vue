<script setup lang="ts">
import VoucherRegister from '../../../features/ledger/components/VoucherRegister.vue'

definePageMeta({ layout: 'admin-ledger' })
useHead({ title: 'Vouchers' })
</script>

<template>
  <VoucherRegister />
</template>
