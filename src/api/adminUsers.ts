import { http } from './http'
import type {
  AdminUserQuery,
  AdminUserSummary,
  BackendPageResponse,
  CreateAdminUserRequest,
  ResetAdminUserPasswordRequest,
  UpdateAdminUserRequest,
  UpdateAdminUserStatusRequest
} from './types'

function normalizeAdminUserQuery(query?: AdminUserQuery | null): AdminUserQuery {
  const params: AdminUserQuery = {}

  if (!query) {
    return params
  }

  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''
  if (keyword) {
    params.keyword = keyword
  }

  if (query.role) {
    params.role = query.role
  }

  if (query.status === 0 || query.status === 1) {
    params.status = query.status
  }

  if (Number.isInteger(query.page) && Number(query.page) > 0) {
    params.page = query.page
  }

  if (Number.isInteger(query.size) && Number(query.size) > 0) {
    params.size = query.size
  }

  return params
}

export function listAdminUsers(query?: AdminUserQuery): Promise<BackendPageResponse<AdminUserSummary>> {
  return http.get<BackendPageResponse<AdminUserSummary>>('/admin/users', {
    params: normalizeAdminUserQuery(query)
  })
}

export function createAdminUser(payload: CreateAdminUserRequest): Promise<AdminUserSummary> {
  return http.post<AdminUserSummary, CreateAdminUserRequest>('/admin/users', payload)
}

export function updateAdminUser(id: number, payload: UpdateAdminUserRequest): Promise<AdminUserSummary> {
  return http.put<AdminUserSummary, UpdateAdminUserRequest>(`/admin/users/${id}`, payload)
}

export function updateAdminUserStatus(
  id: number,
  payload: UpdateAdminUserStatusRequest
): Promise<AdminUserSummary> {
  return http.patch<AdminUserSummary, UpdateAdminUserStatusRequest>(`/admin/users/${id}/status`, payload)
}

export function resetAdminUserPassword(id: number, payload: ResetAdminUserPasswordRequest): Promise<void> {
  return http.post<void, ResetAdminUserPasswordRequest>(`/admin/users/${id}/reset-password`, payload)
}
