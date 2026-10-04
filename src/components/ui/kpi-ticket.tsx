import type { LucideIcon } from "lucide-react"

import { Ticket, TicketBody, TicketStub } from "@/components/ui/ticket"
import { cn } from "@/lib/utils"

interface KpiTicketProps {
  label: string
  value: string
  icon: LucideIcon
  /** `warn` — иконка и цифра цвета предупреждения («Годин без об'єкта»). */
  tone?: "default" | "warn"
  className?: string
}

/** KPI дашборда: корешок 76 px с иконкой, подпись 13 px и цифра mono 30 / 600. */
function KpiTicket({ label, value, icon: Icon, tone = "default", className }: KpiTicketProps) {
  return (
    <Ticket className={cn("[--ticket-stub:var(--stub-w-kpi)]", className)}>
      <TicketStub className={tone === "warn" ? "text-warn" : "text-primary"}>
        <Icon className="size-5" strokeWidth={1.9} aria-hidden />
      </TicketStub>
      <TicketBody>
        <p className="text-[13px] text-ink-2">{label}</p>
        <p
          className={cn(
            "tabular mt-1 text-[30px] leading-tight font-semibold whitespace-nowrap",
            tone === "warn" && "text-warn"
          )}
        >
          {value}
        </p>
      </TicketBody>
    </Ticket>
  )
}

export { KpiTicket }
