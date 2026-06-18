import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import type { TaskIssue, TimelineTask, WorkEvent } from '../types'
import { TASK_STATUSES, TEAM_ROLES, type TeamRole } from '../types'
import { createId, ensureEndAfterStart, eventLabel } from '../utils'
import { TimeInput } from './TimeInput'

interface TaskEditorProps {
  task: TimelineTask
  events: WorkEvent[]
  peopleOptionsByRole: Record<TeamRole, string[]>
  onSave: (task: TimelineTask) => void
  onDelete: (taskId: string) => void
  onClose: () => void
}

const statusMeta = {
  绿: '正常',
  黄: '需关注',
  红: '未完成 / 有问题',
} as const

export function TaskEditor({ task, events, peopleOptionsByRole, onSave, onDelete, onClose }: TaskEditorProps) {
  const update = <K extends keyof TimelineTask>(key: K, value: TimelineTask[K]) => {
    const next = { ...task, [key]: value }
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
      ...task,
      role,
      personName: people.includes(task.personName) ? task.personName : people[0] || '',
    })
  }

  const updateWorkEvent = (workEventId: string) => {
    const event = events.find((item) => item.id === workEventId)
    onSave({
      ...task,
      workEventId,
      startTime: event?.startTime ?? task.startTime,
      endTime: event?.endTime ?? task.endTime,
    })
  }

  const saveIssues = (issues: TaskIssue[]) => {
    const firstIssue = issues.find((issue) => issue.problem.trim() || issue.solution.trim()) ?? issues[0]
    onSave({
      ...task,
      issues,
      problem: firstIssue?.problem ?? '',
      solution: firstIssue?.solution ?? '',
    })
  }

  const addIssue = () => {
    saveIssues([
      ...(task.issues ?? []),
      {
        id: createId('issue'),
        problem: '',
        solution: '',
      },
    ])
  }

  const updateIssue = (issueId: string, patch: Partial<Pick<TaskIssue, 'problem' | 'solution'>>) => {
    saveIssues((task.issues ?? []).map((issue) => (issue.id === issueId ? { ...issue, ...patch } : issue)))
  }

  const deleteIssue = (issueId: string) => {
    saveIssues((task.issues ?? []).filter((issue) => issue.id !== issueId))
  }

  const issues = task.issues ?? []
  const personOptions = peopleOptionsByRole[task.role] ?? []
  const personListId = `people-options-${task.role}`
  const confirmDelete = () => {
    if (window.confirm('确认删除这个岗位任务？删除后时间轴和表格都会同步移除。')) {
      onDelete(task.id)
    }
  }

  return (
    <Modal
      title="编辑岗位任务"
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
          工作内容
          <input value={task.content} onChange={(e) => update('content', e.target.value)} />
        </label>
        <label>
          岗位
          <select value={task.role} onChange={(e) => updateRole(e.target.value as TeamRole)}>
            {TEAM_ROLES.map((role) => (
              <option value={role} key={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          人员姓名
          <input list={personListId} value={task.personName} onChange={(e) => update('personName', e.target.value)} placeholder="填写姓名" />
          <datalist id={personListId}>
            {personOptions.map((person) => (
              <option value={person} key={person} />
            ))}
          </datalist>
        </label>
        <label>
          开始时间
          <TimeInput value={task.startTime} onChange={(value) => update('startTime', value)} ariaLabel="任务开始时间" />
          <span className="field-tip">输入 0845 可自动转为 08:45</span>
        </label>
        <label>
          结束时间
          <TimeInput value={task.endTime} onChange={(value) => update('endTime', value)} ariaLabel="任务结束时间" />
          <span className="field-tip">选择关联事件会先自动匹配，可再手动改</span>
        </label>
        <label>
          关联工作事件
          <select value={task.workEventId} onChange={(e) => updateWorkEvent(e.target.value)}>
            <option value="">未关联</option>
            {events.map((event) => (
              <option value={event.id} key={event.id}>
                {eventLabel(event)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="status-field field-wide">
          <legend>完成状态</legend>
          <div className="status-picker">
            {TASK_STATUSES.map((status) => (
              <button
                className={`status-choice status-choice-${status} ${task.status === status ? 'status-choice-active' : ''}`}
                type="button"
                onClick={() => update('status', status)}
                key={status}
              >
                <span>{status}</span>
                {statusMeta[status]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="task-issues field-wide">
          <div className="task-issues-header">
            <strong>问题与解决方案</strong>
            <button className="secondary-button compact-secondary-button" type="button" onClick={addIssue}>
              <Plus size={14} /> 新增问题
            </button>
          </div>
          {issues.length === 0 ? <div className="empty-state compact-empty-state">这个任务还没有问题记录。</div> : null}
          {issues.map((issue, index) => (
            <div className="task-issue-card" key={issue.id}>
              <div className="task-issue-card-header">
                <span>问题 {index + 1}</span>
                <button className="icon-button danger-icon" type="button" onClick={() => deleteIssue(issue.id)} aria-label={`删除问题 ${index + 1}`}>
                  <Trash2 size={14} />
                </button>
              </div>
              <label>
                遇到的问题
                <textarea value={issue.problem} onChange={(event) => updateIssue(issue.id, { problem: event.target.value })} />
              </label>
              <label>
                解决方案
                <textarea value={issue.solution} onChange={(event) => updateIssue(issue.id, { solution: event.target.value })} />
              </label>
            </div>
          ))}
        </div>
        <label className="field-wide">
          备注
          <textarea value={task.note} onChange={(e) => update('note', e.target.value)} />
        </label>
      </div>
    </Modal>
  )
}
