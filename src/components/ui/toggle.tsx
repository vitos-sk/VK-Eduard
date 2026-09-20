"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="toggle"
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full bg-border-strong p-[3px] transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45 data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="toggle-thumb"
        className="pointer-events-none block size-6 rounded-full bg-surface shadow-sm transition-transform duration-200 data-checked:translate-x-5 data-checked:bg-on-primary"
      />
    </SwitchPrimitive.Root>
  )
}

export { Toggle }
