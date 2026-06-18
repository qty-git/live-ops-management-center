export const TEAM_ROLES = ['主播', '中控', '场控', '运营', '摄影'] as const

export type TeamRole = (typeof TEAM_ROLES)[number]

export const EVENT_PHASES = ['事前准备', '正式工作', '收尾工作', '复盘'] as const

export type WorkEventPhase = (typeof EVENT_PHASES)[number]

export const TASK_STATUSES = ['绿', '黄', '红'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const PLAN_PRIORITIES = ['高', '中', '低'] as const

export type PlanPriority = (typeof PLAN_PRIORITIES)[number]

export const DEVIATION_STATUSES = ['一致', '时间变化', '内容变化', '未完成', '新增工作'] as const

export type DeviationStatus = (typeof DEVIATION_STATUSES)[number]

export type TimelinePrecision = 'overview' | 'hour' | 'quarter' | 'fiveMinute'

export interface TimelineSettings {
  date: string
  workStartTime: string
  standardEndTime: string
  actualEndTime: string
  viewStartTime: string
  viewEndTime: string
}

export interface TeamPerson {
  id: string
  role: TeamRole
  name: string
}

export interface WorkEvent {
  id: string
  date: string
  name: string
  phase: WorkEventPhase
  startTime: string
  endTime: string
  note: string
}

export interface TaskIssue {
  id: string
  problem: string
  solution: string
}

export interface TimelineTask {
  id: string
  date: string
  role: TeamRole
  personName: string
  startTime: string
  endTime: string
  content: string
  workEventId: string
  status: TaskStatus
  problem: string
  solution: string
  issues: TaskIssue[]
  note: string
  sourcePlanId: string
}

export interface TomorrowPlan {
  id: string
  planDate: string
  startTime: string
  endTime: string
  role: TeamRole
  owner: string
  workEventId: string
  content: string
  priority: PlanPriority
  expectedResult: string
  note: string
}

export interface WorkTemplateStage {
  id: string
  phase: WorkEventPhase
  enabled: boolean
  startTime: string
  endTime: string
  note: string
}

export interface WorkTemplateAssignment {
  id: string
  stageId: string
  role: TeamRole
  owner: string
  content: string
  note: string
}

export interface WorkTemplate {
  id: string
  name: string
  note: string
  stages: WorkTemplateStage[]
  assignments: WorkTemplateAssignment[]
}

export interface ComparisonNote {
  id: string
  date: string
  comparisonKey: string
  deviationReason: string
  tomorrowSuggestion: string
}

export interface TimelineDayData {
  settings: TimelineSettings
  events: WorkEvent[]
  tomorrowEvents: WorkEvent[]
  tasks: TimelineTask[]
  tomorrowPlans: TomorrowPlan[]
  comparisonNotes: ComparisonNote[]
}

export interface TimelineStore {
  version: 1
  days: Record<string, TimelineDayData>
  people: TeamPerson[]
  workTemplates: WorkTemplate[]
}

export interface ComparisonRow {
  key: string
  plan?: TomorrowPlan
  actual?: TimelineTask
  deviationStatus: DeviationStatus
  deviationReason: string
  tomorrowSuggestion: string
}

export interface RowLayout<T> {
  item: T
  lane: number
}
