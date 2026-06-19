import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import type { TeamRole, TimelineTask, TomorrowPlan, WorkEvent } from '../types'
import { EVENT_PHASES, PLAN_PRIORITIES, TASK_STATUSES, TEAM_ROLES } from '../types'
import { ensureEndAfterStart } from '../utils'
import { TimeInput } from './TimeInput'

type EventEditorScope = 'actual' | 'plan'

interface EventEditorProps {
  event: WorkEvent
  scope: EventEditorScope
  linkedTasks: TimelineTask[]
  linkedPlans: TomorrowPlan[]
  peopleOptionsByRole: Record<TeamRole, string[]>
  onSave: (event: WorkEvent) => void
  onDelete: (eventId: string) => void
  onAddTask: () => void
  onSaveTask: (task: TimelineTask) => void
  onDeleteTask: (taskId: string) => void
  onAddPlan: () => void
  onSavePlan: (plan: TomorrowPlan) => void
  onDeletePlan: (planId: string) => void
  onClose: () => void
}

export function EventEditor({
  event,
  scope,
  linkedTasks,
  linkedPlans,
  peopleOptionsByRole,
  onSave,
  onDelete,
  onAddTask,
  onSaveTask,
  onDeleteTask,
  onAddPlan,
  onSavePlan,
  onDeletePlan,
  onClose,
}: EventEditorProps) {
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

  const updateTask = <K extends keyof TimelineTask>(task: TimelineTask, key: K, value: TimelineTask[K]) => {
    const next = { ...task, [key]: value }
    if (key === 'startTime') {
      next.endTime = ensureEndAfterStart(String(value), next.endTime)
    }
    if (key === 'endTime') {
      next.endTime = ensureEndAfterStart(next.startTime, String(value))
    }
    onSaveTask(next)
  }

  const updateTaskRole = (task: TimelineTask, role: TeamRole) => {
    const people = peopleOptionsByRole[role] ?? []
    onSaveTask({
      ...task,
      role,
      personName: people.includes(task.personName) ? task.personName : people[0] || '',
    })
  }

  const updatePlan = <K extends keyof TomorrowPlan>(plan: TomorrowPlan, key: K, value: TomorrowPlan[K]) => {
    const next = { ...plan, [key]: value }
    if (key === 'startTime') {
      next.endTime = ensureEndAfterStart(String(value), next.endTime)
    }
    if (key === 'endTime') {
      next.endTime = ensureEndAfterStart(next.startTime, String(value))
    }
    onSavePlan(next)
  }

  const updatePlanRole = (plan: TomorrowPlan, role: TeamRole) => {
    const people = peopleOptionsByRole[role] ?? []
    onSavePlan({
      ...plan,
      role,
      owner: people.includes(plan.owner) ? plan.owner : people[0] || '',
    })
  }

  const confirmDelete = () => {
    if (window.confirm('确认删除这个工作事件？删除后会同步删除绑定的任务或计划。')) {
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
        <div className="event-linked-work field-wide">
          <div className="event-linked-work-header">
            <div>
              <strong>{scope === 'plan' ? '绑定的次日计划任务' : '绑定的人员任务'}</strong>
              <span>{scope === 'plan' ? `${linkedPlans.length} 条计划绑定到这个大事件` : `${linkedTasks.length} 条任务绑定到这个大事件`}</span>
            </div>
            <button className="secondary-button compact-secondary-button" type="button" onClick={scope === 'plan' ? onAddPlan : onAddTask}>
              <Plus size={14} /> 新增任务
            </button>
          </div>

          {scope === 'plan' && linkedPlans.length === 0 ? <div className="empty-state compact-empty-state">这个大事件还没有绑定计划任务。</div> : null}
          {scope === 'actual' && linkedTasks.length === 0 ? <div className="empty-state compact-empty-state">这个大事件还没有绑定人员任务。</div> : null}

          {scope === 'actual'
            ? linkedTasks.map((task) => {
                const personListId = `event-task-people-${task.id}`
                return (
                  <div className="event-linked-card" key={task.id}>
                    <div className="event-linked-card-head">
                      <strong>{task.role}</strong>
                      <button className="icon-button danger-icon" type="button" aria-label={`删除${task.content}`} onClick={() => onDeleteTask(task.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="event-linked-grid">
                      <label className="field-wide">
                        工作内容
                        <input value={task.content} onChange={(e) => updateTask(task, 'content', e.target.value)} />
                      </label>
                      <label>
                        岗位
                        <select value={task.role} onChange={(e) => updateTaskRole(task, e.target.value as TeamRole)}>
                          {TEAM_ROLES.map((role) => (
                            <option value={role} key={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        负责人
                        <input list={personListId} value={task.personName} onChange={(e) => updateTask(task, 'personName', e.target.value)} />
                        <datalist id={personListId}>
                          {(peopleOptionsByRole[task.role] ?? []).map((person) => (
                            <option value={person} key={person} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        开始
                        <TimeInput value={task.startTime} onChange={(value) => updateTask(task, 'startTime', value)} ariaLabel="绑定任务开始时间" />
                      </label>
                      <label>
                        结束
                        <TimeInput value={task.endTime} onChange={(value) => updateTask(task, 'endTime', value)} ariaLabel="绑定任务结束时间" />
                      </label>
                      <label>
                        状态
                        <select value={task.status} onChange={(e) => updateTask(task, 'status', e.target.value as TimelineTask['status'])}>
                          {TASK_STATUSES.map((status) => (
                            <option value={status} key={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-wide">
                        备注
                        <textarea value={task.note} onChange={(e) => updateTask(task, 'note', e.target.value)} />
                      </label>
                    </div>
                  </div>
                )
              })
            : linkedPlans.map((plan) => {
                const personListId = `event-plan-people-${plan.id}`
                return (
                  <div className="event-linked-card" key={plan.id}>
                    <div className="event-linked-card-head">
                      <strong>{plan.role}</strong>
                      <button className="icon-button danger-icon" type="button" aria-label={`删除${plan.content}`} onClick={() => onDeletePlan(plan.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="event-linked-grid">
                      <label className="field-wide">
                        计划内容
                        <input value={plan.content} onChange={(e) => updatePlan(plan, 'content', e.target.value)} />
                      </label>
                      <label>
                        岗位
                        <select value={plan.role} onChange={(e) => updatePlanRole(plan, e.target.value as TeamRole)}>
                          {TEAM_ROLES.map((role) => (
                            <option value={role} key={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        负责人
                        <input list={personListId} value={plan.owner} onChange={(e) => updatePlan(plan, 'owner', e.target.value)} />
                        <datalist id={personListId}>
                          {(peopleOptionsByRole[plan.role] ?? []).map((person) => (
                            <option value={person} key={person} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        开始
                        <TimeInput value={plan.startTime} onChange={(value) => updatePlan(plan, 'startTime', value)} ariaLabel="绑定计划开始时间" />
                      </label>
                      <label>
                        结束
                        <TimeInput value={plan.endTime} onChange={(value) => updatePlan(plan, 'endTime', value)} ariaLabel="绑定计划结束时间" />
                      </label>
                      <label>
                        优先级
                        <select value={plan.priority} onChange={(e) => updatePlan(plan, 'priority', e.target.value as TomorrowPlan['priority'])}>
                          {PLAN_PRIORITIES.map((priority) => (
                            <option value={priority} key={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-wide">
                        预计结果
                        <textarea value={plan.expectedResult} onChange={(e) => updatePlan(plan, 'expectedResult', e.target.value)} />
                      </label>
                      <label className="field-wide">
                        备注
                        <textarea value={plan.note} onChange={(e) => updatePlan(plan, 'note', e.target.value)} />
                      </label>
                    </div>
                  </div>
                )
              })}
        </div>
      </div>
    </Modal>
  )
}
