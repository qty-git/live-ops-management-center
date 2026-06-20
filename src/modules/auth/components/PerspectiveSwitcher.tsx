import { Check, UserRoundCog, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROLE_LABELS } from '../permissions'
import type { AuthUser, UserRecord } from '../types'

interface PerspectiveSwitcherProps {
  users: UserRecord[]
  viewUser: AuthUser | null
  onSelect: (userId: string) => void
  onExit: () => void
}

export function PerspectiveSwitcher({ users, viewUser, onSelect, onExit }: PerspectiveSwitcherProps) {
  const [open, setOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const selectUser = (userId: string) => {
    onSelect(userId)
    setOpen(false)
  }

  return (
    <div className="perspective-switcher" ref={switcherRef}>
      <button
        className="perspective-switcher-trigger"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <UserRoundCog size={15} />
        {viewUser ? `当前：${viewUser.name}` : '切换成员视角'}
      </button>
      {open ? (
        <div className="perspective-switcher-panel" role="dialog" aria-label="切换成员视角">
          <div className="perspective-switcher-heading">
            <div>
              <strong>切换成员视角</strong>
              <span>菜单和业务权限将按所选成员展示</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="关闭视角选择">
              <X size={15} />
            </button>
          </div>
          <div className="perspective-user-list">
            {users.length > 0 ? (
              users.map((user) => (
                <button
                  className={viewUser?.id === user.id ? 'perspective-user-option perspective-user-option-active' : 'perspective-user-option'}
                  type="button"
                  onClick={() => selectUser(user.id)}
                  key={user.id}
                >
                  <span className="perspective-user-avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
                  <span>
                    <strong>{user.name}</strong>
                    <small>{ROLE_LABELS[user.role]} · {user.position}</small>
                  </span>
                  {viewUser?.id === user.id ? <Check size={15} aria-label="当前视角" /> : null}
                </button>
              ))
            ) : (
              <p className="perspective-empty">暂无可切换的已启用成员</p>
            )}
          </div>
          {viewUser ? (
            <button className="perspective-exit-option" type="button" onClick={() => { onExit(); setOpen(false) }}>
              退出当前视角
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
