import { describe, expect, it, vi } from "vitest";

import { openExternal } from "./openExternal";

function fakeWindow(opened: object | null) {
  return { open: vi.fn(() => opened), location: { href: "https://app.example/checklists/1" } } as unknown as Pick<Window, "open" | "location"> & {
    open: ReturnType<typeof vi.fn>;
  };
}

describe("openExternal", () => {
  it("открывает ссылку в новой вкладке и не уводит приложение", () => {
    const win = fakeWindow({ opener: "app" });

    openExternal("https://wa.me/?text=hi", win);

    expect(win.open).toHaveBeenCalledWith("https://wa.me/?text=hi", "_blank");
    expect(win.location.href).toBe("https://app.example/checklists/1");
  });

  it("обрывает связь новой вкладки с приложением", () => {
    const tab = { opener: "app" as string | null };

    openExternal("https://wa.me/", fakeWindow(tab));

    expect(tab.opener).toBeNull();
  });

  it("не дали открыть вкладку — переходит по ссылке в этой", () => {
    const win = fakeWindow(null);

    openExternal("https://wa.me/?text=hi", win);

    expect(win.location.href).toBe("https://wa.me/?text=hi");
  });

  it("не передаёт noopener в open (иначе open всегда возвращает null)", () => {
    const win = fakeWindow({ opener: null });

    openExternal("https://wa.me/", win);

    expect(win.open.mock.calls[0]).toHaveLength(2);
  });
});
