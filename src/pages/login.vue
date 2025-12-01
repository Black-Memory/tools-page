<template>
  <v-app>
    <v-main>
      <div class="login-container">
        <v-card class="login-card" max-width="400" elevation="8">
      <v-card-title class="text-center">
        <h2>用户登录</h2>
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="valid">
          <v-text-field v-model="loginForm.username" label="用户名" prepend-inner-icon="mdi-account" :rules="usernameRules"
            required variant="outlined" class="mb-3" />

          <v-text-field v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" label="密码"
            prepend-inner-icon="mdi-lock" :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            :rules="passwordRules" required variant="outlined" class="mb-3"
            @click:append-inner="showPassword = !showPassword" @keyup.enter="handleLogin" />

          <v-checkbox v-model="loginForm.rememberMe" label="记住我" class="mb-3" />
        </v-form>

        <!-- 错误提示 -->
        <v-alert v-if="errorMessage" type="error" class="mt-3">
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn :loading="loading" :disabled="!valid" color="primary" size="large" block @click="handleLogin">
          登录
        </v-btn>
      </v-card-actions>
    </v-card>
      </div>
    </v-main>
  </v-app>
</template>

<route lang="yaml">
meta:
  layout: false
</route>

<script setup lang="ts">
import { AuthAPI } from '@/api/auth'
import { ApiError } from '@/utils/request'
import { StorageUtil } from '@/utils/storage'
import { useUserStore } from '@/stores/user'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface LoginForm {
  username: string
  password: string
  rememberMe: boolean
}

const router = useRouter()
const userStore = useUserStore()
const form = ref()
const valid = ref(false)
const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

const loginForm = ref<LoginForm>({
  username: '',
  password: '',
  rememberMe: false
})

// 表单验证规则
const usernameRules = [
  (v: string) => !!v || '用户名不能为空',
  (v: string) => v.length >= 3 || '用户名至少3个字符'
]

const passwordRules = [
  (v: string) => !!v || '密码不能为空',
  (v: string) => v.length >= 6 || '密码至少6个字符'
]




// 登录处理
async function handleLogin() {
  if (!valid.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    // 调用登录 API
    const response = await AuthAPI.login({
      username: loginForm.value.username,
      password: loginForm.value.password
    })

    // 保存用户信息到store
    if (response.code === 0 && response.data) {
      userStore.setUserInfo(response.data)
      console.log('用户登录成功，ID:', userStore.userId)
    }

    // 保存登录凭据
    StorageUtil.saveCredentials(
      loginForm.value.username,
      loginForm.value.password,
      loginForm.value.rememberMe
    )

    // 跳转到目标页面
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/')

  } catch (error) {
    console.error('登录失败:', error)

    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = '登录失败，请重试'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 页面加载时可以预填充用户名等
  const savedCredentials = StorageUtil.getCredentials()
 if (savedCredentials) {
    loginForm.value.username = savedCredentials.username
    loginForm.value.password = savedCredentials.password
    loginForm.value.rememberMe = savedCredentials.rememberMe
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.login-card {
  width: 100%;
}
</style>
