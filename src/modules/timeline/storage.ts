import { createDefaultPeople, createDefaultSettings, createDefaultWorkTemplates, createEmptyDayData } from './defaultData'
import type { TaskIssue, TaskStatus, TimelineDayData, TimelineStore } from './types'
import { addDays, createId } from './utils'

const STORAGE_KEY = 'live-ops-management.timeline.v1'

export function loadTimelineStore(): TimelineStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyStore()
    const parsed = JSON.parse(raw) as TimelineStore
    if (parsed.version !== 1 || !parsed.days) return createEmptyStore()
    return normalizeStore(parsed)
  } catch {
    return createEmptyStore()
  }
}

export function saveTimelineStore(store: TimelineStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function ensureDay(store: TimelineStore, date: string): TimelineDayData {
  return store.days[date] ?? createEmptyDayData(date)
}

export function saveDay(store: TimelineStore, date: string, day: TimelineDayData): TimelineStore {
  return {
    ...store,
    days: {
      ...store.days,
      [date]: day,
    },
  }
}

export function normalizeStore(store: TimelineStore): TimelineStore {
  return {
    ...store,
    people: store.people?.length ? store.people : createDefaultPeople(),
    workTemplates: store.workTemplates?.length ? store.workTemplates : createDefaultWorkTemplates(),
    days: Object.fromEntries(Object.entries(store.days).map(([date, day]) => [date, normalizeDay(date, day)])),
  }
}

function normalizeDay(date: string, day: TimelineDayData): TimelineDayData {
  const events = day.events ?? []
  const tomorrowEvents =
    day.tomorrowEvents?.length > 0
      ? day.tomorrowEvents
      : events.map((event) => ({
          ...event,
          date: addDays(date, 1),
        }))

  return {
    ...day,
    settings: day.settings ?? createDefaultSettings(date),
    events,
    tomorrowEvents,
    tasks: (day.tasks ?? []).map((task) => ({
      ...task,
      status: normalizeTaskStatus(String(task.status)),
      problem: task.problem ?? '',
      solution: task.solution ?? '',
      issues: normalizeTaskIssues(task.issues, task.problem ?? '', task.solution ?? ''),
    })),
    tomorrowPlans: day.tomorrowPlans ?? [],
    comparisonNotes: day.comparisonNotes ?? [],
  }
}

function normalizeTaskIssues(issues: TaskIssue[] | undefined, problem: string, solution: string): TaskIssue[] {
  if (Array.isArray(issues) && issues.length > 0) {
    return issues.map((issue) => ({
      id: issue.id || createId('issue'),
      problem: issue.problem ?? '',
      solution: issue.solution ?? '',
    }))
  }

  if (!problem.trim() && !solution.trim()) return []

  return [
    {
      id: createId('issue'),
      problem,
      solution,
    },
  ]
}

function normalizeTaskStatus(status: string): TaskStatus {
  if (status === '红' || status === '未完成') return '红'
  if (status === '黄' || status === '延迟') return '黄'
  return '绿'
}

function createEmptyStore(): TimelineStore {
  return {
    version: 1,
    days: {},
    people: createDefaultPeople(),
    workTemplates: createDefaultWorkTemplates(),
  }
}
