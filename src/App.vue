
<template>
  <v-app>
    <router-view />
    <GlobalSnackbar />
  </v-app>
</template>

<script lang="ts" setup>
import GlobalSnackbar from '@/components/GlobalSnackbar.vue'
</script>
