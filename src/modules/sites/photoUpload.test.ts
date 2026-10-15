import { describe, expect, it, vi } from "vitest";

import { uploadSiteCover, type SiteCoverDeps } from "./photoUpload";

function deps(over: Partial<SiteCoverDeps> = {}) {
  const calls: string[] = [];
  const all: SiteCoverDeps = {
    compress: vi.fn(async () => {
      calls.push("compress");
      return new Blob(["x"]);
    }),
    createUpload: vi.fn(async () => {
      calls.push("createUpload");
      return { error: null, path: "co/site/file.webp", token: "tok" } as const;
    }),
    upload: vi.fn(async () => {
      calls.push("upload");
    }),
    setPhoto: vi.fn(async () => {
      calls.push("setPhoto");
      return { error: null };
    }),
    ...over,
  };

  return { all, calls };
}

const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

describe("uploadSiteCover", () => {
  it("идёт по шагам: сжать, получить ссылку, загрузить, записать обложкой; возвращает путь", async () => {
    const { all, calls } = deps();

    const path = await uploadSiteCover("site-1", file, all);

    expect(path).toBe("co/site/file.webp");
    expect(calls).toEqual(["compress", "createUpload", "upload", "setPhoto"]);
    expect(all.upload).toHaveBeenCalledWith("co/site/file.webp", "tok", expect.any(Blob));
    expect(all.setPhoto).toHaveBeenCalledWith("site-1", "co/site/file.webp");
  });

  it("сервер не выдал ссылку (чужой объект, нет входа) — ничего не загружается и обложка не меняется", async () => {
    const { all, calls } = deps({
      createUpload: vi.fn(async () => ({ error: "Не вдалося завантажити фото", path: null, token: null })),
    });

    await expect(uploadSiteCover("site-1", file, all)).rejects.toThrow("Не вдалося завантажити фото");
    expect(calls).toEqual(["compress"]);
  });

  it("загрузка оборвалась — обложка не меняется", async () => {
    const { all } = deps({
      upload: vi.fn(async () => {
        throw new Error("network");
      }),
    });

    await expect(uploadSiteCover("site-1", file, all)).rejects.toThrow("network");
    expect(all.setPhoto).not.toHaveBeenCalled();
  });

  it("сервер отказал записать обложку — ошибка доходит до человека", async () => {
    const { all } = deps({ setPhoto: vi.fn(async () => ({ error: "Не вдалося завантажити фото" })) });

    await expect(uploadSiteCover("site-1", file, all)).rejects.toThrow("Не вдалося завантажити фото");
  });

  it("не удалось сжать фото — на сервер ничего не уходит", async () => {
    const { all } = deps({
      compress: vi.fn(async () => {
        throw new Error("bad image");
      }),
    });

    await expect(uploadSiteCover("site-1", file, all)).rejects.toThrow("bad image");
    expect(all.createUpload).not.toHaveBeenCalled();
  });
});
