import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserStatus
} from '../adminUsers'

const httpMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn()
}))

vi.mock('../http', () => ({
  http: httpMock
}))

describe('admin users api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin users with normalized filters and backend pagination params', async () => {
    httpMock.get.mockResolvedValueOnce({ records: [] })

    await listAdminUsers({
      keyword: '  admin  ',
      role: 'admin',
      status: 1,
      page: 2,
      size: 20
    })

    expect(httpMock.get).toHaveBeenCalledWith('/admin/users', {
      params: {
        keyword: 'admin',
        role: 'admin',
        status: 1,
        page: 2,
        size: 20
      }
    })
  })

  it('omits empty query values when listing users', async () => {
    httpMock.get.mockResolvedValueOnce({ records: [] })

    await listAdminUsers({
      keyword: '   ',
      role: undefined,
      status: undefined,
      page: 0,
      size: -1
    })

    expect(httpMock.get).toHaveBeenCalledWith('/admin/users', {
      params: {}
    })
  })

  it('uses an empty params object when listing users without filters', async () => {
    httpMock.get.mockResolvedValueOnce({ records: [] })

    await listAdminUsers()

    expect(httpMock.get).toHaveBeenCalledWith('/admin/users', {
      params: {}
    })
  })

  it('creates an admin or doctor user through the admin users endpoint', async () => {
    const payload = {
      username: 'doctor1',
      password: '123456',
      role: 'doctor' as const,
      status: 1 as const
    }
    httpMock.post.mockResolvedValueOnce({ id: 2 })

    await createAdminUser(payload)

    expect(httpMock.post).toHaveBeenCalledWith('/admin/users', payload)
  })

  it('updates basic admin user information without password fields', async () => {
    const payload = {
      username: 'doctor2',
      role: 'doctor' as const,
      status: 0 as const
    }
    httpMock.put.mockResolvedValueOnce({ id: 2 })

    await updateAdminUser(2, payload)

    expect(httpMock.put).toHaveBeenCalledWith('/admin/users/2', payload)
  })

  it('updates user status through the status endpoint', async () => {
    httpMock.patch.mockResolvedValueOnce({ id: 2, status: 0 })

    await updateAdminUserStatus(2, { status: 0 })

    expect(httpMock.patch).toHaveBeenCalledWith('/admin/users/2/status', { status: 0 })
  })

  it('resets password without exposing the password in the path', async () => {
    httpMock.post.mockResolvedValueOnce(undefined)

    await resetAdminUserPassword(2, { newPassword: '654321' })

    expect(httpMock.post).toHaveBeenCalledWith('/admin/users/2/reset-password', { newPassword: '654321' })
  })
})
