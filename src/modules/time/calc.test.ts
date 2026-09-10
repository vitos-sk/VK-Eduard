import { describe, expect, it } from "vitest";

import {
  breakMinutes,
  dateKeyOf,
  elapsedSecondsNow,
  hhmmOf,
  isBreakPairValid,
  isDurationValid,
  minutesBetweenWrapped,
  minutesToTime,
  splitWorkedOvertime,
  sumTotalMinutes,
  timeToMinutes,
  totalMinutes,
} from "./calc";

describe("timeToMinutes / minutesToTime", () => {
  it("переводит HH:mm в минуты от полуночи и обратно", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(minutesToTime(510)).toBe("08:30");
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("заворачивает минуты вне 0..1439 в сутки", () => {
    expect(minutesToTime(1440)).toBe("00:00");
    expect(minutesToTime(-30)).toBe("23:30");
  });
});

describe("minutesBetweenWrapped", () => {
  it("считает обычный интервал в пределах одного дня", () => {
    expect(minutesBetweenWrapped("08:00", "16:30")).toBe(510);
  });

  it("ночная смена 22:00 → 06:00 — 480 минут, а не отрицательное число", () => {
    expect(minutesBetweenWrapped("22:00", "06:00")).toBe(480);
  });

  it("равные времена дают 0, а не полные сутки", () => {
    expect(minutesBetweenWrapped("09:00", "09:00")).toBe(0);
  });
});

describe("breakMinutes", () => {
  it("0, если хотя бы один край перерыва не задан", () => {
    expect(breakMinutes(null, null)).toBe(0);
    expect(breakMinutes("12:30", null)).toBe(0);
    expect(breakMinutes(null, "13:00")).toBe(0);
  });

  it("считает обычный перерыв", () => {
    expect(breakMinutes("12:30", "13:30")).toBe(60);
  });

  it("перерыв на границе полуночи не ломает расчёт", () => {
    expect(breakMinutes("23:45", "00:15")).toBe(30);
  });
});

describe("totalMinutes", () => {
  it("null, пока смена не завершена", () => {
    expect(totalMinutes("08:00", null, null, null)).toBeNull();
    expect(totalMinutes("08:00", null, "12:00", "12:30")).toBeNull();
  });

  it("обычный день с перерывом", () => {
    // 07:30 → 16:30 = 540 минут, перерыв 12:30–13:30 = 60 → 480
    expect(totalMinutes("07:30", "16:30", "12:30", "13:30")).toBe(480);
  });

  it("день без перерыва", () => {
    expect(totalMinutes("09:00", "13:00", null, null)).toBe(240);
  });

  it("ночная смена с переходом через полночь и перерывом на границе", () => {
    // 22:00 → 06:00 = 480, перерыв 23:45–00:15 = 30 → 450
    expect(totalMinutes("22:00", "06:00", "23:45", "00:15")).toBe(450);
  });
});

describe("isBreakPairValid", () => {
  it("оба края пустые или оба заданы — валидно", () => {
    expect(isBreakPairValid(null, null)).toBe(true);
    expect(isBreakPairValid("12:00", "12:30")).toBe(true);
  });

  it("начатый и ещё не закрытый перерыв — валидно (перерва триває)", () => {
    expect(isBreakPairValid("12:00", null)).toBe(true);
  });

  it("конец перерыва без начала — невалидно", () => {
    expect(isBreakPairValid(null, "12:30")).toBe(false);
  });
});

describe("isDurationValid", () => {
  it("границы 1 и 1080 минут включены", () => {
    expect(isDurationValid(1)).toBe(true);
    expect(isDurationValid(1080)).toBe(true);
  });

  it("0 и больше 1080 — невалидно", () => {
    expect(isDurationValid(0)).toBe(false);
    expect(isDurationValid(1081)).toBe(false);
  });
});

describe("splitWorkedOvertime", () => {
  it("в пределах нормы — всё в «Відпрацьовано», сверхурочных нет", () => {
    expect(splitWorkedOvertime(420, 480)).toEqual({
      workedMinutes: 420,
      overtimeMinutes: 0,
    });
  });

  it("сверх нормы делится на норму и «Додатково»", () => {
    expect(splitWorkedOvertime(540, 480)).toEqual({
      workedMinutes: 480,
      overtimeMinutes: 60,
    });
  });

  it("ровно норма — сверхурочных 0", () => {
    expect(splitWorkedOvertime(480, 480)).toEqual({
      workedMinutes: 480,
      overtimeMinutes: 0,
    });
  });
});

describe("elapsedSecondsNow", () => {
  const workDate = "2026-09-08";

  it("без перерыва — просто разница now - started", () => {
    const now = new Date(`${workDate}T09:30:00`);
    expect(elapsedSecondsNow(workDate, "08:00", null, null, now)).toBe(
      90 * 60,
    );
  });

  it("во время перерыва таймер стоит на моменте его начала", () => {
    const now = new Date(`${workDate}T12:45:00`);
    expect(
      elapsedSecondsNow(workDate, "08:00", "12:30", null, now),
    ).toBe(270 * 60); // 08:00 → 12:30 = 270 минут, дальше не растёт
  });

  it("после перерыва вычитает его длительность из общего прошедшего времени", () => {
    const now = new Date(`${workDate}T14:00:00`);
    expect(
      elapsedSecondsNow(workDate, "08:00", "12:30", "13:00", now),
    ).toBe((360 - 30) * 60); // 08:00→14:00 = 360 мин, минус 30 мин перерыва
  });

  it("не уходит в отрицательные секунды, если now раньше старта", () => {
    const now = new Date(`${workDate}T07:00:00`);
    expect(elapsedSecondsNow(workDate, "08:00", null, null, now)).toBe(0);
  });

  it("не ломается, если время приходит с сервера в формате HH:mm:ss", () => {
    const now = new Date(`${workDate}T09:30:00`);
    expect(
      elapsedSecondsNow(workDate, "08:00:00", null, null, now),
    ).toBe(90 * 60);
    expect(
      elapsedSecondsNow(workDate, "08:00:00", "08:30:00", "09:00:00", now),
    ).toBe((90 - 30) * 60);
  });
});

describe("sumTotalMinutes", () => {
  it("суммирует завершённые записи и пропускает открытые", () => {
    expect(
      sumTotalMinutes([
        { total_minutes: 480 },
        { total_minutes: null },
        { total_minutes: 120 },
      ]),
    ).toBe(600);
  });

  it("пустой список даёт 0", () => {
    expect(sumTotalMinutes([])).toBe(0);
  });
});

describe("hhmmOf / dateKeyOf", () => {
  it("форматируют Date как часы устройства, а не UTC", () => {
    const date = new Date(2026, 8, 8, 7, 5); // 8 вересня 2026, 07:05 локально
    expect(hhmmOf(date)).toBe("07:05");
    expect(dateKeyOf(date)).toBe("2026-09-08");
  });
});
