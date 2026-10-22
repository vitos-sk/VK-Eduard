"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { HoldButton } from "@/components/time/HoldButton";
import { TimeTextInput } from "@/components/time/TimeTextInput";
import { Chip } from "@/components/ui/chip";
import { StampTag } from "@/components/ui/stamp-tag";
import { TimeRangeSlider } from "@/components/ui/time-range-slider";
import { fmt, formatHoursShort } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { minutesToTime, timeToMinutes } from "@/modules/time/calc";

/** Кнопки зсуву выбранного края: минуты. Час — первая и последняя. */
const NUDGES_MIN = [-60, -15, -5, -1, 1, 5, 15, 60] as const;

/** Быстрые варианты перерыва, минуты (0 — «Без»). */
const BREAK_PRESETS_MIN = [0, 15, 30, 45, 60] as const;

/** Шаг кнопок «−» и «+» у перерыва и верхняя граница: дольше смены (18 ч) перерыв быть не может. */
const BREAK_STEP_MIN = 5;
const MAX_BREAK_MIN = 600;

type Handle = "start" | "end";

interface TimeRangeEditorProps {
  startAt: string;
  endAt: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  /** Нет — блока перерыва нет (дорога на объект). */
  breakMin?: number;
  onBreakChange?: (minutes: number) => void;
  /** Длительность в минутах с учётом перерыва. */
  durationMin: number;
  isDurationOk: boolean;
  /** Подпись к итогу: «год відпрацьовано», «год у дорозі». */
  totalLabel: string;
  /** Текст под итогом, когда длительность не подходит; по умолчанию — про 1 хв – 18 год. */
  errorText?: string;
  className?: string;
}

/** «15 хв» / «1 год» для подписей кнопок. */
function useDeltaText() {
  const t = useT();

  return (delta: number) => {
    const abs = Math.abs(delta);

    return abs === 60 ? `1 ${t.units.hoursShort}` : `${abs} ${t.units.minutesShort}`;
  };
}

/**
 * Ввод начала и завершения: смена на линейке часов, как на экране «Години». Края тянутся пальцем или мышью (грубо),
 * точность дают поля «набрать цифры» и кнопки зсуву на 1 / 5 / 15 минут и час — те действуют на выбранный край.
 * Итог («8:30 год відпрацьовано») всегда виден сверху. Общий для «Додати час», звіту и дороги;
 * блок перерыва — только если передан `breakMin`.
 */
export function TimeRangeEditor({
  startAt,
  endAt,
  onStartChange,
  onEndChange,
  breakMin,
  onBreakChange,
  durationMin,
  isDurationOk,
  totalLabel,
  errorText,
  className,
}: TimeRangeEditorProps) {
  const t = useT();
  const s = t.manualTime;
  const deltaText = useDeltaText();
  const [selected, setSelected] = useState<Handle>("start");
  const start = timeToMinutes(startAt);
  const end = timeToMinutes(endAt);
  const isNight = end < start;
  const hasBreak = breakMin !== undefined && onBreakChange !== undefined;

  const setHandle = (handle: Handle, minute: number) => (handle === "start" ? onStartChange : onEndChange)(minutesToTime(minute));
  const nudge = (delta: number) => setHandle(selected, (selected === "start" ? start : end) + delta);

  return (
    <div className={cn("@container", className)}>
      <div className="px-3.5 pt-3 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className={cn("tabular text-[34px] leading-none font-semibold", !isDurationOk && "text-err")}>
              {isDurationOk ? formatHoursShort(durationMin) : `—:——`}
            </span>
            <span className="text-[13px] text-ink-2">{totalLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[14px] font-medium text-ink-2">
            <span className="tabular">
              {startAt} → {endAt}
            </span>
            {isNight && <StampTag>{s.nextDay}</StampTag>}
            {hasBreak && breakMin > 0 && (
              <span className="text-[13px] font-normal">{fmt(s.breakNote, { n: breakMin })}</span>
            )}
          </div>
        </div>
        {!isDurationOk && (
          <p role="alert" className="mt-1 text-[13px] text-err">
            {errorText ?? s.errorDuration}
          </p>
        )}

        <TimeRangeSlider
          className="mt-3"
          start={start}
          end={end}
          breakMinutes={hasBreak ? breakMin : 0}
          selected={selected}
          onSelect={setSelected}
          onChange={setHandle}
          label={s.rulerLabel}
          startLabel={s.start}
          endLabel={s.finish}
        />

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div>
            <span className="mb-1 block text-[13px] font-medium text-text">{s.start}</span>
            <TimeTextInput
              label={s.start}
              value={startAt}
              onChange={onStartChange}
              invalid={!isDurationOk}
              selected={selected === "start"}
              onFocus={() => setSelected("start")}
            />
          </div>
          <div>
            <span className="mb-1 block text-[13px] font-medium text-text">{s.finish}</span>
            <TimeTextInput
              label={s.finish}
              value={endAt}
              onChange={onEndChange}
              invalid={!isDurationOk}
              selected={selected === "end"}
              onFocus={() => setSelected("end")}
            />
          </div>
        </div>

        <p className="mt-3 text-[13px] font-medium text-text">{selected === "start" ? s.nudgeStart : s.nudgeEnd}</p>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5 @lg:grid-cols-8">
          {NUDGES_MIN.map((delta) => (
            <HoldButton
              key={delta}
              variant="field"
              size="md"
              className="tabular w-full px-0 text-[14px] font-medium"
              aria-label={fmt(delta < 0 ? s.earlierBy : s.laterBy, { n: deltaText(delta) })}
              onStep={() => nudge(delta)}
            >
              {delta < 0 ? "−" : "+"}
              {Math.abs(delta) === 60 ? `1 ${t.units.hoursShort}` : Math.abs(delta)}
            </HoldButton>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-2">{s.rulerHint}</p>
      </div>

      {hasBreak && (
        <div className="perf-t px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-text">{t.hours.break}</span>
            <div className="flex items-center gap-1">
              <HoldButton
                variant="field"
                size="icon"
                aria-label={s.breakLess}
                onStep={() => onBreakChange(Math.max(0, breakMin - BREAK_STEP_MIN))}
              >
                <Minus strokeWidth={1.9} aria-hidden />
              </HoldButton>
              <span className="tabular min-w-[58px] text-center text-[15px] font-semibold">
                {breakMin > 0 ? `${breakMin} ${t.units.minutesShort}` : t.common.dash}
              </span>
              <HoldButton
                variant="field"
                size="icon"
                aria-label={s.breakMore}
                onStep={() => onBreakChange(Math.min(MAX_BREAK_MIN, breakMin + BREAK_STEP_MIN))}
              >
                <Plus strokeWidth={1.9} aria-hidden />
              </HoldButton>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {BREAK_PRESETS_MIN.map((minutes) => (
              <Chip key={minutes} selected={breakMin === minutes} onClick={() => onBreakChange(minutes)} className="tabular">
                {minutes === 0 ? s.noBreak : minutes === 60 ? `1 ${t.units.hoursShort}` : `${minutes} ${t.units.minutesShort}`}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
