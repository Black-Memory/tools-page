<template>
  <div class="strategy-panel">
    <!-- 标题栏 -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-strategy</v-icon>
            <h2 class="text-h5 font-weight-bold">策略面板</h2>
          </div>
          <v-btn v-if="strategies.length > 0" color="primary" @click="addNewStrategy" prepend-icon="mdi-plus">
            添加策略
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- 无策略时的空状态 -->
    <div v-if="strategies.length === 0" class="empty-state">
      <v-card class="text-center pa-8" elevation="2">
        <v-icon size="80" color="grey-lighten-1" class="mb-4">
          mdi-strategy
        </v-icon>
        <h3 class="text-h6 mb-4 text-medium-emphasis">暂无策略</h3>
        <p class="text-body-1 mb-6 text-medium-emphasis">
          开始创建您的第一个交易策略
        </p>
        <v-btn color="primary" size="large" @click="addNewStrategy" prepend-icon="mdi-plus">
          添加新策略
        </v-btn>
      </v-card>
    </div>

    <!-- 策略列表 - 按symbol分组 -->
    <div v-else>
      <div v-for="(symbolStrategies, symbol) in groupedStrategies" :key="symbol" class="mb-6">
        <!-- Symbol 标题 -->
        <v-card class="mb-3 symbol-header" elevation="1" @click="toggleSection(String(symbol))"
          :class="{ 'collapsed': collapsedSections.has(String(symbol)) }">
          <v-card-text class="py-3">
            <div class="d-flex align-center justify-space-between">
              <h3 class="text-h6 font-weight-bold">{{ symbol }}</h3>
              <div class="d-flex align-center">
                <v-btn size="small" color="success" variant="text" class="mr-2"
                  @click.stop="toggleGroupStatus(String(symbol), 'running')">
                  全部开启
                </v-btn>
                <v-btn size="small" color="error" variant="text" class="mr-2"
                  @click.stop="toggleGroupStatus(String(symbol), 'stopped')">
                  全部停止
                </v-btn>
                <v-chip size="small" color="primary" variant="outlined" class="mr-3">
                  {{ symbolStrategies.length }} 个策略
                </v-chip>
                <v-icon :class="{ 'rotated': !collapsedSections.has(String(symbol)) }" class="expand-icon">
                  mdi-chevron-down
                </v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- 策略网格 -->
        <v-expand-transition>
          <div v-show="!collapsedSections.has(String(symbol))">
            <v-row>
              <v-col v-for="strategy in symbolStrategies" :key="strategy.id" cols="12" sm="6" md="4" lg="3">
                <StrategyCard :strategy="strategy" :strategyInfos="strategyInfos" @edit="editStrategy"
                  @delete="deleteStrategy" @toggleStatus="toggleStrategyStatus" />
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>
      </div>
    </div>

    <!-- 策略编辑对话框 -->
    <StrategyEditDialog v-model="showEditDialog" :strategy="editingStrategy" :strategy-infos="strategyInfos"
      :symbol-options="symbolOptions" :period-options="periodOptions" :loading="false" @save="handleStrategySave"
      @cancel="handleStrategyCancel" />

    <!-- 删除确认对话框 -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">确认删除</v-card-title>
        <v-card-text>
          确定要删除策略 "{{ deletingStrategy?.name }}" 吗？此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">取消</v-btn>
          <v-btn color="error" @click="confirmDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Toast 提示 -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000" location="top">
      {{ configLoadError }}
    </v-snackbar>

    <!-- 成功提示 -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000" location="top">
      {{ operationMessage }}
    </v-snackbar>

    <!-- 操作错误提示 -->
    <v-snackbar v-model="showOperationErrorSnackbar" color="error" timeout="5000" location="top">
      {{ operationMessage }}
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
import type { Strategy, StrategyInfo } from '@/types/interface'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { StrategyAPI } from '@/api/strategy'
import type { CreateStrategyRequest } from '@/types/api'
import { socketService } from '@/utils/socket'
import { useUserStore } from '@/stores/user'
import StrategyEditDialog from '@/components/StrategyEditDialog.vue'
import { clearChartData } from '@/utils/chartUtil'




const userStore = useUserStore()
// 策略接口定义


// 响应式数据
const strategies = ref<Strategy[]>([])
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editingStrategy = ref<Strategy | null>(null)
const deletingStrategy = ref<Strategy | null>(null)
// 折叠状态管理
const collapsedSections = ref<Set<string>>(new Set())

// 选项数据 - 从 API 获取
const symbolOptions = ref<string[]>([])
const periodOptions = ref<string[]>([])
const strategyInfos = ref<StrategyInfo[]>([])

// 错误状态
const configLoadError = ref<string>('')
const showErrorSnackbar = ref(false)

// 操作提示状态
const operationMessage = ref<string>('')
const showSuccessSnackbar = ref(false)
const showOperationErrorSnackbar = ref(false)

// 监听configLoadError变化，显示snackbar
watch(configLoadError, (newError) => {
  if (newError) {
    showErrorSnackbar.value = true
  }
})

// 显示成功提示
const showSuccessMessage = (message: string) => {
  operationMessage.value = message
  showSuccessSnackbar.value = true
}

// 显示错误提示
const showErrorMessage = (message: string) => {
  operationMessage.value = message
  showOperationErrorSnackbar.value = true
}



// 加载策略配置信息
const loadStrategyConfigs = async () => {
  try {
    const response = await StrategyAPI.getStrategyConfigs()
    if (response.code === 0 && response.data) {
      symbolOptions.value = response.data.symbols
      periodOptions.value = response.data.periods
      strategyInfos.value = response.data.strategyInfos
    } else {
      configLoadError.value = response.message || '获取策略配置失败'
    }
  } catch (error) {
    console.error('加载策略配置失败:', error)
    configLoadError.value = '网络错误，无法加载策略配置'
  }
}



// 计算属性 - 按symbol分组策略
const groupedStrategies = computed(() => {
  // 1. 先对所有策略进行排序
  // 排序规则：
  // 1. 运行中的策略优先
  // 2. 同状态下按 Symbol 字母序排序
  // 3. 同 Symbol 下按策略名称排序
  const sortedStrategies = [...strategies.value].sort((a, b) => {
    // 权重1: 运行状态 (running > stopped)
    const aRunning = a.status === 'running'
    const bRunning = b.status === 'running'
    if (aRunning && !bRunning) return -1
    if (!aRunning && bRunning) return 1

    // 权重2: Symbol 字母序
    const symbolCompare = a.symbol.localeCompare(b.symbol)
    if (symbolCompare !== 0) return symbolCompare

    // 权重3: 策略名称
    return (a.name || '').localeCompare(b.name || '')
  })

  // 2. 按顺序提取分组
  // 由于 sortedStrategies 已经排好序：
  // - 包含 running 策略的 symbol 会先出现，从而先创建分组 key
  // - 同一个 symbol 内，running 策略排在前面，所以 push 进去也是有序的
  const grouped: { [key: string]: Strategy[] } = {}

  sortedStrategies.forEach(strategy => {
    if (!grouped[strategy.symbol]) {
      grouped[strategy.symbol] = []
    }
    grouped[strategy.symbol]!.push(strategy)
  })

  return grouped
})

// 方法
const editStrategy = (strategy: Strategy) => {
  editingStrategy.value = strategy
  showEditDialog.value = true
}

const addNewStrategy = () => {
  editingStrategy.value = null
  showEditDialog.value = true
}

const deleteStrategy = (strategy: Strategy) => {
  deletingStrategy.value = strategy
  showDeleteDialog.value = true
}

const toggleStrategyStatus = async (strategy: Strategy) => {
  try {
    const newStatus = strategy.status === 'running' ? 'stopped' : 'running'

    // 调用API更新策略状态
    const response = await StrategyAPI.updateStrategy(strategy.id, {
      status: newStatus,
    })

    if (response.code === 0) {
      // 更新本地数据
      const strategyToUpdate = strategies.value.find(s => s.id === strategy.id)
      if (strategyToUpdate) {
        strategyToUpdate.status = newStatus
      }
      showSuccessMessage(`策略${newStatus === 'running' ? '启动' : '停止'}成功`)
    } else {
      showErrorMessage(response.message || '更新策略状态失败')
    }
  } catch (error) {
    console.error('更新策略状态异常:', error)
    showErrorMessage('网络错误，无法更新策略状态')
  }
}

const toggleGroupStatus = async (symbol: string, targetStatus: 'running' | 'stopped') => {
  const strategiesToUpdate = groupedStrategies.value[symbol]!.filter(s => s.status !== targetStatus)

  if (strategiesToUpdate.length === 0) {
    showSuccessMessage(`该组策略已全部处于${targetStatus === 'running' ? '运行' : '停止'}状态`)
    return
  }

  let successCount = 0
  let failCount = 0

  // 并行执行更新
  await Promise.all(strategiesToUpdate.map(async (strategy) => {
    try {
      const response = await StrategyAPI.updateStrategy(strategy.id, { status: targetStatus })
      if (response.code === 0) {
        // 更新本地数据
        const strategyToUpdate = strategies.value.find(s => s.id === strategy.id)
        if (strategyToUpdate) {
          strategyToUpdate.status = targetStatus
        }
        successCount++
      } else {
        failCount++
      }
    } catch (error) {
      console.error(`更新策略 ${strategy.name} 状态异常:`, error)
      failCount++
    }
  }))

  if (failCount === 0) {
    showSuccessMessage(`已成功${targetStatus === 'running' ? '开启' : '停止'} ${successCount} 个策略`)
  } else {
    showErrorMessage(`操作完成: 成功 ${successCount} 个, 失败 ${failCount} 个`)
  }
}

const handleStrategySave = async (formData: any) => {
  try {
    if (editingStrategy.value) {
      // 编辑现有策略
      const updateData = {
        name: formData.name,
        symbol: formData.symbol,
        period: formData.period,
        strategyType: formData.strategyType,
        strategyConfig: { ...formData.config },
        description: formData.description,
      }

      const response = await StrategyAPI.updateStrategy(editingStrategy.value.id, updateData)
      if (response.code === 0) {
        const strategyToUpdate = strategies.value.find(s => s.id === editingStrategy.value!.id)
        if (strategyToUpdate) {
          Object.assign(strategyToUpdate, updateData)
        }
        showSuccessMessage('策略更新成功')
        handleStrategyCancel()
      } else {
        showErrorMessage(response.message || '更新策略失败')
      }
    } else {
      // 添加新策略
      const newStrategy: CreateStrategyRequest = {
        name: formData.name,
        symbol: formData.symbol,
        period: formData.period,
        strategyType: formData.strategyType,
        strategyConfig: { ...formData.config },
        description: formData.description,
        status: formData.enableOnCreate ? 'running' : 'stopped',
        direction: 'none',
      }

      const response = await StrategyAPI.createStrategy(newStrategy)
      if (response.code === 0 && response.data) {
        strategies.value.push({
          id: response.data,
          ...newStrategy,
          createdAt: new Date().toISOString()
        } as Strategy)
        showSuccessMessage('策略创建成功')
        handleStrategyCancel()
      } else {
        showErrorMessage(response.message || '创建策略失败')
      }
    }
  } catch (error) {
    console.error('操作策略异常:', error)
    showErrorMessage('网络错误，操作失败')
  }
}

const confirmDelete = () => {
  if (deletingStrategy.value) {
    const index = strategies.value.findIndex(s => s.id === deletingStrategy.value!.id)
    if (index !== -1) {
      StrategyAPI.deleteStrategy(deletingStrategy.value.id).then(response => {
        if (response.code === 0) {
          strategies.value.splice(index, 1)
        } else {
          console.error('删除策略失败:', response.message)
        }
        showDeleteDialog.value = false
        clearChartData(deletingStrategy.value!.id)
        deletingStrategy.value = null
      }).catch(error => {
        console.error('删除策略异常:', error)
      })
    }
  }

}

const handleStrategyCancel = () => {
  showEditDialog.value = false
  editingStrategy.value = null
}

// 折叠控制方法
const toggleSection = (symbol: string) => {
  if (collapsedSections.value.has(symbol)) {
    collapsedSections.value.delete(symbol)
  } else {
    collapsedSections.value.add(symbol)
  }
}



// 初始化数据
onMounted(async () => {
  //订阅策略更新消息
  StrategyAPI.subscribeStrategyUpdates(userStore.userId as string, (data: Partial<Strategy>) => {
    console.log('收到策略更新通知:', data)
    // 可以根据需要刷新策略列表
    let id = data.id;
    if (!id) return;
    const strategy = strategies.value.find(s => s.id === id)
    if (strategy) {
      strategy.direction = data.direction || strategy.direction
    }
  });


  // 先加载策略配置
  await loadStrategyConfigs()
  // 再加载演示数据
  loadListData()
})


onUnmounted(() => {
  StrategyAPI.unsubscribeStrategyUpdates(userStore.userId as string);
})

// 加载演示数据
const loadListData = () => {
  StrategyAPI.getStrategies().then(response => {
    if (response.code === 0 && response.data) {
      strategies.value = response.data
    } else {
      console.error('获取策略列表失败:', response.message)
    }
  }).catch(error => {
    console.error('获取策略列表异常:', error)
  })
}
</script>

<style scoped>
.strategy-panel {
  padding: 16px;
  max-width: 100%;
  min-height: 100%;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 移动端优化 */
@media (max-width: 600px) {
  .strategy-panel {
    padding: 8px;
  }

  .d-flex.justify-space-between {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .d-flex.justify-space-between .d-flex.align-center {
    width: 100%;
  }

  /* 移动端标题调整 */
  .text-h5 {
    font-size: 1.25rem !important;
  }

  /* 空状态移动端优化 */
  .empty-state .v-card {
    margin: 0 8px;
    width: calc(100% - 16px);
  }
}

/* 平板端优化 */
@media (max-width: 960px) and (min-width: 601px) {
  .strategy-panel {
    padding: 12px;
  }
}

/* 确保卡片在小屏幕上不会过窄 */
@media (max-width: 400px) {
  .v-col {
    padding: 4px !important;
  }
}

/* Symbol折叠面板样式 */
.symbol-header {
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.symbol-header:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.symbol-header.collapsed {
  margin-bottom: 16px;
}

.expand-icon {
  transition: transform 0.3s ease;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}
</style>
