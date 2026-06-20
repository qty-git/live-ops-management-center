import { CircleAlert, Eye, EyeOff, LockKeyhole, RadioTower, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { authenticate } from '../authService'
import type { AuthUser } from '../types'

interface LoginPageProps {
  onLogin: (user: AuthUser, remember: boolean) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('请输入登录账号和密码。')
      return
    }

    setSubmitting(true)
    try {
      const result = await authenticate(username, password)
      if (!result.ok || !result.user) {
        setError(result.message ?? '登录失败，请稍后重试。')
        return
      }
      onLogin(result.user, remember)
    } catch {
      setError('当前浏览器无法完成安全校验，请刷新后重试。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="产品介绍">
        <div className="login-brand-content">
          <span className="login-brand-icon" aria-hidden="true">
            <RadioTower size={28} />
          </span>
          <p className="login-eyebrow">LiveOps Management</p>
          <h1>直播运营管理中台</h1>
          <p className="login-brand-description">把排班、任务、模板与复盘集中在一个清晰的运营工作台。</p>
        </div>
        <p className="login-brand-footnote">团队协作入口</p>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-header">
            <span className="login-mobile-mark" aria-hidden="true">
              <RadioTower size={20} />
            </span>
            <p className="login-eyebrow">欢迎回来</p>
            <h2>登录运营后台</h2>
            <p>使用管理员分配的账号进入系统。</p>
          </div>

          <div className="login-fields">
            <label>
              登录账号
              <span className="login-input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="请输入登录账号"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error-message' : undefined}
                />
              </span>
            </label>
            <label>
              密码
              <span className="login-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  placeholder="请输入密码"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error-message' : undefined}
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
          </div>

          <div className="login-options">
            <label className="login-checkbox">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>记住登录状态</span>
            </label>
            <button className="login-sms-placeholder" type="button" disabled title="手机号验证码登录暂未开通">
              手机号登录暂未开通
            </button>
          </div>

          <div
            className={`login-error ${error ? 'login-error-visible' : ''}`}
            id="login-error-message"
            role="alert"
            aria-live="polite"
            aria-hidden={!error}
          >
            {error ? <CircleAlert size={15} aria-hidden="true" /> : null}
            <span>{error}</span>
          </div>

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? '正在登录...' : '登录'}
          </button>

          <p className="login-security-note">使用默认管理员账号首次登录后，请及时修改密码。</p>
        </form>
      </section>
    </main>
  )
}
