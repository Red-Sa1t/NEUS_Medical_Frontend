import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserStore } from '@/stores/user'

import AppShell from '../AppShell.vue'

const routerMock = vi.hoisted(() => ({
  currentRoute: {
    value: {
      path: '/admin'
    }
  },
  push: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => routerMock
}))

const elementStubs = {
  ElButton: {
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
  },
  ElMenu: {
    props: ['defaultActive'],
    template: '<nav><slot /></nav>'
  },
  ElMenuItem: {
    props: ['index'],
    template: '<div class="menu-item"><slot /></div>'
  }
}

describe('AppShell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerMock.currentRoute.value = {
      path: '/admin'
    }
  })

  it('shows role-specific navigation and clears session on logout', async () => {
    const userStore = useUserStore()
    userStore.setSession({
      accessToken: 'admin-token',
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

    const wrapper = mount(AppShell, {
      global: {
        stubs: elementStubs
      },
      slots: {
        default: '<section>主内容</section>'
      }
    })

    expect(wrapper.text()).toContain('管理后台')
    expect(wrapper.text()).not.toContain('医生工作台')
    expect(wrapper.text()).toContain('系统管理员')
    expect(wrapper.text()).toContain('主内容')

    const logoutButton = wrapper.findAll('button').find((button) => button.text() === '退出')
    expect(logoutButton).toBeDefined()
    await logoutButton?.trigger('click')

    expect(userStore.isAuthenticated).toBe(false)
    expect(routerMock.push).toHaveBeenCalledWith('/login')
  })
})
