"use client";

import { useEffect, useRef, type ComponentProps, type MouseEvent, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Пауза до первого повтора и стартовый интервал: потом повторы ускоряются до 35 мс. */
const FIRST_REPEAT_MS = 380;
const START_INTERVAL_MS = 140;
const MIN_INTERVAL_MS = 35;

interface HoldButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
  /** Один шаг. Зовётся сразу при нажатии, потом повторяется, пока кнопку держат. */
  onStep: () => void;
}

/**
 * Кнопка «нажал и держишь — число бежит»: первый шаг сразу, через 0,4 с повторы, всё быстрее.
 * Нажатие с клавиатуры или экранного диктора приходит как `click` без `pointerdown` (`detail` = 0) — один шаг.
 */
export function HoldButton({ onStep, className, ...props }: HoldButtonProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Всегда свежий шаг: перерисовка меняет замыкание, а повторы идут по уже запущенному таймеру.
  const latest = useRef(onStep);

  useEffect(() => {
    latest.current = onStep;
  });

  const stop = () => clearTimeout(timer.current);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    const loop = (interval: number) => {
      latest.current();
      timer.current = setTimeout(() => loop(Math.max(MIN_INTERVAL_MS, interval * 0.86)), interval);
    };

    latest.current();
    timer.current = setTimeout(() => loop(START_INTERVAL_MS), FIRST_REPEAT_MS);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) latest.current();
  };

  return (
    <Button
      {...props}
      className={cn("touch-manipulation [-webkit-touch-callout:none]", className)}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onBlur={stop}
      onClick={handleClick}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
