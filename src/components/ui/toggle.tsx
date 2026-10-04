"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/** Switch: прямоугольный, 40×22, радиус 5, ручка 16 px. Включён — зелёный. */
function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="toggle"
      className={cn(
        "relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-[5px] bg-switch-off p-[3px] transition-colors duration-150 outline-none before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="toggle-thumb"
        className="pointer-events-none block size-4 rounded-[3px] bg-on-primary transition-transform duration-150 data-checked:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Toggle }
