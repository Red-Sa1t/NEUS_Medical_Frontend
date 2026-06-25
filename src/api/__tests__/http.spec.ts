import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'

import { ApiError, http, isApiResult, unwrapResult } from '../http'
import { API_ERROR_CODE, type ApiResult, type LoginResponse } from '../types'

const routerMock = vi.hoisted(() => ({
  currentRoute: {
    value: {
      path: '/admin',
      fullPath: '/admin'
    }
  },
  push: vi.fn()
}))

const axiosMock = vi.hoisted(() => {
  class AxiosHeadersMock {
    private readonly values = new Map<string, string>()

    constructor(initial?: unknown) {
      if (!initial || typeof initial !== 'object') {
        return
      }

      Object.entries(initial as Record<string, string>).forEach(([key, value]) => {
        this.set(key, value)
      })
    }

    static from(headers: unknown): AxiosHeadersMock {
      return headers instanceof AxiosHeadersMock ? headers : new AxiosHeadersMock(headers)
    }

    set(name: string, value: string): void {
      this.values.set(name.toLowerCase(), value)
    }

    get(name: string): string | undefined {
      return this.values.get(name.toLowerCase())
    }
  }

  type RequestHandler = (config: Record<string, unknown>) => Record<string, unknown>
  type ResponseHandler = (response: Record<string, unknown>) => unknown
  type ErrorHandler = (error: unknown) => unknown

  const requestHandlers: RequestHandler[] = []
  const responseHandlers: ResponseHandler[] = []
  const errorHandlers: ErrorHandler[] = []
  let responseData: unknown = null
  let nextError: unknown
  let lastConfig: Record<string, unknown> | undefined

  async function invoke(config: Record<string, unknown>): Promise<unknown> {
    let requestConfig = config
    for (const handler of requestHandlers) {
      requestConfig = await handler(requestConfig)
    }
    lastConfig = requestConfig

    if (nextError) {
      const error = nextError
      nextError = undefined
      let chain = Promise.reject(error)
      for (const handler of errorHandlers) {
        chain = chain.catch(handler)
      }
      return chain
    }

    let response: unknown = {
      config: requestConfig,
      data: responseData,
      headers: {},
      status: 200
    }

    for (const handler of responseHandlers) {
      response = await handler(response as Record<string, unknown>)
    }

    return response
  }

  const client = {
    interceptors: {
      request: {
        use: vi.fn((handler: RequestHandler) => {
          requestHandlers.push(handler)
        })
      },
      response: {
        use: vi.fn((handler: ResponseHandler, errorHandler: ErrorHandler) => {
          responseHandlers.push(handler)
          errorHandlers.push(errorHandler)
        })
      }
    },
    request: vi.fn((config: Record<string, unknown>) => invoke(config)),
    get: vi.fn((url: string, config: Record<string, unknown> = {}) => invoke({ ...config, method: 'get', url })),
    delete: vi.fn((url: string, config: Record<string, unknown> = {}) =>
      invoke({ ...config, method: 'delete', url })
    ),
    post: vi.fn((url: string, data?: unknown, config: Record<string, unknown> = {}) =>
      invoke({ ...config, data, method: 'post', url })
    ),
    put: vi.fn((url: string, data?: unknown, config: Record<string, unknown> = {}) =>
      invoke({ ...config, data, method: 'put', url })
    ),
    patch: vi.fn((url: string, data?: unknown, config: Record<string, unknown> = {}) =>
      invoke({ ...config, data, method: 'patch', url })
    )
  }

  return {
    AxiosHeadersMock,
    client,
    create: vi.fn(() => client),
    getLastConfig: () => lastConfig,
    resetRuntime: () => {
      responseData = null
      nextError = undefined
      lastConfig = undefined
    },
    setNextError: (error: unknown) => {
      nextError = error
    },
    setResponseData: (data: unknown) => {
      responseData = data
    }
  }
})

vi.mock('@/router', () => ({
  router: routerMock
}))

vi.mock('axios', () => ({
  default: {
    create: axiosMock.create
  },
  AxiosHeaders: axiosMock.AxiosHeadersMock
}))

function apiResult<T>(code: string, data: T, message = 'ok'): ApiResult<T> {
  return {
    code,
    data,
    message,
    timestamp: 1
  }
}

function demoSession(): LoginResponse {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    role: 'admin',
    userId: 1,
    username: 'admin',
    userInfo: {
      patientId: null,
      doctorId: null,
      displayName: '系统管理员',
      departmentName: '平台管理部'
    }
  }
}

describe('http client', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    axiosMock.resetRuntime()
    routerMock.currentRoute.value = {
      path: '/admin',
      fullPath: '/admin'
    }
    routerMock.push.mockClear()
  })

  it('recognizes and unwraps backend ApiResult payloads', () => {
    expect(isApiResult(apiResult(API_ERROR_CODE.SUCCESS, { id: 1 }))).toBe(true)
    expect(isApiResult({ code: API_ERROR_CODE.SUCCESS, message: 'ok' })).toBe(false)
    expect(unwrapResult(apiResult(API_ERROR_CODE.SUCCESS, 'done'))).toBe('done')
    expect(() => unwrapResult(apiResult(API_ERROR_CODE.BUSINESS_ERROR, null, '业务失败'))).toThrow(ApiError)
  })

  it('unwraps successful responses and attaches bearer token from the user store', async () => {
    useUserStore().setSession(demoSession())
    axiosMock.setResponseData(apiResult(API_ERROR_CODE.SUCCESS, { displayName: '系统管理员' }))

    await expect(http.get<{ displayName: string }>('/users/me')).resolves.toEqual({
      displayName: '系统管理员'
    })

    const headers = axiosMock.getLastConfig()?.headers as InstanceType<typeof axiosMock.AxiosHeadersMock>
    expect(headers.get('Authorization')).toBe('Bearer access-token')
    expect(useUiStore().loadingCount).toBe(0)
  })

  it('turns forbidden business results into ApiError and routes to 403', async () => {
    axiosMock.setResponseData(apiResult(API_ERROR_CODE.FORBIDDEN, null, '权限不足'))

    await expect(http.get('/admin-only')).rejects.toMatchObject({
      code: API_ERROR_CODE.FORBIDDEN,
      status: 403
    })

    expect(routerMock.push).toHaveBeenCalledWith('/403')
    expect(useUiStore().message).toEqual({ type: 'error', text: '权限不足' })
    expect(useUiStore().loadingCount).toBe(0)
  })

  it('clears session and redirects with current full path when unauthorized', async () => {
    const userStore = useUserStore()
    userStore.setSession(demoSession())
    routerMock.currentRoute.value = {
      path: '/doctor',
      fullPath: '/doctor?tab=today'
    }
    axiosMock.setResponseData(apiResult(API_ERROR_CODE.UNAUTHORIZED, null, '登录已过期'))

    await expect(http.get('/secure')).rejects.toMatchObject({
      code: API_ERROR_CODE.UNAUTHORIZED,
      status: 401
    })

    expect(userStore.isAuthenticated).toBe(false)
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/doctor?tab=today' }
    })
    expect(useUiStore().message).toEqual({ type: 'error', text: '登录已过期' })
  })

  it('preserves backend unauthorized messages from rejected axios responses', async () => {
    routerMock.currentRoute.value = {
      path: '/login',
      fullPath: '/login'
    }
    axiosMock.setNextError({
      response: {
        status: 401,
        data: apiResult(API_ERROR_CODE.UNAUTHORIZED, null, '认证失败')
      }
    })

    await expect(http.post('/auth/login', { username: 'admin', password: 'bad', role: 'admin' })).rejects.toThrow(
      '认证失败'
    )

    expect(routerMock.push).not.toHaveBeenCalled()
    expect(useUiStore().message).toEqual({ type: 'error', text: '认证失败' })
  })
})
