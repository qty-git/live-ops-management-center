import { type FormEvent, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { UserRecord } from '../types'

interface ResetPasswordModalProps {
  user: UserRecord
  onSubmit: (password: string) => Promise<void>
  onClose: () => void
}

export function ResetPasswordModal({ user, onSubmit, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!password) {
      setError('请输入新密码')
      return
    }
    if (password !== confirmation) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(password)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '密码重置失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`重置密码 · ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>取消</button>
          <button className="primary-button" type="submit" form="reset-password-form" disabled={submitting}>
            {submitting ? '正在重置...' : '确认重置'}
          </button>
        </>
      }
    >
      <form className="form-grid" id="reset-password-form" onSubmit={submit}>
        <label className="field-wide">
          新密码
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" autoFocus />
        </label>
        <label className="field-wide">
          确认新密码
          <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />
        </label>
        <p className="field-tip field-wide">保存后不会保留密码明文，新密码可直接用于下次登录。</p>
        {error ? <div className="form-error field-wide" role="alert">{error}</div> : null}
      </form>
    </Modal>
  )
}
