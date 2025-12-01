/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'
import { AuthAPI } from '@/api/auth'
import { ErrorCode } from '@/constants/error-codes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})


const authWhitelist = ['/login', '/register']

// 全局前置路由守卫
router.beforeEach(async (to, from, next) => {
  const isAuthPage = authWhitelist.includes(to.path)

  if (!isAuthPage) {
    // 需要登录的页面，检查登录状态
    const isLoggedIn = await AuthAPI.checkAuthStatus().then((res) => {
      return res.code === ErrorCode.SUCCESS
    }).catch((err) => {
      console.error('检查登录状态失败:', err)
      return false
    })
    if (!isLoggedIn) {
      next('/login')
      return
    }
  }

  next()
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
