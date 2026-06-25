<script setup lang="ts">
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface BaseChartProps {
  option: echarts.EChartsOption
  height?: number | string
  loading?: boolean
  autoresize?: boolean
}

const props = withDefaults(defineProps<BaseChartProps>(), {
  height: 320,
  loading: false,
  autoresize: true
})

const containerRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const chartStyle = computed(() => ({
  height: typeof props.height === 'number' ? `${props.height}px` : props.height
}))

function resizeChart(): void {
  chart?.resize()
}

function applyLoadingState(): void {
  if (!chart) {
    return
  }

  if (props.loading) {
    chart.showLoading()
  } else {
    chart.hideLoading()
  }
}

onMounted(() => {
  if (!containerRef.value) {
    return
  }

  chart = echarts.init(containerRef.value)
  chart.setOption(props.option, true)
  applyLoadingState()

  if (props.autoresize !== false) {
    window.addEventListener('resize', resizeChart)
  }
})

watch(
  () => props.option,
  (option) => {
    chart?.setOption(option, true)
  },
  { deep: true }
)

watch(
  () => props.loading,
  () => applyLoadingState()
)

onBeforeUnmount(() => {
  if (props.autoresize !== false) {
    window.removeEventListener('resize', resizeChart)
  }

  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="containerRef" class="base-chart" :style="chartStyle" />
</template>

<style scoped>
.base-chart {
  width: 100%;
  min-height: 180px;
}
</style>
