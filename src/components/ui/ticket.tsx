import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * Талон — основной элемент дизайна: рамка 1 px, радиус 10, без тени.
 * Состав: `TicketStub` (корешок) + `TicketBody` + `TicketFoot`.
 *
 * - `default` — корешок слева, тело справа, футер снизу;
 * - `notch` — как default + два полукруга на границе корешка (только дневной талон на главной);
 * - `flat` — без корешка, отступы 12×14 (списки объектов, формы);
 * - `sections` — без внешних отступов: секции (`TicketSection`) разделены пунктиром.
 */
const ticketVariants = cva(
  "relative rounded-card border border-edge bg-ticket text-text [--ticket-stub:var(--stub-w)]",
  {
    variants: {
      variant: {
        default:
          "flex flex-wrap [&:has([data-slot=ticket-foot])_[data-slot=ticket-stub]]:rounded-bl-none",
        notch:
          "flex flex-wrap [&:has([data-slot=ticket-foot])_[data-slot=ticket-stub]]:rounded-bl-none before:absolute before:-top-2 before:left-(--ticket-stub) before:size-3.5 before:-translate-x-1/2 before:rounded-full before:border before:border-edge before:bg-paper before:content-[''] after:absolute after:-bottom-2 after:left-(--ticket-stub) after:size-3.5 after:-translate-x-1/2 after:rounded-full after:border after:border-edge after:bg-paper after:content-['']",
        flat: "block px-3.5 py-3",
        sections: "block",
      },
      compact: {
        true: "[--ticket-stub:var(--stub-w-compact)]",
      },
      interactive: {
        true: "cursor-pointer transition-colors outline-none hover:bg-primary-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Ticket({
  className,
  variant,
  compact,
  interactive,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof ticketVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="ticket"
      className={cn(ticketVariants({ variant, compact, interactive }), className)}
      {...props}
    />
  )
}

/** Корешок: фон `stub`, слева скруглён, справа перфорация. */
function TicketStub({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ticket-stub"
      className={cn(
        "flex w-(--ticket-stub) shrink-0 flex-col items-center justify-center gap-0.5 rounded-l-[9px] border-r border-dashed border-perf bg-stub py-2.5",
        className
      )}
      {...props}
    />
  )
}

function TicketBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ticket-body"
      className={cn("min-w-0 flex-1 px-3.5 py-3", className)}
      {...props}
    />
  )
}

/** Футер: сверху пунктир, отступы 10×14×12, колонка с отступом 10. */
function TicketFoot({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ticket-foot"
      className={cn(
        "flex w-full basis-full flex-col gap-2.5 border-t border-dashed border-perf px-3.5 pt-2.5 pb-3",
        className
      )}
      {...props}
    />
  )
}

/** Секция внутри `Ticket variant="sections"`: пунктир сверху у всех, кроме первой. */
function TicketSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="ticket-section"
      className={cn(
        "px-3.5 py-2.5 not-first:border-t not-first:border-dashed not-first:border-perf",
        className
      )}
      {...props}
    />
  )
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value
  }

  const [year, month, day] = value.split("-").map(Number)

  return new Date(year, month - 1, day)
}

/** Содержимое корешка-даты: день недели, число (mono), месяц. */
function DateStub({
  date,
  compact = false,
  showMonth = true,
  className,
}: {
  /** `Date` или `YYYY-MM-DD`. */
  date: Date | string
  compact?: boolean
  showMonth?: boolean
  className?: string
}) {
  const value = toDate(date)

  return (
    <TicketStub className={className}>
      <span className="text-[12px] font-medium text-ink-2">
        {t.weekdays.short[value.getDay()]}
      </span>
      <span
        className={cn(
          "tabular leading-none font-semibold",
          compact ? "text-[18px]" : "text-[30px]"
        )}
      >
        {value.getDate()}
      </span>
      {showMonth && !compact && (
        <span className="text-[12px] font-medium text-ink-2">
          {t.months.short[value.getMonth()]}
        </span>
      )}
    </TicketStub>
  )
}

export {
  Ticket,
  TicketStub,
  TicketBody,
  TicketFoot,
  TicketSection,
  DateStub,
  ticketVariants,
}
