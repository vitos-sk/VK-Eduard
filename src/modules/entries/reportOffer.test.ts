import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeDb } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ db: null as unknown, profile: { id: "user-1" } as unknown }));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.db }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => (await import("@/lib/i18n/uk")).uk }));
vi.mock("@/modules/auth/session", () => ({ getProfile: async () => h.profile }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { findReportToOffer } from "@/modules/entries/actions";

let db: FakeDb;

const DAY = "2026-10-05";

const add = (table: string, row: Record<string, unknown>) => db.rows(table).push(row);

const entry = (id: string, patch: Record<string, unknown> = {}) =>
  add("work_entries", { id, author_id: "user-1", work_date: DAY, site_id: "site-1", ended_at: "16:00", ...patch });

const report = (id: string, patch: Record<string, unknown> = {}) =>
  add("site_reports", { id, author_id: "user-1", work_date: DAY, site_id: "site-1", ...patch });

beforeEach(() => {
  db = new FakeDb();
  h.db = db;
  h.profile = { id: "user-1" };
});

describe("findReportToOffer — спрашивать ли про звіт при видаленні часу", () => {
  it("остання зміна за день і один звіт на цей день — предлагаем его", async () => {
    entry("w1");
    report("r1");

    expect(await findReportToOffer("w1")).toEqual({ reportId: "r1" });
  });

  it("за день есть ещё смена — спрашивать не о чем, звіт остаётся с оставшимся временем", async () => {
    entry("w1");
    entry("w2", { started_at: "17:00", ended_at: "20:00" });
    report("r1");

    expect(await findReportToOffer("w1")).toEqual({ reportId: null });
  });

  it("звіту на этот день нет — не спрашиваем", async () => {
    entry("w1");
    report("other-day", { work_date: "2026-10-04" });
    report("other-site", { site_id: "site-2" });
    report("other-user", { author_id: "user-2" });

    expect(await findReportToOffer("w1")).toEqual({ reportId: null });
  });

  it("два звіти на один день и объект — не знаем, какой предлагать, не спрашиваем", async () => {
    entry("w1");
    report("r1");
    report("r2");

    expect(await findReportToOffer("w1")).toEqual({ reportId: null });
  });

  it("смены другого дня, объекта и человека не считаются «ещё временем»", async () => {
    entry("w1");
    entry("other-day", { work_date: "2026-10-04" });
    entry("other-site", { site_id: "site-2" });
    entry("other-user", { author_id: "user-2" });
    report("r1");

    expect(await findReportToOffer("w1")).toEqual({ reportId: "r1" });
  });

  it("без объекта сравниваются только записи без объекта", async () => {
    entry("w1", { site_id: null });
    entry("with-site");
    report("r-none", { site_id: null });
    report("r-site");

    expect(await findReportToOffer("w1")).toEqual({ reportId: "r-none" });
  });

  it("смена ещё идёт (не закрыта) — к звіту не относится, не спрашиваем", async () => {
    entry("w1", { ended_at: null });
    report("r1");

    expect(await findReportToOffer("w1")).toEqual({ reportId: null });
  });

  it("записи нет (чужая или уже удалена) и нет профиля — не спрашиваем", async () => {
    report("r1");

    expect(await findReportToOffer("missing")).toEqual({ reportId: null });

    h.profile = null;
    entry("w1");

    expect(await findReportToOffer("w1")).toEqual({ reportId: null });
  });
});
