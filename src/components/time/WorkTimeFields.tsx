"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { minutesToTime, timeToMinutes } from "@/modules/time/calc";

/** Шаг стрілок часу — 15 хв; точне значення вводиться в самому полі. */
const TIME_STEP_MIN = 15;

/** Швидкі кнопки тривалості перерви. */
const BREAK_OPTIONS_MIN = [15, 30, 45, 60] as const;

/** Верхня межа перерви: довша за зміну (18 год) вона бути не може. */
const MAX_BREAK_MIN = 600;

/** Підпис поля формы над содержимым. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[13px] font-semibold text-text-muted">{children}</p>;
}

/**
 * Поле часу: нативний `<input type="time">` посередині — точні години й
 * хвилини вручну (на телефоні відкривається системне «колесо»), стрілки по
 * боках — швидкий крок {@link TIME_STEP_MIN} хв. `minutesToTime` заводить
 * значення в 0..1439, тож стрілка на 23:45 йде на 00:00 (нічна зміна).
 *
 * Нативне поле тримає чернетку окремо: у процесі набору значення буває
 * неповним (порожнім), і піднімати його нагору не можна — інакше керований
 * інпут скидає введене на попереднє.
 */
export function TimeField({
  value,
  onChange,
  invalid,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  ariaLabel: string;
}) {
  // `null` — чернетки нема, показуємо значення зі стану форми.
  const [draft, setDraft] = useState<string | null>(null);

  const shift = (deltaMin: number) => {
    setDraft(null);
    onChange(minutesToTime(timeToMinutes(value) + deltaMin));
  };

  return (
    <div
      className={cn(
        "flex h-field w-full items-center justify-between rounded-ctl border bg-field px-1",
        invalid ? "border-danger-fg" : "border-border-strong",
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-md text-text-muted"
        onClick={() => shift(-TIME_STEP_MIN)}
        aria-label={t.manualTime.decreaseTime}
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
      </Button>

      <input
        type="time"
        step={60}
        value={draft ?? value}
        aria-label={ariaLabel}
        onChange={(event) => {
          if (/^\d{2}:\d{2}$/.test(event.target.value)) {
            setDraft(null);
            onChange(event.target.value);
          } else {
            setDraft(event.target.value);
          }
        }}
        onBlur={() => setDraft(null)}
        className="tabular min-w-0 flex-1 bg-transparent text-center text-[16px] font-bold text-text outline-none [&::-webkit-calendar-picker-indicator]:hidden"
      />

      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-md text-text-muted"
        onClick={() => shift(TIME_STEP_MIN)}
        aria-label={t.manualTime.increaseTime}
      >
        <ChevronRight className="size-5" strokeWidth={2.4} aria-hidden />
      </Button>
    </div>
  );
}

interface WorkTimeFieldsProps {
  startAt: string;
  endAt: string;
  breakMin: number;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onBreakChange: (minutes: number) => void;
  /** Тривалість у хвилинах за вже врахованою перервою. */
  durationMin: number;
  isDurationOk: boolean;
}

/**
 * Блок «початок / завершення / перерва / тривалість» — спільний для екрана
 * «Додати час вручну» і форми звіту, щоб час вводився однаково скрізь.
 */
export function WorkTimeFields({
  startAt,
  endAt,
  breakMin,
  onStartChange,
  onEndChange,
  onBreakChange,
  durationMin,
  isDurationOk,
}: WorkTimeFieldsProps) {
  const durationLabel = isDurationOk
    ? `${Math.floor(durationMin / 60)} ${t.units.hoursShort} ${durationMin % 60} ${t.units.minutesShort}`
    : t.common.dash;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>{t.manualTime.start}</FieldLabel>
          <TimeField
            value={startAt}
            onChange={onStartChange}
            invalid={!isDurationOk}
            ariaLabel={t.manualTime.start}
          />
        </div>

        <div>
          <FieldLabel>{t.manualTime.finish}</FieldLabel>
          <TimeField
            value={endAt}
            onChange={onEndChange}
            invalid={!isDurationOk}
            ariaLabel={t.manualTime.finish}
          />
        </div>
      </div>

      <p className="mt-3 mb-2 text-[13px] font-semibold text-text-muted">{t.hours.break}</p>
      <div className="flex flex-wrap items-center gap-2">
        {BREAK_OPTIONS_MIN.map((minutes) => (
          <Chip
            key={minutes}
            selected={breakMin === minutes}
            onClick={() => onBreakChange(breakMin === minutes ? 0 : minutes)}
          >
            {minutes < 60 ? `${minutes} ${t.units.minutesShort}` : `1 ${t.units.hoursShort}`}
          </Chip>
        ))}

        <label className="ml-auto flex items-center gap-2 text-[13px] font-semibold text-text-muted">
          {t.manualTime.customBreak}
          <Input
            size="sm"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_BREAK_MIN}
            value={breakMin === 0 ? "" : breakMin}
            placeholder="0"
            onChange={(event) => {
              const next = Math.floor(Number(event.target.value));

              onBreakChange(Number.isFinite(next) ? Math.min(Math.max(next, 0), MAX_BREAK_MIN) : 0);
            }}
            className="tabular w-20 text-center"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[14px] font-bold text-text">
        <Clock className="size-5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
        <span className="text-text-muted">{t.manualTime.duration}:</span>
        <span className="tabular">{durationLabel}</span>
      </div>

      {!isDurationOk && (
        <p className="mt-2 text-[13px] font-medium text-danger-fg">{t.manualTime.errorDuration}</p>
      )}
    </div>
  );
}
