"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { minutesToTime, timeToMinutes } from "@/modules/time/calc";
import { formatTypedDraft, parseClock } from "@/modules/time/range";

/** Шаг стрелок ↑ ↓ в поле; с Shift — час. */
const ARROW_STEP_MIN = 5;

interface TimeTextInputProps {
  label: string;
  /** `HH:mm`. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  /** Поле выбрано как цель кнопок зсуву (даже когда фокус ушёл). */
  selected?: boolean;
  onFocus?: () => void;
  className?: string;
}

/**
 * Поле «набрать время»: цифрами, без выбора из колеса. «0735» → 07:35 (на четвёртой цифре значение уже принято),
 * «735» → 7:35. Стрелки ↑ ↓ — на 5 минут, Shift — на час. На телефоне открывает цифровую клавиатуру.
 *
 * Пока человек печатает, текст живёт в черновике: набранное наполовину («07:3») нельзя поднимать наверх.
 * Невозможное время («2575») не принимается, на выходе из поля остаётся прежнее значение.
 */
export function TimeTextInput({ label, value, onChange, invalid, selected, onFocus, className }: TimeTextInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    const minutes = parseClock(text);

    if (minutes !== null) onChange(minutesToTime(minutes));
  };

  return (
    <Input
      size="sm"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={5}
      aria-label={label}
      aria-invalid={invalid || undefined}
      value={draft ?? value}
      className={cn(
        "tabular px-2 text-center text-[20px] font-semibold",
        selected && "border-primary outline-2 outline-ring",
        className
      )}
      onFocus={(event) => {
        event.currentTarget.select();
        onFocus?.();
      }}
      onChange={(event) => {
        const text = formatTypedDraft(event.target.value);

        setDraft(text);
        if (text.length === 5) commit(text);
      }}
      onBlur={() => {
        if (draft !== null) commit(draft);
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();

          const step = event.shiftKey ? 60 : ARROW_STEP_MIN;

          setDraft(null);
          onChange(minutesToTime(timeToMinutes(value) + (event.key === "ArrowUp" ? step : -step)));
        }
      }}
    />
  );
}
