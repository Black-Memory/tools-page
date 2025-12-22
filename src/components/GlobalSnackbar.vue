<template>
  <v-snackbar v-model="show" :color="color" timeout="3000" location="top">
    {{ message }}
  </v-snackbar>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const show = ref(false)
const message = ref('')
const color = ref<'success'|'error'|'info'|'warning'>('success')

function showSuccessMessage(msg: string) {
  message.value = msg
  color.value = 'success'
  show.value = true
}
function showErrorMessage(msg: string) {
  message.value = msg
  color.value = 'error'
  show.value = true
}

import { onMounted } from 'vue'
import { registerSnackbar } from '@/composables/snackbar'

onMounted(() => {
  registerSnackbar({ showSuccessMessage, showErrorMessage })
})
</script>
