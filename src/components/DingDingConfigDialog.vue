<template>
  <v-dialog v-model="localModel" max-width="700">
    <v-card>
      <v-card-title class="text-h6">DingDing 配置</v-card-title>
      <v-card-text>
        <div>
          <v-table class="dd-table">
            <thead>
              <tr>
                <th class="text-left">备注</th>
                <th class="text-left">Access Token</th>
                <th class="text-left">Secret</th>
                <th class="text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in configs" :key="item.dingdingId">
                <td>{{ item.remark || item.dingdingId }}</td>
                <td class="text-truncate">
                  <span :title="item.accessToken">{{ maskValue(item.accessToken) }}</span>
                </td>
                <td class="text-truncate">
                  <span :title="item.secret">{{ maskValue(item.secret) }}</span>
                </td>
                <td>
                  <v-btn icon size="small" color="error" @click="removeConfig(item)" title="删除">
                    <v-icon size="18">mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
              <tr v-if="configs.length === 0">
                <td colspan="4" class="text-center text-medium-emphasis">暂无钉钉配置</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <v-divider class="my-4" />

        <div class="d-flex align-center">
          <v-text-field v-model="form.remark" label="备注" class="mr-3" hide-details dense />
          <v-text-field v-model="form.accessToken" label="Access Token" class="mr-3" hide-details dense />
          <v-text-field v-model="form.secret" label="Secret" class="mr-3" hide-details dense />
          <v-btn color="primary" @click="addConfig">新增</v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDingDingStore } from '@/stores/dingding'
import { showErrorMessage, showSuccessMessage } from '@/composables/snackbar'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

const localModel = ref(props.modelValue)
watch(() => props.modelValue, (v) => (localModel.value = v))
watch(localModel, (v) => emit('update:modelValue', v))

const dingdingStore = useDingDingStore()
const { configs } = storeToRefs(dingdingStore)
const form = ref({ remark: '', accessToken: '', secret: '' })

const loadConfigs = async () => {
  try {
    await dingdingStore.fetchConfigs()
  } catch (e) {
    console.error('获取钉钉配置异常', e)
    showErrorMessage('网络错误，无法获取钉钉配置')
  }
}

const addConfig = async () => {
  if (!form.value.accessToken) return showErrorMessage('请输入 access token')
  if (!form.value.secret) return showErrorMessage('请输入 secret')
  try {
    const res = await dingdingStore.createConfig({ remark: form.value.remark, accessToken: form.value.accessToken, secret: form.value.secret })
    if (res.code === 0) {
      showSuccessMessage('新增成功')
      form.value.remark = ''
      form.value.accessToken = ''
      form.value.secret = ''
    } else {
      showErrorMessage(res.message || '新增失败')
    }
  } catch (e) {
    console.error('新增钉钉异常', e)
    showErrorMessage('网络错误，操作失败')
  }
}

const removeConfig = async (item: any) => {
  if (!item || !item.dingdingId) return
  try {
    const res = await dingdingStore.deleteConfig(item.dingdingId)
    if (res.code === 0) {
      showSuccessMessage('删除成功')
    } else {
      showErrorMessage(res.message || '删除失败')
    }
  } catch (e) {
    console.error('删除钉钉异常', e)
    showErrorMessage('网络错误，操作失败')
  }
}

const close = () => (localModel.value = false)

const maskValue = (val: string | undefined | null) => {
  if (!val) return ''
  const s = String(val)
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}...${s.slice(-6)}`
}

// copyValue removed per UX decision (no copy buttons)

onMounted(() => {
  if (localModel.value) loadConfigs()
})

watch(localModel, (v) => {
  if (v) loadConfigs()
})
</script>

<style scoped>
.text-truncate {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
