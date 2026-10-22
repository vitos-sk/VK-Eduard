"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"

import { cn } from "@/lib/utils"
import { minutesToTime } from "@/modules/time/calc"
import {
  clampDrag,
  minuteAt,
  rulerWindow,
  snapStep,
  spreadBubbles,
  toPercent,
  wrapDay,
  type RulerWindow,
} from "@/modules/time/range"

type Handle = "start" | "end"

/** Половина ширины подсказки времени над краем (62 px + зазор). */
const BUBBLE_HALF = 33

/** Шаг стрелок ← → на краю; с Shift ×3, PageUp / PageDown — час. */
const KEY_STEP_MIN = 5

interface TimeRangeSliderProps {
  /** Начало и завершение, минуты от полуночи. Конец раньше начала — ночная смена: линейка показывает целые сутки. */
  start: number
  end: number
  /** Перерыв рисуется «окном» сразу после начала. */
  breakMinutes?: number
  /** Какой край сейчас выбран: его подсвечивают, и на него действуют кнопки зсуву. */
  selected: Handle
  onSelect: (handle: Handle) => void
  /** Край передвинули (перетаскиванием или стрелками): новое значение в минутах. */
  onChange: (handle: Handle, minute: number) => void
  label: string
  startLabel: string
  endLabel: string
  className?: string
}

/** Деления: каждые 0.5 ч, час — выше. Подписи — чётные часы. */
function Scale({ win }: { win: RulerWindow }) {
  const ticks: number[] = []
  const labels: number[] = []

  for (let minute = Math.ceil(win.from / 30) * 30; minute <= win.to; minute += 30) ticks.push(minute)
  for (let hour = 2; hour * 60 < win.to; hour += 2) if (hour * 60 > win.from) labels.push(hour)

  return (
    <>
      <div aria-hidden className="absolute inset-x-0 top-[50px] h-2">
        <div className="absolute inset-x-0 bottom-0 h-px bg-ink-2" />
        {ticks.map((minute) => (
          <i
            key={minute}
            className={cn("absolute bottom-0 w-px bg-ink-2", minute % 60 === 0 ? "h-2" : "h-[5px]")}
            style={{ left: `${toPercent(win, minute)}%` }}
          />
        ))}
      </div>
      {labels.map((hour) => (
        <span
          key={hour}
          aria-hidden
          className="tabular absolute top-[72px] -translate-x-1/2 text-[12px] whitespace-nowrap text-ink-2"
          style={{ left: `${toPercent(win, hour * 60)}%` }}
        >
          {String(hour).padStart(2, "0")}
        </span>
      ))}
    </>
  )
}

/**
 * Смена на линейке часов: зелёная полоса от начала до конца, перерыв — «окно» после начала, края можно тянуть.
 * Линейка — грубая настройка (шаг 15 минут на телефоне, 5 на широком экране); точность дают поля и кнопки рядом.
 * Края — `role="slider"`: ← → двигают на 5 минут, PageUp / PageDown — на час. Вертикальный жест прокручивает
 * страницу, горизонтальный тянет край. Шкала 05–21; ночная смена и время вне неё — целые сутки.
 */
function TimeRangeSlider({
  start,
  end,
  breakMinutes = 0,
  selected,
  onSelect,
  onChange,
  label,
  startLabel,
  endLabel,
  className,
}: TimeRangeSliderProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // Шкалу замораживаем на время перетаскивания: край не должен «прыгать» под пальцем, если смена вдруг влезла в 05–21.
  const [drag, setDrag] = useState<{ handle: Handle; win: RulerWindow } | null>(null)
  const win = drag?.win ?? rulerWindow(start, end)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const isNight = end < start
  const fills: [number, number][] = isNight
    ? [
        [start, win.to],
        [win.from, end],
      ]
    : [[start, end]]
  const breakEnd = Math.min(start + breakMinutes, isNight ? win.to : end)

  const percent = (minute: number) => toPercent(win, minute)
  const startX = (percent(start) / 100) * width
  const endX = (percent(end) / 100) * width
  const [startBubbleX, endBubbleX] = width > 0 ? spreadBubbles(startX, endX, width, BUBBLE_HALF) : [startX, endX]

  const minuteFromX = (clientX: number, frozen: RulerWindow) => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null

    return minuteAt(frozen, (clientX - rect.left) / rect.width, snapStep(rect.width / (frozen.to - frozen.from)))
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const frozen = rulerWindow(start, end)
    const minute = minuteFromX(event.clientX, frozen)
    if (minute === null) return

    const grabbed = (event.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle as Handle | undefined
    const handle = grabbed ?? (Math.abs(minute - start) <= Math.abs(minute - end) ? "start" : "end")

    setDrag({ handle, win: frozen })
    onSelect(handle)
    // Нажатие мимо края ставит ближайший край в эту точку; за сам край берут без рывка.
    if (!grabbed) onChange(handle, clampDrag(handle, minute, start, end, frozen))

    try {
      // Пока палец или мышь двигаются, события идут на линейку, даже когда курсор ушёл с неё.
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Указатель уже неактивен — тянуть всё равно можно, просто без захвата.
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag) return

    const minute = minuteFromX(event.clientX, drag.win)
    if (minute !== null) onChange(drag.handle, clampDrag(drag.handle, minute, start, end, drag.win))
  }

  const handleKeyDown = (handle: Handle) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -12, PageUp: 12 }[event.key]
    if (step === undefined) return

    event.preventDefault()
    onChange(handle, wrapDay((handle === "start" ? start : end) + step * KEY_STEP_MIN * (event.shiftKey ? 3 : 1)))
  }

  const handleClass =
    "absolute top-[34px] h-10 w-3.5 -translate-x-1/2 cursor-grab rounded-md bg-primary outline-none active:cursor-grabbing before:absolute before:-inset-x-4 before:-inset-y-1.5 before:content-[''] after:absolute after:top-3 after:left-1/2 after:h-4 after:w-0.5 after:-translate-x-1/2 after:rounded-[1px] after:bg-on-primary after:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ring data-[selected=true]:outline-2 data-[selected=true]:outline-offset-[3px] data-[selected=true]:outline-ring"
  const bubbleClass =
    "tabular absolute top-0 min-w-[62px] -translate-x-1/2 rounded-md border px-2 py-[5px] text-center text-[15px] leading-none font-semibold whitespace-nowrap pointer-events-none"

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      className={cn("relative h-[100px] touch-pan-y select-none", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
    >
      <Scale win={win} />

      <div aria-hidden className="absolute inset-x-0 top-[50px] h-2">
        {fills.map(([from, to], index) => (
          <div
            key={index}
            className="absolute top-0 h-2 rounded-xs bg-primary"
            style={{ left: `${percent(from)}%`, width: `${Math.max(0, percent(to) - percent(from))}%` }}
          />
        ))}
        {breakMinutes > 0 && breakEnd > start && (
          <div
            className="absolute top-0 h-2 border-y border-primary bg-ticket"
            style={{ left: `${percent(start)}%`, width: `${Math.max(0, percent(breakEnd) - percent(start))}%` }}
          />
        )}
      </div>

      {([
        ["start", start, startBubbleX, startLabel],
        ["end", end, endBubbleX, endLabel],
      ] as const).map(([handle, minute, bubbleX, name]) => (
        <div key={handle}>
          <div
            aria-hidden
            className={cn(
              bubbleClass,
              selected === handle ? "border-primary bg-primary text-on-primary" : "border-edge bg-ticket text-text"
            )}
            style={{ left: width > 0 ? `${bubbleX}px` : `${percent(minute)}%` }}
          >
            {minutesToTime(minute)}
          </div>
          <button
            type="button"
            role="slider"
            data-handle={handle}
            data-selected={selected === handle}
            aria-label={name}
            aria-valuemin={win.from}
            aria-valuemax={win.to}
            aria-valuenow={minute}
            aria-valuetext={minutesToTime(minute)}
            className={handleClass}
            style={{ left: `${percent(minute)}%` }}
            onFocus={() => onSelect(handle)}
            onKeyDown={handleKeyDown(handle)}
          />
        </div>
      ))}
    </div>
  )
}

export { TimeRangeSlider }
