<template>
  <div class="backtest-container">
    <v-row class="fill-height">
      <!-- 左侧：回测参数设置 -->
      <v-col cols="12" md="4" lg="3">
        <v-card elevation="1" class="backtest-settings">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-tune</v-icon>
            回测设置
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="runBacktest">
              <v-row dense>
                <!-- 起始时间 -->
                <v-col cols="12">
                  <v-text-field
                    v-model="backtestForm.fromTime"
                    type="date"
                    label="起始时间"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                  />
                </v-col>

                <!-- 结束时间 -->
                <v-col cols="12">
                  <v-text-field
                    v-model="backtestForm.toTime"
                    type="date"
                    label="结束时间"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                  />
                </v-col>

                <!-- 固定开仓金额 -->
                <v-col cols="12">
                  <v-text-field
                    v-model.number="backtestForm.amount"
                    type="number"
                    label="固定开仓金额"
                    variant="outlined"
                    density="compact"
                    suffix="USDT"
                    hide-details="auto"
                    min="0"
                    step="100"
                  />
                </v-col>

                <!-- 开始回测按钮 -->
                <v-col cols="12" class="mt-4">
                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    size="large"
                    :loading="loading"
                    :disabled="!isFormValid"
                  >
                    <v-icon start>mdi-play</v-icon>
                    开始回测
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 右侧：回测结果 -->
      <v-col cols="12" md="8" lg="9">
        <v-card elevation="1" class="backtest-results">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="success">mdi-chart-timeline-variant</v-icon>
            回测结果
          </v-card-title>
          <v-card-text>
            <!-- 回测统计信息 -->
            <div v-if="totalTrades !== undefined" class="backtest-summary mb-6">
              <v-row>
                <v-col cols="6" md="3">
                  <v-card variant="outlined" class="pa-3 text-center">
                    <div class="text-h6 font-weight-bold">{{ totalTrades }}</div>
                    <div class="text-caption text-medium-emphasis">总交易次数</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card variant="outlined" class="pa-3 text-center">
                    <div class="text-h6 font-weight-bold" :class="getPnlClass(totalReturn || 0)">
                      {{ formatPnl(totalReturn || 0) }} %
                    </div>
                    <div class="text-caption text-medium-emphasis">总收益</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card variant="outlined" class="pa-3 text-center">
                    <div class="text-h6 font-weight-bold text-info">
                      {{ formatProfitRate(winRate || 0) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">胜率</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card variant="outlined" class="pa-3 text-center">
                    <div class="text-h6 font-weight-bold text-warning">
                      {{ formatProfitRate(maxDrawdown || 0) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">最大回撤</div>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- 无数据状态 -->
            <div v-if="data.length === 0" class="text-center py-12">
              <v-icon size="64" color="grey">mdi-chart-line</v-icon>
              <h4 class="text-h6 mt-4 text-medium-emphasis">暂无回测数据</h4>
              <p class="text-body-2 text-medium-emphasis mt-2">请设置回测参数并点击“开始回测”按钮</p>
            </div>

            <!-- 回测结果表格 -->
            <v-data-table v-else :headers="headers" :items="data" item-value="id"
              class="backtest-table" :items-per-page="10">
              <template v-slot:item.time="{ item }">
                <span class="text-body-2">{{ formatDateTime(item.time) }}</span>
              </template>
              <template v-slot:item.symbol="{ item }">
                <span class="text-body-2 font-weight-medium">{{ item.symbol }}</span>
              </template>
              <template v-slot:item.direction="{ item }">
                <v-chip :color="getDirectionColor(item.direction)" size="small" variant="tonal">
                  <v-icon start size="16">{{ getDirectionIcon(item.direction) }}</v-icon>
                  {{ getDirectionLabel(item.direction) }}
                </v-chip>
              </template>
              <template v-slot:item.price="{ item }">
                <span class="text-body-2 font-weight-medium">{{ formatPrice(item.price) }}</span>
              </template>
              <template v-slot:item.quantity="{ item }">
                <span class="text-body-2">{{ formatQuantity(item.quantity) }}</span>
              </template>
              <template v-slot:item.realizedPnl="{ item }">
                <span :class="getPnlClass(item.realizedPnl)" class="font-weight-medium">
                  {{ formatPnl(item.realizedPnl) }}
                </span>
              </template>
              <template v-slot:item.profitRate="{ item }">
                <span :class="getProfitRateClass(item.profitRate)" class="font-weight-medium">
                  {{ formatProfitRate(item.profitRate) }}
                </span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
import type { BacktestParams, BacktestRecord } from '@/types/interface'
import { computed, reactive } from 'vue'


interface Props {
  loading: boolean
  error: string
  data: BacktestRecord[]
  headers: any[]
  // 回测统计信息
  totalTrades?: number
  totalReturn?: number
  winRate?: number
  maxDrawdown?: number
}



defineProps<Props>()
const emit = defineEmits<{
  runBacktest: [params: BacktestParams]
}>()

// 回测参数表单
const backtestForm = reactive<BacktestParams>({
  strategyId: '',
  fromTime: '',
  toTime: '',
  amount: 10000
})

// 表单验证
const isFormValid = computed(() => {
  return backtestForm.fromTime &&
         backtestForm.toTime &&
         backtestForm.amount > 0 &&
         new Date(backtestForm.fromTime) < new Date(backtestForm.toTime)
})

// 开始回测
const runBacktest = () => {
  if (isFormValid.value) {
    emit('runBacktest', { ...backtestForm })
  }
}

// 格式化方法
const formatDateTime = (dateString: string) => {
  const date = new Date(Number(dateString))
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

const formatQuantity = (quantity: number) => {
  return quantity.toFixed(3)
}

const formatPnl = (pnl: number) => {
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toFixed(2)}`
}

const formatProfitRate = (rate: number) => {
  const sign = rate >= 0 ? '+' : ''
  return `${sign}${rate.toFixed(2)}%`
}

const getDirectionColor = (direction: string) => {
  switch (direction) {
    case 'openLong':
    case 'closeLong': return 'success'
    case 'openShort':
    case 'closeShort': return 'error'
    default: return 'grey'
  }
}

const getDirectionIcon = (direction: string) => {
  switch (direction) {
    case 'openLong': return 'mdi-trending-up'
    case 'closeLong': return 'mdi-trending-up'
    case 'openShort': return 'mdi-trending-down'
    case 'closeShort': return 'mdi-trending-down'
    default: return 'mdi-help-circle'
  }
}

const getDirectionLabel = (direction: string) => {
  switch (direction) {
    case 'openLong': return '开多'
    case 'closeLong': return '平多'
    case 'openShort': return '开空'
    case 'closeShort': return '平空'
    default: return '未知'
  }
}

const getPnlClass = (pnl: number) => {
  if (pnl > 0) return 'text-success'
  if (pnl < 0) return 'text-error'
  return 'text-medium-emphasis'
}

const getProfitRateClass = (rate: number) => {
  if (rate > 0) return 'text-success'
  if (rate < 0) return 'text-error'
  return 'text-medium-emphasis'
}
</script>

<style scoped>
.backtest-container {
  height: 100%;
}

.backtest-settings {
  height: fit-content;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.backtest-results {
  height: 100%;
  min-height: 500px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.backtest-table {
  border-radius: 8px;
}

.backtest-table .v-data-table__tr:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}

/* 回测统计信息样式 */
.backtest-summary .v-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  transition: all 0.2s ease;
}

.backtest-summary .v-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.1);
}

/* 响应式调整 */
@media (max-width: 959px) {
  .backtest-settings {
    margin-bottom: 16px;
  }
}
</style>
