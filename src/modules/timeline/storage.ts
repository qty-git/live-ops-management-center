import { createDefaultPeople, createDefaultSettings, createDefaultWorkTemplates, createEmptyDayData } from './defaultData'
import type { DayPlanTemplate, TaskIssue, TaskStatus, TimelineDayData, TimelineStore } from './types'
import { addDays, createId } from './utils'

const STORAGE_KEY = 'live-ops-management.timeline.v1'
const LEGACY_SEED_EVENT_NAMES = new Set(['选款', '拍视频', '直播', '复盘'])
const LEGACY_SEED_TASK_CONTENT = new Set([
  '试穿与卖点反馈',
  '拍摄出镜',
  '直播讲款',
  '复盘反馈',
  '检查商品与尺码库存',
  '上链接和检查优惠',
  '控库存和链接节奏',
  '话术配合与场景检查',
  '评论互动和节奏提醒',
  '排品与主推顺序确认',
  '投流观察与复盘记录',
  '拍摄短视频',
  '剪辑素材与直播素材',
])
const LEGACY_SEED_PLAN_CONTENT = new Set(['提前确认明日主推款和备选款'])

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
  const storedTemplates = store as TimelineStore & { dayPlanTemplates?: DayPlanTemplate[] }

  return {
    ...store,
    people: store.people?.length ? store.people : createDefaultPeople(),
    workTemplates: store.workTemplates?.length ? store.workTemplates : createDefaultWorkTemplates(),
    dayPlanTemplates: Array.isArray(storedTemplates.dayPlanTemplates) ? storedTemplates.dayPlanTemplates : [],
    days: Object.fromEntries(
      Object.entries(store.days).flatMap(([date, day]) => {
        const normalizedDay = normalizeDay(date, day)
        return isEmptyDay(normalizedDay) || isLegacySeedDay(normalizedDay) ? [] : [[date, normalizedDay]]
      }),
    ),
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

function isLegacySeedDay(day: TimelineDayData): boolean {
  const hasUserNotes = day.comparisonNotes.some((note) => note.deviationReason.trim() || note.tomorrowSuggestion.trim())
  if (hasUserNotes) return false

  const eventLikeSeed =
    day.events.length > 0 &&
    day.events.every((event) => LEGACY_SEED_EVENT_NAMES.has(event.name)) &&
    day.tomorrowEvents.every((event) => LEGACY_SEED_EVENT_NAMES.has(event.name))
  const tasksLikeSeed = day.tasks.length > 0 && day.tasks.every((task) => LEGACY_SEED_TASK_CONTENT.has(task.content))
  const plansLikeSeed = day.tomorrowPlans.every((plan) => LEGACY_SEED_PLAN_CONTENT.has(plan.content))

  return eventLikeSeed && tasksLikeSeed && plansLikeSeed
}

function isEmptyDay(day: TimelineDayData): boolean {
  return (
    day.events.length === 0 &&
    day.tomorrowEvents.length === 0 &&
    day.tasks.length === 0 &&
    day.tomorrowPlans.length === 0 &&
    day.comparisonNotes.every((note) => !note.deviationReason.trim() && !note.tomorrowSuggestion.trim())
  )
}

function createEmptyStore(): TimelineStore {
  return {
    version: 1,
    days: {},
    people: createDefaultPeople(),
    workTemplates: createDefaultWorkTemplates(),
    dayPlanTemplates: [],
  }
}
