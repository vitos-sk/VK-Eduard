import { describe, expect, it } from "vitest";

import { brusselsClock, isReminderHour, pickRecipients, type Candidate } from "./schedule";

describe("brusselsClock", () => {
  it("летом Брюссель = UTC+2: 16:00 UTC — это 18:00", () => {
    expect(brusselsClock(new Date("2026-07-15T16:00:00Z"))).toEqual({ dateKey: "2026-07-15", hour: 18 });
  });

  it("зимой Брюссель = UTC+1: 17:00 UTC — это 18:00", () => {
    expect(brusselsClock(new Date("2026-01-15T17:00:00Z"))).toEqual({ dateKey: "2026-01-15", hour: 18 });
  });

  it("дата — по Брюсселю, а не по UTC: 23:30 UTC летом уже следующий день", () => {
    expect(brusselsClock(new Date("2026-07-15T23:30:00Z"))).toEqual({ dateKey: "2026-07-16", hour: 1 });
  });

  it("в ночь перехода на зимнее время час не прыгает мимо 18:00", () => {
    // 2026-10-25: Брюссель переходит на зимнее время, 18:00 уже по UTC+1
    expect(brusselsClock(new Date("2026-10-25T17:00:00Z")).hour).toBe(18);
    expect(brusselsClock(new Date("2026-10-25T16:00:00Z")).hour).toBe(17);
  });
});

describe("isReminderHour", () => {
  it("из двух запусков pg_cron (16:00 и 17:00 UTC) проходит ровно один — в любой сезон", () => {
    for (const day of ["2026-07-15", "2026-01-15", "2026-03-29", "2026-10-25"]) {
      const passed = [16, 17].filter((h) =>
        isReminderHour(new Date(`${day}T${String(h).padStart(2, "0")}:00:00Z`)),
      );

      expect(passed).toHaveLength(1);
    }
  });
});

const base: Candidate = {
  userId: "u1",
  role: "worker",
  isActive: true,
  reportedToday: false,
  lastSentOn: null,
};

describe("pickRecipients", () => {
  const today = "2026-07-15";

  it("рабочему без отчёта — напоминаем", () => {
    expect(pickRecipients([base], today)).toEqual(["u1"]);
  });

  it("шефам не шлём", () => {
    expect(pickRecipients([{ ...base, role: "boss" }], today)).toEqual([]);
  });

  it("отключённым сотрудникам не шлём", () => {
    expect(pickRecipients([{ ...base, isActive: false }], today)).toEqual([]);
  });

  it("тем, кто уже сдал отчёт сегодня, не шлём", () => {
    expect(pickRecipients([{ ...base, reportedToday: true }], today)).toEqual([]);
  });

  it("не шлём второй раз в тот же день (повторный запуск планировщика)", () => {
    expect(pickRecipients([{ ...base, lastSentOn: today }], today)).toEqual([]);
    expect(pickRecipients([{ ...base, lastSentOn: "2026-07-14" }], today)).toEqual(["u1"]);
  });

  it("у человека несколько устройств — id в списке один раз", () => {
    expect(pickRecipients([base, { ...base }], today)).toEqual(["u1"]);
  });
});
