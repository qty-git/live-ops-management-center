import { useEffect, useMemo, useRef, useState } from 'react'
import { requirePermission } from '../../auth/accessControl'
import { hasPermission } from '../../auth/permissions'
import type { AuthUser } from '../../auth/types'
import { ComparisonTable } from '../components/ComparisonTable'
import { EditCenterPanel } from '../components/EditCenterPanel'
import { EventEditor } from '../components/EventEditor'
import { IssueList } from '../components/IssueList'
import { PlanEditor } from '../components/PlanEditor'
import { PlanTimelineBoard } from '../components/PlanTimelineBoard'
import { TaskEditor } from '../components/TaskEditor'
import { TemplateApplyModal, type TemplateApplyDraft } from '../components/TemplateApplyModal'
import { TimelineBoard } from '../components/TimelineBoard'
import { TimeRangeSlider } from '../components/TimeRangeSlider'
import { TopControls } from '../components/TopControls'
import { loadTimelineStoreFromCloud, saveTimelineStoreToCloud } from '../cloudStorage'
import { exportTimelineExcel } from '../exportExcel'
import { ensureDay, loadTimelineStore, saveDay, saveTimelineStore } from '../storage'
import type {
  ComparisonNote,
  DayPlanTemplate,
  TeamPerson,
  TeamRole,
  TimelineDayData,
  TimelineSettings,
  TimelineStore,
  TimelineTask,
  TomorrowPlan,
  WorkEvent,
  WorkTemplate,
} from '../types'
import { getTaskEditAccess, isOwnTask, restrictTaskUpdate } from '../taskAccess'
import {
  addDays,
  buildComparisonRows,
  clamp,
  createId,
  ensureEndAfterStart,
  minutesFromTime,
  timeFromMinutes,
  todayISO,
} from '../utils'

export type TimelinePageMode = 'dashboard' | 'edit'
type EventEditScope = 'actual' | 'plan'
type EditingEventRef = { id: string; scope: EventEditScope }
type TemplateApplyRequest = { time: string; scope: EventEditScope }

const defaultPeopleByRole: Record<TeamRole, string> = {
  主播: '主播 A',
  中控: '中控 A',
  场控: '场控 A',
  运营: '运营 A',
  摄影: '摄影 A',
}

interface TimelinePageProps {
  mode: TimelinePageMode
  currentUser: AuthUser
}

export function TimelinePage({ mode, currentUser }: TimelinePageProps) {
  const initialDate = todayISO()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [store, setStore] = useState<TimelineStore>(() => loadTimelineStore())
  const [saveStatus, setSaveStatus] = useState('已加载本地数据，正在连接云端')
  const [editingEventRef, setEditingEventRef] = useState<EditingEventRef | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [templateApplyRequest, setTemplateApplyRequest] = useState<TemplateApplyRequest | null>(null)
  const [selectedPlanTemplateId, setSelectedPlanTemplateId] = useState('')
  const [permissionMessage, setPermissionMessage] = useState('')
  const cloudReadyRef = useRef(false)
  const cloudSaveTimerRef = useRef<number | null>(null)

  const day = useMemo(() => ensureDay(store, selectedDate), [selectedDate, store])
  const tomorrowDate = addDays(selectedDate, 1)
  const previousDay = store.days[addDays(selectedDate, -1)]
  const tomorrowPlans = useMemo(() => day.tomorrowPlans.filter((plan) => plan.planDate === tomorrowDate), [day.tomorrowPlans, tomorrowDate])
  const plansForToday = useMemo(
    () => previousDay?.tomorrowPlans.filter((plan) => plan.planDate === selectedDate) ?? [],
    [previousDay?.tomorrowPlans, selectedDate],
  )
  const comparisonRows = useMemo(
    () => buildComparisonRows(plansForToday, day.tasks, day.comparisonNotes),
    [day.comparisonNotes, day.tasks, plansForToday],
  )
  const hasRecordOnDate = (date: string) => {
    const dateDay = store.days[date]
    return dateDay ? hasDayRecords(dateDay) : false
  }
  const editingEvent =
    editingEventRef?.scope === 'plan'
      ? day.tomorrowEvents.find((event) => event.id === editingEventRef.id)
      : day.events.find((event) => event.id === editingEventRef?.id)
  const editingTask = day.tasks.find((task) => task.id === editingTaskId)
  const editingTaskAccess = editingTask ? getTaskEditAccess(editingTask, currentUser, store.people) : null
  const editingPlan = day.tomorrowPlans.find((plan) => plan.id === editingPlanId)
  const peopleOptionsByRole = useMemo(() => buildPeopleOptionsByRole(day, store.people), [day, store.people])
  const selectedPlanTemplate = useMemo(
    () => store.dayPlanTemplates.find((template) => template.id === selectedPlanTemplateId) ?? store.dayPlanTemplates[0],
    [selectedPlanTemplateId, store.dayPlanTemplates],
  )
  const canManageTimeline = hasPermission(currentUser, 'timeline:manage')
  const canEditMembers = hasPermission(currentUser, 'people:manage')
  const canEditEventTemplates = hasPermission(currentUser, 'event_templates:edit')
  const canEditDayTemplates = hasPermission(currentUser, 'day_plan_templates:edit')
  const canExport = hasPermission(currentUser, 'exports:use')
  const shouldHighlightOwnTasks = hasPermission(currentUser, 'task:highlight_own')
  const taskBelongsToCurrentUser = (task: TimelineTask) => shouldHighlightOwnTasks && isOwnTask(task, currentUser, store.people)

  useEffect(() => {
    saveTimelineStore(store)
  }, [store])

  useEffect(() => {
    let active = true

    loadTimelineStoreFromCloud()
      .then((cloudStore) => {
        if (!active) return

        cloudReadyRef.current = true
        if (cloudStore) {
          setStore(cloudStore)
          setSaveStatus('已加载云端数据')
          return
        }

        saveTimelineStoreToCloud(store)
          .then(() => {
            if (active) setSaveStatus('已初始化云端数据')
          })
          .catch(() => {
            if (active) setSaveStatus('云端初始化失败，已保留本地数据')
          })
      })
      .catch(() => {
        if (!active) return
        cloudReadyRef.current = false
        setSaveStatus('云端未连接，继续使用本地数据')
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!cloudReadyRef.current) return

    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current)
    }

    cloudSaveTimerRef.current = window.setTimeout(() => {
      saveTimelineStoreToCloud(store)
        .then(() => {
          setSaveStatus(`已同步云端 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`)
        })
        .catch(() => {
          setSaveStatus('云端同步失败，已保存到本地')
        })
    }, 800)

    return () => {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current)
      }
    }
  }, [store])

  useEffect(() => {
    if (!canManageTimeline) return
    const currentDay = ensureDay(store, selectedDate)
    const hydrated = applyYesterdayPlanToDay(currentDay, selectedDate, store.days[addDays(selectedDate, -1)])
    if (!hydrated.changed) return

    const timer = window.setTimeout(() => {
      setStore((current) => saveDay(current, selectedDate, hydrated.day))
      setSaveStatus(`已自动填入昨日计划 ${hydrated.addedTasks} 条`)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [canManageTimeline, selectedDate, store])

  const updateDay = (updater: (day: TimelineDayData) => TimelineDayData) => {
    setStore((current) => {
      const currentDay = ensureDay(current, selectedDate)
      return saveDay(current, selectedDate, updater(currentDay))
    })
    setSaveStatus(`已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`)
  }

  const updateSettings = (settings: TimelineSettings) => {
    if (settings.date !== selectedDate) {
      if (settings.date > todayISO()) {
        setSaveStatus('不能选择未来日期')
        return
      }
      setSelectedDate(settings.date)
      setSaveStatus(`已切换到 ${settings.date}`)
      return
    }

    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return

    updateDay((current) => ({
      ...current,
      settings: normalizeSettings(settings),
    }))
  }

  const updateRange = (range: { viewStartTime: string; viewEndTime: string }) => {
    updateDay((current) => ({
      ...current,
      settings: normalizeSettings({
        ...current.settings,
        ...range,
      }),
    }))
  }

  const panRange = (deltaMinutes: number) => {
    updateDay((current) => {
      const workStart = minutesFromTime(current.settings.workStartTime)
      const actualEnd = Math.max(workStart + 30, minutesFromTime(current.settings.actualEndTime))
      const viewStart = minutesFromTime(current.settings.viewStartTime)
      const viewEnd = minutesFromTime(current.settings.viewEndTime)
      const duration = viewEnd - viewStart
      const nextStart = clamp(viewStart + deltaMinutes, workStart, actualEnd - duration)

      return {
        ...current,
        settings: normalizeSettings({
          ...current.settings,
          viewStartTime: timeFromMinutes(nextStart),
          viewEndTime: timeFromMinutes(nextStart + duration),
        }),
      }
    })
  }

  const updatePeople = (people: TeamPerson[]) => {
    if (!requirePermission(currentUser, 'people:manage', setPermissionMessage)) return
    setStore((current) => ({
      ...current,
      people,
    }))
    setSaveStatus(`已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`)
  }

  const updateWorkTemplates = (workTemplates: WorkTemplate[]) => {
    if (!requirePermission(currentUser, 'event_templates:edit', setPermissionMessage)) return
    setStore((current) => ({
      ...current,
      workTemplates,
    }))
    setSaveStatus(`已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`)
  }

  const updateDayPlanTemplates = (dayPlanTemplates: DayPlanTemplate[]) => {
    if (!requirePermission(currentUser, 'day_plan_templates:edit', setPermissionMessage)) return
    setStore((current) => ({
      ...current,
      dayPlanTemplates,
    }))
    setSaveStatus(`已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`)
  }

  const applyDayPlanTemplateToTomorrow = (template: DayPlanTemplate) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    if ((day.tomorrowEvents.length > 0 || tomorrowPlans.length > 0) && !window.confirm('套用整日模板会替换当前次日计划事件和计划任务，确认继续？')) {
      return
    }

    const eventIdMap = new Map<string, string>()
    const nextEvents: WorkEvent[] = template.events.map((event) => {
      const eventId = createId('event')
      eventIdMap.set(event.id, eventId)
      return {
        ...event,
        id: eventId,
        date: tomorrowDate,
      }
    })
    const nextPlans: TomorrowPlan[] = template.plans.map((plan) => ({
      ...plan,
      id: createId('plan'),
      planDate: tomorrowDate,
      workEventId: eventIdMap.get(plan.workEventId) ?? '',
    }))

    updateDay((current) => ({
      ...current,
      tomorrowEvents: nextEvents,
      tomorrowPlans: [...current.tomorrowPlans.filter((plan) => plan.planDate !== tomorrowDate), ...nextPlans],
    }))
    setSaveStatus(`已复用整日计划模板：${template.name}`)
  }

  const requestTemplateAt = (time: string, scope: EventEditScope) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    if (store.workTemplates.length === 0) {
      createEventAt(time, scope)
      return
    }
    setTemplateApplyRequest({ time, scope })
  }

  const applyTemplateDraftAt = (draft: TemplateApplyDraft, request: TemplateApplyRequest) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    const enabledStages = draft.stages.filter((stage) => stage.enabled)
    const stageEventId = new Map<string, string>()
    const eventDate = request.scope === 'actual' ? selectedDate : tomorrowDate
    const nextEvents: WorkEvent[] = enabledStages.map((stage) => {
      const eventId = createId('event')
      stageEventId.set(stage.id, eventId)
      return {
        id: eventId,
        date: eventDate,
        name: stage.eventName?.trim() || draft.name,
        phase: stage.phase,
        startTime: stage.startTime,
        endTime: stage.endTime,
        note: stage.note || draft.note,
      }
    })

    const enabledAssignments = draft.assignments.filter((assignment) => stageEventId.has(assignment.stageId))

    updateDay((current) => {
      if (request.scope === 'plan') {
        const nextPlans: TomorrowPlan[] = enabledAssignments.map((assignment) => {
          const event = nextEvents.find((item) => item.id === stageEventId.get(assignment.stageId))
          return {
            id: createId('plan'),
            planDate: tomorrowDate,
            startTime: event?.startTime ?? request.time,
            endTime: event?.endTime ?? ensureEndAfterStart(request.time, timeFromMinutes(minutesFromTime(request.time) + 60)),
            role: assignment.role,
            owner: assignment.owner,
            workEventId: event?.id ?? '',
            content: assignment.content,
            priority: '中',
            expectedResult: '',
            note: assignment.note,
          }
        })

        return {
          ...current,
          tomorrowEvents: [...current.tomorrowEvents, ...nextEvents],
          tomorrowPlans: [...current.tomorrowPlans, ...nextPlans],
        }
      }

      const nextTasks: TimelineTask[] = enabledAssignments.map((assignment) => {
        const event = nextEvents.find((item) => item.id === stageEventId.get(assignment.stageId))
        return {
          id: createId('task'),
          date: selectedDate,
          role: assignment.role,
          personName: assignment.owner,
          startTime: event?.startTime ?? request.time,
          endTime: event?.endTime ?? ensureEndAfterStart(request.time, timeFromMinutes(minutesFromTime(request.time) + 60)),
          content: assignment.content,
          workEventId: event?.id ?? '',
          status: '绿',
          problem: '',
          solution: '',
          issues: [],
          note: assignment.note,
          sourcePlanId: '',
        }
      })

      return {
        ...current,
        events: [...current.events, ...nextEvents],
        tasks: [...current.tasks, ...nextTasks],
      }
    })
    setTemplateApplyRequest(null)
    setSaveStatus(`已生成 ${draft.name}：${nextEvents.length} 个阶段，${enabledAssignments.length} 条人员任务`)
  }

  const upsertEvent = (event: WorkEvent, scope: EventEditScope = editingEventRef?.scope ?? 'actual') => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    updateDay((current) => ({
      ...current,
      events:
        scope === 'actual'
          ? current.events.some((item) => item.id === event.id)
            ? current.events.map((item) => (item.id === event.id ? event : item))
            : [...current.events, event]
          : current.events,
      tomorrowEvents:
        scope === 'plan'
          ? current.tomorrowEvents.some((item) => item.id === event.id)
            ? current.tomorrowEvents.map((item) => (item.id === event.id ? event : item))
            : [...current.tomorrowEvents, event]
          : current.tomorrowEvents,
    }))
  }

  const deleteEvent = (eventId: string, scope: EventEditScope = editingEventRef?.scope ?? 'actual') => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    updateDay((current) => ({
      ...current,
      events: scope === 'actual' ? current.events.filter((event) => event.id !== eventId) : current.events,
      tomorrowEvents: scope === 'plan' ? current.tomorrowEvents.filter((event) => event.id !== eventId) : current.tomorrowEvents,
      tasks: scope === 'actual' ? current.tasks.filter((task) => task.workEventId !== eventId) : current.tasks,
      tomorrowPlans: scope === 'plan' ? current.tomorrowPlans.filter((plan) => plan.workEventId !== eventId) : current.tomorrowPlans,
    }))
    setEditingEventRef(null)
  }

  const createEventAt = (time: string, scope: EventEditScope = 'actual') => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    const event = createEvent(selectedDate, time, day.settings.actualEndTime)
    const scopedEvent = scope === 'plan' ? { ...event, date: tomorrowDate } : event
    upsertEvent(scopedEvent, scope)
    setEditingEventRef({ id: scopedEvent.id, scope })
  }

  const upsertTask = (task: TimelineTask) => {
    const original = day.tasks.find((item) => item.id === task.id)
    if (!original) {
      if (!canManageTimeline) {
        setPermissionMessage('你没有权限执行此操作')
        return
      }
      updateDay((current) => ({ ...current, tasks: [...current.tasks, task] }))
      return
    }

    const access = getTaskEditAccess(original, currentUser, store.people)
    if (!access.canEditStructure && !access.canEditFeedback) {
      setPermissionMessage('你没有权限执行此操作')
      return
    }
    const restricted = restrictTaskUpdate(original, task, access)
    if (restricted.denied) setPermissionMessage('你没有权限执行此操作')
    updateDay((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? restricted.task : item)),
    }))
  }

  const deleteTask = (taskId: string) => {
    const task = day.tasks.find((item) => item.id === taskId)
    if (!task || !getTaskEditAccess(task, currentUser, store.people).canDelete) {
      setPermissionMessage('你没有权限执行此操作')
      return
    }
    updateDay((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }))
    setEditingTaskId(null)
  }

  const createTaskAt = (role: TeamRole, time: string) => {
    if (!canManageTimeline) {
      setPermissionMessage('你没有权限执行此操作')
      return
    }
    const event = findEventAt(day.events, time) ?? day.events[0]
    const task = createTask(selectedDate, role, event?.startTime ?? time, event?.endTime ?? day.settings.actualEndTime, event?.id ?? '')
    upsertTask(task)
    setEditingTaskId(task.id)
  }

  const createTaskForEvent = (event: WorkEvent) => {
    const task = createTask(selectedDate, '运营', event.startTime, event.endTime, event.id)
    upsertTask(task)
  }

  const upsertPlan = (plan: TomorrowPlan) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    updateDay((current) => ({
      ...current,
      tomorrowPlans: current.tomorrowPlans.some((item) => item.id === plan.id)
        ? current.tomorrowPlans.map((item) => (item.id === plan.id ? plan : item))
        : [...current.tomorrowPlans, plan],
    }))
  }

  const createPlanAt = (role: TeamRole, time: string) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    const event = findEventAt(day.tomorrowEvents, time)
    const plan = createPlan(role, event?.startTime ?? time, event?.endTime ?? day.settings.actualEndTime, event?.id ?? '', tomorrowDate)
    upsertPlan(plan)
    setEditingPlanId(plan.id)
  }

  const createPlanForEvent = (event: WorkEvent) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    const plan = createPlan('运营', event.startTime, event.endTime, event.id, tomorrowDate)
    upsertPlan(plan)
  }

  const deletePlan = (planId: string) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    updateDay((current) => ({
      ...current,
      tomorrowPlans: current.tomorrowPlans.filter((plan) => plan.id !== planId),
    }))
    setEditingPlanId(null)
  }

  const copyYesterdayPlan = () => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    const hydrated = applyYesterdayPlanToDay(day, selectedDate, previousDay)

    if (!hydrated.changed) {
      setSaveStatus(previousDay ? '昨日计划已全部填入今日实际' : '没有找到昨日计划')
      return
    }

    updateDay(() => hydrated.day)
    setSaveStatus(`已填入 ${hydrated.addedTasks} 条昨日计划`)
  }

  const updateComparisonNote = (comparisonKey: string, patch: { deviationReason?: string; tomorrowSuggestion?: string }) => {
    if (!requirePermission(currentUser, 'timeline:manage', setPermissionMessage)) return
    updateDay((current) => {
      const existing = current.comparisonNotes.find((note) => note.comparisonKey === comparisonKey)
      const nextNote: ComparisonNote = {
        id: existing?.id ?? createId('comparison'),
        date: selectedDate,
        comparisonKey,
        deviationReason: patch.deviationReason ?? existing?.deviationReason ?? '',
        tomorrowSuggestion: patch.tomorrowSuggestion ?? existing?.tomorrowSuggestion ?? '',
      }

      return {
        ...current,
        comparisonNotes: existing
          ? current.comparisonNotes.map((note) => (note.comparisonKey === comparisonKey ? nextNote : note))
          : [...current.comparisonNotes, nextNote],
      }
    })
  }

  const exportExcel = async () => {
    if (!requirePermission(currentUser, 'exports:use', setPermissionMessage)) return
    try {
      await exportTimelineExcel({
        user: currentUser,
        date: selectedDate,
        day,
        comparisonRows,
        plansForTomorrow: tomorrowPlans,
      })
    } catch (error) {
      setPermissionMessage(error instanceof Error ? error.message : '导出失败')
    }
  }

  return (
    <main className="timeline-page">
      {permissionMessage ? (
        <div className="page-notice page-notice-error timeline-permission-notice" role="alert">
          <span>{permissionMessage}</span>
          <button type="button" onClick={() => setPermissionMessage('')}>关闭</button>
        </div>
      ) : null}
      {mode === 'dashboard' ? (
        <>
          <TopControls
            settings={day.settings}
            saveStatus={saveStatus}
            hasRecordOnDate={hasRecordOnDate}
            onSettingsChange={updateSettings}
            onCopyYesterdayPlan={copyYesterdayPlan}
            onExportExcel={exportExcel}
            canManageTimeline={canManageTimeline}
            canExport={canExport}
          />

          <div className="shared-range-panel">
            <TimeRangeSlider
              workStartTime={day.settings.workStartTime}
              actualEndTime={day.settings.actualEndTime}
              viewStartTime={day.settings.viewStartTime}
              viewEndTime={day.settings.viewEndTime}
              onChange={updateRange}
            />
          </div>

          <TimelineDisplaySection title="今日时间轴" description="当天实际推进情况，点击卡片可快速编辑，双击空白处可新增任务或工作事件。">
            <TimelineBoard
              events={day.events}
              tasks={day.tasks}
              viewStartTime={day.settings.viewStartTime}
              viewEndTime={day.settings.viewEndTime}
              date={selectedDate}
              onEditEvent={(event) => setEditingEventRef({ id: event.id, scope: 'actual' })}
              onCreateEvent={(time) => requestTemplateAt(time, 'actual')}
              onEditTask={(task) => setEditingTaskId(task.id)}
              onCreateTask={createTaskAt}
              onDeleteTask={(task) => deleteTask(task.id)}
              onPanViewRange={panRange}
              structureReadOnly={!canManageTimeline}
              isOwnTask={taskBelongsToCurrentUser}
            />
          </TimelineDisplaySection>

          <TimelineDisplaySection title="次日计划时间轴" description="明日计划以时间轴模板展示，点击计划卡片可调整具体安排。">
            <div className="template-reuse-bar">
              <div>
                <strong>复用整日计划模板</strong>
                <span>选择编辑中心保存的整日计划，直接覆盖当前次日计划事件和人员任务。</span>
              </div>
              <select
                value={selectedPlanTemplate?.id ?? ''}
                onChange={(event) => setSelectedPlanTemplateId(event.target.value)}
                disabled={store.dayPlanTemplates.length === 0 || !canManageTimeline}
                aria-label="选择整日计划模板"
              >
                {store.dayPlanTemplates.length > 0 ? (
                  store.dayPlanTemplates.map((template) => (
                    <option value={template.id} key={template.id}>
                      {template.name}
                    </option>
                  ))
                ) : (
                  <option value="">暂无模板</option>
                )}
              </select>
              <button className="primary-button" type="button" disabled={!selectedPlanTemplate || !canManageTimeline} onClick={() => selectedPlanTemplate && applyDayPlanTemplateToTomorrow(selectedPlanTemplate)}>
                复用并覆盖当前次日计划
              </button>
            </div>
            <PlanTimelineBoard
              plans={tomorrowPlans}
              events={day.tomorrowEvents}
              viewStartTime={day.settings.viewStartTime}
              viewEndTime={day.settings.viewEndTime}
              onEditPlan={(plan) => setEditingPlanId(plan.id)}
              onDeletePlan={(plan) => deletePlan(plan.id)}
              onCreatePlan={createPlanAt}
              onEditEvent={(event) => setEditingEventRef({ id: event.id, scope: 'plan' })}
              onCreateEvent={(time) => requestTemplateAt(time, 'plan')}
              onPanViewRange={panRange}
              structureReadOnly={!canManageTimeline}
            />
          </TimelineDisplaySection>

          <ComparisonTable rows={comparisonRows} onNoteChange={updateComparisonNote} canEdit={canManageTimeline} />

          <IssueList tasks={day.tasks} onOpenTask={(task) => setEditingTaskId(task.id)} />
        </>
      ) : (
        <EditCenterPanel
          people={store.people}
          templates={store.workTemplates}
          dayPlanTemplates={store.dayPlanTemplates}
          peopleOptionsByRole={peopleOptionsByRole}
          canEditMembers={canEditMembers}
          canEditEventTemplates={canEditEventTemplates}
          canEditDayTemplates={canEditDayTemplates}
          onPeopleChange={updatePeople}
          onTemplatesChange={updateWorkTemplates}
          onDayPlanTemplatesChange={updateDayPlanTemplates}
          onPermissionDenied={setPermissionMessage}
        />
      )}

      {editingEvent && canManageTimeline ? (
        <EventEditor
          event={editingEvent}
          scope={editingEventRef?.scope ?? 'actual'}
          linkedTasks={editingEventRef?.scope === 'actual' ? day.tasks.filter((task) => task.workEventId === editingEvent.id) : []}
          linkedPlans={editingEventRef?.scope === 'plan' ? day.tomorrowPlans.filter((plan) => plan.workEventId === editingEvent.id) : []}
          peopleOptionsByRole={peopleOptionsByRole}
          onSave={(event) => upsertEvent(event, editingEventRef?.scope ?? 'actual')}
          onDelete={(eventId) => deleteEvent(eventId, editingEventRef?.scope ?? 'actual')}
          onAddTask={() => createTaskForEvent(editingEvent)}
          onSaveTask={upsertTask}
          onDeleteTask={deleteTask}
          onAddPlan={() => createPlanForEvent(editingEvent)}
          onSavePlan={upsertPlan}
          onDeletePlan={deletePlan}
          onClose={() => setEditingEventRef(null)}
        />
      ) : null}
      {editingTask ? (
        <TaskEditor
          task={editingTask}
          events={day.events}
          peopleOptionsByRole={peopleOptionsByRole}
          access={editingTaskAccess ?? getTaskEditAccess(editingTask, currentUser, store.people)}
          onSave={upsertTask}
          onDelete={deleteTask}
          onClose={() => setEditingTaskId(null)}
        />
      ) : null}
      {editingPlan && canManageTimeline ? (
        <PlanEditor
          plan={editingPlan}
          events={day.tomorrowEvents}
          peopleOptionsByRole={peopleOptionsByRole}
          onSave={upsertPlan}
          onDelete={deletePlan}
          onClose={() => setEditingPlanId(null)}
        />
      ) : null}
      {templateApplyRequest && canManageTimeline ? (
        <TemplateApplyModal
          title={templateApplyRequest.scope === 'actual' ? '从模板新增今日大事件' : '从模板新增次日计划大事件'}
          templates={store.workTemplates}
          onApply={(draft) => applyTemplateDraftAt(draft, templateApplyRequest)}
          onClose={() => setTemplateApplyRequest(null)}
        />
      ) : null}
    </main>
  )
}

function hasDayRecords(day: TimelineDayData): boolean {
  return (
    day.events.length > 0 ||
    day.tomorrowEvents.length > 0 ||
    day.tasks.length > 0 ||
    day.tomorrowPlans.length > 0 ||
    day.comparisonNotes.some((note) => note.deviationReason.trim() || note.tomorrowSuggestion.trim())
  )
}

function normalizeSettings(settings: TimelineSettings): TimelineSettings {
  const workStart = minutesFromTime(settings.workStartTime)
  const actualEnd = Math.max(workStart + 30, minutesFromTime(settings.actualEndTime))
  const viewStart = clamp(minutesFromTime(settings.viewStartTime), workStart, actualEnd - 15)
  const viewEnd = clamp(minutesFromTime(settings.viewEndTime), viewStart + 15, actualEnd)

  return {
    ...settings,
    actualEndTime: timeFromMinutes(actualEnd),
    viewStartTime: timeFromMinutes(viewStart),
    viewEndTime: timeFromMinutes(viewEnd),
  }
}

function applyYesterdayPlanToDay(day: TimelineDayData, date: string, previousDay?: TimelineDayData) {
  if (!previousDay) {
    return { day, changed: false, addedTasks: 0, addedEvents: 0 }
  }

  const plansForDate = previousDay.tomorrowPlans.filter((plan) => plan.planDate === date)
  const planEventsForDate = previousDay.tomorrowEvents.map((event) => ({
    ...event,
    date,
  }))

  if (plansForDate.length === 0) {
    return { day, changed: false, addedTasks: 0, addedEvents: 0 }
  }

  const existingEventIds = new Set(day.events.map((event) => event.id))
  const eventsToAdd = planEventsForDate.filter((event) => !existingEventIds.has(event.id))
  const existingSourcePlanIds = new Set(day.tasks.map((task) => task.sourcePlanId).filter(Boolean))
  const plansToAdd = plansForDate.filter((plan) => !existingSourcePlanIds.has(plan.id))

  if (eventsToAdd.length === 0 && plansToAdd.length === 0) {
    return { day, changed: false, addedTasks: 0, addedEvents: 0 }
  }

  return {
    day: {
      ...day,
      events: [...day.events, ...eventsToAdd],
      tasks: [
        ...day.tasks,
        ...plansToAdd.map((plan) => ({
          id: createId('task'),
          date,
          role: plan.role,
          personName: plan.owner,
          startTime: plan.startTime,
          endTime: plan.endTime,
          content: plan.content,
          workEventId: plan.workEventId,
          status: '绿' as const,
          problem: '',
          solution: '',
          issues: [],
          note: plan.note,
          sourcePlanId: plan.id,
        })),
      ],
    },
    changed: true,
    addedTasks: plansToAdd.length,
    addedEvents: eventsToAdd.length,
  }
}

function createEvent(date: string, startTime: string, latestEndTime: string): WorkEvent {
  const start = minutesFromTime(startTime)
  const latestEnd = minutesFromTime(latestEndTime)
  const end = timeFromMinutes(Math.min(latestEnd, start + 60))

  return {
    id: createId('event'),
    date,
    name: '直播',
    phase: '事前准备',
    startTime,
    endTime: ensureEndAfterStart(startTime, end),
    note: '',
  }
}

function createTask(date: string, role: TeamRole, startTime: string, latestEndTime: string, workEventId: string): TimelineTask {
  const start = minutesFromTime(startTime)
  const latestEnd = minutesFromTime(latestEndTime)
  const end = timeFromMinutes(Math.min(latestEnd, start + 30))

  return {
    id: createId('task'),
    date,
    role,
    personName: defaultPeopleByRole[role],
    startTime,
    endTime: ensureEndAfterStart(startTime, end),
    content: '填写工作内容',
    workEventId,
    status: '绿',
    problem: '',
    solution: '',
    issues: [],
    note: '',
    sourcePlanId: '',
  }
}

function createPlan(
  role: TeamRole,
  startTime: string,
  latestEndTime: string,
  workEventId: string,
  planDate: string,
): TomorrowPlan {
  const start = minutesFromTime(startTime)
  const latestEnd = minutesFromTime(latestEndTime)
  const endTime = ensureEndAfterStart(startTime, timeFromMinutes(Math.min(latestEnd, start + 60)))

  return {
    id: createId('plan'),
    planDate,
    startTime,
    endTime,
    role,
    owner: defaultPeopleByRole[role],
    workEventId,
    content: '填写计划内容',
    priority: '中',
    expectedResult: '',
    note: '',
  }
}

function findEventAt(events: WorkEvent[], time: string): WorkEvent | undefined {
  const minutes = minutesFromTime(time)
  return events.find((event) => minutesFromTime(event.startTime) <= minutes && minutes < minutesFromTime(event.endTime))
}

function buildPeopleOptionsByRole(day: TimelineDayData, peopleConfig: TeamPerson[]): Record<TeamRole, string[]> {
  return (Object.keys(defaultPeopleByRole) as TeamRole[]).reduce(
    (acc, role) => {
      const configuredPeople = peopleConfig
        .filter((person) => person.role === role && person.name.trim())
        .map((person) => person.name.trim())
        .filter((name) => name !== defaultPeopleByRole[role])
      const people = new Set<string>(configuredPeople)
      day.tasks.filter((task) => task.role === role && task.personName.trim()).forEach((task) => people.add(task.personName.trim()))
      day.tomorrowPlans.filter((plan) => plan.role === role && plan.owner.trim()).forEach((plan) => people.add(plan.owner.trim()))
      if (people.size === 0) {
        people.add(defaultPeopleByRole[role])
      }
      acc[role] = [...people]
      return acc
    },
    {} as Record<TeamRole, string[]>,
  )
}

function TimelineDisplaySection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="data-section timeline-display-section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
