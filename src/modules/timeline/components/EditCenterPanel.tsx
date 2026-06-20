import { Plus, Search, Trash2, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type {
  DayPlanTemplate,
  DayPlanTemplateEvent,
  DayPlanTemplatePlan,
  TeamPerson,
  TeamRole,
  TimelineTask,
  WorkEvent,
  WorkTemplate,
  WorkTemplateAssignment,
  WorkTemplateStage,
} from '../types'
import { EVENT_PHASES, TEAM_ROLES } from '../types'
import { createId, ensureEndAfterStart, minutesFromTime, timeFromMinutes } from '../utils'
import { TimelineBoard } from './TimelineBoard'
import { TimeInput } from './TimeInput'

interface EditCenterPanelProps {
  people: TeamPerson[]
  templates: WorkTemplate[]
  dayPlanTemplates: DayPlanTemplate[]
  peopleOptionsByRole: Record<TeamRole, string[]>
  canEditMembers: boolean
  canEditEventTemplates: boolean
  canEditDayTemplates: boolean
  onPeopleChange: (people: TeamPerson[]) => void
  onTemplatesChange: (templates: WorkTemplate[]) => void
  onDayPlanTemplatesChange: (templates: DayPlanTemplate[]) => void
  onPermissionDenied: (message: string) => void
}

const getDefaultOwner = (role: TeamRole) => `${role} A`
const TEMPLATE_VIEW_START = '08:00'
const TEMPLATE_VIEW_END = '20:00'
const DEFAULT_ASSIGNMENT_ROLES: TeamRole[] = ['主播', '中控', '场控', '摄影', '运营']
const LEGACY_ASSIGNMENT_PLACEHOLDER = '填写负责人工作内容'

export function EditCenterPanel({
  people,
  templates,
  dayPlanTemplates,
  peopleOptionsByRole,
  canEditMembers,
  canEditEventTemplates,
  canEditDayTemplates,
  onPeopleChange,
  onTemplatesChange,
  onDayPlanTemplatesChange,
  onPermissionDenied,
}: EditCenterPanelProps) {
  const [activeEditPage, setActiveEditPage] = useState<'people' | 'eventTemplates' | 'dayPlanTemplates'>('people')
  const [personDrafts, setPersonDrafts] = useState<Record<TeamRole, string>>({
    主播: '',
    中控: '',
    场控: '',
    运营: '',
    摄影: '',
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [eventTemplateDrawerOpen, setEventTemplateDrawerOpen] = useState(false)
  const [drawerInitialTemplateId, setDrawerInitialTemplateId] = useState('')
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedDayPlanTemplateId, setSelectedDayPlanTemplateId] = useState(dayPlanTemplates[0]?.id ?? '')
  const [selectedDayPlanEventId, setSelectedDayPlanEventId] = useState('')
  const [insertEventTime, setInsertEventTime] = useState<string | null>(null)
  const seededDefaultAssignmentTemplateIds = useRef<Set<string>>(new Set())
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  )
  const selectedDayPlanTemplate = useMemo(
    () => dayPlanTemplates.find((template) => template.id === selectedDayPlanTemplateId) ?? dayPlanTemplates[0],
    [dayPlanTemplates, selectedDayPlanTemplateId],
  )
  const enabledStages = selectedTemplate?.stages.filter((stage) => stage.enabled) ?? []
  const activeStage = enabledStages.find((stage) => stage.id === selectedStageId) ?? enabledStages[0]
  const activeStageId = activeStage?.id ?? ''
  const visibleAssignments = selectedTemplate?.assignments.filter((assignment) => assignment.stageId === activeStageId) ?? []
  const activeDayPlanEvent = selectedDayPlanTemplate?.events.find((event) => event.id === selectedDayPlanEventId) ?? selectedDayPlanTemplate?.events[0]
  const visibleDayPlanPlans = selectedDayPlanTemplate?.plans.filter((plan) => plan.workEventId === activeDayPlanEvent?.id) ?? []
  const dayPlanTimeline = useMemo(() => buildDayPlanTemplateTimeline(selectedDayPlanTemplate), [selectedDayPlanTemplate])
  const visibleTemplates = useMemo(() => {
    const keyword = templateSearch.trim().toLowerCase()
    if (!keyword) return templates

    return templates.filter((template) => {
      const searchableText = [
        template.name,
        template.note,
        ...template.stages.map((stage) => `${stage.phase} ${stage.eventName ?? ''} ${stage.note}`),
        ...template.assignments.map((assignment) => `${assignment.role} ${assignment.owner} ${assignment.content} ${assignment.note}`),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(keyword)
    })
  }, [templateSearch, templates])

  const getPreferredOwner = useCallback(
    (role: TeamRole) =>
      peopleOptionsByRole[role]?.find((name) => {
        const trimmedName = name.trim()
        return trimmedName && trimmedName !== getDefaultOwner(role)
      })?.trim() ??
      peopleOptionsByRole[role]?.[0]?.trim() ??
      '',
    [peopleOptionsByRole],
  )

  const requireEdit = (allowed: boolean) => {
    if (allowed) return true
    onPermissionDenied('你没有权限执行此操作')
    return false
  }

  useEffect(() => {
    if (!canEditEventTemplates) return
    let hasChanged = false
    const nextTemplates = templates.map((template) => {
      let templateChanged = false
      const assignments = template.assignments.map((assignment) => {
        const preferredOwner = getPreferredOwner(assignment.role)
        const currentOwner = assignment.owner.trim()

        if (!preferredOwner || preferredOwner === currentOwner || (currentOwner && currentOwner !== getDefaultOwner(assignment.role))) {
          return assignment
        }

        templateChanged = true
        return { ...assignment, owner: preferredOwner }
      })

      if (!templateChanged) return template
      hasChanged = true
      return { ...template, assignments }
    })

    if (hasChanged) {
      onTemplatesChange(nextTemplates)
    }
  }, [canEditEventTemplates, getPreferredOwner, templates, onTemplatesChange])

  useEffect(() => {
    if (!canEditEventTemplates) return
    let hasChanged = false
    const nextTemplates = templates.map((template) => {
      const shouldSeedDefaults = !seededDefaultAssignmentTemplateIds.current.has(template.id)
      seededDefaultAssignmentTemplateIds.current.add(template.id)

      const cleanedAssignments = template.assignments.map((assignment) => {
        const content = cleanAssignmentContent(assignment.content)
        if (content === assignment.content) return assignment
        hasChanged = true
        return { ...assignment, content }
      })

      if (!shouldSeedDefaults) {
        return cleanedAssignments === template.assignments ? template : { ...template, assignments: cleanedAssignments }
      }

      const assignments = [...cleanedAssignments]
      template.stages.forEach((stage) => {
        const assignedRoles = new Set(assignments.filter((assignment) => assignment.stageId === stage.id).map((assignment) => assignment.role))
        DEFAULT_ASSIGNMENT_ROLES.forEach((role) => {
          if (assignedRoles.has(role)) return
          hasChanged = true
          assignedRoles.add(role)
          assignments.push(createDefaultAssignment(stage.id, role, getPreferredOwner))
        })
      })

      return hasChanged ? { ...template, assignments } : template
    })

    if (hasChanged) {
      onTemplatesChange(nextTemplates)
    }
  }, [canEditEventTemplates, getPreferredOwner, templates, onTemplatesChange])

  useEffect(() => {
    if (!eventTemplateDrawerOpen) return

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [eventTemplateDrawerOpen])

  const updateTemplate = (template: WorkTemplate) => {
    if (!requireEdit(canEditEventTemplates)) return
    onTemplatesChange(templates.map((item) => (item.id === template.id ? template : item)))
  }

  const selectTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)
    setSelectedTemplateId(templateId)
    setSelectedStageId(template?.stages.find((stage) => stage.enabled)?.id ?? '')
  }

  const openTemplateDrawer = () => {
    setDrawerInitialTemplateId(selectedTemplate?.id ?? '')
    setEventTemplateDrawerOpen(true)
  }

  const confirmTemplateDrawer = () => {
    setEventTemplateDrawerOpen(false)
  }

  const cancelTemplateDrawer = () => {
    if (drawerInitialTemplateId) {
      selectTemplate(drawerInitialTemplateId)
    }
    setEventTemplateDrawerOpen(false)
  }

  const addTemplate = () => {
    if (!requireEdit(canEditEventTemplates)) return
    const template = createBlankTemplate(getPreferredOwner)
    onTemplatesChange([...templates, template])
    setSelectedTemplateId(template.id)
    setSelectedStageId(template.stages.find((stage) => stage.enabled)?.id ?? '')
  }

  const deleteTemplate = (templateId: string) => {
    if (!requireEdit(canEditEventTemplates)) return
    if (templates.length <= 1) return
    if (!window.confirm('确认删除这个次日计划模板？')) return
    const nextTemplates = templates.filter((template) => template.id !== templateId)
    onTemplatesChange(nextTemplates)
    setSelectedTemplateId(nextTemplates[0]?.id ?? '')
  }

  const updateStage = (stage: WorkTemplateStage) => {
    if (!selectedTemplate) return
    updateTemplate({
      ...selectedTemplate,
      stages: selectedTemplate.stages.map((item) => (item.id === stage.id ? stage : item)),
    })
  }

  const updateDayPlanTemplate = (template: DayPlanTemplate) => {
    if (!requireEdit(canEditDayTemplates)) return
    onDayPlanTemplatesChange(dayPlanTemplates.map((item) => (item.id === template.id ? template : item)))
  }

  const addDayPlanTemplate = () => {
    if (!requireEdit(canEditDayTemplates)) return
    const template = createBlankDayPlanTemplate()
    onDayPlanTemplatesChange([...dayPlanTemplates, template])
    setSelectedDayPlanTemplateId(template.id)
  }

  const deleteDayPlanTemplate = (templateId: string) => {
    if (!requireEdit(canEditDayTemplates)) return
    if (!window.confirm('确认删除这个整日计划模板？')) return
    const nextTemplates = dayPlanTemplates.filter((template) => template.id !== templateId)
    onDayPlanTemplatesChange(nextTemplates)
    setSelectedDayPlanTemplateId(nextTemplates[0]?.id ?? '')
  }

  const insertSavedEvent = (sourceTemplate: WorkTemplate, startTime: string) => {
    if (!requireEdit(canEditDayTemplates)) return
    const enabledSourceStages = sourceTemplate.stages.filter((stage) => stage.enabled)
    if (enabledSourceStages.length === 0) return

    const targetTemplate = selectedDayPlanTemplate ?? createBlankDayPlanTemplate()
    const sourceStart = Math.min(...enabledSourceStages.map((stage) => minutesFromTime(stage.startTime)))
    const offset = minutesFromTime(startTime) - sourceStart
    const nextEventIdBySourceStage = new Map<string, string>()
    const nextEvents: DayPlanTemplateEvent[] = enabledSourceStages.map((stage) => {
      const nextEventId = createId('day-event')
      nextEventIdBySourceStage.set(stage.id, nextEventId)
      const nextStart = timeFromMinutes(minutesFromTime(stage.startTime) + offset)
      const nextEnd = timeFromMinutes(minutesFromTime(stage.endTime) + offset)

      return {
        id: nextEventId,
        name: stage.eventName?.trim() || sourceTemplate.name,
        phase: stage.phase,
        startTime: nextStart,
        endTime: ensureEndAfterStart(nextStart, nextEnd),
        note: stage.note,
      }
    })
    const nextPlans: DayPlanTemplatePlan[] = sourceTemplate.assignments
      .filter((assignment) => nextEventIdBySourceStage.has(assignment.stageId))
      .map((assignment) => ({
        id: createId('day-plan'),
        startTime: nextEvents.find((event) => event.id === nextEventIdBySourceStage.get(assignment.stageId))?.startTime ?? startTime,
        endTime: nextEvents.find((event) => event.id === nextEventIdBySourceStage.get(assignment.stageId))?.endTime ?? ensureEndAfterStart(startTime, timeFromMinutes(minutesFromTime(startTime) + 60)),
        role: assignment.role,
        owner: assignment.owner,
        workEventId: nextEventIdBySourceStage.get(assignment.stageId) ?? '',
        content: cleanAssignmentContent(assignment.content),
        priority: '中',
        expectedResult: '',
        note: assignment.note,
      }))

    const nextTemplate: DayPlanTemplate = {
      ...targetTemplate,
      events: [...targetTemplate.events, ...nextEvents],
      plans: [...targetTemplate.plans, ...nextPlans],
    }
    const nextTemplates = selectedDayPlanTemplate
      ? dayPlanTemplates.map((template) => (template.id === nextTemplate.id ? nextTemplate : template))
      : [...dayPlanTemplates, nextTemplate]
    onDayPlanTemplatesChange(nextTemplates)
    setSelectedDayPlanTemplateId(nextTemplate.id)
    setSelectedDayPlanEventId(nextEvents[0]?.id ?? '')
    setInsertEventTime(null)
  }

  const addAssignment = () => {
    if (!selectedTemplate || !activeStageId) return
    const assignment: WorkTemplateAssignment = {
      id: createId('assignment'),
      stageId: activeStageId,
      role: '运营',
      owner: getPreferredOwner('运营'),
      content: '',
      note: '',
    }
    updateTemplate({ ...selectedTemplate, assignments: [...selectedTemplate.assignments, assignment] })
  }

  const addDayPlanPlanAt = (role: TeamRole, time: string) => {
    if (!selectedDayPlanTemplate) return
    const event = findDayPlanEventAt(selectedDayPlanTemplate.events, time) ?? selectedDayPlanTemplate.events[0]
    if (!event) return
    const plan: DayPlanTemplatePlan = {
      id: createId('day-plan'),
      startTime: event.startTime,
      endTime: event.endTime,
      role,
      owner: getPreferredOwner(role),
      content: '',
      workEventId: event.id,
      priority: '中',
      expectedResult: '',
      note: '',
    }
    updateDayPlanTemplate({ ...selectedDayPlanTemplate, plans: [...selectedDayPlanTemplate.plans, plan] })
    setSelectedDayPlanEventId(event.id)
  }

  const deleteDayPlanEvent = (eventId: string) => {
    if (!selectedDayPlanTemplate) return
    updateDayPlanTemplate({
      ...selectedDayPlanTemplate,
      events: selectedDayPlanTemplate.events.filter((event) => event.id !== eventId),
      plans: selectedDayPlanTemplate.plans.filter((plan) => plan.workEventId !== eventId),
    })
    setSelectedDayPlanEventId('')
  }

  const deleteDayPlanPlan = (planId: string) => {
    if (!selectedDayPlanTemplate) return
    updateDayPlanTemplate({
      ...selectedDayPlanTemplate,
      plans: selectedDayPlanTemplate.plans.filter((plan) => plan.id !== planId),
    })
  }

  const updateDayPlanEvent = (event: DayPlanTemplateEvent) => {
    if (!selectedDayPlanTemplate) return
    updateDayPlanTemplate({
      ...selectedDayPlanTemplate,
      events: selectedDayPlanTemplate.events.map((item) => (item.id === event.id ? event : item)),
      plans: selectedDayPlanTemplate.plans.map((plan) =>
        plan.workEventId === event.id
          ? {
              ...plan,
              startTime: event.startTime,
              endTime: event.endTime,
            }
          : plan,
      ),
    })
  }

  const updateDayPlanPlan = (plan: DayPlanTemplatePlan) => {
    if (!selectedDayPlanTemplate) return
    updateDayPlanTemplate({
      ...selectedDayPlanTemplate,
      plans: selectedDayPlanTemplate.plans.map((item) => (item.id === plan.id ? plan : item)),
    })
  }

  const addDayPlanPlanForActiveEvent = () => {
    if (!selectedDayPlanTemplate || !activeDayPlanEvent) return
    const plan: DayPlanTemplatePlan = {
      id: createId('day-plan'),
      startTime: activeDayPlanEvent.startTime,
      endTime: activeDayPlanEvent.endTime,
      role: '运营',
      owner: getPreferredOwner('运营'),
      workEventId: activeDayPlanEvent.id,
      content: '',
      priority: '中',
      expectedResult: '',
      note: '',
    }
    updateDayPlanTemplate({ ...selectedDayPlanTemplate, plans: [...selectedDayPlanTemplate.plans, plan] })
  }

  const updateAssignment = (assignment: WorkTemplateAssignment) => {
    if (!selectedTemplate) return
    updateTemplate({
      ...selectedTemplate,
      assignments: selectedTemplate.assignments.map((item) => (item.id === assignment.id ? assignment : item)),
    })
  }

  const deleteAssignment = (assignmentId: string) => {
    if (!selectedTemplate) return
    updateTemplate({
      ...selectedTemplate,
      assignments: selectedTemplate.assignments.filter((assignment) => assignment.id !== assignmentId),
    })
  }

  const addPerson = (role: TeamRole) => {
    if (!requireEdit(canEditMembers)) return
    const name = personDrafts[role].trim()
    if (!name) return
    if (people.some((person) => person.role === role && person.name === name)) return

    onPeopleChange([...people, { id: createId('person'), role, name }])
    setPersonDrafts((current) => ({ ...current, [role]: '' }))
  }

  const deletePerson = (personId: string) => {
    if (!requireEdit(canEditMembers)) return
    onPeopleChange(people.filter((person) => person.id !== personId))
  }

  return (
    <>
      <section className="data-section edit-workbench">
        <div className="section-header">
          <div>
            <h2>编辑中心</h2>
            <p>集中维护岗位人员、大事件计划模板和可长期复用的整日计划模板。</p>
          </div>
        </div>

        <div className="edit-center-tabs" role="tablist" aria-label="编辑中心页面">
          <button className={activeEditPage === 'people' ? 'edit-center-tab-active' : ''} type="button" onClick={() => setActiveEditPage('people')}>
            岗位人员
          </button>
          <button className={activeEditPage === 'eventTemplates' ? 'edit-center-tab-active' : ''} type="button" onClick={() => setActiveEditPage('eventTemplates')}>
            大事件模板
          </button>
          <button className={activeEditPage === 'dayPlanTemplates' ? 'edit-center-tab-active' : ''} type="button" onClick={() => setActiveEditPage('dayPlanTemplates')}>
            整日计划模板
          </button>
        </div>

        <div className="edit-workbench-grid edit-workbench-grid-single">
          {activeEditPage === 'people' ? (
            <section className="editor-card people-config-page">
              <div className="editor-card-title">
                <div>
                  <h3>岗位人员</h3>
                  <p className="field-tip">维护可用于计划和任务分配的岗位人员。</p>
                </div>
              </div>
              <div className="people-editor-grid">
                {TEAM_ROLES.map((role) => {
                  const rolePeople = people.filter((person) => person.role === role)
                  return (
                    <div className="people-role-card people-role-card-compact" key={role}>
                      <div className="people-role-identity">
                        <span className="role-avatar">{role.slice(0, 1)}</span>
                        <div>
                          <strong>{role}</strong>
                          <span>{rolePeople.length > 0 ? `${rolePeople.length} 人已配置` : '未配置人员'}</span>
                        </div>
                        <span className={`role-status ${rolePeople.length > 0 ? 'role-status-assigned' : 'role-status-idle'}`}>
                          {rolePeople.length > 0 ? '已分配' : '空闲'}
                        </span>
                      </div>

                      <div className="person-pill-list">
                        {rolePeople.length > 0 ? (
                          rolePeople.map((person) => (
                            <span className="person-pill" key={person.id}>
                              <span className="person-pill-dot">
                                <UserRound size={12} />
                              </span>
                              <strong>{person.name}</strong>
                              {canEditMembers ? (
                                <button className="person-pill-delete" type="button" aria-label={`删除${person.name}`} onClick={() => deletePerson(person.id)}>
                                  <Trash2 size={12} />
                                </button>
                              ) : null}
                            </span>
                          ))
                        ) : (
                          <span className="person-pill-empty">暂无人员</span>
                        )}
                      </div>

                      <div className="inline-editor person-add-panel compact-person-add-panel">
                        <input
                          value={personDrafts[role]}
                          placeholder="填写姓名"
                          disabled={!canEditMembers}
                          onChange={(event) => setPersonDrafts((current) => ({ ...current, [role]: event.target.value }))}
                        />
                        <button className="secondary-button" type="button" onClick={() => addPerson(role)} disabled={!canEditMembers}>
                          <Plus size={14} /> 添加
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {activeEditPage === 'eventTemplates' ? (
            <section className="editor-card event-template-page">
            <div className="event-template-toolbar">
              <div>
                <span className="toolbar-label">当前大事件模板</span>
                <h3>{selectedTemplate?.name ?? '暂无大事件模板'}</h3>
                <p className="field-tip">正在编辑大事件模板，可从右侧模板库切换模板。</p>
              </div>
              <div className="event-template-toolbar-actions">
                <button className="secondary-button" type="button" onClick={openTemplateDrawer}>
                  打开模板库
                </button>
                <button className="secondary-button" type="button" onClick={addTemplate} disabled={!canEditEventTemplates}>
                  <Plus size={14} /> 新增大事件
                </button>
              </div>
            </div>

            {selectedTemplate ? (
              <>
                <div className="template-editor template-detail-panel">
                  <label>
                    快捷选择大事件
                    <select
                      value={selectedTemplate.id}
                      onChange={(event) => {
                        selectTemplate(event.target.value)
                      }}
                    >
                      {templates.map((template) => (
                        <option value={template.id} key={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    大事件名称
                    <input value={selectedTemplate.name} disabled={!canEditEventTemplates} onChange={(event) => updateTemplate({ ...selectedTemplate, name: event.target.value })} />
                  </label>
                  <label className="field-wide">
                    大事件备注
                    <textarea value={selectedTemplate.note} disabled={!canEditEventTemplates} onChange={(event) => updateTemplate({ ...selectedTemplate, note: event.target.value })} />
                  </label>

                  <div className="template-stage-grid field-wide">
                    {selectedTemplate.stages.map((stage) => (
                      <div className="template-stage-card" key={stage.id}>
                        <label className="checkbox-row">
                          <input type="checkbox" checked={stage.enabled} disabled={!canEditEventTemplates} onChange={(event) => updateStage({ ...stage, enabled: event.target.checked })} />
                          包含{stage.phase}
                        </label>
                        <div className="stage-time-row">
                          <label>
                            事件名称
                            <input value={stage.eventName ?? selectedTemplate.name} disabled={!canEditEventTemplates} onChange={(event) => updateStage({ ...stage, eventName: event.target.value })} />
                          </label>
                          <label>
                            开始
                            <TimeInput value={stage.startTime} readOnly={!canEditEventTemplates} onChange={(value) => updateStage({ ...stage, startTime: value, endTime: ensureEndAfterStart(value, stage.endTime) })} />
                          </label>
                          <label>
                            结束
                            <TimeInput value={stage.endTime} readOnly={!canEditEventTemplates} onChange={(value) => updateStage({ ...stage, endTime: ensureEndAfterStart(stage.startTime, value) })} />
                          </label>
                        </div>
                        <textarea value={stage.note} disabled={!canEditEventTemplates} onChange={(event) => updateStage({ ...stage, note: event.target.value })} placeholder="阶段工作说明" />
                      </div>
                    ))}
                  </div>

                  <div className="assignment-editor field-wide">
                    <div className="editor-card-title">
                      <h3>人员分配</h3>
                      <button className="secondary-button" type="button" onClick={addAssignment} disabled={!activeStageId || !canEditEventTemplates}>
                        <Plus size={14} /> 添加分配
                      </button>
                    </div>
                    <div className="assignment-stage-switch" aria-label="人员分配阶段">
                      {selectedTemplate.stages.map((stage) => (
                        <button
                          className={stage.id === activeStageId ? 'stage-switch-active' : ''}
                          type="button"
                          disabled={!stage.enabled}
                          onClick={() => setSelectedStageId(stage.id)}
                          key={stage.id}
                        >
                          {stage.phase}
                        </button>
                      ))}
                    </div>
                    {activeStage ? <p className="field-tip">当前编辑：{activeStage.phase}。上方未勾选的阶段不能分配人员。</p> : <p className="table-hint">请先勾选至少一个工作阶段。</p>}
                    {visibleAssignments.map((assignment) => (
                      <div className="assignment-row template-assignment-row" key={assignment.id}>
                        <select
                          value={assignment.role}
                          disabled={!canEditEventTemplates}
                          onChange={(event) => {
                            const role = event.target.value as TeamRole
                            updateAssignment({ ...assignment, role, owner: getPreferredOwner(role) })
                          }}
                        >
                          {TEAM_ROLES.map((role) => (
                            <option value={role} key={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <input value={assignment.owner} disabled={!canEditEventTemplates} onChange={(event) => updateAssignment({ ...assignment, owner: event.target.value })} placeholder="负责人" />
                        <input
                          value={cleanAssignmentContent(assignment.content)}
                          disabled={!canEditEventTemplates}
                          onChange={(event) => updateAssignment({ ...assignment, content: event.target.value })}
                          placeholder={LEGACY_ASSIGNMENT_PLACEHOLDER}
                        />
                        <button className="icon-button danger-icon" type="button" aria-label="删除分配" onClick={() => deleteAssignment(assignment.id)} disabled={!canEditEventTemplates}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="template-actions field-wide">
                    <button className="danger-button compact-danger-button" type="button" onClick={() => deleteTemplate(selectedTemplate.id)} disabled={!canEditEventTemplates}>
                      <Trash2 size={14} /> 删除模板
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            </section>
          ) : null}
        </div>

        {activeEditPage === 'dayPlanTemplates' ? (
          <section className="template-workbench-timeline day-plan-template-page">
          <div className="section-header">
            <div>
              <h2>整日计划模板时间轴</h2>
              <p>固定显示 08:00 - 20:00 小时级全览；双击工作事件行可插入已保存的大事件计划。</p>
            </div>
            <button className="secondary-button" type="button" onClick={addDayPlanTemplate} disabled={!canEditDayTemplates}>
              <Plus size={14} /> 新增整日模板
            </button>
          </div>

          <div className="day-plan-template-toolbar">
            <div className="day-plan-template-selector">
              <span className="toolbar-label">整日模板列表</span>
              <div className="day-plan-template-pills">
                {dayPlanTemplates.length > 0 ? (
                  dayPlanTemplates.map((template) => (
                    <button
                      className={`day-plan-template-pill ${template.id === selectedDayPlanTemplate?.id ? 'day-plan-template-pill-active' : ''}`}
                      type="button"
                      onClick={() => setSelectedDayPlanTemplateId(template.id)}
                      key={template.id}
                    >
                      <strong>{template.name}</strong>
                      <span>{template.events.length} 个事件 · {template.plans.length} 条任务</span>
                    </button>
                  ))
                ) : (
                  <span className="day-plan-template-empty">暂无整日模板</span>
                )}
              </div>
            </div>
            <div className="day-plan-template-meta">
              <label>
                模板名称
                <input
                  value={selectedDayPlanTemplate?.name ?? ''}
                  disabled={!selectedDayPlanTemplate || !canEditDayTemplates}
                  onChange={(event) => selectedDayPlanTemplate && updateDayPlanTemplate({ ...selectedDayPlanTemplate, name: event.target.value })}
                  placeholder="例如：直播日 / 复盘日 / 选款日"
                />
              </label>
              <label>
                模板备注
                <input
                  value={selectedDayPlanTemplate?.note ?? ''}
                  disabled={!selectedDayPlanTemplate || !canEditDayTemplates}
                  onChange={(event) => selectedDayPlanTemplate && updateDayPlanTemplate({ ...selectedDayPlanTemplate, note: event.target.value })}
                  placeholder="记录这个整日计划适用场景"
                />
              </label>
              <button
                className="danger-button compact-danger-button"
                type="button"
                disabled={!selectedDayPlanTemplate || !canEditDayTemplates}
                onClick={() => selectedDayPlanTemplate && deleteDayPlanTemplate(selectedDayPlanTemplate.id)}
              >
                <Trash2 size={14} /> 删除整日模板
              </button>
            </div>
          </div>

          <TimelineBoard
            events={dayPlanTimeline.events}
            tasks={dayPlanTimeline.tasks}
            viewStartTime={TEMPLATE_VIEW_START}
            viewEndTime={TEMPLATE_VIEW_END}
            precisionOverride="hour"
            stickyScale={false}
            onEditEvent={(event) => setSelectedDayPlanEventId(event.id)}
            onDeleteEvent={(event) => deleteDayPlanEvent(event.id)}
            onCreateEvent={(time) => setInsertEventTime(time)}
            onEditTask={(task) => setSelectedDayPlanEventId(task.workEventId)}
            onDeleteTask={(task) => deleteDayPlanPlan(task.sourcePlanId)}
            onCreateTask={addDayPlanPlanAt}
            structureReadOnly={!canEditDayTemplates}
          />

          {selectedDayPlanTemplate && activeDayPlanEvent ? (
            <div className="day-plan-event-editor">
              <div className="editor-card-title">
                <h3>整日模板中的大事件阶段</h3>
                <button className="secondary-button" type="button" onClick={addDayPlanPlanForActiveEvent} disabled={!canEditDayTemplates}>
                  <Plus size={14} /> 添加人员任务
                </button>
              </div>
              <div className="day-plan-event-fields">
                <label>
                  事件名称
                  <input value={activeDayPlanEvent.name} disabled={!canEditDayTemplates} onChange={(event) => updateDayPlanEvent({ ...activeDayPlanEvent, name: event.target.value })} />
                </label>
                <label>
                  阶段
                  <select value={activeDayPlanEvent.phase} disabled={!canEditDayTemplates} onChange={(event) => updateDayPlanEvent({ ...activeDayPlanEvent, phase: event.target.value as WorkTemplateStage['phase'] })}>
                    {EVENT_PHASES.map((phase) => (
                      <option value={phase} key={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  开始
                  <TimeInput
                    value={activeDayPlanEvent.startTime}
                    readOnly={!canEditDayTemplates}
                    onChange={(value) =>
                      updateDayPlanEvent({
                        ...activeDayPlanEvent,
                        startTime: value,
                        endTime: ensureEndAfterStart(value, activeDayPlanEvent.endTime),
                      })
                    }
                  />
                </label>
                <label>
                  结束
                  <TimeInput
                    value={activeDayPlanEvent.endTime}
                    readOnly={!canEditDayTemplates}
                    onChange={(value) =>
                      updateDayPlanEvent({
                        ...activeDayPlanEvent,
                        endTime: ensureEndAfterStart(activeDayPlanEvent.startTime, value),
                      })
                    }
                  />
                </label>
                <label className="field-wide">
                  阶段说明
                  <textarea value={activeDayPlanEvent.note} disabled={!canEditDayTemplates} onChange={(event) => updateDayPlanEvent({ ...activeDayPlanEvent, note: event.target.value })} />
                </label>
              </div>

              <div className="day-plan-assignment-list">
                {visibleDayPlanPlans.map((plan) => (
                  <div className="assignment-row template-assignment-row" key={plan.id}>
                    <select
                      value={plan.role}
                      disabled={!canEditDayTemplates}
                      onChange={(event) => {
                        const role = event.target.value as TeamRole
                        updateDayPlanPlan({ ...plan, role, owner: getPreferredOwner(role) })
                      }}
                    >
                      {TEAM_ROLES.map((role) => (
                        <option value={role} key={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <input value={plan.owner} disabled={!canEditDayTemplates} onChange={(event) => updateDayPlanPlan({ ...plan, owner: event.target.value })} placeholder="负责人" />
                    <input
                      value={cleanAssignmentContent(plan.content)}
                      disabled={!canEditDayTemplates}
                      onChange={(event) => updateDayPlanPlan({ ...plan, content: event.target.value })}
                      placeholder={LEGACY_ASSIGNMENT_PLACEHOLDER}
                    />
                    <button className="icon-button danger-icon" type="button" aria-label="删除人员任务" onClick={() => deleteDayPlanPlan(plan.id)} disabled={!canEditDayTemplates}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </section>
        ) : null}
      </section>
      {activeEditPage === 'eventTemplates' && eventTemplateDrawerOpen ? (
        <>
          <button className="event-template-drawer-backdrop" type="button" aria-label="确认并关闭大事件模板库" onClick={confirmTemplateDrawer} />
          <aside className="event-template-drawer" aria-label="大事件模板库">
            <div className="event-template-drawer-header">
              <div>
                <h3>大事件模板库</h3>
                <p>选择模板后可快速套用到当前编辑区。</p>
              </div>
              <button className="icon-button" type="button" aria-label="取消并关闭模板库" onClick={cancelTemplateDrawer}>
                <X size={18} />
              </button>
            </div>

            <div className="event-template-drawer-tools">
              <label className="drawer-search-field">
                <Search size={15} />
                <input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="搜索模板" />
              </label>
              <button className="primary-button" type="button" onClick={addTemplate} disabled={!canEditEventTemplates}>
                <Plus size={14} /> 新增大事件
              </button>
            </div>

            <div className="event-template-drawer-list">
              {visibleTemplates.length > 0 ? (
                visibleTemplates.map((template) => {
                  const templateEnabledStages = template.stages.filter((stage) => stage.enabled)
                  const assignmentCount = template.assignments.length
                  const isActive = template.id === selectedTemplate?.id

                  return (
                    <button
                      className={`drawer-template-item ${isActive ? 'drawer-template-item-active' : ''}`}
                      type="button"
                      onClick={() => {
                        selectTemplate(template.id)
                      }}
                      key={template.id}
                    >
                      <span className="drawer-template-title-row">
                        <strong>{template.name}</strong>
                        {isActive ? <span>当前选中</span> : null}
                      </span>
                      <span className="drawer-template-meta">
                        <span>{templateEnabledStages.length} 个阶段</span>
                        <span>{assignmentCount} 条分配</span>
                      </span>
                      <span className="template-mini-timeline" aria-hidden="true">
                        {templateEnabledStages.length > 0 ? (
                          templateEnabledStages.map((stage) => (
                            <span
                              className={`mini-stage phase-${stage.phase}`}
                              style={{ flexGrow: Math.max(1, minutesFromTime(stage.endTime) - minutesFromTime(stage.startTime)) }}
                              key={stage.id}
                            />
                          ))
                        ) : (
                          <span className="mini-stage mini-stage-empty" />
                        )}
                      </span>
                    </button>
                  )
                })
              ) : (
                <p className="drawer-empty-state">没有匹配的模板。</p>
              )}
            </div>

            {selectedTemplate ? (
              <div className="event-template-drawer-preview">
                <span className="toolbar-label">当前选中模板预览</span>
                <strong>{selectedTemplate.name}</strong>
                <p>{selectedTemplate.note.trim() || '暂无备注。'}</p>
                <div>
                  {selectedTemplate.stages
                    .filter((stage) => stage.enabled)
                    .map((stage) => (
                      <span className={`drawer-phase-chip phase-${stage.phase}`} key={stage.id}>
                        {stage.phase} · {stage.startTime}-{stage.endTime}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}

            <div className="event-template-drawer-footer">
              <button className="secondary-button" type="button" onClick={cancelTemplateDrawer}>
                取消
              </button>
              <button className="primary-button" type="button" disabled={!selectedTemplate} onClick={confirmTemplateDrawer}>
                使用此模板
              </button>
            </div>
          </aside>
        </>
      ) : null}
      {insertEventTime ? (
        <Modal
          title="添加大事件计划"
          onClose={() => setInsertEventTime(null)}
          footer={
            <button className="secondary-button" type="button" onClick={() => setInsertEventTime(null)}>
              取消
            </button>
          }
        >
          <div className="saved-event-picker">
            <p className="field-tip">将已保存的大事件计划插入到 {insertEventTime} 开始的位置，准备、进行、收尾阶段和人员任务会一起复制到当前整日计划模板。</p>
            {templates.map((template) => {
              const enabledStageCount = template.stages.filter((stage) => stage.enabled).length
              return (
                <button className="saved-event-option" type="button" onClick={() => insertSavedEvent(template, insertEventTime)} key={template.id}>
                  <strong>{template.name}</strong>
                  <span>{enabledStageCount} 个阶段 · {template.assignments.length} 条人员任务</span>
                  {template.note.trim() ? <small>{template.note}</small> : null}
                </button>
              )
            })}
          </div>
        </Modal>
      ) : null}
    </>
  )
}

function buildDayPlanTemplateTimeline(template: DayPlanTemplate | undefined): { events: WorkEvent[]; tasks: TimelineTask[] } {
  if (!template) return { events: [], tasks: [] }

  const eventById = new Map(template.events.map((event) => [event.id, event]))
  const events: WorkEvent[] = template.events.map((event) => ({
    id: event.id,
    date: '',
    name: event.name,
    phase: event.phase,
    startTime: event.startTime,
    endTime: event.endTime,
    note: event.note,
  }))
  const tasks: TimelineTask[] = template.plans
    .filter((plan) => eventById.has(plan.workEventId))
    .map((plan) => {
      return {
        id: `day-template-plan-${plan.id}`,
        date: '',
        role: plan.role,
        personName: plan.owner,
        startTime: plan.startTime,
        endTime: plan.endTime,
        content: cleanAssignmentContent(plan.content).trim() || '未填写工作内容',
        workEventId: plan.workEventId,
        status: '绿',
        problem: '',
        solution: '',
        issues: [],
        note: plan.note,
        sourcePlanId: plan.id,
      }
    })

  return { events, tasks }
}

function findDayPlanEventAt(events: DayPlanTemplateEvent[], time: string): DayPlanTemplateEvent | undefined {
  const minute = minutesFromTime(time)
  return events.find((event) => minutesFromTime(event.startTime) <= minute && minute < minutesFromTime(event.endTime))
}

function createBlankDayPlanTemplate(): DayPlanTemplate {
  return {
    id: createId('day-template'),
    name: '新整日计划',
    note: '',
    events: [],
    plans: [],
  }
}

function createBlankTemplate(getOwner: (role: TeamRole) => string): WorkTemplate {
  const prepStage = createId('stage')
  const mainStage = createId('stage')
  const wrapStage = createId('stage')
  const stages = [
    createStage(prepStage, '事前准备', true, '09:00', '09:30'),
    createStage(mainStage, '正式工作', true, '09:30', '11:00'),
    createStage(wrapStage, '收尾工作', true, '11:00', '11:30'),
  ]

  return {
    id: createId('template'),
    name: '新工作内容',
    note: '',
    stages,
    assignments: stages.flatMap((stage) => createDefaultStageAssignments(stage.id, getOwner)),
  }
}

function createStage(id: string, phase: (typeof EVENT_PHASES)[number], enabled: boolean, startTime: string, endTime: string): WorkTemplateStage {
  return {
    id,
    phase,
    enabled,
    startTime,
    endTime,
    note: '',
  }
}

function createDefaultStageAssignments(stageId: string, getOwner: (role: TeamRole) => string): WorkTemplateAssignment[] {
  return DEFAULT_ASSIGNMENT_ROLES.map((role) => createDefaultAssignment(stageId, role, getOwner))
}

function createDefaultAssignment(stageId: string, role: TeamRole, getOwner: (role: TeamRole) => string): WorkTemplateAssignment {
  return {
    id: createId('assignment'),
    stageId,
    role,
    owner: getOwner(role),
    content: '',
    note: '',
  }
}

function cleanAssignmentContent(content: string): string {
  return content === LEGACY_ASSIGNMENT_PLACEHOLDER ? '' : content
}
