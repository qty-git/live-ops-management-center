import { ShieldX } from 'lucide-react'

interface AccessDeniedProps {
  onBack?: () => void
}

export function AccessDenied({ onBack }: AccessDeniedProps) {
  return (
    <main className="route-status-page">
      <section className="route-status-card" role="alert">
        <span className="route-status-icon route-status-icon-denied" aria-hidden="true">
          <ShieldX size={30} />
        </span>
        <p className="route-status-eyebrow">Access denied</p>
        <h1>无权限访问</h1>
        <p>当前账号没有访问此页面的权限。如需使用，请联系管理员调整账号权限。</p>
        {onBack ? (
          <button className="primary-button" type="button" onClick={onBack}>
            返回首页
          </button>
        ) : null}
      </section>
    </main>
  )
}
