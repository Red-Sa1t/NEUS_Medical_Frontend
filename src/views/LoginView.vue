<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { login } from '@/api/auth'
import { ApiError } from '@/api/http'
import type { UserRole } from '@/api/types'
import { getDefaultRouteByRole } from '@/router'
import { useUserStore } from '@/stores/user'

interface DemoAccount {
  role: UserRole
  title: string
  description: string
  username: string
  password: string
}

interface LoginFormModel {
  username: string
  password: string
  role: UserRole
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const accounts: DemoAccount[] = [
  {
    role: 'admin',
    title: '管理员',
    description: '填充管理后台演示账号',
    username: 'admin',
    password: '123456'
  },
  {
    role: 'doctor',
    title: '医生',
    description: '填充医生工作台演示账号',
    username: 'doctor',
    password: '123456'
  },
  {
    role: 'patient',
    title: '患者',
    description: '填充患者端演示账号',
    username: 'patient',
    password: '123456'
  }
]

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: '管理员', value: 'admin' },
  { label: '医生', value: 'doctor' },
  { label: '患者', value: 'patient' }
]

const form = reactive<LoginFormModel>({
  username: 'admin',
  password: '123456',
  role: 'admin'
})

const submitting = ref(false)
const errorMessage = ref('')

function resolveRedirectTarget(role: UserRole): string {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/') && redirect !== '/login') {
    return redirect
  }

  return getDefaultRouteByRole(role)
}

function fillAccount(account: DemoAccount): void {
  form.username = account.username
  form.password = account.password
  form.role = account.role
  errorMessage.value = ''
}

async function handleSubmit(): Promise<void> {
  const username = form.username.trim()
  const password = form.password.trim()

  if (!username) {
    errorMessage.value = '请输入用户名'
    return
  }

  if (!password) {
    errorMessage.value = '请输入密码'
    return
  }

  submitting.value = true
  errorMessage.value = ''
  userStore.clearSession()

  try {
    const response = await login({ username, password, role: form.role })
    userStore.setSession(response)
    await router.push(resolveRedirectTarget(response.role))
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError && error.message ? error.message : '登录失败，请检查账号、密码和角色'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="login-panel__intro">
        <p class="login-panel__eyebrow">NEUS Medical Platform</p>
        <h1>东软智慧云脑诊疗平台</h1>
        <p>使用统一认证入口登录系统。</p>
      </div>

      <el-alert
        v-if="errorMessage"
        class="login-panel__error"
        :closable="false"
        :title="errorMessage"
        type="error"
      />

      <el-form class="login-form" @submit.prevent="handleSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            autocomplete="current-password"
            placeholder="请输入密码"
            show-password
            type="password"
          />
        </el-form-item>

        <el-form-item label="角色">
          <el-segmented v-model="form.role" :options="roleOptions" />
        </el-form-item>

        <el-button class="login-form__submit" native-type="submit" size="large" type="primary" :loading="submitting">
          登录
        </el-button>
      </el-form>

      <div class="login-panel__actions">
        <el-button
          v-for="account in accounts"
          :key="account.role"
          class="login-role"
          size="large"
          @click="fillAccount(account)"
        >
          <span class="login-role__title">{{ account.title }}</span>
          <span class="login-role__desc">{{ account.description }}</span>
        </el-button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(22, 119, 255, 0.08), transparent 42%),
    #f4f7fb;
  place-items: center;
}

.login-panel {
  width: min(760px, 100%);
  padding: 32px;
  background: #ffffff;
  border: 1px solid #d8e2ef;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(28, 43, 65, 0.12);
}

.login-panel__intro {
  margin-bottom: 24px;
}

.login-panel__eyebrow {
  margin: 0 0 8px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 650;
}

.login-panel h1 {
  margin: 0 0 10px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.25;
}

.login-panel p {
  color: #64748b;
}

.login-panel__error {
  margin-bottom: 18px;
}

.login-form {
  display: grid;
  gap: 4px;
  margin-bottom: 24px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.login-form :deep(.el-segmented) {
  max-width: 100%;
}

.login-form__submit {
  width: 100%;
}

.login-panel__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.login-role {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  min-height: 92px;
  padding: 14px;
  white-space: normal;
}

.login-role :deep(span) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  text-align: left;
}

.login-role__title {
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
}

.login-role__desc {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 560px) {
  .login-page {
    padding: 16px;
  }

  .login-panel {
    padding: 24px;
  }

  .login-panel h1 {
    font-size: 24px;
  }
}
</style>
