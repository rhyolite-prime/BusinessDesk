<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  labels: string[]
  series: { name: string; color: string; points: number[] }[]
  height?: number
  format?: (value: number) => string
}>(), { height: 220 })

const formatValue = (value: number) => props.format ? props.format(value) : value.toLocaleString()
const option = computed<EChartsOption>(() => ({
  animationDuration: 450,
  grid: { left: 8, right: 12, top: 18, bottom: props.labels.length > 8 ? 30 : 24, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'line' },
    formatter: (entries) => {
      const points = Array.isArray(entries) ? entries : [entries]
      const firstPoint = points[0] as { axisValueLabel?: string; axisValue?: string | number } | undefined
      const heading = String(firstPoint?.axisValueLabel ?? firstPoint?.axisValue ?? '')
      const values = points.map((point) => `${String(point.seriesName)}: ${formatValue(Number(point.value ?? 0))}`)
      return [heading, ...values].join('<br/>')
    },
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#E5E9F0' } },
    axisLabel: { color: '#8792A2', hideOverlap: true },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#8792A2', formatter: (value: number) => formatValue(value) },
    splitLine: { lineStyle: { color: '#E5E9F0', type: 'dashed' } },
  },
  series: props.series.map((item) => ({
    name: item.name,
    type: 'line',
    smooth: true,
    showSymbol: true,
    symbolSize: 5,
    data: item.points,
    lineStyle: { color: item.color, width: 2.2 },
    itemStyle: { color: item.color },
    areaStyle: props.series[0] === item ? { color: item.color, opacity: 0.1 } : undefined,
  })),
}))
</script>

<template>
  <div>
    <SharedEChart :option="option" :height="height" aria-label="Line chart" />
    <div v-if="series.length > 1" class="mt-3 flex flex-wrap items-center justify-center gap-4">
      <span v-for="item in series" :key="item.name" class="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: item.color }" />{{ item.name }}
      </span>
    </div>
  </div>
</template>
