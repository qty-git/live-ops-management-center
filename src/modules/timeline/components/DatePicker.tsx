import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, formatDateISO, parseISODate, todayISO } from '../utils'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  hasRecord: (date: string) => boolean
  maxDate?: string
}

export function DatePicker({ value, onChange, hasRecord, maxDate = todayISO() }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value))
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', closeOnOutsideClick)
    return () => window.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  const visibleDate = parseISODate(visibleMonth)
  const maxMonth = startOfMonth(maxDate)
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const canGoNextMonth = addMonths(visibleMonth, 1) <= maxMonth

  const selectDate = (date: string) => {
    if (date > maxDate) return
    setVisibleMonth(startOfMonth(date))
    onChange(date)
    setOpen(false)
  }

  return (
    <div className="date-picker" ref={rootRef}>
      <button
        className="date-picker-trigger"
        type="button"
        onClick={() => {
          setVisibleMonth(startOfMonth(value))
          setOpen((current) => !current)
        }}
      >
        <span>{value.replaceAll('-', '/')}</span>
        <CalendarDays size={18} />
      </button>
      {open ? (
        <div className="date-picker-popover">
          <div className="date-picker-header">
            <button className="icon-button" type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} aria-label="上个月">
              <ChevronLeft size={17} />
            </button>
            <strong>
              {visibleDate.getFullYear()}年{String(visibleDate.getMonth() + 1).padStart(2, '0')}月
            </strong>
            <button
              className="icon-button"
              type="button"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              aria-label="下个月"
              disabled={!canGoNextMonth}
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="date-picker-weekdays">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="date-picker-days">
            {days.map((date) => {
              const inCurrentMonth = startOfMonth(date) === visibleMonth
              const isFuture = date > maxDate
              const isSelected = date === value
              const isToday = date === maxDate
              const record = hasRecord(date)

              return (
                <button
                  className={[
                    'date-picker-day',
                    inCurrentMonth ? '' : 'date-picker-day-outside',
                    record ? 'date-picker-day-recorded' : 'date-picker-day-empty',
                    isSelected ? 'date-picker-day-selected' : '',
                    isToday ? 'date-picker-day-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  type="button"
                  onClick={() => selectDate(date)}
                  disabled={isFuture}
                  key={date}
                >
                  <span>{Number(date.slice(8, 10))}</span>
                </button>
              )
            })}
          </div>

          <div className="date-picker-legend">
            <span className="legend-recorded">有记录</span>
            <span className="legend-empty">无记录</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function startOfMonth(dateISO: string): string {
  const date = parseISODate(dateISO)
  return formatDateISO(new Date(date.getFullYear(), date.getMonth(), 1))
}

function addMonths(dateISO: string, months: number): string {
  const date = parseISODate(dateISO)
  return formatDateISO(new Date(date.getFullYear(), date.getMonth() + months, 1))
}

function buildCalendarDays(monthISO: string): string[] {
  const monthStart = parseISODate(monthISO)
  const firstVisibleDate = addDays(formatDateISO(monthStart), -monthStart.getDay())
  return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDate, index))
}
