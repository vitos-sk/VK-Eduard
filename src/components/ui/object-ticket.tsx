import Link from "next/link"
import * as React from "react"

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
  /** Миниатюра (SVG-сцена или фото) слева от текста. */
  thumb?: React.ReactNode
  /** Правый край: шеврон или метка. */
  trailing?: React.ReactNode
  className?: string
}

/** Плоский талон объекта: название 14 / 500, подпись 12, статус капсом. */
function ObjectTicket({
  name,
  caption,
  status,
  href,
  thumb,
  trailing,
  className,
}: ObjectTicketProps) {
  const content = (
    <>
      {thumb}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] leading-snug font-medium">{name}</span>
        {caption && (
          <span className="block truncate text-[12px] text-ink-2">{caption}</span>
        )}
        <StatusLabel status={status} className="mt-1 block" />
      </span>
      {trailing}
    </>
  )

  if (href) {
    return (
      <Ticket asChild variant="flat" interactive className={cn("flex items-center gap-3", className)}>
        <Link href={href}>{content}</Link>
      </Ticket>
    )
  }

  return (
    <Ticket variant="flat" className={cn("flex items-center gap-3", className)}>
      {content}
    </Ticket>
  )
}

export { ObjectTicket }
