import { describe, expect, it } from "vitest";

import { fail, ok, scriptedClient, type Call } from "@/test/scriptedSupabase";

import { getChat, getMyChats, openSiteChat } from "./queries";

describe("getChat", () => {
  it("чат объекта: вид site, вместо собеседника — название объекта", async () => {
    const client = scriptedClient(() => ok({ id: "C", user_a: null, user_b: null, site_id: "S", sites: { name: "Дах" } }));

    const chat = await getChat(client as never, "C", "me");

    expect(chat).toEqual({
      id: "C",
      kind: "site",
      siteId: "S",
      otherId: null,
      otherName: "Дах",
      otherAvatarPath: null,
      otherIsBoss: false,
    });
  });

  it("чат 1 на 1: вид person, собеседник — второй из пары", async () => {
    const client = scriptedClient((call: Call) =>
      call.table === "chats"
        ? ok({ id: "C", user_a: "a", user_b: "me", site_id: null, sites: null })
        : ok({ full_name: "Олег", avatar_path: null, role: "boss" }),
    );

    const chat = await getChat(client as never, "C", "me");

    expect(chat).toEqual({
      id: "C",
      kind: "person",
      siteId: null,
      otherId: "a",
      otherName: "Олег",
      otherAvatarPath: null,
      otherIsBoss: true,
    });
  });

  it("чата нет (или он чужой и скрыт правами) — null", async () => {
    const client = scriptedClient(() => ok(null));

    expect(await getChat(client as never, "C", "me")).toBeNull();
  });
});

describe("getMyChats", () => {
  const row = (over: Record<string, unknown>) => ({
    out_chat: "C",
    out_other: null,
    out_site: null,
    out_site_name: null,
    out_last_at: "2026-10-21T10:00:00Z",
    out_last_kind: "text",
    out_last_body: "Привіт",
    out_last_title: null,
    out_last_sender: "p1",
    out_unread: 0,
    ...over,
  });

  it("личный чат и чат объекта: вид, название, и профили запрашиваются только за людей", async () => {
    const client = scriptedClient((call: Call) =>
      call.table === "rpc:my_chats"
        ? ok([
            row({ out_chat: "C1", out_other: "p1", out_unread: 2 }),
            row({ out_chat: "C2", out_site: "S", out_site_name: "Дах", out_last_kind: "checklist", out_last_title: "Перед виїздом" }),
          ])
        : ok([{ id: "p1", full_name: "Олег", avatar_path: null }]),
    );

    const chats = await getMyChats(client as never);

    expect(chats[0]).toMatchObject({ id: "C1", kind: "person", siteId: null, otherId: "p1", otherName: "Олег", unread: 2 });
    expect(chats[1]).toMatchObject({ id: "C2", kind: "site", siteId: "S", otherId: null, otherName: "Дах", lastKind: "checklist" });

    const profileCalls = client.calls.filter((call) => call.table === "profiles");
    expect(profileCalls).toHaveLength(1);
    expect(profileCalls[0].filters.id).toEqual(["p1"]);
  });

  it("только чаты объектов — профили не запрашиваются вовсе", async () => {
    const client = scriptedClient((call: Call) =>
      call.table === "rpc:my_chats" ? ok([row({ out_site: "S", out_site_name: "Дах" })]) : fail("профили не нужны"),
    );

    const chats = await getMyChats(client as never);

    expect(chats).toHaveLength(1);
    expect(client.calls.some((call) => call.table === "profiles")).toBe(false);
  });
});

describe("openSiteChat", () => {
  it("возвращает id чата объекта", async () => {
    const client = scriptedClient(() => ok("chat-1"));

    expect(await openSiteChat(client as never, "S")).toBe("chat-1");
    expect(client.calls[0]).toMatchObject({ table: "rpc:open_site_chat", payload: { p_site: "S" } });
  });

  it("ошибка базы (чужой объект, нет профиля) — null", async () => {
    const client = scriptedClient(() => fail("site not found"));

    expect(await openSiteChat(client as never, "S")).toBeNull();
  });
});
