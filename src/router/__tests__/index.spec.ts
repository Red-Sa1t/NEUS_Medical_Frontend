import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import { useUserStore } from '@/stores/user'

import { createAppRouter, getDefaultRouteByRole } from '../index'

const viewStub = { render: () => null }

vi.mock('@/views/AdminHomeView.vue', () => ({ default: viewStub }))
vi.mock('@/views/DoctorHomeView.vue', () => ({ default: viewStub }))
vi.mock('@/views/ForbiddenView.vue', () => ({ default: viewStub }))
vi.mock('@/views/LoginView.vue', () => ({ default: viewStub }))
vi.mock('@/views/NotFoundView.vue', () => ({ default: viewStub }))
vi.mock('@/views/PatientHomeView.vue', () => ({ default: viewStub }))

function createRouterSubject() {
  window.localStorage.clear()
  document.title = ''

  setActivePinia(createPinia())

  return {
    getDefaultRouteByRole,
    router: createAppRouter({ history: createMemoryHistory() }),
    useUserStore
  }
}

describe('router guards', () => {
  it('maps roles to their default routes', () => {
    const { getDefaultRouteByRole } = createRouterSubject()

    expect(getDefaultRouteByRole('admin')).toBe('/admin')
    expect(getDefaultRouteByRole('doctor')).toBe('/doctor')
    expect(getDefaultRouteByRole('patient')).toBe('/patient')
    expect(getDefaultRouteByRole(null)).toBe('/login')
  })

  it('creates isolated router instances from the router factory', async () => {
    const first = createRouterSubject()

    await first.router.push('/login')
    await first.router.isReady()

    const second = createRouterSubject()

    await second.router.push('/unknown')
    await second.router.isReady()

    expect(first.router).not.toBe(second.router)
    expect(first.router.currentRoute.value.path).toBe('/login')
    expect(second.router.currentRoute.value.path).toBe('/unknown')
  })

  it('hydrates once per router instance without sharing guard state', async () => {
    const first = createRouterSubject()
    const firstStore = first.useUserStore()
    const firstHydrate = vi.spyOn(firstStore, 'hydrate')

    await first.router.push('/login')
    await first.router.isReady()
    await first.router.push('/unknown')

    expect(firstHydrate).toHaveBeenCalledTimes(1)

    const second = createRouterSubject()
    const secondStore = second.useUserStore()
    const secondHydrate = vi.spyOn(secondStore, 'hydrate')

    await second.router.push('/login')
    await second.router.isReady()

    expect(secondHydrate).toHaveBeenCalledTimes(1)
  })

  it('redirects unauthenticated protected access to login with redirect query', async () => {
    const { router } = createRouterSubject()

    await router.push('/doctor')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/doctor')
  })

  it('redirects authenticated users away from login to their role home', async () => {
    const { router, useUserStore } = createRouterSubject()
    useUserStore().setSession({
      accessToken: 'doctor-token',
      role: 'doctor',
      userId: 2,
      username: 'doctor',
      userInfo: null
    })

    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/doctor')
  })

  it('blocks authenticated users from routes outside their role', async () => {
    const { router, useUserStore } = createRouterSubject()
    useUserStore().setSession({
      accessToken: 'patient-token',
      role: 'patient',
      userId: 3,
      username: 'patient',
      userInfo: null
    })

    await router.push('/admin')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/403')
  })

  it('sets the document title for allowed routes', async () => {
    const { router, useUserStore } = createRouterSubject()
    useUserStore().setSession({
      accessToken: 'admin-token',
      role: 'admin',
      userId: 1,
      username: 'admin',
      userInfo: null
    })

    await router.push('/admin')
    await router.isReady()

    expect(document.title).toBe('管理员工作台 - 东软智慧云脑诊疗平台')
  })
})
