<template>
  <v-dialog v-model="show" max-width="500">
    <v-card>
      <v-card-title class="text-h5">Telegram 配置</v-card-title>
      <v-card-text>
        <div v-if="telegram">
          <v-text-field label="App ID" v-model="form.appId" variant="outlined" readonly />
          <v-text-field label="App Hash" v-model="form.appHash" variant="outlined" readonly />
          <v-text-field label="手机号" v-model="form.phoneNumber" variant="outlined" readonly />
          <v-text-field label="Session" v-model="form.session" variant="outlined" readonly />

        </div>

        <div v-else>
          <div class="text-medium-emphasis mb-2">暂无 Telegram 配置信息</div>
          <v-btn color="primary" @click="showCreate = true">创建配置</v-btn>
        </div>
        <v-dialog v-model="showCreate" max-width="500">
          <v-card>
            <v-card-title class="text-h6">创建 Telegram 配置</v-card-title>
            <v-card-text>
              <v-form ref="formRef" v-model="valid">
                <v-text-field label="App ID" v-model="form.appId" :rules="[v => !!v || '必填']" required variant="outlined" />
                <v-text-field label="App Hash" v-model="form.appHash" :rules="[v => !!v || '必填']" required
                  variant="outlined" />
                <v-text-field label="手机号" v-model="form.phoneNumber" :rules="[v => !!v || '必填']" required
                  variant="outlined" />
                <v-text-field label="验证码" v-model="code" :rules="[v => !!v || '必填']" required variant="outlined"
                  :append-inner="false">
                  <template #append-inner>
                    <v-btn size="small" :loading="sendingCode"
                      :disabled="!form.appId || !form.appHash || !form.phoneNumber || sendingCode || countdown > 0"
                      @click="sendCode">
                      {{ countdown > 0 ? `${countdown}s后重试` : '获取验证码' }}
                    </v-btn>
                  </template>
                </v-text-field>
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="showCreate = false">取消</v-btn>
              <v-btn color="primary" :disabled="!valid || !code" @click="loginWithCode">登录</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <template v-if="telegram">
          <v-btn color="error" @click="deleteTelegramConfig">删除配置</v-btn>
        </template>
        <v-btn @click="close">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, reactive } from 'vue'
import { TelegramAPI } from '@/api/telegram'
import { useUserStore } from '@/stores/user'
import { showErrorMessage, showSuccessMessage } from '@/composables/snackbar'
const userStore = useUserStore()
const code = ref('')
const sendingCode = ref(false)
const countdown = ref(0)
let timer: any = null
import type { UserInfo } from '@/types/api'

const props = defineProps<{
  modelValue: boolean
  telegram?: UserInfo['telegram']
}>()
const emit = defineEmits(['update:modelValue'])

const show = ref(props.modelValue)
watch(() => props.modelValue, v => show.value = v)
watch(show, v => emit('update:modelValue', v))


const form = reactive({
  appId: props.telegram?.appId || '',
  appHash: props.telegram?.appHash || '',
  phoneNumber: props.telegram?.phoneNumber || '',
  session: props.telegram?.session || ''
})

const showCreate = ref(false)
const valid = ref(false)
const formRef = ref()

const sendCode = async () => {
  if (!form.appId || !form.appHash || !form.phoneNumber) return
  sendingCode.value = true
  try {
    const res = await TelegramAPI.sendCode({
      appId: form.appId,
      appHash: form.appHash,
      phoneNumber: form.phoneNumber
    })
    if (res.code === 0) {
      countdown.value = 60
      timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      showErrorMessage(res.message || '发送验证码失败')
    }
  } catch (e) {
    showErrorMessage('网络错误，发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

const loginWithCode = async () => {
  if (!form.appId || !form.appHash || !form.phoneNumber || !code.value) return
  try {
    const res = await TelegramAPI.loginWithCode({
      appId: form.appId,
      appHash: form.appHash,
      phoneNumber: form.phoneNumber,
      code: code.value
    })
    if (res.code === 0 && res.data?.session) {
      // 更新用户信息
      const updateRes = await userStore.updateUserInfo({ telegram: { ...form, session: res.data.session } })
      if (updateRes) {
        showSuccessMessage('配置成功')
        showCreate.value = false
        // 关闭主弹窗
        show.value = false
      } else {
        showErrorMessage('用户信息更新失败')
      }
    } else {
      showErrorMessage(res.message || '登录失败')
    }
  } catch (e) {
    showErrorMessage('网络错误，登录失败')
  }
}

const deleteTelegramConfig = async () => {
  try {
    const updateRes = await userStore.updateUserInfo({ telegram: undefined })
    if (updateRes) {
      showSuccessMessage('已删除Telegram配置')
      show.value = false
    } else {
      showErrorMessage('删除失败')
    }
  } catch (e) {
    showErrorMessage('网络错误，删除失败')
  }
}

const close = () => {
  show.value = false
}
</script>
