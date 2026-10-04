import Link from "next/link"
import * as React from "react"

import { CardPhoto } from "@/components/ui/card-photo"
import { StatusLabel } from "@/components/ui/status-label"
import { Ticket } from "@/components/ui/ticket"
import type { WorkStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ObjectTicketProps {
  name: string
  /** Подпись под названием: «демо» или вид работ. */
  caption?: string
  status: WorkStatus
  href?: string
  /** Фото объекта (подписанная ссылка); `null` — рамка-заглушка. */
  photoUrl?: string | null
  /** `row` — фото справа вплотную к рамке; `stack` — узкая карточка, фото сверху. */
  layout?: "row" | "stack"
  /** Оставить справа место под кнопку-меню поверх карточки (шеф). */
  reserveMenuSpace?: boolean
  /** Подпись «Архів» вместо статуса. */
  archivedLabel?: string
  className?: string
}

/** Плоский талон объекта: название 14 / 500, подпись 12, статус капсом и горизонтальное фото. */
function ObjectTicket({
  name,
  caption,
  status,
  href,
  photoUrl = null,
  layout = "row",
  reserveMenuSpace = false,
  archivedLabel,
  className,
}: ObjectTicketProps) {
  const isStack = layout === "stack"

  const content = (
    <>
      {isStack && (
        <CardPhoto
          src={photoUrl}
          className="-mx-3.5 -mt-3 mb-2 h-16 w-auto self-auto border-b border-l-0"
        />
      )}
      <span className={cn("min-w-0 flex-1", reserveMenuSpace && "pr-9")}>
        <span className="block truncate text-[14px] leading-snug font-medium">{name}</span>
        {caption && <span className="block truncate text-[12px] text-ink-2">{caption}</span>}
        {archivedLabel ? (
          <span className="mt-1 block text-[12px] font-semibold tracking-[0.04em] text-ink-2 uppercase">
            {archivedLabel}
          </span>
        ) : (
          <StatusLabel status={status} className="mt-1 block" />
        )}
      </span>
      {!isStack && <CardPhoto src={photoUrl} className="-my-3 -mr-3.5" />}
    </>
  )

  const classes = cn(
    "overflow-hidden",
    isStack ? "flex flex-col" : "flex items-center gap-3",
    className
  )

  if (href) {
    return (
      <Ticket asChild variant="flat" interactive className={classes}>
        <Link href={href}>{content}</Link>
      </Ticket>
    )
  }

  return (
    <Ticket variant="flat" className={classes}>
      {content}
    </Ticket>
  )
}

export { ObjectTicket }
