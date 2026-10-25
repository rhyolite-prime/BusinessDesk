<script setup lang="ts">
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { EmbeddedReport, ReportColorMode } from '../features/reports/report-types'
import { createReportPdf, createReportExcel, createReportWord } from '../features/reports/report-exports'
import { printReportPdf } from '../features/reports/print-report'
const colorMode = ref<ReportColorMode>('color')
let cleanupPrint: (() => void) | undefined
const props = defineProps<{ report: EmbeddedReport }>()
const canvas = ref<HTMLCanvasElement | null>(null), viewport = ref<HTMLElement | null>(null)
const page = ref(1), pageInput = ref(1), total = ref(0), zoom = ref('fit'), generating = ref(false), rendering = ref(false), exporting = ref(''), error = ref(''), pageText = ref('')
let document: PDFDocumentProxy | undefined, renderTask: RenderTask | undefined, pdf: Uint8Array | undefined, generation = 0, renderVersion = 0
let observer: ResizeObserver | undefined, resizeTimer: ReturnType<typeof setTimeout> | undefined
const rows = computed(() => props.report.sections.reduce((sum, section) => sum + section.rows.length, 0))
async function renderPage() {
  if (!document || !canvas.value || !viewport.value) return
  const version = ++renderVersion, current = document
  renderTask?.cancel(); rendering.value = true
  try {
    const pdfPage = await current.getPage(page.value)
    if (version !== renderVersion) return
    const original = pdfPage.getViewport({ scale: 1 })
    const scale = zoom.value === 'fit' ? Math.max(0.2, Math.min(1.5, (viewport.value.clientWidth - 32) / original.width)) : Number(zoom.value)
    const view = pdfPage.getViewport({ scale }), ratio = Math.min(window.devicePixelRatio || 1, 2)
    const element = canvas.value; element.width = Math.ceil(view.width * ratio); element.height = Math.ceil(view.height * ratio); element.style.width = `${view.width}px`; element.style.height = `${view.height}px`
    renderTask = pdfPage.render({ canvas: element, viewport: view, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] })
    await renderTask.promise
    const text = await pdfPage.getTextContent()
    if (version === renderVersion) pageText.value = text.items.map(item => 'str' in item ? item.str : '').join(' ')
  } catch (e: any) { if (version === renderVersion && e?.name !== 'RenderingCancelledException') error.value = 'Could not render this page. Please regenerate the report.' }
  finally { if (version === renderVersion) rendering.value = false }
}
async function generate() {
  const version = ++generation; ++renderVersion; renderTask?.cancel()
  const previous = document; document = undefined; void previous?.destroy()
  pdf = undefined; total.value = 0; pageText.value = ''; generating.value = true; error.value = ''
  try {
    const bytes = await createReportPdf(props.report, colorMode.value)
    if (version !== generation) return
    const pdfjs = await import('pdfjs-dist'); pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    const result = await pdfjs.getDocument({ data: bytes.slice() }).promise
    if (version !== generation) { await result.destroy(); return }
    pdf = bytes; document = result; total.value = result.numPages; page.value = 1; pageInput.value = 1
    await nextTick(); await renderPage()
  } catch (e) { if (version === generation) error.value = 'Unable to generate the report. Retry or narrow the report filters.' }
  finally { if (version === generation) generating.value = false }
}
function navigate(value: number) { if (!Number.isFinite(value)) return; page.value = Math.max(1, Math.min(total.value, Math.trunc(value))); pageInput.value = page.value }
function download(blob: Blob, extension: string, reportId: string) {
  const url = URL.createObjectURL(blob), link = window.document.createElement('a')
  link.href = url; link.download = `${reportId}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000)
}
async function exportReport(format: 'pdf' | 'xlsx' | 'docx') {
  if (generating.value || exporting.value || !pdf) return
  exporting.value = format; error.value = ''
  // Export the same immutable report snapshot shown in the viewer, never just this page.
  const report = props.report, mode = colorMode.value
  try {
    const blob = format === 'pdf' ? new Blob([pdf.slice().buffer as ArrayBuffer], { type: 'application/pdf' }) : format === 'xlsx' ? await createReportExcel(report, mode) : await createReportWord(report, mode)
    download(blob, format, report.id)
  } catch { error.value = 'Export failed. Please try again.' }
  finally { exporting.value = '' }
}
function printReport() {
  if (generating.value || exporting.value || !pdf) return
  cleanupPrint?.(); error.value = ''
  cleanupPrint = printReportPdf(pdf, () => { error.value = 'Printing could not start. Export PDF and print it from your PDF reader.' })
}
watch([() => props.report, colorMode], generate)
watch([page, zoom], () => { pageText.value = ''; void renderPage() })
onMounted(() => {
  void generate()
  observer = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (zoom.value === 'fit') void renderPage() }, 120) })
  if (viewport.value) observer.observe(viewport.value)
})
onBeforeUnmount(() => { cleanupPrint?.(); generation++; renderVersion++; observer?.disconnect(); clearTimeout(resizeTimer); renderTask?.cancel(); void document?.destroy() })
</script>

<template>
  <section aria-label="Report viewer" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
      <div><h2 class="text-sm font-semibold">{{ report.title }}</h2><p class="mt-1 text-xs text-slate-500">Embedded standard report · {{ rows.toLocaleString() }} records</p></div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-xs font-semibold">Report appearance<select v-model="colorMode" :disabled="!!exporting" class="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900"><option value="color">Color</option><option value="monochrome">Black &amp; white</option></select></label>
        <button type="button" class="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" :disabled="generating || !total || !!exporting" @click="printReport">Print report</button>
        <button v-for="format in (['pdf', 'xlsx', 'docx'] as const)" :key="format" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" :disabled="generating || !total || !!exporting" @click="exportReport(format)">{{ exporting === format ? 'Exporting…' : format === 'xlsx' ? 'Export Excel' : format === 'docx' ? 'Export Word' : 'Export PDF' }}</button></div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <button aria-label="First page" :disabled="generating || page <= 1" class="rounded border px-2 py-1 disabled:opacity-40" @click="navigate(1)">«</button><button aria-label="Previous page" :disabled="generating || page <= 1" class="rounded border px-2 py-1 disabled:opacity-40" @click="navigate(page - 1)">‹</button>
        <label>Page <input v-model.number="pageInput" aria-label="Report page number" type="number" min="1" :max="total || 1" :disabled="generating || !total" class="w-16 rounded border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700" @change="navigate(Number(pageInput))" @keydown.enter.prevent="navigate(Number(pageInput))" /></label><span aria-live="polite">of {{ total }}</span>
        <button aria-label="Next page" :disabled="generating || page >= total" class="rounded border px-2 py-1 disabled:opacity-40" @click="navigate(page + 1)">›</button><button aria-label="Last page" :disabled="generating || page >= total" class="rounded border px-2 py-1 disabled:opacity-40" @click="navigate(total)">»</button>
      </div>
      <label class="text-xs">Zoom <select v-model="zoom" class="ml-2 rounded border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"><option value="fit">Fit width</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label>
    </div>
    <p v-if="error" role="alert" class="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{{ error }} <button class="font-semibold underline" @click="generate">Retry</button></p>
    <p v-if="generating" role="status" class="p-8 text-center text-sm text-slate-500">Preparing paginated report…</p>
    <div ref="viewport" class="max-h-[80vh] min-h-48 overflow-auto bg-slate-200/60 p-4 dark:bg-slate-950" :aria-busy="generating || rendering">
      <canvas v-show="total && !generating" ref="canvas" aria-hidden="true" class="mx-auto bg-white shadow-md" />
      <div class="sr-only" role="document" :aria-label="`Report page ${page} of ${total}`">{{ pageText }}</div>
    </div>
    <p class="p-3 text-xs text-slate-500">Print and exports include all filtered records in the selected appearance. Printing opens your browser’s print dialog. PDF matches this preview; Excel and Word paginate in their respective applications.</p>
  </section>
</template>
