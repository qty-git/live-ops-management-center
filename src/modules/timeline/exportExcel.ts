import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import { assertPermission } from '../auth/accessControl'
import type { AuthUser } from '../auth/types'
import type { ComparisonRow, TaskIssue, TimelineDayData, TimelineTask, TomorrowPlan, WorkEvent } from './types'
import { addDays, calculateTaskMinutes, collectTaskIssues, eventLabel, formatDuration, getWorkEventById, taskIssueSummary } from './utils'

type CellValue = string | number | Date | boolean | null

type SheetRow = SheetData[number]

type StyledCell = {
  value: Exclude<CellValue, null>
  fontWeight?: 'bold'
  backgroundColor?: string
  textColor?: string
  align?: 'left' | 'center' | 'right'
  wrap?: boolean
}

const headerStyle = {
  fontWeight: 'bold' as const,
  backgroundColor: '#E8F0F2',
  textColor: '#12343B',
}

export async function exportTimelineExcel(params: {
  user: AuthUser
  date: string
  day: TimelineDayData
  comparisonRows: ComparisonRow[]
  plansForTomorrow: TomorrowPlan[]
}) {
  assertPermission(params.user, 'exports:use')
  const { date, day, comparisonRows, plansForTomorrow } = params
  const issues = day.tasks.flatMap((task) => collectTaskIssues(task).map((issue) => ({ task, issue })))
  const sheets = [
    { sheet: '老板汇总', data: buildBossSummarySheet(date, day, issues, plansForTomorrow) },
    { sheet: '今日实际记录', data: buildActualRecordsSheet(day.tasks, day.events) },
    { sheet: '明日计划', data: buildTomorrowPlanSheet(day.tomorrowPlans, day.tomorrowEvents) },
    { sheet: '计划与实际对照', data: buildComparisonSheet(comparisonRows) },
    { sheet: '问题记录', data: buildIssueSheet(issues) },
    { sheet: '人员工时统计', data: buildWorkHoursSheet(day.tasks) },
  ]

  await writeXlsxFile(sheets).toFile(`直播间运营复盘_${date}.xlsx`)
}

function row(values: CellValue[]): SheetRow {
  return values.map((value) => ({ value: value ?? '', wrap: true }) satisfies StyledCell)
}

function header(values: string[]): SheetRow {
  return values.map((value) => ({ value, ...headerStyle }) satisfies StyledCell)
}

function buildBossSummarySheet(
  date: string,
  day: TimelineDayData,
  issues: Array<{ task: TimelineTask; issue: TaskIssue }>,
  plansForTomorrow: TomorrowPlan[],
): SheetRow[] {
  const completed = day.tasks
    .filter((task) => task.status === '绿')
    .map((task) => `${task.role} ${task.startTime}-${task.endTime} ${task.content}`)
    .join('\n')

  return [
    header(['项目', '内容']),
    row(['日期', date]),
    row(['工作时间范围', `${day.settings.workStartTime}-${day.settings.actualEndTime}（标准结束 ${day.settings.standardEndTime}）`]),
    row(['今日主要工作事件', day.events.map((event) => `${event.startTime}-${event.endTime} ${eventLabel(event)}`).join('\n')]),
    row(['今日完成事项总结', completed || '暂无已完成记录']),
    row(['主要问题', issues.map(({ task, issue }) => `${task.role} ${task.startTime}-${task.endTime}：${issue.problem}`).join('\n') || '暂无问题记录']),
    row(['已采取解决方案', issues.map(({ task, issue }) => `${task.role}：${issue.solution || '待补充'}`).join('\n') || '暂无']),
    row(['明日重点安排', plansForTomorrow.map((plan) => `${plan.startTime}-${plan.endTime} ${plan.role} ${plan.content}`).join('\n') || `暂无 ${addDays(date, 1)} 计划`]),
  ]
}

function buildActualRecordsSheet(tasks: TimelineTask[], events: WorkEvent[]): SheetRow[] {
  return [
    header(['日期', '开始时间', '结束时间', '岗位', '人员姓名', '工作内容', '关联工作事件', '完成状态', '遇到的问题', '解决方案', '备注', '来源计划 id']),
    ...tasks.map((task) =>
      row([
        task.date,
        task.startTime,
        task.endTime,
        task.role,
        task.personName,
        task.content,
        eventLabel(getWorkEventById(events, task.workEventId)),
        task.status,
        taskIssueSummary(task, 'problem'),
        taskIssueSummary(task, 'solution'),
        task.note,
        task.sourcePlanId,
      ]),
    ),
  ]
}

function buildTomorrowPlanSheet(plans: TomorrowPlan[], events: WorkEvent[]): SheetRow[] {
  return [
    header(['id', '计划日期', '开始时间', '结束时间', '岗位', '负责人', '关联工作事件', '计划内容', '优先级', '预计结果', '备注']),
    ...plans.map((plan) =>
      row([
        plan.id,
        plan.planDate,
        plan.startTime,
        plan.endTime,
        plan.role,
        plan.owner,
        eventLabel(getWorkEventById(events, plan.workEventId)),
        plan.content,
        plan.priority,
        plan.expectedResult,
        plan.note,
      ]),
    ),
  ]
}

function buildComparisonSheet(rows: ComparisonRow[]): SheetRow[] {
  return [
    header(['计划时间段', '计划岗位', '计划内容', '实际时间段', '实际岗位', '实际工作内容', '偏差状态', '偏差原因', '明日优化建议']),
    ...rows.map((item) =>
      row([
        item.plan ? `${item.plan.startTime}-${item.plan.endTime}` : '',
        item.plan?.role ?? '',
        item.plan?.content ?? '',
        item.actual ? `${item.actual.startTime}-${item.actual.endTime}` : '',
        item.actual?.role ?? '',
        item.actual?.content ?? '',
        item.deviationStatus,
        item.deviationReason,
        item.tomorrowSuggestion,
      ]),
    ),
  ]
}

function buildIssueSheet(issues: Array<{ task: TimelineTask; issue: TaskIssue }>): SheetRow[] {
  return [
    header(['岗位', '时间段', '问题', '解决方案', '备注']),
    ...issues.map(({ task, issue }) => row([task.role, `${task.startTime}-${task.endTime}`, issue.problem, issue.solution, task.note])),
  ]
}

function buildWorkHoursSheet(tasks: TimelineTask[]): SheetRow[] {
  const totals = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.role] = (acc[task.role] ?? 0) + calculateTaskMinutes(task)
    return acc
  }, {})

  return [
    header(['岗位', '记录总时长（分钟）', '记录总时长']),
    ...Object.entries(totals).map(([role, minutes]) => row([role, minutes, formatDuration(minutes)])),
  ]
}
