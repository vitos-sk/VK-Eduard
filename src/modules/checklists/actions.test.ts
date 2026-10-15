import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { fail, ok, scriptedClient, type Script } from "@/test/scriptedSupabase";

const state = vi.hoisted(() => ({
  user: null as unknown,
  admin: null as unknown,
  profile: { id: "me", full_name: "Максим", company_id: "co" },
  notifyUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Настоящий redirect() прерывает выполнение исключением; тест узнаёт его по тексту.
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => (await import("@/lib/i18n/dictionaries")).getDictionary("uk") }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/modules/auth/session", () => ({ getProfile: async () => state.profile }));
vi.mock("@/modules/notifications/notify", () => ({ notifyUser: state.notifyUser }));
vi.mock("@/modules/chats/queries", () => ({ findChatId: async () => "chat-1" }));

import { deleteChecklist, setItemDone } from "./actions";

const t = getDictionary("uk");

/** Что обычный клиент (с правами RLS) «видит» и может менять. */
function userScript(opts: { canUpdate: boolean; itemVisible: boolean; list: Record<string, unknown> }): Script {
  return (call) => {
    if (call.table === "checklist_items" && call.op === "update") {
      return ok(opts.canUpdate ? { checklist_id: "L" } : null);
    }
    if (call.table === "checklist_items" && call.op === "select") {
      return ok(opts.itemVisible ? { id: "I", checklist_id: "L" } : null);
    }
    if (call.table === "checklists" && call.op === "select") return ok(opts.list);

    return fail(`неожиданный запрос ${call.op} ${call.table}`);
  };
}

const list = (over: Record<string, unknown> = {}) => ({
  id: "L",
  title: "Перед виїздом",
  owner_id: "me",
  sent_by: null,
  checklist_items: [{ done_at: "2026-10-15T07:00:00Z" }, { done_at: null }],
  ...over,
});

beforeEach(() => {
  state.notifyUser.mockReset();
  state.admin = scriptedClient(() => ok(null));
});

function adminCalls() {
  return (state.admin as { calls: unknown[] }).calls;
}

describe("setItemDone: свой пункт", () => {
  it("владелец отмечает сам, сервисный ключ не нужен", async () => {
    state.user = scriptedClient(userScript({ canUpdate: true, itemVisible: true, list: list() }));

    const result = await setItemDone("I", true);

    expect(result).toEqual({ error: null, done: 1, total: 2 });
    expect(adminCalls()).toHaveLength(0);
  });

  it("получатель отметил последний пункт — приславшему уходит «чеклист виконано»", async () => {
    state.user = scriptedClient(
      userScript({
        canUpdate: true,
        itemVisible: true,
        list: list({ sent_by: "boss", checklist_items: [{ done_at: "a" }, { done_at: "b" }] }),
      }),
    );

    await setItemDone("I", true);

    expect(state.notifyUser).toHaveBeenCalledTimes(1);
    expect(state.notifyUser.mock.calls[0][0]).toBe("boss");
    expect(state.notifyUser.mock.calls[0][1]).toBe("checklistDone");
  });

  it("не последний пункт — уведомления нет", async () => {
    state.user = scriptedClient(userScript({ canUpdate: true, itemVisible: true, list: list({ sent_by: "boss" }) }));

    await setItemDone("I", true);

    expect(state.notifyUser).not.toHaveBeenCalled();
  });
});

describe("setItemDone: приславший отмечает пункт копии коллеги в чате", () => {
  it("пункт ему виден (RLS) — меняется одна колонка done_at этого пункта", async () => {
    state.user = scriptedClient(userScript({ canUpdate: false, itemVisible: true, list: list({ owner_id: "other" }) }));

    const result = await setItemDone("I", true);

    expect(result.error).toBeNull();
    const [update] = adminCalls() as { table: string; op: string; filters: Record<string, unknown>; payload: Record<string, unknown> }[];
    expect(update.table).toBe("checklist_items");
    expect(update.op).toBe("update");
    expect(update.filters).toEqual({ id: "I" });
    expect(Object.keys(update.payload)).toEqual(["done_at"]);
    expect(typeof update.payload.done_at).toBe("string");
  });

  it("снятие отметки пишет null", async () => {
    state.user = scriptedClient(userScript({ canUpdate: false, itemVisible: true, list: list({ owner_id: "other" }) }));

    await setItemDone("I", false);

    expect((adminCalls() as { payload: unknown }[])[0].payload).toEqual({ done_at: null });
  });

  it("когда приславший завершает чеклист за коллегу, уведомлять некого", async () => {
    state.user = scriptedClient(
      userScript({
        canUpdate: false,
        itemVisible: true,
        list: list({ owner_id: "other", sent_by: "me", checklist_items: [{ done_at: "a" }, { done_at: "b" }] }),
      }),
    );

    await setItemDone("I", true);

    expect(state.notifyUser).not.toHaveBeenCalled();
  });

  it("пункт ему не виден (чужой чеклист) — сервисный ключ не вызывается вообще", async () => {
    state.user = scriptedClient(userScript({ canUpdate: false, itemVisible: false, list: list() }));

    const result = await setItemDone("I", true);

    expect(result.error).toBe(t.checklists.view.toggleError);
    expect(adminCalls()).toHaveLength(0);
  });

  it("ошибка сервисного ключа — отметка не засчитывается", async () => {
    state.user = scriptedClient(userScript({ canUpdate: false, itemVisible: true, list: list({ owner_id: "other" }) }));
    state.admin = scriptedClient(() => fail());

    const result = await setItemDone("I", true);

    expect(result.error).toBe(t.checklists.view.toggleError);
  });

  it("ошибка базы при обычном обновлении — сразу отказ, без попытки обойти права", async () => {
    state.user = scriptedClient(() => fail());

    const result = await setItemDone("I", true);

    expect(result.error).toBe(t.checklists.view.toggleError);
    expect(adminCalls()).toHaveLength(0);
  });
});

// ── создание, правка, отправка ──────────────────────────────────────────────────────────────

import { acceptChecklist, createChecklist, sendChecklist, updateChecklist } from "./actions";

const item = (text: string, id: string | null = null) => ({ id, text });

describe("createChecklist", () => {
  it("создаёт чеклист от имени человека, затем пункты по порядку, и возвращает id пунктов", async () => {
    const client = scriptedClient((call) => {
      if (call.table === "checklists" && call.op === "insert") return ok({ id: "L" });
      if (call.table === "checklist_items" && call.op === "insert") return ok(null);
      if (call.table === "checklist_items" && call.op === "select") return ok([{ id: "i1" }, { id: "i2" }]);

      return fail("неожиданный запрос");
    });
    state.user = client;

    const result = await createChecklist({ title: "  Перед  виїздом ", siteId: null, items: [item("Бус"), item("   "), item("Пальник")] });

    expect(result).toEqual({ error: null, id: "L", itemIds: ["i1", "i2"] });
    expect(client.calls[0].payload).toEqual({ company_id: "co", owner_id: "me", title: "Перед виїздом", site_id: null });
    expect(client.calls[1].payload).toEqual([
      { checklist_id: "L", text: "Бус", sort_order: 0 },
      { checklist_id: "L", text: "Пальник", sort_order: 1 },
    ]);
  });

  it("не удалось сохранить пункты — заготовка чеклиста убирается, чтобы повтор не создал второй", async () => {
    const client = scriptedClient((call) => {
      if (call.table === "checklists" && call.op === "insert") return ok({ id: "L" });
      if (call.table === "checklist_items") return fail();
      if (call.table === "checklists" && call.op === "delete") return ok(null);

      return fail("неожиданный запрос");
    });
    state.user = client;

    const result = await createChecklist({ title: "Список", siteId: null, items: [item("Бус")] });

    expect(result.error).toBe(t.checklists.form.errors.save);
    expect(client.calls.find((call) => call.op === "delete")).toMatchObject({ table: "checklists", filters: { id: "L" } });
  });

  it("без пунктов или без названия в базу ничего не уходит", async () => {
    const client = scriptedClient(() => fail("не должно вызываться"));
    state.user = client;

    expect((await createChecklist({ title: "Список", siteId: null, items: [item("  ")] })).error).toBe(t.checklists.form.errors.items);
    expect((await createChecklist({ title: "  ", siteId: null, items: [item("Бус")] })).error).toBe(t.checklists.form.errors.title);
    expect(client.calls).toHaveLength(0);
  });
});

describe("updateChecklist", () => {
  function script(updated: boolean): Script {
    return (call) => {
      if (call.table === "checklists" && call.op === "update") return ok(updated ? { id: "L" } : null);
      if (call.table === "checklist_items" && call.op === "select" && call.filters.checklist_id === "L") {
        return ok(call.payload === null && !("sort" in call.filters) ? [{ id: "i1" }, { id: "i2" }] : []);
      }
      if (call.table === "checklist_items") return ok(null);

      return fail("неожиданный запрос");
    };
  }

  it("убирает исчезнувшие пункты, меняет оставшиеся (id сохраняются) и добавляет новые", async () => {
    const client = scriptedClient((call) => {
      if (call.table === "checklist_items" && call.op === "select" && call.filters.checklist_id === "L") {
        // первый select — «какие пункты есть», второй — «id по порядку» после правки
        const selects = client.calls.filter((c) => c.table === "checklist_items" && c.op === "select").length;
        return ok(selects === 1 ? [{ id: "i1" }, { id: "i2" }] : [{ id: "i2" }, { id: "i3" }]);
      }

      return script(true)(call);
    });
    state.user = client;

    const result = await updateChecklist("L", { title: "Новое", siteId: null, items: [item("Второй", "i2"), item("Новый")] });

    expect(result).toEqual({ error: null, id: "L", itemIds: ["i2", "i3"] });
    expect(client.calls.find((call) => call.op === "delete")).toMatchObject({ table: "checklist_items", filters: { id: ["i1"] } });
    expect(client.calls.find((call) => call.op === "upsert")?.payload).toEqual([{ id: "i2", checklist_id: "L", text: "Второй", sort_order: 0 }]);
    expect(client.calls.find((call) => call.op === "insert")?.payload).toEqual([{ checklist_id: "L", text: "Новый", sort_order: 1 }]);
  });

  it("править можно только свой чеклист, не присланную копию", async () => {
    const client = scriptedClient(script(true));
    state.user = client;

    await updateChecklist("L", { title: "Новое", siteId: null, items: [item("Бус", "i1")] });

    expect(client.calls[0].filters).toEqual({ id: "L", owner_id: "me", origin_id: null });
  });

  it("чужой или присланный чеклист не найден — пункты не трогаются", async () => {
    const client = scriptedClient(script(false));
    state.user = client;

    const result = await updateChecklist("L", { title: "Новое", siteId: null, items: [item("Бус")] });

    expect(result.error).toBe(t.checklists.form.errors.notFound);
    expect(client.calls.every((call) => call.table === "checklists")).toBe(true);
  });

  it("id пункта из другого чеклиста не подменяет чужой пункт: он считается новым", async () => {
    const client = scriptedClient((call) => {
      if (call.table === "checklist_items" && call.op === "select") return ok([{ id: "i1" }]);

      return script(true)(call);
    });
    state.user = client;

    await updateChecklist("L", { title: "Новое", siteId: null, items: [item("Чужой", "alien"), item("Бус", "i1")] });

    expect(client.calls.find((call) => call.op === "upsert")?.payload).toEqual([{ id: "i1", checklist_id: "L", text: "Бус", sort_order: 1 }]);
    expect(client.calls.find((call) => call.op === "insert")?.payload).toEqual([{ checklist_id: "L", text: "Чужой", sort_order: 0 }]);
  });
});

describe("sendChecklist", () => {
  const source = { title: "Перед виїздом", checklist_items: [{ id: "a" }, { id: "b" }] };

  it("отправляет через функцию базы и каждому получателю шлёт уведомление «новый чеклист»", async () => {
    const client = scriptedClient((call) => {
      if (call.table === "checklists") return ok(source);
      if (call.table === "rpc:send_checklist") {
        return ok([
          { out_recipient: "u1", out_chat: "c1", out_copy: "k1" },
          { out_recipient: "u2", out_chat: "c2", out_copy: "k2" },
        ]);
      }

      return fail("неожиданный запрос");
    });
    state.user = client;

    const result = await sendChecklist("L", ["u1", "u2"]);

    expect(result).toEqual({
      error: null,
      chats: [
        { recipientId: "u1", chatId: "c1" },
        { recipientId: "u2", chatId: "c2" },
      ],
    });
    expect(client.calls.find((call) => call.table === "rpc:send_checklist")?.payload).toEqual({ p_checklist: "L", p_recipients: ["u1", "u2"] });
    expect(state.notifyUser.mock.calls.map((args) => [args[0], args[1]])).toEqual([
      ["u1", "chatChecklists"],
      ["u2", "chatChecklists"],
    ]);
  });

  it("чужой чеклист (не найден среди своих) — в базу не отправляется, уведомлений нет", async () => {
    const client = scriptedClient((call) => (call.table === "checklists" ? ok(null) : fail("не должно вызываться")));
    state.user = client;

    const result = await sendChecklist("L", ["u1"]);

    expect(result.error).toBe(t.checklists.form.errors.notFound);
    expect(client.calls.some((call) => call.table.startsWith("rpc:"))).toBe(false);
    expect(state.notifyUser).not.toHaveBeenCalled();
  });

  it("база отказала (чужая фирма, деактивированный) — понятная ошибка и без уведомлений", async () => {
    state.user = scriptedClient((call) => (call.table === "checklists" ? ok(source) : fail("recipient not found")));

    const result = await sendChecklist("L", ["u1"]);

    expect(result.error).toBe(t.checklists.send.error);
    expect(state.notifyUser).not.toHaveBeenCalled();
  });
});

describe("acceptChecklist", () => {
  it("мусорная ссылка не доходит до базы", async () => {
    const client = scriptedClient(() => fail("не должно вызываться"));
    state.user = client;

    const result = await acceptChecklist("../../etc/passwd");

    expect(result.error).toBe(t.checklists.landing.error);
    expect(client.calls).toHaveLength(0);
  });

  it("по настоящей ссылке возвращает id своей копии", async () => {
    state.user = scriptedClient(() => ok([{ out_copy: "K", out_chat: "C", out_created: true }]));

    expect(await acceptChecklist("8fa2c91d0b3e7a64")).toEqual({ error: null, copyId: "K" });
  });

  it("ссылка не подошла (чужая фирма, нет такого) — ошибка, а не пустой экран", async () => {
    state.user = scriptedClient(() => fail("checklist not found"));

    const result = await acceptChecklist("8fa2c91d0b3e7a64");

    expect(result.error).toBe(t.checklists.landing.error);
  });
});

describe("deleteChecklist", () => {
  it("после удаления переводит на «Чеклисти», а не оставляет на странице удалённого чеклиста", async () => {
    const client = scriptedClient((call) => (call.op === "delete" ? ok([{ id: "L" }]) : fail("неожиданный запрос")));
    state.user = client;

    await expect(deleteChecklist("L")).rejects.toThrow("REDIRECT:/checklists?deleted=1");
    expect(client.calls[0]).toMatchObject({ table: "checklists", op: "delete", filters: { id: "L", owner_id: "me" } });
  });

  it("чужой чеклист (ничего не удалилось) — ошибка, без перехода", async () => {
    state.user = scriptedClient(() => ok([]));

    const result = await deleteChecklist("L");

    expect(result.error).toBe(t.checklists.view.deleteError);
  });

  it("ошибка базы — ошибка, без перехода", async () => {
    state.user = scriptedClient(() => fail());

    const result = await deleteChecklist("L");

    expect(result.error).toBe(t.checklists.view.deleteError);
  });
});
