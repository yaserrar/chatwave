import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"
import { Slot } from "radix-ui"

/**
 * Dub shape language: 8px radius, 38px tall (36 in dense UI), black primary (white in dark mode),
 * white secondary with a hairline border, very soft shadow. `chevron` appends a trailing "›".
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/85",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-xs hover:border-border-strong hover:bg-subtle aria-expanded:bg-subtle",
        outline:
          "border-border bg-surface text-foreground shadow-xs hover:border-border-strong hover:bg-subtle aria-expanded:bg-subtle dark:bg-transparent dark:hover:bg-accent",
        ghost:
          "text-ink-2 hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "h-auto! px-0! text-brand-ink underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9.5 gap-2 px-4 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-[13px] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-11 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9.5",
        "icon-xs":
          "size-7 rounded-sm in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-8 in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-11",
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
  variant = "default",
  size = "default",
  asChild = false,
  chevron = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Trailing "›" chevron ("Learn more ›"). */
    chevron?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  // Typographic "›", not an icon; mirrored in RTL.
  const trailing = chevron ? (
    <span
      data-icon="inline-end"
      aria-hidden
      className="-mt-px inline-block text-[1.15em] leading-none opacity-80 transition-transform group-hover/button:translate-x-0.5 rtl:-scale-x-100"
    >
      ›
    </span>
  ) : null

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {trailing}
    </Comp>
  )
}

export { Button, buttonVariants }
