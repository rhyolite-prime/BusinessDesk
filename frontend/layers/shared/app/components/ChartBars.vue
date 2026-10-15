<script setup lang="ts">
const props = withDefaults(defineProps<{
  labels: string[]
  series: { name: string; color: string; values: number[] }[]
  height?: number
  format?: (n: number) => string
}>(), { height: 200 })

const W = 640
const padY = 14
const max = computed(() => Math.max(1, ...props.series.flatMap(s => s.values)) * 1.1)
const groupW = W / Math.max(1, props.labels.length)
const barW = computed(() => Math.min(26, (groupW * 0.66) / props.series.length))
const h = (v: number) => (v / max.value) * (props.height - padY * 2)
const fmt = (n: number) => props.format ? props.format(n) : n.toLocaleString()
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${W} ${height}`" class="w-full" :style="{ height: `${height}px` }" preserveAspectRatio="none">
      <g v-for="g in 4" :key="g">
        <line x1="0" :x2="W" :y1="padY + ((height - padY * 2) / 4) * (g - 1)" :y2="padY + ((height - padY * 2) / 4) * (g - 1)" stroke="#E5E9F0" stroke-dasharray="3 4" />
      </g>
      <g v-for="(label, li) in labels" :key="label">
        <g v-for="(s, si) in series" :key="s.name">
          <rect
            :x="groupW * li + groupW / 2 - (series.length * barW) / 2 + si * barW + 2"
            :y="height - padY - h(s.values[li] ?? 0)"
            :width="barW - 4"
            :height="Math.max(0, h(s.values[li] ?? 0))"
            :fill="s.color" rx="3"
          >
            <title>{{ label }} · {{ s.name }}: {{ fmt(s.values[li] ?? 0) }}</title>
          </rect>
        </g>
      </g>
    </svg>
    <div class="flex justify-between px-1 mt-1">
      <span v-for="(l, i) in labels" :key="i" class="text-[10px] text-ink-faint"
        :class="labels.length > 8 && i % 2 ? 'hidden sm:inline' : ''">{{ l }}</span>
    </div>
    <div v-if="series.length > 1" class="flex items-center gap-4 mt-3 justify-center">
      <span v-for="s in series" :key="s.name" class="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
        <span class="w-2.5 h-2.5 rounded-full" :style="{ background: s.color }" />{{ s.name }}
      </span>
    </div>
  </div>
</template>
