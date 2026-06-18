import { useMemo, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { TeamRole, WorkEventPhase, WorkTemplate } from '../types'
import { ensureEndAfterStart, minutesFromTime, timeFromMinutes } from '../utils'
import { TimeInput } from './TimeInput'

export interface TemplateApplyStageDraft {
  id: string
  phase: WorkEventPhase
  enabled: boolean
  startTime: string
  endTime: string
  note: string
}

export interface TemplateApplyAssignmentDraft {
  id: string
  stageId: string
  role: TeamRole
  owner: string
  content: string
  note: string
}

export interface TemplateApplyDraft {
  templateId: string
  name: string
  note: string
  stages: TemplateApplyStageDraft[]
  assignments: TemplateApplyAssignmentDraft[]
}

interface TemplateApplyModalProps {
  title: string
  anchorTime: string
  templates: WorkTemplate[]
  onApply: (draft: TemplateApplyDraft) => void
  onClose: () => void
}

export function TemplateApplyModal({ title, anchorTime, templates, onApply, onClose }: TemplateApplyModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  )
  const [draft, setDraft] = useState<TemplateApplyDraft>(() => buildDraft(templates[0], anchorTime))

  const switchTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId)
    setSelectedTemplateId(templateId)
    setDraft(buildDraft(template, anchorTime))
  }

  const updateStage = (stage: TemplateApplyStageDraft) => {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((item) => (item.id === stage.id ? stage : item)),
    }))
  }

  const updateAssignment = (assignment: TemplateApplyAssignmentDraft) => {
    setDraft((current) => ({
      ...current,
      assignments: current.assignments.map((item) => (item.id === assignment.id ? assignment : item)),
    }))
  }

  const enabledStages = draft.stages.filter((stage) => stage.enabled)

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button" type="button" onClick={() => onApply(draft)} disabled={!selectedTemplate || enabledStages.length === 0}>
            生成大事件和人员任务
          </button>
        </>
      }
    >
      <div className="template-apply-form">
        <label>
          调用模板
          <select value={draft.templateId} onChange={(event) => switchTemplate(event.target.value)}>
            {templates.map((template) => (
              <option value={template.id} key={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          大事件名称
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="field-wide">
          备注
          <textarea value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} />
        </label>

        <div className="template-apply-stages field-wide">
          {draft.stages.map((stage) => (
            <div className="template-stage-card" key={stage.id}>
              <label className="checkbox-row">
                <input type="checkbox" checked={stage.enabled} onChange={(event) => updateStage({ ...stage, enabled: event.target.checked })} />
                {stage.phase}
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
              <textarea value={stage.note} onChange={(event) => updateStage({ ...stage, note: event.target.value })} placeholder="阶段说明" />
            </div>
          ))}
        </div>

        <div className="template-apply-assignments field-wide">
          <strong>人员具体工作</strong>
          {draft.assignments.map((assignment) => (
            <div className="assignment-row" key={assignment.id}>
              <select value={assignment.stageId} onChange={(event) => updateAssignment({ ...assignment, stageId: event.target.value })}>
                {draft.stages.map((stage) => (
                  <option value={stage.id} key={stage.id}>
                    {stage.phase}
                  </option>
                ))}
              </select>
              <select value={assignment.role} onChange={(event) => updateAssignment({ ...assignment, role: event.target.value as TeamRole })}>
                {['主播', '中控', '场控', '运营', '摄影'].map((role) => (
                  <option value={role} key={role}>
                    {role}
                  </option>
                ))}
              </select>
              <input value={assignment.owner} onChange={(event) => updateAssignment({ ...assignment, owner: event.target.value })} placeholder="负责人" />
              <input value={assignment.content} onChange={(event) => updateAssignment({ ...assignment, content: event.target.value })} placeholder="具体工作" />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function buildDraft(template: WorkTemplate | undefined, anchorTime: string): TemplateApplyDraft {
  if (!template) {
    return {
      templateId: '',
      name: '新工作内容',
      note: '',
      stages: [],
      assignments: [],
    }
  }

  const enabledStages = template.stages.filter((stage) => stage.enabled)
  const earliest = Math.min(...(enabledStages.length ? enabledStages : template.stages).map((stage) => minutesFromTime(stage.startTime)))
  const offset = minutesFromTime(anchorTime) - earliest

  return {
    templateId: template.id,
    name: template.name,
    note: template.note,
    stages: template.stages.map((stage) => {
      const start = minutesFromTime(stage.startTime) + offset
      const end = minutesFromTime(stage.endTime) + offset
      return {
        id: stage.id,
        phase: stage.phase,
        enabled: stage.enabled,
        startTime: timeFromMinutes(start),
        endTime: ensureEndAfterStart(timeFromMinutes(start), timeFromMinutes(end)),
        note: stage.note,
      }
    }),
    assignments: template.assignments.map((assignment) => ({ ...assignment })),
  }
}
