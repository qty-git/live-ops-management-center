import { KeyRound, LockKeyhole, Pencil, Plus, ShieldCheck, UserCheck, UserX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { loadTimelineStore } from '../../timeline/storage'
import { canManageTargetUser, requirePermission } from '../accessControl'
import { hashPassword } from '../authService'
import { hasPermission, ROLE_LABELS } from '../permissions'
import type { AuthUser, Permission, UserRecord, UserStatus, UserStore } from '../types'
import {
  createUser,
  loadUserStore,
  resetUserPassword,
  setUserStatus,
  updateUserPermissions,
  updateUserProfile,
  type UserProfileInput,
} from '../userStore'
import { PermissionEditorModal } from '../components/PermissionEditorModal'
import { ResetPasswordModal } from '../components/ResetPasswordModal'
import { UserFormModal } from '../components/UserFormModal'

interface UserManagementPageProps {
  currentUser: AuthUser
  onUsersChanged: () => void
}

export function UserManagementPage({ currentUser, onUsersChanged }: UserManagementPageProps) {
  const [store, setStore] = useState<UserStore>(() => loadUserStore())
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [permissionsUser, setPermissionsUser] = useState<UserRecord | null>(null)
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const people = useMemo(() => loadTimelineStore().people, [])
  const personNames = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people])
  const canManageUsers = hasPermission(currentUser, 'users:manage')
  const canManagePermissions = hasPermission(currentUser, 'permissions:manage')
  const activeUserCount = store.users.filter((user) => user.status === 'active').length
  const disabledUserCount = store.users.length - activeUserCount

  const deny = (message: string) => {
    setNotice('')
    setError(message)
  }

  const commit = (nextStore: UserStore, message: string) => {
    setStore(nextStore)
    setError('')
    setNotice(message)
    onUsersChanged()
  }

  const saveUser = async (profile: UserProfileInput, password: string) => {
    const permissionMessage = editingUser ? '你没有权限编辑账号' : '你没有权限新增账号'
    if (!requirePermission(currentUser, 'users:manage', deny, permissionMessage)) throw new Error(permissionMessage)
    if (editingUser && !canManageTargetUser(currentUser, editingUser)) {
      deny('普通管理员不能修改超级管理员')
      throw new Error('普通管理员不能修改超级管理员')
    }

    if (editingUser) {
      commit(updateUserProfile(store, editingUser.id, profile, currentUser), '账号资料已更新')
      return
    }

    const passwordHash = await hashPassword(password)
    commit(createUser(store, { ...profile, passwordHash }, currentUser), '账号已创建')
  }

  const savePermissions = (user: UserRecord, permissions: Permission[]) => {
    if (!requirePermission(currentUser, 'permissions:manage', deny, '你没有权限分配权限')) return
    if (!canManageTargetUser(currentUser, user)) {
      deny('普通管理员不能修改超级管理员')
      return
    }

    try {
      commit(updateUserPermissions(store, user.id, permissions, currentUser), '账号权限已更新')
    } catch (saveError) {
      setNotice('')
      setError(saveError instanceof Error ? saveError.message : '权限保存失败')
    }
  }

  const savePassword = async (user: UserRecord, password: string) => {
    if (!requirePermission(currentUser, 'users:manage', deny, '你没有权限重置密码')) throw new Error('你没有权限重置密码')
    if (!canManageTargetUser(currentUser, user)) {
      deny('普通管理员不能修改超级管理员')
      throw new Error('普通管理员不能修改超级管理员')
    }
    const passwordHash = await hashPassword(password)
    commit(resetUserPassword(store, user.id, passwordHash, currentUser), '密码已重置')
  }

  const changeStatus = (user: UserRecord) => {
    if (!requirePermission(currentUser, 'users:manage', deny, '你没有权限修改账号状态')) return
    if (!canManageTargetUser(currentUser, user)) {
      deny('普通管理员不能修改超级管理员')
      return
    }
    const nextStatus: UserStatus = user.status === 'active' ? 'disabled' : 'active'
    const action = nextStatus === 'disabled' ? '禁用' : '启用'
    if (!window.confirm(`确认${action}账号“${user.username}”？`)) return

    try {
      commit(setUserStatus(store, user.id, nextStatus, currentUser), `账号已${action}`)
    } catch (statusError) {
      setNotice('')
      setError(statusError instanceof Error ? statusError.message : `${action}失败`)
    }
  }

  const mayManageTarget = (user: UserRecord) => canManageTargetUser(currentUser, user)

  return (
    <main className="user-management-page">
      <section className="user-management-hero">
        <div>
          <p className="eyebrow">Team access</p>
          <h1>账号与权限</h1>
          <p>管理团队登录账号、岗位绑定和独立权限。账号数据仅保存在当前浏览器。</p>
        </div>
        {canManageUsers ? (
          <button className="primary-button" type="button" onClick={() => { setEditingUser(null); setCreating(true) }}>
            <Plus size={16} /> 新增账号
          </button>
        ) : null}
      </section>

      {notice ? (
        <div className="page-notice page-notice-success" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="关闭成功提示"><X size={15} /></button>
        </div>
      ) : null}
      {error ? (
        <div className="page-notice page-notice-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="关闭错误提示"><X size={15} /></button>
        </div>
      ) : null}

      <section className="data-section user-list-section">
        <div className="section-header">
          <div>
            <h2>团队账号</h2>
            <p>统一管理登录状态、岗位绑定与操作权限。</p>
          </div>
          <div className="user-summary" aria-label="账号统计">
            <span><strong>{store.users.length}</strong> 全部账号</span>
            <span className="user-summary-active"><strong>{activeUserCount}</strong> 已启用</span>
            <span><strong>{disabledUserCount}</strong> 已禁用</span>
          </div>
        </div>
        <p className="user-table-scroll-hint">
          <span aria-hidden="true">↔</span> 左右滑动查看更多账号字段，操作列始终可见
        </p>
        <div className="table-wrap user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>登录账号</th>
                <th>手机号</th>
                <th>角色</th>
                <th>岗位</th>
                <th>绑定人员</th>
                <th>状态</th>
                <th>最近登录时间</th>
                <th className="user-actions-heading">操作</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map((user) => {
                const targetAllowed = mayManageTarget(user)
                return (
                  <tr className={user.status === 'disabled' ? 'user-row-disabled' : undefined} key={user.id}>
                    <td>
                      <div className="user-identity">
                        <span className="user-identity-avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td><code>{user.username}</code></td>
                    <td>{user.phone || '-'}</td>
                    <td><span className={`account-role account-role-${user.role}`}>{ROLE_LABELS[user.role]}</span></td>
                    <td><span className="account-position">{user.position}</span></td>
                    <td>{user.personId ? personNames.get(user.personId) ?? '绑定人员已移除' : '-'}</td>
                    <td><span className={`account-status account-status-${user.status}`}>{user.status === 'active' ? '已启用' : '已禁用'}</span></td>
                    <td>{formatDateTime(user.lastLoginAt)}</td>
                    <td className="user-actions-cell">
                      <div className="user-actions">
                        {canManageUsers && targetAllowed ? (
                          <button className="table-action table-action-neutral" type="button" onClick={() => setEditingUser(user)} title="编辑资料">
                            <Pencil size={14} /> 编辑资料
                          </button>
                        ) : null}
                        {canManagePermissions && targetAllowed ? (
                          <button className="table-action table-action-primary" type="button" onClick={() => setPermissionsUser(user)} title="编辑权限">
                            <ShieldCheck size={14} /> 编辑权限
                          </button>
                        ) : null}
                        {canManageUsers && targetAllowed ? (
                          <>
                            <button className="table-action table-action-neutral" type="button" onClick={() => setPasswordUser(user)} title="重置密码">
                              <KeyRound size={14} /> 重置密码
                            </button>
                            <button
                              className={`table-action ${user.status === 'active' ? 'table-action-danger' : 'table-action-success'}`}
                              type="button"
                              onClick={() => changeStatus(user)}
                              title={user.status === 'active' ? '禁用账号' : '启用账号'}
                            >
                              {user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                              {user.status === 'active' ? '禁用账号' : '启用账号'}
                            </button>
                          </>
                        ) : null}
                        {!targetAllowed ? (
                          <span className="protected-account" title="普通管理员不能修改超级管理员账号">
                            <LockKeyhole size={13} /> 超级管理员受保护
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {creating ? (
        <UserFormModal people={people} canUseSuperAdminRole={currentUser.role === 'super_admin'} onSubmit={saveUser} onClose={() => setCreating(false)} />
      ) : null}
      {editingUser ? (
        <UserFormModal user={editingUser} people={people} canUseSuperAdminRole={currentUser.role === 'super_admin'} onSubmit={saveUser} onClose={() => setEditingUser(null)} />
      ) : null}
      {permissionsUser ? (
        <PermissionEditorModal user={permissionsUser} onSubmit={(permissions) => savePermissions(permissionsUser, permissions)} onClose={() => setPermissionsUser(null)} />
      ) : null}
      {passwordUser ? (
        <ResetPasswordModal user={passwordUser} onSubmit={(password) => savePassword(passwordUser, password)} onClose={() => setPasswordUser(null)} />
      ) : null}
    </main>
  )
}

function formatDateTime(value: string | null): string {
  if (!value) return '从未登录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', { hour12: false })
}
