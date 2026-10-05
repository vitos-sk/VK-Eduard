"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/**
 * Toast: внизу над таб-баром, талон без тени. Одна необязательная дія («Скасувати»).
 * Тема светлая единственная, поэтому `next-themes` не нужен.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />,
      }}
      mobileOffset={{ bottom: "calc(60px + 12px + env(safe-area-inset-bottom))" }}
      offset={{ bottom: "24px" }}
      style={
        {
          "--normal-bg": "var(--ticket)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--edge)",
          "--border-radius": "var(--r-card)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !shadow-none !font-sans !text-[14px] !font-medium",
          actionButton: "!bg-primary !text-on-primary !rounded-ctl !font-semibold",
          cancelButton: "!bg-stub !text-ink !rounded-ctl",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
