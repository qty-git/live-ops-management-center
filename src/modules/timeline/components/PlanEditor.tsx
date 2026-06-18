import { Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import type { TeamRole, TomorrowPlan, WorkEvent } from '../types'
import { PLAN_PRIORITIES, TEAM_ROLES } from '../types'
import { ensureEndAfterStart, eventLabel } from '../utils'
import { TimeInput } from './TimeInput'

interface PlanEditorProps {
  plan: TomorrowPlan
  events: WorkEvent[]
  peopleOptionsByRole: Record<TeamRole, string[]>
  onSave: (plan: TomorrowPlan) => void
  onDelete: (planId: string) => void
  onClose: () => void
}

export function PlanEditor({ plan, events, peopleOptionsByRole, onSave, onDelete, onClose }: PlanEditorProps) {
  const update = <K extends keyof TomorrowPlan>(key: K, value: TomorrowPlan[K]) => {
    const next = { ...plan, [key]: value }
    if (key === 'startTime') {
      next.endTime = ensureEndAfterStart(String(value), next.endTime)
    }
    if (key === 'endTime') {
      next.endTime = ensureEndAfterStart(next.startTime, String(value))
    }
    onSave(next)
  }

  const updateRole = (role: TeamRole) => {
    const people = peopleOptionsByRole[role]
    onSave({
      ...plan,
      role,
      owner: people.includes(plan.owner) ? plan.owner : people[0] || '',
    })
  }

  const updateWorkEvent = (workEventId: string) => {
    const event = events.find((item) => item.id === workEventId)
    onSave({
      ...plan,
      workEventId,
      startTime: event?.startTime ?? plan.startTime,
      endTime: event?.endTime ?? plan.endTime,
    })
  }

  const personListId = `plan-editor-people-${plan.role}`
  const confirmDelete = () => {
    if (window.confirm('确认删除这个计划？删除后次日计划时间轴会同步移除。')) {
      onDelete(plan.id)
    }
  }

  return (
    <Modal
      title="编辑次日计划"
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
        <label className="field-wide">
          计划内容
          <input value={plan.content} onChange={(e) => update('content', e.target.value)} />
        </label>
        <label>
          岗位
          <select value={plan.role} onChange={(e) => updateRole(e.target.value as TeamRole)}>
            {TEAM_ROLES.map((role) => (
              <option value={role} key={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          负责人
          <input list={personListId} value={plan.owner} onChange={(e) => update('owner', e.target.value)} />
          <datalist id={personListId}>
            {(peopleOptionsByRole[plan.role] ?? []).map((person) => (
              <option value={person} key={person} />
            ))}
          </datalist>
        </label>
        <label>
          关联工作事件
          <select value={plan.workEventId} onChange={(e) => updateWorkEvent(e.target.value)}>
            <option value="">未关联</option>
            {events.map((event) => (
              <option value={event.id} key={event.id}>
                {eventLabel(event)}
              </option>
            ))}
          </select>
        </label>
        <label>
          优先级
          <select value={plan.priority} onChange={(e) => update('priority', e.target.value as TomorrowPlan['priority'])}>
            {PLAN_PRIORITIES.map((priority) => (
              <option value={priority} key={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label>
          开始时间
          <TimeInput value={plan.startTime} onChange={(value) => update('startTime', value)} ariaLabel="计划开始时间" />
          <span className="field-tip">输入 0845 可自动转为 08:45</span>
        </label>
        <label>
          结束时间
          <TimeInput value={plan.endTime} onChange={(value) => update('endTime', value)} ariaLabel="计划结束时间" />
          <span className="field-tip">选择关联事件会先自动匹配，可再手动改</span>
        </label>
        <label className="field-wide">
          预计结果
          <textarea value={plan.expectedResult} onChange={(e) => update('expectedResult', e.target.value)} />
        </label>
        <label className="field-wide">
          备注
          <textarea value={plan.note} onChange={(e) => update('note', e.target.value)} />
        </label>
      </div>
    </Modal>
  )
}
