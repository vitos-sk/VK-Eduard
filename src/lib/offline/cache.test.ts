import { describe, expect, it, vi } from "vitest";

import { loadWithCache } from "./cache";

describe("loadWithCache", () => {
  it("без кэша отдаёт только свежее", async () => {
    const onData = vi.fn();

    await loadWithCache({ key: "t:a", fetcher: async () => 1, onData });

    expect(onData.mock.calls).toEqual([[1, "network"]]);
  });

  it("с кэшем сначала отдаёт сохранённое, потом свежее", async () => {
    const onData = vi.fn();

    await loadWithCache({ key: "t:b", fetcher: async () => 1, onData });
    onData.mockClear();
    await loadWithCache({ key: "t:b", fetcher: async () => 2, onData });

    expect(onData.mock.calls).toEqual([[1, "cache"], [2, "network"]]);
  });

  it("нет сети, но кэш есть — остаёмся с кэшем без ошибки", async () => {
    const onData = vi.fn();

    await loadWithCache({ key: "t:c", fetcher: async () => 1, onData });
    onData.mockClear();

    await expect(
      loadWithCache({ key: "t:c", fetcher: async () => Promise.reject(new Error("offline")), onData }),
    ).resolves.toBeUndefined();
    expect(onData.mock.calls).toEqual([[1, "cache"]]);
  });

  it("нет сети и нет кэша — ошибка пробрасывается", async () => {
    await expect(
      loadWithCache({ key: "t:d", fetcher: async () => Promise.reject(new Error("offline")), onData: () => {} }),
    ).rejects.toThrow("offline");
  });

  it("устаревший ответ не применяется, если экран уже ушёл", async () => {
    const onData = vi.fn();

    await loadWithCache({ key: "t:e", fetcher: async () => 1, onData, isCancelled: () => true });

    expect(onData).not.toHaveBeenCalled();
  });
});
