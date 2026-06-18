import { Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import type { WorkEvent } from '../types'
import { EVENT_PHASES } from '../types'
import { ensureEndAfterStart } from '../utils'
import { TimeInput } from './TimeInput'

interface EventEditorProps {
  event: WorkEvent
  onSave: (event: WorkEvent) => void
  onDelete: (eventId: string) => void
  onClose: () => void
}

export function EventEditor({ event, onSave, onDelete, onClose }: EventEditorProps) {
  const update = <K extends keyof WorkEvent>(key: K, value: WorkEvent[K]) => {
    const next = { ...event, [key]: value }
    if (key === 'startTime') {
      next.endTime = ensureEndAfterStart(String(value), next.endTime)
    }
    if (key === 'endTime') {
      next.endTime = ensureEndAfterStart(next.startTime, String(value))
    }
    onSave(next)
  }
  const confirmDelete = () => {
    if (window.confirm('确认删除这个工作事件？关联到它的任务和计划会变为未关联。')) {
      onDelete(event.id)
    }
  }

  return (
    <Modal
      title="编辑工作事件"
      onClose={onClose}
      footer={
        <>
          <button className="danger-button compact-danger-button" type="button" onClick={confirmDelete}>
            <Trash2 size={14} /> 删除
          </button>
          <button className="primary-button" type="button" onClick={onClose}>
            完成
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label>
          事件名称
          <input value={event.name} onChange={(e) => update('name', e.target.value)} />
        </label>
        <label>
          事件阶段
          <select value={event.phase} onChange={(e) => update('phase', e.target.value as WorkEvent['phase'])}>
            {EVENT_PHASES.map((phase) => (
              <option value={phase} key={phase}>
                {phase}
              </option>
            ))}
          </select>
        </label>
        <label>
          开始时间
          <TimeInput value={event.startTime} onChange={(value) => update('startTime', value)} ariaLabel="事件开始时间" />
        </label>
        <label>
          结束时间
          <TimeInput value={event.endTime} onChange={(value) => update('endTime', value)} ariaLabel="事件结束时间" />
        </label>
        <label className="field-wide">
          备注说明
          <textarea value={event.note} onChange={(e) => update('note', e.target.value)} />
        </label>
      </div>
    </Modal>
  )
}
