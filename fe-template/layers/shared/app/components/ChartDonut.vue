<script setup lang="ts">
const props = withDefaults(defineProps<{
  segments: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}>(), { size: 180, thickness: 22 })

const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0))

const arcs = computed(() => {
  let angle = -Math.PI / 2
  const r = (props.size - props.thickness) / 2
  const cx = props.size / 2
  return props.segments.filter(s => s.value > 0).map(s => {
    const frac = total.value ? s.value / total.value : 0
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    const large = frac > 0.5 ? 1 : 0
    const p = (a: number) => [cx + r * Math.cos(a), cx + r * Math.sin(a)]
    const [x0, y0] = p(a0); const [x1, y1] = p(a1 - 0.004)
    return { d: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`, color: s.color, label: s.label, value: s.value, frac }
  })
})
</script>

<template>
  <div class="flex items-center gap-5 flex-wrap">
    <svg :width="size" :height="size" class="shrink-0 -rotate-0">
      <circle :cx="size / 2" :cy="size / 2" :r="(size - thickness) / 2" fill="none" stroke="#EEF1F6" :stroke-width="thickness" />
      <path v-for="(a, i) in arcs" :key="i" :d="a.d" fill="none" :stroke="a.color"
        :stroke-width="thickness" stroke-linecap="butt">
        <title>{{ a.label }}: {{ a.value }} ({{ (a.frac * 100).toFixed(1) }}%)</title>
      </path>
      <text v-if="centerValue" :x="size / 2" :y="size / 2 - 2" text-anchor="middle" class="fill-ink"
        style="font-size: 19px; font-weight: 700;">{{ centerValue }}</text>
      <text v-if="centerLabel" :x="size / 2" :y="size / 2 + 18" text-anchor="middle" class="fill-ink-faint"
        style="font-size: 10.5px;">{{ centerLabel }}</text>
    </svg>
    <ul class="space-y-2 min-w-0">
      <li v-for="s in segments" :key="s.label" class="flex items-center gap-2.5 text-xs">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: s.color }" />
        <span class="text-ink-soft truncate">{{ s.label }}</span>
        <span class="font-semibold text-ink tnum ml-auto pl-3">{{ s.value.toLocaleString() }}</span>
        <span class="text-ink-faint tnum w-12 text-right">{{ total ? ((s.value / total) * 100).toFixed(0) : 0 }}%</span>
      </li>
    </ul>
  </div>
</template>
