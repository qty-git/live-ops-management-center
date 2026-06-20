import { type FormEvent, useMemo, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { TeamPerson } from '../../timeline/types'
import { ROLE_LABELS } from '../permissions'
import { USER_POSITIONS, USER_ROLES, type UserPosition, type UserRecord, type UserRole, type UserStatus } from '../types'
import type { UserProfileInput } from '../userStore'

interface UserFormModalProps {
  user?: UserRecord
  people: TeamPerson[]
  canUseSuperAdminRole: boolean
  onSubmit: (profile: UserProfileInput, password: string) => Promise<void>
  onClose: () => void
}

export function UserFormModal({ user, people, canUseSuperAdminRole, onSubmit, onClose }: UserFormModalProps) {
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [position, setPosition] = useState<UserPosition>(user?.position ?? '运营')
  const [personId, setPersonId] = useState(user?.personId ?? '')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'member')
  const [status, setStatus] = useState<UserStatus>(user?.status ?? 'active')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const roleOptions = USER_ROLES.filter((option) => option !== 'super_admin' || canUseSuperAdminRole)
  const peopleOptions = useMemo(
    () => people.filter((person) => position === '管理' || person.role === position),
    [people, position],
  )

  const changePosition = (nextPosition: UserPosition) => {
    setPosition(nextPosition)
    const linkedPerson = people.find((person) => person.id === personId)
    if (linkedPerson && nextPosition !== '管理' && linkedPerson.role !== nextPosition) setPersonId('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!user && !password) {
      setError('请输入初始密码')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(
        {
          name,
          username,
          phone,
          position,
          personId: personId || null,
          role,
          status,
        },
        password,
      )
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={user ? '编辑账号资料' : '新增账号'}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>取消</button>
          <button className="primary-button" type="submit" form="user-account-form" disabled={submitting}>
            {submitting ? '正在保存...' : '保存账号'}
          </button>
        </>
      }
    >
      <form className="form-grid" id="user-account-form" onSubmit={submit}>
        <label>
          姓名
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <label>
          登录账号
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" />
        </label>
        {!user ? (
          <label>
            初始密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
          </label>
        ) : null}
        <label>
          手机号（可选）
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
        </label>
        <label>
          岗位
          <select value={position} onChange={(event) => changePosition(event.target.value as UserPosition)}>
            {USER_POSITIONS.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          绑定排班人员名称
          <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
            <option value="">暂不绑定</option>
            {peopleOptions.map((person) => <option value={person.id} key={person.id}>{person.name}（{person.role}）</option>)}
          </select>
        </label>
        <label>
          角色
          <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {roleOptions.map((option) => <option value={option} key={option}>{ROLE_LABELS[option]}</option>)}
          </select>
        </label>
        <label>
          状态
          <select value={status} onChange={(event) => setStatus(event.target.value as UserStatus)}>
            <option value="active">启用</option>
            <option value="disabled">禁用</option>
          </select>
        </label>
        {error ? <div className="form-error field-wide" role="alert">{error}</div> : null}
      </form>
    </Modal>
  )
}
