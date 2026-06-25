import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'

import { router } from '@/router'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'

import { API_ERROR_CODE, type ApiResult } from './types'

export class ApiError extends Error {
  readonly code: string
  readonly status?: number
  readonly payload?: unknown

  constructor(message: string, code: string, status?: number, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.payload = payload
  }
}

export interface HttpClient {
  request<T = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<T>
  get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000
})

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string): void {
  const headers = AxiosHeaders.from(config.headers)
  headers.set('Authorization', `Bearer ${token}`)
  config.headers = headers
}

function notifyError(text: string): void {
  useUiStore().notify({ type: 'error', text })
}

function stopLoading(): void {
  useUiStore().stopLoading()
}

export function isApiResult(value: unknown): value is ApiResult<unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.code === 'string' && typeof candidate.message === 'string' && 'data' in candidate
}

export function unwrapResult<T>(result: ApiResult<T>): T {
  if (result.code === API_ERROR_CODE.SUCCESS) {
    return result.data
  }

  throw new ApiError(result.message || '请求处理失败', result.code, undefined, result)
}

export function handleUnauthorized(message = '登录已过期，请重新登录'): void {
  const userStore = useUserStore()
  userStore.clearSession()
  notifyError(message)

  if (router.currentRoute.value.path !== '/login') {
    void router.push({
      path: '/login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
  }
}

function handleBusinessResult<T>(result: ApiResult<T>): T {
  if (result.code === API_ERROR_CODE.SUCCESS) {
    return result.data
  }

  if (result.code === API_ERROR_CODE.UNAUTHORIZED) {
    handleUnauthorized(result.message)
    throw new ApiError(result.message || '登录已过期，请重新登录', result.code, 401, result)
  }

  if (result.code === API_ERROR_CODE.FORBIDDEN) {
    notifyError(result.message || '权限不足')
    void router.push('/403')
    throw new ApiError(result.message || '权限不足', result.code, 403, result)
  }

  notifyError(result.message || '请求处理失败')
  throw new ApiError(result.message || '请求处理失败', result.code, undefined, result)
}

function normalizeAxiosError(error: AxiosError): ApiError {
  const status = error.response?.status
  const responseData = error.response?.data
  const responseMessage = isApiResult(responseData) && responseData.message ? responseData.message : undefined

  if (status === 401) {
    const message = responseMessage || '登录已过期，请重新登录'
    handleUnauthorized(message)
    return new ApiError(message, API_ERROR_CODE.UNAUTHORIZED, status, responseData)
  }

  if (status === 403) {
    const message = responseMessage || '权限不足'
    notifyError(message)
    void router.push('/403')
    return new ApiError(message, API_ERROR_CODE.FORBIDDEN, status, responseData)
  }

  if (status && status >= 500) {
    notifyError('服务器出错，请稍后重试')
    return new ApiError('服务器出错，请稍后重试', API_ERROR_CODE.SYSTEM_ERROR, status, responseData)
  }

  if (!error.response) {
    notifyError('网络连接失败，请检查网络')
    return new ApiError('网络连接失败，请检查网络', 'NETWORK_ERROR', undefined, error)
  }

  const message =
    isApiResult(responseData) && responseData.message ? responseData.message : error.message || '请求处理失败'
  notifyError(message)
  return new ApiError(message, String(status || API_ERROR_CODE.BUSINESS_ERROR), status, responseData)
}

axiosClient.interceptors.request.use((config) => {
  useUiStore().startLoading()

  const token = useUserStore().accessToken
  if (token) {
    setAuthorizationHeader(config, token)
  }

  return config
})

const unwrapResponse = (response: AxiosResponse<ApiResult<unknown> | unknown>): unknown => {
    stopLoading()

    if (isApiResult(response.data)) {
      return handleBusinessResult(response.data)
    }

    return response.data
}

axiosClient.interceptors.response.use(
  unwrapResponse as unknown as (response: AxiosResponse) => AxiosResponse,
  (error: AxiosError) => {
    stopLoading()
    return Promise.reject(normalizeAxiosError(error))
  }
)

export const http: HttpClient = {
  request<T = unknown, D = unknown>(config: AxiosRequestConfig<D>): Promise<T> {
    return axiosClient.request<ApiResult<T> | T, T, D>(config)
  },
  get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T> {
    return axiosClient.get<ApiResult<T> | T, T, D>(url, config)
  },
  delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T> {
    return axiosClient.delete<ApiResult<T> | T, T, D>(url, config)
  },
  post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    return axiosClient.post<ApiResult<T> | T, T, D>(url, data, config)
  },
  put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    return axiosClient.put<ApiResult<T> | T, T, D>(url, data, config)
  },
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
    return axiosClient.patch<ApiResult<T> | T, T, D>(url, data, config)
  }
}
