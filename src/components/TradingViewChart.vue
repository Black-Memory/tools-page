<template>
  <v-card elevation="2" class="mb-4">
    <v-card-title class="chart-card-title d-flex align-center justify-space-between">
      <div class="d-flex align-center chart-title-info">
        <v-icon class="mr-2 chart-icon">mdi-chart-box</v-icon>
        <span class="chart-title-text">{{ currentSymbol }}</span>

        <!-- 周期切换 -->
        <div class="ml-4" v-if="availablePeriods.length > 1">
          <v-btn-toggle v-model="currentPeriod" mandatory density="compact" variant="outlined" color="primary" divided>
            <v-btn v-for="p in availablePeriods" :key="p" :value="p" size="small">
              {{ p }}
            </v-btn>
          </v-btn-toggle>
        </div>
        <span v-else class="ml-2 text-body-2 text-medium-emphasis">({{ currentPeriod }})</span>
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
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { createChartConfig, CustomDatafeed, getChartData, saveChartData, mapPeriodToTradingViewInterval } from '@/utils/chartUtil'

interface Props {
  chartId?: string  // 可选图表ID，用于区分不同图表实例
  symbol: string  //传入的symbol可能存在多个，用","分隔
  period: string  //传入的period可能存在多个，用","分隔
  profitCurveData?: Array<{
    time: number
    value: number
  }>
  tradeHistoryData?: Array<{
    time: number
    price: number
    quantity: number
    profit: number
    side: 'openLong' | 'openShort' | 'closeLong' | 'closeShort'
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

// 解析后的当前状态
const currentSymbol = ref('')
const currentPeriod = ref('')

// 可选周期列表
const availablePeriods = computed(() => {
  return props.period ? props.period.split(',').filter(p => p.trim()) : []
})

// 监听 props 变化，初始化或更新 currentSymbol 和 currentPeriod
watch(() => props.symbol, (newVal) => {
  if (newVal) {
    const symbols = newVal.split(',')
    // 默认取第一个 symbol
    if (symbols.length > 0) {
      currentSymbol.value = symbols[0]!.trim()
    }
  }
}, { immediate: true })

watch(() => props.period, (newVal) => {
  if (newVal) {
    const periods = newVal.split(',')
    // 如果当前周期为空，或者不在新的周期列表中，则重置为第一个
    if (periods.length > 0) {
      const firstPeriod = periods[0]!.trim()
      if (!currentPeriod.value || !periods.map(p => p.trim()).includes(currentPeriod.value)) {
        currentPeriod.value = firstPeriod
      }
    }
  }
}, { immediate: true })

// 监听 currentSymbol 和 currentPeriod 变化来驱动图表更新
watch([currentSymbol, currentPeriod], ([newSym, newPeriod], [oldSym, oldPeriod]) => {
  if (!newSym || !newPeriod) return

  // 如果是第一次加载（oldSym 和 oldPeriod 为 undefined），或者 symbol 变了，或者 widget 不存在，则初始化图表
  if (!oldSym || !oldPeriod || newSym !== oldSym || !tvWidget.value) {
    initChart()
  } else if (newPeriod !== oldPeriod) {
    // 如果只是周期变了，尝试使用 setResolution
    try {
      const interval = mapPeriodToTradingViewInterval(newPeriod)
      tvWidget.value.activeChart().setResolution(interval, () => {
        console.log('周期切换成功:', newPeriod)
      })
    } catch (error) {
      console.warn('切换周期失败，重新初始化图表:', error)
      initChart()
    }
  }
})

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
  if (!currentSymbol.value || !chartContainer.value) return

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
  if (!currentSymbol.value || !chartContainer.value) return
  // 创建图表配置
  const widgetOptions: any = createChartConfig(currentSymbol.value, currentPeriod.value, chartContainer.value)
  // 添加自定义指标支持
  widgetOptions.custom_indicators_getter = function (PineJS: any) {
    return Promise.resolve([
      {
        // 内部名称，必须唯一
        name: '20-Day-High-Low', // 内部名称，必须唯一
        metainfo: {
          _metainfoVersion: 51,
          id: '20DayHighLow@tv-basicstudies-1',
          scriptIdPart: '20DayHighLow',
          name: '20日高低点', // 用户界面上显示的名称
          description: '最近20日的高点和低点',
          shortDescription: '20日高低点',
          // 确保显示在主图上
          is_price_study: true,
          isCustomIndicator: true,
          // 定义两条绘图线
          plots: [
            { id: 'plot_high', type: 'line' },
            { id: 'plot_low', type: 'line' }
          ],
          // 默认样式和输入参数
          defaults: {
            styles: {
              plot_high: {
                color: '#009688', // 高点颜色：绿色
                linewidth: 2,
                plottype: 2, // 2代表Line Plot
                trackPrice: true,
                title: '20日高点'
              },
              plot_low: {
                color: '#F44336', // 低点颜色：红色
                linewidth: 2,
                plottype: 2,
                trackPrice: true,
                title: '20日低点'
              }
            }
          },
          styles: {
            plot_high: {
              title: 'high points',
            },
            plot_low: {
              title: 'low points',
            }
          },
          format: {
            type: 'price',
            precision: 4,
          },
          inputs: [
            {
              id: 'period', name: 'period', type: 'integer', defval: 20, min: 1,
              max: 10000,
            }
          ],
        },

        // 指标的计算逻辑
        constructor: function () {
          // 用于存储历史价格的数组，在每次 main 调用之间保持状态
          this.highs = [];
          this.lows = [];

          this.init = function (context: any, inputCallback: any) {
            this._context = context;
            this._input = inputCallback;
            // 重新定义输入参数，如果之前未定义
            // if (!this._input.get('length')) {
            //   this._input.add('length', { type: 'integer', defval: 20, min: 1 });
            // }


          };

          this.main = function (context: any, inputCallback: any) {
            this._context = context;
            this._input = inputCallback;

            // 1. 获取输入参数 (周期长度)
            const length = 20; // 默认20日

            // 2. 获取当前 K 线的数值 (使用您库中有效的 PineJS.Std 方法)
            const currentHighValue = PineJS.Std.high(this._context);
            const currentLowValue = PineJS.Std.low(this._context);
            // 3. 将当前值推入历史数组
            this.highs.push(currentHighValue);
            this.lows.push(currentLowValue);

            // 4. 实现滑动窗口：移除最旧的数据 (FIFO - First In, First Out)
            if (this.highs.length > length) {
              this.highs.shift(); // 移除最旧的最高价
            }
            if (this.lows.length > length) {
              this.lows.shift();  // 移除最旧的最低价
            }

            // 5. 计算当前滑动窗口内的最高点和最低点
            let windowHigh = NaN;
            let windowLow = NaN;

            // 仅当数组长度达到或超过周期长度时才开始计算，否则可能返回不完整的高低点
            if (this.highs.length === length) {
              // 使用 Math.max/min 结合 spread 运算符计算数组的最大/最小值
              windowHigh = Math.max(...this.highs);
              windowLow = Math.min(...this.lows);
            } else if (this.highs.length < length && this.highs.length > 0) {
              // 在数据积累阶段，计算当前已有的最大/最小值
              windowHigh = Math.max(...this.highs);
              windowLow = Math.min(...this.lows);
            }

            // 6. 返回结果：[最高点值, 最低点值]
            return [windowHigh, windowLow];
          };
        }
      },
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
          plots: [
            { id: "plot_0", type: "line" },
            { id: "plot_1", type: "line" },
            { id: "plot_ghost", type: "line" } // 新增：用于撑开空间的影子点
          ],
          defaults: {
            styles: {
              plot_0: { linestyle: 0, linewidth: 2, plottype: 0, color: "#2196F3" },
              plot_1: {
                plottype: 3,        // 3 = Circles (圆点)
                linestyle: 0,
                linewidth: 3,       // 控制圆点大小
                color: "#ff5252"    // 可以设置不同的颜色以区分
              },
              plot_ghost: {
                linestyle: 0,
                linewidth: 0,
                plottype: 0, // 0 = Line
                visible: true,
                color: "rgba(0,0,0,0)" // 关键：设置为完全透明
              }
            }
          },
          styles: {
            plot_0: {
              title: 'Equity value',
            },
            plot_1: {
              title: 'Equity points',
            },
            plot_ghost: {
              title: 'ghost',
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

            const ghostValue = equityValue * 1.1;
            return [equityValue, equityValue, ghostValue];
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

      //添加交易标记
      let profit = 0;
      let openTime = 0;

      if (props.tradeHistoryData && props.tradeHistoryData.length > 0) {
        props.tradeHistoryData.reverse().forEach(trade => {
          if(trade.side.includes("open")){
            openTime = trade.time;
          }

          if (trade.side.includes("close")) {
            profit += trade.profit;
            //添加shape标记
          chart.createShape(
              {
                time: trade.time / 1000,
                price: profit  // 这里的 price 会自动对应收益率指标的 Y 轴
              },
              {
                shape: 'note',
                text: `开仓时间: ${new Date(openTime).toLocaleString()}\n平仓时间: ${new Date(trade.time).toLocaleString()}\n方向: ${trade.side.includes("Long")?"多":"空"}\n收益:${trade.profit > 0 ? '+' : ''}${trade.profit.toFixed(2)}%`,
                lock: true,
                disableSelection: false,
                ownerStudyId: studyId, // 核心：绑定到副图指标 ID
                overrides: {
                  markerColor: trade.profit > 0 ? '#4caf50' : '#f44336',

                  // textColor: trade.profit > 0 ? '#4caf50' : '#f44336',
                  // text:`平仓\n${trade.profit > 0 ? '+' : ''}${trade.profit.toFixed(2)}%`,
                  fontsize: 11,
                  showLabel: true,
                }
              }
            );
          }

        })


      }

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
    initChart()
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
