import { CopyPlus, Download, Save } from 'lucide-react'
import type { TimelineSettings } from '../types'
import { DatePicker } from './DatePicker'

interface TopControlsProps {
  settings: TimelineSettings
  saveStatus: string
  hasRecordOnDate: (date: string) => boolean
  onSettingsChange: (settings: TimelineSettings) => void
  onCopyYesterdayPlan: () => void
  onExportExcel: () => void
}

export function TopControls({ settings, saveStatus, hasRecordOnDate, onSettingsChange, onCopyYesterdayPlan, onExportExcel }: TopControlsProps) {
  const update = <K extends keyof TimelineSettings>(key: K, value: TimelineSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <section className="top-controls">
      <div className="title-group">
        <p className="eyebrow">直播间运营管理中台 · MVP</p>
        <h1>时间轴排班复盘</h1>
      </div>
      <div className="controls-grid">
        <label>
          日期
          <DatePicker value={settings.date} hasRecord={hasRecordOnDate} onChange={(date) => update('date', date)} />
        </label>
        <label>
          工作开始
          <input type="time" value={settings.workStartTime} onChange={(e) => update('workStartTime', e.target.value)} />
        </label>
        <label>
          标准结束
          <input type="time" value={settings.standardEndTime} onChange={(e) => update('standardEndTime', e.target.value)} />
        </label>
        <label>
          实际结束
          <input type="time" value={settings.actualEndTime} onChange={(e) => update('actualEndTime', e.target.value)} />
        </label>
        <button className="secondary-button" type="button" onClick={onCopyYesterdayPlan}>
          <CopyPlus size={16} /> 一键填入昨日计划
        </button>
        <button className="secondary-button" type="button" onClick={onExportExcel}>
          <Download size={16} /> 导出 Excel
        </button>
        <span className="save-status">
          <Save size={15} /> {saveStatus}
        </span>
      </div>
    </section>
  )
}
