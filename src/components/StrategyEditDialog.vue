<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600"
    persistent
    :fullscreen="$vuetify.display.xs"
  >
    <v-card>
      <v-card-title class="text-h5">
        {{ strategy ? '编辑策略' : '添加新策略' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-text-field
            v-model="strategyForm.name"
            label="策略名称"
            :rules="nameRules"
            required
            variant="outlined"
            class="mb-3"
          />

          <v-select
            v-model="strategyForm.symbol"
            :items="symbolOptions"
            label="交易对"
            :rules="symbolRules"
            required
            variant="outlined"
            class="mb-3"
          />

          <v-select
            v-model="strategyForm.period"
            :items="periodOptions"
            label="时间周期"
            :rules="periodRules"
            required
            variant="outlined"
            class="mb-3"
          />

          <v-select
            v-model="strategyForm.strategyType"
            :items="strategyTypeOptions"
            item-title="title"
            item-value="value"
            label="策略类型"
            :rules="strategyTypeRules"
            required
            variant="outlined"
            class="mb-3"
          />

          <!-- 策略配置参数 - 动态生成 -->
          <div v-if="strategyForm.strategyType && configFieldGroups.length > 0" class="mb-3">
            <v-row v-for="(group, groupIndex) in configFieldGroups" :key="groupIndex" class="mb-2">
              <v-col v-for="[fieldKey, fieldConfig] in group" :key="fieldKey" cols="6">
                <!-- 数字类型输入 -->
                <v-text-field
                  v-if="fieldConfig.type === 'number'"
                  v-model.number="strategyForm.config[fieldKey]"
                  :label="fieldConfig.label"
                  type="number"
                  :min="fieldConfig.min"
                  :max="fieldConfig.max"
                  :required="fieldConfig.required"
                  variant="outlined"
                  :rules="getFieldRules(fieldConfig)"
                />

                <!-- 字符串类型输入 -->
                <v-text-field
                  v-else-if="fieldConfig.type === 'string'"
                  v-model="strategyForm.config[fieldKey]"
                  :label="fieldConfig.label"
                  :required="fieldConfig.required"
                  variant="outlined"
                  :rules="getFieldRules(fieldConfig)"
                />

                <!-- 选择类型输入 -->
                <v-select
                  v-else-if="fieldConfig.type === 'select'"
                  v-model="strategyForm.config[fieldKey]"
                  :items="fieldConfig.options || []"
                  item-title="label"
                  item-value="value"
                  :label="fieldConfig.label"
                  :required="fieldConfig.required"
                  variant="outlined"
                  :rules="getFieldRules(fieldConfig)"
                />

                <!-- 布尔类型输入 -->
                <v-checkbox
                  v-else-if="fieldConfig.type === 'boolean'"
                  v-model="strategyForm.config[fieldKey]"
                  :label="fieldConfig.label"
                  :required="fieldConfig.required"
                />
              </v-col>
            </v-row>
          </div>

          <v-textarea
            v-model="strategyForm.description"
            label="策略描述（可选）"
            variant="outlined"
            rows="3"
            class="mb-3"
          />

          <!-- 开启运行选项 -->
          <v-checkbox
            v-model="strategyForm.enableOnCreate"
            label="开启运行"
            color="primary"
            class="mb-3"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="handleCancel">取消</v-btn>
        <v-btn
          color="primary"
          :disabled="!valid"
          :loading="loading"
          @click="handleSave"
        >
          {{ strategy ? '更新' : '添加' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import type { Strategy, StrategyInfo } from '@/types/interface'
import { ref, computed, watch, nextTick } from 'vue'

// Props
interface Props {
  modelValue: boolean
  strategy?: Strategy | null
  strategyInfos: StrategyInfo[]
  symbolOptions: string[]
  periodOptions: string[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  strategy: null,
  loading: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: any]
  'cancel': []
}>()

// 表单引用和验证状态
const form = ref()
const valid = ref(false)

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

// 计算属性 - 策略类型选项
const strategyTypeOptions = computed(() => {
  return props.strategyInfos.map(info => ({
    title: info.desc,
    value: info.type
  }))
})

// 计算属性 - 当前策略的配置信息
const currentStrategyConfig = computed(() => {
  const selectedStrategy = props.strategyInfos.find(info => info.type === strategyForm.value.strategyType)
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

// 处理保存
const handleSave = async () => {
  if (!valid.value) return

  const formData = {
    name: strategyForm.value.name,
    symbol: strategyForm.value.symbol,
    period: strategyForm.value.period,
    strategyType: strategyForm.value.strategyType,
    description: strategyForm.value.description,
    config: { ...strategyForm.value.config },
    enableOnCreate: strategyForm.value.enableOnCreate
  }

  emit('save', formData)
}

// 处理取消
const handleCancel = () => {
  resetForm()
  emit('cancel')
}

// 重置表单
const resetForm = () => {
  strategyForm.value = {
    name: '',
    symbol: '',
    period: '',
    strategyType: '',
    description: '',
    config: {},
    enableOnCreate: true
  }
  if (form.value) {
    form.value.reset()
  }
}

// 初始化表单数据
const initForm = (strategy?: Strategy | null) => {
  if (strategy) {
    strategyForm.value = {
      name: strategy.name,
      symbol: strategy.symbol,
      period: strategy.period,
      strategyType: strategy.strategyType,
      description: strategy.description || '',
      config: { ...strategy.strategyConfig },
      enableOnCreate: strategy.status === 'running'
    }
  } else {
    resetForm()
  }
}

// 监听策略变化
watch(() => props.strategy, (newStrategy) => {
  initForm(newStrategy)
}, { immediate: true })

// 监听对话框打开状态
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      initForm(props.strategy)
    })
  }
})

// 策略类型变化时初始化配置字段
watch(
  () => strategyForm.value.strategyType,
  (newType) => {
    if (newType) {
      const selectedStrategy = props.strategyInfos.find(info => info.type === newType)
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
</script>
