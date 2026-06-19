import { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { clamp, getPrecision, minutesFromTime, precisionLabel, timeFromMinutes } from '../utils'

interface TimeRangeSliderProps {
  workStartTime: string
  actualEndTime: string
  viewStartTime: string
  viewEndTime: string
  onChange: (range: { viewStartTime: string; viewEndTime: string }) => void
}

type DragMode = 'move' | 'left' | 'right'
const HORIZONTAL_WHEEL_RATIO = 1.25
const MIN_HORIZONTAL_WHEEL_DELTA = 4
const MIN_VIEW_DURATION = 15

export function TimeRangeSlider({
  workStartTime,
  actualEndTime,
  viewStartTime,
  viewEndTime,
  onChange,
}: TimeRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const wheelRemainderRef = useRef(0)
  const [drag, setDrag] = useState<{ mode: DragMode; startX: number; startViewStart: number; startViewEnd: number } | null>(null)

  const bounds = useMemo(() => {
    const min = minutesFromTime(workStartTime)
    const max = Math.max(min + 30, minutesFromTime(actualEndTime))
    const range = constrainRange(minutesFromTime(viewStartTime), minutesFromTime(viewEndTime), min, max)

    return {
      min,
      max,
      start: range.start,
      end: range.end,
    }
  }, [actualEndTime, viewEndTime, viewStartTime, workStartTime])

  const total = Math.max(1, bounds.max - bounds.min)
  const left = clamp(((bounds.start - bounds.min) / total) * 100, 0, 100)
  const width = clamp(((bounds.end - bounds.start) / total) * 100, 0, 100 - left)
  const precision = getPrecision(timeFromMinutes(bounds.start), timeFromMinutes(bounds.end))
  const ticks = buildSliderTicks(bounds.min, bounds.max)

  useEffect(() => {
    if (!drag) return

    const handleMove = (event: PointerEvent) => {
      const track = trackRef.current
      if (!track) return
      const pixels = track.getBoundingClientRect().width || 1
      const deltaMinutes = Math.round(((event.clientX - drag.startX) / pixels) * total)
      let nextStart = drag.startViewStart
      let nextEnd = drag.startViewEnd

      if (drag.mode === 'move') {
        const nextRange = constrainMovedRange(drag.startViewStart, drag.startViewEnd, deltaMinutes, bounds.min, bounds.max)
        nextStart = nextRange.start
        nextEnd = nextRange.end
      }

      if (drag.mode === 'left') {
        nextStart = clamp(drag.startViewStart + deltaMinutes, bounds.min, drag.startViewEnd - MIN_VIEW_DURATION)
      }

      if (drag.mode === 'right') {
        nextEnd = clamp(drag.startViewEnd + deltaMinutes, drag.startViewStart + MIN_VIEW_DURATION, bounds.max)
      }

      const nextRange = constrainRange(nextStart, nextEnd, bounds.min, bounds.max)
      onChange({ viewStartTime: timeFromMinutes(nextRange.start), viewEndTime: timeFromMinutes(nextRange.end) })
    }

    const handleUp = () => setDrag(null)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [bounds.max, bounds.min, drag, onChange, total])

  const startDrag = (mode: DragMode) => (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDrag({
      mode,
      startX: event.clientX,
      startViewStart: bounds.start,
      startViewEnd: bounds.end,
    })
  }

  const moveWindow = (deltaMinutes: number) => {
    const nextRange = constrainMovedRange(bounds.start, bounds.end, deltaMinutes, bounds.min, bounds.max)
    onChange({ viewStartTime: timeFromMinutes(nextRange.start), viewEndTime: timeFromMinutes(nextRange.end) })
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const absX = Math.abs(event.deltaX)
    const absY = Math.abs(event.deltaY)
    const horizontalDelta =
      absX > MIN_HORIZONTAL_WHEEL_DELTA && absX > absY * HORIZONTAL_WHEEL_RATIO ? event.deltaX : event.shiftKey && absY > MIN_HORIZONTAL_WHEEL_DELTA ? event.deltaY : 0
    if (!horizontalDelta) return

    event.preventDefault()
    const trackWidth = trackRef.current?.getBoundingClientRect().width || 1
    const rawDelta = wheelRemainderRef.current - (horizontalDelta / trackWidth) * total
    const deltaMinutes = rawDelta > 0 ? Math.floor(rawDelta) : Math.ceil(rawDelta)
    wheelRemainderRef.current = rawDelta - deltaMinutes
    if (deltaMinutes !== 0) {
      moveWindow(deltaMinutes)
    }
  }

  return (
    <section className="range-slider-panel" aria-label="当前查看范围">
      <div className="range-slider-meta">
        <span>
          完整工作时间：{workStartTime} - {actualEndTime}
        </span>
        <strong>
          当前查看：{viewStartTime} - {viewEndTime} · {precisionLabel(precision)}
        </strong>
      </div>
      <div className="range-slider" ref={trackRef} onWheel={handleWheel}>
        <div className="range-slider-track" />
        {ticks.map((tick) => {
          const tickLeft = ((tick.minutes - bounds.min) / total) * 100
          return (
            <span className={`range-slider-tick ${tick.label ? 'range-slider-tick-major' : 'range-slider-tick-minor'}`} style={{ left: `${tickLeft}%` }} key={tick.minutes}>
              {tick.label ? timeFromMinutes(tick.minutes) : ''}
            </span>
          )
        })}
        <div className="range-slider-window" style={{ left: `${left}%`, width: `${width}%` }} onPointerDown={startDrag('move')}>
          <button className="range-handle range-handle-left" type="button" aria-label="调整查看范围开始时间" onPointerDown={startDrag('left')}>
            <GripVertical size={14} />
          </button>
          <span className="range-window-label">
            {timeFromMinutes(bounds.start)}-{timeFromMinutes(bounds.end)}
          </span>
          <button className="range-handle range-handle-right" type="button" aria-label="调整查看范围结束时间" onPointerDown={startDrag('right')}>
            <GripVertical size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}

function constrainRange(start: number, end: number, min: number, max: number) {
  const safeMax = Math.max(min + MIN_VIEW_DURATION, max)
  const duration = clamp(Math.max(MIN_VIEW_DURATION, end - start), MIN_VIEW_DURATION, safeMax - min)
  const nextStart = clamp(start, min, safeMax - duration)

  return {
    start: nextStart,
    end: nextStart + duration,
  }
}

function constrainMovedRange(start: number, end: number, deltaMinutes: number, min: number, max: number) {
  const safeMax = Math.max(min + MIN_VIEW_DURATION, max)
  const duration = clamp(end - start, MIN_VIEW_DURATION, safeMax - min)
  const nextStart = clamp(start + deltaMinutes, min, safeMax - duration)

  return {
    start: nextStart,
    end: nextStart + duration,
  }
}

function buildSliderTicks(min: number, max: number) {
  const duration = max - min
  const labelStep = duration > 8 * 60 ? 120 : duration > 4 * 60 ? 60 : duration > 2 * 60 ? 30 : 15
  const minorStep = duration > 8 * 60 ? 30 : duration > 3 * 60 ? 15 : 5
  const first = Math.ceil(min / minorStep) * minorStep
  const ticks = new Map<number, boolean>()

  ticks.set(min, true)
  for (let current = first; current < max; current += minorStep) {
    ticks.set(current, current % labelStep === 0)
  }
  ticks.set(max, true)

  return [...ticks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minutes, label]) => ({ minutes, label }))
}
