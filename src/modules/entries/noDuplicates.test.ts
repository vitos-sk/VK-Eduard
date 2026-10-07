import { beforeEach, describe, expect, it, vi } from "vitest";

import { uk } from "@/lib/i18n/uk";
import { FakeDb } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => h.db }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => (await import("@/lib/i18n/uk")).uk }));
vi.mock("@/modules/auth/session", () => ({
  getProfile: async () => ({ id: "user-1", company_id: "company-1", role: "worker" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { createManualEntry, updateEntry, type ManualEntryInput } from "@/modules/entries/actions";
import { createReport, type CreateReportInput } from "@/modules/reports/actions";

let db: FakeDb;

const entryInput = (patch: Partial<ManualEntryInput> = {}): ManualEntryInput => ({
  workDate: "2026-10-05",
  siteId: "site-1",
  startedAt: "07:00",
  endedAt: "16:00",
  breakStart: null,
  breakEnd: null,
  description: "",
  ...patch,
});

const reportInput = (patch: Partial<CreateReportInput> = {}): CreateReportInput => ({
  workDate: "2026-10-05",
  siteId: "site-1",
  description: "Покрівля",
  categoryIds: [],
  otherText: "",
  time: { startedAt: "07:00", endedAt: "16:00", breakStart: null, breakEnd: null },
  ...patch,
});

const entries = () => db.rows("work_entries");
const reports = () => db.rows("site_reports");

beforeEach(() => {
  db = new FakeDb();
  h.db = db;
});

describe("время через «Додати час»", () => {
  it("повторная отправка той же записи (тот же clientId) не создаёт дубль", async () => {
    const input = entryInput({ clientId: "client-a" });

    const first = await createManualEntry(input);
    const second = await createManualEntry(input);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.entryId).toBe(first.entryId);
    expect(entries()).toHaveLength(1);
  });

  it("то же время с другим clientId (нажали «Зберегти» заново на новой форме) — отказ", async () => {
    await createManualEntry(entryInput({ clientId: "client-a" }));

    const again = await createManualEntry(entryInput({ clientId: "client-b" }));

    expect(again.error).toBe(uk.manualTime.errorOverlap);
    expect(entries()).toHaveLength(1);
  });

  it("частично пересекающееся время — отказ, а смены встык и в другой день — можно", async () => {
    await createManualEntry(entryInput({ startedAt: "07:00", endedAt: "12:00" }));

    expect((await createManualEntry(entryInput({ startedAt: "11:00", endedAt: "15:00" }))).error).toBe(
      uk.manualTime.errorOverlap,
    );
    expect((await createManualEntry(entryInput({ startedAt: "12:00", endedAt: "16:00" }))).error).toBeNull();
    expect((await createManualEntry(entryInput({ workDate: "2026-10-06" }))).error).toBeNull();
    expect(entries()).toHaveLength(3);
  });

  it("ночная смена блокирует время на следующий день", async () => {
    await createManualEntry(entryInput({ startedAt: "22:00", endedAt: "06:00" }));

    const morning = await createManualEntry(entryInput({ workDate: "2026-10-06", startedAt: "05:00", endedAt: "08:00" }));

    expect(morning.error).toBe(uk.manualTime.errorOverlap);
  });

  it("время другого человека не мешает", async () => {
    entries().push({
      id: "other",
      client_id: "x",
      author_id: "user-2",
      work_date: "2026-10-05",
      started_at: "07:00:00",
      ended_at: "16:00:00",
    });

    expect((await createManualEntry(entryInput())).error).toBeNull();
  });
});

describe("время через звіт", () => {
  it("повторная отправка того же звіту (потерялся ответ, нажали ещё раз) — одна смена и один звіт", async () => {
    const input = reportInput({ clientId: "r-1", timeClientId: "t-1" });

    const first = await createReport(input);
    const second = await createReport(input);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.reportId).toBe(first.reportId);
    expect(reports()).toHaveLength(1);
    expect(entries()).toHaveLength(1);
  });

  it("повтор с дорогой тоже не плодит записи дороги", async () => {
    const input = reportInput({
      clientId: "r-1",
      timeClientId: "t-1",
      travelClientId: "d-1",
      travel: { startedAt: "05:30", endedAt: "06:30", km: 20 },
    });

    await createReport(input);
    await createReport(input);

    expect(db.rows("travel_entries")).toHaveLength(1);
  });

  it("время уже внесено через «Додати час» — звіт с тем же временем не сохраняется вовсе", async () => {
    await createManualEntry(entryInput({ clientId: "client-a" }));

    const result = await createReport(reportInput({ clientId: "r-1", timeClientId: "t-1" }));

    expect(result.error).toBe(uk.manualTime.errorOverlap);
    expect(result.reportId).toBeNull();
    expect(reports()).toHaveLength(0);
    expect(entries()).toHaveLength(1);
  });

  it("время уже внесено через звіт — «Додати час» с тем же временем отказывает", async () => {
    await createReport(reportInput({ clientId: "r-1", timeClientId: "t-1" }));

    const result = await createManualEntry(entryInput({ clientId: "client-a" }));

    expect(result.error).toBe(uk.manualTime.errorOverlap);
    expect(entries()).toHaveLength(1);
  });

  it("два звіти в один день с разным временем — обе смены сохраняются", async () => {
    await createReport(
      reportInput({ clientId: "r-1", timeClientId: "t-1", time: { startedAt: "07:00", endedAt: "11:00", breakStart: null, breakEnd: null } }),
    );
    const second = await createReport(
      reportInput({ clientId: "r-2", timeClientId: "t-2", time: { startedAt: "12:00", endedAt: "16:00", breakStart: null, breakEnd: null } }),
    );

    expect(second.error).toBeNull();
    expect(reports()).toHaveLength(2);
    expect(entries()).toHaveLength(2);
  });

  it("звіт без часов не трогает смены и не блокируется ими", async () => {
    await createManualEntry(entryInput());

    const result = await createReport(reportInput({ time: null }));

    expect(result.error).toBeNull();
    expect(entries()).toHaveLength(1);
  });

  it("не удалось записать смену — звіт откатывается, повтор не оставляет дублей", async () => {
    db.failInsertInto.add("work_entries");

    const failed = await createReport(reportInput({ clientId: "r-1", timeClientId: "t-1" }));

    expect(failed.error).toBe(uk.reportForm.saveError);
    expect(reports()).toHaveLength(0);

    db.failInsertInto.clear();

    const retry = await createReport(reportInput({ clientId: "r-1", timeClientId: "t-1" }));

    expect(retry.error).toBeNull();
    expect(reports()).toHaveLength(1);
    expect(entries()).toHaveLength(1);
  });
});

describe("правка записи", () => {
  it("можно менять время, не конфликтуя с самой собой", async () => {
    const created = await createManualEntry(entryInput());

    const result = await updateEntry(created.entryId!, entryInput({ endedAt: "17:00" }));

    expect(result.error).toBeNull();
  });

  it("нельзя сдвинуть запись на время другой своей записи", async () => {
    await createManualEntry(entryInput({ startedAt: "07:00", endedAt: "11:00" }));
    const second = await createManualEntry(entryInput({ startedAt: "12:00", endedAt: "16:00" }));

    const result = await updateEntry(second.entryId!, entryInput({ startedAt: "10:00", endedAt: "16:00" }));

    expect(result.error).toBe(uk.manualTime.errorOverlap);
    expect(entries().find((entry) => entry.id === second.entryId)?.started_at).toBe("12:00");
  });
});
