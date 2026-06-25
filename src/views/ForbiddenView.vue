<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="error-page">
    <section class="error-panel">
      <p class="error-code">403</p>
      <h1>无权访问</h1>
      <p>当前角色没有访问该页面的权限。</p>
      <el-button type="primary" @click="router.back()">返回上一页</el-button>
    </section>
  </main>
</template>

<style scoped>
.error-page {
  display: grid;
  min-height: 100vh;
  padding: 24px;
  background: #f4f7fb;
  place-items: center;
}

.error-panel {
  width: min(420px, 100%);
  padding: 30px;
  text-align: center;
  background: #ffffff;
  border: 1px solid #d8e2ef;
  border-radius: 8px;
}

.error-code {
  margin: 0;
  color: #1677ff;
  font-size: 52px;
  font-weight: 800;
}

.error-panel h1 {
  margin: 4px 0 10px;
}

.error-panel p {
  color: #64748b;
}
</style>
