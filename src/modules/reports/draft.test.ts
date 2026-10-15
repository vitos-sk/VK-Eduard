import { describe, expect, it } from "vitest";

import {
  DRAFT_MAX_AGE_MS,
  clearDraft,
  draftKey,
  hasDraftContent,
  parseDraft,
  readDraft,
  serializeDraft,
  writeDraft,
  type DraftStorage,
  type ReportDraftFields,
} from "./draft";

const base: ReportDraftFields = {
  siteId: "site-1",
  dateKey: "2026-10-15",
  categoryIds: ["cat-1", "cat-2"],
  otherText: "",
  description: "Поклали мембрану на північному схилі",
  problemNote: "",
  withTime: true,
  startAt: "07:00",
  endAt: "16:00",
  breakMin: 30,
  withTravel: false,
  travelStart: "06:30",
  travelEnd: "07:30",
  km: "",
};

const known = { siteIds: new Set(["site-1"]), categoryIds: new Set(["cat-1", "cat-2"]) };
const now = Date.parse("2026-10-15T12:00:00Z");

/** Хранилище в памяти; `broken` — всё падает с ошибкой, как в приватном режиме или при переполнении. */
function memoryStorage(broken = false): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const fail = () => {
    throw new Error("storage unavailable");
  };

  return {
    data,
    getItem: broken ? fail : (key) => data.get(key) ?? null,
    setItem: broken ? fail : (key, value) => void data.set(key, value),
    removeItem: broken ? fail : (key) => void data.delete(key),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe("hasDraftContent", () => {
  it("пустая форма не чернетка: объект и время по умолчанию не считаются", () => {
    expect(hasDraftContent({ ...base, description: "", categoryIds: [], withTime: false })).toBe(false);
  });

  it("любой введённый текст, выбранный вид работ, часы или дорога — чернетка", () => {
    const empty = { ...base, description: "", categoryIds: [], withTime: false };

    expect(hasDraftContent({ ...empty, description: "текст" })).toBe(true);
    expect(hasDraftContent({ ...empty, problemNote: "чекали матеріал" })).toBe(true);
    expect(hasDraftContent({ ...empty, otherText: "завозили" })).toBe(true);
    expect(hasDraftContent({ ...empty, categoryIds: ["cat-1"] })).toBe(true);
    expect(hasDraftContent({ ...empty, withTime: true })).toBe(true);
    expect(hasDraftContent({ ...empty, withTravel: true })).toBe(true);
    expect(hasDraftContent({ ...empty, km: "12" })).toBe(true);
  });

  it("одни пробелы — не чернетка", () => {
    expect(hasDraftContent({ ...base, description: "   ", categoryIds: [], withTime: false })).toBe(false);
  });
});

describe("parseDraft", () => {
  it("записанное читается обратно один в один", () => {
    expect(parseDraft(serializeDraft(base, now), now, known)).toEqual(base);
  });

  it("нет записи или мусор — «чернетки нет»", () => {
    expect(parseDraft(null, now, known)).toBeNull();
    expect(parseDraft("", now, known)).toBeNull();
    expect(parseDraft("{не json", now, known)).toBeNull();
    expect(parseDraft("42", now, known)).toBeNull();
    expect(parseDraft("[]", now, known)).toBeNull();
  });

  it("другая версия формата или испорченные поля — «чернетки нет»", () => {
    const stored = JSON.parse(serializeDraft(base, now));

    expect(parseDraft(JSON.stringify({ ...stored, version: 99 }), now, known)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...stored, fields: { ...base, description: 5 } }), now, known)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...stored, fields: { ...base, startAt: "7:00" } }), now, known)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...stored, fields: { ...base, dateKey: "вчера" } }), now, known)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...stored, fields: { ...base, breakMin: -5 } }), now, known)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...stored, fields: { ...base, categoryIds: "cat-1" } }), now, known)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...stored, fields: "x" }), now, known)).toBeNull();
  });

  it("старше месяца не возвращается", () => {
    expect(parseDraft(serializeDraft(base, now - DRAFT_MAX_AGE_MS - 1), now, known)).toBeNull();
    expect(parseDraft(serializeDraft(base, now - DRAFT_MAX_AGE_MS + 1000), now, known)).not.toBeNull();
  });

  it("записанная «из будущего» (сбитые часы) не возвращается", () => {
    expect(parseDraft(serializeDraft(base, now + 3_600_000), now, known)).toBeNull();
  });

  it("объект и виды работ, которых больше нет, отбрасываются, остальное сохраняется", () => {
    const draft = parseDraft(
      serializeDraft({ ...base, siteId: "archived-site", categoryIds: ["cat-1", "deleted-cat"] }, now),
      now,
      known,
    );

    expect(draft?.siteId).toBeNull();
    expect(draft?.categoryIds).toEqual(["cat-1"]);
    expect(draft?.description).toBe(base.description);
  });

  it("если после отбрасывания ничего содержательного не осталось — «чернетки нет»", () => {
    const onlyDeleted = { ...base, description: "", withTime: false, categoryIds: ["deleted-cat"] };

    expect(parseDraft(serializeDraft(onlyDeleted, now), now, known)).toBeNull();
  });
});

describe("хранилище", () => {
  it("пишет, читает и стирает чернетку человека", () => {
    const storage = memoryStorage();

    writeDraft(storage, "u1", base, now);
    expect(readDraft(storage, "u1", now, known)).toEqual(base);

    clearDraft(storage, "u1");
    expect(readDraft(storage, "u1", now, known)).toBeNull();
  });

  it("чернетка одного человека не видна другому на том же телефоне", () => {
    const storage = memoryStorage();

    writeDraft(storage, "u1", base, now);

    expect(readDraft(storage, "u2", now, known)).toBeNull();
    expect(draftKey("u1")).not.toBe(draftKey("u2"));
  });

  it("форму очистили — прежняя чернетка удаляется, а не остаётся устаревшей", () => {
    const storage = memoryStorage();
    writeDraft(storage, "u1", base, now);

    writeDraft(storage, "u1", { ...base, description: "", categoryIds: [], withTime: false }, now);

    expect(storage.data.size).toBe(0);
  });

  it("сломанное хранилище не ломает форму: чтение — «нет», запись и стирание молча пропускаются", () => {
    const storage = memoryStorage(true);

    expect(readDraft(storage, "u1", now, known)).toBeNull();
    expect(() => writeDraft(storage, "u1", base, now)).not.toThrow();
    expect(() => clearDraft(storage, "u1")).not.toThrow();
  });
});
