import { useState } from 'react'
import { normalizeCompactTimeInput } from '../utils'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  ariaLabel?: string
}

export function TimeInput({ value, onChange, readOnly = false, ariaLabel }: TimeInputProps) {
  const [draftState, setDraftState] = useState({ sourceValue: value, draft: value })
  const draft = draftState.sourceValue === value ? draftState.draft : value
  const setDraft = (nextDraft: string) => setDraftState({ sourceValue: value, draft: nextDraft })

  const updateDraft = (input: string) => {
    const digits = input.replace(/\D/g, '').slice(0, 4)
    let nextDraft: string

    if (digits.length <= 1) {
      nextDraft = digits
    } else if (digits.length <= 2) {
      nextDraft = `${digits}:`
    } else {
      nextDraft = `${digits.slice(0, 2)}:${digits.slice(2)}`
    }

    setDraft(nextDraft)
    const normalized = normalizeCompactTimeInput(nextDraft)
    if (digits.length === 4 && normalized) {
      onChange(normalized)
    }
  }

  const commit = () => {
    if (readOnly) {
      setDraft(value)
      return
    }
    const normalized = normalizeCompactTimeInput(draft)
    if (normalized) {
      setDraft(normalized)
      onChange(normalized)
    } else {
      setDraft(value)
    }
  }

  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      maxLength={5}
      placeholder="0845"
      readOnly={readOnly}
      value={draft}
      onBlur={commit}
      onChange={(event) => updateDraft(event.target.value)}
    />
  )
}
