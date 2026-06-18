import { Plus, Trash2 } from 'lucide-react'
import type { TeamRole, TomorrowPlan, WorkEvent } from '../types'
import { PLAN_PRIORITIES, TEAM_ROLES } from '../types'
import { ensureEndAfterStart, eventLabel } from '../utils'
import { TimeInput } from './TimeInput'

interface TomorrowPlanTableProps {
  plans: TomorrowPlan[]
  events: WorkEvent[]
  peopleOptionsByRole: Record<TeamRole, string[]>
  onAdd: () => void
  onUpdate: (plan: TomorrowPlan) => void
  onDelete: (planId: string) => void
}

export function TomorrowPlanTable({ plans, events, peopleOptionsByRole, onAdd, onUpdate, onDelete }: TomorrowPlanTableProps) {
  const update = <K extends keyof TomorrowPlan>(plan: TomorrowPlan, key: K, value: TomorrowPlan[K]) => {
    const next = { ...plan, [key]: value }
    if (key === 'startTime') {
      next.endTime = ensureEndAfterStart(String(value), next.endTime)
    }
    if (key === 'endTime') {
      next.endTime = ensureEndAfterStart(next.startTime, String(value))
    }
    onUpdate(next)
  }

  const confirmDelete = (plan: TomorrowPlan) => {
    if (window.confirm(`确认删除计划“${plan.content}”？`)) {
      onDelete(plan.id)
    }
  }

  const updateRole = (plan: TomorrowPlan, role: TeamRole) => {
    const people = peopleOptionsByRole[role]
    onUpdate({
      ...plan,
      role,
      owner: people.includes(plan.owner) ? plan.owner : people[0] || plan.owner,
    })
  }

  const updateWorkEvent = (plan: TomorrowPlan, workEventId: string) => {
    const event = events.find((item) => item.id === workEventId)
    onUpdate({
      ...plan,
      workEventId,
      startTime: event?.startTime ?? plan.startTime,
      endTime: event?.endTime ?? plan.endTime,
    })
  }

  return (
    <section className="data-section">
      <div className="section-header">
        <div>
          <h2>明日计划表</h2>
          <p>第二天会进入当天实际工作草稿，状态默认为绿。</p>
        </div>
        <button className="secondary-button" type="button" onClick={onAdd}>
          <Plus size={16} /> 新增计划
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>计划日期</th>
              <th>开始</th>
              <th>结束</th>
              <th>岗位</th>
              <th>负责人</th>
              <th>关联事件</th>
              <th>计划内容</th>
              <th>优先级</th>
              <th>预计结果</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <input type="date" value={plan.planDate} onChange={(e) => update(plan, 'planDate', e.target.value)} />
                </td>
                <td>
                  <TimeInput value={plan.startTime} onChange={(value) => update(plan, 'startTime', value)} />
                </td>
                <td>
                  <TimeInput value={plan.endTime} onChange={(value) => update(plan, 'endTime', value)} />
                </td>
                <td>
                  <select value={plan.role} onChange={(e) => updateRole(plan, e.target.value as TeamRole)}>
                    {TEAM_ROLES.map((role) => (
                      <option value={role} key={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input list={`plan-people-${plan.role}-${plan.id}`} value={plan.owner} onChange={(e) => update(plan, 'owner', e.target.value)} />
                  <datalist id={`plan-people-${plan.role}-${plan.id}`}>
                    {(peopleOptionsByRole[plan.role] ?? []).map((person) => (
                      <option value={person} key={person} />
                    ))}
                  </datalist>
                </td>
                <td>
                  <select value={plan.workEventId} onChange={(e) => updateWorkEvent(plan, e.target.value)}>
                    <option value="">未关联</option>
                    {events.map((event) => (
                      <option value={event.id} key={event.id}>
                        {eventLabel(event)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea value={plan.content} onChange={(e) => update(plan, 'content', e.target.value)} />
                </td>
                <td>
                  <select value={plan.priority} onChange={(e) => update(plan, 'priority', e.target.value as TomorrowPlan['priority'])}>
                    {PLAN_PRIORITIES.map((priority) => (
                      <option value={priority} key={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea value={plan.expectedResult} onChange={(e) => update(plan, 'expectedResult', e.target.value)} />
                </td>
                <td>
                  <textarea value={plan.note} onChange={(e) => update(plan, 'note', e.target.value)} />
                </td>
                <td>
                  <button className="icon-button danger-icon" type="button" onClick={() => confirmDelete(plan)} aria-label="删除计划">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
