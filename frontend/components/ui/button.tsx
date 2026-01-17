import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 relative z-20 transition-premium backdrop-blur-lg",
  {
    variants: {
      variant: {
        default: "bg-primary/95 text-primary-foreground shadow-soft",
        destructive: "bg-destructive/95 text-destructive-foreground shadow-soft",
        outline: "border border-border bg-card/95 text-foreground shadow-soft",
        secondary: "bg-secondary/95 text-secondary-foreground shadow-soft",
        ghost: "bg-card/95",
        link: "text-primary underline-offset-4",
        premium: "bg-primary/95 text-primary-foreground shadow-soft-md",
        glass: "bg-card/95 border border-border text-foreground shadow-soft",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        xl: "h-14 px-10 text-lg font-semibold",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
