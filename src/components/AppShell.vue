<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import type { UserRole } from '@/api/types'
import { useUserStore } from '@/stores/user'

interface NavItem {
  label: string
  path: string
  roles: UserRole[]
}

const router = useRouter()
const userStore = useUserStore()

const navItems: NavItem[] = [
  { label: '患者工作台', path: '/patient', roles: ['patient'] },
  { label: '医生工作台', path: '/doctor', roles: ['doctor'] },
  { label: '管理后台', path: '/admin', roles: ['admin'] }
]

const availableNavItems = computed(() => navItems.filter((item) => userStore.hasAnyRole(item.roles)))
const activePath = computed(() => router.currentRoute.value.path)

function handleSelect(path: string): void {
  void router.push(path)
}

function handleLogout(): void {
  userStore.clearSession()
  void router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar">
      <div class="app-shell__brand">
        <span class="app-shell__brand-main">智慧云脑</span>
        <span class="app-shell__brand-sub">诊疗平台</span>
      </div>

      <el-menu :default-active="activePath" class="app-shell__menu" @select="handleSelect">
        <el-menu-item v-for="item in availableNavItems" :key="item.path" :index="item.path">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </aside>

    <div class="app-shell__body">
      <header class="app-shell__header">
        <div>
          <p class="app-shell__eyebrow">NEUS Medical Platform</p>
          <h1 class="app-shell__title">东软智慧云脑诊疗平台</h1>
        </div>
        <div class="app-shell__user">
          <span>{{ userStore.displayName }}</span>
          <el-button size="small" @click="handleLogout">退出</el-button>
        </div>
      </header>

      <main class="app-shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f4f7fb;
}

.app-shell__sidebar {
  width: 236px;
  min-height: 100vh;
  padding: 20px 14px;
  color: #ffffff;
  background: #17324d;
}

.app-shell__brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px 24px;
}

.app-shell__brand-main {
  font-size: 20px;
  font-weight: 700;
}

.app-shell__brand-sub {
  color: #b7c8d8;
  font-size: 13px;
}

.app-shell__menu {
  border-right: 0;
  background: transparent;
}

.app-shell__menu :deep(.el-menu-item) {
  height: 42px;
  color: #d9e6f2;
  border-radius: 6px;
}

.app-shell__menu :deep(.el-menu-item.is-active),
.app-shell__menu :deep(.el-menu-item:hover) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
}

.app-shell__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 14px 28px;
  background: #ffffff;
  border-bottom: 1px solid #d8e2ef;
}

.app-shell__eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 12px;
}

.app-shell__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
}

.app-shell__user {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #475569;
}

.app-shell__main {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

@media (max-width: 760px) {
  .app-shell {
    flex-direction: column;
  }

  .app-shell__sidebar {
    width: 100%;
    min-height: auto;
  }

  .app-shell__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .app-shell__main {
    padding: 16px;
  }
}
</style>
