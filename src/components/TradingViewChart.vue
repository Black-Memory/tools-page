<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="chart-card-title d-flex align-center justify-space-between">
      <div class="d-flex align-center chart-title-info">
        <v-icon class="mr-2 chart-icon">mdi-chart-box</v-icon>
        <span class="chart-title-text">{{ symbol }} ({{ period }})</span>
      </div>
      <div class="chart-toolbar">
        <v-btn v-if="profitCurveData && profitCurveData.length > 0" icon="mdi-chart-bell-curve" size="small"
          variant="text" @click="toggleProfitCurve" :color="profitCurveStudy ? 'primary' : 'default'" title="收益曲线" />
        <v-btn icon="mdi-cog" size="small" variant="text" @click="openSettings" title="图表设置" />
        <v-btn icon="mdi-chart-line" size="small" variant="text" @click="openIndicators" title="技术指标" />
      </div>
    </v-card-title>
    <v-card-text>
      <!-- TradingView 图表组件区域 -->
      <div class="chart-container">
        <div id="tradingview_widget" ref="chartContainer" class="tradingview-chart" :style="{ height: chartHeight }">
          <!-- 图表加载状态 -->
          <div v-if="chartLoading" class="chart-loading d-flex flex-column align-center justify-center">
            <v-progress-circular indeterminate color="primary" size="32" class="mb-2" />
            <p class="text-body-2 text-medium-emphasis">正在加载TradingView图表...</p>
          </div>
          <!-- 图表错误状态 -->
          <div v-else-if="chartError" class="chart-error d-flex flex-column align-center justify-center">
            <v-icon size="48" color="error">mdi-alert-circle</v-icon>
            <h4 class="text-h6 mt-2 text-error">图表加载失败</h4>
            <p class="text-body-2 text-medium-emphasis mt-1">{{ chartError }}</p>
            <v-btn color="primary" variant="outlined" size="small" @click="initChart" class="mt-2">
              重新加载
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { createChartConfig, CustomDatafeed, getChartData, saveChartData } from '@/utils/chartUtil'

interface Props {
  chartId?: string  // 可选图表ID，用于区分不同图表实例
  symbol: string
  period: string
  profitCurveData?: Array<{
    time: number
    value: number
  }>
  showProfitCurve?: boolean
}

const props = defineProps<Props>()

// 图表相关状态
const chartContainer = ref<HTMLElement>()
const chartLoading = ref(false)
const chartError = ref<string>('')
const tvWidget = ref<any>(null)
const chartHeight = ref('50vh')
const profitCurveStudy = ref<any>(null)

// 监听props变化，重新初始化图表
watch(() => [props.symbol, props.period], () => {
  if (props.symbol && props.period) {
    initChart()
  }
}, { immediate: false })

// 监听收益曲线数据变化
watch(() => props.profitCurveData, (newData) => {
  if (newData && newData.length > 0) {
    prepareProfitDataGlobal(newData)

    // 如果图表已就绪且没有收益曲线指标，自动添加
    if (tvWidget.value && !profitCurveStudy.value) {
      setTimeout(() => {
        addProfitCurveStudy()
      }, 500)
    }
  } else {
    // 如果数据被清空，移除收益曲线指标
    if (profitCurveStudy.value) {
      removeProfitCurveStudy()
    }
  }
}, { deep: true })

// 监听收益曲线显示状态（用于手动切换）
watch(() => props.showProfitCurve, (show) => {
  if (tvWidget.value && props.profitCurveData && props.profitCurveData.length > 0) {
    if (show && !profitCurveStudy.value) {
      addProfitCurveStudy()
    } else if (!show && profitCurveStudy.value) {
      removeProfitCurveStudy()
    }
  }
})

// 准备收益数据到全局供 Datafeed 使用
const prepareProfitDataGlobal = (profitData: Array<{ time: number; value: number }>) => {
  if (!profitData || profitData.length === 0) return

  // 转换为 TradingView 所需的 OHLC 格式
  const bars = profitData.map(point => ({
    time: point.time, // 保持毫秒时间戳
    open: point.value,
    high: point.value,
    low: point.value,
    close: point.value,
    volume: 0
  }));

  // 存储到全局供 Datafeed 读取
  (window as any).myGlobalEquityData = bars
  console.log('收益曲线数据已准备，共', bars.length, '个数据点')
}







const initChart = async () => {
  if (!props.symbol || !chartContainer.value) return

  try {
    chartLoading.value = true
    chartError.value = ''

    // 清理现有图表
    if (tvWidget.value) {
      tvWidget.value.remove()
      tvWidget.value = null
    }

    // 清理容器内容
    chartContainer.value.innerHTML = ''

    // 加载TradingView Charting Library
    await loadTradingViewLibrary()

    // 创建TradingView widget
    await createTradingViewChart()

  } catch (error) {
    console.error('初始化图表失败:', error)
    chartError.value = '图表初始化失败: ' + (error as Error).message
  } finally {
    chartLoading.value = false
  }
}

const loadTradingViewLibrary = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if ((window as any).TradingView && (window as any).TradingView.widget) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = '/charting_library/charting_library.standalone.js'
    script.async = true
    script.onload = () => {
      // 等待库完全加载
      const checkLibrary = () => {
        if ((window as any).TradingView && (window as any).TradingView.widget) {
          resolve()
        } else {
          setTimeout(checkLibrary, 100)
        }
      }
      checkLibrary()
    }
    script.onerror = () => reject(new Error('TradingView库加载失败'))
    document.head.appendChild(script)
  })
}



const createTradingViewChart = async (): Promise<void> => {
  if (!props.symbol || !chartContainer.value) return
  // 创建图表配置
  const widgetOptions: any = createChartConfig(props.symbol, props.period, chartContainer.value)

  // 添加自定义指标支持
  widgetOptions.custom_indicators_getter = function (PineJS: any) {
    return Promise.resolve([
      {
        name: "收益率",
        metainfo: {
          _metainfoVersion: 51,
          id: "equitycurve@tv-basicstudies-1",
          description: "收益率",
          shortDescription: "收益率",
          is_price_study: false,
          isCustomIndicator: true,
          inputs: [
            { id: "in_1", name: "Symbol", type: "symbol", defval: "MY_EQUITY" }
          ],
          plots: [{ id: "plot_0", type: "line" }],
          defaults: {
            styles: {
              plot_0: { linestyle: 0, linewidth: 2, plottype: 0, color: "#2196F3" }
            }
          },
          styles: {
            plot_0: {
              title: 'Equity value',
            }
          },
          format: {
            type: 'price',
            precision: 4,
          },
        },
        constructor: function (this: any) {
          this.init = function (context: any, inputCallback: any) {
            this._context = context;
            this._input = inputCallback;

            const symbolName = 'MY_EQUITY';
            const period = PineJS.Std.period(context);
            context.new_sym(symbolName, period);
          };

          this.main = function (context: any, inputCallback: any) {
            this._context = context;
            this._input = inputCallback;

            context.select_sym(1);

            const equityValue = PineJS.Std.close(this._context);
            return [equityValue];
          };
        }
      }
    ])
  }

  let lastData = getChartData(props.chartId as string)
  if (lastData) {
    //加载上次保存的图表配置
    widgetOptions.saved_data = lastData
  }


  try {
    const TradingView = (window as any).TradingView

    tvWidget.value = new TradingView.widget(widgetOptions)


    tvWidget.value.onChartReady(() => {
      console.log('TradingView图表已就绪')

    })


    tvWidget.value.subscribe("onAutoSaveNeeded", function (study: any, data: any) {
      console.log('图表自动保存触发')
      tvWidget.value.save((data: any) => {

        //检查配置，叠加的数据要删除
        let pannels = data.charts[0].panes;
        if (pannels.length > 1) {
          //筛选pannel是中study中shortId=equitycurve
          let index = pannels.findIndex((pannel: any) => {
            const source = pannel.sources[0]
            if (source?.metaInfo?.shortId === "equitycurve") {
              return true
            }
            return false
          })
          pannels.splice(index, 1);
        }
        //保存新配置
        saveChartData(props.chartId as string, data);
        return
      });

    })



  } catch (error) {
    console.error('创建TradingView图表失败:', error)
    throw error
  }
}

const openSettings = () => {
  if (tvWidget.value) {
    try {
      // 打开TradingView内置的图表设置面板
      tvWidget.value.chart().executeActionById('chartProperties')
    } catch (error) {
      console.warn('打开设置面板失败:', error)
    }
  }
}

const openIndicators = () => {
  if (tvWidget.value) {
    try {
      // 打开TradingView内置的指标选择面板
      tvWidget.value.chart().executeActionById('insertIndicator')
    } catch (error) {
      console.warn('打开指标面板失败:', error)
    }
  }
}

// 添加收益曲线指标
const addProfitCurveStudy = async () => {
  if (!tvWidget.value || profitCurveStudy.value) return

  try {
    const chart = tvWidget.value.chart()

    // 使用小写指标名称创建指标
    const studyId = await chart.createStudy('收益率', false, false, ['MY_EQUITY'])

    if (studyId) {
      profitCurveStudy.value = studyId
      console.log('收益曲线指标创建成功，ID:', studyId)
    }
  } catch (error) {
    console.error('创建收益曲线指标失败:', error)
  }
}

// 移除收益曲线指标
const removeProfitCurveStudy = () => {
  if (!tvWidget.value || !profitCurveStudy.value) return

  try {
    const chart = tvWidget.value.chart()
    chart.removeEntity(profitCurveStudy.value)
    profitCurveStudy.value = null
    console.log('收益曲线指标已移除')
  } catch (error) {
    console.error('移除收益曲线指标失败:', error)
  }
}

// 切换收益曲线显示
const toggleProfitCurve = () => {
  if (!props.profitCurveData || props.profitCurveData.length === 0) {
    console.warn('没有收益曲线数据')
    return
  }

  if (profitCurveStudy.value) {
    removeProfitCurveStudy()
  } else {
    addProfitCurveStudy()
  }
}

// 暴露方法给父组件
defineExpose({
  initChart,
  addProfitCurveStudy,
  removeProfitCurveStudy,
  toggleProfitCurve
})

onMounted(async () => {
  if (props.symbol && props.period && chartContainer.value) {
    await nextTick()
    initChart()
  }
})
onUnmounted(() => {

  // 清理TradingView图表
  if (tvWidget.value) {
    tvWidget.value.remove()
    tvWidget.value = null
  }

  // 清理图表容器
  if (chartContainer.value) {
    chartContainer.value.innerHTML = ''
  }


  // (window as any).myGlobalEquityData = null

})
</script>

<style scoped>
.chart-container {
  width: 100%;
  position: relative;
  min-height: 300px;
}

.tradingview-chart {
  width: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.chart-loading,
.chart-error {
  height: 100%;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
}

/* 图表工具栏样式 */
.chart-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* TradingView Widget 样式 */
.tradingview-widget-container {
  width: 100%;
  height: 100%;
}

.tradingview-widget-copyright {
  font-size: 13px !important;
  line-height: 32px;
  text-align: center;
  vertical-align: middle;
  font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
  color: #9db2bd;
}

.tradingview-widget-copyright .blue-text {
  color: #2962FF;
  text-decoration: none;
}
</style>
