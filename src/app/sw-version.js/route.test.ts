import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /sw-version.js", () => {
  it("отдаёт номер сборки для сервис-воркера", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc123");

    const response = await GET();

    expect(await response.text()).toBe('self.VK_VERSION = "abc123";\n');
    expect(response.headers.get("content-type")).toContain("application/javascript");
  });

  it("не даёт кэшировать файл: иначе телефон не увидит новую версию", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc123");

    const response = await GET();

    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("без номера сборки подставляет dev", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "");

    const response = await GET();

    expect(await response.text()).toBe('self.VK_VERSION = "dev";\n');
  });
});
