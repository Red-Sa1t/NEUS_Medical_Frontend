import { defineStore } from 'pinia'

import type { AuthUserInfo, CurrentUserResponse, LoginResponse, UserRole } from '@/api/types'

export interface UserState {
  userId: number | null
  username: string
  role: UserRole | null
  accessToken: string
  refreshToken: string
  userInfo: AuthUserInfo | null
}

const STORAGE_KEY = 'neus-medical:user-session'
const VALID_ROLES: UserRole[] = ['admin', 'doctor', 'patient']

function createEmptyState(): UserState {
  return {
    userId: null,
    username: '',
    role: null,
    accessToken: '',
    refreshToken: '',
    userInfo: null
  }
}

function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as UserRole)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  return !Array.isArray(value)
}

function normalizeUserInfo(value: unknown): AuthUserInfo | null {
  if (value === null || value === undefined) {
    return null
  }

  if (!isPlainObject(value)) {
    return null
  }

  const patientId = typeof value.patientId === 'number' ? value.patientId : null
  const doctorId = typeof value.doctorId === 'number' ? value.doctorId : null
  const displayName = typeof value.displayName === 'string' ? value.displayName : null
  const departmentName = typeof value.departmentName === 'string' ? value.departmentName : null

  return {
    ...(typeof value.userId === 'number' ? { userId: value.userId } : {}),
    ...(typeof value.username === 'string' ? { username: value.username } : {}),
    ...(isValidRole(value.role) ? { role: value.role } : {}),
    patientId,
    doctorId,
    displayName,
    departmentName
  }
}

function normalizeCachedState(value: unknown): UserState | null {
  if (!isPlainObject(value)) {
    return null
  }

  const candidate = value as Partial<UserState>
  const accessToken = typeof candidate.accessToken === 'string' ? candidate.accessToken : ''

  if (!accessToken.trim()) {
    return null
  }

  if (!isValidRole(candidate.role)) {
    return null
  }

  return (
    typeof candidate.userId === 'number' && typeof candidate.username === 'string'
      ? {
          userId: candidate.userId,
          username: candidate.username,
          role: candidate.role,
          accessToken,
          refreshToken: typeof candidate.refreshToken === 'string' ? candidate.refreshToken : '',
          userInfo: normalizeUserInfo(candidate.userInfo)
        }
      : null
  )
}

function readStorage(): UserState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    const cached = normalizeCachedState(parsed)
    if (cached) {
      return cached
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }

  window.localStorage.removeItem(STORAGE_KEY)
  return null
}

function writeStorage(state: UserState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function removeStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export const useUserStore = defineStore('user', {
  state: createEmptyState,
  getters: {
    isAuthenticated: (state): boolean => Boolean(state.accessToken && state.role),
    displayName: (state): string => state.userInfo?.displayName || state.username || '未登录用户',
    departmentName: (state): string => state.userInfo?.departmentName || ''
  },
  actions: {
    hydrate(): void {
      const cached = readStorage()
      if (!cached) {
        this.$patch(createEmptyState())
        return
      }

      this.$patch(cached)
    },
    setSession(payload: LoginResponse): void {
      if (typeof payload.accessToken !== 'string' || !payload.accessToken.trim()) {
        throw new Error('登录响应缺少访问令牌')
      }

      if (!isValidRole(payload.role)) {
        throw new Error('登录响应角色无效')
      }

      const nextState: UserState = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken || '',
        userInfo: normalizeUserInfo(payload.userInfo)
      }

      this.$patch(nextState)
      writeStorage(nextState)
    },
    mergeCurrentUser(payload: CurrentUserResponse): void {
      if (!this.accessToken) {
        this.clearSession()
        return
      }

      if (!isValidRole(payload.role)) {
        this.clearSession()
        return
      }

      const nextState: UserState = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        accessToken: this.accessToken,
        refreshToken:
          typeof payload.refreshToken === 'string' && payload.refreshToken
            ? payload.refreshToken
            : this.refreshToken,
        userInfo: normalizeUserInfo(payload.userInfo)
      }

      this.$patch(nextState)
      writeStorage(nextState)
    },
    setTokens(accessToken: string, refreshToken = ''): void {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      writeStorage(this.$state)
    },
    clearSession(): void {
      this.$patch(createEmptyState())
      removeStorage()
    },
    hasAnyRole(roles?: UserRole[]): boolean {
      if (!roles || roles.length === 0) {
        return true
      }

      return Boolean(this.role && roles.includes(this.role))
    }
  }
})
