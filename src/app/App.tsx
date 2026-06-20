import { LogOut, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { canSwitchPerspective, canUseAsViewUser, getEffectiveUser } from '../modules/auth/accessControl'
import { LoginPage } from '../modules/auth/components/LoginPage'
import { PerspectiveSwitcher } from '../modules/auth/components/PerspectiveSwitcher'
import { hasPagePermission, ROLE_LABELS, type PagePermission } from '../modules/auth/permissions'
import { clearAuthSession, loadAuthSession, refreshAuthSession, saveAuthSession } from '../modules/auth/session'
import type { AuthUser } from '../modules/auth/types'
import { UserManagementPage } from '../modules/auth/pages/UserManagementPage'
import { loadUserStore, toAuthUser } from '../modules/auth/userStore'
import { TimelinePage } from '../modules/timeline/pages/TimelinePage'
import { AccessDenied } from '../shared/components/AccessDenied'
import { ModulePlaceholder } from '../shared/components/ModulePlaceholder'
import '../index.css'
import { findRouteByHash, routes, type AppRoute } from './routes'

export default function App() {
  const currentHash = useSyncExternalStore(subscribeToLocation, getLocationHash, getLocationHash)
  const [userStore, setUserStore] = useState(() => loadUserStore())
  const [session, setSession] = useState(() => loadAuthSession())
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const viewUser = useMemo(() => {
    if (!session || !viewUserId || !canSwitchPerspective(session.user)) return null
    const target = userStore.users.find((user) => user.id === viewUserId)
    return target && canUseAsViewUser(session.user, target) ? toAuthUser(target) : null
  }, [session, userStore.users, viewUserId])
  const effectiveUser = session ? getEffectiveUser({ realUser: session.user, viewUser }) : null
  const perspectiveUsers = useMemo(
    () => (session ? userStore.users.filter((user) => canUseAsViewUser(session.user, user)) : []),
    [session, userStore.users],
  )

  const allowedRoutes = useMemo(
    () => (session && effectiveUser ? routes.filter((route) => hasRouteAccess(route, session.user, effectiveUser)) : []),
    [effectiveUser, session],
  )
  const requestedRoute = findRouteByHash(currentHash)
  const activeRoute = requestedRoute ?? allowedRoutes[0] ?? null

  useEffect(() => {
    if (!session || requestedRoute || allowedRoutes.length === 0) return

    const fallbackRoute = allowedRoutes[0]
    updateLocationHash(fallbackRoute.hash, true)
  }, [allowedRoutes, requestedRoute, session])

  const login = (user: AuthUser, remember: boolean) => {
    setUserStore(loadUserStore())
    setViewUserId(null)
    setSession(saveAuthSession(user, remember))
  }

  const logout = () => {
    clearAuthSession()
    setViewUserId(null)
    updateLocationHash('', true)
    setSession(null)
  }

  const navigate = (route: AppRoute) => {
    if (window.location.hash === route.hash) return
    updateLocationHash(route.hash)
  }

  const refreshCurrentUser = () => {
    const nextUserStore = loadUserStore()
    const nextSession = session ? refreshAuthSession(session) : null
    setUserStore(nextUserStore)
    setSession(nextSession)
    setViewUserId((currentId) => {
      if (!currentId || !nextSession || !canSwitchPerspective(nextSession.user)) return null
      const target = nextUserStore.users.find((user) => user.id === currentId)
      return target && canUseAsViewUser(nextSession.user, target) ? currentId : null
    })
  }

  const switchPerspective = (userId: string) => {
    if (!session || !canSwitchPerspective(session.user)) return
    const target = userStore.users.find((user) => user.id === userId)
    if (!target || !canUseAsViewUser(session.user, target)) return
    const targetUser = toAuthUser(target)
    const currentRoute = findRouteByHash(currentHash)
    if (currentRoute && !hasRouteAccess(currentRoute, session.user, targetUser)) {
      const fallbackRoute = routes.find((route) => hasRouteAccess(route, session.user, targetUser))
      if (fallbackRoute) updateLocationHash(fallbackRoute.hash, true)
    }
    setViewUserId(target.id)
  }

  if (!session) {
    return <LoginPage onLogin={login} />
  }

  const maySwitchPerspective = canSwitchPerspective(session.user)
  const activeUser = effectiveUser ?? session.user

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">LiveOps</span>
          <strong>直播运营中台</strong>
        </div>
        <nav>
          {allowedRoutes.map((route) => (
            <button
              className={`nav-item ${activeRoute?.key === route.key ? 'nav-item-active' : ''}`}
              type="button"
              onClick={() => navigate(route)}
              aria-current={activeRoute?.key === route.key ? 'page' : undefined}
              key={route.key}
            >
              {route.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {maySwitchPerspective ? (
            <PerspectiveSwitcher users={perspectiveUsers} viewUser={viewUser} onSelect={switchPerspective} onExit={() => setViewUserId(null)} />
          ) : null}
          <div className="sidebar-account">
            <div className="sidebar-account-avatar" aria-hidden="true">
              {session.user.name.slice(0, 1)}
            </div>
            <div className="sidebar-account-info">
              <strong>{session.user.name}</strong>
              <span className="sidebar-account-meta">@{session.user.username} · {ROLE_LABELS[session.user.role]}</span>
            </div>
            <button className="sidebar-logout" type="button" onClick={logout} aria-label="退出登录" title="退出登录">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        {viewUser ? (
          <div className="perspective-view-banner" role="status">
            <span>当前正在以<strong>【{viewUser.name}】</strong>视角查看</span>
            <button type="button" onClick={() => setViewUserId(null)}>
              <RotateCcw size={14} /> 退出视角
            </button>
          </div>
        ) : null}
        <RouteContent
          route={activeRoute}
          allowedRoutes={allowedRoutes}
          realUser={session.user}
          effectiveUser={activeUser}
          onNavigate={navigate}
          onUsersChanged={refreshCurrentUser}
        />
      </div>
    </div>
  )
}

interface RouteContentProps {
  route: AppRoute | null
  allowedRoutes: readonly AppRoute[]
  realUser: AuthUser
  effectiveUser: AuthUser
  onNavigate: (route: AppRoute) => void
  onUsersChanged: () => void
}

function RouteContent({ route, allowedRoutes, realUser, effectiveUser, onNavigate, onUsersChanged }: RouteContentProps) {
  const fallbackRoute = allowedRoutes[0]

  if (!route || !hasRouteAccess(route, realUser, effectiveUser)) {
    return <AccessDenied onBack={fallbackRoute ? () => onNavigate(fallbackRoute) : undefined} />
  }

  if (route.content.kind === 'timeline') {
    return <TimelinePage mode={route.content.mode} currentUser={effectiveUser} />
  }

  if (route.content.kind === 'users') {
    return <UserManagementPage currentUser={realUser} onUsersChanged={onUsersChanged} />
  }

  return <ModulePlaceholder title={route.label} description={route.content.description} />
}

function hasRouteAccess(route: AppRoute, realUser: AuthUser, effectiveUser: AuthUser): boolean {
  return hasRoutePermission(route.content.kind === 'users' ? realUser : effectiveUser, route.permission)
}

function hasRoutePermission(user: AuthUser, permission: PagePermission | readonly PagePermission[]): boolean {
  return Array.isArray(permission)
    ? permission.some((item) => hasPagePermission(user, item))
    : hasPagePermission(user, permission as PagePermission)
}

function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

function getLocationHash(): string {
  return window.location.hash
}

function updateLocationHash(hash: string, replace = false): void {
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`
  if (replace) {
    window.history.replaceState(null, '', nextUrl)
  } else {
    window.history.pushState(null, '', nextUrl)
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
