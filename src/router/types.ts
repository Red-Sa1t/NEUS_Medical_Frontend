import type { UserRole } from '@/api/types'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: UserRole[]
    shell?: boolean
  }
}

export {}
