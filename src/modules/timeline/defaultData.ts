import type { TeamPerson, TimelineDayData, TimelineSettings, TimelineTask, TomorrowPlan, WorkEvent, WorkTemplate } from './types'
import { DEFAULT_ACTUAL_END, DEFAULT_STANDARD_END, DEFAULT_WORK_START, addDays, createId } from './utils'

const defaultPeopleByRole = {
  主播: '主播 A',
  中控: '中控 A',
  场控: '场控 A',
  运营: '运营 A',
  摄影: '摄影 A',
} as const

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
      assignments: [
        createTemplateAssignment(mainStage, '主播', defaultPeopleByRole.主播, '直播讲款'),
        createTemplateAssignment(mainStage, '中控', defaultPeopleByRole.中控, '控库存和链接节奏'),
        createTemplateAssignment(mainStage, '场控', defaultPeopleByRole.场控, '评论互动和节奏提醒'),
        createTemplateAssignment(mainStage, '运营', defaultPeopleByRole.运营, '投流观察与复盘记录'),
      ],
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
  const events: WorkEvent[] = [
    createEvent(date, '选款', '事前准备', '08:00', '09:00', '确认今日直播与视频需要的基础款池。'),
    createEvent(date, '选款', '正式工作', '09:00', '10:30', '围绕库存、尺码和风格筛选主推款。'),
    createEvent(date, '选款', '收尾工作', '10:30', '11:00', '整理排品和备选链接。'),
    createEvent(date, '拍视频', '事前准备', '11:00', '12:00', '准备脚本、场景和出镜款。'),
    createEvent(date, '拍视频', '正式工作', '13:00', '15:00', '完成短视频拍摄。'),
    createEvent(date, '拍视频', '收尾工作', '15:00', '15:40', '整理素材并标注重点镜头。'),
    createEvent(date, '直播', '事前准备', '14:30', '15:30', '检查链接、样衣、话术和直播间状态。'),
    createEvent(date, '直播', '正式工作', '15:30', '18:30', '执行当日直播节奏。'),
    createEvent(date, '直播', '收尾工作', '18:30', '19:00', '下播后整理问题和库存。'),
    createEvent(date, '复盘', '复盘', '19:00', '20:00', '记录执行偏差和明日调整。'),
  ]

  const eventByName = new Map(events.map((event) => [`${event.name}-${event.phase}`, event.id]))

  const tasks: TimelineTask[] = [
    createTask(date, '主播', '09:00', '10:30', '试穿与卖点反馈', eventByName.get('选款-正式工作')),
    createTask(date, '主播', '13:00', '14:50', '拍摄出镜', eventByName.get('拍视频-正式工作')),
    createTask(date, '主播', '15:30', '18:30', '直播讲款', eventByName.get('直播-正式工作')),
    createTask(date, '主播', '19:00', '19:40', '复盘反馈', eventByName.get('复盘-复盘')),
    createTask(date, '中控', '08:30', '10:30', '检查商品与尺码库存', eventByName.get('选款-正式工作')),
    createTask(date, '中控', '14:30', '15:30', '上链接和检查优惠', eventByName.get('直播-事前准备')),
    createTask(date, '中控', '15:30', '18:30', '控库存和链接节奏', eventByName.get('直播-正式工作')),
    createTask(date, '场控', '14:30', '15:30', '话术配合与场景检查', eventByName.get('直播-事前准备')),
    createTask(date, '场控', '15:30', '18:30', '评论互动和节奏提醒', eventByName.get('直播-正式工作')),
    createTask(date, '运营', '09:00', '11:00', '排品与主推顺序确认', eventByName.get('选款-正式工作')),
    createTask(date, '运营', '15:30', '18:30', '投流观察与复盘记录', eventByName.get('直播-正式工作')),
    createTask(date, '摄影', '11:00', '15:00', '拍摄短视频', eventByName.get('拍视频-正式工作')),
    createTask(date, '摄影', '15:00', '16:30', '剪辑素材与直播素材', eventByName.get('拍视频-收尾工作')),
  ]

  const tomorrowEvents = events.map((event) => ({
    ...event,
    id: createId('event'),
    date: addDays(date, 1),
  }))
  const tomorrowEventByName = new Map(tomorrowEvents.map((event) => [`${event.name}-${event.phase}`, event.id]))

  const tomorrowPlans: TomorrowPlan[] = [
    {
      id: createId('plan'),
      planDate: addDays(date, 1),
      startTime: '08:30',
      endTime: '10:30',
      role: '运营',
      owner: defaultPeopleByRole.运营,
      workEventId: tomorrowEventByName.get('选款-正式工作') ?? '',
      content: '提前确认明日主推款和备选款',
      priority: '高',
      expectedResult: '直播前完成排品清单',
      note: '',
    },
  ]

  return {
    settings: createDefaultSettings(date),
    events,
    tomorrowEvents,
    tasks,
    tomorrowPlans,
    comparisonNotes: [],
  }
}

function createEvent(
  date: string,
  name: string,
  phase: WorkEvent['phase'],
  startTime: string,
  endTime: string,
  note: string,
): WorkEvent {
  return {
    id: createId('event'),
    date,
    name,
    phase,
    startTime,
    endTime,
    note,
  }
}

function createTemplateAssignment(
  stageId: string,
  role: TimelineTask['role'],
  owner: string,
  content: string,
): WorkTemplate['assignments'][number] {
  return {
    id: createId('assignment'),
    stageId,
    role,
    owner,
    content,
    note: '',
  }
}

function createTask(
  date: string,
  role: TimelineTask['role'],
  startTime: string,
  endTime: string,
  content: string,
  workEventId = '',
): TimelineTask {
  return {
    id: createId('task'),
    date,
    role,
    personName: defaultPeopleByRole[role],
    startTime,
    endTime,
    content,
    workEventId,
    status: '绿',
    problem: '',
    solution: '',
    issues: [],
    note: '',
    sourcePlanId: '',
  }
}
