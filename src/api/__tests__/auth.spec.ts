import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchCurrentUser, login } from '../auth'

const httpMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('../http', () => ({
  http: httpMock
}))

describe('auth api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts login payload including role to the unified auth endpoint', async () => {
    const payload = {
      username: 'admin',
      password: '123456',
      role: 'admin' as const
    }
    httpMock.post.mockResolvedValueOnce({ accessToken: 'token' })

    await login(payload)

    expect(httpMock.post).toHaveBeenCalledWith('/auth/login', payload)
  })

  it('fetches current user summary from auth me endpoint', async () => {
    httpMock.get.mockResolvedValueOnce({ userId: 1 })

    await fetchCurrentUser()

    expect(httpMock.get).toHaveBeenCalledWith('/auth/me')
  })
})
