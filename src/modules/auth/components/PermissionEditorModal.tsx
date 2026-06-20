import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { CONFIGURABLE_PERMISSIONS, PERMISSION_GROUPS } from '../permissions'
import type { Permission, UserRecord } from '../types'

interface PermissionEditorModalProps {
  user: UserRecord
  onSubmit: (permissions: Permission[]) => void
  onClose: () => void
}

export function PermissionEditorModal({ user, onSubmit, onClose }: PermissionEditorModalProps) {
  const [selected, setSelected] = useState(
    () => new Set<Permission>(user.permissions.filter((permission) => CONFIGURABLE_PERMISSIONS.includes(permission))),
  )

  const toggle = (permission: Permission, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(permission)
      else next.delete(permission)
      return next
    })
  }

  const save = () => {
    onSubmit(CONFIGURABLE_PERMISSIONS.filter((permission) => selected.has(permission)))
    onClose()
  }

  const selectedCount = selected.size

  return (
    <Modal
      title={`编辑权限 · ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>取消</button>
          <button className="primary-button" type="button" onClick={save}>保存权限</button>
        </>
      }
    >
      <div className="permission-editor-intro">
        <div>
          <strong>为该账号配置独立权限</strong>
          <span>仅配置可调整的业务权限，保存后以当前勾选结果为准。</span>
        </div>
        <span className="permission-selected-count">已选择 {selectedCount} 项</span>
      </div>
      <div className="permission-groups">
        {PERMISSION_GROUPS.map((group) => {
          const groupSelectedCount = group.items.filter((item) => selected.has(item.permission)).length
          return (
            <fieldset className="permission-group" key={group.label}>
              <legend>{group.label}</legend>
              <p className="permission-group-summary">已选择 {groupSelectedCount}/{group.items.length}</p>
              <div className="permission-options">
                {group.items.map((item) => (
                  <label className="permission-option" key={item.permission}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.permission)}
                      onChange={(event) => toggle(item.permission, event.target.checked)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>
    </Modal>
  )
}
