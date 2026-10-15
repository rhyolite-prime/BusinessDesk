<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  labels: string[]
  series: { name: string; color: string; points: number[] }[]
  height?: number
  format?: (value: number) => string
}>(), { height: 220 })

const option = computed<EChartsOption>(() => ({
  animationDuration: 350,
  grid: { top: 14, right: 16, bottom: 28, left: 48, containLabel: true },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'line' },
    confine: true,
    formatter: (items: any) => {
      const rows = Array.isArray(items) ? items : [items]
      const heading = rows[0]?.axisValueLabel ?? ''
      const values = rows.map((item: any) => {
        const value = Number(item.value ?? 0)
        return `${item.marker ?? ''}${item.seriesName}: <strong>${props.format ? props.format(value) : value.toLocaleString()}</strong>`
      })
      return [heading, ...values].join('<br/>')
    },
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.labels,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#e5e9f0' } },
    axisLabel: { color: '#64748b', fontSize: 10, interval: props.labels.length > 8 ? 'auto' : 0 },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#64748b',
      fontSize: 10,
      formatter: (value: number) => props.format ? props.format(value) : value.toLocaleString(),
    },
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.22)', type: 'dashed' } },
  },
  series: props.series.map((item, index) => ({
    type: 'line',
    name: item.name,
    data: item.points,
    smooth: true,
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 5,
    lineStyle: { color: item.color, width: 2.2, cap: 'round' },
    itemStyle: { color: item.color },
    areaStyle: index === 0 ? { opacity: 0.12 } : undefined,
    emphasis: { focus: 'series' },
  })),
}))

const chartLabel = computed(() => `Line chart comparing ${props.series.map((item) => item.name).join(', ')} across ${props.labels.length} periods`)
</script>

<template>
  <div>
    <SharedEChart :option="option" :height="height" :aria-label="chartLabel" />
    <div class="mt-3 flex items-center justify-center gap-4">
      <span v-for="item in series" :key="item.name" class="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: item.color }" />{{ item.name }}
      </span>
    </div>
  </div>
</template>
