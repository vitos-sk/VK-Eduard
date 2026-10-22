/**
 * Арифметика «линейки смены» — редактора начала и завершения (`TimeRangeEditor`).
 * Только числа (минуты от полуночи) и строки: ни UI, ни базы, ни локализации.
 */

export interface RulerWindow {
  /** Левый край шкалы, минуты от полуночи. */
  from: number;
  /** Правый край шкалы, минуты от полуночи (1440 — конец суток). */
  to: number;
}

/** Обычная смена: шкала 05:00–21:00 — 16 часов на ширину телефона. */
export const DEFAULT_WINDOW: RulerWindow = { from: 5 * 60, to: 21 * 60 };

/** Ночная смена или время вне обычной шкалы — показываем целые сутки. */
export const FULL_DAY: RulerWindow = { from: 0, to: 1440 };

/** Последняя минута суток: 24:00 — это уже 00:00 следующего дня. */
const LAST_MINUTE = 1439;

/** Зазор между началом и концом при перетаскивании: края не слипаются. */
const DRAG_GAP = 5;

/**
 * Какую шкалу показывать. Обычный день внутри 05–21 — крупная шкала; начало раньше 05:00, конец позже 21:00,
 * ночная смена (конец не позже начала) — целые сутки.
 */
export function rulerWindow(start: number, end: number): RulerWindow {
  const isOrdinaryDay =
    start >= DEFAULT_WINDOW.from && end <= DEFAULT_WINDOW.to && end > start;

  return isOrdinaryDay ? DEFAULT_WINDOW : FULL_DAY;
}

/** Положение минуты на шкале, % ширины. Вне шкалы — край. */
export function toPercent(win: RulerWindow, minute: number): number {
  const ratio = (minute - win.from) / (win.to - win.from);

  return Math.min(1, Math.max(0, ratio)) * 100;
}

/**
 * Шаг привязки при перетаскивании: на просторной линейке — 5 минут, на тесной (телефон) — 15:
 * пять минут должны занимать хотя бы 3 px, иначе край «дрожит» под пальцем.
 */
export function snapStep(pxPerMinute: number): 5 | 15 {
  return pxPerMinute * 5 >= 3 ? 5 : 15;
}

/** Минута под точкой линейки: `ratio` — доля ширины 0..1, результат привязан к шагу и лежит на шкале. */
export function minuteAt(win: RulerWindow, ratio: number, step: number): number {
  const raw = win.from + Math.min(1, Math.max(0, ratio)) * (win.to - win.from);
  const snapped = Math.round(raw / step) * step;

  return Math.min(win.to, Math.max(win.from, snapped));
}

/**
 * Куда можно утянуть край. День: начало левее конца, конец правее начала. Ночь (конец раньше начала): наоборот —
 * конец остаётся раньше начала. Через перетаскивание день в ночь не превращается: это делают поля и кнопки.
 */
export function clampDrag(
  handle: "start" | "end",
  minute: number,
  start: number,
  end: number,
  win: RulerWindow,
): number {
  const isNight = end < start;
  const max = Math.min(win.to, LAST_MINUTE);
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

  if (handle === "start") {
    return isNight ? clamp(minute, end + DRAG_GAP, max) : clamp(minute, win.from, end - DRAG_GAP);
  }

  return isNight ? clamp(minute, win.from, start - DRAG_GAP) : clamp(minute, start + DRAG_GAP, max);
}

function clockFrom(hours: number, minutes: number): number | null {
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
    ? hours * 60 + minutes
    : null;
}

/** Разбор трёх цифр: «735» — 7:35; если минуты не выходят («165»), то 16:5 → 16:50. */
function threeDigits(digits: string): { hours: number; minutes: number } {
  const short = { hours: Number(digits[0]), minutes: Number(digits.slice(1)) };

  if (short.minutes <= 59) return short;

  return { hours: Number(digits.slice(0, 2)), minutes: Number(digits[2]) * 10 };
}

/**
 * Набранное время → минуты от полуночи. Цифры без разделителя: 1–2 цифры — часы, 3 — Ч ММ (или ЧЧ М), 4 — ЧЧ ММ;
 * с разделителем `:` `.` `,` или пробелом: «7:35», «7:5» (= 7:50). Невозможное время — `null`: подгонять тихо нельзя.
 */
export function parseClock(text: string): number | null {
  const trimmed = text.trim();

  if (/[:.,\s]/.test(trimmed)) {
    const [hoursPart = "", minutesPart = ""] = trimmed.split(/[:.,\s]+/);

    if (!/^\d{1,2}$/.test(hoursPart) || !/^\d{0,2}$/.test(minutesPart)) return null;

    const minutes = minutesPart === "" ? 0 : Number(minutesPart.padEnd(2, "0"));

    return clockFrom(Number(hoursPart), minutes);
  }

  const digits = trimmed.replace(/\D/g, "").slice(0, 4);

  if (digits === "" || digits.length !== trimmed.length && /\D/.test(trimmed)) return null;
  if (digits.length <= 2) return clockFrom(Number(digits), 0);
  if (digits.length === 3) {
    const { hours, minutes } = threeDigits(digits);

    return clockFrom(hours, minutes);
  }

  return clockFrom(Number(digits.slice(0, 2)), Number(digits.slice(2)));
}

/**
 * Текст в поле, пока человек печатает: только цифры (до четырёх) и двоеточие перед минутами.
 * «0735» → «07:35», «735» → «7:35», «073» → «07:3».
 */
export function formatTypedDraft(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) return digits;
  if (digits.length === 3) {
    // Тот же выбор, что у `parseClock`: «735» — 7:35, «073» и «165» — минуты не выходят, значит 07:3 и 16:5.
    return Number(digits.slice(1)) <= 59 ? `${digits[0]}:${digits.slice(1)}` : `${digits.slice(0, 2)}:${digits[2]}`;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Замыкает минуты в сутки 0..1439: 24:05 → 00:05, −5 → 23:55. */
export function wrapDay(minutes: number): number {
  return ((minutes % 1440) + 1440) % 1440;
}

/**
 * Где рисовать подсказки времени над краями. Пока края далеко — над ними; близко (смена в час, дорога) подсказки
 * раздвигаются вокруг середины, чтобы не налезать друг на друга, и не выходят за линейку.
 * `half` — половина ширины подсказки, `width` — ширина линейки, всё в px. Порядок (начало, конец) сохраняется.
 */
export function spreadBubbles(startX: number, endX: number, width: number, half: number): [number, number] {
  const gap = 2 * half + 4;
  const low = Math.min(startX, endX);
  const high = Math.max(startX, endX);

  if (high - low >= gap) return [startX, endX];

  const middle = (low + high) / 2;
  let left = middle - gap / 2;
  let right = middle + gap / 2;
  const shift = Math.max(0, half - left) - Math.max(0, right - Math.max(half, width - half));

  left += shift;
  right += shift;

  return startX <= endX ? [left, right] : [right, left];
}
