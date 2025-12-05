<template>
  <v-app>
    <!-- 应用栏 -->
    <v-app-bar app>
      <v-app-bar-nav-icon @click="toggleSidebar"></v-app-bar-nav-icon>
      <v-toolbar-title>工具集合</v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Socket 状态指示器 -->
      <v-tooltip :text="socketStatusText" location="bottom">
        <template v-slot:activator="{ props }">
          <div v-bind="props" class="socket-status-dot" :class="socketStatusColor">
          </div>
        </template>
      </v-tooltip>

      <!-- 主题切换按钮 -->
      <v-btn
        icon
        @click="toggleTheme"
        :title="theme.global.current.value.dark ? '切换到亮色主题' : '切换到暗色主题'"
      >
        <v-icon>
          {{ theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
        </v-icon>
      </v-btn>

      <!-- 用户菜单 -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-account-circle</v-icon>
          </v-btn>
        </template>
        <v-list>
          <!-- <v-list-item>
            <v-list-item-title>个人资料</v-list-item-title>
          </v-list-item> -->
          <!-- <v-list-item>
            <v-list-item-title>设置</v-list-item-title>
          </v-list-item> -->
          <v-divider></v-divider>
          <v-list-item
            @click="handleLogout"
            class="logout-btn"
          >
            <template v-slot:prepend>
              <v-icon class="logout-icon">mdi-logout</v-icon>
            </template>
            <v-list-item-title class="logout-text">
              退出登录
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- 侧边导航 -->
    <AppSidebar ref="sidebarRef" />

    <!-- 主要内容区域 -->
    <v-main>
      <v-container fluid class="main-container">
        <router-view />
      </v-container>
    </v-main>

    <!-- <AppFooter /> -->
  </v-app>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import AppSidebar from '@/components/AppSidebar.vue'
import { socketService } from '@/utils/socket'

const sidebarRef = ref<InstanceType<typeof AppSidebar> | null>(null)
const theme = useTheme()
const router = useRouter()
const userStore = useUserStore()

// Socket 状态管理
const socketConnected = ref(false)

// Socket 事件处理函数
const onSocketConnect = () => {
  socketConnected.value = true
}

const onSocketDisconnect = () => {
  socketConnected.value = false
}

// Socket 状态计算属性
const socketStatusColor = computed(() => {
  return socketConnected.value ? 'success' : 'error'
})

const socketStatusText = computed(() => {
  return socketConnected.value ? 'WebSocket已连接' : 'WebSocket未连接'
})



// 从localStorage加载保存的主题
onMounted(async () => {
  const savedTheme = localStorage.getItem('app-theme')
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    theme.change(savedTheme)
  }

  // 初始化Socket连接状态
  socketConnected.value = socketService.isConnected()

  // 自动连接Socket
  try {
    await socketService.connect()
    console.log('Socket自动连接成功')

    // 连接成功后设置事件监听
    socketService.on('connect', onSocketConnect)
    socketService.on('disconnect', onSocketDisconnect)

    // 更新连接状态
    socketConnected.value = socketService.isConnected()
  } catch (error) {
    console.error('Socket自动连接失败:', error)
  }
})

// 切换侧边栏显示/隐藏
const toggleSidebar = () => {
  if (sidebarRef.value) {
    sidebarRef.value.drawer = !sidebarRef.value.drawer
  }
}

// 切换主题
const toggleTheme = () => {
  const newTheme = theme.global.current.value.dark ? 'light' : 'dark'
  theme.change(newTheme)
  // 保存主题选择到localStorage
  localStorage.setItem('app-theme', newTheme)
}

// 退出登录处理
const handleLogout = async () => {
  await userStore.logout()
  // 跳转到登录页面
  router.push('/login')
}

// 组件销毁时清理
onUnmounted(() => {
  // 移除Socket事件监听
  socketService.off('connect', onSocketConnect)
  socketService.off('disconnect', onSocketDisconnect)
})
</script>

<style scoped>
.main-container {
  height: calc(100vh - 64px); /* 减去应用栏高度 */
  overflow-y: auto;
  overflow-x: hidden;
}

/* 退出登录按钮样式 */
.logout-btn {
  color: rgb(var(--v-theme-error)) !important;
  transition: background-color 0.2s ease;
}

.logout-btn:hover {
  background-color: rgba(var(--v-theme-error), 0.1) !important;
}

.logout-icon {
  color: rgb(var(--v-theme-error)) !important;
}

.logout-text {
  color: rgb(var(--v-theme-error)) !important;
  font-weight: 500;
}

/* Socket状态指示点样式 */
.socket-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 16px;
  transition: all 0.3s ease;
}

.socket-status-dot.success {
  background-color: rgb(var(--v-theme-success));
  box-shadow: 0 0 6px rgba(var(--v-theme-success), 0.6);
}

.socket-status-dot.error {
  background-color: rgb(var(--v-theme-error));
  box-shadow: 0 0 6px rgba(var(--v-theme-error), 0.6);
}
</style>
