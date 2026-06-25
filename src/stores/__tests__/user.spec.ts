import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { UserRole } from '@/api/types'

import { useUserStore } from '../user'

const STORAGE_KEY = 'neus-medical:user-session'

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('persists backend-shaped sessions and exposes display fields', () => {
    const store = useUserStore()

    store.setSession({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      role: 'admin',
      userId: 1,
      username: 'admin',
      userInfo: {
        patientId: null,
        doctorId: null,
        displayName: '系统管理员',
        departmentName: '平台管理部'
      }
    })

    expect(store.isAuthenticated).toBe(true)
    expect(store.displayName).toBe('系统管理员')
    expect(store.departmentName).toBe('平台管理部')
    expect(store.hasAnyRole(['admin'])).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')).toMatchObject({
      accessToken: 'admin-token',
      role: 'admin',
      userId: 1,
      userInfo: {
        displayName: '系统管理员',
        departmentName: '平台管理部'
      }
    })
  })

  it('falls back to username when userInfo has no display name', () => {
    const store = useUserStore()

    store.setSession({
      accessToken: 'doctor-token',
      role: 'doctor',
      userId: 2,
      username: 'doctor',
      userInfo: {
        patientId: null,
        doctorId: 10,
        displayName: null,
        departmentName: '心内科'
      }
    })

    expect(store.displayName).toBe('doctor')
  })

  it('hydrates a valid cached session', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: 'doctor-token',
        refreshToken: 1,
        role: 'doctor',
        userId: 2,
        username: 'doctor',
        userInfo: {
          patientId: null,
          doctorId: 10,
          displayName: '演示医生',
          departmentName: '心内科'
        }
      })
    )

    const store = useUserStore()
    store.hydrate()

    expect(store.isAuthenticated).toBe(true)
    expect(store.role).toBe('doctor')
    expect(store.accessToken).toBe('doctor-token')
    expect(store.refreshToken).toBe('')
    expect(store.displayName).toBe('演示医生')
  })

  it.each([
    ['invalid role', { accessToken: 'bad-token', role: 'guest', userId: 9, username: 'guest' }],
    ['missing token', { role: 'admin', userId: 1, username: 'admin' }],
    ['empty token', { accessToken: '', role: 'admin', userId: 1, username: 'admin' }]
  ])('clears %s cached sessions during hydration', (_name, cached) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))

    const store = useUserStore()
    store.hydrate()

    expect(store.isAuthenticated).toBe(false)
    expect(store.role).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears unparsable cached sessions during hydration', () => {
    window.localStorage.setItem(STORAGE_KEY, '{')

    const store = useUserStore()
    store.hydrate()

    expect(store.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('merges current user summaries while preserving the existing access token', () => {
    const store = useUserStore()
    store.setSession({
      accessToken: 'patient-token',
      refreshToken: 'patient-refresh',
      role: 'patient',
      userId: 3,
      username: 'patient',
      userInfo: null
    })

    store.mergeCurrentUser({
      accessToken: null,
      refreshToken: null,
      role: 'patient',
      userId: 3,
      username: 'patient-next',
      userInfo: {
        patientId: 20,
        doctorId: null,
        displayName: '演示患者',
        departmentName: null
      }
    })

    expect(store.accessToken).toBe('patient-token')
    expect(store.refreshToken).toBe('patient-refresh')
    expect(store.username).toBe('patient-next')
    expect(store.displayName).toBe('演示患者')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}').accessToken).toBe('patient-token')

    store.mergeCurrentUser({
      accessToken: 'replacement-token',
      refreshToken: '',
      role: 'patient',
      userId: 3,
      username: 'patient-latest',
      userInfo: null
    })

    expect(store.accessToken).toBe('patient-token')
    expect(store.refreshToken).toBe('patient-refresh')
    expect(store.username).toBe('patient-latest')
  })

  it('updates refresh token only when current user response contains a non-empty value', () => {
    const store = useUserStore()
    store.setSession({
      accessToken: 'doctor-token',
      refreshToken: 'old-refresh',
      role: 'doctor',
      userId: 2,
      username: 'doctor',
      userInfo: null
    })

    store.mergeCurrentUser({
      refreshToken: 'new-refresh',
      role: 'doctor',
      userId: 2,
      username: 'doctor',
      userInfo: null
    })

    expect(store.refreshToken).toBe('new-refresh')
  })

  it('clears the session when merging current user data without an existing access token', () => {
    const store = useUserStore()
    store.$patch({
      userId: 1,
      username: 'admin',
      role: 'admin',
      accessToken: '',
      refreshToken: 'stale-refresh',
      userInfo: null
    })
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: 1,
        username: 'admin',
        role: 'admin',
        accessToken: '',
        refreshToken: 'stale-refresh',
        userInfo: null
      })
    )

    store.mergeCurrentUser({
      role: 'admin',
      userId: 1,
      username: 'admin',
      userInfo: null
    })

    expect(store.isAuthenticated).toBe(false)
    expect(store.role).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clears the session when current user response has an invalid role', () => {
    const store = useUserStore()
    store.setSession({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      role: 'admin',
      userId: 1,
      username: 'admin',
      userInfo: null
    })

    store.mergeCurrentUser({
      role: 'guest' as UserRole,
      userId: 1,
      username: 'admin',
      userInfo: null
    })

    expect(store.isAuthenticated).toBe(false)
    expect(store.role).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('rejects login sessions without a non-empty access token', () => {
    const store = useUserStore()

    expect(() =>
      store.setSession({
        accessToken: '',
        role: 'admin',
        userId: 1,
        username: 'admin',
        userInfo: null
      })
    ).toThrow('登录响应缺少访问令牌')
    expect(store.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('rejects login sessions with invalid roles without changing storage', () => {
    const store = useUserStore()

    expect(() =>
      store.setSession({
        accessToken: 'admin-token',
        role: 'guest' as UserRole,
        userId: 1,
        username: 'admin',
        userInfo: null
      })
    ).toThrow('登录响应角色无效')
    expect(store.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('updates tokens and clears the stored session', () => {
    const store = useUserStore()
    store.setSession({
      accessToken: 'patient-token',
      role: 'patient',
      userId: 3,
      username: 'patient',
      userInfo: null
    })

    store.setTokens('next-token')
    expect(store.accessToken).toBe('next-token')
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}').accessToken).toBe('next-token')

    store.clearSession()
    expect(store.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
