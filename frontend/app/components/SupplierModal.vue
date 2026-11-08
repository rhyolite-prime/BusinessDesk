<script setup lang="ts">
const props = defineProps<{ title: string; busy?: boolean; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement>(),
  titleId = useId()
let previous: HTMLElement | null = null
function close() {
  if (!props.busy) emit('close')
}
function keyboard(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
  if (e.key !== 'Tab' || !panel.value) return
  const all = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ),
  ).filter((el) => el.getClientRects().length)
  const first = all[0],
    last = all.at(-1)
  if (!first) {
    e.preventDefault()
    return
  }
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last?.focus()
  }
  if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
onMounted(async () => {
  previous = document.activeElement as HTMLElement
  await nextTick()
  panel.value
    ?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)')
    ?.focus()
})
onUnmounted(() => {
  if (previous?.isConnected) previous.focus()
})
</script>
<template>
  <Teleport to="body"
    ><div
      class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      @keydown="keyboard"
      @click.self="close"
    >
      <section
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-busy="busy"
        class="max-h-[92vh] w-full overflow-auto rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
        :class="wide ? 'max-w-4xl' : 'max-w-lg'"
      >
        <header class="mb-5 flex items-center justify-between gap-4">
          <h2 :id="titleId" class="text-lg font-semibold text-ink">
            {{ title }}
          </h2>
          <BaseButton
            variant="ghost"
            size="sm"
            :disabled="busy"
            aria-label="Close dialog"
            @click="close"
            ><AppIcon name="x-mark" :size="18"
          /></BaseButton>
        </header>
        <slot />
      </section></div
  ></Teleport>
</template>
