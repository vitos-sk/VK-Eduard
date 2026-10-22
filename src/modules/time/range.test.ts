import { describe, expect, it } from "vitest";

import {
  clampDrag,
  DEFAULT_WINDOW,
  FULL_DAY,
  formatTypedDraft,
  minuteAt,
  parseClock,
  rulerWindow,
  snapStep,
  spreadBubbles,
  toPercent,
  wrapDay,
} from "./range";

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

describe("rulerWindow", () => {
  it("обычный день внутри 05–21 — обычная шкала", () => {
    expect(rulerWindow(at(7), at(16))).toEqual(DEFAULT_WINDOW);
    expect(rulerWindow(at(5), at(21))).toEqual(DEFAULT_WINDOW);
  });

  it("начало раньше 05:00 или конец позже 21:00 — вся доба", () => {
    expect(rulerWindow(at(4, 30), at(12))).toEqual(FULL_DAY);
    expect(rulerWindow(at(14), at(21, 5))).toEqual(FULL_DAY);
  });

  it("нічна зміна (конец раньше начала) — вся доба", () => {
    expect(rulerWindow(at(22), at(6))).toEqual(FULL_DAY);
  });

  it("одинаковые начало и конец — обычная шкала, ничего не ломается", () => {
    expect(rulerWindow(at(8), at(8))).toEqual(FULL_DAY);
  });
});

describe("toPercent", () => {
  it("края шкалы — 0 и 100, середина — 50", () => {
    expect(toPercent(DEFAULT_WINDOW, at(5))).toBe(0);
    expect(toPercent(DEFAULT_WINDOW, at(21))).toBe(100);
    expect(toPercent(DEFAULT_WINDOW, at(13))).toBe(50);
  });

  it("значения вне шкалы прижимаются к краю", () => {
    expect(toPercent(DEFAULT_WINDOW, at(3))).toBe(0);
    expect(toPercent(DEFAULT_WINDOW, at(23))).toBe(100);
  });
});

describe("snapStep", () => {
  it("тесный экран — шаг 15 минут, просторный — 5", () => {
    expect(snapStep(0.37)).toBe(15);
    expect(snapStep(0.62)).toBe(5);
  });
});

describe("minuteAt", () => {
  it("доля ширины → минута с привязкой к шагу", () => {
    expect(minuteAt(DEFAULT_WINDOW, 0, 5)).toBe(at(5));
    expect(minuteAt(DEFAULT_WINDOW, 1, 5)).toBe(at(21));
    expect(minuteAt(DEFAULT_WINDOW, 0.5, 15)).toBe(at(13));
    // 07:37 → ближайшие 5 минут
    expect(minuteAt(DEFAULT_WINDOW, (at(7, 37) - at(5)) / 960, 5)).toBe(at(7, 35));
  });

  it("палец за краем линейки не выходит за шкалу", () => {
    expect(minuteAt(DEFAULT_WINDOW, -0.3, 5)).toBe(at(5));
    expect(minuteAt(DEFAULT_WINDOW, 1.4, 5)).toBe(at(21));
  });
});

describe("clampDrag", () => {
  it("день: начало не заходит за конец, конец — за начало", () => {
    expect(clampDrag("start", at(17), at(7), at(16), DEFAULT_WINDOW)).toBe(at(15, 55));
    expect(clampDrag("end", at(6), at(7), at(16), DEFAULT_WINDOW)).toBe(at(7, 5));
  });

  it("день: перетаскивание ограничено шкалой", () => {
    expect(clampDrag("start", at(3), at(7), at(16), DEFAULT_WINDOW)).toBe(at(5));
    expect(clampDrag("end", at(23), at(7), at(16), DEFAULT_WINDOW)).toBe(at(21));
  });

  it("нічна зміна: начало остаётся позже конца", () => {
    expect(clampDrag("start", at(3), at(22), at(6), FULL_DAY)).toBe(at(6, 5));
    expect(clampDrag("end", at(23), at(22), at(6), FULL_DAY)).toBe(at(21, 55));
  });

  it("полная доба: 24:00 недопустимо, последняя минута суток — 23:59", () => {
    expect(clampDrag("start", at(24), at(22), at(6), FULL_DAY)).toBe(1439);
  });
});

describe("parseClock", () => {
  it("только цифры: 1–2 цифры — часы, 3 — Ч ММ, 4 — ЧЧ ММ", () => {
    expect(parseClock("7")).toBe(at(7));
    expect(parseClock("16")).toBe(at(16));
    expect(parseClock("735")).toBe(at(7, 35));
    expect(parseClock("0735")).toBe(at(7, 35));
    expect(parseClock("1645")).toBe(at(16, 45));
  });

  it("три цифры: сначала Ч ММ, а если минуты не выходят — ЧЧ М", () => {
    expect(parseClock("123")).toBe(at(1, 23));
    expect(parseClock("073")).toBe(at(7, 30));
    expect(parseClock("165")).toBe(at(16, 50));
    expect(parseClock("999")).toBeNull();
  });

  it("с разделителем: 7:35, 7.35, 7,35, 07 35", () => {
    expect(parseClock("7:35")).toBe(at(7, 35));
    expect(parseClock("7.35")).toBe(at(7, 35));
    expect(parseClock("7,35")).toBe(at(7, 35));
    expect(parseClock("07 35")).toBe(at(7, 35));
    expect(parseClock("7:5")).toBe(at(7, 50));
  });

  it("неверное время — null, а не тихая подгонка", () => {
    expect(parseClock("")).toBeNull();
    expect(parseClock("abc")).toBeNull();
    expect(parseClock("2400")).toBeNull();
    expect(parseClock("0760")).toBeNull();
    expect(parseClock("25")).toBeNull();
  });

  it("полночь допустима", () => {
    expect(parseClock("0000")).toBe(0);
    expect(parseClock("2359")).toBe(1439);
  });
});

describe("formatTypedDraft", () => {
  it("оставляет только цифры и ставит двоеточие перед минутами", () => {
    expect(formatTypedDraft("")).toBe("");
    expect(formatTypedDraft("0")).toBe("0");
    expect(formatTypedDraft("07")).toBe("07");
    expect(formatTypedDraft("735")).toBe("7:35");
    expect(formatTypedDraft("073")).toBe("07:3");
    expect(formatTypedDraft("165")).toBe("16:5");
    expect(formatTypedDraft("0735")).toBe("07:35");
    expect(formatTypedDraft("07:35")).toBe("07:35");
    expect(formatTypedDraft("07355")).toBe("07:35");
    expect(formatTypedDraft("a7b3")).toBe("73");
  });
});

describe("wrapDay", () => {
  it("замыкает сутки: 24:05 → 00:05, −5 → 23:55", () => {
    expect(wrapDay(1445)).toBe(5);
    expect(wrapDay(-5)).toBe(1435);
    expect(wrapDay(600)).toBe(600);
  });
});

describe("spreadBubbles", () => {
  it("далеко друг от друга — на месте", () => {
    expect(spreadBubbles(60, 300, 360, 33)).toEqual([60, 300]);
  });

  it("близко — раздвигаются вокруг середины и не слипаются", () => {
    const [start, end] = spreadBubbles(180, 190, 360, 33);

    expect(end - start).toBe(70);
    expect((start + end) / 2).toBe(185);
  });

  it("у левого края сдвигаются вместе и остаются на линейке", () => {
    const [start, end] = spreadBubbles(5, 15, 360, 33);

    expect(start).toBe(33);
    expect(end - start).toBe(70);
  });

  it("у правого края — вправо не уходят", () => {
    const [start, end] = spreadBubbles(350, 355, 360, 33);

    expect(end).toBe(327);
    expect(end - start).toBe(70);
  });

  it("порядок сохраняется и для ночной смены, где конец левее начала", () => {
    const [start, end] = spreadBubbles(200, 195, 360, 33);

    expect(start - end).toBe(70);
  });
});
