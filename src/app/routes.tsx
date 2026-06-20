import type { PagePermission } from '../modules/auth/permissions'
import type { TimelinePageMode } from '../modules/timeline/pages/TimelinePage'

export type AppRouteKey =
  | 'timeline'
  | 'editCenter'
  | 'issueLibrary'
  | 'videoTemplates'
  | 'scriptManager'
  | 'liveData'
  | 'productLinks'
  | 'reviewReport'
  | 'userManagement'

interface TimelineRouteContent {
  kind: 'timeline'
  mode: TimelinePageMode
}

interface PlaceholderRouteContent {
  kind: 'placeholder'
  description: string
}

interface UserManagementRouteContent {
  kind: 'users'
}

export interface AppRoute {
  key: AppRouteKey
  label: string
  hash: `#/${string}`
  permission: PagePermission | readonly PagePermission[]
  content: TimelineRouteContent | PlaceholderRouteContent | UserManagementRouteContent
}

export const routes: readonly AppRoute[] = [
  {
    key: 'timeline',
    label: '时间轴工作台',
    hash: '#/timeline',
    permission: 'viewTimeline',
    content: { kind: 'timeline', mode: 'dashboard' },
  },
  {
    key: 'editCenter',
    label: '编辑中心',
    hash: '#/edit-center',
    permission: 'viewEditCenter',
    content: { kind: 'timeline', mode: 'edit' },
  },
  {
    key: 'issueLibrary',
    label: '问题案例库',
    hash: '#/issue-library',
    permission: 'viewIssueLibrary',
    content: { kind: 'placeholder', description: '问题案例库功能将在后续阶段接入。' },
  },
  {
    key: 'videoTemplates',
    label: '视频拍摄模板',
    hash: '#/video-templates',
    permission: 'viewVideoTemplates',
    content: { kind: 'placeholder', description: '视频拍摄模板功能将在后续阶段接入。' },
  },
  {
    key: 'scriptManager',
    label: '视频脚本管理',
    hash: '#/script-manager',
    permission: 'viewScriptManager',
    content: { kind: 'placeholder', description: '视频脚本管理功能将在后续阶段接入。' },
  },
  {
    key: 'liveData',
    label: '直播数据',
    hash: '#/live-data',
    permission: 'viewLiveData',
    content: { kind: 'placeholder', description: '直播数据功能将在后续阶段接入。' },
  },
  {
    key: 'productLinks',
    label: '商品 / 链接管理',
    hash: '#/product-links',
    permission: 'viewProductLinks',
    content: { kind: 'placeholder', description: '商品与链接管理功能将在后续阶段接入。' },
  },
  {
    key: 'reviewReport',
    label: '复盘日报',
    hash: '#/review-report',
    permission: 'viewReviewReport',
    content: { kind: 'placeholder', description: '复盘日报功能将在后续阶段接入。' },
  },
  {
    key: 'userManagement',
    label: '账号与权限',
    hash: '#/users',
    permission: ['manageUsers', 'managePermissions'],
    content: { kind: 'users' },
  },
]

export function findRouteByHash(hash: string): AppRoute | null {
  return routes.find((route) => route.hash === hash) ?? null
}
