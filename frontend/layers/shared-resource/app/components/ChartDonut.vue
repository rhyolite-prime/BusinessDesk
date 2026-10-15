<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  segments: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}>(), { size: 180, thickness: 22 })

const total = computed(() => props.segments.reduce((sum, segment) => sum + segment.value, 0))
const outerRadius = 96
const innerRadius = computed(() => Math.max(40, outerRadius * (props.size - props.thickness) / props.size))
const centerInset = computed(() => `${(100 - innerRadius.value) / 2}%`)

const option = computed<EChartsOption>(() => {
  const segments = props.segments
    .filter((segment) => segment.value > 0)
    .map((segment) => ({
      name: segment.label,
      value: segment.value,
      itemStyle: { color: segment.color },
    }))

  return {
    animationDuration: 350,
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: any) => `${params.name}<br/><strong>${Number(params.value).toLocaleString()}</strong> (${params.percent}%)`,
    },
    series: [{
      type: 'pie',
      radius: [`${innerRadius.value}%`, `${outerRadius}%`],
      center: ['50%', '50%'],
      padAngle: 1.5,
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderColor: 'transparent', borderWidth: 2, borderRadius: 3 },
      emphasis: { scale: true, scaleSize: 4 },
      data: segments.length ? segments : [{ name: 'No data', value: 1, itemStyle: { color: '#cbd5e1' } }],
    }],
  }
})

const chartLabel = computed(() => `Donut chart of ${props.segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}`)
</script>

<template>
  <div class="flex flex-wrap items-center gap-5">
    <div class="relative flex shrink-0 items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
      <SharedEChart class="absolute inset-0" :option="option" :height="size" :aria-label="chartLabel" />
      <div
        class="pointer-events-none absolute flex flex-col items-center justify-center rounded-full bg-surface text-center"
        :style="{ inset: centerInset }"
      >
        <span v-if="centerValue" class="text-lg font-bold leading-tight text-ink tnum">{{ centerValue }}</span>
        <span v-if="centerLabel" class="mt-0.5 text-[10px] text-ink-faint">{{ centerLabel }}</span>
      </div>
    </div>
    <ul class="min-w-0 flex-1 space-y-2">
      <li v-for="segment in segments" :key="segment.label" class="flex items-center gap-2.5 text-xs">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: segment.color }" />
        <span class="truncate text-ink-soft">{{ segment.label }}</span>
        <span class="ml-auto pl-3 font-semibold text-ink tnum">{{ segment.value.toLocaleString() }}</span>
        <span class="w-12 text-right text-ink-faint tnum">{{ total ? ((segment.value / total) * 100).toFixed(0) : 0 }}%</span>
      </li>
    </ul>
  </div>
</template>
