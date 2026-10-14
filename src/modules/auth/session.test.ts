import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  result: { data: null, error: null } as { data: unknown; error: { message: string } | null },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.userId ? { "x-user-id": state.userId } : {}),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => state.result }) }),
      }),
    }),
  }),
}));

import { requireProfile } from "./session";

beforeEach(() => {
  state.userId = "user-1";
  state.result = { data: null, error: null };
});

describe("requireProfile", () => {
  it("вошедшего без активного профиля не шлёт на /welcome (оттуда прокси вернёт на / — бесконечный цикл)", async () => {
    await expect(requireProfile()).rejects.toThrow("REDIRECT:/auth/signout");
  });

  it("сбой запроса к базе — ошибка, а не редирект и не выход из аккаунта", async () => {
    state.result = { data: null, error: { message: "timeout" } };

    await expect(requireProfile()).rejects.toThrow(/timeout/);
  });

  it("активный профиль возвращает как есть", async () => {
    state.result = { data: { id: "user-1" }, error: null };

    await expect(requireProfile()).resolves.toEqual({ id: "user-1" });
  });
});
