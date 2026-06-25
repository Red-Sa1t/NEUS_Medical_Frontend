import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
  type RouteRecordRaw
} from 'vue-router'

import type { UserRole } from '@/api/types'
import { useUserStore } from '@/stores/user'

import './types'

export function getDefaultRouteByRole(role: UserRole | null): string {
  if (role === 'admin') {
    return '/admin'
  }

  if (role === 'doctor') {
    return '/doctor'
  }

  if (role === 'patient') {
    return '/patient'
  }

  return '/login'
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/patient',
    name: 'patient-home',
    component: () => import('@/views/PatientHomeView.vue'),
    meta: { title: '患者工作台', requiresAuth: true, roles: ['patient'], shell: true }
  },
  {
    path: '/doctor',
    name: 'doctor-home',
    component: () => import('@/views/DoctorHomeView.vue'),
    meta: { title: '医生工作台', requiresAuth: true, roles: ['doctor'], shell: true }
  },
  {
    path: '/admin',
    name: 'admin-home',
    component: () => import('@/views/AdminHomeView.vue'),
    meta: { title: '管理员工作台', requiresAuth: true, roles: ['admin'], shell: true }
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: '无权访问' }
  },
  {
    path: '/',
    name: 'root',
    redirect: () => getDefaultRouteByRole(useUserStore().role)
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' }
  }
]

export interface CreateAppRouterOptions {
  history?: RouterHistory
}

function installRouterGuards(appRouter: Router): Router {
  let hydrated = false

  appRouter.beforeEach((to) => {
    const userStore = useUserStore()

    if (!hydrated) {
      userStore.hydrate()
      hydrated = true
    }

    if (to.name === 'login' && userStore.isAuthenticated) {
      return getDefaultRouteByRole(userStore.role)
    }

    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
      return {
        path: '/login',
        query: { redirect: to.fullPath }
      }
    }

    if (to.meta.roles && !userStore.hasAnyRole(to.meta.roles)) {
      return '/403'
    }

    document.title = to.meta.title
      ? `${to.meta.title} - 东软智慧云脑诊疗平台`
      : '东软智慧云脑诊疗平台'

    return true
  })

  return appRouter
}

export function createAppRouter(options?: CreateAppRouterOptions): Router {
  return installRouterGuards(
    createRouter({
      history: options?.history ?? createWebHistory(),
      routes
    })
  )
}

export const router: Router = createAppRouter()
