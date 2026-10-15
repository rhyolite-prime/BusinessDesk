<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  labels: string[]
  series: { name: string; color: string; values: number[] }[]
  height?: number
  format?: (value: number) => string
}>(), { height: 200 })

const option = computed<EChartsOption>(() => ({
  animationDuration: 350,
  grid: { top: 10, right: 12, bottom: 28, left: 42, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    confine: true,
    formatter: (items: any) => {
      const rows = Array.isArray(items) ? items : [items]
      return rows.map((item: any) => {
        const value = Number(item.value ?? 0)
        return `${item.marker ?? ''}${item.seriesName}: <strong>${props.format ? props.format(value) : value.toLocaleString()}</strong>`
      }).join('<br/>')
    },
  },
  xAxis: {
    type: 'category',
    data: props.labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#e5e9f0' } },
    axisLabel: { color: '#64748b', fontSize: 10, interval: props.labels.length > 8 ? 'auto' : 0 },
  },
  yAxis: {
    type: 'value',
    min: 0,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#64748b',
      fontSize: 10,
      formatter: (value: number) => props.format ? props.format(value) : value.toLocaleString(),
    },
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.22)', type: 'dashed' } },
  },
  series: props.series.map((item) => ({
    type: 'bar',
    name: item.name,
    data: item.values,
    barMaxWidth: 26,
    itemStyle: { color: item.color, borderRadius: [4, 4, 0, 0] },
    emphasis: { focus: 'series' },
  })),
}))

const chartLabel = computed(() => `Bar chart comparing ${props.series.map((item) => item.name).join(', ')} across ${props.labels.length} categories`)
</script>

<template>
  <div>
    <SharedEChart :option="option" :height="height" :aria-label="chartLabel" />
    <div v-if="series.length > 1" class="mt-3 flex items-center justify-center gap-4">
      <span v-for="item in series" :key="item.name" class="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: item.color }" />{{ item.name }}
      </span>
    </div>
  </div>
</template>
