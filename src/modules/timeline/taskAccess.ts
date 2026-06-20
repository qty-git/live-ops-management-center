import { hasPermission } from '../auth/permissions'
import type { AuthUser } from '../auth/types'
import type { TeamPerson, TimelineTask } from './types'

export interface TaskEditAccess {
  isOwn: boolean
  canEditFeedback: boolean
  canEditStructure: boolean
  canDelete: boolean
}

export function isOwnTask(task: TimelineTask, user: AuthUser, people: TeamPerson[]): boolean {
  const linkedPerson = user.personId ? people.find((person) => person.id === user.personId) : undefined
  if (linkedPerson?.name.trim() && task.personName.trim() === linkedPerson.name.trim()) return true
  if (user.position !== '管理' && task.role === user.position) return true

  const assignedUserId = (task as TimelineTask & { assignedUserId?: unknown }).assignedUserId
  return typeof assignedUserId === 'string' && assignedUserId === user.id
}

export function getTaskEditAccess(task: TimelineTask, user: AuthUser, people: TeamPerson[]): TaskEditAccess {
  const ownTask = isOwnTask(task, user, people)
  const canEditAllTasks = hasPermission(user, 'task:edit_all') || hasPermission(user, 'timeline:manage')
  const canEditOwnTask = ownTask && hasPermission(user, 'task:edit_own')
  const canEditAllFeedback = hasPermission(user, 'task_feedback:edit_all') || canEditAllTasks
  const canEditOwnFeedback = ownTask && hasPermission(user, 'task_feedback:edit_own')

  return {
    isOwn: ownTask,
    canEditFeedback: canEditAllFeedback || canEditOwnFeedback,
    canEditStructure: canEditAllTasks || canEditOwnTask,
    canDelete: hasPermission(user, 'timeline:manage'),
  }
}

export function restrictTaskUpdate(original: TimelineTask, requested: TimelineTask, access: TaskEditAccess): { task: TimelineTask; denied: boolean } {
  const structureKeys: Array<keyof TimelineTask> = ['date', 'role', 'personName', 'startTime', 'endTime', 'content', 'workEventId', 'sourcePlanId']
  const feedbackKeys: Array<keyof TimelineTask> = ['status', 'problem', 'solution', 'issues', 'note']
  const next: TimelineTask = { ...requested, id: original.id }
  let denied = false

  if (!access.canEditStructure) {
    structureKeys.forEach((key) => {
      if (!sameValue(original[key], requested[key])) denied = true
      assignTaskValue(next, key, original[key])
    })
  }

  if (!access.canEditFeedback) {
    feedbackKeys.forEach((key) => {
      if (!sameValue(original[key], requested[key])) denied = true
      assignTaskValue(next, key, original[key])
    })
  }

  return { task: next, denied }
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) return JSON.stringify(left) === JSON.stringify(right)
  return left === right
}

function assignTaskValue<K extends keyof TimelineTask>(task: TimelineTask, key: K, value: TimelineTask[K]): void {
  task[key] = value
}
