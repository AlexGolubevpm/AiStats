'use client'

import { CalendarDays } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { usePeriod, periodOptions } from '@/hooks/use-period'

export function PeriodSelector() {
  const { period, setPeriod } = usePeriod()

  return (
    <Select value={period} onValueChange={setPeriod}>
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
  )
}
