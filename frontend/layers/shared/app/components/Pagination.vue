<script setup lang="ts">
const props = defineProps<{ page: number; size: number; total: number }>()
const emit = defineEmits<{ 'update:page': [v: number] }>()
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.size)))
const from = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.size + 1)
const to = computed(() => Math.min(props.total, props.page * props.size))

const pages = computed(() => {
  const t = totalPages.value; const c = props.page
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const set = new Set([1, 2, t - 1, t, c - 1, c, c + 1].filter(p => p >= 1 && p <= t))
  return [...set].sort((a, b) => a - b)
})
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-ink-faint">
    <span>
      Showing <strong class="text-ink-soft tnum">{{ from }}–{{ to }}</strong> of
      <strong class="text-ink-soft tnum">{{ total.toLocaleString() }}</strong> records
    </span>
    <div class="flex items-center gap-1">
      <button class="px-2 py-1 rounded-md hover:bg-canvas disabled:opacity-40" :disabled="page <= 1"
        @click="emit('update:page', page - 1)"><AppIcon name="chevron-down" :size="14" class="rotate-90" /></button>
      <template v-for="(p, i) in pages" :key="p">
        <span v-if="i > 0 && pages[i - 1] !== p - 1" class="px-1 text-ink-faint">…</span>
        <button class="min-w-8 px-2 py-1 rounded-md font-medium transition-colors"
          :class="p === page ? 'bg-primary text-on-primary' : 'hover:bg-canvas text-ink-soft'"
          @click="emit('update:page', p)">{{ p }}</button>
      </template>
      <button class="px-2 py-1 rounded-md hover:bg-canvas disabled:opacity-40" :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"><AppIcon name="chevron-down" :size="14" class="-rotate-90" /></button>
    </div>
  </div>
</template>
