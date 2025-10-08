<template>
  <div class="container">
    <h1>V1.0</h1>
    <v-form style="width: 100%;">
      <v-text-field v-model="formData.rpcUrl" label="RPC" />
      <v-text-field
        v-model="formData.privateKey"
        :append-icon="show1 ? 'mdi-eye' : 'mdi-eye-off'"
        label="私钥"
        :type="show1 ? 'text' : 'password'"
        @click:append="show1 = !show1"
      />
      <v-text-field v-model="formData.amount" label="数量" type="number" />
      <v-text-field v-model="formData.gasLimit" label="GasLimit" type="number" />
      <v-text-field v-model="formData.gasPrice" label="GasPrice" type="number" />
      <v-btn :color="running ? 'red' : 'light-blue'" size="x-large" @click="submitForm">{{ running ? "关闭" : "启动" }} </v-btn>
    </v-form>
    <v-textarea
      v-model="logs"
      class="log-panel"
      disabled
      label="日志"
      :value="logsText"
      variant="outlined"
    />

  </div>
</template>

<script setup lang="ts">
// 可按需导入组件/逻辑

  import type { DepositForm } from '@/types/interface'
  import { computed, onMounted, ref } from 'vue'
  import { deposit } from '@/lib/deposit'

  const formData = ref<DepositForm>({
    rpcUrl: 'https://arbitrum-one-public.nodies.app',
    privateKey: '',
    amount: 0,
    gasLimit: 210_000,
    gasPrice: 0.01,
  })

  const running = ref(false)
  const show1 = ref(false)

  const logs = ref<string[]>([])
  const logsText = computed(() => logs.value.join('\n'))

  onMounted(() => {
    // 初始化逻辑
    // 加载localhost缓存数据
    const cachedData = localStorage.getItem('depositFormData')
    if (cachedData) {
      formData.value = JSON.parse(cachedData)
    }
  })

  // 监听表单数据变化并保存到缓存
  watch(
    formData,
    newVal => {
      localStorage.setItem('depositFormData', JSON.stringify(newVal))
    },
    { deep: true },
  )

  let stopFunc: Function | null = null
  function submitForm () {
    running.value = !running.value
    if (!running.value) {
      stopFunc && stopFunc()
      logs.value.push('任务已停止')
      return
    }
    // 这里可以添加实际的提交逻辑，比如调用API等
    logs.value.push('开始任务...')
    try {
      stopFunc = deposit(formData.value, log => {
        logs.value.push(log)
      }, error => {
        logs.value.push(`发生错误: ${error}`)
        running.value = false
      })
    } catch (error) {
      logs.value.push(`发生错误: ${error}`)
      running.value = false
    }
  }

</script>

<style>
.container {
  padding: 50px;
  display: flex;
  width: 100%;
  flex-direction: column;
  height: 100%;
}

.log-panel {
  flex: 1;
  margin-top: 20px;
}
</style>
