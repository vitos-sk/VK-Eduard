"use client"

import dynamic from "next/dynamic"

/**
 * Календарь (react-day-picker) нужен только после нажатия на дату, поэтому
 * не входит в основной бандл экрана — подгружается отдельным куском.
 * `preloadCalendar()` подтягивает этот кусок заранее, в простое: так он оказывается
 * и в кэше сервис-воркера, и календарь открывается без интернета.
 */
export const LazyCalendar = dynamic(
  () => import("@/components/ui/calendar").then((module) => module.Calendar),
  { ssr: false }
)

export function preloadCalendar(): void {
  void import("@/components/ui/calendar")
}
