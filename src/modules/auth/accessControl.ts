import { hasPermission } from './permissions'
import type { AuthUser, Permission, UserRecord } from './types'

export interface UserPerspective {
  realUser: AuthUser
  viewUser: AuthUser | null
}

export function getRealUser(perspective: UserPerspective): AuthUser {
  return perspective.realUser
}

export function getViewUser(perspective: UserPerspective): AuthUser | null {
  return perspective.viewUser
}

export function getEffectiveUser(perspective: UserPerspective): AuthUser {
  return perspective.viewUser ?? perspective.realUser
}

export function canUseRealPermission(perspective: UserPerspective, permission: Permission): boolean {
  return hasPermission(getRealUser(perspective), permission)
}

export function canUseEffectivePermission(perspective: UserPerspective, permission: Permission): boolean {
  return hasPermission(getEffectiveUser(perspective), permission)
}

export function requirePermission(
  user: Pick<AuthUser, 'permissions'>,
  permission: Permission,
  onDenied: (message: string) => void,
  message = '你没有权限执行此操作',
): boolean {
  if (hasPermission(user, permission)) return true
  onDenied(message)
  return false
}

export function assertPermission(
  user: Pick<AuthUser, 'permissions'>,
  permission: Permission,
  message = '你没有权限执行此操作',
): void {
  if (!hasPermission(user, permission)) throw new Error(message)
}

export function canSwitchPerspective(realUser: AuthUser): boolean {
  return realUser.role === 'super_admin' && hasPermission(realUser, 'perspective:switch')
}

export function canUseAsViewUser(realUser: AuthUser, target: UserRecord): boolean {
  return target.id !== realUser.id && target.status === 'active' && (target.role === 'member' || target.role === 'manager')
}

export function canManageTargetUser(realUser: Pick<AuthUser, 'role'>, targetUser: Pick<UserRecord, 'role'>): boolean {
  return targetUser.role !== 'super_admin' || realUser.role === 'super_admin'
}
