export type UserRole = 'admin' | 'doctor' | 'patient'
export type UserStatus = 0 | 1
export type ManagedAccountRole = Extract<UserRole, 'admin' | 'doctor'>

export const API_ERROR_CODE = {
  SUCCESS: '0000',
  INVALID_PARAM: '4000',
  UNAUTHORIZED: '4001',
  FORBIDDEN: '4003',
  BUSINESS_ERROR: '5001',
  SYSTEM_ERROR: '5000'
} as const

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE] | string

export interface ApiResult<T> {
  code: string
  message: string
  data: T
  timestamp: number
}

export interface PageResult<T> {
  total: number
  pages: number
  records: T[]
  pageNo: number
  pageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface BackendPageResponse<T> {
  records: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface AdminUserSummary {
  id: number
  username: string
  role: UserRole
  status: UserStatus
  createTime: string | null
  updateTime: string | null
}

export interface AdminUserQuery {
  keyword?: string
  role?: UserRole
  status?: UserStatus
  page?: number
  size?: number
}

export interface CreateAdminUserRequest {
  username: string
  password: string
  role: ManagedAccountRole
  status?: UserStatus
}

export interface UpdateAdminUserRequest {
  username?: string
  role?: ManagedAccountRole
  status?: UserStatus
}

export interface UpdateAdminUserStatusRequest {
  status: UserStatus
}

export interface ResetAdminUserPasswordRequest {
  newPassword: string
}

export interface AuthUserInfo {
  userId?: number
  username?: string
  role?: UserRole
  patientId: number | null
  doctorId: number | null
  displayName: string | null
  departmentName: string | null
}

export type UserProfile = AuthUserInfo

export interface AuthSessionResponse {
  userId: number
  username: string
  role: UserRole
  accessToken: string
  refreshToken?: string | null
  userInfo?: AuthUserInfo | null
}

export type LoginResponse = AuthSessionResponse

export interface CurrentUserResponse {
  userId: number
  username: string
  role: UserRole
  accessToken?: string | null
  refreshToken?: string | null
  userInfo?: AuthUserInfo | null
}
