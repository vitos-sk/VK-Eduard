export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface AutosaveOptions<T> {
  /** Сохраняет снимок. `true` — сохранено; `false` — не вышло: снимок остаётся несохранённым, его подхватит повтор. */
  save: (value: T) => Promise<boolean>;
  /** Годится ли снимок для сохранения (например, есть название и пункт). Негодный не сохраняется, но и не теряется. */
  isReady: (value: T) => boolean;
  onStatus: (status: AutosaveStatus) => void;
  /** Пауза после последней правки: пока человек печатает, не сохраняем. */
  delayMs: number;
}

/**
 * Автосохранение формы: правки копятся и уходят одним запросом после паузы; запросы идут строго по одному
 * (второй не стартует, пока не вернулся первый), поэтому «создать» не выполнится дважды, а новая правка не
 * затрёт более свежую. Ошибка не теряет правки: они остаются несохранёнными и уйдут при `flush()` (повтор, выход).
 * Не знает ни про React, ни про сервер — вся логика проверяется обычными тестами.
 */
export class Autosaver<T> {
  private latest: T | null = null;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private failed = false;

  constructor(private readonly options: AutosaveOptions<T>) {}

  /** Есть правки, которые ещё не сохранены (ждут паузы, идут на сервер или не удалось сохранить). */
  get hasUnsaved(): boolean {
    return this.dirty;
  }

  /** Новое состояние формы: запоминаем и сохраним после паузы. */
  update(value: T): void {
    this.latest = value;
    this.dirty = true;
    this.clearTimer();

    if (!this.options.isReady(value)) {
      this.options.onStatus("idle");
      return;
    }

    this.options.onStatus("pending");
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, this.options.delayMs);
  }

  /** Сохранить сейчас, не дожидаясь паузы (выход с экрана, «повторить»). `false` — часть правок сохранить не удалось. */
  async flush(): Promise<boolean> {
    this.clearTimer();
    await this.run();
    // Правка могла прийти в самый конец уже идущего сохранения: даём ей второй проход.
    if (this.canSave()) await this.run();

    return !this.canSave();
  }

  private canSave(): boolean {
    return this.dirty && this.latest !== null && this.options.isReady(this.latest);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private run(): Promise<void> {
    if (this.running) return this.running;

    this.running = this.loop().finally(() => {
      this.running = null;
    });

    return this.running;
  }

  private async loop(): Promise<void> {
    this.failed = false;

    while (this.canSave()) {
      const snapshot = this.latest as T;
      this.dirty = false;
      this.options.onStatus("saving");

      let ok = false;
      try {
        ok = await this.options.save(snapshot);
      } catch {
        ok = false;
      }

      if (!ok) {
        this.dirty = true;
        this.failed = true;
        break;
      }
    }

    if (this.failed) this.options.onStatus("error");
    else this.options.onStatus(this.dirty ? "idle" : "saved");
  }
}
