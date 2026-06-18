import { Plus, Trash2 } from 'lucide-react'
import type { TeamRole, TimelineTask, WorkEvent } from '../types'
import { TASK_STATUSES, TEAM_ROLES } from '../types'
import { eventLabel, getWorkEventById } from '../utils'

interface ActualRecordsTableProps {
  tasks: TimelineTask[]
  events: WorkEvent[]
  peopleOptionsByRole: Record<TeamRole, string[]>
  filters: {
    role: string
    eventId: string
    status: string
  }
  onFiltersChange: (filters: { role: string; eventId: string; status: string }) => void
  onAdd: () => void
  onUpdate: (task: TimelineTask) => void
  onDelete: (taskId: string) => void
}

export function ActualRecordsTable({
  tasks,
  events,
  peopleOptionsByRole,
  filters,
  onFiltersChange,
  onAdd,
  onUpdate,
  onDelete,
}: ActualRecordsTableProps) {
  const visibleTasks = tasks
    .filter((task) => (filters.role ? task.role === filters.role : true))
    .filter((task) => (filters.eventId ? task.workEventId === filters.eventId : true))
    .filter((task) => (filters.status ? task.status === filters.status : true))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const update = <K extends keyof TimelineTask>(task: TimelineTask, key: K, value: TimelineTask[K]) => {
    onUpdate({ ...task, [key]: value })
  }

  const updateRole = (task: TimelineTask, role: TeamRole) => {
    const people = peopleOptionsByRole[role]
    onUpdate({
      ...task,
      role,
      personName: people.includes(task.personName) ? task.personName : people[0] || task.personName,
    })
  }

  const updateWorkEvent = (task: TimelineTask, workEventId: string) => {
    const event = events.find((item) => item.id === workEventId)
    onUpdate({
      ...task,
      workEventId,
      startTime: event?.startTime ?? task.startTime,
      endTime: event?.endTime ?? task.endTime,
    })
  }

  return (
    <section className="data-section">
      <div className="section-header">
        <div>
          <h2>当天实际工作记录表</h2>
          <p>表格修改后会同步到上方时间轴。</p>
        </div>
        <button className="secondary-button" type="button" onClick={onAdd}>
          <Plus size={16} /> 新增记录
        </button>
      </div>

      <div className="filter-bar">
        <label>
          岗位筛选
          <select value={filters.role} onChange={(e) => onFiltersChange({ ...filters, role: e.target.value })}>
            <option value="">全部岗位</option>
            {TEAM_ROLES.map((role) => (
              <option value={role} key={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          工作事件筛选
          <select value={filters.eventId} onChange={(e) => onFiltersChange({ ...filters, eventId: e.target.value })}>
            <option value="">全部事件</option>
            {events.map((event) => (
              <option value={event.id} key={event.id}>
                {eventLabel(event)}
              </option>
            ))}
          </select>
        </label>
        <label>
          状态筛选
          <select value={filters.status} onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}>
            <option value="">全部状态</option>
            {TASK_STATUSES.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>开始</th>
              <th>结束</th>
              <th>岗位</th>
              <th>人员</th>
              <th>工作内容</th>
              <th>关联事件</th>
              <th>状态</th>
              <th>问题</th>
              <th>解决方案</th>
              <th>备注</th>
              <th>来源计划</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((task) => (
              <tr key={task.id}>
                <td>{task.date}</td>
                <td>
                  <input type="time" value={task.startTime} onChange={(e) => update(task, 'startTime', e.target.value)} />
                </td>
                <td>
                  <input type="time" value={task.endTime} onChange={(e) => update(task, 'endTime', e.target.value)} />
                </td>
                <td>
                  <select value={task.role} onChange={(e) => updateRole(task, e.target.value as TeamRole)}>
                    {TEAM_ROLES.map((role) => (
                      <option value={role} key={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    list={`table-people-${task.role}-${task.id}`}
                    value={task.personName}
                    onChange={(e) => update(task, 'personName', e.target.value)}
                  />
                  <datalist id={`table-people-${task.role}-${task.id}`}>
                    {(peopleOptionsByRole[task.role] ?? []).map((person) => (
                      <option value={person} key={person} />
                    ))}
                  </datalist>
                </td>
                <td>
                  <textarea value={task.content} onChange={(e) => update(task, 'content', e.target.value)} />
                </td>
                <td>
                  <select value={task.workEventId} onChange={(e) => updateWorkEvent(task, e.target.value)}>
                    <option value="">未关联</option>
                    {events.map((event) => (
                      <option value={event.id} key={event.id}>
                        {eventLabel(event)}
                      </option>
                    ))}
                  </select>
                  {!getWorkEventById(events, task.workEventId) && task.workEventId ? <span className="table-hint">事件已删除</span> : null}
                </td>
                <td>
                  <select value={task.status} onChange={(e) => update(task, 'status', e.target.value as TimelineTask['status'])}>
                    {TASK_STATUSES.map((status) => (
                      <option value={status} key={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea value={task.problem} onChange={(e) => update(task, 'problem', e.target.value)} />
                </td>
                <td>
                  <textarea value={task.solution} onChange={(e) => update(task, 'solution', e.target.value)} />
                </td>
                <td>
                  <textarea value={task.note} onChange={(e) => update(task, 'note', e.target.value)} />
                </td>
                <td>{task.sourcePlanId || '-'}</td>
                <td>
                  <button className="icon-button danger-icon" type="button" onClick={() => onDelete(task.id)} aria-label="删除记录">
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
