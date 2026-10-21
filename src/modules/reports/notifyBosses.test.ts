import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PushPayload } from "@/lib/push/server";
import { FakeDb } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({
  admin: null as unknown,
  notifyUser: vi.fn(async () => {}),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => h.admin }));
vi.mock("@/modules/notifications/notify", () => ({ notifyUser: h.notifyUser }));

import { notifyBossesAboutReport } from "./notifyBosses";

let db: FakeDb;

const report = { id: "r1", companyId: "co", authorId: "worker-1", authorName: "Іван Петренко", siteId: "site-1" };

const recipients = () => h.notifyUser.mock.calls.map((call) => (call as unknown as [string])[0]);

beforeEach(() => {
  db = new FakeDb();
  h.admin = db;
  h.notifyUser.mockClear();

  db.rows("profiles").push(
    { id: "boss-1", company_id: "co", role: "boss", is_active: true },
    { id: "boss-2", company_id: "co", role: "boss", is_active: true },
    { id: "boss-off", company_id: "co", role: "boss", is_active: false },
    { id: "boss-other-co", company_id: "other", role: "boss", is_active: true },
    { id: "worker-1", company_id: "co", role: "worker", is_active: true },
    { id: "worker-2", company_id: "co", role: "worker", is_active: true },
  );
  db.rows("sites").push({ id: "site-1", name: "Вулиця Лесі 5" });
});

describe("notifyBossesAboutReport", () => {
  it("повідомлення йде всім активним шефам своєї фірми — і більше нікому", async () => {
    await notifyBossesAboutReport(report);

    expect(recipients()).toEqual(["boss-1", "boss-2"]);
  });

  it("шеф, який сам створив звіт, повідомлення про нього не отримує", async () => {
    await notifyBossesAboutReport({ ...report, authorId: "boss-1" });

    expect(recipients()).toEqual(["boss-2"]);
  });

  it("у повідомленні — автор, об'єкт і посилання на цей звіт; окремого перемикача нема", async () => {
    await notifyBossesAboutReport(report);

    const [, pref, build] = h.notifyUser.mock.calls[0] as unknown as [string, string | null, (locale: string) => PushPayload];
    const payload = build("uk");

    expect(pref).toBeNull();
    expect(payload).toMatchObject({ title: "Новий звіт", url: "/reports/r1", tag: "report-r1" });
    expect(payload.body).toContain("Іван Петренко");
    expect(payload.body).toContain("Вулиця Лесі 5");
  });

  it("помилка бази не ламає збереження звіту", async () => {
    h.admin = {
      from: () => {
        throw new Error("база недоступна");
      },
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notifyBossesAboutReport(report)).resolves.toBeUndefined();
    expect(h.notifyUser).not.toHaveBeenCalled();

    log.mockRestore();
  });
});
