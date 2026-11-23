<script setup lang="ts">
import { useLedgerVoucherApi } from '../../../../features/ledger/useLedgerVoucherApi'

const route = useRoute()
const id = String(route.params.id || '')
const api = useLedgerVoucherApi()
const error = ref('')

onMounted(async () => {
  if (!id) {
    await navigateTo('/ledger/vouchers')
    return
  }
  try {
    const voucher = await api.get(id)
    if (voucher?.type) {
      await navigateTo(`/ledger/vouchers/new/${voucher.type}?id=${encodeURIComponent(id)}`)
    } else {
      await navigateTo('/ledger/vouchers')
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Failed to load voucher for editing'
  }
})
</script>

<template>
  <div class="mx-auto max-w-md p-8 text-center text-sm text-slate-500">
    <p v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
      {{ error }}
    </p>
    <div v-else class="flex items-center justify-center gap-2">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
      <span>Redirecting to voucher editor…</span>
    </div>
  </div>
</template>
