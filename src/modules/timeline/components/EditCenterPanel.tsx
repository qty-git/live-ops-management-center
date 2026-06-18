import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TeamPerson, TeamRole, TomorrowPlan, WorkEvent, WorkTemplate, WorkTemplateAssignment, WorkTemplateStage } from '../types'
import { EVENT_PHASES, TEAM_ROLES } from '../types'
import { createId, ensureEndAfterStart } from '../utils'
import { PlanTimelineBoard } from './PlanTimelineBoard'
import { TimeInput } from './TimeInput'
import { TomorrowPlanTable } from './TomorrowPlanTable'

interface EditCenterPanelProps {
  people: TeamPerson[]
  templates: WorkTemplate[]
  tomorrowEvents: WorkEvent[]
  tomorrowPlans: TomorrowPlan[]
  viewStartTime: string
  viewEndTime: string
  peopleOptionsByRole: Record<TeamRole, string[]>
  onPeopleChange: (people: TeamPerson[]) => void
  onTemplatesChange: (templates: WorkTemplate[]) => void
  onApplyTemplate: (template: WorkTemplate) => void
  onEditPlan: (plan: TomorrowPlan) => void
  onDeletePlan: (plan: TomorrowPlan) => void
  onCreatePlan: (role: TeamRole, time: string) => void
  onEditEvent: (event: WorkEvent) => void
  onCreateEvent: (time: string) => void
  onPanViewRange?: (deltaMinutes: number) => void
  onAddPlan: () => void
  onUpdatePlan: (plan: TomorrowPlan) => void
  onDeletePlanById: (planId: string) => void
}

const getDefaultOwner = (role: TeamRole) => `${role} A`

export function EditCenterPanel({
  people,
  templates,
  tomorrowEvents,
  tomorrowPlans,
  viewStartTime,
  viewEndTime,
  peopleOptionsByRole,
  onPeopleChange,
  onTemplatesChange,
  onApplyTemplate,
  onEditPlan,
  onDeletePlan,
  onCreatePlan,
  onEditEvent,
  onCreateEvent,
  onPanViewRange,
  onAddPlan,
  onUpdatePlan,
  onDeletePlanById,
}: EditCenterPanelProps) {
  const [personDrafts, setPersonDrafts] = useState<Record<TeamRole, string>>({
    主播: '',
    中控: '',
    场控: '',
    运营: '',
    摄影: '',
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')
  const [selectedStageId, setSelectedStageId] = useState('')
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  )
  const enabledStages = selectedTemplate?.stages.filter((stage) => stage.enabled) ?? []
  const activeStage = enabledStages.find((stage) => stage.id === selectedStageId) ?? enabledStages[0]
  const activeStageId = activeStage?.id ?? ''
  const visibleAssignments = selectedTemplate?.assignments.filter((assignment) => assignment.stageId === activeStageId) ?? []

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

  useEffect(() => {
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
  }, [getPreferredOwner, templates, onTemplatesChange])

  const updateTemplate = (template: WorkTemplate) => {
    onTemplatesChange(templates.map((item) => (item.id === template.id ? template : item)))
  }

  const addTemplate = () => {
    const template = createBlankTemplate()
    onTemplatesChange([...templates, template])
    setSelectedTemplateId(template.id)
    setSelectedStageId(template.stages.find((stage) => stage.enabled)?.id ?? '')
  }

  const deleteTemplate = (templateId: string) => {
    if (templates.length <= 1) return
    if (!window.confirm('确认删除这个工作内容模板？')) return
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

  const addAssignment = () => {
    if (!selectedTemplate || !activeStageId) return
    const assignment: WorkTemplateAssignment = {
      id: createId('assignment'),
      stageId: activeStageId,
      role: '运营',
      owner: getPreferredOwner('运营'),
      content: '填写负责人工作内容',
      note: '',
    }
    updateTemplate({ ...selectedTemplate, assignments: [...selectedTemplate.assignments, assignment] })
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
    const name = personDrafts[role].trim()
    if (!name) return
    if (people.some((person) => person.role === role && person.name === name)) return

    onPeopleChange([...people, { id: createId('person'), role, name }])
    setPersonDrafts((current) => ({ ...current, [role]: '' }))
  }

  const deletePerson = (personId: string) => {
    onPeopleChange(people.filter((person) => person.id !== personId))
  }

  return (
    <>
      <section className="data-section edit-workbench">
        <div className="section-header">
          <div>
            <h2>编辑中心</h2>
            <p>集中维护岗位人员、工作内容模板和次日计划模板。</p>
          </div>
        </div>

        <div className="edit-workbench-grid">
          <section className="editor-card">
            <h3>岗位人员</h3>
            <div className="people-editor-grid">
              {TEAM_ROLES.map((role) => (
                <div className="people-role-card" key={role}>
                  <strong>{role}</strong>
                  <div className="person-tags">
                    {people
                      .filter((person) => person.role === role)
                      .map((person) => (
                        <span className="person-tag" key={person.id}>
                          {role}-{person.name}
                          <button type="button" aria-label={`删除${person.name}`} onClick={() => deletePerson(person.id)}>
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                  <div className="inline-editor">
                    <input
                      value={personDrafts[role]}
                      placeholder="填写姓名"
                      onChange={(event) => setPersonDrafts((current) => ({ ...current, [role]: event.target.value }))}
                    />
                    <button className="secondary-button" type="button" onClick={() => addPerson(role)}>
                      <Plus size={14} /> 添加
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="editor-card">
            <div className="editor-card-title">
              <h3>工作内容模板</h3>
              <button className="secondary-button" type="button" onClick={addTemplate}>
                <Plus size={14} /> 新增模板
              </button>
            </div>

            {selectedTemplate ? (
              <div className="template-editor">
                <label>
                  选择模板
                  <select
                    value={selectedTemplate.id}
                    onChange={(event) => {
                      const template = templates.find((item) => item.id === event.target.value)
                      setSelectedTemplateId(event.target.value)
                      setSelectedStageId(template?.stages.find((stage) => stage.enabled)?.id ?? '')
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
                  <input value={selectedTemplate.name} onChange={(event) => updateTemplate({ ...selectedTemplate, name: event.target.value })} />
                </label>
                <label className="field-wide">
                  模板备注
                  <textarea value={selectedTemplate.note} onChange={(event) => updateTemplate({ ...selectedTemplate, note: event.target.value })} />
                </label>

                <div className="template-stage-grid field-wide">
                  {selectedTemplate.stages.map((stage) => (
                    <div className="template-stage-card" key={stage.id}>
                      <label className="checkbox-row">
                        <input type="checkbox" checked={stage.enabled} onChange={(event) => updateStage({ ...stage, enabled: event.target.checked })} />
                        包含{stage.phase}
                      </label>
                      <div className="stage-time-row">
                        <label>
                          开始
                          <TimeInput value={stage.startTime} onChange={(value) => updateStage({ ...stage, startTime: value, endTime: ensureEndAfterStart(value, stage.endTime) })} />
                        </label>
                        <label>
                          结束
                          <TimeInput value={stage.endTime} onChange={(value) => updateStage({ ...stage, endTime: ensureEndAfterStart(stage.startTime, value) })} />
                        </label>
                      </div>
                      <textarea value={stage.note} onChange={(event) => updateStage({ ...stage, note: event.target.value })} placeholder="阶段工作说明" />
                    </div>
                  ))}
                </div>

                <div className="assignment-editor field-wide">
                  <div className="editor-card-title">
                    <h3>人员分配</h3>
                    <button className="secondary-button" type="button" onClick={addAssignment} disabled={!activeStageId}>
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
                      <input value={assignment.owner} onChange={(event) => updateAssignment({ ...assignment, owner: event.target.value })} placeholder="负责人" />
                      <input value={assignment.content} onChange={(event) => updateAssignment({ ...assignment, content: event.target.value })} placeholder="负责内容" />
                      <button className="icon-button danger-icon" type="button" aria-label="删除分配" onClick={() => deleteAssignment(assignment.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="template-actions field-wide">
                  <button className="primary-button" type="button" onClick={() => onApplyTemplate(selectedTemplate)}>
                    套用到次日计划模板
                  </button>
                  <button className="danger-button compact-danger-button" type="button" onClick={() => deleteTemplate(selectedTemplate.id)}>
                    <Trash2 size={14} /> 删除模板
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <section className="data-section timeline-display-section">
        <div className="section-header">
          <div>
            <h2>次日计划时间轴模板</h2>
            <p>计划时间轴独立于今日实际，点击卡片可编辑，右键计划卡片可删除。</p>
          </div>
        </div>
        <PlanTimelineBoard
          plans={tomorrowPlans}
          events={tomorrowEvents}
          viewStartTime={viewStartTime}
          viewEndTime={viewEndTime}
          onEditPlan={onEditPlan}
          onDeletePlan={onDeletePlan}
          onCreatePlan={onCreatePlan}
          onEditEvent={onEditEvent}
          onCreateEvent={onCreateEvent}
          onPanViewRange={onPanViewRange}
        />
      </section>

      <TomorrowPlanTable
        plans={tomorrowPlans}
        events={tomorrowEvents}
        peopleOptionsByRole={peopleOptionsByRole}
        onAdd={onAddPlan}
        onUpdate={onUpdatePlan}
        onDelete={onDeletePlanById}
      />
    </>
  )
}

function createBlankTemplate(): WorkTemplate {
  const prepStage = createId('stage')
  const mainStage = createId('stage')
  const wrapStage = createId('stage')

  return {
    id: createId('template'),
    name: '新工作内容',
    note: '',
    stages: [
      createStage(prepStage, '事前准备', true, '09:00', '09:30'),
      createStage(mainStage, '正式工作', true, '09:30', '11:00'),
      createStage(wrapStage, '收尾工作', true, '11:00', '11:30'),
    ],
    assignments: [],
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
