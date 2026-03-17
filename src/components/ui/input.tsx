"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:border-[var(--color-primary-500)] focus-visible:shadow-[var(--shadow-glow-primary)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
