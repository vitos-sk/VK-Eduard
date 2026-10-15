"use client";

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Collapsible } from "radix-ui"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Строка-«гармошка» внутри талона `Ticket variant="flat"`: тонкая (40 px) строка
 * с краткой сводкой, по нажатию раскрывается панель с деталями и действиями.
 * Строки лежат в `<ul>` с отрицательными боковыми отступами талона (`-mx-3.5`) —
 * пунктир сверху идёт от края до края, как перфорация.
 *
 * `summary` — содержимое строки (дата, имя, время, часы); стрелка добавляется сама.
 * `children` — раскрытая панель.
 */
function TicketRow({
  summary,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible.Root>, "asChild"> & {
  summary: React.ReactNode
}) {
  return (
    <Collapsible.Root asChild {...props}>
      <li
        data-slot="ticket-row"
        className={cn("border-t border-dashed border-perf", className)}
      >
        <Collapsible.Trigger asChild>
          <Button
            variant="bare"
            size="bare"
            block
            className="group h-10 gap-2.5 px-3.5 text-[14px] hover:bg-primary-tint"
          >
            {summary}
            <ChevronDown
              className="size-4 text-ink-2 transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content className="px-3.5 pb-3">{children}</Collapsible.Content>
      </li>
    </Collapsible.Root>
  )
}

export { TicketRow }
