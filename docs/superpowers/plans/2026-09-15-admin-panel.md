# Адмінка (/more/admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новий екран `/more/admin` (тільки `boss`): фільтр по місяцю і робітниках (усі або чекбоксами конкретні), ранжований список-«графік» годин з прогрес-барами, експорт CSV/Excel/PDF і відправка файлу через WhatsApp; плюс перемикач «що відкривати після входу» (звичайний застосунок чи адмінка).

**Architecture:** Роль «admin» — це наявна роль `boss`, нової ролі не заводимо. Нова сторінка переюзає наявні паттерни (`PeriodNavigator`, `StatTile`, `EmptyState`, `SegmentedTabs`, `getCompanyEntriesInRange`/`getCompanyWorkers`, `/api/export`). «Графік» реалізовано як інтерактивний ранжований список з прогрес-барами (та сама візуалізація, що вже є в `TopList` на `/dashboard`) — окремий `recharts`-бар-чарт поруч не додаємо: він показував би той самий єдиний показник (години на робітника) вдруге, це дублювання, а не нова інформація. `/api/export` вчиться приймати список `workerIds` на додачу до наявного одиночного `workerId`. WhatsApp-шеринг — Web Share API з файлом (мобільні браузери), на десктопі — скачування файлу + `wa.me` з підказкою прикріпити вручну. Дефолтний екран після входу — нова колонка `profiles.default_view`, застосовується в `signIn` (не на кожному заході на `/`).

**Tech Stack:** Next.js (App Router, server actions), Supabase (Postgres + RLS), TypeScript, Tailwind, vitest, `recharts` (не зачіпаємо — новий чарт не додаємо), `sonner` (toast).

**Spec:** `docs/superpowers/specs/2026-09-15-admin-panel-design.md`

## Global Constraints

- «Admin» = роль `boss`. Нової ролі в `user_role` не додаємо.
- Нова сторінка — окремий роут `/more/admin`, вкладку «Команда» в «Звітах» не чіпаємо і не об'єднуємо з нею.
- Вибір робітників для експорту — «Усі» (нічого не позначено) або конкретні чекбоксами; мультивибір, не одиночний.
- WhatsApp: Web Share API з файлом (`navigator.canShare`/`navigator.share`) + фолбек «скачати файл + відкрити wa.me з текстом-підказкою» там, де файловий Web Share недоступний.
- Перемикач дефолтного екрана — на самій сторінці `/more/admin`, тільки для `boss`; застосовується в `signIn` одразу після входу, а не при кожному заході на `/`.
- i18n — тільки через `t.*` (`src/lib/i18n/uk.ts`), нових рядків у JSX не пишемо.
- Server actions — `"use server"`, `getProfile()`/`requireProfile()`, за зразком `src/modules/auth/actions.ts` і `src/modules/team/actions.ts`.
- Типи Supabase генеруються командою `npx supabase gen types typescript --project-id pqehyhdfcxgfnustdstm > src/lib/supabase/types.gen.ts` (шапка `src/lib/supabase/types.gen.ts`) — руками не редагувати.
- Тести — vitest, `*.test.ts` поруч з модулем, тільки для чистих функцій (`src/modules/**`) — у проєкті немає бібліотеки для тестів React-компонентів, тому UI-компоненти перевіряються вручну в браузері (`npm run dev`), як і решта клієнтських екранів проєкту.
- Перевірочні команди: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

---

## Task 1: Міграція `profiles.default_view` + типи

**Files:**
- Create: `supabase/migrations/0011_profile_default_view.sql`
- Modify: `src/lib/supabase/types.gen.ts` (регенерація командою, не руками)

**Interfaces:**
- Produces: колонка `profiles.default_view: 'app' | 'admin'` (default `'app'`), доступна в типі `Tables<"profiles">` як `Profile["default_view"]`.

- [ ] **Step 1: Написати міграцію**

```sql
-- supabase/migrations/0011_profile_default_view.sql
-- Дефолтний екран після входу для boss: звичайний застосунок чи адмінка
-- (`/more/admin`). Колонка спільна для всіх ролей — окрему таблицю під
-- одне boolean-подібне поле заводити не потрібно; для worker воно просто
-- не читається (перевірка ролі — у `signIn`/`updateDefaultView`).

alter table profiles
  add column default_view text not null default 'app'
    check (default_view in ('app', 'admin'));
```

- [ ] **Step 2: Застосувати міграцію до проєкту**

Run: `npx supabase db push`
Expected: міграція `0011_profile_default_view.sql` застосована без помилок (той самий воркфлоу, яким застосовували 0001–0010 у цьому проєкті).

- [ ] **Step 3: Перегенерувати типи**

Run: `npx supabase gen types typescript --project-id pqehyhdfcxgfnustdstm > src/lib/supabase/types.gen.ts`

- [ ] **Step 4: Перевірити, що колонка потрапила в типи**

Run: `grep -n "default_view" src/lib/supabase/types.gen.ts`
Expected: рядки `default_view: string` (або `default_view?: string`) у `Row`/`Insert`/`Update` типу `profiles`.

- [ ] **Step 5: Прогнати типчек**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0011_profile_default_view.sql src/lib/supabase/types.gen.ts
git commit -m "feat(db): додати profiles.default_view для перемикача Застосунок/Адмінка"
```

---

## Task 2: Спільний хелпер `buildExportUrl` + список форматів

**Files:**
- Create: `src/modules/export/formats.ts`
- Test: `src/modules/export/formats.test.ts`

**Interfaces:**
- Produces:
  - `export type ExportFormat = "csv" | "xlsx" | "pdf"`
  - `export type ExportKind = "hours" | "reports"`
  - `export const HOURS_FORMATS: { format: ExportFormat; label: string; icon: LucideIcon }[]`
  - `export const REPORTS_FORMATS: { format: ExportFormat; label: string; icon: LucideIcon }[]`
  - `export function buildExportUrl(params: { from: string; to: string; format: ExportFormat; kind?: ExportKind; workerId?: string; workerIds?: readonly string[] }): string`
- Consumes: нічого (чиста функція + константи).

- [ ] **Step 1: Написати падаючий тест**

```typescript
// src/modules/export/formats.test.ts
import { describe, expect, it } from "vitest";

import { buildExportUrl } from "./formats";

describe("buildExportUrl", () => {
  it("будує URL без фільтра по робітниках за замовчуванням", () => {
    const url = buildExportUrl({ from: "2026-09-01", to: "2026-09-30", format: "csv" });
    expect(url).toBe("/api/export?from=2026-09-01&to=2026-09-30&format=csv&kind=hours");
  });

  it("додає workerIds через кому, якщо переданий список", () => {
    const url = buildExportUrl({
      from: "2026-09-01",
      to: "2026-09-30",
      format: "xlsx",
      workerIds: ["a", "b"],
    });
    expect(url).toContain("workerIds=a%2Cb");
  });

  it("workerIds має пріоритет над одиночним workerId", () => {
    const url = buildExportUrl({
      from: "2026-09-01",
      to: "2026-09-30",
      format: "pdf",
      workerId: "solo",
      workerIds: ["a", "b"],
    });
    expect(url).toContain("workerIds=a%2Cb");
    expect(url).not.toContain("workerId=solo");
  });

  it("використовує одиночний workerId, якщо workerIds не переданий", () => {
    const url = buildExportUrl({ from: "2026-09-01", to: "2026-09-30", format: "csv", workerId: "solo" });
    expect(url).toContain("workerId=solo");
  });

  it("ігнорує порожній список workerIds — трактує як «усі»", () => {
    const url = buildExportUrl({ from: "2026-09-01", to: "2026-09-30", format: "csv", workerIds: [] });
    expect(url).not.toContain("workerIds");
    expect(url).not.toContain("workerId=");
  });
});
```

- [ ] **Step 2: Перевірити, що тест падає**

Run: `npx vitest run src/modules/export/formats.test.ts`
Expected: FAIL — `Cannot find module './formats'`.

- [ ] **Step 3: Написати реалізацію**

```typescript
// src/modules/export/formats.ts
import { Download, FileSpreadsheet, FileText, type LucideIcon } from "lucide-react";

import { t } from "@/lib/i18n";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportKind = "hours" | "reports";

interface ExportFormatOption {
  format: ExportFormat;
  label: string;
  icon: LucideIcon;
}

/** Список форматів для «Годин» — спільний для `ExportMenu` і `ShareWhatsAppButton`. */
export const HOURS_FORMATS: readonly ExportFormatOption[] = [
  { format: "csv", label: t.admin.export.csv, icon: Download },
  { format: "xlsx", label: t.admin.export.xlsx, icon: FileSpreadsheet },
  { format: "pdf", label: t.admin.export.pdf, icon: FileText },
];

/** Звіти поки експортуються тільки в CSV — xlsx/pdf під звіти не робили. */
export const REPORTS_FORMATS: readonly ExportFormatOption[] = [
  { format: "csv", label: t.admin.export.csv, icon: Download },
];

interface BuildExportUrlParams {
  from: string;
  to: string;
  format: ExportFormat;
  kind?: ExportKind;
  /** Одиночний робітник (картка робітника в «Команді»). */
  workerId?: string;
  /** Мультивибір з чекбоксів в адмінці — має пріоритет над `workerId`. */
  workerIds?: readonly string[];
}

/**
 * Єдина точка збірки URL `/api/export` — щоб `ExportMenu` і
 * `ShareWhatsAppButton` не розходились у форматі параметрів.
 */
export function buildExportUrl({
  from,
  to,
  format,
  kind = "hours",
  workerId,
  workerIds,
}: BuildExportUrlParams): string {
  const params = new URLSearchParams({ from, to, format, kind });

  if (workerIds && workerIds.length > 0) {
    params.set("workerIds", workerIds.join(","));
  } else if (workerId) {
    params.set("workerId", workerId);
  }

  return `/api/export?${params.toString()}`;
}
```

- [ ] **Step 4: Перевірити, що тест проходить**

Run: `npx vitest run src/modules/export/formats.test.ts`
Expected: PASS (5 тестів).

- [ ] **Step 5: Commit**

```bash
git add src/modules/export/formats.ts src/modules/export/formats.test.ts
git commit -m "feat(export): спільний хелпер buildExportUrl для ExportMenu і WhatsApp-шерингу"
```

---

## Task 3: `/api/export` — підтримка `workerIds`

**Files:**
- Modify: `src/app/api/export/route.ts`

**Interfaces:**
- Consumes: нічого нового.
- Produces: query-параметр `workerIds=id1,id2,...` (через кому) — фільтрує вибірку по членству, на додачу до наявного одиночного `workerId`.

- [ ] **Step 1: Додати збірку набору id і замінити обидва фільтри**

Знайти в `src/app/api/export/route.ts`:

```typescript
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const workerId = searchParams.get("workerId");
  const formatParam = searchParams.get("format") ?? "csv";
```

Замінити на:

```typescript
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const workerId = searchParams.get("workerId");
  const workerIdsParam = searchParams.get("workerIds");
  const workerIdSet = workerIdsParam
    ? new Set(workerIdsParam.split(",").filter(Boolean))
    : workerId
      ? new Set([workerId])
      : null;
  const formatParam = searchParams.get("format") ?? "csv";
```

Знайти:

```typescript
      .filter((report) => !workerId || report.author_id === workerId)
```

Замінити на:

```typescript
      .filter((report) => !workerIdSet || workerIdSet.has(report.author_id))
```

Знайти:

```typescript
    .filter((row) => !workerId || row.author_id === workerId)
```

Замінити на:

```typescript
    .filter((row) => !workerIdSet || workerIdSet.has(row.author_id))
```

Оновити JSDoc над `GET` — рядок:

```typescript
 * `?workerId=` звужує вибірку до одного робітника (експорт з картки
 * робітника в адмінці) — фільтр застосовується вже після RLS-вибірки.
```

замінити на:

```typescript
 * `?workerId=` звужує вибірку до одного робітника (експорт з картки
 * робітника в «Команді»); `?workerIds=id1,id2` — до списку (мультивибір
 * чекбоксами в адмінці, `/more/admin`) — обидва фільтри застосовуються
 * вже після RLS-вибірки, `workerIds` має пріоритет, якщо задані обидва.
```

- [ ] **Step 2: Типчек і лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/export/route.ts
git commit -m "feat(export): підтримати мультивибір робітників через ?workerIds="
```

---

## Task 4: `ExportMenu` — проп `workerIds`, переїзд на спільний `formats.ts`

**Files:**
- Modify: `src/components/reports/ExportMenu.tsx`

**Interfaces:**
- Consumes: `buildExportUrl`, `HOURS_FORMATS`, `REPORTS_FORMATS` з `@/modules/export/formats` (Task 2).
- Produces: `ExportMenu` тепер приймає опціональний `workerIds?: readonly string[]` на додачу до наявного `workerId`.

- [ ] **Step 1: Переписати файл**

Замінити весь вміст `src/components/reports/ExportMenu.tsx` на:

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buildExportUrl, HOURS_FORMATS, REPORTS_FORMATS, type ExportKind } from "@/modules/export/formats";

interface ExportMenuProps {
  /** `YYYY-MM-DD` — диапазон уже посчитан вызывающим экраном (месяц/период). */
  from: string;
  to: string;
  /** «Години» (за замовчуванням) чи «Звіти» — інший набір колонок і форматів. */
  kind?: ExportKind;
  /** Экспорт по одному робітнику — для детальної сторінки в «Команді». */
  workerId?: string;
  /** Мультивибір з чекбоксів в адмінці (`/more/admin`) — пріоритетний над `workerId`. */
  workerIds?: readonly string[];
  className?: string;
}

/**
 * Кнопка «Експорт» з випадаючим списком форматів. `kind="hours"` (за замовч.) —
 * той самий CSV/Excel/PDF-табель, що й раніше; `kind="reports"` — новий CSV
 * звітів (дата/робітник/об'єкт/категорії/опис/фото, без часу).
 */
export function ExportMenu({ from, to, kind = "hours", workerId, workerIds, className }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const formats = kind === "reports" ? REPORTS_FORMATS : HOURS_FORMATS;
  const label = kind === "reports" ? t.admin.export.labelReports : t.admin.export.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-2 rounded-[12px] border border-border px-4",
            "text-[14px] font-bold text-text",
            "transition-transform duration-150 active:scale-[0.98]",
            className,
          )}
        >
          <Download className="size-[16px]" strokeWidth={2} aria-hidden />
          {label}
          <ChevronDown className="size-[14px]" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 !bg-surface !text-text !ring-border">
        {formats.map(({ format, label: formatLabel, icon: Icon }) => (
          <a
            key={format}
            href={buildExportUrl({ from, to, format, kind, workerId, workerIds })}
            onClick={() => setOpen(false)}
            className="flex h-10 items-center gap-2 rounded-[8px] px-2 text-[14px] font-semibold hover:bg-surface-2"
          >
            <Icon className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {formatLabel}
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Типчек і лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок (усі наявні виклики `ExportMenu` без `workerIds` лишаються валідними — проп опціональний).

- [ ] **Step 3: Ручна перевірка**

Run: `npm run dev`, відкрити `/more/data` і вкладку «Команда» на `/reports` — кнопка «Експорт» відкриває той самий список форматів і качає файл, як і раніше.

- [ ] **Step 4: Commit**

```bash
git add src/components/reports/ExportMenu.tsx
git commit -m "refactor(export): ExportMenu переїжджає на спільний formats.ts, додає workerIds"
```

---

## Task 5: `buildWorkerHoursList` — злиття робітників компанії з годинами

**Files:**
- Create: `src/modules/team/hours.ts`
- Test: `src/modules/team/hours.test.ts`

**Interfaces:**
- Consumes: `Worker` з `@/modules/team/queries` (Pick "id" | "full_name"), `WorkEntryWithNames` з `@/modules/entries/types` (Pick "author_id" | "total_minutes").
- Produces:
  - `export interface WorkerHours { id: string; name: string; minutes: number }`
  - `export function buildWorkerHoursList(workers, entries): WorkerHours[]` — усі робітники компанії (включно з тими, у кого 0 годин за місяць), відсортовані за спаданням годин.

- [ ] **Step 1: Написати падаючий тест**

```typescript
// src/modules/team/hours.test.ts
import { describe, expect, it } from "vitest";

import { buildWorkerHoursList } from "./hours";

describe("buildWorkerHoursList", () => {
  it("сортує робітників компанії за спаданням годин", () => {
    const workers = [
      { id: "w1", full_name: "Іван" },
      { id: "w2", full_name: "Петро" },
    ];
    const entries = [
      { author_id: "w1", total_minutes: 120 },
      { author_id: "w2", total_minutes: 480 },
      { author_id: "w2", total_minutes: 60 },
    ];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w2", name: "Петро", minutes: 540 },
      { id: "w1", name: "Іван", minutes: 120 },
    ]);
  });

  it("включає робітників без жодного запису за період — з 0 хвилин", () => {
    const workers = [
      { id: "w1", full_name: "Іван" },
      { id: "w2", full_name: "Петро" },
    ];
    const entries = [{ author_id: "w1", total_minutes: 100 }];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w1", name: "Іван", minutes: 100 },
      { id: "w2", name: "Петро", minutes: 0 },
    ]);
  });

  it("ігнорує записи авторів поза списком робітників (звільнені)", () => {
    const workers = [{ id: "w1", full_name: "Іван" }];
    const entries = [
      { author_id: "w1", total_minutes: 100 },
      { author_id: "ghost", total_minutes: 999 },
    ];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w1", name: "Іван", minutes: 100 },
    ]);
  });

  it("трактує total_minutes: null як 0", () => {
    const workers = [{ id: "w1", full_name: "Іван" }];
    const entries = [{ author_id: "w1", total_minutes: null }];

    expect(buildWorkerHoursList(workers, entries)).toEqual([
      { id: "w1", name: "Іван", minutes: 0 },
    ]);
  });
});
```

- [ ] **Step 2: Перевірити, що тест падає**

Run: `npx vitest run src/modules/team/hours.test.ts`
Expected: FAIL — `Cannot find module './hours'`.

- [ ] **Step 3: Написати реалізацію**

```typescript
// src/modules/team/hours.ts
import type { WorkEntryWithNames } from "@/modules/entries/types";
import type { Worker } from "@/modules/team/queries";

export interface WorkerHours {
  id: string;
  name: string;
  minutes: number;
}

/**
 * Злиття всіх робітників компанії з їхніми годинами за період — на відміну
 * від рейтингу на `/dashboard` (`buildTopWorkers`, рахує тільки тих, у кого
 * є записи), тут потрібен повний список: чекбокси в адмінці мають включати
 * і тих, хто цього місяця ще нічого не відмітив (0 год).
 */
export function buildWorkerHoursList(
  workers: readonly Pick<Worker, "id" | "full_name">[],
  entries: readonly Pick<WorkEntryWithNames, "author_id" | "total_minutes">[],
): WorkerHours[] {
  const minutesByAuthor = new Map<string, number>();

  for (const entry of entries) {
    minutesByAuthor.set(
      entry.author_id,
      (minutesByAuthor.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0),
    );
  }

  return workers
    .map((worker) => ({
      id: worker.id,
      name: worker.full_name,
      minutes: minutesByAuthor.get(worker.id) ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}
```

- [ ] **Step 4: Перевірити, що тест проходить**

Run: `npx vitest run src/modules/team/hours.test.ts`
Expected: PASS (4 тести).

- [ ] **Step 5: Commit**

```bash
git add src/modules/team/hours.ts src/modules/team/hours.test.ts
git commit -m "feat(team): buildWorkerHoursList — повний список робітників з годинами для адмінки"
```

---

## Task 6: `updateDefaultView` + редирект у `signIn`

**Files:**
- Modify: `src/modules/auth/actions.ts`

**Interfaces:**
- Consumes: `getProfile()` з `@/modules/auth/session`, `profiles.default_view` (Task 1).
- Produces: `export type UpdateDefaultViewState = { error: string | null }`, `export async function updateDefaultView(view: "app" | "admin"): Promise<UpdateDefaultViewState>`.

- [ ] **Step 1: Додати редирект у `signIn`**

Знайти в `src/modules/auth/actions.ts`:

```typescript
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t.auth.failed };
  }

  // redirect бросает исключение — он должен быть вне try/catch.
  redirect("/");
}
```

Замінити на:

```typescript
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: t.auth.failed };
  }

  const profile = await getProfile();

  // redirect бросает исключение — он должен быть вне try/catch. Редирект
  // на адмінку — тільки одразу після входу; подальші заходи на "/" шефа
  // туди більше не відкидають, він може вільно ходити застосунком.
  if (profile?.role === "boss" && profile.default_view === "admin") {
    redirect("/more/admin");
  }

  redirect("/");
}
```

- [ ] **Step 2: Додати `updateDefaultView` в кінець файлу**

Додати в `src/modules/auth/actions.ts` після `updateFullName`:

```typescript
export type UpdateDefaultViewState = { error: string | null };

type DefaultView = "app" | "admin";

/**
 * Перемикає, що відкривати одразу після входу — тільки для `boss`
 * (сегмент-контрол на `/more/admin`). Для `worker` поле існує в базі, але
 * ніде не читається — `signIn` перевіряє його тільки для `role === "boss"`.
 */
export async function updateDefaultView(view: DefaultView): Promise<UpdateDefaultViewState> {
  const profile = await getProfile();

  if (!profile || profile.role !== "boss") {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ default_view: view })
    .eq("id", profile.id);

  if (error) {
    return { error: t.profile.saveError };
  }

  revalidatePath("/more/admin");

  return { error: null };
}
```

- [ ] **Step 3: Типчек**

Run: `npx tsc --noEmit`
Expected: без помилок (потребує Task 1 — `default_view` у типах).

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/actions.ts
git commit -m "feat(auth): updateDefaultView і редирект на /more/admin одразу після входу"
```

---

## Task 7: `AdminWorkerList` — ранжований список з чекбоксами

**Files:**
- Create: `src/components/more/AdminWorkerList.tsx`

**Interfaces:**
- Consumes: `WorkerHours` з `@/modules/team/hours` (Task 5).
- Produces: `export function AdminWorkerList(props: { items: readonly WorkerHours[]; selectedIds: ReadonlySet<string>; onToggle: (id: string) => void }): JSX.Element`.

- [ ] **Step 1: Створити компонент**

```typescript
// src/components/more/AdminWorkerList.tsx
"use client";

import { formatHoursShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkerHours } from "@/modules/team/hours";

interface AdminWorkerListProps {
  items: readonly WorkerHours[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/**
 * Ранжований список робітників з чекбоксами і прогрес-баром відносно
 * лідера — та сама візуалізація, що й `TopList` на `/dashboard`
 * (`src/components/dashboard/TopList.tsx`), тільки інтерактивна: весь
 * рядок — це чекбокс. Окремий bar-chart поруч не додаємо: він показував
 * би той самий єдиний показник (години на робітника) вдруге.
 */
export function AdminWorkerList({ items, selectedIds, onToggle }: AdminWorkerListProps) {
  const maxMinutes = items[0]?.minutes ?? 0;

  return (
    <ul className="mt-1 flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
      {items.map((item) => {
        const isChecked = selectedIds.has(item.id);

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={isChecked}
              className={cn(
                "flex w-full items-center gap-3 rounded-[14px] border p-3 text-left",
                "transition-colors duration-150",
                isChecked ? "border-brand bg-brand/10" : "border-border bg-surface-2",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                  isChecked ? "border-brand bg-brand" : "border-text-dim",
                )}
              >
                {isChecked && (
                  <svg viewBox="0 0 16 16" className="size-3 text-brand-ink" fill="none">
                    <path
                      d="M3 8.5 6.5 12 13 4.5"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{item.name}</p>

              <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface lg:w-32">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${maxMinutes === 0 ? 0 : (item.minutes / maxMinutes) * 100}%` }}
                />
              </div>

              <p className="tabular w-14 shrink-0 text-right text-[13px] font-bold">
                {formatHoursShort(item.minutes)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Типчек і лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок.

- [ ] **Step 3: Commit**

```bash
git add src/components/more/AdminWorkerList.tsx
git commit -m "feat(admin): AdminWorkerList — інтерактивний ранжований список з чекбоксами"
```

---

## Task 8: `ShareWhatsAppButton`

**Files:**
- Create: `src/components/more/ShareWhatsAppButton.tsx`
- Modify: `src/lib/i18n/uk.ts` (додати ключі під `admin.panel`)

**Interfaces:**
- Consumes: `buildExportUrl`, `HOURS_FORMATS`, `REPORTS_FORMATS`, `ExportFormat`, `ExportKind` з `@/modules/export/formats` (Task 2).
- Produces: `export function ShareWhatsAppButton(props: { from: string; to: string; kind?: ExportKind; workerId?: string; workerIds?: readonly string[]; className?: string }): JSX.Element`.

- [ ] **Step 1: Додати ключі в `src/lib/i18n/uk.ts`**

Знайти блок (описаний у `src/lib/i18n/uk.ts`):

```typescript
  admin: {
    dashboard: {
      monthHours: "Годин за місяць",
    },
    export: {
      label: "Експорт",
      labelReports: "Експорт звітів",
      csv: "CSV",
      xlsx: "Excel (.xlsx)",
      pdf: "PDF-табель",
      /** Назва аркуша Excel-файлу (`modules/export/xlsx.ts`). */
      sheetTitle: "Звіти",
    },
  },
```

Замінити на:

```typescript
  admin: {
    dashboard: {
      monthHours: "Годин за місяць",
    },
    export: {
      label: "Експорт",
      labelReports: "Експорт звітів",
      csv: "CSV",
      xlsx: "Excel (.xlsx)",
      pdf: "PDF-табель",
      /** Назва аркуша Excel-файлу (`modules/export/xlsx.ts`). */
      sheetTitle: "Звіти",
    },
    /** Сторінка `/more/admin` (`AdminScreen`, `AdminWorkerList`, `ShareWhatsAppButton`). */
    panel: {
      title: "Адмінка",
      searchPlaceholder: "Пошук співробітника",
      selectAll: "Усі",
      deselectAll: "Зняти всі",
      kpiHours: "Годин за місяць",
      kpiActive: "Активних співробітників",
      kpiAvg: "Ø на співробітника",
      empty: "У компанії ще немає активних працівників",
      selected: "Обрано: {n}",
      selectedAll: "Обрано: усі",
      whatsapp: "WhatsApp",
      whatsappFallbackText: "Файл завантажено — прикріпіть його вручну в чаті",
      whatsappError: "Не вдалося підготувати файл",
      defaultViewLabel: "Відкривати після входу",
      defaultViewApp: "Застосунок",
      defaultViewAdmin: "Адмінка",
    },
  },
```

- [ ] **Step 2: Створити компонент**

```typescript
// src/components/more/ShareWhatsAppButton.tsx
"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  buildExportUrl,
  HOURS_FORMATS,
  REPORTS_FORMATS,
  type ExportFormat,
  type ExportKind,
} from "@/modules/export/formats";

interface ShareWhatsAppButtonProps {
  from: string;
  to: string;
  kind?: ExportKind;
  workerId?: string;
  workerIds?: readonly string[];
  className?: string;
}

function extractFileName(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="([^"]+)"/.exec(disposition);
  return match?.[1] ?? fallback;
}

/**
 * Кнопка «Поділитися в WhatsApp» — качає той самий файл, що й «Експорт»,
 * і намагається віддати системне меню «Поділитися» (Web Share API рівня 2,
 * з файлами — Android Chrome, iOS Safari 15+). Десктоп і браузери без
 * підтримки файлового Web Share якщо просто скачують файл, а `wa.me`
 * відкривають з підказкою прикріпити його вручну: Web-версія WhatsApp не
 * приймає файли через посилання.
 */
export function ShareWhatsAppButton({
  from,
  to,
  kind = "hours",
  workerId,
  workerIds,
  className,
}: ShareWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const formats = kind === "reports" ? REPORTS_FORMATS : HOURS_FORMATS;

  const share = async (format: ExportFormat) => {
    setOpen(false);
    setIsSharing(true);

    try {
      const url = buildExportUrl({ from, to, format, kind, workerId, workerIds });
      const response = await fetch(url);

      if (!response.ok) throw new Error("export failed");

      const blob = await response.blob();
      const fileName = extractFileName(response.headers.get("Content-Disposition"), `export.${format}`);
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);

      window.open(`https://wa.me/?text=${encodeURIComponent(t.admin.panel.whatsappFallbackText)}`, "_blank");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast(t.admin.panel.whatsappError);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isSharing}
          className={cn(
            "flex h-10 items-center gap-2 rounded-[12px] bg-brand px-4",
            "text-[14px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98] disabled:opacity-60",
            className,
          )}
        >
          <MessageCircle className="size-[16px]" strokeWidth={2} aria-hidden />
          {t.admin.panel.whatsapp}
          <ChevronDown className="size-[14px]" strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 !bg-surface !text-text !ring-border">
        {formats.map(({ format, label, icon: Icon }) => (
          <button
            key={format}
            type="button"
            onClick={() => share(format)}
            className="flex h-10 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[14px] font-semibold hover:bg-surface-2"
          >
            <Icon className="size-[16px] text-text-muted" strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: Типчек і лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок.

- [ ] **Step 4: Commit**

```bash
git add src/components/more/ShareWhatsAppButton.tsx src/lib/i18n/uk.ts
git commit -m "feat(admin): ShareWhatsAppButton — Web Share API з фолбеком на wa.me"
```

---

## Task 9: `DefaultViewToggle`

**Files:**
- Create: `src/components/more/DefaultViewToggle.tsx`

**Interfaces:**
- Consumes: `updateDefaultView` з `@/modules/auth/actions` (Task 6), `Profile` з `@/modules/auth/profile`, `SegmentedTabs` з `@/components/shared/SegmentedTabs`.
- Produces: `export function DefaultViewToggle(props: { profile: Profile }): JSX.Element`.

- [ ] **Step 1: Створити компонент**

```typescript
// src/components/more/DefaultViewToggle.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import { updateDefaultView } from "@/modules/auth/actions";
import type { Profile } from "@/modules/auth/profile";

type DefaultView = "app" | "admin";

interface DefaultViewToggleProps {
  profile: Profile;
}

/**
 * Перемикач «що відкривати одразу після входу» — тільки для `boss`, живе
 * на `/more/admin`. Оптимістично оновлює локальний стан, відкатує назад,
 * якщо збереження впало (немає мережі тощо).
 */
export function DefaultViewToggle({ profile }: DefaultViewToggleProps) {
  const [value, setValue] = useState<DefaultView>(profile.default_view as DefaultView);
  const [, startTransition] = useTransition();

  const handleChange = (next: DefaultView) => {
    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await updateDefaultView(next);

      if (result.error) {
        setValue(previous);
        toast(result.error);
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-2 p-3">
      <p className="text-[14px] font-bold">{t.admin.panel.defaultViewLabel}</p>
      <SegmentedTabs
        size="sm"
        label={t.admin.panel.defaultViewLabel}
        className="mx-0 w-auto min-w-0 px-0"
        options={[
          { value: "app" as const, label: t.admin.panel.defaultViewApp },
          { value: "admin" as const, label: t.admin.panel.defaultViewAdmin },
        ]}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Типчек і лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок (потребує Task 1 — `Profile["default_view"]` у типах, і Task 6 — `updateDefaultView`).

- [ ] **Step 3: Commit**

```bash
git add src/components/more/DefaultViewToggle.tsx
git commit -m "feat(admin): DefaultViewToggle — перемикач Застосунок/Адмінка після входу"
```

---

## Task 10: `AdminScreen` — оркестратор сторінки

**Files:**
- Create: `src/components/more/AdminScreen.tsx`

**Interfaces:**
- Consumes: `AdminWorkerList` (Task 7), `ShareWhatsAppButton` (Task 8), `DefaultViewToggle` (Task 9), `buildWorkerHoursList`/`WorkerHours` (Task 5), `ExportMenu` (Task 4), `StatTile` з `@/components/dashboard/StatTile`, `PeriodNavigator` з `@/components/hours/PeriodNavigator`, `EmptyState` з `@/components/shared/EmptyState`, `getCompanyEntriesInRange` з `@/modules/entries/queries`, `Worker` з `@/modules/team/queries`, `Profile` з `@/modules/auth/profile`.
- Produces: `export function AdminScreen(props: { profile: Profile; workers: readonly Worker[]; initialEntries: readonly WorkEntryWithNames[] }): JSX.Element`.

- [ ] **Step 1: Створити компонент**

```typescript
// src/components/more/AdminScreen.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, startOfMonth } from "date-fns";
import { Clock, Search, Users } from "lucide-react";

import { AdminWorkerList } from "@/components/more/AdminWorkerList";
import { DefaultViewToggle } from "@/components/more/DefaultViewToggle";
import { ShareWhatsAppButton } from "@/components/more/ShareWhatsAppButton";
import { StatTile } from "@/components/dashboard/StatTile";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { EmptyState } from "@/components/shared/EmptyState";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/profile";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { buildWorkerHoursList } from "@/modules/team/hours";
import type { Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

interface AdminScreenProps {
  profile: Profile;
  workers: readonly Worker[];
  initialEntries: readonly WorkEntryWithNames[];
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Оркестратор `/more/admin` (тільки `boss`). Перший кадр (поточний місяць)
 * приходить із сервера, зміна місяця тягне дані з браузера — та сама схема,
 * що і в `TeamTab`/`DashboardScreen`.
 */
export function AdminScreen({ profile, workers, initialEntries }: AdminScreenProps) {
  const supabase = useMemo(() => createClient(), []);

  const [month, setMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<readonly WorkEntryWithNames[]>(initialEntries);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const from = dateKeyOf(startOfMonth(month));
    const to = dateKeyOf(endOfMonth(month));

    getCompanyEntriesInRange(supabase, profile.company_id, from, to)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, month]);

  const allWorkerHours = useMemo(() => buildWorkerHoursList(workers, entries), [workers, entries]);

  const visibleWorkerHours = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allWorkerHours;
    return allWorkerHours.filter((item) => item.name.toLowerCase().includes(query));
  }, [allWorkerHours, search]);

  const effectiveWorkerHours = selectedIds.size > 0
    ? allWorkerHours.filter((item) => selectedIds.has(item.id))
    : visibleWorkerHours;

  const totalMinutes = effectiveWorkerHours.reduce((sum, item) => sum + item.minutes, 0);
  const avgMinutes =
    effectiveWorkerHours.length === 0 ? 0 : Math.round(totalMinutes / effectiveWorkerHours.length);

  const monthFrom = dateKeyOf(startOfMonth(month));
  const monthTo = dateKeyOf(endOfMonth(month));
  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  const allVisibleSelected =
    visibleWorkerHours.length > 0 && visibleWorkerHours.every((item) => selectedIds.has(item.id));

  const toggleWorker = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const item of visibleWorkerHours) next.delete(item.id);
      } else {
        for (const item of visibleWorkerHours) next.add(item.id);
      }
      return next;
    });
  }, [allVisibleSelected, visibleWorkerHours]);

  const exportWorkerIds = selectedIds.size > 0 ? [...selectedIds] : undefined;

  return (
    <div className="flex flex-col gap-4 px-4 pb-24 lg:mx-auto lg:max-w-[720px]">
      <DefaultViewToggle profile={profile} />

      <PeriodNavigator
        title={monthTitle}
        onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
        onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Clock} label={t.admin.panel.kpiHours} value={formatHoursShort(totalMinutes)} />
        <StatTile icon={Users} label={t.admin.panel.kpiActive} value={String(workers.length)} />
        <StatTile icon={Clock} label={t.admin.panel.kpiAvg} value={formatHoursShort(avgMinutes)} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-[12px] border border-border bg-surface-2 px-3">
          <Search className="size-4 shrink-0 text-text-dim" strokeWidth={2} aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.admin.panel.searchPlaceholder}
            className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-text-dim"
          />
        </div>

        <button
          type="button"
          onClick={toggleSelectAll}
          className="h-11 shrink-0 rounded-[12px] border border-border px-4 text-[14px] font-bold text-text"
        >
          {allVisibleSelected ? t.admin.panel.deselectAll : t.admin.panel.selectAll}
        </button>
      </div>

      {visibleWorkerHours.length === 0 ? (
        <EmptyState title={t.admin.panel.empty} />
      ) : (
        <AdminWorkerList items={visibleWorkerHours} selectedIds={selectedIds} onToggle={toggleWorker} />
      )}

      <div className="sticky bottom-4 mt-2 flex items-center gap-2 rounded-[16px] border border-border bg-surface p-3 shadow-lg">
        <p className="flex-1 truncate text-[13px] font-bold text-text-muted">
          {selectedIds.size > 0
            ? fmt(t.admin.panel.selected, { n: selectedIds.size })
            : t.admin.panel.selectedAll}
        </p>

        <ExportMenu from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
        <ShareWhatsAppButton from={monthFrom} to={monthTo} workerIds={exportWorkerIds} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Типчек і лінт**

Run: `npx tsc --noEmit && npm run lint`
Expected: без помилок.

- [ ] **Step 3: Commit**

```bash
git add src/components/more/AdminScreen.tsx
git commit -m "feat(admin): AdminScreen — фільтри, KPI, список-графік і панель дій"
```

---

## Task 11: Роут `/more/admin`, пункт меню, наскрізна перевірка

**Files:**
- Create: `src/app/(app)/more/admin/page.tsx`
- Modify: `src/app/(app)/more/page.tsx`

**Interfaces:**
- Consumes: `AdminScreen` (Task 10), `requireProfile()`, `getCompanyEntriesInRange`, `getCompanyWorkers`, `getPeriodRange` з `@/modules/dashboard/period`.

- [ ] **Step 1: Створити сторінку**

```typescript
// src/app/(app)/more/admin/page.tsx
import { redirect } from "next/navigation";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { AdminScreen } from "@/components/more/AdminScreen";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/** Адмінка — тільки `boss`: фільтри, список-графік годин, експорт і WhatsApp-шеринг. */
export default async function AdminPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/more");
  }

  const supabase = await createClient();
  const { from, to } = getPeriodRange("month", new Date());

  const [entries, workers] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return (
    <div className="pb-6">
      <BackHeader title={t.admin.panel.title} href="/more" />
      <AdminScreen profile={profile} workers={workers} initialEntries={entries} />
    </div>
  );
}
```

- [ ] **Step 2: Додати пункт меню в `/more`**

Знайти в `src/app/(app)/more/page.tsx`:

```typescript
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Database,
  Info,
  Languages,
  LogOut,
  Moon,
  Users,
} from "lucide-react";
```

Замінити на:

```typescript
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Database,
  Info,
  Languages,
  LogOut,
  Moon,
  ShieldCheck,
  Users,
} from "lucide-react";
```

Знайти:

```typescript
  const rows: SettingsRow[] = [
    ...(profile.role === "boss"
      ? [{ icon: Users, label: t.profile.rows.team, href: "/more/team" }]
      : []),
```

Замінити на:

```typescript
  const rows: SettingsRow[] = [
    ...(profile.role === "boss"
      ? [
          { icon: Users, label: t.profile.rows.team, href: "/more/team" },
          { icon: ShieldCheck, label: t.profile.rows.admin, href: "/more/admin" },
        ]
      : []),
```

- [ ] **Step 3: Додати ключ `admin` в `t.profile.rows` (`src/lib/i18n/uk.ts`)**

Знайти:

```typescript
    rows: {
      team: "Команда",
      notifications: "Сповіщення",
```

Замінити на:

```typescript
    rows: {
      team: "Команда",
      admin: "Адмінка",
      notifications: "Сповіщення",
```

- [ ] **Step 4: Типчек, лінт, тести, білд**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: усе зелене.

- [ ] **Step 5: Ручна перевірка в браузері**

Run: `npm run dev`

1. Увійти як `boss` (демо-акаунт із `seed.sql`) → на `/more` з'явився пункт «Адмінка».
2. Відкрити `/more/admin` — видно KPI, місяць-навігатор, пошук, кнопку «Усі», список робітників із прогрес-барами.
3. Відкрити той самий шлях під `worker` (або напряму зайти на `/more/admin`) — редирект на `/more`, пункту меню немає.
4. Звузити вікно до ширини телефону (DevTools → responsive, 390px) — список і KPI не ламають горизонтальний скрол; на широкому екрані список стає двоколонковою сіткою.
5. Позначити кілька робітників чекбоксами — плашка знизу показує «Обрано: N»; натиснути «Усі» — знову «Обрано: усі», всі чекбокси очищені.
6. Натиснути «Експорт» → CSV — файл завантажується, у ньому тільки обрані робітники (або всі, якщо нічого не позначено).
7. Натиснути «WhatsApp» → CSV — на мобільному з підтримкою Web Share (реальний Android/iOS) відкривається системне меню «Поділитися»; на десктопі файл качається і відкривається вкладка `wa.me` з текстом-підказкою.
8. У блоці «Відкривати після входу» переключити на «Адмінка», вийти і зайти знову тим самим `boss` — після входу відкривається `/more/admin`, а не `/`. Переключити назад на «Застосунок» і повторити — тепер відкривається `/`.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/more/admin/page.tsx src/app/\(app\)/more/page.tsx src/lib/i18n/uk.ts
git commit -m "feat(admin): роут /more/admin і пункт меню «Адмінка» для boss"
```
