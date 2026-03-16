import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:shadow-[var(--shadow-glow-primary)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-600)] text-white",
        secondary:
          "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
        destructive:
          "bg-[var(--color-danger-bg)] text-[var(--color-danger-dark)]",
        outline:
          "border border-[var(--color-border-default)] text-[var(--color-text-secondary)]",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success-dark)]",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)]",
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
