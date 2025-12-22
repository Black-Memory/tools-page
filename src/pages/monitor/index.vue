<template>
  <div class="monitor-page">
    <!-- 标题栏 -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-monitor-dashboard</v-icon>
            <h2 class="text-h5 font-weight-bold">监控面板</h2>
          </div>
          <div>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="createMonitor">
              创建监控
            </v-btn>
            <v-btn color="info" prepend-icon="mdi-telegram" class="ml-2" @click="showTelegramConfig = true">
              Telegram配置
            </v-btn>
          </div>

        </div>
      </v-card-text>
    </v-card>

    <!-- 监控列表表格 -->
    <v-card elevation="2">
      <v-table>
        <thead>
          <tr>
            <th class="text-left">用户</th>
            <th class="text-left">来源</th>
            <th class="text-left">状态</th>
            <th class="text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in monitors" :key="item.id">
            <td>
              <div class="d-flex flex-column">
                <span class="font-weight-medium">{{ item.remark || item.monitorUser }}</span>
                <span v-if="item.remark" class="text-caption text-medium-emphasis">{{ item.monitorUser }}</span>
              </div>
            </td>
            <td>
              <v-chip size="small" variant="outlined" color="primary">
                {{ item.source }}
              </v-chip>
            </td>
            <td>
              <v-chip :color="item.pushEnabled ? 'success' : 'grey'" size="small" label>
                {{ item.pushEnabled ? '运行中' : '已停止' }}
              </v-chip>
            </td>
            <td>
              <div class="d-flex align-center ga-2">
                <v-btn size="small" :color="item.pushEnabled ? 'warning' : 'success'" variant="text"
                  :icon="item.pushEnabled ? 'mdi-stop' : 'mdi-play'" @click="toggleStatus(item)"
                  :title="item.pushEnabled ? '停止' : '开启'"></v-btn>
                <v-btn size="small" color="primary" variant="text" icon="mdi-pencil" @click="editMonitor(item)"
                  title="编辑"></v-btn>
                <v-btn size="small" color="error" variant="text" icon="mdi-delete" @click="deleteMonitor(item)"
                  title="删除"></v-btn>
              </div>
            </td>
          </tr>
          <tr v-if="monitors.length === 0">
            <td colspan="4" class="text-center py-8 text-medium-emphasis">
              暂无监控数据
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- 编辑/创建对话框 -->
    <MonitorEditDialog v-model="showEditDialog" :monitor="editingMonitor" @save="handleSave"
      @cancel="showEditDialog = false" />

    <!-- 删除确认对话框 -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">确认删除</v-card-title>
        <v-card-text>
          确定要删除监控 "{{ deletingMonitor?.remark || deletingMonitor?.monitorUser }}" 吗？此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">取消</v-btn>
          <v-btn color="error" @click="confirmDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 提示消息已全局化，无需本地snackbar -->
    <!-- Telegram配置弹窗 -->
    <TelegramConfigDialog v-model="showTelegramConfig" :telegram="userInfo?.telegram" />
  </div>
</template>

<script lang="ts" setup>
import type { Monitor } from '@/types/interface'
import { ref, onMounted } from 'vue'
import { showErrorMessage, showSuccessMessage } from '@/composables/snackbar'
import MonitorEditDialog from '@/components/MonitorEditDialog.vue'
import TelegramConfigDialog from '@/components/TelegramConfigDialog.vue'
import { MonitorAPI } from '@/api/monitor'
import { useUserStore } from '@/stores/user'

const monitors = ref<Monitor[]>([])
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const editingMonitor = ref<Monitor | null>(null)
const deletingMonitor = ref<Monitor | null>(null)

// Telegram配置弹窗状态
const showTelegramConfig = ref(false)

// 用户信息
const userStore = useUserStore()
const userInfo = ref(userStore.userInfo)



// 加载监控列表
const loadMonitors = async () => {
  try {
    const res = await MonitorAPI.findAll()
    if (res.code === 0 && res.data) {
      monitors.value = res.data
    } else {
      showErrorMessage(res.message || '加载监控列表失败')
    }
  } catch (error) {
    console.error('加载监控列表异常:', error)
    showErrorMessage('网络错误，无法加载监控列表')
  }
}

const createMonitor = () => {
  editingMonitor.value = null
  showEditDialog.value = true
}

const editMonitor = (item: Monitor) => {
  editingMonitor.value = item
  showEditDialog.value = true
}

const handleSave = async (data: any) => {
  try {
    if (editingMonitor.value) {
      // 编辑模式
      const res = await MonitorAPI.update(editingMonitor.value.id, data)
      if (res.code === 0) {
        showSuccessMessage('更新监控成功')
        loadMonitors() // 重新加载列表
        showEditDialog.value = false
      } else {
        showErrorMessage(res.message || '更新监控失败')
      }
    } else {
      // 创建模式
      const res = await MonitorAPI.create(data)
      if (res.code === 0) {
        showSuccessMessage('创建监控成功')
        loadMonitors() // 重新加载列表
        showEditDialog.value = false
      } else {
        showErrorMessage(res.message || '创建监控失败')
      }
    }
  } catch (error) {
    console.error('保存监控异常:', error)
    showErrorMessage('网络错误，操作失败')
  }
}

const deleteMonitor = (item: Monitor) => {
  deletingMonitor.value = item
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!deletingMonitor.value) return

  try {
    const res = await MonitorAPI.remove(deletingMonitor.value.id)
    if (res.code === 0) {
      showSuccessMessage('删除监控成功')
      loadMonitors()
    } else {
      showErrorMessage(res.message || '删除监控失败')
    }
  } catch (error) {
    console.error('删除监控异常:', error)
    showErrorMessage('网络错误，操作失败')
  } finally {
    showDeleteDialog.value = false
    deletingMonitor.value = null
  }
}

const toggleStatus = async (item: Monitor) => {
  try {
    const newStatus = !item.pushEnabled
    const res = await MonitorAPI.update(item.id, { pushEnabled: newStatus })
    if (res.code === 0) {
      item.pushEnabled = newStatus
      showSuccessMessage(`已${newStatus ? '开启' : '停止'}推送`)
    } else {
      showErrorMessage(res.message || '更新状态失败')
    }
  } catch (error) {
    console.error('更新状态异常:', error)
    showErrorMessage('网络错误，操作失败')
  }
}

onMounted(async () => {
  loadMonitors()
  // 获取用户信息（优先本地，否则请求）
  // if (!userStore.userInfo) {
  await userStore.fetchUserInfo()
  // }
  userInfo.value = userStore.userInfo
})
</script>

<style scoped>
.monitor-page {
  padding: 16px;
  max-width: 100%;
}
</style>
