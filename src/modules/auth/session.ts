import { isUserPosition, isUserRole, normalizeUserPermissions } from './permissions'
import type { AuthSession, AuthUser } from './types'
import { findUserById, loadUserStore, toAuthUser } from './userStore'

const SESSION_KEY = 'live-ops-management.auth.session.v1'

export function loadAuthSession(): AuthSession | null {
  return readSession(localStorage) ?? readSession(sessionStorage)
}

export function saveAuthSession(user: AuthUser, remember: boolean): AuthSession {
  const session: AuthSession = {
    version: 4,
    user,
    signedInAt: new Date().toISOString(),
  }
  const targetStorage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage

  otherStorage.removeItem(SESSION_KEY)
  targetStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function refreshAuthSession(current: AuthSession): AuthSession | null {
  const credential = findUserById(loadUserStore(), current.user.id)
  if (!credential || credential.status !== 'active') {
    clearAuthSession()
    return null
  }

  const nextSession: AuthSession = {
    ...current,
    version: 4,
    user: toAuthUser(credential),
  }
  const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage
  storage.setItem(SESSION_KEY, JSON.stringify(nextSession))
  return nextSession
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

function readSession(storage: Storage): AuthSession | null {
  const raw = storage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const value = JSON.parse(raw) as unknown
    const session = normalizeSession(value)
    if (!session) {
      storage.removeItem(SESSION_KEY)
      return null
    }

    const credential = findUserById(loadUserStore(), session.user.id)
    if (!credential || credential.status !== 'active') {
      storage.removeItem(SESSION_KEY)
      return null
    }

    const refreshed: AuthSession = { ...session, user: toAuthUser(credential) }
    storage.setItem(SESSION_KEY, JSON.stringify(refreshed))
    return refreshed
  } catch {
    storage.removeItem(SESSION_KEY)
    return null
  }
}

function normalizeSession(value: unknown): AuthSession | null {
  if (!isRecord(value) || ![1, 2, 3, 4].includes(Number(value.version)) || !isRecord(value.user)) return null
  if (
    typeof value.user.id !== 'string' ||
    typeof value.user.username !== 'string' ||
    typeof value.user.name !== 'string' ||
    !isUserRole(value.user.role) ||
    typeof value.signedInAt !== 'string'
  ) {
    return null
  }

  const permissions = normalizeUserPermissions(value.user.role, value.user.permissions, value.version !== 4)

  return {
    version: 4,
    user: {
      id: value.user.id,
      username: value.user.username,
      name: value.user.name,
      role: value.user.role,
      position: isUserPosition(value.user.position) ? value.user.position : value.user.role === 'admin' || value.user.role === 'super_admin' ? '管理' : '运营',
      permissions,
      personId: typeof value.user.personId === 'string' ? value.user.personId : null,
    },
    signedInAt: value.signedInAt,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
