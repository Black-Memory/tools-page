import { defineStore } from 'pinia'
import { ref } from 'vue'
import { UserAPI } from '@/api/user'
import { MonitorAPI } from '@/api/monitor'

export const useDingDingStore = defineStore('dingding', () => {
  const configs = ref<any[]>([])

  const fetchConfigs = async () => {
    try {
      const res = await UserAPI.getDingDingConfigs()
      if (res.code === 0 && res.data) configs.value = res.data
      return res
    } catch (e) {
      console.error('fetch dingding configs failed', e)
      throw e
    }
  }

  const createConfig = async (data: Partial<any>) => {
    const res = await UserAPI.createDingDingConfig(data)
    if (res.code === 0 && res.data) {
      await fetchConfigs()
    }
    return res
  }

  const deleteConfig = async (id: string) => {
    const res = await UserAPI.deleteDingDingConfig(id)
    if (res.code === 0) {
      await fetchConfigs()
      // 清除已经存在的监控中引用到已删除 dingdingId 的字段
      try {
        const monRes = await MonitorAPI.findAll()
        if (monRes.code === 0 && monRes.data) {
          const toUpdate = monRes.data.filter((m: any) => m.dingdingId === id)
          if (toUpdate.length > 0) {
            await Promise.all(
              toUpdate.map((m: any) => MonitorAPI.update(m.id, { dingdingId: null }))
            )
          }
        }
      } catch (e) {
        console.error('清理监控中已删除的 dingdingId 失败', e)
      }
      // 通知前端监听者（例如监控页面）刷新监控列表或相关字段
      try {
        window.dispatchEvent(new CustomEvent('dingding:configs-updated'))
      } catch (e) {
        console.warn('无法触发全局事件 dingding:configs-updated', e)
      }
    }
    return res
  }

  return {
    configs,
    fetchConfigs,
    createConfig,
    deleteConfig
  }
})
