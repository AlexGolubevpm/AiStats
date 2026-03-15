'use client'

import { CalendarDays } from 'lucide-react'
import * as Select from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { usePeriod, periodOptions } from '@/hooks/use-period'

export function PeriodSelector() {
  const { period, setPeriod } = usePeriod()

  return (
    <Select.Root value={period} onValueChange={setPeriod}>
      <Select.Trigger className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] outline-none">
        <CalendarDays className="h-4 w-4 text-[var(--color-text-muted)]" />
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-lg)]"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {periodOptions.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] outline-none data-[highlighted]:bg-[var(--color-background)] data-[state=checked]:font-medium data-[state=checked]:text-[var(--color-accent)]"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="h-3 w-3" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
