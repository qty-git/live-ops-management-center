import type { TeamRole, TimelineTask, TomorrowPlan, WorkEvent } from '../types'
import { TimelineBoard } from './TimelineBoard'

interface PlanTimelineBoardProps {
  plans: TomorrowPlan[]
  events: WorkEvent[]
  viewStartTime: string
  viewEndTime: string
  onEditPlan: (plan: TomorrowPlan) => void
  onDeletePlan?: (plan: TomorrowPlan) => void
  onCreatePlan: (role: TeamRole, time: string) => void
  onEditEvent: (event: WorkEvent) => void
  onCreateEvent: (time: string) => void
  onPanViewRange?: (deltaMinutes: number) => void
}

export function PlanTimelineBoard({
  plans,
  events,
  viewStartTime,
  viewEndTime,
  onEditPlan,
  onDeletePlan,
  onCreatePlan,
  onEditEvent,
  onCreateEvent,
  onPanViewRange,
}: PlanTimelineBoardProps) {
  const planTasks: TimelineTask[] = plans.map((plan) => ({
    id: `plan-task-${plan.id}`,
    date: plan.planDate,
    role: plan.role,
    personName: plan.owner,
    startTime: plan.startTime,
    endTime: plan.endTime,
    content: plan.content,
    workEventId: plan.workEventId,
    status: '绿',
    problem: '',
    solution: '',
    issues: [],
    note: plan.note,
    sourcePlanId: plan.id,
  }))

  return (
    <TimelineBoard
      events={events}
      tasks={planTasks}
      viewStartTime={viewStartTime}
      viewEndTime={viewEndTime}
      onEditEvent={onEditEvent}
      onCreateEvent={onCreateEvent}
      onEditTask={(task) => {
        const plan = plans.find((item) => item.id === task.sourcePlanId)
        if (plan) onEditPlan(plan)
      }}
      onDeleteTask={(task) => {
        const plan = plans.find((item) => item.id === task.sourcePlanId)
        if (plan) onDeletePlan?.(plan)
      }}
      onCreateTask={onCreatePlan}
      onPanViewRange={onPanViewRange}
    />
  )
}
