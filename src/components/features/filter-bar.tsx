'use client'

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useFilters } from '@/hooks/use-filters'
import { X } from 'lucide-react'

const BUNDLES = [
  { value: 'gays', label: 'Gays' },
  { value: 'trans', label: 'Trans' },
  { value: 'jav', label: 'JAV' },
  { value: 'hentai', label: 'Hentai' },
]

const FORMATS = [
  { value: 'POP', label: 'POP' },
  { value: 'PUSH', label: 'PUSH' },
  { value: 'BANNER', label: 'Banner' },
  { value: 'SLIDER', label: 'Slider' },
  { value: 'OUTSTREAM', label: 'Outstream' },
  { value: 'VAST', label: 'VAST' },
]

const TIERS = [
  { value: 'TIER_1', label: 'Tier 1' },
  { value: 'TIER_2', label: 'Tier 2' },
  { value: 'TIER_3', label: 'Tier 3' },
  { value: 'TIER_4', label: 'Tier 4' },
]

interface FilterBarProps {
  showBundle?: boolean
  showFormat?: boolean
  showTier?: boolean
}

export function FilterBar({ showBundle = true, showFormat = false, showTier = false }: FilterBarProps) {
  const { filters, setFilter, clearFilters } = useFilters()
  const hasFilters = filters.bundleId || filters.format || filters.tier

  return (
    <div className="flex items-center gap-3">
      {showBundle && (
        <Select value={filters.bundleId || ''} onValueChange={(v) => setFilter('bundleId', v || undefined)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Bundles" />
          </SelectTrigger>
          <SelectContent>
            {BUNDLES.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showFormat && (
        <Select value={filters.format || ''} onValueChange={(v) => setFilter('format', v || undefined)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showTier && (
        <Select value={filters.tier || ''} onValueChange={(v) => setFilter('tier', v || undefined)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            {TIERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
