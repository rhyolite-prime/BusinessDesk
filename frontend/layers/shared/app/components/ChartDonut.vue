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
const innerRadius = computed(() => `${Math.max(10, 88 - (props.thickness / props.size) * 200)}%`)
const option = computed<EChartsOption>(() => ({
  animationDuration: 450,
  tooltip: {
    trigger: 'item',
    formatter: (params) => {
      const item = (Array.isArray(params) ? params[0] : params) as { name?: string; value?: string | number; percent?: number } | undefined
      if (!item) return ''
      return `${String(item.name ?? '')}: ${Number(item.value ?? 0).toLocaleString()} (${Number(item.percent ?? 0).toFixed(1)}%)`
    },
  },
  series: [{
    type: 'pie',
    radius: [innerRadius.value, '88%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: true,
    label: { show: false },
    labelLine: { show: false },
    emphasis: { scale: true, scaleSize: 5 },
    data: props.segments.map((segment) => ({
      name: segment.label,
      value: segment.value,
      itemStyle: { color: segment.color, borderColor: 'var(--surface, #ffffff)', borderWidth: 2 },
    })),
  }],
}))
</script>

<template>
  <div class="flex flex-wrap items-center gap-5">
    <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
      <SharedEChart :option="option" :width="size" :height="size" aria-label="Donut chart" />
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        <span v-if="centerValue" class="text-[19px] font-bold leading-tight text-ink">{{ centerValue }}</span>
        <span v-if="centerLabel" class="mt-1 text-[10.5px] text-ink-faint">{{ centerLabel }}</span>
      </div>
    </div>
    <ul class="min-w-0 space-y-2">
      <li v-for="segment in segments" :key="segment.label" class="flex items-center gap-2.5 text-xs">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: segment.color }" />
        <span class="truncate text-ink-soft">{{ segment.label }}</span>
        <span class="tnum ml-auto pl-3 font-semibold text-ink">{{ segment.value.toLocaleString() }}</span>
        <span class="tnum w-12 text-right text-ink-faint">{{ total ? ((segment.value / total) * 100).toFixed(0) : 0 }}%</span>
      </li>
    </ul>
  </div>
</template>
