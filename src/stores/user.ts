import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoginResponse, UserInfo } from '@/types/api'
import { AuthAPI } from '@/api/auth'
import { UserAPI } from '@/api/user'



export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string>('')
  const isLoggedIn = ref(false)

  // 计算属性
  const userId = computed(() => userInfo.value?._id || null)
  const username = computed(() => userInfo.value?.username || '')
  const email = computed(() => userInfo.value?.email || '')

  // 设置用户信息
  const setUserInfo = (loginResponse: LoginResponse) => {
    userInfo.value = loginResponse.user
    token.value = loginResponse.token
    isLoggedIn.value = true

    // 保存到localStorage
    localStorage.setItem('userInfo', JSON.stringify(loginResponse.user))
    localStorage.setItem('token', loginResponse.token)
  }

  // 清除用户信息
  const clearUserInfo = () => {
    userInfo.value = null
    token.value = ''
    isLoggedIn.value = false

    // 清除localStorage
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
  }

  // 从localStorage恢复用户信息
  const restoreUserInfo = () => {
    try {
      const savedUserInfo = localStorage.getItem('userInfo')
      const savedToken = localStorage.getItem('token')

      if (savedUserInfo && savedToken) {
        userInfo.value = JSON.parse(savedUserInfo)
        token.value = savedToken
        isLoggedIn.value = true
        return true
      }
    } catch (error) {
      console.error('恢复用户信息失败:', error)
      clearUserInfo()
    }
    return false
  }

  // 验证token有效性
  const validateToken = async (): Promise<boolean> => {
    if (!token.value) return false

    try {
      const response = await AuthAPI.checkAuthStatus()
      if (response.code === 0) {
        return true
      } else {
        clearUserInfo()
        return false
      }
    } catch (error) {
      console.error('Token验证失败:', error)
      clearUserInfo()
      return false
    }
  }

  // 获取用户详细信息
  const fetchUserInfo = async (): Promise<boolean> => {
    try {
      const response = await UserAPI.getUserInfo()
      if (response.code === 0 && response.data) {
        userInfo.value = response.data
        localStorage.setItem('userInfo', JSON.stringify(response.data))
        return true
      }
      return false
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return false
    }
  }

  //更新用户信息
  const updateUserInfo = async (data: Partial<UserInfo>): Promise<boolean> => {
    try {
      const response = await UserAPI.updateUserInfo(data)
      if (response.code === 0 && response.data) {
        userInfo.value = response.data
        localStorage.setItem('userInfo', JSON.stringify(response.data))
        return true
      }
      return false
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return false
    }
  }

  // 登出
  const logout = async () => {
    try {
      await AuthAPI.logout()
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      clearUserInfo()
    }
  }

  return {
    // 状态
    userInfo,
    token,
    isLoggedIn,

    // 计算属性
    userId,
    username,
    email,

    // 方法
    setUserInfo,
    clearUserInfo,
    restoreUserInfo,
    validateToken,
    fetchUserInfo,
    updateUserInfo,
    logout
  }
})
