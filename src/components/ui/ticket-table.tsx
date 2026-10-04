import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Таблица-талон: пунктирные разделители, шапка 12 / 500, числа mono справа,
 * наведение — `green-t`, итоговая строка 600 без разделителя.
 */
function TicketTable({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="ticket-table"
      className={cn("w-full border-collapse text-[14px]", className)}
      {...props}
    />
  )
}

function TicketTableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("sticky top-0 z-10 bg-ticket", className)} {...props} />
}

function TicketTableRow({
  className,
  total = false,
  ...props
}: React.ComponentProps<"tr"> & { total?: boolean }) {
  return (
    <tr
      data-slot="ticket-table-row"
      className={cn(
        "hover:bg-primary-tint [&>td]:border-b [&>td]:border-dashed [&>td]:border-perf",
        total && "font-semibold hover:bg-transparent [&>td]:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TicketTableHead({
  className,
  numeric = false,
  ...props
}: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      data-slot="ticket-table-head"
      className={cn(
        "border-b border-dashed border-perf px-1.5 pb-1.5 text-[12px] font-medium whitespace-nowrap text-ink-2",
        numeric ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  )
}

function TicketTableCell({
  className,
  numeric = false,
  ...props
}: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      data-slot="ticket-table-cell"
      className={cn(
        "h-[38px] px-1.5",
        numeric ? "tabular text-right text-[14px] font-medium" : "text-left",
        className
      )}
      {...props}
    />
  )
}

export {
  TicketTable,
  TicketTableHeader,
  TicketTableRow,
  TicketTableHead,
  TicketTableCell,
}
