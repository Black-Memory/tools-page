<template>
  <v-card
    :class="cardClass"
    class="strategy-card"
    elevation="3"
    hover
  >
    <!-- 策略头部 -->
    <v-card-title class="pb-2">
      <div class="d-flex justify-space-between align-center w-100">
        <div class="strategy-name">
          <h4 class="text-h6 font-weight-bold text-white">{{ strategy.name }}</h4>
        </div>
        <div class="strategy-actions">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                icon="mdi-dots-vertical"
                size="small"
                color="white"
                variant="text"
                v-bind="props"
              />
            </template>
            <v-list>
              <v-list-item @click="$emit('edit', strategy)">
                <template v-slot:prepend>
                  <v-icon>mdi-pencil</v-icon>
                </template>
                <v-list-item-title>编辑</v-list-item-title>
              </v-list-item>
              <v-list-item @click="$emit('delete', strategy)">
                <template v-slot:prepend>
                  <v-icon>mdi-delete</v-icon>
                </template>
                <v-list-item-title>删除</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </v-card-title>

    <!-- 策略内容 -->
    <v-card-text class="text-white">
      <!-- 策略类型指示器 -->
      <div class="strategy-type-indicator mb-3">
        <v-chip
          color="info"
          variant="elevated"
          class="font-weight-bold mr-2"
        >
          <v-icon start>mdi-chart-line</v-icon>
          {{ getStrategyTypeLabel(strategy.strategyType) }}
        </v-chip>
        <v-chip
          color="white"
          variant="outlined"
          size="small"
          class="mr-2 text-white font-weight-bold"
        >
          {{ strategy.period }}
        </v-chip>
        <!-- 运行时方向指示器 -->
        <v-chip
          v-if="strategy.status === 'running' && strategy.direction && strategy.direction !== 'none'"
          :color="strategy.direction === 'long' ? 'success' : 'error'"
          variant="elevated"
          size="small"
          class="font-weight-bold"
        >
          <v-icon start size="14">
            {{ strategy.direction === 'long' ? 'mdi-trending-up' : 'mdi-trending-down' }}
          </v-icon>
          {{ strategy.direction === 'long' ? '做多' : '做空' }}
        </v-chip>
      </div>      <!-- 交易信息 -->
      <div class="trading-info mb-3">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-body-2 text-white-lighten-3">交易对:</span>
          <span class="font-weight-bold">{{ strategy.symbol }}</span>
        </div>
        <!-- <div v-if="strategy.amount" class="d-flex justify-space-between align-center mb-2">
          <span class="text-body-2 text-white-lighten-3">金额:</span>
          <span class="font-weight-bold">${{ formatAmount(strategy.amount) }}</span>
        </div> -->
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-body-2 text-white-lighten-3">配置:</span>
          <span class="font-weight-bold text-caption">{{ getConfigDisplay(strategy) }}</span>
        </div>
        <!-- <div class="d-flex justify-space-between align-center">
          <span class="text-body-2 text-white-lighten-3">盈亏:</span>
          <span
            :class="profitClass"
            class="font-weight-bold"
          >
            {{ formatProfit(strategy.profit) }}
          </span>
        </div> -->
      </div>

      <!-- 状态指示器 -->
      <div class="status-indicator mb-3">
        <v-chip
          :color="getStatusColor(strategy.status)"
          size="small"
          variant="elevated"
        >
          <v-icon start size="14">
            {{ getStatusIcon(strategy.status) }}
          </v-icon>
          {{ getStatusLabel(strategy.status) }}
        </v-chip>
      </div>

      <!-- 描述 -->
      <div v-if="strategy.description" class="strategy-description">
        <p class="text-body-2 text-white-lighten-3 mb-2">
          {{ truncatedDescription }}
        </p>
      </div>

      <!-- 创建时间 -->
      <div class="created-time">
        <span class="text-caption text-white-lighten-4">
          创建于: {{ formatDate(strategy.createdAt) }}
        </span>
      </div>
    </v-card-text>

    <!-- 操作按钮 -->
    <v-card-actions class="pt-0">
      <v-btn
        :color="getActionButtonColor(strategy.status)"
        variant="elevated"
        size="small"
        @click="toggleStatus"
      >
        <v-icon start>
          {{ getActionButtonIcon(strategy.status) }}
        </v-icon>
        {{ getActionButtonText(strategy.status) }}
      </v-btn>
      <v-spacer />
      <v-btn
        color="white"
        variant="outlined"
        size="small"
        @click.stop="viewDetails"
      >
        详情
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts" setup>
import type { Strategy, StrategyInfo } from '@/types/interface';
import { computed } from 'vue'
import { useRouter } from 'vue-router'

// 路由
const router = useRouter()



// Props
const props = defineProps<{
  strategy: Strategy
  strategyInfos?: StrategyInfo[]
}>()

// Emits
const emit = defineEmits<{
  edit: [strategy: Strategy]
  delete: [strategy: Strategy]
  toggleStatus: [strategy: Strategy]
}>()

// 计算属性
const cardClass = computed(() => {
  // 根据策略状态来决定卡片样式
  if (props.strategy.status === 'running') {
    // 运行中状态根据方向显示不同颜色
    switch (props.strategy.direction) {
      case 'long':
        return 'running-long-strategy'
      case 'short':
        return 'running-short-strategy'
      default:
        return 'running-strategy'
    }
  }
  return 'stopped-strategy'
})
// const profitClass = computed(() => {
//   if (props.strategy.profit > 0) return 'profit-positive'
//   if (props.strategy.profit < 0) return 'profit-negative'
//   return 'profit-neutral'
// })

const truncatedDescription = computed(() => {
  if (!props.strategy.description) return ''
  return props.strategy.description.length > 60
    ? props.strategy.description.substring(0, 60) + '...'
    : props.strategy.description
})

// 方法
const formatAmount = (amount: number) => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const getStrategyTypeLabel = (type: string) => {
  if (props.strategyInfos) {
    const strategyInfo = props.strategyInfos.find(info => info.type === type)
    return strategyInfo?.name || '--'
  }
  return '--'
}
const getConfigDisplay = (strategy: Strategy) => {
  const config = strategy.strategyConfig

  if (props.strategyInfos) {
    const strategyInfo = props.strategyInfos.find(info => info.type === strategy.strategyType)
    if (strategyInfo?.config && Object.keys(strategyInfo.config).length > 0) {
      // 根据后台配置动态生成显示
      const displayParts: string[] = []
      Object.entries(strategyInfo.config).forEach(([key, fieldConfig]) => {
        const value = config[key]
        if (value !== undefined && value !== null) {
          displayParts.push(`${fieldConfig.label}:${value}`)
        }
      })
      return displayParts.length > 0 ? displayParts.slice(0, 2).join(' | ') : '--'
    }
  }

  return '--'
}
const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'success'
    case 'stopped':
    default:
      return 'grey'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return 'mdi-play-circle'
    case 'stopped':
    default:
      return 'mdi-stop-circle'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'running':
      return '运行中'
    case 'stopped':
    default:
      return '已停止'
  }
}

// const formatProfit = (profit: number) => {
//   const sign = profit > 0 ? '+' : ''
//   return `${sign}$${profit.toLocaleString('en-US', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2
//   })}`
// }

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActionButtonColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'warning'
    case 'stopped':
    default:
      return 'success'
  }
}

const getActionButtonIcon = (status: string) => {
  switch (status) {
    case 'running':
      return 'mdi-stop'
    case 'stopped':
    default:
      return 'mdi-play'
  }
}

const getActionButtonText = (status: string) => {
  switch (status) {
    case 'running':
      return '停止'
    case 'stopped':
    default:
      return '启动'
  }
}

const toggleStatus = () => {
  emit('toggleStatus', props.strategy)
}

const viewDetails = () => {
  // 跳转到策略详情页面
  router.push(`/strategy/${props.strategy.id}`)
}
</script>

<style scoped>
.strategy-card {
  transition: all 0.3s ease;
  border-radius: 12px;
}

.strategy-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
}

/* 运行中策略 - 多头（绿色背景）*/
.running-long-strategy {
  background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
}

/* 运行中策略 - 空头（红色背景）*/
.running-short-strategy {
  background: linear-gradient(135deg, #f44336 0%, #c62828 100%);
}

/* 运行中策略 - 默认（蓝色背景）*/
.running-strategy {
  background: linear-gradient(135deg, #2196F3 0%, #1565C0 100%);
}

/* 已停止策略 - 灰色背景 */
.stopped-strategy {
  background: linear-gradient(135deg, #757575 0%, #424242 100%);
}

.strategy-type-indicator {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.trading-info {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
}

.profit-positive {
  color: #81c784 !important;
}

.profit-negative {
  color: #ef5350 !important;
}

.profit-neutral {
  color: #bdbdbd !important;
}

.strategy-description {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}

.created-time {
  text-align: right;
}

/* 移动端适配 */
@media (max-width: 600px) {
  .strategy-card {
    margin-bottom: 12px;
  }

  .trading-info {
    padding: 8px;
  }

  .strategy-type-indicator {
    justify-content: center;
    margin-bottom: 16px;
  }

  .v-card-title {
    padding: 12px 16px 8px 16px;
  }

  .v-card-text {
    padding: 0 16px 12px 16px;
  }

  .v-card-actions {
    padding: 8px 16px 16px 16px;
    flex-direction: column;
    gap: 8px;
  }

  .v-card-actions .v-btn {
    width: 100%;
  }

  .v-spacer {
    display: none;
  }

  /* 策略名称在移动端缩小 */
  .text-h6 {
    font-size: 1.1rem !important;
  }
}

/* 超小屏幕优化 */
@media (max-width: 400px) {
  .trading-info .d-flex {
    font-size: 0.875rem;
  }

  .strategy-description {
    font-size: 0.8rem;
  }

  .created-time {
    font-size: 0.75rem;
  }
}
</style>
