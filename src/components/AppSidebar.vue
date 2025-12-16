<template>
  <v-navigation-drawer v-model="drawer" app>
    <!-- 侧边栏标题 -->
    <!-- <v-list-item>
      <v-list-item-title class="text-h6">
        工具导航
      </v-list-item-title>
    </v-list-item>

    <v-divider></v-divider> -->

    <!-- 导航菜单 -->
    <v-list>
      <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        :to="item.to"
        color="primary"
      >
        <template v-slot:prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>

        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>

    <v-divider></v-divider>

    <!-- 底部信息 -->
    <template v-slot:append>
      <v-list-item>
        <v-list-item-title class="text-caption text-medium-emphasis">
          版本 1.0.0
        </v-list-item-title>
      </v-list-item>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

// 控制侧边栏显示/隐藏
const drawer = ref(true)

// 导航菜单项
const menuItems = ref([
  {
    title: '首页',
    icon: 'mdi-home',
    to: '/'
  },
  {
    title: '策略',
    icon: 'mdi-toolbox',
    to: '/strategy'
  },
  {
    title: '监控',
    icon: 'mdi-monitor-dashboard',
    to: '/monitor'
  }

])

// 暴露给父组件使用
defineExpose({
  drawer
})
</script>

<style scoped>
/* 自定义样式 */
</style>
