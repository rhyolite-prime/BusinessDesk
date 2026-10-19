<script setup lang="ts">
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  option: EChartsOption
  width?: string | number
  height?: string | number
  ariaLabel?: string
}>(), {
  width: '100%',
  height: '180px',
  ariaLabel: 'Data chart',
})

const element = shallowRef<HTMLDivElement | null>(null)
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let echartsCorePromise: Promise<typeof import('echarts/core')> | null = null

function loadEChartsCore() {
  if (!echartsCorePromise) {
    echartsCorePromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.BarChart,
        charts.LineChart,
        charts.PieChart,
        components.GridComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ])
      return core
    })
  }
  return echartsCorePromise
}

function resizeChart() {
  chart?.resize()
}

onMounted(() => {
  void loadEChartsCore().then(({ init }) => {
    if (!element.value) return
    chart = init(element.value, undefined, { renderer: 'canvas' })
    chart.setOption(props.option, { notMerge: true })

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resizeChart)
      resizeObserver.observe(element.value)
    } else {
      window.addEventListener('resize', resizeChart)
    }
  }).catch((error: unknown) => {
    console.error('Unable to initialize the Apache ECharts visualization.', error)
  })
})

watch(() => props.option, (option) => {
  chart?.setOption(option, { notMerge: true, lazyUpdate: true })
}, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (import.meta.client) window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div
    ref="element"
    class="min-w-0"
    :style="{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }"
    role="img"
    aria-roledescription="chart"
    :aria-label="ariaLabel"
  />
</template>
