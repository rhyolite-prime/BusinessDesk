<script setup lang="ts">
import type { ECharts } from 'echarts/core'
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  option: EChartsOption
  height?: string | number
  ariaLabel?: string
}>(), {
  height: '180px',
  ariaLabel: 'Data chart',
})

const element = ref<HTMLDivElement | null>(null)
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
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div
    ref="element"
    class="w-full min-w-0"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    role="img"
    aria-roledescription="chart"
    :aria-label="ariaLabel"
  />
</template>
