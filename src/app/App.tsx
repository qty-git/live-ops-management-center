import { useState } from 'react'
import { TimelinePage, type TimelinePageMode } from '../modules/timeline/pages/TimelinePage'
import '../index.css'

const futureModules = ['问题案例库', '视频拍摄模板', '视频脚本管理', '直播数据', '商品 / 链接管理', '复盘日报']

export default function App() {
  const [activeView, setActiveView] = useState<TimelinePageMode>('dashboard')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">LiveOps</span>
          <strong>直播运营中台</strong>
        </div>
        <nav>
          <button
            className={`nav-item ${activeView === 'dashboard' ? 'nav-item-active' : ''}`}
            type="button"
            onClick={() => setActiveView('dashboard')}
          >
            时间轴工作台
          </button>
          <button className={`nav-item ${activeView === 'edit' ? 'nav-item-active' : ''}`} type="button" onClick={() => setActiveView('edit')}>
            编辑中心
          </button>
          {futureModules.map((module) => (
            <button className="nav-item" type="button" disabled key={module}>
              {module}
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <TimelinePage mode={activeView} />
      </div>
    </div>
  )
}
