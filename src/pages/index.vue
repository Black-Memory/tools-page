<template>
  <div class="home-container">
    <div class="tools-background">
      <v-icon class="tools-icon">mdi-tools</v-icon>
    </div>
  </div>
</template>

<script lang="ts" setup>
//
</script>

<style scoped>
.home-container {
  position: relative;
  overflow: hidden;
  height: calc(100vh - 64px); /* 减去应用栏高度 */
}

.tools-background {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.tools-icon {
  font-size: 300px;
  color: rgba(25, 118, 210, 0.1); /* 主题色的淡化版本 */
  transition: all 0.3s ease;
}

.tools-icon:hover {
  color: rgba(25, 118, 210, 0.2);
  transform: scale(1.05);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tools-icon {
    font-size: 200px;
  }
}

@media (max-width: 480px) {
  .tools-icon {
    font-size: 150px;
  }
}
</style>
