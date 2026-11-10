<script setup lang="ts">
import { X } from '@lucide/vue'
import type { LedgerVoucher } from '../features/ledger/voucher-data'
import { voucherReport, type VoucherReport } from '../features/ledger/voucher-report'

const props = defineProps<{ voucher: LedgerVoucher }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const report = shallowRef<VoucherReport | null>(null)
const error = ref('')
const loading = ref(true)
let disposed = false
const exporters = {
  pdf: async () => (await import('../features/ledger/voucher-report-exports')).createVoucherPdf(report.value!),
  xlsx: async () => (await import('../features/ledger/voucher-report-exports')).createVoucherExcel(report.value!),
  docx: async () => (await import('../features/ledger/voucher-report-exports')).createVoucherWord(report.value!),
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const elements = [...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.offsetParent !== null)
  if (!elements.length) { event.preventDefault(); return }
  const first = elements[0]!, last = elements[elements.length - 1]!
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(async () => {
  closeButton.value?.focus()
  const oldOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  onCleanup = () => { document.body.style.overflow = oldOverflow }
  let companyName = ''
  try { companyName = (await $fetch<{ companyName?: string }>('/api/shared/company-profile', { timeout: 4000, retry: 0 }))?.companyName || '' } catch { /* A missing profile must not undo a successful save. */ }
  if (disposed) return
  try { report.value = voucherReport(props.voucher, companyName) }
  catch { error.value = 'The voucher was saved, but its preview could not be prepared. Return to the voucher register and review the saved record.' }
  finally { loading.value = false }
})
let onCleanup: (() => void) | undefined
onBeforeUnmount(() => { disposed = true; onCleanup?.() })
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5" @keydown="onKeydown">
      <section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="voucher-preview-title" class="flex max-h-[95vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        <header class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div><h2 id="voucher-preview-title" class="text-base font-semibold">Voucher preview</h2><p class="mt-1 text-xs text-slate-500">Draft saved · {{ voucher.voucherNumber }}</p></div>
          <button ref="closeButton" type="button" aria-label="Close voucher preview" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" @click="emit('close')"><X :size="20" /></button>
        </header>
        <div class="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
          <p v-if="loading" role="status" class="p-8 text-center text-sm text-slate-500">Preparing saved voucher…</p>
          <p v-else-if="error" role="alert" class="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
          <ClientOnly v-else-if="report"><ReportViewer :report="report" :exporters="exporters" /></ClientOnly>
        </div>
        <footer class="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700"><button type="button" class="rounded-lg bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800" @click="emit('close')">Back to vouchers</button></footer>
      </section>
    </div>
  </Teleport>
</template>
