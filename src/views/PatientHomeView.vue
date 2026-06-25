<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
</script>

<template>
  <AppShell>
    <section class="page-panel">
      <h2 class="page-title">患者工作台</h2>
      <p class="page-subtitle">患者端基础入口已就绪，后续业务模块可接入智能分诊、挂号、处方和病历查询。</p>

      <div class="metric-grid">
        <div class="metric-card">
          <p class="metric-label">待接入能力</p>
          <p class="metric-value">4</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">当前状态</p>
          <p class="metric-value">就绪</p>
        </div>
      </div>
    </section>
  </AppShell>
</template>
