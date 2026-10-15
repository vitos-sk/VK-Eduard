import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";

const COMPANY = "11111111-1111-4111-8111-111111111111";
const SITE = "22222222-2222-4222-8222-222222222222";
const OTHER_SITE = "99999999-9999-4999-8999-999999999999";
const FILE = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  admin: null as unknown,
  site: null as unknown,
  profile: { id: "me", full_name: "Максим", company_id: "11111111-1111-4111-8111-111111111111" } as unknown,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getT: async () => (await import("@/lib/i18n/dictionaries")).getDictionary("uk") }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/modules/auth/session", () => ({ getProfile: async () => state.profile }));
vi.mock("./queries", () => ({ getSiteById: async () => state.site }));

import { createSitePhotoUpload, setSitePhoto } from "./photoActions";

const t = getDictionary("uk");

/** Сервисный клиент, который записывает, что с ним делали. */
function adminStub(opts: { fileMissing?: boolean; updateError?: boolean } = {}) {
  const log = {
    signedUploads: [] as string[],
    signedUrls: [] as string[],
    removed: [] as string[][],
    updates: [] as { payload: unknown; id: unknown }[],
  };

  const client = {
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) => {
          log.signedUploads.push(path);
          return { data: { token: "tok", path, signedUrl: "u" }, error: null };
        },
        createSignedUrl: async (path: string) => {
          log.signedUrls.push(path);
          return opts.fileMissing ? { data: null, error: { message: "Object not found" } } : { data: { signedUrl: "u" }, error: null };
        },
        remove: async (paths: string[]) => {
          log.removed.push(paths);
          return { data: null, error: null };
        },
      }),
    },
    from: () => ({
      update: (payload: unknown) => ({
        eq: async (_column: string, id: unknown) => {
          log.updates.push({ payload, id });
          return { error: opts.updateError ? { message: "boom" } : null };
        },
      }),
    }),
  };

  return { log, client };
}

const site = (over: Record<string, unknown> = {}) => ({ id: SITE, company_id: COMPANY, photo_path: null, ...over });
const newPath = `${COMPANY}/${SITE}/${FILE}.webp`;

beforeEach(() => {
  state.site = site();
  state.profile = { id: "me", full_name: "Максим", company_id: COMPANY };
});

describe("createSitePhotoUpload: ссылка на загрузку", () => {
  it("любому сотруднику фирмы выдаётся ссылка в папку этого объекта", async () => {
    const admin = adminStub();
    state.admin = admin.client;

    const result = await createSitePhotoUpload(SITE);

    expect(result.error).toBeNull();
    expect(result.path).toMatch(new RegExp(`^${COMPANY}/${SITE}/[0-9a-f-]{36}\\.webp$`));
    expect(result.token).toBe("tok");
    expect(admin.log.signedUploads).toEqual([result.path]);
  });

  it("объект не виден человеку (чужая фирма) — ссылка не выдаётся, сервисный ключ не вызывается", async () => {
    const admin = adminStub();
    state.admin = admin.client;
    state.site = null;

    const result = await createSitePhotoUpload(SITE);

    expect(result.error).toBe(t.objects.form.uploadPhotoError);
    expect(admin.log.signedUploads).toHaveLength(0);
  });

  it("мусорный адрес объекта не доходит до базы", async () => {
    const admin = adminStub();
    state.admin = admin.client;

    const result = await createSitePhotoUpload("../../etc");

    expect(result.error).toBe(t.objects.form.uploadPhotoError);
    expect(admin.log.signedUploads).toHaveLength(0);
  });

  it("без входа — отказ", async () => {
    state.admin = adminStub().client;
    state.profile = null;

    expect((await createSitePhotoUpload(SITE)).error).toBe(t.auth.noProfile);
  });
});

describe("setSitePhoto: фото становится обложкой", () => {
  it("записывает путь в photo_path этого объекта (одна колонка) и удаляет прежнее фото", async () => {
    const admin = adminStub();
    state.admin = admin.client;
    state.site = site({ photo_path: `${COMPANY}/${SITE}/old.webp` });

    const result = await setSitePhoto(SITE, newPath);

    expect(result.error).toBeNull();
    expect(admin.log.updates).toEqual([{ payload: { photo_path: newPath }, id: SITE }]);
    expect(admin.log.removed).toEqual([[`${COMPANY}/${SITE}/old.webp`]]);
  });

  it("у объекта не было фото — удалять нечего", async () => {
    const admin = adminStub();
    state.admin = admin.client;

    await setSitePhoto(SITE, newPath);

    expect(admin.log.removed).toHaveLength(0);
  });

  it("путь из чужой папки (другой объект) не принимается: ничего не пишется", async () => {
    const admin = adminStub();
    state.admin = admin.client;

    const result = await setSitePhoto(SITE, `${COMPANY}/${OTHER_SITE}/${FILE}.webp`);

    expect(result.error).toBe(t.objects.form.uploadPhotoError);
    expect(admin.log.updates).toHaveLength(0);
    expect(admin.log.signedUrls).toHaveLength(0);
  });

  it("путь с обходом папок или не того вида не принимается", async () => {
    const admin = adminStub();
    state.admin = admin.client;

    for (const bad of [`${COMPANY}/${SITE}/../x.webp`, `${COMPANY}/${SITE}/${FILE}.png`, "other/file.webp", ""]) {
      expect((await setSitePhoto(SITE, bad)).error).toBe(t.objects.form.uploadPhotoError);
    }
    expect(admin.log.updates).toHaveLength(0);
  });

  it("объект не виден человеку — фото не ставится", async () => {
    const admin = adminStub();
    state.admin = admin.client;
    state.site = null;

    const result = await setSitePhoto(SITE, newPath);

    expect(result.error).toBe(t.objects.form.uploadPhotoError);
    expect(admin.log.updates).toHaveLength(0);
  });

  it("файл не загрузился (оборвалась связь) — обложкой он не становится, прежнее фото цело", async () => {
    const admin = adminStub({ fileMissing: true });
    state.admin = admin.client;
    state.site = site({ photo_path: `${COMPANY}/${SITE}/old.webp` });

    const result = await setSitePhoto(SITE, newPath);

    expect(result.error).toBe(t.objects.form.uploadPhotoError);
    expect(admin.log.updates).toHaveLength(0);
    expect(admin.log.removed).toHaveLength(0);
  });

  it("не удалось записать путь — прежнее фото не удаляется", async () => {
    const admin = adminStub({ updateError: true });
    state.admin = admin.client;
    state.site = site({ photo_path: `${COMPANY}/${SITE}/old.webp` });

    const result = await setSitePhoto(SITE, newPath);

    expect(result.error).toBe(t.objects.form.uploadPhotoError);
    expect(admin.log.removed).toHaveLength(0);
  });

  it("то же самое фото повторно — ничего не удаляется", async () => {
    const admin = adminStub();
    state.admin = admin.client;
    state.site = site({ photo_path: newPath });

    await setSitePhoto(SITE, newPath);

    expect(admin.log.removed).toHaveLength(0);
  });
});
