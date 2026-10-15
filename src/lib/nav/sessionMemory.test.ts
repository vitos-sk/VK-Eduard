import { describe, expect, it } from "vitest";

import { readMemory, writeMemory, type MemoryStorage } from "./sessionMemory";

function fakeStorage(): MemoryStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();

  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("sessionMemory", () => {
  it("возвращает записанное значение", () => {
    const storage = fakeStorage();

    writeMemory(storage, "k", { tab: "team" }, 1_000);

    expect(readMemory(storage, "k", 2_000)).toEqual({ tab: "team" });
  });

  it("забывает записи старше срока: вернулись через несколько часов — экран с чистого листа", () => {
    const storage = fakeStorage();

    writeMemory(storage, "k", "old", 0);

    expect(readMemory(storage, "k", 31 * 60 * 1000)).toBeUndefined();
  });

  it("ломаный JSON и пустое хранилище не роняют экран", () => {
    const storage = fakeStorage();
    storage.setItem("vk-nav:bad", "{не json");

    expect(readMemory(storage, "bad", 0)).toBeUndefined();
    expect(readMemory(storage, "none", 0)).toBeUndefined();
  });

  it("недоступное хранилище (приватный режим) молча игнорируется", () => {
    const broken: MemoryStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(() => writeMemory(broken, "k", 1, 0)).not.toThrow();
    expect(readMemory(broken, "k", 0)).toBeUndefined();
  });
});
