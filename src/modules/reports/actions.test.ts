import { beforeEach, describe, expect, it, vi } from "vitest";

import { uk } from "@/lib/i18n/uk";
import { FakeDb } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({
  db: null as unknown,
  notifyBosses: vi.fn(async () => {}),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.db }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => (await import("@/lib/i18n/uk")).uk }));
vi.mock("@/modules/auth/session", () => ({
  getProfile: async () => ({ id: "user-1", full_name: "Іван Петренко", company_id: "company-1", role: "worker" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/modules/reports/notifyBosses", () => ({ notifyBossesAboutReport: h.notifyBosses }));

import { createReport, deleteReport, type CreateReportInput } from "@/modules/reports/actions";

let db: FakeDb;

const DAY = "2026-10-05";

const add = (table: string, row: Record<string, unknown>) => db.rows(table).push(row);
const ids = (table: string) => db.rows(table).map((row) => row.id);

/** Звіт, зміна й поїздка автора за той самий день на тому самому об'єкті. */
function seedDay({ report = "r1", site = "site-1" as string | null } = {}) {
  add("site_reports", { id: report, author_id: "user-1", work_date: DAY, site_id: site });
  add("work_entries", { id: `w-${report}`, author_id: "user-1", work_date: DAY, site_id: site, ended_at: "16:00" });
  add("travel_entries", { id: `t-${report}`, author_id: "user-1", work_date: DAY, site_id: site });
}

beforeEach(() => {
  db = new FakeDb();
  h.db = db;
  h.notifyBosses.mockClear();
});

describe("видалення звіту", () => {
  it("разом зі звітом зникають його час і дорога", async () => {
    seedDay();

    const result = await deleteReport("r1");

    expect(result).toEqual({ error: null });
    expect(ids("site_reports")).toEqual([]);
    expect(ids("work_entries")).toEqual([]);
    expect(ids("travel_entries")).toEqual([]);
  });

  it("чужі за датою, об'єктом чи автором записи, а також триваюча зміна лишаються", async () => {
    seedDay();
    add("work_entries", { id: "other-site", author_id: "user-1", work_date: DAY, site_id: "site-2", ended_at: "10:00" });
    add("work_entries", { id: "other-day", author_id: "user-1", work_date: "2026-10-04", site_id: "site-1", ended_at: "10:00" });
    add("work_entries", { id: "other-user", author_id: "user-2", work_date: DAY, site_id: "site-1", ended_at: "10:00" });
    add("work_entries", { id: "running", author_id: "user-1", work_date: DAY, site_id: "site-1", ended_at: null });
    add("travel_entries", { id: "t-other-site", author_id: "user-1", work_date: DAY, site_id: "site-2" });
    add("travel_entries", { id: "t-other-user", author_id: "user-2", work_date: DAY, site_id: "site-1" });

    await deleteReport("r1");

    expect(ids("work_entries")).toEqual(["other-site", "other-day", "other-user", "running"]);
    expect(ids("travel_entries")).toEqual(["t-other-site", "t-other-user"]);
  });

  it("звіт без об'єкта забирає тільки час і дорогу без об'єкта", async () => {
    seedDay({ site: null });
    add("work_entries", { id: "with-site", author_id: "user-1", work_date: DAY, site_id: "site-1", ended_at: "10:00" });
    add("travel_entries", { id: "t-with-site", author_id: "user-1", work_date: DAY, site_id: "site-1" });

    await deleteReport("r1");

    expect(ids("work_entries")).toEqual(["with-site"]);
    expect(ids("travel_entries")).toEqual(["t-with-site"]);
  });

  it("два звіти за день на одному об'єкті: час лишається, поки не видалено останній", async () => {
    seedDay({ report: "r1" });
    add("site_reports", { id: "r2", author_id: "user-1", work_date: DAY, site_id: "site-1" });

    await deleteReport("r1");

    expect(ids("site_reports")).toEqual(["r2"]);
    expect(ids("work_entries")).toEqual(["w-r1"]);
    expect(ids("travel_entries")).toEqual(["t-r1"]);

    await deleteReport("r2");

    expect(ids("work_entries")).toEqual([]);
    expect(ids("travel_entries")).toEqual([]);
  });

  it("звіту нема (чужий або вже видалений) — нічого не видаляється", async () => {
    seedDay();

    const result = await deleteReport("missing");

    expect(result.error).toBe(uk.reportDetail.saveRejected);
    expect(ids("site_reports")).toEqual(["r1"]);
    expect(ids("work_entries")).toEqual(["w-r1"]);
    expect(ids("travel_entries")).toEqual(["t-r1"]);
  });
});

describe("новий звіт — повідомлення шефам", () => {
  const input = (patch: Partial<CreateReportInput> = {}): CreateReportInput => ({
    workDate: DAY,
    siteId: "site-1",
    description: "Покрівля",
    categoryIds: [],
    otherText: "",
    ...patch,
  });

  it("після збереження шефам іде повідомлення з автором і об'єктом", async () => {
    const result = await createReport(input());

    expect(result.error).toBeNull();
    expect(h.notifyBosses).toHaveBeenCalledTimes(1);
    expect(h.notifyBosses).toHaveBeenCalledWith({
      id: result.reportId,
      companyId: "company-1",
      authorId: "user-1",
      authorName: "Іван Петренко",
      siteId: "site-1",
    });
  });

  it("повторна відправка того самого звіту (втратилась відповідь) не дублює повідомлення", async () => {
    await createReport(input({ clientId: "client-a" }));
    const second = await createReport(input({ clientId: "client-a" }));

    expect(second.error).toBeNull();
    expect(ids("site_reports")).toHaveLength(1);
    expect(h.notifyBosses).toHaveBeenCalledTimes(1);
  });

  it("звіт не збережено — шефам нічого не йде", async () => {
    db.failInsertInto.add("site_reports");

    const result = await createReport(input());

    expect(result.error).not.toBeNull();
    expect(h.notifyBosses).not.toHaveBeenCalled();
  });
});
