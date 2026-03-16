'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { usePeriod, periodOptions } from '@/hooks/use-period'

export function PeriodSelector() {
  const { period, setPeriod, customFrom, customTo, setCustomRange } = usePeriod()
  const [localFrom, setLocalFrom] = useState(customFrom)
  const [localTo, setLocalTo] = useState(customTo)

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    if (value !== 'custom') {
      setLocalFrom('')
      setLocalTo('')
    }
  }

  const handleApplyCustomRange = () => {
    if (localFrom && localTo) {
      setCustomRange(localFrom, localTo)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[160px]">
          <CalendarDays className="mr-1.5 h-4 w-4 text-[var(--color-text-muted)]" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
          />
          <span className="text-sm text-[var(--color-text-muted)]">to</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
          />
          <button
            onClick={handleApplyCustomRange}
            disabled={!localFrom || !localTo}
            className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
