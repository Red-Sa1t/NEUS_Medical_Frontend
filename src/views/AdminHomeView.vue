<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserStatus
} from '@/api/adminUsers'
import type { AdminUserSummary, ManagedAccountRole, UserRole, UserStatus } from '@/api/types'
import AppShell from '@/components/AppShell.vue'

interface UserFilterForm {
  keyword: string
  role: UserRole | ''
  status: UserStatus | ''
}

type UserDialogMode = 'create' | 'edit'

interface UserFormModel {
  id: number | null
  username: string
  password: string
  role: ManagedAccountRole
  status: UserStatus
}

interface ResetPasswordFormModel {
  userId: number | null
  username: string
  newPassword: string
  confirmPassword: string
}

const filterForm = reactive<UserFilterForm>({
  keyword: '',
  role: '',
  status: ''
})

const users = ref<AdminUserSummary[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const dialogErrorMessage = ref('')
const resetErrorMessage = ref('')
const noticeMessage = ref('')
const statusUpdatingIds = ref<Set<number>>(new Set())

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0,
  pages: 0
})

const userDialogVisible = ref(false)
const userDialogMode = ref<UserDialogMode>('create')
const userForm = reactive<UserFormModel>({
  id: null,
  username: '',
  password: '',
  role: 'doctor',
  status: 1
})

const resetDialogVisible = ref(false)
const resetForm = reactive<ResetPasswordFormModel>({
  userId: null,
  username: '',
  newPassword: '',
  confirmPassword: ''
})

const roleFilterOptions: Array<{ label: string; value: UserRole | '' }> = [
  { label: '全部角色', value: '' },
  { label: '管理员', value: 'admin' },
  { label: '医生', value: 'doctor' },
  { label: '患者', value: 'patient' }
]

const managedRoleOptions: Array<{ label: string; value: ManagedAccountRole }> = [
  { label: '管理员', value: 'admin' },
  { label: '医生', value: 'doctor' }
]

const statusFilterOptions: Array<{ label: string; value: UserStatus | '' }> = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]

const statusOptions: Array<{ label: string; value: UserStatus }> = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]

const userDialogTitle = computed(() => (userDialogMode.value === 'create' ? '新建用户' : '编辑用户'))

const canSubmitUserForm = computed(() => {
  const hasUsername = userForm.username.trim().length > 0
  const hasValidPassword = userDialogMode.value === 'edit' || userForm.password.trim().length >= 6
  return hasUsername && hasValidPassword && isManagedRole(userForm.role)
})

const canSubmitResetForm = computed(
  () =>
    resetForm.userId !== null &&
    resetForm.newPassword.trim().length >= 6 &&
    resetForm.newPassword === resetForm.confirmPassword
)

onMounted(() => {
  void loadUsers()
})

async function loadUsers(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await listAdminUsers({
      keyword: filterForm.keyword,
      role: filterForm.role || undefined,
      status: filterForm.status === '' ? undefined : filterForm.status,
      page: pagination.page,
      size: pagination.size
    })
    users.value = response.records
    pagination.total = response.total
    pagination.page = response.page
    pagination.size = response.size
    pagination.pages = response.pages
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  pagination.page = 1
  void loadUsers()
}

function handleResetFilters(): void {
  filterForm.keyword = ''
  filterForm.role = ''
  filterForm.status = ''
  pagination.page = 1
  void loadUsers()
}

function handlePageChange(page: number): void {
  pagination.page = page
  void loadUsers()
}

function handlePageSizeChange(size: number): void {
  pagination.size = size
  pagination.page = 1
  void loadUsers()
}

function openCreateDialog(): void {
  userDialogMode.value = 'create'
  resetUserForm()
  dialogErrorMessage.value = ''
  noticeMessage.value = ''
  userDialogVisible.value = true
}

function openEditDialog(row: AdminUserSummary): void {
  if (row.role === 'patient') {
    errorMessage.value = '患者账号由患者模块管理'
    return
  }

  userDialogMode.value = 'edit'
  userForm.id = row.id
  userForm.username = row.username
  userForm.password = ''
  userForm.role = row.role
  userForm.status = row.status
  dialogErrorMessage.value = ''
  noticeMessage.value = ''
  userDialogVisible.value = true
}

async function submitUserForm(): Promise<void> {
  const username = userForm.username.trim()
  const password = userForm.password.trim()

  dialogErrorMessage.value = ''
  noticeMessage.value = ''

  if (!username) {
    dialogErrorMessage.value = '请输入用户名'
    return
  }

  if (userDialogMode.value === 'create' && password.length < 6) {
    dialogErrorMessage.value = '密码长度不能少于6位'
    return
  }

  if (!isManagedRole(userForm.role)) {
    dialogErrorMessage.value = '请选择有效角色'
    return
  }

  actionLoading.value = true

  try {
    if (userDialogMode.value === 'create') {
      await createAdminUser({
        username,
        password,
        role: userForm.role,
        status: userForm.status
      })
      userDialogVisible.value = false
      noticeMessage.value = '用户已创建'
      pagination.page = 1
      await loadUsers()
    } else {
      if (userForm.id === null) {
        dialogErrorMessage.value = '请选择要编辑的用户'
        return
      }

      await updateAdminUser(userForm.id, {
        username,
        role: userForm.role,
        status: userForm.status
      })
      userDialogVisible.value = false
      noticeMessage.value = '用户已保存'
      await loadUsers()
    }
  } catch (error) {
    dialogErrorMessage.value = getErrorMessage(error, '用户保存失败')
  } finally {
    actionLoading.value = false
  }
}

async function handleStatusChange(row: AdminUserSummary, enabled: boolean): Promise<void> {
  const nextStatus: UserStatus = enabled ? 1 : 0
  if (row.status === nextStatus) {
    return
  }

  setStatusUpdating(row.id, true)
  noticeMessage.value = ''

  try {
    const updated = await updateAdminUserStatus(row.id, { status: nextStatus })
    replaceUser(updated)

    if (filterForm.status !== '' && filterForm.status !== updated.status) {
      await loadUsers()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '用户状态更新失败')
  } finally {
    setStatusUpdating(row.id, false)
  }
}

function handleStatusSwitchChange(row: AdminUserSummary, value: string | number | boolean): void {
  void handleStatusChange(row, isEnabledSwitchValue(value))
}

function openResetPasswordDialog(row: AdminUserSummary): void {
  resetForm.userId = row.id
  resetForm.username = row.username
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  resetErrorMessage.value = ''
  noticeMessage.value = ''
  resetDialogVisible.value = true
}

async function submitResetPassword(): Promise<void> {
  resetErrorMessage.value = ''
  noticeMessage.value = ''

  if (resetForm.userId === null) {
    resetErrorMessage.value = '请选择要重置密码的用户'
    return
  }

  if (resetForm.newPassword.trim().length < 6) {
    resetErrorMessage.value = '密码长度不能少于6位'
    return
  }

  if (resetForm.newPassword !== resetForm.confirmPassword) {
    resetErrorMessage.value = '两次输入的密码不一致'
    return
  }

  actionLoading.value = true

  try {
    await resetAdminUserPassword(resetForm.userId, {
      newPassword: resetForm.newPassword.trim()
    })
    resetDialogVisible.value = false
    resetForm.newPassword = ''
    resetForm.confirmPassword = ''
    noticeMessage.value = '密码已重置'
  } catch (error) {
    resetErrorMessage.value = getErrorMessage(error, '密码重置失败')
  } finally {
    actionLoading.value = false
  }
}

function resetUserForm(): void {
  userForm.id = null
  userForm.username = ''
  userForm.password = ''
  userForm.role = 'doctor'
  userForm.status = 1
}

function isManagedRole(role: string): role is ManagedAccountRole {
  return role === 'admin' || role === 'doctor'
}

function isStatusUpdating(id: number): boolean {
  return statusUpdatingIds.value.has(id)
}

function setStatusUpdating(id: number, updating: boolean): void {
  const next = new Set(statusUpdatingIds.value)
  if (updating) {
    next.add(id)
  } else {
    next.delete(id)
  }
  statusUpdatingIds.value = next
}

function replaceUser(updated: AdminUserSummary): void {
  users.value = users.value.map((item) => (item.id === updated.id ? updated : item))
}

function isEnabledSwitchValue(value: string | number | boolean): boolean {
  return value === true || value === 1 || value === '1'
}

function formatRole(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: '管理员',
    doctor: '医生',
    patient: '患者'
  }
  return labels[role]
}

function formatStatus(status: UserStatus): string {
  return status === 1 ? '启用' : '禁用'
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-'
  }

  return value.replace('T', ' ').slice(0, 16)
}

function roleTagType(role: UserRole): 'primary' | 'success' | 'info' {
  if (role === 'admin') {
    return 'primary'
  }

  if (role === 'doctor') {
    return 'success'
  }

  return 'info'
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}
</script>

<template>
  <AppShell>
    <section class="page-panel admin-user-page">
      <header class="admin-user-page__header">
        <div>
          <h2 class="page-title">用户管理</h2>
          <p class="page-subtitle">管理平台账号、角色与启用状态。</p>
        </div>
        <el-button type="primary" @click="openCreateDialog">新建用户</el-button>
      </header>

      <div class="admin-user-page__filters">
        <el-input
          v-model="filterForm.keyword"
          clearable
          placeholder="用户名关键字"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filterForm.role" placeholder="角色">
          <el-option
            v-for="option in roleFilterOptions"
            :key="option.value || 'all'"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select v-model="filterForm.status" placeholder="状态">
          <el-option
            v-for="option in statusFilterOptions"
            :key="String(option.value)"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <div class="admin-user-page__filter-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleResetFilters">重置</el-button>
        </div>
      </div>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
      <el-alert v-if="noticeMessage" :title="noticeMessage" type="success" show-icon :closable="false" />

      <div class="admin-user-page__table">
        <el-table :data="users" :loading="loading" row-key="id">
          <el-table-column prop="id" label="ID" width="88" />
          <el-table-column prop="username" label="用户名" min-width="150" />
          <el-table-column label="角色" min-width="110">
            <template #default="{ row }">
              <el-tag :type="roleTagType(row.role)">{{ formatRole(row.role) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="130">
            <template #default="{ row }">
              <el-switch
                :model-value="row.status"
                :active-value="1"
                :inactive-value="0"
                :loading="isStatusUpdating(row.id)"
                :disabled="isStatusUpdating(row.id)"
                active-text="启用"
                inactive-text="禁用"
                @change="handleStatusSwitchChange(row, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.updateTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" :disabled="row.role === 'patient'" @click="openEditDialog(row)">
                编辑
              </el-button>
              <el-button size="small" type="primary" plain @click="openResetPasswordDialog(row)">重置密码</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="admin-user-page__mobile-list">
        <article v-for="row in users" :key="row.id" class="admin-user-page__mobile-row">
          <div class="admin-user-page__mobile-main">
            <strong>{{ row.username }}</strong>
            <span>#{{ row.id }}</span>
          </div>
          <div class="admin-user-page__mobile-meta">
            <el-tag :type="roleTagType(row.role)">{{ formatRole(row.role) }}</el-tag>
            <span>{{ formatStatus(row.status) }} · {{ formatDateTime(row.updateTime) }}</span>
          </div>
          <div class="admin-user-page__mobile-actions">
            <el-switch
              :model-value="row.status"
              :active-value="1"
              :inactive-value="0"
              :loading="isStatusUpdating(row.id)"
              :disabled="isStatusUpdating(row.id)"
              active-text="启用"
              inactive-text="禁用"
              :data-testid="`mobile-status-${row.id}`"
              @change="handleStatusSwitchChange(row, $event)"
            />
            <el-button
              size="small"
              :disabled="row.role === 'patient'"
              :data-testid="`edit-user-${row.id}`"
              @click="openEditDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="primary"
              plain
              :data-testid="`reset-user-${row.id}`"
              @click="openResetPasswordDialog(row)"
            >
              重置密码
            </el-button>
          </div>
        </article>
      </div>

      <div class="admin-user-page__pagination">
        <span class="admin-user-page__page-summary">共 {{ pagination.total }} 条</span>
        <el-pagination
          background
          layout="sizes, prev, pager, next"
          :current-page="pagination.page"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <el-dialog v-model="userDialogVisible" :title="userDialogTitle" width="420px" :teleported="false">
      <el-form label-position="top" @submit.prevent>
        <el-alert
          v-if="dialogErrorMessage"
          class="admin-user-page__dialog-alert"
          :title="dialogErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" autocomplete="off" />
        </el-form-item>
        <el-form-item v-if="userDialogMode === 'create'" label="密码">
          <el-input v-model="userForm.password" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role">
            <el-option
              v-for="option in managedRoleOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="userForm.status">
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" :disabled="!canSubmitUserForm" @click="submitUserForm">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetDialogVisible" title="重置密码" width="420px" :teleported="false">
      <el-form label-position="top" @submit.prevent>
        <el-alert
          v-if="resetErrorMessage"
          class="admin-user-page__dialog-alert"
          :title="resetErrorMessage"
          type="error"
          show-icon
          :closable="false"
        />
        <el-form-item label="目标用户">
          <el-input :model-value="resetForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="resetForm.confirmPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="actionLoading"
          :disabled="!canSubmitResetForm"
          @click="submitResetPassword"
        >
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </AppShell>
</template>

<style scoped>
.admin-user-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-user-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-user-page__filters {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(132px, 0.7fr) minmax(132px, 0.7fr) auto;
  gap: 12px;
  align-items: center;
}

.admin-user-page__filter-actions {
  display: flex;
  gap: 8px;
}

.admin-user-page__table {
  width: 100%;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.admin-user-page__mobile-list {
  display: none;
}

.admin-user-page__mobile-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.admin-user-page__mobile-main,
.admin-user-page__mobile-meta,
.admin-user-page__mobile-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.admin-user-page__mobile-main span,
.admin-user-page__mobile-meta span {
  color: #64748b;
  font-size: 13px;
}

.admin-user-page__mobile-actions {
  flex-wrap: wrap;
  justify-content: flex-start;
}

.admin-user-page__pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.admin-user-page__page-summary {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.admin-user-page__dialog-alert {
  margin-bottom: 14px;
}

:deep(.el-table) {
  min-width: 860px;
}

:deep(.el-dialog__body) {
  padding-top: 8px;
}

@media (max-width: 900px) {
  .admin-user-page__filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-user-page__filter-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .admin-user-page {
    padding: 18px;
  }

  .admin-user-page__header,
  .admin-user-page__pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-user-page__filters {
    grid-template-columns: 1fr;
  }

  .admin-user-page__table {
    display: none;
  }

  .admin-user-page__mobile-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
