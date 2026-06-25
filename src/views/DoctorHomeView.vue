<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
</script>

<template>
  <AppShell>
    <section class="page-panel">
      <h2 class="page-title">医生工作台</h2>
      <p class="page-subtitle">医生端基础入口已就绪，后续业务模块可接入挂号患者、问诊记录、病历生成和处方审核。</p>

      <div class="metric-grid">
        <div class="metric-card">
          <p class="metric-label">今日待办</p>
          <p class="metric-value">0</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">AI 能力</p>
          <p class="metric-value">预留</p>
        </div>
      </div>
    </section>
  </AppShell>
</template>
