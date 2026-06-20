import type { LoginResult } from './types'
import { findUserByUsername, loadUserStore, recordUserLogin, toAuthUser } from './userStore'

export async function authenticate(username: string, password: string): Promise<LoginResult> {
  const normalizedUsername = username.trim().toLowerCase()
  const passwordHash = await hashPassword(password)
  const userStore = loadUserStore()
  const credential = findUserByUsername(userStore, normalizedUsername)

  if (!credential || credential.passwordHash !== passwordHash) {
    return {
      ok: false,
      message: '账号或密码不正确，请重新输入。',
    }
  }

  if (credential.status !== 'active') {
    return {
      ok: false,
      message: '当前账号已被禁用，请联系管理员。',
    }
  }

  recordUserLogin(userStore, credential.id)

  return {
    ok: true,
    user: toAuthUser(credential),
  }
}

export async function hashPassword(password: string): Promise<string> {
  const input = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
