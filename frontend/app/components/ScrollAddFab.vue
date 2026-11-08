<script setup lang="ts">
import { Plus } from '@lucide/vue'

const props = defineProps<{
  target: HTMLElement | null
  label: string
  disabled?: boolean
  hidden?: boolean
}>()
defineEmits<{ click: [] }>()
const scrolledPast = ref(false)
let observer: IntersectionObserver | undefined
let stopWatching: (() => void) | undefined
onMounted(() => {
  stopWatching = watch(() => props.target, target => {
    observer?.disconnect()
    scrolledPast.value = false
    if (!target) return
    observer = new IntersectionObserver(([entry]) => {
      // Do not show a duplicate action when the original is still below the viewport.
      scrolledPast.value = !!entry && !entry.isIntersecting && entry.boundingClientRect.bottom <= 0
    })
    observer.observe(target)
  }, { immediate: true, flush: 'post' })
})
onBeforeUnmount(() => {
  stopWatching?.()
  observer?.disconnect()
})
</script>

<template>
  <Teleport v-if="scrolledPast && !hidden" to="body">
    <button type="button" :aria-label="label" :title="label" :disabled="disabled"
      class="fixed right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg ring-1 ring-black/5 hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50 sm:right-8"
      style="bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))" @click="$emit('click')">
      <Plus :size="24" aria-hidden="true" />
    </button>
  </Teleport>
</template>
