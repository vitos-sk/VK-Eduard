import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Autosaver, type AutosaveStatus } from "./autosave";

/** Сохранение, которое завершается, когда тест это разрешит: так видно, что происходит «во время» запроса. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function setup(options: { ready?: (value: string) => boolean; save?: (value: string) => Promise<boolean> } = {}) {
  const saved: string[] = [];
  const statuses: AutosaveStatus[] = [];
  const save = options.save ?? (async (value: string) => (saved.push(value), true));
  const saver = new Autosaver<string>({
    save,
    isReady: options.ready ?? ((value) => value !== ""),
    onStatus: (status) => statuses.push(status),
    delayMs: 700,
  });

  return { saver, saved, statuses };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Autosaver: пауза", () => {
  it("пока человек печатает, не сохраняет; после паузы сохраняет последнее состояние один раз", async () => {
    const { saver, saved } = setup();

    saver.update("Б");
    await vi.advanceTimersByTimeAsync(300);
    saver.update("Бу");
    await vi.advanceTimersByTimeAsync(300);
    saver.update("Бус");
    expect(saved).toEqual([]);

    await vi.advanceTimersByTimeAsync(700);
    expect(saved).toEqual(["Бус"]);
  });

  it("после сохранения статус «saved»", async () => {
    const { saver, statuses } = setup();

    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(800);

    expect(statuses).toEqual(["pending", "saving", "saved"]);
  });

  it("негодное состояние не сохраняется и не считается ошибкой", async () => {
    const { saver, saved, statuses } = setup();

    saver.update("");
    await vi.advanceTimersByTimeAsync(2000);

    expect(saved).toEqual([]);
    expect(statuses).toEqual(["idle"]);
  });

  it("негодное состояние после годного отменяет ожидающее сохранение", async () => {
    const { saver, saved } = setup();

    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(300);
    saver.update("");
    await vi.advanceTimersByTimeAsync(2000);

    expect(saved).toEqual([]);
  });
});

describe("Autosaver: запросы идут по одному", () => {
  it("правка во время сохранения не запускает второй запрос сразу, а уходит следом", async () => {
    const first = deferred<boolean>();
    const calls: string[] = [];
    const { saver } = setup({
      save: (value) => {
        calls.push(value);
        return calls.length === 1 ? first.promise : Promise.resolve(true);
      },
    });

    saver.update("один");
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual(["один"]);

    saver.update("два");
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toEqual(["один"]);

    first.resolve(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(["один", "два"]);
  });
});

describe("Autosaver: hasUnsaved", () => {
  it("true, пока правка не сохранена, и false после сохранения", async () => {
    const { saver } = setup();

    expect(saver.hasUnsaved).toBe(false);
    saver.update("Бус");
    expect(saver.hasUnsaved).toBe(true);

    await saver.flush();
    expect(saver.hasUnsaved).toBe(false);
  });
});

describe("Autosaver: flush", () => {
  it("сохраняет сразу, не ожидая паузы", async () => {
    const { saver, saved } = setup();

    saver.update("Бус");
    const ok = await saver.flush();

    expect(ok).toBe(true);
    expect(saved).toEqual(["Бус"]);
  });

  it("ждёт уже идущее сохранение и потом досохраняет свежую правку", async () => {
    const first = deferred<boolean>();
    const calls: string[] = [];
    const { saver } = setup({
      save: (value) => {
        calls.push(value);
        return calls.length === 1 ? first.promise : Promise.resolve(true);
      },
    });

    saver.update("один");
    await vi.advanceTimersByTimeAsync(800);
    saver.update("два");

    const flushing = saver.flush();
    first.resolve(true);

    expect(await flushing).toBe(true);
    expect(calls).toEqual(["один", "два"]);
  });

  it("без правок ничего не отправляет", async () => {
    const { saver, saved } = setup();

    expect(await saver.flush()).toBe(true);
    expect(saved).toEqual([]);
  });

  it("негодное состояние — сохранять нечего, выход не блокируется", async () => {
    const { saver } = setup();

    saver.update("");

    expect(await saver.flush()).toBe(true);
  });
});

describe("Autosaver: ошибка", () => {
  it("правки не теряются: статус «error», повтор через flush их отправляет", async () => {
    let attempt = 0;
    const calls: string[] = [];
    const { saver, statuses } = setup({
      save: async (value) => {
        calls.push(value);
        attempt += 1;
        return attempt > 1;
      },
    });

    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(800);
    expect(statuses.at(-1)).toBe("error");

    expect(await saver.flush()).toBe(true);
    expect(calls).toEqual(["Бус", "Бус"]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("исключение при сохранении считается ошибкой, а не роняет форму", async () => {
    const { saver, statuses } = setup({
      save: async () => {
        throw new Error("нет сети");
      },
    });

    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(800);

    expect(statuses.at(-1)).toBe("error");
    expect(await saver.flush()).toBe(false);
  });
});

describe("Autosaver: отмена (discard)", () => {
  it("несохранённое после паузы не уходит на сервер, а новые правки игнорируются", async () => {
    const { saver, saved } = setup();

    saver.update("Бус");
    await saver.discard();
    saver.update("Бус 2");
    await vi.advanceTimersByTimeAsync(2000);

    expect(saved).toEqual([]);
    expect(saver.hasUnsaved).toBe(false);
    expect(await saver.flush()).toBe(true);
    expect(saved).toEqual([]);
  });

  it("сохранение уже идёт — ждёт его конца, а следующий снимок не отправляется", async () => {
    const first = deferred<boolean>();
    const saved: string[] = [];
    const { saver } = setup({
      save: (value) => {
        saved.push(value);
        return saved.length === 1 ? first.promise : Promise.resolve(true);
      },
    });

    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(700);
    saver.update("Бус 2");

    let finished = false;
    const discarding = saver.discard().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);

    first.resolve(true);
    await discarding;

    expect(saved).toEqual(["Бус"]);
  });

  it("resume возвращает автосохранение: следующая правка сохраняется", async () => {
    const { saver, saved } = setup();

    await saver.discard();
    saver.resume();
    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(700);

    expect(saved).toEqual(["Бус"]);
  });

  it("после отмены статус не меняется на «ошибка», даже если шедшее сохранение не удалось", async () => {
    const failing = deferred<boolean>();
    const { saver, statuses } = setup({ save: () => failing.promise });

    saver.update("Бус");
    await vi.advanceTimersByTimeAsync(700);
    const discarding = saver.discard();
    failing.resolve(false);
    await discarding;

    expect(statuses).not.toContain("error");
  });
});
