import { Maximize2, Minimize2, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TeamRole, TimelinePrecision, TimelineTask, WorkEvent } from '../types'
import { TEAM_ROLES } from '../types'
import { buildTicks, getItemRange, getPrecision, layoutOverlaps, minutesFromTime, snapMinutes, taskIssueSummary, timeFromMinutes, todayISO } from '../utils'

const EVENT_BLOCK_HEIGHT = 44
const TASK_BLOCK_HEIGHT = 76
const LANE_GAP = 10
const EVENT_LANE_GAP = 6
const HORIZONTAL_WHEEL_RATIO = 1.25
const MIN_HORIZONTAL_WHEEL_DELTA = 4
const PAN_START_THRESHOLD = 6

interface TimelineBoardProps {
  events: WorkEvent[]
  tasks: TimelineTask[]
  viewStartTime: string
  viewEndTime: string
  onEditEvent: (event: WorkEvent) => void
  onCreateEvent: (time: string) => void
  onDeleteEvent?: (event: WorkEvent) => void
  onEditTask: (task: TimelineTask) => void
  onCreateTask: (role: TeamRole, time: string) => void
  onDeleteTask?: (task: TimelineTask) => void
  onPanViewRange?: (deltaMinutes: number) => void
  stickyScale?: boolean
  precisionOverride?: TimelinePrecision
  date?: string
  readOnly?: boolean
  structureReadOnly?: boolean
  isOwnTask?: (task: TimelineTask) => boolean
}

interface CurrentTimeMarker {
  left: number
  time: string
  tooltip: string
}

export function TimelineBoard({
  events,
  tasks,
  viewStartTime,
  viewEndTime,
  onEditEvent,
  onCreateEvent,
  onDeleteEvent,
  onEditTask,
  onCreateTask,
  onDeleteTask,
  onPanViewRange,
  stickyScale = true,
  precisionOverride,
  date,
  readOnly = false,
  structureReadOnly = readOnly,
  isOwnTask = () => false,
}: TimelineBoardProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const [isPanning, setIsPanning] = useState(false)
  const [currentMinute, setCurrentMinute] = useState(() => getCurrentMinute())
  const gridRef = useRef<HTMLDivElement | null>(null)
  const scaleRef = useRef<HTMLDivElement | null>(null)
  const wheelRemainderRef = useRef(0)
  const clickSuppressionRef = useRef(false)
  const panStateRef = useRef<{
    pointerId: number
    lastX: number
    totalX: number
    active: boolean
    captured: boolean
  } | null>(null)
  const precision = precisionOverride ?? getPrecision(viewStartTime, viewEndTime)
  const ticks = buildTicks(viewStartTime, viewEndTime, precision)
  const visualMinorTicks = buildVisualMinorTicks(viewStartTime, viewEndTime, precision, ticks)
  const showRoleRows = precision !== 'overview'
  const eventDisplayItems = precision === 'overview' ? groupEventsForOverview(events) : events.map((event) => ({ ...event, sourceEvent: event }))
  const eventLaneMap = getStableEventLaneMap(events)
  const currentTimeMarker = useMemo(
    () => buildCurrentTimeMarker(date, currentMinute, viewStartTime, viewEndTime, tasks),
    [currentMinute, date, tasks, viewEndTime, viewStartTime],
  )

  useEffect(() => {
    if (date !== todayISO()) return

    const syncTimer = window.setTimeout(() => {
      setCurrentMinute(getCurrentMinute())
    }, 0)
    const timer = window.setInterval(() => {
      setCurrentMinute(getCurrentMinute())
    }, 60 * 1000)

    return () => {
      window.clearTimeout(syncTimer)
      window.clearInterval(timer)
    }
  }, [date])

  const toggleExpanded = (rowKey: string) => {
    setExpandedRows((current) => {
      const next = new Set(current)
      if (next.has(rowKey)) {
        next.delete(rowKey)
      } else {
        next.add(rowKey)
      }
      return next
    })
  }
  const panByPixels = (pixelDelta: number) => {
    if (!onPanViewRange) return false

    const width = scaleRef.current?.getBoundingClientRect().width || gridRef.current?.getBoundingClientRect().width || 1
    const viewDuration = Math.max(1, minutesFromTime(viewEndTime) - minutesFromTime(viewStartTime))
    const rawMinutes = wheelRemainderRef.current - (pixelDelta / width) * viewDuration
    const deltaMinutes = rawMinutes > 0 ? Math.floor(rawMinutes) : Math.ceil(rawMinutes)

    if (deltaMinutes === 0) {
      wheelRemainderRef.current = rawMinutes
      return false
    }

    wheelRemainderRef.current = rawMinutes - deltaMinutes
    onPanViewRange(deltaMinutes)
    return true
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const absX = Math.abs(event.deltaX)
    const absY = Math.abs(event.deltaY)
    const horizontalDelta =
      absX > MIN_HORIZONTAL_WHEEL_DELTA && absX > absY * HORIZONTAL_WHEEL_RATIO ? event.deltaX : event.shiftKey && absY > MIN_HORIZONTAL_WHEEL_DELTA ? event.deltaY : 0
    if (!horizontalDelta) return

    const didPan = panByPixels(horizontalDelta)
    if (!didPan && !onPanViewRange) return
    event.preventDefault()
    event.stopPropagation()
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || !onPanViewRange || event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button, input, textarea, select, a, .timeline-block, .timeline-block-wrap')) return

    panStateRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      totalX: 0,
      active: false,
      captured: false,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current
    if (!panState || panState.pointerId !== event.pointerId) return

    const pixelDelta = event.clientX - panState.lastX
    panState.lastX = event.clientX
    panState.totalX += pixelDelta

    if (!panState.active && Math.abs(panState.totalX) < PAN_START_THRESHOLD) return

    panState.active = true
    clickSuppressionRef.current = true
    setIsPanning(true)
    if (!panState.captured) {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      panState.captured = true
    }
    event.preventDefault()
    panByPixels(pixelDelta)
  }

  const finishPointerPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current
    if (!panState || panState.pointerId !== event.pointerId) return

    panStateRef.current = null
    setIsPanning(false)
    if (panState.captured) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }

    if (clickSuppressionRef.current) {
      window.setTimeout(() => {
        clickSuppressionRef.current = false
      }, 0)
    }
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!clickSuppressionRef.current) return

    event.preventDefault()
    event.stopPropagation()
    clickSuppressionRef.current = false
  }
  const confirmDeleteEvent = (event: WorkEvent) => {
    if (window.confirm(`确认删除“${event.name}”？绑定的人员任务也会一起删除。`)) {
      onDeleteEvent?.(event)
    }
  }

  return (
    <section className={`timeline-shell ${stickyScale ? 'timeline-shell-sticky' : ''}`}>
      <div
        className={`timeline-grid ${isPanning ? 'timeline-grid-panning' : ''}`}
        ref={gridRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerPan}
        onPointerCancel={finishPointerPan}
        onClickCapture={handleClickCapture}
      >
        <div className="timeline-label timeline-label-head">时间刻度</div>
        <div className="timeline-scale" ref={scaleRef}>
          {visualMinorTicks.map((tick) => {
            const left = getItemRange({ startTime: tick, endTime: tick }, viewStartTime, viewEndTime).left
            return <span className="timeline-minor-tick" style={{ left: `${left}%` }} key={`minor-${tick}`} />
          })}
          {ticks.map((tick) => {
            const left = getItemRange({ startTime: tick, endTime: tick }, viewStartTime, viewEndTime).left
            return (
              <span className="timeline-tick" style={{ left: `${left}%` }} key={tick}>
                {tick}
              </span>
            )
          })}
          {currentTimeMarker ? (
            <span
              className="timeline-now-marker timeline-now-scale"
              style={{ left: `${currentTimeMarker.left}%` }}
              data-tooltip={currentTimeMarker.tooltip}
              title={currentTimeMarker.tooltip}
            >
              <span>{currentTimeMarker.time}</span>
            </span>
          ) : null}
        </div>

        <TimelineRowLabel label="工作事件" expanded={expandedRows.has('events')} onToggle={() => toggleExpanded('events')} />
        <TimelineLane
          className="event-lane"
          items={eventDisplayItems}
          precision={precision}
          viewStartTime={viewStartTime}
          viewEndTime={viewEndTime}
          blockHeight={expandedRows.has('events') ? EVENT_BLOCK_HEIGHT + 44 : EVENT_BLOCK_HEIGHT}
          laneGap={EVENT_LANE_GAP}
          getLaneKey={(event) => event.name}
          stableLaneMap={eventLaneMap}
          stableLaneCount={3}
          currentTimeMarker={currentTimeMarker}
          readOnly={readOnly || structureReadOnly}
          emptyLabel={readOnly || structureReadOnly ? '暂无工作事件' : '双击新增工作事件'}
          onDoubleClick={(time) => onCreateEvent(time)}
          renderItem={(event) => (
            <button
              className={`timeline-block event-block phase-${event.phase} ${readOnly ? 'timeline-block-readonly' : ''}`}
              type="button"
              onClick={() => {
                if (!readOnly && !structureReadOnly) onEditEvent(event.sourceEvent)
              }}
              onContextMenu={(contextEvent) => {
                if (readOnly || structureReadOnly || !onDeleteEvent) return
                contextEvent.preventDefault()
                confirmDeleteEvent(event.sourceEvent)
              }}
            >
              <span className="event-title-line">
                <span className="block-title">{event.name}</span>
                <span className="event-time">
                  {event.startTime}-{event.endTime}
                </span>
              </span>
              {precision !== 'overview' && event.phase !== event.name ? <span className="block-phase">{event.phase}</span> : null}
              {expandedRows.has('events') && event.note ? <span className="block-detail">备注：{event.note}</span> : null}
            </button>
          )}
        />

        {showRoleRows
          ? TEAM_ROLES.map((role) => (
              <TimelineRoleLane
                key={role}
                role={role}
                tasks={tasks.filter((task) => task.role === role)}
                expanded={expandedRows.has(`role-${role}`)}
                precision={precision}
                viewStartTime={viewStartTime}
                viewEndTime={viewEndTime}
                onToggle={() => toggleExpanded(`role-${role}`)}
                onCreateTask={onCreateTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                currentTimeMarker={currentTimeMarker}
                readOnly={readOnly}
                structureReadOnly={structureReadOnly}
                isOwnTask={isOwnTask}
              />
            ))
          : null}
      </div>
    </section>
  )
}

interface LaneProps<T extends { id: string; startTime: string; endTime: string }> {
  items: T[]
  precision: TimelinePrecision
  viewStartTime: string
  viewEndTime: string
  className?: string
  emptyLabel: string
  blockHeight?: number
  laneGap?: number
  getLaneKey?: (item: T) => string
  stableLaneMap?: Map<string, number>
  stableLaneCount?: number
  currentTimeMarker?: CurrentTimeMarker | null
  readOnly?: boolean
  onDoubleClick: (time: string) => void
  renderItem: (item: T) => React.ReactNode
}

function TimelineLane<T extends { id: string; startTime: string; endTime: string }>({
  items,
  precision,
  viewStartTime,
  viewEndTime,
  className,
  emptyLabel,
  blockHeight = TASK_BLOCK_HEIGHT,
  laneGap = LANE_GAP,
  getLaneKey,
  stableLaneMap,
  stableLaneCount = 0,
  currentTimeMarker,
  readOnly = false,
  onDoubleClick,
  renderItem,
}: LaneProps<T>) {
  const visibleItems = items.filter((item) => getItemRange(item, viewStartTime, viewEndTime).visible)
  const layout = getLaneKey ? layoutByStableGroup(visibleItems, getLaneKey, stableLaneMap) : layoutOverlaps(visibleItems)
  const laneCount = Math.max(1, stableLaneCount, ...layout.map((item) => item.lane + 1))
  const laneStep = blockHeight + laneGap
  const height = Math.max(blockHeight + 16, laneCount * laneStep + 14)

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return

    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const start = minutesFromTime(viewStartTime)
    const end = minutesFromTime(viewEndTime)
    const step = precision === 'fiveMinute' ? 5 : precision === 'quarter' ? 15 : 30
    onDoubleClick(timeFromMinutes(snapMinutes(start + ratio * (end - start), step)))
  }

  return (
    <div className={`timeline-lane ${className ?? ''}`} style={{ minHeight: height }} onDoubleClick={handleDoubleClick}>
      <div className="lane-grid-lines" />
      {currentTimeMarker ? (
        <span
          className="timeline-now-marker timeline-now-lane"
          style={{ left: `${currentTimeMarker.left}%` }}
          data-tooltip={currentTimeMarker.tooltip}
          title={currentTimeMarker.tooltip}
        />
      ) : null}
      {layout.length === 0 ? (
        <span className={`lane-empty ${readOnly ? 'lane-empty-readonly' : ''}`}>
          {readOnly ? null : <Plus size={14} />} {emptyLabel}
        </span>
      ) : null}
      {layout.map(({ item, lane }) => {
        const range = getItemRange(item, viewStartTime, viewEndTime)
        return (
          <div
            className="timeline-block-wrap"
            style={{
              left: `${range.left}%`,
              width: `${range.width}%`,
              top: lane * laneStep + 7,
              height: blockHeight,
            }}
            key={item.id}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {renderItem(item)}
          </div>
        )
      })}
    </div>
  )
}

function TimelineRoleLane({
  role,
  tasks,
  expanded,
  precision,
  viewStartTime,
  viewEndTime,
  onToggle,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  currentTimeMarker,
  readOnly,
  structureReadOnly,
  isOwnTask,
}: {
  role: TeamRole
  tasks: TimelineTask[]
  expanded: boolean
  precision: TimelinePrecision
  viewStartTime: string
  viewEndTime: string
  onToggle: () => void
  onCreateTask: (role: TeamRole, time: string) => void
  onEditTask: (task: TimelineTask) => void
  onDeleteTask?: (task: TimelineTask) => void
  currentTimeMarker?: CurrentTimeMarker | null
  readOnly?: boolean
  structureReadOnly?: boolean
  isOwnTask: (task: TimelineTask) => boolean
}) {
  const confirmDeleteTask = (task: TimelineTask) => {
    if (window.confirm(`确认删除“${task.content}”？`)) {
      onDeleteTask?.(task)
    }
  }

  return (
    <>
      <TimelineRowLabel label={role} expanded={expanded} onToggle={onToggle} className="role-label" />
      <TimelineLane
        items={tasks}
        precision={precision}
        viewStartTime={viewStartTime}
        viewEndTime={viewEndTime}
        emptyLabel={readOnly || structureReadOnly ? `${role}暂无分配` : `双击新增${role}任务`}
        blockHeight={expanded ? TASK_BLOCK_HEIGHT + 76 : TASK_BLOCK_HEIGHT}
        onDoubleClick={(time) => onCreateTask(role, time)}
        currentTimeMarker={currentTimeMarker}
        readOnly={readOnly || structureReadOnly}
        renderItem={(task) => (
          <button
            className={`timeline-block task-block status-${task.status} ${isOwnTask(task) ? 'task-block-mine' : ''} ${readOnly ? 'timeline-block-readonly' : ''}`}
            type="button"
            onClick={() => {
              if (!readOnly) onEditTask(task)
            }}
            onContextMenu={(event) => {
              if (readOnly || structureReadOnly) return
              event.preventDefault()
              if (onDeleteTask) confirmDeleteTask(task)
            }}
          >
            {isOwnTask(task) ? <span className="my-task-badge">我的任务</span> : null}
            <span className="block-title">{task.content}</span>
            <span className="block-subtitle">
              {task.startTime}-{task.endTime}
              {precision !== 'hour' ? ` · ${task.status}` : ''}
            </span>
            {precision === 'quarter' || precision === 'fiveMinute' ? <span className="block-detail">{task.personName}</span> : null}
            {precision === 'fiveMinute' && taskIssueSummary(task, 'problem') ? (
              <span className="block-detail">问题：{taskIssueSummary(task, 'problem')}</span>
            ) : null}
            {expanded && task.note ? <span className="block-detail">备注：{task.note}</span> : null}
          </button>
        )}
      />
    </>
  )
}

function getCurrentMinute(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function buildVisualMinorTicks(viewStartTime: string, viewEndTime: string, precision: TimelinePrecision, majorTicks: string[]): string[] {
  const step = precision === 'hour' ? 30 : precision === 'quarter' ? 15 : 0
  if (!step) return []

  const start = minutesFromTime(viewStartTime)
  const end = minutesFromTime(viewEndTime)
  const majorTickSet = new Set(majorTicks)
  const minorTicks: string[] = []

  for (let current = Math.ceil(start / step) * step; current < end; current += step) {
    const tick = timeFromMinutes(current)
    if (current > start && !majorTickSet.has(tick)) {
      minorTicks.push(tick)
    }
  }

  return minorTicks
}

function buildCurrentTimeMarker(
  date: string | undefined,
  currentMinute: number,
  viewStartTime: string,
  viewEndTime: string,
  tasks: TimelineTask[],
): CurrentTimeMarker | null {
  if (date !== todayISO()) return null

  const viewStart = minutesFromTime(viewStartTime)
  const viewEnd = minutesFromTime(viewEndTime)
  if (currentMinute < viewStart || currentMinute > viewEnd) return null

  const viewDuration = Math.max(1, viewEnd - viewStart)
  const time = timeFromMinutes(currentMinute)
  const activeTasks = tasks.filter((task) => {
    const taskStart = minutesFromTime(task.startTime)
    const taskEnd = minutesFromTime(task.endTime)
    return taskStart <= currentMinute && currentMinute < taskEnd
  })
  const taskText =
    activeTasks.length > 0
      ? activeTasks
          .slice(0, 3)
          .map((task) => `${task.role}：${task.content}`)
          .join(' / ')
      : '暂无进行中任务'

  return {
    left: ((currentMinute - viewStart) / viewDuration) * 100,
    time,
    tooltip: `${time} · ${taskText}`,
  }
}

interface EventDisplayItem extends WorkEvent {
  sourceEvent: WorkEvent
}

function groupEventsForOverview(events: WorkEvent[]): EventDisplayItem[] {
  const grouped = new Map<string, WorkEvent[]>()
  events.forEach((event) => {
    grouped.set(event.name, [...(grouped.get(event.name) ?? []), event])
  })

  return [...grouped.entries()]
    .map(([name, group]) => {
      const sorted = [...group].sort((a, b) => minutesFromTime(a.startTime) - minutesFromTime(b.startTime))
      const startTime = sorted.reduce((earliest, event) => (minutesFromTime(event.startTime) < minutesFromTime(earliest) ? event.startTime : earliest), sorted[0].startTime)
      const endTime = sorted.reduce((latest, event) => (minutesFromTime(event.endTime) > minutesFromTime(latest) ? event.endTime : latest), sorted[0].endTime)
      return {
        ...sorted[0],
        id: `event-group-${name}`,
        name,
        startTime,
        endTime,
        sourceEvent: sorted[0],
      }
    })
    .sort((a, b) => minutesFromTime(a.startTime) - minutesFromTime(b.startTime))
}

function getStableEventLaneMap(events: WorkEvent[]): Map<string, number> {
  const rangesByName = new Map<string, { start: number; end: number }>()
  events.forEach((event) => {
    const start = minutesFromTime(event.startTime)
    const end = minutesFromTime(event.endTime)
    const current = rangesByName.get(event.name)
    if (!current) {
      rangesByName.set(event.name, { start, end })
    } else {
      rangesByName.set(event.name, {
        start: Math.min(current.start, start),
        end: Math.max(current.end, end),
      })
    }
  })

  const preferredPattern = [0, 1, 2, 1]
  const laneRanges: Array<Array<{ start: number; end: number }>> = [[], [], []]
  const laneMap = new Map<string, number>()

  ;[...rangesByName.entries()]
    .sort(([nameA, rangeA], [nameB, rangeB]) => rangeA.start - rangeB.start || nameA.localeCompare(nameB, 'zh-CN'))
    .forEach(([name, range], index) => {
      const preferredLane = preferredPattern[index % preferredPattern.length]
      const laneOrder = [preferredLane, 0, 1, 2].filter((lane, laneIndex, lanes) => lanes.indexOf(lane) === laneIndex)
      const availableLane = laneOrder.find((lane) => laneRanges[lane].every((item) => item.end <= range.start || item.start >= range.end))
      const lane = availableLane ?? preferredLane
      laneRanges[lane].push(range)
      laneMap.set(name, lane)
    })

  return laneMap
}

function TimelineRowLabel({
  label,
  expanded,
  className,
  onToggle,
}: {
  label: string
  expanded: boolean
  className?: string
  onToggle: () => void
}) {
  return (
    <div className={`timeline-label timeline-row-label ${className ?? ''}`}>
      <span>{label}</span>
      <button className="row-expand-button" type="button" onClick={onToggle} aria-label={`${expanded ? '收起' : '展开'}${label}行`}>
        {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  )
}

function layoutByStableGroup<T extends { startTime: string; endTime: string }>(items: T[], getLaneKey: (item: T) => string, stableLaneMap?: Map<string, number>) {
  const groupStarts = new Map<string, number>()

  items.forEach((item) => {
    const key = getLaneKey(item)
    const start = minutesFromTime(item.startTime)
    const existingStart = groupStarts.get(key)
    if (existingStart === undefined || start < existingStart) {
      groupStarts.set(key, start)
    }
  })

  const groupOrder = [...groupStarts.entries()]
    .sort(([nameA, startA], [nameB, startB]) => startA - startB || nameA.localeCompare(nameB, 'zh-CN'))
    .map(([name]) => name)
  const laneByGroup = stableLaneMap ?? new Map(groupOrder.map((name, index) => [name, index]))

  return [...items]
    .sort((a, b) => {
      const groupDiff = (laneByGroup.get(getLaneKey(a)) ?? 0) - (laneByGroup.get(getLaneKey(b)) ?? 0)
      return groupDiff || minutesFromTime(a.startTime) - minutesFromTime(b.startTime)
    })
    .map((item) => ({
      item,
      lane: laneByGroup.get(getLaneKey(item)) ?? 0,
    }))
}
