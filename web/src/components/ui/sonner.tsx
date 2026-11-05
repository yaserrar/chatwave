import { Toaster as Sonner, type ToasterProps } from "sonner"
import { TickCircle, InfoCircle, Warning2, CloseCircle } from "iconsax-react"
import { useTheme } from "~/hooks/use-theme"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: <TickCircle className="size-4 text-success" />,
        info: <InfoCircle className="size-4 text-info" />,
        warning: <Warning2 className="size-4 text-warning" />,
        error: <CloseCircle className="size-4 text-danger" />,
        loading: (
          <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
