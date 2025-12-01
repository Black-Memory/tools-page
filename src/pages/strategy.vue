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
          <v-btn v-if="strategies.length > 0" color="primary" @click="showAddDialog = true" prepend-icon="mdi-plus">
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
        <v-btn color="primary" size="large" @click="showAddDialog = true" prepend-icon="mdi-plus">
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

    <!-- 添加策略对话框 -->
    <v-dialog v-model="showAddDialog" max-width="600" persistent :fullscreen="$vuetify.display.xs">
      <v-card>
        <v-card-title class="text-h5">
          {{ editingStrategy ? '编辑策略' : '添加新策略' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field v-model="strategyForm.name" label="策略名称" :rules="nameRules" required variant="outlined"
              class="mb-3" />

            <v-select v-model="strategyForm.symbol" :items="symbolOptions" label="交易对" :rules="symbolRules" required
              variant="outlined" class="mb-3" />

            <v-select v-model="strategyForm.period" :items="periodOptions" label="时间周期" :rules="periodRules" required
              variant="outlined" class="mb-3" />

            <v-select v-model="strategyForm.strategyType" :items="strategyTypeOptions" item-title="title"
              item-value="value" label="策略类型" :rules="strategyTypeRules" required variant="outlined" class="mb-3" />

            <!-- 策略配置参数 - 动态生成 -->
            <div v-if="strategyForm.strategyType && configFieldGroups.length > 0" class="mb-3">
              <v-row v-for="(group, groupIndex) in configFieldGroups" :key="groupIndex" class="mb-2">
                <v-col v-for="[fieldKey, fieldConfig] in group" :key="fieldKey" cols="6">
                  <!-- 数字类型输入 -->
                  <v-text-field v-if="fieldConfig.type === 'number'" v-model.number="strategyForm.config[fieldKey]"
                    :label="fieldConfig.label" type="number" :min="fieldConfig.min" :max="fieldConfig.max"
                    :required="fieldConfig.required" variant="outlined" :rules="getFieldRules(fieldConfig)" />

                  <!-- 字符串类型输入 -->
                  <v-text-field v-else-if="fieldConfig.type === 'string'" v-model="strategyForm.config[fieldKey]"
                    :label="fieldConfig.label" :required="fieldConfig.required" variant="outlined"
                    :rules="getFieldRules(fieldConfig)" />

                  <!-- 选择类型输入 -->
                  <v-select v-else-if="fieldConfig.type === 'select'" v-model="strategyForm.config[fieldKey]"
                    :items="fieldConfig.options || []" item-title="label" item-value="value" :label="fieldConfig.label"
                    :required="fieldConfig.required" variant="outlined" :rules="getFieldRules(fieldConfig)" />

                  <!-- 布尔类型输入 -->
                  <v-checkbox v-else-if="fieldConfig.type === 'boolean'" v-model="strategyForm.config[fieldKey]"
                    :label="fieldConfig.label" :required="fieldConfig.required" />
                </v-col>
              </v-row>
            </div>

            <v-textarea v-model="strategyForm.description" label="策略描述（可选）" variant="outlined" rows="3" class="mb-3" />

            <!-- 开启运行选项 -->
            <v-checkbox v-model="strategyForm.enableOnCreate" label="开启运行" color="primary" class="mb-3" />

            <!-- <v-text-field
              v-model.number="strategyForm.amount"
              label="交易金额（可选）"
              type="number"
              variant="outlined"
              prefix="$"
              class="mb-3"
            /> -->
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelAdd">取消</v-btn>
          <v-btn color="primary" :disabled="!valid" @click="saveStrategy">
            {{ editingStrategy ? '更新' : '添加' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, computed, onMounted, watch } from 'vue'
import { StrategyAPI } from '@/api/strategy'
import type { CreateStrategyRequest } from '@/types/api'
import { socketService } from '@/utils/socket'
import { useUserStore } from '@/stores/user'




const userStore = useUserStore()
// 策略接口定义


// 响应式数据
const strategies = ref<Strategy[]>([])
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const editingStrategy = ref<Strategy | null>(null)
const deletingStrategy = ref<Strategy | null>(null)
const form = ref()
const valid = ref(false)
// 折叠状态管理
const collapsedSections = ref<Set<string>>(new Set())

// 表单数据
const strategyForm = ref<{
  name: string
  symbol: string
  period: string
  strategyType: string
  description: string
  config: Record<string, any>
  enableOnCreate: boolean
}>({
  name: '',
  symbol: '',
  period: '',
  strategyType: '',
  description: '',
  config: {},
  enableOnCreate: true
})

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

// 计算属性 - 策略类型选项
const strategyTypeOptions = computed(() => {
  return strategyInfos.value.map(info => ({
    title: info.desc,
    value: info.type
  }))
})

// 计算属性 - 当前策略的配置信息
const currentStrategyConfig = computed(() => {
  const selectedStrategy = strategyInfos.value.find(info => info.type === strategyForm.value.strategyType)
  return selectedStrategy?.config || {}
})

// 计算属性 - 配置字段数组，每两个一组
const configFieldGroups = computed(() => {
  const fields = Object.entries(currentStrategyConfig.value)
  const groups = []
  for (let i = 0; i < fields.length; i += 2) {
    groups.push(fields.slice(i, i + 2))
  }
  return groups
})

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

// 表单验证规则
const nameRules = [
  (v: string) => !!v || '策略名称不能为空',
  (v: string) => v.length >= 2 || '策略名称至少2个字符'
]

const symbolRules = [
  (v: string) => !!v || '请选择交易对'
]

const periodRules = [
  (v: string) => !!v || '请选择时间周期'
]

const strategyTypeRules = [
  (v: string) => !!v || '请选择策略类型'
]

// 动态字段验证规则生成函数
const getFieldRules = (fieldConfig: any) => {
  const rules = []

  if (fieldConfig.required) {
    rules.push((v: any) => !!v || `${fieldConfig.label}不能为空`)
  }

  if (fieldConfig.type === 'number') {
    if (fieldConfig.min !== undefined) {
      rules.push((v: number) => v >= fieldConfig.min || `${fieldConfig.label}不能小于${fieldConfig.min}`)
    }
    if (fieldConfig.max !== undefined) {
      rules.push((v: number) => v <= fieldConfig.max || `${fieldConfig.label}不能大于${fieldConfig.max}`)
    }
  }

  return rules
}

// const amountRules = [
//   (v: number) => !!v || '交易金额不能为空',
//   (v: number) => v > 0 || '交易金额必须大于0'
// ]

// 计算属性 - 按symbol分组策略
const groupedStrategies = computed(() => {
  const grouped: { [key: string]: Strategy[] } = {}

  strategies.value.forEach(strategy => {
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
  strategyForm.value = {
    name: strategy.name,
    symbol: strategy.symbol,
    period: strategy.period,
    strategyType: strategy.strategyType,
    description: strategy.description || '',
    config: { ...strategy.strategyConfig },
    enableOnCreate: strategy.status === 'running'
  }
  showAddDialog.value = true
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

const saveStrategy = async () => {
  if (!valid.value) return

  try {
    if (editingStrategy.value) {
      // 编辑现有策略
      const index = strategies.value.findIndex(s => s.id === editingStrategy.value!.id)
      if (index !== -1) {
        const updatedStrategy: Partial<Strategy> = {
          name: strategyForm.value.name,
          symbol: strategyForm.value.symbol,
          period: strategyForm.value.period,
          strategyType: strategyForm.value.strategyType,
          description: strategyForm.value.description,
          strategyConfig: { ...strategyForm.value.config },
          status: strategyForm.value.enableOnCreate ? 'running' : 'stopped',
        }

        const response = await StrategyAPI.updateStrategy(editingStrategy.value.id, updatedStrategy)
        if (response.code === 0 && response.data) {
          // 更新本地数据
          strategies.value[index] = {
            ...editingStrategy.value,
            ...response.data
          }
          showSuccessMessage('策略更新成功')
          cancelAdd()
        } else {
          showErrorMessage(response.message || '更新策略失败')
        }
      }
    } else {
      // 添加新策略
      const newStrategy: CreateStrategyRequest = {
        name: strategyForm.value.name,
        symbol: strategyForm.value.symbol,
        period: strategyForm.value.period,
        strategyType: strategyForm.value.strategyType,
        strategyConfig: { ...strategyForm.value.config },
        description: strategyForm.value.description,
        status: strategyForm.value.enableOnCreate ? 'running' : 'stopped',
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
        cancelAdd()
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
        deletingStrategy.value = null
      }).catch(error => {
        console.error('删除策略异常:', error)
      })
    }
  }

}

const cancelAdd = () => {
  showAddDialog.value = false
  editingStrategy.value = null
  strategyForm.value = {
    name: '',
    symbol: '',
    period: '',
    strategyType: '',
    description: '',
    config: {},
    enableOnCreate: false
  }
  if (form.value) {
    form.value.reset()
  }
}

// 折叠控制方法
const toggleSection = (symbol: string) => {
  if (collapsedSections.value.has(symbol)) {
    collapsedSections.value.delete(symbol)
  } else {
    collapsedSections.value.add(symbol)
  }
}

// 策略类型变化时初始化配置字段
watch(
  () => strategyForm.value.strategyType,
  (newType) => {
    if (newType) {
      const selectedStrategy = strategyInfos.value.find(info => info.type === newType)
      if (selectedStrategy) {
        // 初始化配置字段的默认值
        const defaultConfig: Record<string, any> = {}
        Object.entries(selectedStrategy.config).forEach(([key, fieldConfig]) => {
          defaultConfig[key] = fieldConfig.defaultValue
        })
        strategyForm.value.config = defaultConfig
      }
    } else {
      strategyForm.value.config = {}
    }
  }
)

// 初始化数据
onMounted(async () => {
  //加载socket连接
  await socketService.connect()
  //订阅策略更新消息
  socketService.subscribe(`strategy:update:${userStore.userId}`, (data: Partial<Strategy>) => {
    console.log('收到策略更新通知:', data)
    // 可以根据需要刷新策略列表
    let id = data.id;
    if (!id) return;
    const strategy = strategies.value.find(s => s.id === id)
    if (strategy) {
      strategy.direction = data.direction || strategy.direction
    }
  })

  // 先加载策略配置
  await loadStrategyConfigs()
  // 再加载演示数据
  loadListData()
})


onUnmounted(() => {
  socketService.unsubscribe([`strategy:update:${userStore.userId}`])
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
