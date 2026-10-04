"use client";

import { useState } from "react";

import { Chip } from "@/components/ui/chip";
import { TimeRangeRuler } from "@/components/ui/hours-ruler";
import { Stepper } from "@/components/ui/stepper";
import { UnderlineField } from "@/components/ui/underline-field";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { minutesToTime, timeToMinutes } from "@/modules/time/calc";

/** Шаг стрелок «раніше / пізніше» — 15 хв; точное значение вводится в самом поле. */
const TIME_STEP_MIN = 15;

/** Быстрые варианты перерыва: «Без», 0:30, 1:00 и «Інша тривалість перерви». */
const BREAK_PRESETS_MIN = [30, 60] as const;

/** Верхняя граница перерыва: дольше смены (18 ч) он быть не может. */
const MAX_BREAK_MIN = 600;

/** Подпись поля формы над содержимым: 12 px, вторичный текст. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-ink-2">{children}</p>;
}

/**
 * Поле времени: нативный `<input type="time">` (на телефоне открывает системное «колесо»)
 * с цифрами mono 16 / 600 и парой стрелок по бокам: влево — «Раніше», вправо — «Пізніше».
 * Видимого текста у стрелок нет, название — в `aria-label` и тултипе.
 * `minutesToTime` заворачивает значение в 0..1439, поэтому стрелка на 23:45 даёт 00:00 (ночная смена).
 *
 * Нативное поле держит черновик отдельно: в процессе набора значение бывает неполным,
 * и поднимать его наверх нельзя — управляемый инпут сбросил бы введённое.
 */
export function TimeField({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const shift = (deltaMin: number) => {
    setDraft(null);
    onChange(minutesToTime(timeToMinutes(value) + deltaMin));
  };

  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 flex items-center gap-1">
        <Stepper
          direction="earlier"
          label={t.manualTime.decreaseTime}
          onClick={() => shift(-TIME_STEP_MIN)}
        />
        <input
          type="time"
          step={60}
          value={draft ?? value}
          aria-label={label}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            if (/^\d{2}:\d{2}$/.test(event.target.value)) {
              setDraft(null);
              onChange(event.target.value);
            } else {
              setDraft(event.target.value);
            }
          }}
          onBlur={() => setDraft(null)}
          className={cn(
            "tabular h-[34px] min-w-0 flex-1 rounded-md border border-edge bg-ticket text-center text-[16px] font-semibold text-text outline-none hover:border-ink-3 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-calendar-picker-indicator]:hidden",
            invalid && "text-err"
          )}
        />
        <Stepper
          direction="later"
          label={t.manualTime.increaseTime}
          onClick={() => shift(TIME_STEP_MIN)}
        />
      </div>
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
  /** Длительность в минутах с учётом перерыва. */
  durationMin: number;
  isDurationOk: boolean;
  className?: string;
}

/**
 * Блок «початок / завершення / перерва / тривалість» — общий для экрана
 * «Додати час вручну» и формы звіту, чтобы время вводилось одинаково везде.
 * Часть талона: секции разделены пунктиром снаружи (`TicketSection`).
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
  className,
}: WorkTimeFieldsProps) {
  const [isCustomBreak, setIsCustomBreak] = useState(
    breakMin > 0 && !BREAK_PRESETS_MIN.some((minutes) => minutes === breakMin),
  );
  const customActive = isCustomBreak;
  const startMinutes = timeToMinutes(startAt);
  const endMinutes = timeToMinutes(endAt);

  return (
    <div className={className}>
      <div className="px-3.5 pt-2 pb-1">
        <div className="grid grid-cols-2 gap-3">
          <TimeField
            label={t.manualTime.start}
            value={startAt}
            onChange={onStartChange}
            invalid={!isDurationOk}
          />
          <TimeField
            label={t.manualTime.finish}
            value={endAt}
            onChange={onEndChange}
            invalid={!isDurationOk}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-ink-2">{t.manualTime.timeHint}</p>
        <TimeRangeRuler startMinutes={startMinutes} endMinutes={endMinutes} />
      </div>

      <div className="perf-t px-3.5 pt-2.5 pb-3">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-ink-2">{t.hours.break}</span>
          <span className="tabular font-semibold">
            <span className="font-sans text-[13px] font-medium text-ink-2">
              {t.manualTime.duration}{" "}
            </span>
            {isDurationOk ? formatHoursShort(durationMin) : t.common.dash}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip
            selected={breakMin === 0 && !customActive}
            onClick={() => {
              setIsCustomBreak(false);
              onBreakChange(0);
            }}
          >
            {t.manualTime.noBreak}
          </Chip>
          {BREAK_PRESETS_MIN.map((minutes) => (
            <Chip
              key={minutes}
              selected={breakMin === minutes && !customActive}
              onClick={() => {
                setIsCustomBreak(false);
                onBreakChange(minutes);
              }}
              className="tabular"
            >
              {formatHoursShort(minutes)}
            </Chip>
          ))}
          <Chip selected={customActive} onClick={() => setIsCustomBreak(true)}>
            {t.manualTime.customBreak}
          </Chip>
        </div>

        {customActive && (
          <UnderlineField
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_BREAK_MIN}
            value={breakMin === 0 ? "" : breakMin}
            placeholder={`${t.units.minutesShort}`}
            aria-label={t.manualTime.customBreak}
            onChange={(event) => {
              const next = Math.floor(Number(event.target.value));

              onBreakChange(
                Number.isFinite(next) ? Math.min(Math.max(next, 0), MAX_BREAK_MIN) : 0
              );
            }}
            className="tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        )}

        {!isDurationOk && (
          <p className="mt-2 text-[13px] text-err">{t.manualTime.errorDuration}</p>
        )}
      </div>
    </div>
  );
}
