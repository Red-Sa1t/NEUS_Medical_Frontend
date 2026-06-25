import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserStore } from '@/stores/user'

import LoginView from '../LoginView.vue'

const STORAGE_KEY = 'neus-medical:user-session'

const authMock = vi.hoisted(() => ({
  login: vi.fn()
}))

const routeMock = vi.hoisted(() => ({
  query: {} as Record<string, unknown>
}))

const routerMock = vi.hoisted(() => ({
  push: vi.fn()
}))

vi.mock('@/api/auth', () => ({
  login: authMock.login
}))

vi.mock('@/router', () => ({
  getDefaultRouteByRole: (role: string | null) => (role ? `/${role}` : '/login')
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock
}))

const elementStubs = {
  ElAlert: {
    props: ['title'],
    template: '<div class="el-alert">{{ title }}</div>'
  },
  ElButton: {
    props: ['loading', 'nativeType'],
    emits: ['click'],
    template:
      '<button :type="nativeType || \'button\'" :disabled="loading" @click="$emit(\'click\')"><slot /></button>'
  },
  ElForm: {
    emits: ['submit'],
    template: '<form @submit.prevent="$emit(\'submit\', $event)"><slot /></form>'
  },
  ElFormItem: {
    props: ['label'],
    template: '<label><span>{{ label }}</span><slot /></label>'
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSegmented: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<div><button v-for="option in options" :key="option.value" type="button" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></div>'
  }
}

function mountSubject() {
  return mount(LoginView, {
    global: {
      stubs: elementStubs
    }
  })
}

function loginResponse(role: 'admin' | 'doctor' | 'patient' = 'admin') {
  return {
    accessToken: `${role}-token`,
    refreshToken: `${role}-refresh`,
    role,
    userId: role === 'admin' ? 1 : role === 'doctor' ? 2 : 3,
    username: role,
    userInfo: {
      patientId: role === 'patient' ? 20 : null,
      doctorId: role === 'doctor' ? 10 : null,
      displayName: `${role}-name`,
      departmentName: role === 'doctor' ? '心内科' : null
    }
  }
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    authMock.login.mockReset()
    routerMock.push.mockReset()
    routeMock.query = {}
  })

  it('logs in with username, password and role, then redirects to query target', async () => {
    routeMock.query = { redirect: '/doctor' }
    authMock.login.mockResolvedValueOnce(loginResponse('doctor'))

    const wrapper = mountSubject()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('doctor')
    await inputs[1].setValue('123456')
    await wrapper.findAll('button').find((button) => button.text() === '医生')?.trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authMock.login).toHaveBeenCalledWith({
      username: 'doctor',
      password: '123456',
      role: 'doctor'
    })
    expect(useUserStore().accessToken).toBe('doctor-token')
    expect(routerMock.push).toHaveBeenCalledWith('/doctor')
  })

  it('uses the role default route when redirect is absent', async () => {
    authMock.login.mockResolvedValueOnce(loginResponse('patient'))

    const wrapper = mountSubject()
    await wrapper.findAll('button').find((button) => button.text().includes('填充患者端演示账号'))?.trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(routerMock.push).toHaveBeenCalledWith('/patient')
  })

  it('clears session and shows an error when login fails', async () => {
    const store = useUserStore()
    store.setSession(loginResponse('admin'))
    authMock.login.mockRejectedValueOnce(new Error('bad credentials'))

    const wrapper = mountSubject()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(wrapper.text()).toContain('登录失败，请检查账号、密码和角色')
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it('does not submit when username is empty', async () => {
    const wrapper = mountSubject()
    const inputs = wrapper.findAll('input')

    await inputs[0].setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authMock.login).not.toHaveBeenCalled()
    expect(useUserStore().isAuthenticated).toBe(false)
    expect(wrapper.text()).toContain('请输入用户名')
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it('does not submit when password is empty', async () => {
    const wrapper = mountSubject()
    const inputs = wrapper.findAll('input')

    await inputs[1].setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authMock.login).not.toHaveBeenCalled()
    expect(useUserStore().isAuthenticated).toBe(false)
    expect(wrapper.text()).toContain('请输入密码')
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it('fills demo account fields without creating a session', async () => {
    const wrapper = mountSubject()

    await wrapper.findAll('button').find((button) => button.text().includes('填充患者端演示账号'))?.trigger('click')

    const inputs = wrapper.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('patient')
    expect((inputs[1].element as HTMLInputElement).value).toBe('123456')
    expect(authMock.login).not.toHaveBeenCalled()
    expect(useUserStore().isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
