<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500">
    <v-card>
      <v-card-title class="text-h5">
        {{ monitor ? '编辑监控' : '创建监控' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-select v-model="formData.source" label="来源" :items="sourceOptions" :rules="[v => !!v || '来源不能为空']" required variant="outlined" class="mb-3" />

          <v-text-field
            v-if="formData.source === 'Telegram'"
            v-model="formData.monitorUser"
            label="群组链接"
            :rules="[v => !!v || '群组链接不能为空']"
            required
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-else
            v-model="formData.monitorUser"
            label="监控用户"
            :rules="[v => !!v || '监控用户不能为空']"
            required
            variant="outlined"
            class="mb-3"
          />

          <v-combobox
            v-if="formData.source === 'Telegram'"
            v-model="formData.filter"
            label="筛选关键词（可多个）"
            multiple
            chips
            clearable
            variant="outlined"
            class="mb-3"
          />

          <v-combobox
            v-if="formData.source === 'Telegram'"
            v-model="formData.fromUsers"
            label="筛选用户（可多个）"
            multiple
            chips
            clearable
            variant="outlined"
            class="mb-3"
          />

          <v-select v-model="formData.dingdingId" :items="dingdingOptions" item-title="label" item-value="value" label="钉钉机器人(可选)" clearable variant="outlined" class="mb-3" />

          <v-textarea v-model="formData.remark" label="备注" variant="outlined" rows="3" class="mb-3" />

          <v-switch v-model="formData.pushEnabled" label="开启推送" color="primary" hide-details />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="handleCancel">取消</v-btn>
        <v-btn color="primary" :disabled="!valid" :loading="loading" @click="handleSave">
          {{ monitor ? '更新' : '创建' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import type { Monitor } from '@/types/interface'
import { ref, watch, nextTick, computed } from 'vue'

interface Props {
  modelValue: boolean
  monitor?: Monitor | null
  loading?: boolean
  dingdingConfigs?: Array<any>
}

const props = withDefaults(defineProps<Props>(), {
  monitor: null,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: any]
  'cancel': []
}>()

const form = ref()
const valid = ref(false)

const sourceOptions = ['Hyperbot', 'Telegram']

const dingdingOptions = computed(() => {
  const list = props.dingdingConfigs || []
  const items: Array<{ label: string; value: string }> = []
  for (const c of list) {
    items.push({ label: c.remark || c.dingdingId, value: c.dingdingId })
  }
  return items
})

interface MonitorFormData {
  monitorUser: string;
  source: string;
  pushEnabled: boolean;
  remark: string;
  filter: string[];
  fromUsers: string[];
  dingdingId?: string | null;
}

const formData = ref<MonitorFormData>({
  monitorUser: '',
  source: '',
  pushEnabled: true,
  remark: '',
  filter: [],
  fromUsers: []
});
function initForm() {
  if (props.monitor) {
    formData.value = {
      monitorUser: props.monitor.monitorUser,
      source: props.monitor.source,
      pushEnabled: props.monitor.pushEnabled,
      remark: props.monitor.remark || '',
      filter: props.monitor.filter || [],
      fromUsers: props.monitor.fromUsers || [],
      dingdingId: (props.monitor as any).dingdingId || ''
    };
  } else {
    formData.value = {
      monitorUser: '',
      source: '',
      pushEnabled: true,
      remark: '',
      filter: [],
      fromUsers: [],
      dingdingId: ''
    };
  }
}

// 监听 monitor 变化
watch(() => props.monitor, () => {
  initForm()
}, { immediate: true })

// 监听 dialog 打开
watch(() => props.modelValue, (val) => {
  if (val) {
    nextTick(() => {
      initForm()
      form.value?.resetValidation()
    })
  }
})

const handleSave = () => {
  if (!valid.value) return
  emit('save', { ...formData.value })
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
