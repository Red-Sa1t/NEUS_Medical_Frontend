<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, watch } from 'vue'
import { RouterView } from 'vue-router'

import { useUiStore } from './stores/ui'

const uiStore = useUiStore()
const isLoading = computed(() => uiStore.isLoading)

watch(
  () => uiStore.message,
  (message) => {
    if (!message) {
      return
    }

    ElMessage[message.type](message.text)
    uiStore.clearMessage()
  }
)
</script>

<template>
  <div class="app-root">
    <div v-if="isLoading" class="global-loading-bar" />
    <RouterView />
  </div>
</template>
