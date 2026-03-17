"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[var(--shadow-glow-primary)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-[var(--radius-control)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-600)] text-white shadow-[var(--shadow-xs)] hover:bg-[var(--color-primary-700)] hover:shadow-[var(--shadow-card)]",
        secondary:
          "border border-[var(--color-border-default)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-300)]",
        destructive:
          "bg-[var(--color-danger)] text-white shadow-[var(--shadow-xs)] hover:bg-[var(--color-danger-dark)]",
        ghost:
          "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
        outline:
          "border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:border-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]",
        link: "text-[var(--color-primary-600)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-[var(--radius-sm)]",
        lg: "h-11 px-8 text-base rounded-[var(--radius-card)]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
