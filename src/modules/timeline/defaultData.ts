import type { TeamPerson, TimelineDayData, TimelineSettings, TimelineTask, WorkTemplate } from './types'
import { DEFAULT_ACTUAL_END, DEFAULT_STANDARD_END, DEFAULT_WORK_START, createId } from './utils'

const defaultPeopleByRole = {
  主播: '主播 A',
  中控: '中控 A',
  场控: '场控 A',
  运营: '运营 A',
  摄影: '摄影 A',
} as const

const defaultAssignmentRoles: TimelineTask['role'][] = ['主播', '中控', '场控', '摄影', '运营']

export function createDefaultSettings(date: string): TimelineSettings {
  return {
    date,
    workStartTime: DEFAULT_WORK_START,
    standardEndTime: DEFAULT_STANDARD_END,
    actualEndTime: DEFAULT_ACTUAL_END,
    viewStartTime: DEFAULT_WORK_START,
    viewEndTime: DEFAULT_ACTUAL_END,
  }
}

export function createDefaultPeople(): TeamPerson[] {
  return Object.entries(defaultPeopleByRole).map(([role, name]) => ({
    id: createId('person'),
    role: role as TeamPerson['role'],
    name,
  }))
}

export function createDefaultWorkTemplates(): WorkTemplate[] {
  const prepStage = createId('stage')
  const mainStage = createId('stage')
  const wrapStage = createId('stage')

  return [
    {
      id: createId('template'),
      name: '直播',
      note: '默认直播工作模板，可按当天节奏调整时间和人员。',
      stages: [
        {
          id: prepStage,
          phase: '事前准备',
          enabled: true,
          startTime: '14:30',
          endTime: '15:30',
          note: '检查样衣、链接、优惠、话术和直播间状态。',
        },
        {
          id: mainStage,
          phase: '正式工作',
          enabled: true,
          startTime: '15:30',
          endTime: '18:30',
          note: '执行直播节奏并跟进现场问题。',
        },
        {
          id: wrapStage,
          phase: '收尾工作',
          enabled: true,
          startTime: '18:30',
          endTime: '19:00',
          note: '整理库存、问题、素材和复盘记录。',
        },
      ],
      assignments: [prepStage, mainStage, wrapStage].flatMap((stageId) => createDefaultStageAssignments(stageId)),
    },
  ]
}

export function createEmptyDayData(date: string): TimelineDayData {
  return {
    settings: createDefaultSettings(date),
    events: [],
    tomorrowEvents: [],
    tasks: [],
    tomorrowPlans: [],
    comparisonNotes: [],
  }
}

export function createDefaultDayData(date: string): TimelineDayData {
  return createEmptyDayData(date)
}

function createDefaultStageAssignments(stageId: string): WorkTemplate['assignments'] {
  return defaultAssignmentRoles.map((role) => createTemplateAssignment(stageId, role))
}

function createTemplateAssignment(stageId: string, role: TimelineTask['role']): WorkTemplate['assignments'][number] {
  return {
    id: createId('assignment'),
    stageId,
    role,
    owner: defaultPeopleByRole[role],
    content: '',
    note: '',
  }
}
