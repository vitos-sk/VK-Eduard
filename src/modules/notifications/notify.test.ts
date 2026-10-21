import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeDb } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({
  admin: null as unknown,
  configure: vi.fn(),
  deliver: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => h.admin }));
vi.mock("@/lib/push/server", () => ({ configureWebPush: h.configure, deliverPush: h.deliver }));

import { notifyUser, pushToUser } from "./notify";

let db: FakeDb;

const build = (locale: string) => ({ title: "T", body: locale, url: "/", tag: "t" });
const device = (id: string, userId = "boss", locale = "uk") =>
  db.rows("push_subscriptions").push({ id, user_id: userId, endpoint: `https://push.example/${id}`, p256dh: "k", auth: "a", locale });

beforeEach(() => {
  db = new FakeDb();
  h.admin = db;
  h.configure.mockReset();
  h.deliver.mockReset();
  h.deliver.mockResolvedValue("sent");
});

describe("pushToUser", () => {
  it("нет подписанных устройств — ничего не шлёт и не требует ключей", async () => {
    const outcome = await pushToUser("boss", null, build);

    expect(outcome).toEqual({ devices: 0, sent: 0, failed: 0, removed: 0, muted: false });
    expect(h.deliver).not.toHaveBeenCalled();
    expect(h.configure).not.toHaveBeenCalled();
  });

  it("шлёт на каждое устройство человека, текст — на языке устройства; чужие устройства не трогает", async () => {
    device("a", "boss", "uk");
    device("b", "boss", "nl");
    device("other", "someone-else");

    const outcome = await pushToUser("boss", null, build);

    expect(outcome).toMatchObject({ devices: 2, sent: 2, failed: 0, removed: 0 });
    expect(h.deliver).toHaveBeenCalledTimes(2);
    expect(h.deliver.mock.calls.map((call) => (call[1] as { body: string }).body).sort()).toEqual(["nl", "uk"]);
  });

  it("не дошло — считается неудачей и подписка остаётся; отозванную браузером подписку удаляет", async () => {
    device("ok");
    device("bad");
    device("gone");
    h.deliver.mockImplementation(async (target: { endpoint: string }) =>
      target.endpoint.endsWith("/bad") ? "failed" : target.endpoint.endsWith("/gone") ? "gone" : "sent",
    );

    const outcome = await pushToUser("boss", null, build);

    expect(outcome).toMatchObject({ devices: 3, sent: 1, failed: 1, removed: 1 });
    expect(db.rows("push_subscriptions").map((row) => row.id).sort()).toEqual(["bad", "ok"]);
  });

  it("человек выключил этот вид уведомлений — не шлёт; без переключателя (null) выключатель не нужен", async () => {
    device("a");
    db.rows("notification_prefs").push({
      user_id: "boss",
      report_reminder: true,
      chat_messages: false,
      chat_checklists: true,
      checklist_done: true,
    });

    expect(await pushToUser("boss", "chatMessages", build)).toMatchObject({ devices: 1, sent: 0, muted: true });
    expect(h.deliver).not.toHaveBeenCalled();

    expect(await pushToUser("boss", null, build)).toMatchObject({ devices: 1, sent: 1, muted: false });
  });

  it("нет ключей VAPID — ошибка доходит до вызывающего (проверка покажет «сервер не настроен»)", async () => {
    device("a");
    h.configure.mockImplementation(() => {
      throw new Error("Не заданы NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.");
    });

    await expect(pushToUser("boss", null, build)).rejects.toThrow(/VAPID/);
  });
});

describe("notifyUser", () => {
  it("ошибку не пробрасывает: пишет в журнал и возвращает null — отчёт или сообщение сохраняются как обычно", async () => {
    device("a");
    h.configure.mockImplementation(() => {
      throw new Error("нет ключей");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(notifyUser("boss", null, build)).resolves.toBeNull();
    expect(log).toHaveBeenCalled();

    log.mockRestore();
  });

  it("при успехе возвращает итог доставки", async () => {
    device("a");

    await expect(notifyUser("boss", null, build)).resolves.toMatchObject({ devices: 1, sent: 1 });
  });
});
