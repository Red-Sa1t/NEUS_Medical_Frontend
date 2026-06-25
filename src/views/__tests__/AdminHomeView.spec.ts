import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminHomeView from '../AdminHomeView.vue'

const adminUsersMock = vi.hoisted(() => ({
  listAdminUsers: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  resetAdminUserPassword: vi.fn()
}))

vi.mock('@/api/adminUsers', () => adminUsersMock)

vi.mock('@/components/AppShell.vue', () => ({
  default: {
    template: '<div class="app-shell-stub"><slot /></div>'
  }
}))

const elementStubs = {
  ElAlert: {
    props: ['title'],
    template: '<div class="el-alert">{{ title }}</div>'
  },
  ElButton: {
    props: ['disabled', 'loading', 'nativeType'],
    emits: ['click'],
    template:
      '<button v-bind="$attrs" :type="nativeType || \'button\'" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
  },
  ElDialog: {
    props: ['modelValue', 'title'],
    template:
      '<section v-if="modelValue" class="el-dialog"><h3>{{ title }}</h3><slot /><footer><slot name="footer" /></footer></section>'
  },
  ElForm: {
    template: '<form><slot /></form>'
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
  ElOption: {
    props: ['label', 'value'],
    template: '<option :value="value">{{ label }}</option>'
  },
  ElPagination: {
    emits: ['current-change', 'size-change'],
    template:
      '<nav><button type="button" data-testid="page-2" @click="$emit(\'current-change\', 2)">page2</button><button type="button" data-testid="size-20" @click="$emit(\'size-change\', 20)">size20</button></nav>'
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    methods: {
      normalize(value: string) {
        if (value === '0') {
          return 0
        }
        if (value === '1') {
          return 1
        }
        return value
      }
    },
    template:
      '<select v-bind="$attrs" :value="modelValue" @change="$emit(\'update:modelValue\', normalize($event.target.value))"><slot /></select>'
  },
  ElSwitch: {
    props: ['modelValue', 'activeValue', 'inactiveValue', 'disabled', 'loading'],
    emits: ['change'],
    computed: {
      nextValue(): unknown {
        return this.modelValue === this.activeValue ? this.inactiveValue : this.activeValue
      }
    },
    template:
      '<button v-bind="$attrs" type="button" :disabled="disabled || loading" @click="$emit(\'change\', nextValue)">{{ modelValue === activeValue ? \'启用\' : \'禁用\' }}</button>'
  },
  ElTable: {
    template: '<div class="el-table-stub"><slot /></div>'
  },
  ElTableColumn: {
    template: '<div class="el-table-column-stub" />'
  },
  ElTag: {
    template: '<span class="el-tag"><slot /></span>'
  }
}

function usersPage(records = demoUsers()) {
  return {
    records,
    total: records.length,
    page: 1,
    size: 10,
    pages: 1
  }
}

function demoUsers() {
  return [
    {
      id: 1,
      username: 'admin',
      role: 'admin' as const,
      status: 1 as const,
      createTime: '2026-06-01T08:30:00',
      updateTime: '2026-06-02T09:40:00'
    },
    {
      id: 2,
      username: 'doctor',
      role: 'doctor' as const,
      status: 1 as const,
      createTime: '2026-06-03T08:30:00',
      updateTime: '2026-06-04T09:40:00'
    },
    {
      id: 3,
      username: 'patient',
      role: 'patient' as const,
      status: 0 as const,
      createTime: null,
      updateTime: null
    }
  ]
}

function mountSubject() {
  return mount(AdminHomeView, {
    global: {
      stubs: elementStubs
    }
  })
}

function findButton(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((item) => item.text().includes(text))
  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }
  return button
}

describe('AdminHomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminUsersMock.listAdminUsers.mockResolvedValue(usersPage())
    adminUsersMock.createAdminUser.mockResolvedValue(demoUsers()[1])
    adminUsersMock.updateAdminUser.mockResolvedValue({ ...demoUsers()[0], username: 'admin2' })
    adminUsersMock.updateAdminUserStatus.mockResolvedValue({ ...demoUsers()[1], status: 0 })
    adminUsersMock.resetAdminUserPassword.mockResolvedValue(undefined)
  })

  it('loads the first page on mount and renders returned usernames', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    expect(adminUsersMock.listAdminUsers).toHaveBeenCalledWith({
      keyword: '',
      role: undefined,
      status: undefined,
      page: 1,
      size: 10
    })
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('doctor')
  })

  it('searches with keyword, role and status while resetting to page one', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    await wrapper.find('input').setValue('doc')
    const selects = wrapper.findAll('select')
    await selects[0].setValue('doctor')
    await selects[1].setValue('0')
    await findButton(wrapper, '查询').trigger('click')
    await flushPromises()

    expect(adminUsersMock.listAdminUsers).toHaveBeenLastCalledWith({
      keyword: 'doc',
      role: 'doctor',
      status: 0,
      page: 1,
      size: 10
    })
  })

  it('resets filters and reloads the first page', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    await wrapper.find('input').setValue('admin')
    await wrapper.findAll('select')[0].setValue('admin')
    await findButton(wrapper, '重置').trigger('click')
    await flushPromises()

    expect(adminUsersMock.listAdminUsers).toHaveBeenLastCalledWith({
      keyword: '',
      role: undefined,
      status: undefined,
      page: 1,
      size: 10
    })
  })

  it('loads the selected page and resets to first page when page size changes', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    await wrapper.find('[data-testid="page-2"]').trigger('click')
    await flushPromises()

    expect(adminUsersMock.listAdminUsers).toHaveBeenLastCalledWith({
      keyword: '',
      role: undefined,
      status: undefined,
      page: 2,
      size: 10
    })

    await wrapper.find('[data-testid="size-20"]').trigger('click')
    await flushPromises()

    expect(adminUsersMock.listAdminUsers).toHaveBeenLastCalledWith({
      keyword: '',
      role: undefined,
      status: undefined,
      page: 1,
      size: 20
    })
  })

  it('creates a doctor user and reloads the first page without echoing the password', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    await findButton(wrapper, '新建用户').trigger('click')
    const dialog = wrapper.find('.el-dialog')
    const inputs = dialog.findAll('input')
    await inputs[0].setValue('doctor2')
    await inputs[1].setValue('123456')
    await findButton(dialog as unknown as VueWrapper, '保存').trigger('click')
    await flushPromises()

    expect(adminUsersMock.createAdminUser).toHaveBeenCalledWith({
      username: 'doctor2',
      password: '123456',
      role: 'doctor',
      status: 1
    })
    expect(adminUsersMock.listAdminUsers).toHaveBeenLastCalledWith({
      keyword: '',
      role: undefined,
      status: undefined,
      page: 1,
      size: 10
    })
    expect(wrapper.text()).toContain('用户已创建')
    expect(wrapper.text()).not.toContain('123456')
  })

  it('edits admin or doctor users without sending password fields', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    await wrapper.find('[data-testid="edit-user-1"]').trigger('click')
    const dialog = wrapper.find('.el-dialog')
    await dialog.find('input').setValue('admin2')
    await findButton(dialog as unknown as VueWrapper, '保存').trigger('click')
    await flushPromises()

    expect(adminUsersMock.updateAdminUser).toHaveBeenCalledWith(1, {
      username: 'admin2',
      role: 'admin',
      status: 1
    })
    expect(adminUsersMock.updateAdminUser.mock.calls[0][1]).not.toHaveProperty('password')
  })

  it('does not expose an enabled edit action for patient rows', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    expect(wrapper.find('[data-testid="edit-user-3"]').attributes('disabled')).toBeDefined()
  })

  it('updates user status through the status endpoint and reflects the returned row', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    expect(wrapper.get('[data-testid="mobile-status-2"]').text()).toBe('启用')

    await wrapper.get('[data-testid="mobile-status-2"]').trigger('click')
    await flushPromises()

    expect(adminUsersMock.updateAdminUserStatus).toHaveBeenCalledWith(2, { status: 0 })
    expect(wrapper.get('[data-testid="mobile-status-2"]').text()).toBe('禁用')
  })

  it('resets password without keeping the new password visible after success', async () => {
    const wrapper = mountSubject()
    await flushPromises()

    await wrapper.find('[data-testid="reset-user-2"]').trigger('click')
    const dialog = wrapper.find('.el-dialog')
    const inputs = dialog.findAll('input')
    await inputs[1].setValue('abcdef')
    await inputs[2].setValue('abcdef')
    await findButton(dialog as unknown as VueWrapper, '确认重置').trigger('click')
    await flushPromises()

    expect(adminUsersMock.resetAdminUserPassword).toHaveBeenCalledWith(2, { newPassword: 'abcdef' })
    expect(wrapper.text()).toContain('密码已重置')
    expect(wrapper.text()).not.toContain('abcdef')
  })

  it('keeps the reset password dialog open when resetting fails', async () => {
    adminUsersMock.resetAdminUserPassword.mockRejectedValueOnce(new Error('密码重置失败'))
    const wrapper = mountSubject()
    await flushPromises()

    await wrapper.find('[data-testid="reset-user-2"]').trigger('click')
    const dialog = wrapper.find('.el-dialog')
    const inputs = dialog.findAll('input')
    await inputs[1].setValue('abcdef')
    await inputs[2].setValue('abcdef')
    await findButton(dialog as unknown as VueWrapper, '确认重置').trigger('click')
    await flushPromises()

    expect(wrapper.find('.el-dialog').exists()).toBe(true)
    expect(wrapper.text()).toContain('密码重置失败')
  })

  it('shows list loading errors while keeping page actions available', async () => {
    adminUsersMock.listAdminUsers.mockRejectedValueOnce(new Error('用户列表加载失败'))

    const wrapper = mountSubject()
    await flushPromises()

    expect(wrapper.text()).toContain('用户列表加载失败')
    expect(findButton(wrapper, '新建用户').exists()).toBe(true)
  })

  it('keeps the create dialog open when saving fails', async () => {
    adminUsersMock.createAdminUser.mockRejectedValueOnce(new Error('用户保存失败'))

    const wrapper = mountSubject()
    await flushPromises()

    await findButton(wrapper, '新建用户').trigger('click')
    const dialog = wrapper.find('.el-dialog')
    const inputs = dialog.findAll('input')
    await inputs[0].setValue('doctor2')
    await inputs[1].setValue('123456')
    await findButton(dialog as unknown as VueWrapper, '保存').trigger('click')
    await flushPromises()

    expect(wrapper.find('.el-dialog').exists()).toBe(true)
    expect(wrapper.text()).toContain('用户保存失败')
  })
})
