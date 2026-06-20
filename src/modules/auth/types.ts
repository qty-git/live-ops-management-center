export const USER_ROLES = ['member', 'manager', 'admin', 'super_admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_POSITIONS = ['主播', '中控', '场控', '摄影', '运营', '管理'] as const

export type UserPosition = (typeof USER_POSITIONS)[number]

export const PERMISSIONS = [
  'timeline:view',
  'timeline:view_all',
  'timeline:manage',
  'task:highlight_own',
  'task:edit_own',
  'task:edit_all',
  'task_feedback:edit_own',
  'task_feedback:edit_all',
  'people:manage',
  'templates:manage',
  'event_templates:edit',
  'day_plan_templates:edit',
  'issues:manage',
  'exports:use',
  'users:view',
  'users:manage',
  'permissions:manage',
  'perspective:switch',
  'edit_center:view',
  'issue_library:view',
  'video_templates:view',
  'video_templates:edit',
  'video_scripts:view',
  'video_scripts:edit',
  'live_data:view',
  'live_data:edit',
  'product_links:view',
  'product_links:edit',
  'review_report:view',
  'data:delete',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type UserStatus = 'active' | 'disabled'

export interface UserRecord {
  id: string
  username: string
  name: string
  phone: string
  role: UserRole
  position: UserPosition
  permissions: Permission[]
  status: UserStatus
  passwordHash: string
  personId: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  createdBy: string | null
}

export interface UserStore {
  version: 3
  users: UserRecord[]
  updatedAt: string
}

export interface AuthUser {
  id: string
  username: string
  name: string
  role: UserRole
  position: UserPosition
  permissions: Permission[]
  personId: string | null
}

export interface AuthSession {
  version: 4
  user: AuthUser
  signedInAt: string
}

export interface LoginResult {
  ok: boolean
  user?: AuthUser
  message?: string
}
