import { http } from './http'
import type { CurrentUserResponse, LoginResponse, UserRole } from './types'

export interface LoginRequest {
  username: string
  password: string
  role: UserRole
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return http.post<LoginResponse, LoginRequest>('/auth/login', payload)
}

export function fetchCurrentUser(): Promise<CurrentUserResponse> {
  return http.get<CurrentUserResponse>('/auth/me')
}

export function refreshToken(refreshToken: string): Promise<LoginResponse> {
  return http.post<LoginResponse, RefreshTokenRequest>('/auth/refresh', { refreshToken })
}
