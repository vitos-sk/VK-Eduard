import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { fail, ok, scriptedClient, type Call, type Script } from "@/test/scriptedSupabase";

const state = vi.hoisted(() => ({
  user: null as unknown,
  admin: null as unknown,
  profile: { id: "me", full_name: "Максим", company_id: "co", role: "worker" },
  notifyUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => (await import("@/lib/i18n/dictionaries")).getDictionary("uk") }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/modules/auth/session", () => ({ getProfile: async () => state.profile }));
vi.mock("@/modules/notifications/notify", () => ({ notifyUser: state.notifyUser }));

import { deleteChatChecklist } from "./actions";

const t = getDictionary("uk");

function calls(client: unknown): Call[] {
  return (client as { calls: Call[] }).calls;
}

/** Обычный клиент: сообщение видно только участнику чата, свою копию чеклиста он может удалить. */
function userScript(message: Record<string, unknown> | null): Script {
  return (call) => {
    if (call.table === "chat_messages" && call.op === "select") return ok(message);
    if (call.table === "checklists" && call.op === "delete") return ok([{ id: "L" }]);

    return fail(`неожиданный запрос ${call.op} ${call.table}`);
  };
}

beforeEach(() => {
  state.admin = scriptedClient(() => ok([{ id: "M" }]));
  state.profile.role = "worker";
  state.notifyUser.mockReset();
});

describe("deleteChatChecklist", () => {
  it("карточка не видна пользователю (чужой чат) — сервисный ключ не вызывается, ничего не удаляется", async () => {
    state.user = scriptedClient(userScript(null));

    const result = await deleteChatChecklist("M");

    expect(result.error).toBe(t.chats.card.deleteError);
    expect(calls(state.admin)).toHaveLength(0);
    expect(calls(state.user).some((call) => call.op === "delete")).toBe(false);
  });

  it("карточка видна — удаляется именно эта карточка чеклиста", async () => {
    state.user = scriptedClient(userScript({ id: "M", checklist_id: "L" }));

    const result = await deleteChatChecklist("M");

    expect(result.error).toBeNull();
    const [removal] = calls(state.admin);
    expect(removal).toMatchObject({ table: "chat_messages", op: "delete", filters: { id: "M", kind: "checklist" } });
  });

  it("копию чеклиста удаляют только по условию «владелец — я»: чужая копия не пострадает", async () => {
    state.user = scriptedClient(userScript({ id: "M", checklist_id: "L" }));

    await deleteChatChecklist("M");

    const copyDelete = calls(state.user).find((call) => call.table === "checklists" && call.op === "delete");
    expect(copyDelete?.filters).toEqual({ id: "L", owner_id: "me" });
  });

  it("карточку не удалось удалить — копия чеклиста остаётся", async () => {
    state.user = scriptedClient(userScript({ id: "M", checklist_id: "L" }));
    state.admin = scriptedClient(() => ok([]));

    const result = await deleteChatChecklist("M");

    expect(result.error).toBe(t.chats.card.deleteError);
    expect(calls(state.user).some((call) => call.table === "checklists" && call.op === "delete")).toBe(false);
  });

  it("ошибка базы при удалении карточки — отказ, копия цела", async () => {
    state.user = scriptedClient(userScript({ id: "M", checklist_id: "L" }));
    state.admin = scriptedClient(() => fail());

    const result = await deleteChatChecklist("M");

    expect(result.error).toBe(t.chats.card.deleteError);
    expect(calls(state.user).some((call) => call.op === "delete")).toBe(false);
  });

  describe("в чате объекта", () => {
    const siteCard = (senderId: string) => ({ id: "M", checklist_id: "L", sender_id: senderId, chats: { site_id: "S" } });

    it("карточку убирает её автор; сам чеклист автора остаётся в его списке", async () => {
      state.user = scriptedClient(userScript(siteCard("me")));

      const result = await deleteChatChecklist("M");

      expect(result.error).toBeNull();
      expect(calls(state.admin)).toHaveLength(1);
      expect(calls(state.user).some((call) => call.table === "checklists" && call.op === "delete")).toBe(false);
    });

    it("карточку убирает шеф, хотя автор другой", async () => {
      state.profile.role = "boss";
      state.user = scriptedClient(userScript(siteCard("other")));

      const result = await deleteChatChecklist("M");

      expect(result.error).toBeNull();
      expect(calls(state.admin)).toHaveLength(1);
    });

    it("рабочий не автор — отказ, сервисный ключ не вызывается", async () => {
      state.user = scriptedClient(userScript(siteCard("other")));

      const result = await deleteChatChecklist("M");

      expect(result.error).toBe(t.chats.card.deleteError);
      expect(calls(state.admin)).toHaveLength(0);
    });
  });

  it("копии уже нет (удалена раньше) — удаляется только карточка", async () => {
    state.user = scriptedClient(userScript({ id: "M", checklist_id: null }));

    const result = await deleteChatChecklist("M");

    expect(result.error).toBeNull();
    expect(calls(state.user).some((call) => call.table === "checklists")).toBe(false);
  });
});

// ── сообщения и открытие чата ──────────────────────────────────────────────────────────────

import { sendChatMessage, startChat } from "./actions";

describe("sendChatMessage", () => {
  const input = { chatId: "C", text: "  Беру пальник  ", clientId: "client-1" };

  function script(insert: { error?: { code?: string; message: string } }): Script {
    return (call) => {
      if (call.table === "chat_messages") return insert.error ? { data: null, error: insert.error } : ok(null);
      if (call.table === "chats") return ok({ user_a: "me", user_b: "other" });

      return fail("неожиданный запрос");
    };
  }

  it("пишет обычное сообщение от своего имени и уведомляет собеседника", async () => {
    const client = scriptedClient(script({}));
    state.user = client;

    const result = await sendChatMessage(input);

    expect(result.error).toBeNull();
    expect(client.calls[0].payload).toEqual({ client_id: "client-1", chat_id: "C", sender_id: "me", kind: "text", body: "Беру пальник" });
    expect(state.notifyUser.mock.calls[0].slice(0, 2)).toEqual(["other", "chatMessages"]);
  });

  it("пустое сообщение в базу не уходит", async () => {
    const client = scriptedClient(script({}));
    state.user = client;

    const result = await sendChatMessage({ ...input, text: "   " });

    expect(result.error).toBe(t.chats.sendError);
    expect(client.calls).toHaveLength(0);
  });

  it("повторная отправка того же сообщения не ошибка и не второй push", async () => {
    state.user = scriptedClient(script({ error: { code: "23505", message: "duplicate" } }));

    const result = await sendChatMessage(input);

    expect(result.error).toBeNull();
    expect(state.notifyUser).not.toHaveBeenCalled();
  });

  it("другая ошибка базы — сообщение об ошибке, без уведомления", async () => {
    state.user = scriptedClient(script({ error: { message: "нет прав" } }));

    const result = await sendChatMessage(input);

    expect(result.error).toBe(t.chats.sendError);
    expect(state.notifyUser).not.toHaveBeenCalled();
  });
});

describe("startChat", () => {
  it("возвращает id чата, который дала база", async () => {
    state.user = scriptedClient(() => ok("chat-1"));

    expect(await startChat("other")).toEqual({ error: null, chatId: "chat-1" });
  });

  it("чужая фирма или деактивированный — ошибка вместо чата", async () => {
    state.user = scriptedClient(() => fail("recipient not found"));

    const result = await startChat("other");

    expect(result.error).toBe(t.chats.startError);
  });
});

// ── чат объекта: сообщения всем, чеклист в чат, очистка и удаление ─────────────────────────

import { clearChat, deleteChat, postChecklistToChat } from "./actions";

/** Профили фирмы, которые видит обычный клиент: сам автор и ещё двое. */
const COLLEAGUES = [{ id: "me" }, { id: "w2" }, { id: "boss" }];

describe("sendChatMessage в чате объекта", () => {
  it("уведомляет всех активных сотрудников, кроме автора; в заголовке автор и объект", async () => {
    const client = scriptedClient((call) => {
      if (call.table === "chat_messages") return ok(null);
      if (call.table === "chats") return ok({ user_a: null, user_b: null, site_id: "S", sites: { name: "Дах" } });
      if (call.table === "profiles") return ok(COLLEAGUES);

      return fail("неожиданный запрос");
    });
    state.user = client;

    const result = await sendChatMessage({ chatId: "C", text: "Привіт усім", clientId: "client-9" });

    expect(result.error).toBeNull();
    expect(client.calls.find((call) => call.table === "profiles")?.filters).toEqual({ is_active: true });
    expect(state.notifyUser.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ["w2", "chatMessages"],
      ["boss", "chatMessages"],
    ]);

    const payload = state.notifyUser.mock.calls[0][2]("uk");
    expect(payload).toMatchObject({ title: "Максим · Дах", body: "Привіт усім", url: "/chats/C" });
  });
});

describe("postChecklistToChat", () => {
  function script(over: { rpc?: ReturnType<typeof ok> | ReturnType<typeof fail> } = {}): Script {
    return (call) => {
      if (call.table === "rpc:post_checklist_to_site_chat") return over.rpc ?? ok("msg-1");
      if (call.table === "chats") return ok({ sites: { name: "Дах" } });
      if (call.table === "checklists") return ok({ title: "Перед виїздом", checklist_items: [{ id: "i1" }, { id: "i2" }] });
      if (call.table === "profiles") return ok(COLLEAGUES);

      return fail("неожиданный запрос");
    };
  }

  it("кладёт свой чеклист в чат и уведомляет остальных сотрудников", async () => {
    const client = scriptedClient(script());
    state.user = client;

    const result = await postChecklistToChat("L", "C");

    expect(result.error).toBeNull();
    expect(client.calls[0]).toMatchObject({ table: "rpc:post_checklist_to_site_chat", payload: { p_checklist: "L", p_chat: "C" } });
    expect(state.notifyUser.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ["w2", "chatChecklists"],
      ["boss", "chatChecklists"],
    ]);

    const payload = state.notifyUser.mock.calls[0][2]("uk");
    expect(payload.title).toContain("Максим · Дах");
    expect(payload.url).toBe("/chats/C");
  });

  it("база отказала (не мой чеклист, чужой чат) — ошибка и никаких уведомлений", async () => {
    state.user = scriptedClient(script({ rpc: fail("checklist not found") }));

    const result = await postChecklistToChat("L", "C");

    expect(result.error).toBe(t.chats.attach.sendError);
    expect(state.notifyUser).not.toHaveBeenCalled();
  });
});

describe("clearChat", () => {
  it("просит базу очистить чат у этого человека", async () => {
    const client = scriptedClient(() => ok(null));
    state.user = client;

    const result = await clearChat("C");

    expect(result.error).toBeNull();
    expect(client.calls[0]).toMatchObject({ table: "rpc:clear_chat", payload: { p_chat: "C" } });
  });

  it("ошибка базы — понятное сообщение", async () => {
    state.user = scriptedClient(() => fail("row-level security"));

    expect((await clearChat("C")).error).toBe(t.chats.clearChat.error);
  });
});

describe("deleteChat", () => {
  it("удаляет именно этот чат", async () => {
    const client = scriptedClient(() => ok([{ id: "C" }]));
    state.user = client;

    const result = await deleteChat("C");

    expect(result.error).toBeNull();
    expect(client.calls[0]).toMatchObject({ table: "chats", op: "delete", filters: { id: "C" } });
  });

  it("база ничего не удалила (чат объекта или чужой чат) — ошибка", async () => {
    state.user = scriptedClient(() => ok([]));

    expect((await deleteChat("C")).error).toBe(t.chats.deleteChat.error);
  });

  it("ошибка базы — ошибка", async () => {
    state.user = scriptedClient(() => fail());

    expect((await deleteChat("C")).error).toBe(t.chats.deleteChat.error);
  });
});
