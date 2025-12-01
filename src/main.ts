/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Stores
import { useUserStore } from '@/stores/user'

// Styles
import 'unfonts.css'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')

// 应用挂载后初始化用户状态
app.runWithContext(() => {
  const userStore = useUserStore()
  // 尝试从localStorage恢复用户信息
  if (userStore.restoreUserInfo()) {
    console.log('用户状态已恢复，用户ID:', userStore.userId)
    // 可选：验证token有效性
    userStore.validateToken().then(isValid => {
      if (!isValid) {
        console.log('Token已过期，请重新登录')
      }
    })
  }
})
