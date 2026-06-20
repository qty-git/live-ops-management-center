import { getDefaultRolePermissions, hasPermission, isUserPosition, isUserRole, normalizeUserPermissions } from './permissions'
import { canManageTargetUser } from './accessControl'
import type { AuthUser, Permission, UserPosition, UserRecord, UserRole, UserStatus, UserStore } from './types'

export const USERS_STORAGE_KEY = 'live-ops-management.users.v1'

const DEFAULT_ADMIN_ID = 'system-super-admin'
const DEFAULT_ADMIN_PASSWORD_HASH = 'ac0e7d037817094e9e0b4441f9bae3209d67b02fa484917065f71b16109a1a78'

export interface UserProfileInput {
  username: string
  name: string
  phone: string
  role: UserRole
  position: UserPosition
  personId: string | null
  status: UserStatus
}

export interface NewUserInput extends UserProfileInput {
  passwordHash: string
}

type UserActor = Pick<AuthUser, 'id' | 'role' | 'permissions'>

export function loadUserStore(): UserStore {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return initializeUserStore()

    const parsed = JSON.parse(raw) as unknown
    const normalized = normalizeUserStore(parsed)
    if (!normalized) return initializeUserStore()

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized))
    }

    return normalized
  } catch {
    return initializeUserStore()
  }
}

export function saveUserStore(store: UserStore): UserStore {
  const normalized = normalizeUserStore(store)
  if (!normalized) throw new Error('账号数据无效，无法保存')
  const nextStore: UserStore = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextStore))
  return nextStore
}

export function findUserByUsername(store: UserStore, username: string): UserRecord | null {
  const normalizedUsername = normalizeUsername(username)
  return store.users.find((user) => user.username === normalizedUsername) ?? null
}

export function findUserById(store: UserStore, userId: string): UserRecord | null {
  return store.users.find((user) => user.id === userId) ?? null
}

export function createUser(store: UserStore, input: NewUserInput, actor: UserActor): UserStore {
  assertSystemManager(actor, 'users:manage', '你没有权限新增账号')
  assertCreatableRole(input.role)
  validateProfile(store, input)
  if (!input.passwordHash) throw new Error('请输入初始密码')

  const now = new Date().toISOString()
  const user: UserRecord = {
    id: createUserId(),
    username: normalizeUsername(input.username),
    name: input.name.trim(),
    phone: input.phone.trim(),
    role: input.role,
    position: input.position,
    permissions: getDefaultRolePermissions(input.role),
    status: input.status,
    passwordHash: input.passwordHash,
    personId: input.personId,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: actor.id,
  }

  return saveUserStore({ ...store, users: [...store.users, user] })
}

export function updateUserProfile(store: UserStore, userId: string, input: UserProfileInput, actor: UserActor): UserStore {
  assertSystemManager(actor, 'users:manage', '你没有权限编辑账号')
  const target = requireUser(store, userId)
  assertTargetMayBeManaged(actor, target)
  assertRoleMayBeUpdated(target, input.role)
  validateProfile(store, input, userId)

  const now = new Date().toISOString()
  return saveUserStore({
    ...store,
    users: store.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            username: normalizeUsername(input.username),
            name: input.name.trim(),
            phone: input.phone.trim(),
            role: input.role,
            position: input.position,
            personId: input.personId,
            status: input.status,
            permissions: normalizeUserPermissions(
              input.role,
              user.role === input.role ? user.permissions : getDefaultRolePermissions(input.role),
            ),
            updatedAt: now,
          }
        : user,
    ),
  })
}

export function updateUserPermissions(store: UserStore, userId: string, permissions: Permission[], actor: UserActor): UserStore {
  assertSystemManager(actor, 'permissions:manage', '你没有权限分配权限')
  const target = requireUser(store, userId)
  assertTargetMayBeManaged(actor, target)
  const normalizedPermissions = normalizeUserPermissions(target.role, permissions)
  const now = new Date().toISOString()

  return saveUserStore({
    ...store,
    users: store.users.map((user) => (user.id === userId ? { ...user, permissions: normalizedPermissions, updatedAt: now } : user)),
  })
}

export function resetUserPassword(store: UserStore, userId: string, passwordHash: string, actor: UserActor): UserStore {
  assertSystemManager(actor, 'users:manage', '你没有权限重置密码')
  if (!passwordHash) throw new Error('请输入新密码')
  const target = requireUser(store, userId)
  assertTargetMayBeManaged(actor, target)
  const now = new Date().toISOString()

  return saveUserStore({
    ...store,
    users: store.users.map((user) => (user.id === userId ? { ...user, passwordHash, updatedAt: now } : user)),
  })
}

export function setUserStatus(store: UserStore, userId: string, status: UserStatus, actor: UserActor): UserStore {
  assertSystemManager(actor, 'users:manage', '你没有权限修改账号状态')
  const target = requireUser(store, userId)
  assertTargetMayBeManaged(actor, target)
  if (target.id === actor.id && status === 'disabled') throw new Error('不能禁用当前登录账号')
  const now = new Date().toISOString()

  return saveUserStore({
    ...store,
    users: store.users.map((user) => (user.id === userId ? { ...user, status, updatedAt: now } : user)),
  })
}

export function deleteUser(store: UserStore, userId: string, actor: UserActor): UserStore {
  assertSystemManager(actor, 'users:manage', '你没有权限删除账号')
  const target = requireUser(store, userId)
  if (target.id === actor.id) throw new Error('不能删除当前登录账号')
  if (target.role === 'super_admin') throw new Error('内置超级管理员账号不可删除')

  return saveUserStore({
    ...store,
    users: store.users.filter((user) => user.id !== userId),
  })
}

export function recordUserLogin(store: UserStore, userId: string): UserStore {
  const now = new Date().toISOString()
  return saveUserStore({
    ...store,
    users: store.users.map((user) => (user.id === userId ? { ...user, lastLoginAt: now, updatedAt: now } : user)),
  })
}

export function toAuthUser(credential: UserRecord): AuthUser {
  return {
    id: credential.id,
    username: credential.username,
    name: credential.name,
    role: credential.role,
    position: credential.position,
    permissions: [...credential.permissions],
    personId: credential.personId,
  }
}

function initializeUserStore(): UserStore {
  const now = new Date().toISOString()
  const store: UserStore = {
    version: 3,
    users: [createDefaultAdmin(now)],
    updatedAt: now,
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(store))
  return store
}

function createDefaultAdmin(now: string): UserRecord {
  return {
    id: DEFAULT_ADMIN_ID,
    username: 'admin',
    name: '超级管理员',
    phone: '',
    role: 'super_admin',
    position: '管理',
    permissions: getDefaultRolePermissions('super_admin'),
    status: 'active',
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    personId: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: null,
  }
}

function normalizeUserStore(value: unknown): UserStore | null {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2 && value.version !== 3) || !Array.isArray(value.users)) return null

  const migratePermissions = value.version !== 3
  const parsedUsers = value.users.map((user) => normalizeUser(user, migratePermissions)).filter((user): user is UserRecord => user !== null)
  if (parsedUsers.length !== value.users.length) return null

  const now = new Date().toISOString()
  const canonicalIndex = parsedUsers.findIndex((user) => user.id === DEFAULT_ADMIN_ID)
  const legacyCanonicalIndex = canonicalIndex === -1 ? parsedUsers.findIndex((user) => user.username === 'admin') : -1
  const roleCanonicalIndex = canonicalIndex === -1 && legacyCanonicalIndex === -1
    ? parsedUsers.findIndex((user) => user.role === 'super_admin')
    : -1
  const canonicalId = canonicalIndex >= 0
    ? parsedUsers[canonicalIndex].id
    : legacyCanonicalIndex >= 0
      ? parsedUsers[legacyCanonicalIndex].id
      : roleCanonicalIndex >= 0
        ? parsedUsers[roleCanonicalIndex].id
        : DEFAULT_ADMIN_ID
  const usersWithCanonical = canonicalIndex >= 0 || legacyCanonicalIndex >= 0 || roleCanonicalIndex >= 0
    ? parsedUsers
    : [createDefaultAdmin(now), ...parsedUsers]
  const users = usersWithCanonical.map((user) => {
    const role: UserRole = user.id === canonicalId ? 'super_admin' : user.role === 'super_admin' ? 'admin' : user.role
    return {
      ...user,
      role,
      permissions: normalizeUserPermissions(role, user.permissions, migratePermissions),
    }
  })

  return {
    version: 3,
    users,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  }
}

function normalizeUser(value: unknown, migratePermissions: boolean): UserRecord | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.name !== 'string' ||
    !isUserRole(value.role) ||
    (value.status !== 'active' && value.status !== 'disabled') ||
    typeof value.passwordHash !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    username: normalizeUsername(value.username),
    name: value.name,
    phone: typeof value.phone === 'string' ? value.phone : '',
    role: value.role,
    position: isUserPosition(value.position) ? value.position : inferLegacyPosition(value.role),
    permissions: normalizeUserPermissions(value.role, value.permissions, migratePermissions),
    status: value.status,
    passwordHash: value.passwordHash,
    personId: typeof value.personId === 'string' && value.personId ? value.personId : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    lastLoginAt: typeof value.lastLoginAt === 'string' ? value.lastLoginAt : null,
    createdBy: typeof value.createdBy === 'string' ? value.createdBy : null,
  }
}

function validateProfile(store: UserStore, input: UserProfileInput, ignoredUserId?: string): void {
  const username = normalizeUsername(input.username)
  if (!input.name.trim()) throw new Error('请输入姓名')
  if (!username) throw new Error('请输入登录账号')
  if (store.users.some((user) => user.id !== ignoredUserId && user.username === username)) throw new Error('登录账号已存在')
}

function assertSystemManager(actor: UserActor, permission: Permission, message: string): void {
  if (actor.role !== 'super_admin' || !hasPermission(actor, permission)) throw new Error(message)
}

function assertCreatableRole(role: UserRole): void {
  if (role === 'super_admin') throw new Error('系统只保留一个内置超级管理员账号')
}

function assertRoleMayBeUpdated(target: UserRecord, nextRole: UserRole): void {
  if (target.role === 'super_admin' && nextRole !== 'super_admin') throw new Error('内置超级管理员角色不可修改')
  if (target.role !== 'super_admin' && nextRole === 'super_admin') throw new Error('系统不允许新增超级管理员')
}

function assertTargetMayBeManaged(actor: UserActor, target: UserRecord): void {
  if (!canManageTargetUser(actor, target)) throw new Error('普通管理员不能修改超级管理员')
}

function requireUser(store: UserStore, userId: string): UserRecord {
  const target = findUserById(store, userId)
  if (!target) throw new Error('账号不存在或已被移除')
  return target
}

function inferLegacyPosition(role: UserRole): UserPosition {
  return role === 'admin' || role === 'super_admin' ? '管理' : '运营'
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

function createUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
