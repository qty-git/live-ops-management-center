import { PERMISSIONS, USER_POSITIONS, USER_ROLES, type Permission, type UserPosition, type UserRole } from './types'

export const PAGE_PERMISSION_MAP = {
  viewTimeline: 'timeline:view',
  viewEditCenter: 'edit_center:view',
  viewIssueLibrary: 'issue_library:view',
  viewVideoTemplates: 'video_templates:view',
  viewScriptManager: 'video_scripts:view',
  viewLiveData: 'live_data:view',
  viewProductLinks: 'product_links:view',
  viewReviewReport: 'review_report:view',
  manageUsers: 'users:manage',
  managePermissions: 'permissions:manage',
} as const satisfies Record<string, Permission>

export type PagePermission = keyof typeof PAGE_PERMISSION_MAP

const BUSINESS_PAGE_PERMISSIONS: readonly Permission[] = [
  'edit_center:view',
  'issue_library:view',
  'video_templates:view',
  'video_scripts:view',
  'live_data:view',
  'product_links:view',
  'review_report:view',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  member: '普通成员',
  manager: '主管',
  admin: '管理员',
  super_admin: '超级管理员',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  member: ['timeline:view', 'timeline:view_all', 'task:highlight_own', 'task_feedback:edit_own'],
  manager: [
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
    'video_templates:edit',
    'video_scripts:edit',
    'live_data:edit',
    'product_links:edit',
    ...BUSINESS_PAGE_PERMISSIONS,
  ],
  admin: [
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
    'video_templates:edit',
    'video_scripts:edit',
    'live_data:edit',
    'product_links:edit',
    'users:view',
    'users:manage',
    'perspective:switch',
    ...BUSINESS_PAGE_PERMISSIONS,
  ],
  super_admin: PERMISSIONS,
}

const roleSet = new Set<string>(USER_ROLES)
const positionSet = new Set<string>(USER_POSITIONS)
const permissionSet = new Set<string>(PERMISSIONS)

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && roleSet.has(value)
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && permissionSet.has(value)
}

export function isUserPosition(value: unknown): value is UserPosition {
  return typeof value === 'string' && positionSet.has(value)
}

export function getDefaultRolePermissions(role: UserRole): Permission[] {
  return [...DEFAULT_ROLE_PERMISSIONS[role]]
}

export function normalizeUserPermissions(role: UserRole, value: unknown, migratePagePermissions = false): Permission[] {
  if (!Array.isArray(value)) return getDefaultRolePermissions(role)

  const permissions = value.filter(isPermission)
  if (!migratePagePermissions) return [...new Set(permissions)]

  return [...new Set([...permissions, ...DEFAULT_ROLE_PERMISSIONS[role]])]
}

export function hasPermission(user: { permissions: readonly Permission[] }, permission: Permission): boolean {
  return user.permissions.includes(permission)
}

export function hasPagePermission(user: { permissions: readonly Permission[] }, permission: PagePermission): boolean {
  return hasPermission(user, PAGE_PERMISSION_MAP[permission])
}

export interface PermissionGroup {
  label: string
  items: ReadonlyArray<{ label: string; permission: Permission }>
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    label: '基础查看',
    items: [
      { label: '查看时间轴', permission: 'timeline:view' },
      { label: '查看所有人的全天工作计划', permission: 'timeline:view_all' },
      { label: '高亮自己的任务', permission: 'task:highlight_own' },
      { label: '查看复盘日报', permission: 'review_report:view' },
      { label: '查看问题案例库', permission: 'issue_library:view' },
    ],
  },
  {
    label: '工作编辑',
    items: [
      { label: '编辑自己的任务', permission: 'task:edit_own' },
      { label: '编辑自己的任务反馈', permission: 'task_feedback:edit_own' },
      { label: '编辑所有人的任务', permission: 'task:edit_all' },
      { label: '编辑时间轴计划', permission: 'timeline:manage' },
    ],
  },
  {
    label: '模板权限',
    items: [
      { label: '查看编辑中心', permission: 'edit_center:view' },
      { label: '编辑岗位人员', permission: 'people:manage' },
      { label: '编辑大事件模板', permission: 'event_templates:edit' },
      { label: '编辑整日计划模板', permission: 'day_plan_templates:edit' },
    ],
  },
  {
    label: '内容管理',
    items: [
      { label: '查看视频拍摄模板', permission: 'video_templates:view' },
      { label: '编辑视频拍摄模板', permission: 'video_templates:edit' },
      { label: '查看视频脚本管理', permission: 'video_scripts:view' },
      { label: '编辑视频脚本管理', permission: 'video_scripts:edit' },
      { label: '查看商品链接', permission: 'product_links:view' },
      { label: '编辑商品链接', permission: 'product_links:edit' },
    ],
  },
  {
    label: '数据与导出',
    items: [
      { label: '查看直播数据', permission: 'live_data:view' },
      { label: '编辑直播数据', permission: 'live_data:edit' },
      { label: '导出 Excel', permission: 'exports:use' },
    ],
  },
  {
    label: '系统管理',
    items: [
      { label: '管理账号', permission: 'users:manage' },
      { label: '分配权限', permission: 'permissions:manage' },
      { label: '切换成员视角', permission: 'perspective:switch' },
      { label: '删除数据', permission: 'data:delete' },
    ],
  },
]
