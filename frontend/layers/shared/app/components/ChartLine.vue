<script setup lang="ts">
const props = withDefaults(defineProps<{
  labels: string[]
  series: { name: string; color: string; points: number[] }[]
  height?: number
  format?: (n: number) => string
}>(), { height: 220 })

const W = 640
const H = computed(() => props.height)
const padX = 8
const padY = 16

const max = computed(() => {
  const m = Math.max(1, ...props.series.flatMap(s => s.points))
  return m * 1.12
})

const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, props.labels.length - 1)
const y = (v: number) => padY + (1 - v / max.value) * (H.value - padY * 2)

function pathFor(points: number[]) {
  return points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
}
function areaFor(points: number[]) {
  return `${pathFor(points)} L ${x(points.length - 1).toFixed(1)} ${H.value - padY} L ${x(0).toFixed(1)} ${H.value - padY} Z`
}
const fmt = (n: number) => props.format ? props.format(n) : n.toLocaleString()
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" preserveAspectRatio="none" :style="{ height: H + 'px' }">
      <defs>
        <linearGradient v-for="(s, i) in series" :id="`lg-${i}`" :key="i" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="s.color" stop-opacity="0.18" />
          <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g v-for="g in 4" :key="g">
        <line :x1="padX" :x2="W - padX" :y1="padY + ((H - padY * 2) / 4) * (g - 1)" :y2="padY + ((H - padY * 2) / 4) * (g - 1)" stroke="#E5E9F0" stroke-dasharray="3 4" />
      </g>
      <template v-for="(s, i) in series" :key="s.name">
        <path v-if="i === 0" :d="areaFor(s.points)" :fill="'url(#lg-' + i + ')'" />
        <path :d="pathFor(s.points)" fill="none" :stroke="s.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(v, ci) in s.points" :key="ci" :cx="x(ci)" :cy="y(v)" r="3" :fill="s.color">
          <title>{{ labels[ci] }} · {{ s.name }}: {{ fmt(v) }}</title>
        </circle>
      </template>
    </svg>
    <div class="flex justify-between px-1 mt-1">
      <span v-for="(l, i) in labels" :key="i" class="text-[10px] text-ink-faint"
        :class="labels.length > 8 && i % 2 ? 'hidden sm:inline' : ''">{{ l }}</span>
    </div>
    <div class="flex items-center gap-4 mt-3 justify-center">
      <span v-for="s in series" :key="s.name" class="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
        <span class="w-2.5 h-2.5 rounded-full" :style="{ background: s.color }" />{{ s.name }}
      </span>
    </div>
  </div>
</template>
