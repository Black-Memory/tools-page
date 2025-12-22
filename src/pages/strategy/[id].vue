<template>
  <div class="strategy-detail-page">
    <!-- 页面头部 -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center flex-grow-1">
            <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" class="mr-3" />
            <div class="flex-grow-1">
              <h1 class="text-h4 font-weight-bold mb-1">{{ strategy?.name || '策略详情' }}</h1>
              <!-- 策略信息：所有信息在一行显示 -->
              <div class="strategy-main-indicators">
                <div class="d-flex align-center flex-wrap ga-2">
                  <!-- 运行状态 -->
                  <div class="d-flex align-center strategy-indicator"
                    :class="getStatusIndicatorClass(strategy?.status)">
                    <v-icon :color="getStatusIconColor(strategy?.status)" size="16" class="mr-1">
                      {{ getStatusIcon(strategy?.status) }}
                    </v-icon>
                    <span class="text-body-2 font-weight-medium" :class="getStatusTextClass(strategy?.status)">{{
                      getStatusLabel(strategy?.status) }}</span>
                  </div>

                  <!-- 策略方向 -->
                  <div v-if="strategy?.direction && strategy.direction !== 'none'"
                    class="d-flex align-center strategy-indicator"
                    :class="getDirectionIndicatorClass(strategy.direction)">
                    <v-icon color="white" size="16" class="mr-1">
                      {{ strategy.direction === 'long' ? 'mdi-trending-up' : 'mdi-trending-down' }}
                    </v-icon>
                    <span class="text-body-2 font-weight-medium text-white">
                      {{ strategy.direction === 'long' ? '做多' : '做空' }}
                    </span>
                  </div>



                  <!-- 策略类型 -->
                  <div class="d-flex align-center strategy-indicator">
                    <span class="text-body-2 text-medium-emphasis mr-1">类型:</span>
                    <span class="text-body-2 font-weight-medium">{{ getStrategyTypeLabel(strategy?.strategyType || '')
                    }}</span>
                  </div>

                  <!-- 配置参数（如果有） -->
                  <template v-if="configDisplay.length > 0">
                    <div v-for="config in configDisplay" :key="config.key"
                      class="d-flex align-center strategy-indicator">
                      <span class="text-body-2 text-medium-emphasis mr-1">{{ config.label }}:</span>
                      <span class="text-body-2 font-weight-medium">{{ config.value }}</span>
                    </div>
                  </template>

                  <!-- 创建时间 -->
                  <div class="d-flex align-center strategy-indicator">
                    <v-icon color="grey" size="16" class="mr-1">mdi-clock-outline</v-icon>
                    <span class="text-body-2 font-weight-medium text-medium-emphasis">{{ formatDate(strategy?.createdAt)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="d-flex align-center ga-2 strategy-actions">
            <v-btn color="primary" variant="elevated" @click="showEditDialog = true" class="mr-2">
              <v-icon start>mdi-pencil</v-icon>
              编辑策略
            </v-btn>
            <v-btn :color="getActionButtonColor(strategy?.status)" variant="elevated" @click="toggleStrategyStatus"
              class="mr-2">
              <v-icon start>
                {{ getActionButtonIcon(strategy?.status) }}
              </v-icon>
              {{ getActionButtonText(strategy?.status) }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4 text-h6">加载策略信息中...</p>
    </div>

    <!-- 错误状态 -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <!-- 策略详情内容 -->
    <div v-else-if="strategy">
      <!-- K线图区域 -->
      <TradingViewChart :chart-id="strategy?.id || ''" :symbol="strategy?.symbol || ''" :period="strategy?.period || ''"
        :profit-curve-data="profitCurveData" :trade-history-data="tradeHistoryData" :show-profit-curve="false"
        ref="chartRef" />

      <!-- 策略分析区域 -->
      <v-card elevation="2" class="mb-4">
        <!-- 水平Tab切换 -->
        <v-tabs v-model="activeTab" color="primary" class="analysis-tabs">

          <v-tab value="positions" disabled>
            <v-icon start>mdi-briefcase</v-icon>
            持仓信息
            <v-chip size="x-small" color="grey" class="ml-2">即将推出</v-chip>
          </v-tab>
          <v-tab value="history" disabled>
            <v-icon start>mdi-history</v-icon>
            交易历史
            <v-chip size="x-small" color="grey" class="ml-2">即将推出</v-chip>
          </v-tab>
          <v-tab value="backtest">
            <v-icon start>mdi-chart-timeline-variant</v-icon>
            策略回测
          </v-tab>
        </v-tabs>

        <!-- Tab内容区域 -->
        <v-card-text>
          <!-- 回测结果Tab内容 -->
          <v-window v-model="activeTab">
            <v-window-item value="backtest">
              <BacktestContent :loading="backtestLoading" :error="backtestError" :data="backtestData"
                :headers="backtestHeaders" :total-trades="backtestStats.totalTrades"
                :total-return="backtestStats.totalReturn" :win-rate="backtestStats.winRate"
                :max-drawdown="backtestStats.maxDrawdown" @run-backtest="runBacktest" />
            </v-window-item>

            <v-window-item value="positions">
              <div class="text-center py-12">
                <v-icon size="64" color="grey">mdi-briefcase</v-icon>
                <h4 class="text-h6 mt-4 text-medium-emphasis">持仓信息</h4>
                <p class="text-body-2 text-medium-emphasis mt-2">此功能正在开发中，敬请期待</p>
              </div>
            </v-window-item>

            <v-window-item value="history">
              <div class="text-center py-12">
                <v-icon size="64" color="grey">mdi-history</v-icon>
                <h4 class="text-h6 mt-4 text-medium-emphasis">交易历史</h4>
                <p class="text-body-2 text-medium-emphasis mt-2">此功能正在开发中，敬请期待</p>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>


    </div>

    <!-- 策略编辑对话框 -->
    <StrategyEditDialog v-model="showEditDialog" :strategy="strategy" :strategy-infos="strategyInfos"
      :symbol-options="symbolOptions" :period-options="periodOptions" :loading="false" @save="handleStrategySave"
      @cancel="showEditDialog = false" />

    <!-- 全局snackbar已统一，无需本地snackbar -->
  </div>
</template>

<script lang="ts" setup>
import type { BacktestCompletedUpdate, BacktestErrorUpdate, BacktestParams, BacktestProgressUpdate, BacktestRecord, BacktestUpdate, Strategy, StrategyInfo, SymbolInfo } from '@/types/interface'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { showErrorMessage, showSuccessMessage } from '@/composables/snackbar'
import { useRouter, useRoute } from 'vue-router'
import { StrategyAPI } from '@/api/strategy'
import BacktestContent from '@/components/BacktestContent.vue'
import TradingViewChart from '@/components/TradingViewChart.vue'
import StrategyEditDialog from '@/components/StrategyEditDialog.vue'

// 路由相关
const router = useRouter()
const route = useRoute()
const strategyId = computed(() => (route.params as { id?: string }).id || '')

// 响应式数据
const strategy = ref<Strategy | null>(null)
const strategyInfos = ref<StrategyInfo[]>([])
const symbolOptions = ref<string[]>([])
const periodOptions = ref<string[]>([])
const showEditDialog = ref(false)
const loading = ref(true)
const error = ref<string>('')


// Tab切换相关状态
const activeTab = ref('backtest')

// 图表组件引用
const chartRef = ref<InstanceType<typeof TradingViewChart> | null>(null)

// 回测数据相关状态
const backtestData = ref<BacktestRecord[]>([])
const backtestLoading = ref(false)
const backtestError = ref<string>('')

// 回测统计信息
const backtestStats = ref<{
  totalTrades?: number
  totalReturn?: number
  winRate?: number
  maxDrawdown?: number
}>({})


const taskId = ref<string>('')

// 收益曲线数据
const profitCurveData = ref<Array<{ time: number; value: number }>>([])

// 交易历史数据
const tradeHistoryData = ref<Array<{
  time: number
  price: number
  quantity: number
  profit: number
  side: 'openLong' | 'openShort' | 'closeLong' | 'closeShort'
}>>([])


// 回测结果表格头部定义
const backtestHeaders = [
  { title: '时间', key: 'time', sortable: true, width: '140px' },
  { title: '合约', key: 'symbol', sortable: true, width: '100px' },
  { title: '方向', key: 'direction', sortable: false, width: '100px' },
  { title: '价格', key: 'price', sortable: true, width: '120px' },
  { title: '数量', key: 'quantity', sortable: true, width: '100px' },
  { title: '已实现盈亏', key: 'realizedPnl', sortable: true, width: '120px' },
  { title: '收益率', key: 'profitRate', sortable: true, width: '100px' },
]



// 计算属性 - 配置参数显示
const configDisplay = computed(() => {
  if (!strategy.value || !strategyInfos.value.length) return []

  const strategyInfo = strategyInfos.value.find(info => info.type === strategy.value!.strategyType)
  if (!strategyInfo?.config) return []

  const display: Array<{ key: string; label: string; value: any }> = []

  Object.entries(strategyInfo.config).forEach(([key, fieldConfig]) => {
    const value = strategy.value!.strategyConfig[key]
    if (value !== undefined && value !== null) {
      display.push({
        key,
        label: fieldConfig.label,
        value: value
      })
    }
  })

  return display
})

// 基本方法
const goBack = () => {
  router.back()
}


const loadStrategyDetail = async () => {
  try {
    loading.value = true
    error.value = ''

    const [strategyResponse, configResponse] = await Promise.all([
      StrategyAPI.getStrategy(strategyId.value),
      StrategyAPI.getStrategyConfigs()
    ])

    if (strategyResponse.code === 0 && strategyResponse.data) {
      strategy.value = strategyResponse.data.strategy || strategyResponse.data
    } else {
      error.value = strategyResponse.message || '获取策略详情失败'
      return
    }

    if (configResponse.code === 0 && configResponse.data) {
      strategyInfos.value = configResponse.data.strategyInfos
      symbolOptions.value = configResponse.data.symbols
      periodOptions.value = configResponse.data.periods
    }

  } catch (err) {
    console.error('加载策略详情失败:', err)
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 状态显示方法
const getStrategyTypeLabel = (type: string) => {
  const strategyInfo = strategyInfos.value.find(info => info.type === type)
  return strategyInfo?.name || type
}


const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'running': return 'mdi-play-circle'
    case 'stopped': return 'mdi-stop-circle'
    default: return 'mdi-help-circle'
  }
}

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'running': return '运行中'
    case 'stopped': return '已停止'
    default: return '未知'
  }
}

const getStatusIndicatorClass = (status?: string) => {
  switch (status) {
    case 'running': return 'status-running'
    case 'stopped': return 'status-stopped'
    default: return 'status-unknown'
  }
}

const getStatusIconColor = (status?: string) => {
  switch (status) {
    case 'running': return 'white'
    case 'stopped': return 'grey'
    default: return 'grey'
  }
}

const getStatusTextClass = (status?: string) => {
  switch (status) {
    case 'running': return 'text-white'
    default: return ''
  }
}

const getDirectionIndicatorClass = (direction?: string) => {
  switch (direction) {
    case 'long': return 'direction-long'
    case 'short': return 'direction-short'
    default: return ''
  }
}

const getActionButtonColor = (status?: string) => {
  switch (status) {
    case 'running': return 'warning'
    case 'stopped': return 'success'
    default: return 'grey'
  }
}

const getActionButtonIcon = (status?: string) => {
  switch (status) {
    case 'running': return 'mdi-stop'
    case 'stopped': return 'mdi-play'
    default: return 'mdi-help'
  }
}

const getActionButtonText = (status?: string) => {
  switch (status) {
    case 'running': return '停止策略'
    case 'stopped': return '启动策略'
    default: return '操作'
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}






// 运行回测
const runBacktest = async (params: BacktestParams) => {
  if (!strategy.value) return

  try {
    backtestLoading.value = true
    backtestError.value = ''
    // 清空之前的回测数据
    backtestData.value = []
    profitCurveData.value = []
    backtestStats.value = {}

    console.log('开始回测:', {
      strategyId: strategy.value.id,
      params
    })
    taskId.value = self.crypto.randomUUID()
    //提前订阅
    //订阅id事件
    StrategyAPI.subsscribeBacktestUpdates(taskId.value as string, (data: BacktestUpdate) => {
      console.log('收到回测更新:', data)
      if (data.type == "progress") {
        //新增回测记录
        backtestData.value.unshift((data as BacktestProgressUpdate).record)

      } else if (data.type === "completed") {
        showSuccessMessage('回测任务已完成')
        const completedData = (data as BacktestCompletedUpdate)

        //取消订阅
        StrategyAPI.unsubscribeBacktestUpdates(taskId.value)

        //更新统计信息
        backtestStats.value = {
          totalTrades: completedData.totalTrades,
          totalReturn: completedData.totalReturn,
          winRate: completedData.winRate,
          maxDrawdown: completedData.maxDrawdown
        }

        tradeHistoryData.value = (backtestData.value).map(record => ({
          time: Number(record.time),
          price: record.price,
          quantity: record.quantity,
          profit: record.profitRate,
          side: record.direction
        }))


        //生成收益曲线数据
        profitCurveData.value = completedData.profitCurve || []
        backtestLoading.value = false



      } else if (data.type === 'error') {
        //取消订阅
        StrategyAPI.unsubscribeBacktestUpdates(taskId.value)
        // throw new Error((data as BacktestErrorUpdate).message || '回测任务出错')
        showErrorMessage((data as BacktestErrorUpdate).message || '回测任务出错')
        backtestLoading.value = false
      }
    })



    StrategyAPI.backtest({ ...params, strategyId: strategy.value.id, taskId: taskId.value }).then(response => {
      if (response.code === 0) {
        taskId.value = response.data as string
        console.log('回测任务创建成功，任务ID:', response.data)
        showSuccessMessage('回测任务已创建，正在运行中...')
      } else {
        //提示回测失败
        throw new Error(response.message || '回测任务创建失败')
      }
    }).catch(error => {
      StrategyAPI.unsubscribeBacktestUpdates(taskId.value as string)
      throw error
    })

  } catch (error) {
    console.error('回测运行失败:', error)
    backtestError.value = '回测运行失败: ' + (error as Error).message
    showErrorMessage('回测运行失败')
    backtestLoading.value = false
  }
}


// 策略操作方法
const handleStrategySave = async (formData: any) => {
  if (!strategy.value) return

  try {
    const updateData = {
      name: formData.name,
      symbol: formData.symbol,
      period: formData.period,
      strategyType: formData.strategyType,
      strategyConfig: { ...formData.config },
      description: formData.description,
    }

    const response = await StrategyAPI.updateStrategy(strategy.value.id, updateData)
    if (response.code === 0) {
      // 更新本地数据
      Object.assign(strategy.value, response.data)
      showSuccessMessage('策略更新成功')
      showEditDialog.value = false
    } else {
      showErrorMessage(response.message || '更新策略失败')
    }
  } catch (error) {
    console.error('更新策略异常:', error)
    showErrorMessage('网络错误，无法更新策略')
  }
}

const toggleStrategyStatus = async () => {
  if (!strategy.value) return

  try {
    const newStatus = strategy.value.status === 'running' ? 'stopped' : 'running'

    const response = await StrategyAPI.updateStrategy(strategy.value.id, {
      status: newStatus,
    })

    if (response.code === 0) {
      strategy.value.status = newStatus
      showSuccessMessage(`策略${newStatus === 'running' ? '启动' : '停止'}成功`)
    } else {
      showErrorMessage(response.message || '更新策略状态失败')
    }
  } catch (error) {
    console.error('更新策略状态异常:', error)
    showErrorMessage('网络错误，无法更新策略状态')
  }
}




// 生命周期钩子
onMounted(async () => {
  // 加载策略详情
  await loadStrategyDetail()
})

onUnmounted(() => {
  // 组件清理由TradingViewChart组件自身处理
  if (taskId.value) {
    StrategyAPI.unsubscribeBacktestUpdates(taskId.value)
  }
})
</script>

<style scoped>
.strategy-detail-page {
  padding: 16px;
  max-width: 100%;
}

/* 移动端优化 */
@media (max-width: 1280px) {
  .strategy-detail-page {
    padding: 12px;
  }
}

@media (max-width: 768px) {

  /* 基本的响应式布局调整 */
  .d-flex.justify-space-between {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

/* 策略主要指示器样式 */
.strategy-main-indicators {
  margin-top: 8px;
}

.strategy-indicator {
  padding: 4px 8px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 6px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}



/* 操作按钮区域 */
.strategy-actions {
  flex-shrink: 0;
}

/* 状态指示器颜色样式 */
.status-running {
  background: rgb(var(--v-theme-success)) !important;
  border-color: rgb(var(--v-theme-success)) !important;
  color: white;
}

.status-stopped {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-color: rgba(var(--v-border-color), 0.2);
}

.status-unknown {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-color: rgba(var(--v-border-color), 0.2);
}

/* 方向指示器颜色样式 */
.direction-long {
  background: rgb(var(--v-theme-success)) !important;
  border-color: rgb(var(--v-theme-success)) !important;
  color: white;
}

.direction-short {
  background: rgb(var(--v-theme-error)) !important;
  border-color: rgb(var(--v-theme-error)) !important;
  color: white;
}

/* 分析工具Tab样式 */
.analysis-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.analysis-tabs .v-tab {
  text-transform: none;
  font-weight: 500;
}

.analysis-tabs .v-tab--selected {
  color: rgb(var(--v-theme-primary));
}

/* 响应式调整 */
@media (max-width: 768px) {
  .analysis-tabs .v-tab {
    min-width: auto;
    flex: 1;
    font-size: 0.875rem;
  }

  .analysis-tabs .v-tab .v-chip {
    display: none;
  }
}
</style>
