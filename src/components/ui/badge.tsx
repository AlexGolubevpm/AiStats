import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-sm)] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-white",
        secondary:
          "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
        destructive:
          "bg-red-100 text-red-700",
        outline:
          "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
        success:
          "bg-emerald-100 text-emerald-700",
        warning:
          "bg-amber-100 text-amber-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
