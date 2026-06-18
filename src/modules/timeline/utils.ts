import type {
  ComparisonNote,
  ComparisonRow,
  DeviationStatus,
  TaskIssue,
  TimelinePrecision,
  TimelineTask,
  TomorrowPlan,
  WorkEvent,
} from './types'

export const DEFAULT_WORK_START = '08:00'
export const DEFAULT_STANDARD_END = '17:00'
export const DEFAULT_ACTUAL_END = '20:00'

const MINUTES_PER_DAY = 24 * 60

export function todayISO(): string {
  return formatDateISO(new Date())
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function addDays(dateISO: string, days: number): string {
  const date = parseISODate(dateISO)
  date.setDate(date.getDate() + days)
  return formatDateISO(date)
}

export function minutesFromTime(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export function normalizeCompactTimeInput(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (!digits) return null

  const parsed =
    digits.length <= 2
      ? { hours: Number(digits), minutes: 0 }
      : digits.length === 3
        ? { hours: Number(digits.slice(0, 1)), minutes: Number(digits.slice(1)) }
        : { hours: Number(digits.slice(0, 2)), minutes: Number(digits.slice(2, 4)) }
  const { hours, minutes } = parsed

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function timeFromMinutes(minutes: number): string {
  const normalized = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function snapMinutes(minutes: number, step = 5): number {
  return Math.round(minutes / step) * step
}

export function rangeDuration(startTime: string, endTime: string): number {
  return Math.max(0, minutesFromTime(endTime) - minutesFromTime(startTime))
}

export function ensureEndAfterStart(startTime: string, endTime: string, minDuration = 15): string {
  const start = minutesFromTime(startTime)
  const end = minutesFromTime(endTime)
  if (end - start >= minDuration) {
    return endTime
  }
  return timeFromMinutes(start + minDuration)
}

export function getPrecision(startTime: string, endTime: string): TimelinePrecision {
  const duration = rangeDuration(startTime, endTime)
  if (duration > 8 * 60) return 'overview'
  if (duration > 3 * 60) return 'hour'
  if (duration >= 60) return 'quarter'
  return 'fiveMinute'
}

export function precisionLabel(precision: TimelinePrecision): string {
  switch (precision) {
    case 'overview':
      return '总览模式'
    case 'hour':
      return '小时级'
    case 'quarter':
      return '15 分钟级'
    case 'fiveMinute':
      return '5 分钟级'
  }
}

export function precisionTickStep(precision: TimelinePrecision): number {
  switch (precision) {
    case 'overview':
      return 120
    case 'hour':
      return 60
    case 'quarter':
      return 15
    case 'fiveMinute':
      return 5
  }
}

export function buildTicks(startTime: string, endTime: string, precision: TimelinePrecision): string[] {
  const start = minutesFromTime(startTime)
  const end = minutesFromTime(endTime)
  const step = precisionTickStep(precision)
  const first = Math.ceil(start / step) * step
  const ticks: string[] = []

  if (start <= end) {
    ticks.push(timeFromMinutes(start))
  }

  for (let current = first; current < end; current += step) {
    if (current > start) {
      ticks.push(timeFromMinutes(current))
    }
  }

  if (ticks[ticks.length - 1] !== timeFromMinutes(end)) {
    ticks.push(timeFromMinutes(end))
  }

  return [...new Set(ticks)]
}

export function getItemRange(item: { startTime: string; endTime: string }, viewStart: string, viewEnd: string) {
  const start = minutesFromTime(item.startTime)
  const end = minutesFromTime(item.endTime)
  const viewStartMinutes = minutesFromTime(viewStart)
  const viewEndMinutes = minutesFromTime(viewEnd)
  const clippedStart = clamp(start, viewStartMinutes, viewEndMinutes)
  const clippedEnd = clamp(end, viewStartMinutes, viewEndMinutes)
  const viewDuration = Math.max(1, viewEndMinutes - viewStartMinutes)

  return {
    visible: end > viewStartMinutes && start < viewEndMinutes,
    left: ((clippedStart - viewStartMinutes) / viewDuration) * 100,
    width: Math.max(1.4, ((clippedEnd - clippedStart) / viewDuration) * 100),
    startsBefore: start < viewStartMinutes,
    endsAfter: end > viewEndMinutes,
  }
}

export function layoutOverlaps<T extends { startTime: string; endTime: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => {
    const byStart = minutesFromTime(a.startTime) - minutesFromTime(b.startTime)
    return byStart || minutesFromTime(a.endTime) - minutesFromTime(b.endTime)
  })
  const laneEnds: number[] = []

  return sorted.map((item) => {
    const start = minutesFromTime(item.startTime)
    const end = minutesFromTime(item.endTime)
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)

    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }

    return { item, lane }
  })
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} 分钟`
  if (mins === 0) return `${hours} 小时`
  return `${hours} 小时 ${mins} 分钟`
}

export function calculateTaskMinutes(task: TimelineTask): number {
  return rangeDuration(task.startTime, task.endTime)
}

export function collectTaskIssues(task: TimelineTask): TaskIssue[] {
  const issues = Array.isArray(task.issues) ? task.issues : []
  const normalizedIssues = issues
    .map((issue) => ({
      id: issue.id || createId('issue'),
      problem: issue.problem ?? '',
      solution: issue.solution ?? '',
    }))
    .filter((issue) => issue.problem.trim() || issue.solution.trim())

  if (normalizedIssues.length > 0) return normalizedIssues
  if (!task.problem.trim() && !task.solution.trim()) return []

  return [
    {
      id: createId('issue'),
      problem: task.problem,
      solution: task.solution,
    },
  ]
}

export function taskIssueSummary(task: TimelineTask, field: keyof Pick<TaskIssue, 'problem' | 'solution'>): string {
  return collectTaskIssues(task)
    .map((issue) => issue[field].trim())
    .filter(Boolean)
    .join('\n')
}

export function eventLabel(event?: WorkEvent): string {
  if (!event) return '未关联'
  return event.phase === '复盘' ? event.name : `${event.name}-${event.phase}`
}

export function comparePlanAndActual(plan: TomorrowPlan, actual?: TimelineTask): DeviationStatus {
  if (!actual) return '未完成'
  if (actual.status === '红') return '未完成'
  if (plan.startTime !== actual.startTime || plan.endTime !== actual.endTime) return '时间变化'
  if (plan.role !== actual.role || plan.content.trim() !== actual.content.trim()) return '内容变化'
  return '一致'
}

export function buildComparisonRows(
  plansForToday: TomorrowPlan[],
  actualTasks: TimelineTask[],
  notes: ComparisonNote[],
): ComparisonRow[] {
  const notesByKey = new Map(notes.map((note) => [note.comparisonKey, note]))
  const actualByPlanId = new Map(actualTasks.filter((task) => task.sourcePlanId).map((task) => [task.sourcePlanId, task]))
  const rows: ComparisonRow[] = plansForToday.map((plan) => {
    const key = `plan-${plan.id}`
    const note = notesByKey.get(key)
    const actual = actualByPlanId.get(plan.id)
    return {
      key,
      plan,
      actual,
      deviationStatus: comparePlanAndActual(plan, actual),
      deviationReason: note?.deviationReason ?? '',
      tomorrowSuggestion: note?.tomorrowSuggestion ?? '',
    }
  })

  actualTasks
    .filter((task) => !task.sourcePlanId)
    .forEach((task) => {
      const key = `actual-${task.id}`
      const note = notesByKey.get(key)
      rows.push({
        key,
        actual: task,
        deviationStatus: '新增工作',
        deviationReason: note?.deviationReason ?? '',
        tomorrowSuggestion: note?.tomorrowSuggestion ?? '',
      })
    })

  return rows
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getWorkEventById(events: WorkEvent[], id: string): WorkEvent | undefined {
  return events.find((event) => event.id === id)
}
