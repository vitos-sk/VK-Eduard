# Звіт — отдельная сущность: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разорвать связь «Звіту» с `work_entries` — звіт становится отдельной сущностью (`site_reports`) без полей часу, с категоріями видів робіт, без потери существующей истории.

**Architecture:** Новая таблица `site_reports` + `report_photos` + `work_categories`/`report_categories` (RLS по образцу `work_entries`/`entry_photos`, миграции 0004/0005/0007). Новый модуль `src/modules/reports/` (types/queries/actions/reportState/categoryStats) по образцу `src/modules/entries/`. `ReportForm`/`ReportDetail`/`ReportCard`/`ReportsFeed`/`ReportsScreen` переключаются на новые данные, блок часу убирается. Объектная страница и CSV-экспорт получают версию под звіти. `work_entries`/«Години»/таймер не трогаются.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase (Postgres + Storage + RLS), TypeScript, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-zvit-otdelnaya-sushchnost-design.md`

## Global Constraints

- Никаких полей времени/duration в `site_reports` — обязательные поля только `site_id` (nullable), `work_date`; `description` и категорії необов'язкові.
- Права как у `work_entries` **после** миграции 0007 — автор правит/видаляє свої записи **без обмеження по даті**, шеф — будь-які. Спека ссылается на устаревшее «вікно 7 днів» (`editWindow.ts` уже не существует в коде) — этот план его не использует нигде.
- **Отклонение от спеки, зафиксированное здесь сознательно:** отдельного бакета `report-photos` не создаём. Бэкфілл переносит существующие `entry_photos` в `report_photos` только как строки метаданных с тем же `storage_path`; физические файлы лежат в бакете `entry-photos` и никуда не переезжают (Storage — это S3-совместимое хранилище, копирование строки `storage.objects` в другой бакет не копирует байты — это создало бы 404 при бэкфілле). Поэтому новые фото звітів тоже грузятся в бакет `entry-photos`, просто по пути `{company_id}/{report_id}/{uuid}.webp` — и для бэкфіллнутих записей `report_id = id` старого `work_entries`, так что путь уже верный без единого движения файлов. Бакету добавляются отдельные read/remove storage-политики, завязанные на `site_reports` (write-политика уже достаточно общая — проверяет только `company_id` в пути).
- i18n — только через `t.*` (`src/lib/i18n/uk.ts`), никаких строк в JSX.
- Server actions — `"use server"`, `getProfile()`/`requireProfile()`, `revalidatePath("/", "layout")` по образцу `src/modules/entries/actions.ts`.
- Тесты — vitest, `*.test.ts` рядом с модулем (см. `src/modules/time/calc.test.ts`).
- Типы Supabase генерируются командой `npx supabase gen types typescript --project-id lhtcocvnqmfdxtukuels > src/lib/supabase/types.gen.ts` (из шапки `src/lib/supabase/types.gen.ts`) — руками не править.
- Проверочные команды: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

---

## Task 1: Миграция схемы `site_reports`

**Files:**
- Create: `supabase/migrations/0008_site_reports.sql`

**Interfaces:**
- Produces: таблицы `site_reports`, `report_photos`, `work_categories`, `report_categories`; RLS-политики; storage-политики на бакете `entry-photos` для владения через `site_reports`; стартовые категорії для каждой существующей компанії.

- [ ] **Step 1: Написать миграцию**

```sql
-- «Звіт» стає окремою сутністю: без часу, `site_reports` замість `work_entries`.
-- Спека: docs/superpowers/specs/2026-09-11-zvit-otdelnaya-sushchnost-design.md
-- Права — за зразком work_entries/entry_photos ПІСЛЯ міграції 0007: автор
-- редагує/видаляє свої записи без обмеження по даті, шеф — будь-які.

create table site_reports (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null unique,
  company_id  uuid not null references companies(id),
  author_id   uuid not null references profiles(id),
  site_id     uuid references sites(id) on delete set null,
  work_date   date not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger site_reports_touch
  before update on site_reports
  for each row execute function touch_updated_at();

create table report_photos (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references site_reports(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  size_bytes   int,
  sort_order   int not null default 0
);

create table work_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id),
  label       text not null,
  sort_order  int not null default 0,
  archived_at timestamptz
);

create table report_categories (
  report_id   uuid not null references site_reports(id) on delete cascade,
  category_id uuid not null references work_categories(id) on delete cascade,
  primary key (report_id, category_id)
);

create index site_reports_author_date_idx   on site_reports (author_id, work_date desc);
create index site_reports_company_date_idx  on site_reports (company_id, work_date desc);
create index site_reports_site_date_idx     on site_reports (site_id, work_date desc);
create index report_photos_report_idx       on report_photos (report_id, sort_order);
create index work_categories_company_idx    on work_categories (company_id, sort_order);
create index report_categories_category_idx on report_categories (category_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table site_reports      enable row level security;
alter table report_photos     enable row level security;
alter table work_categories   enable row level security;
alter table report_categories enable row level security;

create policy reports_select on site_reports for select to authenticated
  using (company_id = private.current_company_id() and (author_id = auth.uid() or private.is_boss()));

create policy reports_insert on site_reports for insert to authenticated
  with check (company_id = private.current_company_id() and author_id = auth.uid());

create policy reports_update on site_reports for update to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or author_id = auth.uid()))
  with check (company_id = private.current_company_id());

create policy reports_delete on site_reports for delete to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or author_id = auth.uid()));

create policy report_photos_select on report_photos for select to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

create policy report_photos_insert on report_photos for insert to authenticated
  with check (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and r.author_id = auth.uid()
  ));

create policy report_photos_delete on report_photos for delete to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

create policy work_categories_select on work_categories for select to authenticated
  using (company_id = private.current_company_id() and archived_at is null);

create policy work_categories_insert on work_categories for insert to authenticated
  with check (company_id = private.current_company_id() and private.is_boss());

create policy work_categories_update on work_categories for update to authenticated
  using (company_id = private.current_company_id() and private.is_boss())
  with check (company_id = private.current_company_id());

create policy report_categories_select on report_categories for select to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

create policy report_categories_insert on report_categories for insert to authenticated
  with check (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and r.author_id = auth.uid()
  ));

create policy report_categories_delete on report_categories for delete to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

-- ── Storage: фото звітів лежать у тому ж бакеті entry-photos ────────────────
-- Не заводимо окремий бакет: `entry_photos_write` (0001) вже перевіряє тільки
-- company_id у шляху, тож новий запис під report_id туди й так пройде.
-- Read/remove у 0001 перевіряють саме work_entries — тут додаємо паралельні
-- політики під site_reports; Postgres об'єднує permissive-політики через OR.

create policy report_photos_storage_read on storage.objects for select to authenticated
  using (
    bucket_id = 'entry-photos'
    and exists (
      select 1 from site_reports r
      where r.id::text = (storage.foldername(name))[2]
        and r.company_id = private.current_company_id()
        and (r.author_id = auth.uid() or private.is_boss())
    )
  );

create policy report_photos_storage_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'entry-photos'
    and exists (
      select 1 from site_reports r
      where r.id::text = (storage.foldername(name))[2]
        and r.company_id = private.current_company_id()
        and (r.author_id = auth.uid() or private.is_boss())
    )
    and owner_id = auth.uid()::text
  );

-- ── Стартовий набір категорій на кожну існуючу компанію ──────────────────────
-- Екрана управління в v1 нема (спека, розділ «work_categories») — компанія
-- зараз одна (docs/DATA-MODEL.md), тому тригера на нові компанії не заводимо.

insert into work_categories (company_id, label, sort_order)
select c.id, seed.label, seed.ord
from companies c
cross join (values
  ('Покрівля', 0), ('Фасад', 1), ('Демонтаж', 2), ('Монтаж мембрани', 3),
  ('Заливка бетону', 4), ('Електрика', 5), ('Сантехніка', 6),
  ('Оздоблення', 7), ('Прибирання', 8), ('Інше', 9)
) as seed(label, ord);
```

- [ ] **Step 2: Применить миграцию локально**

Run: `npx supabase db push` (или `npx supabase migration up`, смотря какой воркфлоу уже настроен в `supabase/config.toml` — использовать тот, что реально применял миграции 0001–0007 в этом проекте).
Expected: миграция применяется без ошибок, `site_reports`/`report_photos`/`work_categories`/`report_categories` появляются в схеме.

- [ ] **Step 3: Коммит**

```bash
git add supabase/migrations/0008_site_reports.sql
git commit -m "$(cat <<'EOF'
feat(db): таблиці site_reports/report_photos/work_categories

Звіт стає окремою сутністю без полів часу — RLS за зразком work_entries
після міграції 0007 (без вікна 7 днів). Фото звітів лишаються у бакеті
entry-photos: окремий бакет зламав би бэкфілл (копіювання рядка
storage.objects між бакетами не копіює байти).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 2: Бэкфілл існуючих даних + регенерація типів

**Files:**
- Create: `supabase/migrations/0009_backfill_site_reports.sql`
- Modify: `src/lib/supabase/types.gen.ts` (регенерируется, не руками)

**Interfaces:**
- Consumes: `site_reports`/`report_photos` из Task 1.
- Produces: обновлённый `Database`/`Tables<"site_reports">`/`Tables<"report_photos">`/`Tables<"work_categories">`/`Tables<"report_categories">` в `types.gen.ts`, на которые опирается весь Task 3+.

- [ ] **Step 1: Написать миграцию бэкфілла**

```sql
-- Бэкфілл існуючих work_entries (з описом або фото) в site_reports.
-- id/client_id зберігаються тими самими, що у вихідного запису work_entries —
-- це і є ключ ідемпотентності: повторний запуск нічого не задублює
-- (`on conflict (id) do nothing`). Часові поля НЕ переносяться — їх нема
-- в site_reports. Категорії на бэкфілнутих записах лишаються порожніми,
-- дозаповнюються вручну при бажанні.

insert into site_reports (id, client_id, company_id, author_id, site_id, work_date, description, created_at, updated_at)
select e.id, e.client_id, e.company_id, e.author_id, e.site_id, e.work_date, e.description, e.created_at, e.updated_at
from work_entries e
where e.description <> '' or exists (select 1 from entry_photos p where p.entry_id = e.id)
on conflict (id) do nothing;

-- report_id = id вихідного entry_photos.entry_id — той самий storage_path
-- лишається валідним, бо бакет entry-photos і шлях {company_id}/{id}/... не
-- змінюються (див. коментар у 0008 про storage-політики).
insert into report_photos (id, report_id, storage_path, width, height, size_bytes, sort_order)
select p.id, p.entry_id, p.storage_path, p.width, p.height, p.size_bytes, p.sort_order
from entry_photos p
join work_entries e on e.id = p.entry_id
where e.description <> '' or exists (select 1 from entry_photos p2 where p2.entry_id = e.id)
on conflict (id) do nothing;
```

- [ ] **Step 2: Применить миграцию**

Run: та же команда, что в Task 1 Step 2.
Expected: `site_reports`/`report_photos` заполняются существующей историей; повторный прогон команды ничего не меняет (проверить: запустить дважды, `select count(*) from site_reports` не меняется на втором прогоне).

- [ ] **Step 3: Регенерировать типы**

Run: `npx supabase gen types typescript --project-id lhtcocvnqmfdxtukuels > src/lib/supabase/types.gen.ts`
Expected: файл обновился, в нём появились `site_reports`, `report_photos`, `work_categories`, `report_categories` в `Database["public"]["Tables"]`.

- [ ] **Step 4: Проверить типы компилируются**

Run: `npx tsc --noEmit`
Expected: PASS (проект ещё не использует новые таблицы, ошибок быть не должно).

- [ ] **Step 5: Коммит**

```bash
git add supabase/migrations/0009_backfill_site_reports.sql src/lib/supabase/types.gen.ts
git commit -m "$(cat <<'EOF'
feat(db): бэкфілл work_entries → site_reports, регенерація типів

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 3: Модуль `src/modules/reports/`

**Files:**
- Create: `src/modules/reports/types.ts`
- Create: `src/modules/reports/reportState.ts`
- Create: `src/modules/reports/reportState.test.ts`
- Create: `src/modules/reports/categoryStats.ts`
- Create: `src/modules/reports/categoryStats.test.ts`
- Create: `src/modules/reports/queries.ts`
- Create: `src/modules/reports/actions.ts`

**Interfaces:**
- Consumes: `Tables<"site_reports"|"report_photos"|"work_categories">` из `@/lib/supabase/types.gen` (Task 2).
- Produces (используется в Task 4–9):
  - `SiteReport`, `ReportPhoto`, `WorkCategory`, `SiteReportWithPhotos { ...SiteReport, report_photos: ReportPhoto[], category_ids: string[] }`, `SiteReportDetail extends SiteReportWithPhotos { author_full_name: string }`, `SiteReportWithNames extends SiteReport { author_full_name: string; site_name: string | null; category_labels: string[]; photo_count: number }`
  - `reportState(report: Pick<SiteReport,"description">, photoCount: number): "no_description" | "ready"`
  - `aggregateCategoryStats(reports: readonly SiteReportWithPhotos[], categories: readonly WorkCategory[]): { id: string; label: string; count: number }[]`
  - `getWorkCategories(supabase, companyId): Promise<WorkCategory[]>`
  - `getReportsFeed(supabase, authorId): Promise<SiteReportWithPhotos[]>`
  - `getReportWithPhotos(supabase, reportId): Promise<SiteReportDetail | null>`
  - `getCompanyReportsInRange(supabase, companyId, fromDate, toDate): Promise<SiteReportWithNames[]>`
  - `createReport(input: ReportInput): Promise<{ error: string | null; reportId: string | null }>`
  - `updateReport(reportId: string, input: ReportInput): Promise<{ error: string | null }>`
  - `updateReportDescription(reportId: string, description: string): Promise<{ error: string | null }>`
  - `updateReportCategories(reportId: string, categoryIds: string[]): Promise<{ error: string | null }>`
  - `deleteReport(reportId: string): Promise<{ error: string | null }>`
  - `ReportInput { workDate: string; siteId: string | null; description: string; categoryIds: string[] }`

- [ ] **Step 1: `types.ts`**

```ts
import type { Tables } from "@/lib/supabase/types.gen";

export type SiteReport = Tables<"site_reports">;
export type ReportPhoto = Tables<"report_photos">;
export type WorkCategory = Tables<"work_categories">;

/** Звіт разом з фото і id обраних категорій — те, що малює стрічка і форма. */
export interface SiteReportWithPhotos extends SiteReport {
  report_photos: ReportPhoto[];
  category_ids: string[];
}

/** Звіт для детальної сторінки `/reports/[id]` — з ім'ям автора. */
export interface SiteReportDetail extends SiteReportWithPhotos {
  author_full_name: string;
}

/** Звіт для експорту/команди — з іменами автора, об'єкта і назвами категорій. */
export interface SiteReportWithNames extends SiteReport {
  author_full_name: string;
  site_name: string | null;
  category_labels: string[];
  photo_count: number;
}
```

- [ ] **Step 2: `reportState.ts`**

```ts
import type { SiteReport } from "./types";

/**
 * Два стани картки звіту (REPORTS.md, розділ 2, без «Триває» — того стану
 * часу тут більше немає).
 */
export type ReportState = "no_description" | "ready";

export function reportState(
  report: Pick<SiteReport, "description">,
  photoCount: number,
): ReportState {
  return report.description === "" && photoCount === 0 ? "no_description" : "ready";
}
```

- [ ] **Step 3: `reportState.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { reportState } from "./reportState";

describe("reportState", () => {
  it("без опису і без фото — no_description", () => {
    expect(reportState({ description: "" }, 0)).toBe("no_description");
  });

  it("є опис — ready, навіть без фото", () => {
    expect(reportState({ description: "Монтаж мембрани" }, 0)).toBe("ready");
  });

  it("немає опису, але є фото — ready", () => {
    expect(reportState({ description: "" }, 2)).toBe("ready");
  });
});
```

- [ ] **Step 4: Прогнать тест**

Run: `npm test -- reportState`
Expected: PASS, 3 теста.

- [ ] **Step 5: `categoryStats.ts`**

```ts
import type { SiteReportWithPhotos, WorkCategory } from "./types";

export interface CategoryStat {
  id: string;
  label: string;
  count: number;
}

/**
 * Розподіл звітів по категоріях — «Покрівля · 5», відсортовано за спаданням.
 * Категорія без відповідної назви у довіднику (архівована) пропускається —
 * рахувати лічильник для мітки, якої вже нема, безглуздо.
 */
export function aggregateCategoryStats(
  reports: readonly SiteReportWithPhotos[],
  categories: readonly WorkCategory[],
): CategoryStat[] {
  const labelById = new Map(categories.map((category) => [category.id, category.label] as const));
  const counts = new Map<string, number>();

  for (const report of reports) {
    for (const categoryId of report.category_ids) {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: labelById.get(id) ?? "", count }))
    .filter((stat) => stat.label !== "")
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 6: `categoryStats.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { aggregateCategoryStats } from "./categoryStats";
import type { SiteReportWithPhotos, WorkCategory } from "./types";

const CATEGORIES: WorkCategory[] = [
  { id: "roof", company_id: "c1", label: "Покрівля", sort_order: 0, archived_at: null },
  { id: "demo", company_id: "c1", label: "Демонтаж", sort_order: 1, archived_at: null },
];

function report(categoryIds: string[]): SiteReportWithPhotos {
  return {
    id: "r1",
    client_id: "cl1",
    company_id: "c1",
    author_id: "a1",
    site_id: "s1",
    work_date: "2026-09-01",
    description: "",
    created_at: "",
    updated_at: "",
    report_photos: [],
    category_ids: categoryIds,
  };
}

describe("aggregateCategoryStats", () => {
  it("рахує кількість звітів на категорію і сортує за спаданням", () => {
    const stats = aggregateCategoryStats(
      [report(["roof"]), report(["roof", "demo"]), report(["roof"])],
      CATEGORIES,
    );

    expect(stats).toEqual([
      { id: "roof", label: "Покрівля", count: 3 },
      { id: "demo", label: "Демонтаж", count: 1 },
    ]);
  });

  it("пропускає категорію без мітки у довіднику (архівована)", () => {
    const stats = aggregateCategoryStats([report(["ghost"])], CATEGORIES);
    expect(stats).toEqual([]);
  });
});
```

- [ ] **Step 7: Прогнать тест**

Run: `npm test -- categoryStats`
Expected: PASS, 2 теста.

- [ ] **Step 8: `queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types.gen";
import type {
  ReportPhoto,
  SiteReport,
  SiteReportDetail,
  SiteReportWithNames,
  SiteReportWithPhotos,
  WorkCategory,
} from "./types";

type Client = SupabaseClient<Database>;

type ReportRow = SiteReport & {
  report_photos: ReportPhoto[];
  report_categories: { category_id: string }[];
};

function withCategoryIds(row: ReportRow): SiteReportWithPhotos {
  const { report_categories, ...rest } = row;
  return { ...rest, category_ids: report_categories.map((item) => item.category_id) };
}

/** Категорії компанії, активні (не архівовані), у порядку `sort_order`. */
export async function getWorkCategories(
  supabase: Client,
  companyId: string,
): Promise<WorkCategory[]> {
  const { data, error } = await supabase
    .from("work_categories")
    .select("*")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/** Лента звітів автора з фото і категоріями, від нових до старих. */
export async function getReportsFeed(
  supabase: Client,
  authorId: string,
): Promise<SiteReportWithPhotos[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select("*, report_photos(*), report_categories(category_id)")
    .eq("author_id", authorId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as ReportRow[]).map(withCategoryIds);
}

/** Один звіт з фото, категоріями і ім'ям автора — для `/reports/[id]`. */
export async function getReportWithPhotos(
  supabase: Client,
  reportId: string,
): Promise<SiteReportDetail | null> {
  const { data, error } = await supabase
    .from("site_reports")
    .select("*, report_photos(*), report_categories(category_id), profiles(full_name)")
    .eq("id", reportId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { profiles, ...row } = data as ReportRow & {
    profiles: { full_name: string } | null;
  };

  return { ...withCategoryIds(row), author_full_name: profiles?.full_name ?? "" };
}

type CompanyReportRow = SiteReport & {
  profiles: { full_name: string } | null;
  sites: { name: string } | null;
  report_photos: { id: string }[];
  report_categories: { work_categories: { label: string } | null }[];
};

/** Звіти компанії за діапазон дат — для CSV-експорту «Звіти». */
export async function getCompanyReportsInRange(
  supabase: Client,
  companyId: string,
  fromDate: string,
  toDate: string,
): Promise<SiteReportWithNames[]> {
  const { data, error } = await supabase
    .from("site_reports")
    .select(
      "*, profiles(full_name), sites(name), report_photos(id), report_categories(work_categories(label))",
    )
    .eq("company_id", companyId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate)
    .order("work_date", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as CompanyReportRow[]).map(
    ({ profiles, sites, report_photos, report_categories, ...report }) => ({
      ...report,
      author_full_name: profiles?.full_name ?? "",
      site_name: sites?.name ?? null,
      category_labels: report_categories
        .map((item) => item.work_categories?.label ?? "")
        .filter((label) => label !== ""),
      photo_count: report_photos.length,
    }),
  );
}
```

- [ ] **Step 9: `actions.ts`**

```ts
"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/modules/auth/session";

export type ReportActionState = { error: string | null };

const OK: ReportActionState = { error: null };

export interface ReportInput {
  workDate: string;
  siteId: string | null;
  description: string;
  categoryIds: string[];
}

export interface CreateReportState extends ReportActionState {
  reportId: string | null;
}

/**
 * Перезаписує повний набір категорій звіту: видаляє старі зв'язки і вставляє
 * нові одним запитом — простіше й дешевше за diff, а звітів мало категорій
 * (одиниці), тому зайвої роботи тут не буде.
 */
async function replaceReportCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  categoryIds: readonly string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("report_categories")
    .delete()
    .eq("report_id", reportId);

  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("report_categories")
    .insert(categoryIds.map((categoryId) => ({ report_id: reportId, category_id: categoryId })));

  if (insertError) throw insertError;
}

/** Створює звіт — без жодного поля часу, на відміну від `createManualEntry`. */
export async function createReport(input: ReportInput): Promise<CreateReportState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile, reportId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .insert({
      client_id: randomUUID(),
      company_id: profile.company_id,
      author_id: profile.id,
      site_id: input.siteId,
      work_date: input.workDate,
      description: input.description,
    })
    .select("id")
    .single();

  if (error) {
    return { error: t.reportForm.saveError, reportId: null };
  }

  try {
    await replaceReportCategories(supabase, data.id, input.categoryIds);
  } catch {
    return { error: t.reportForm.saveError, reportId: data.id };
  }

  revalidatePath("/", "layout");

  return { error: null, reportId: data.id };
}

/** Повна правка звіту — об'єкт, дата, опис, категорії. */
export async function updateReport(
  reportId: string,
  input: ReportInput,
): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .update({
      site_id: input.siteId,
      work_date: input.workDate,
      description: input.description,
    })
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { error: t.manualTime.saveError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  try {
    await replaceReportCategories(supabase, reportId, input.categoryIds);
  } catch {
    return { error: t.manualTime.saveError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Дозаповнення опису — «Дописати» на картці «Без опису» і правка в деталях. */
export async function updateReportDescription(
  reportId: string,
  description: string,
): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .update({ description })
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { error: t.reportDetail.saveError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Правка тільки категорій — окрема секція на детальній сторінці. */
export async function updateReportCategories(
  reportId: string,
  categoryIds: string[],
): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();

  try {
    await replaceReportCategories(supabase, reportId, categoryIds);
  } catch {
    return { error: t.reportDetail.saveError };
  }

  revalidatePath("/", "layout");

  return OK;
}

/** Видаляє звіт. Фото видаляються каскадом на рівні бази. */
export async function deleteReport(reportId: string): Promise<ReportActionState> {
  const profile = await getProfile();

  if (!profile) {
    return { error: t.auth.noProfile };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_reports")
    .delete()
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { error: t.hours.deleteError };
  }

  if (!data || data.length === 0) {
    return { error: t.reportDetail.saveRejected };
  }

  revalidatePath("/", "layout");

  return OK;
}
```

- [ ] **Step 10: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 11: Коммит**

```bash
git add src/modules/reports/
git commit -m "$(cat <<'EOF'
feat(reports): модуль modules/reports — types/queries/actions/categoryStats

За зразком modules/entries, але без будь-якої логіки часу/duration.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 4: Фото звітів — `uploadReportPhoto`/`deleteReportPhoto` + `ReportPhotoUploader`

**Files:**
- Modify: `src/modules/media/photos.ts`
- Create: `src/components/reports/ReportPhotoUploader.tsx`

**Interfaces:**
- Consumes: `ReportPhoto` из `@/modules/reports/types` (Task 3).
- Produces: `uploadReportPhoto(supabase, { companyId, reportId, sortOrder }, file): Promise<ReportPhoto>`, `deleteReportPhoto(supabase, photo): Promise<void>`, компонент `<ReportPhotoUploader companyId reportId photos urls onPhotosChange onUrlsChange editable className? />` (тот же контракт пропсов, что у `PhotoUploader`, только `entryId` → `reportId`).

- [ ] **Step 1: Добавить функции в `modules/media/photos.ts`**

Добавить импорт типа и две функции по образцу `uploadEntryPhoto`/`deleteEntryPhoto` (тот же бакет `entry-photos`, см. Global Constraints):

```ts
import type { ReportPhoto } from "@/modules/reports/types";
```

```ts
/**
 * Сжимает и загружает фото звіту в той самий бакет `entry-photos`
 * (Global Constraints плану: окремий бакет зламав би бэкфілл), по шляху
 * `{company_id}/{report_id}/{uuid}.webp`, потім рядок метаданих у `report_photos`.
 */
export async function uploadReportPhoto(
  supabase: SupabaseClient<Database>,
  params: { companyId: string; reportId: string; sortOrder: number },
  file: File,
): Promise<ReportPhoto> {
  const { blob, width, height } = await compressImage(file);
  const path = `${params.companyId}/${params.reportId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/webp" });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("report_photos")
    .insert({
      report_id: params.reportId,
      storage_path: path,
      width,
      height,
      size_bytes: blob.size,
      sort_order: params.sortOrder,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;

  return data;
}

/** Удаляет фото звіту: сначала файл из Storage, потом строку метаданных. */
export async function deleteReportPhoto(
  supabase: SupabaseClient<Database>,
  photo: Pick<ReportPhoto, "id" | "storage_path">,
): Promise<void> {
  const { error: removeError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);

  if (removeError) throw removeError;

  const { error: deleteError } = await supabase
    .from("report_photos")
    .delete()
    .eq("id", photo.id);

  if (deleteError) throw deleteError;
}
```

- [ ] **Step 2: Создать `ReportPhotoUploader.tsx`**

Копия `PhotoUploader.tsx` (`src/components/reports/PhotoUploader.tsx`) с заменами: `entryId` → `reportId`, `uploadEntryPhoto`/`deleteEntryPhoto` → `uploadReportPhoto`/`deleteReportPhoto`, `EntryPhoto` → `ReportPhoto` из `@/modules/reports/types`. Разметка, `MAX_PHOTOS_PER_ENTRY`, `BUCKET`, тексты `t.reportDetail.*` — без изменений (лимит фото общий для обеих сутностей, отдельно не заводим).

```tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

import { fmt } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTOS_PER_ENTRY, deleteReportPhoto, uploadReportPhoto } from "@/modules/media/photos";
import type { ReportPhoto } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

const BUCKET = "entry-photos";

interface ReportPhotoUploaderProps {
  companyId: string;
  reportId: string;
  photos: readonly ReportPhoto[];
  /** Подписанные ссылки: `storage_path` → URL. */
  urls: Readonly<Record<string, string>>;
  onPhotosChange: (photos: ReportPhoto[]) => void;
  onUrlsChange: (patch: Record<string, string>) => void;
  /** Чужой звіт — фото можно только смотреть. */
  editable: boolean;
  className?: string;
}

/** Сетка фото звіту — те саме, що `PhotoUploader`, тільки для `report_photos`. */
export function ReportPhotoUploader({
  companyId,
  reportId,
  photos,
  urls,
  onPhotosChange,
  onUrlsChange,
  editable,
  className,
}: ReportPhotoUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS_PER_ENTRY - photos.length;
    const toUpload = Array.from(files).slice(0, Math.max(0, remaining));

    if (toUpload.length === 0) return;

    setIsUploading(true);
    const nextPhotos = [...photos];
    const nextUrls: Record<string, string> = {};
    let sortOrder = photos.length;

    for (const file of toUpload) {
      try {
        const photo = await uploadReportPhoto(
          supabase,
          { companyId, reportId, sortOrder },
          file,
        );
        sortOrder += 1;
        nextPhotos.push(photo);

        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(photo.storage_path, 3600);

        if (data?.signedUrl) {
          nextUrls[photo.storage_path] = data.signedUrl;
        }
      } catch {
        toast(t.reportDetail.uploadError);
      }
    }

    onPhotosChange(nextPhotos);
    onUrlsChange(nextUrls);
    setIsUploading(false);
  };

  const handleRemove = async (photo: ReportPhoto) => {
    try {
      await deleteReportPhoto(supabase, photo);
      onPhotosChange(photos.filter((item) => item.id !== photo.id));
    } catch {
      toast(t.reportDetail.deletePhotoError);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative size-20 shrink-0 overflow-hidden rounded-[12px] bg-surface-2"
          >
            {urls[photo.storage_path] && (
              // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
              <img src={urls[photo.storage_path]} alt="" className="size-full object-cover" />
            )}

            {editable && (
              <button
                type="button"
                onClick={() => handleRemove(photo)}
                aria-label={t.reportDetail.removePhoto}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3.5" strokeWidth={2.5} aria-hidden />
              </button>
            )}
          </div>
        ))}

        {editable && photos.length < MAX_PHOTOS_PER_ENTRY && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[12px]",
              "border border-dashed border-border text-text-muted",
              "transition-transform duration-150 active:scale-95",
              "disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <Camera className="size-5" strokeWidth={2} aria-hidden />
            <span className="text-[11px] font-semibold">
              {isUploading ? t.reportDetail.uploading : t.reportDetail.addPhoto}
            </span>
          </button>
        )}
      </div>

      {editable && (
        <p className="text-[12px] font-medium text-text-dim">
          {fmt(t.reportDetail.maxPhotos, { max: MAX_PHOTOS_PER_ENTRY })}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Коммит**

```bash
git add src/modules/media/photos.ts src/components/reports/ReportPhotoUploader.tsx
git commit -m "$(cat <<'EOF'
feat(reports): завантаження фото звітів у report_photos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 5: `WorkCategoryChips` — компонент вибору категорій

**Files:**
- Create: `src/components/reports/WorkCategoryChips.tsx`
- Modify: `src/lib/i18n/uk.ts` (секция `reportForm` — заголовок «Вид робіт»)

**Interfaces:**
- Consumes: `WorkCategory` из `@/modules/reports/types` (Task 3).
- Produces: `<WorkCategoryChips categories={WorkCategory[]} value={string[]} onChange={(ids: string[]) => void} className? readOnly? />` — переиспользуется в Task 6 (форма), Task 7 (деталка).

- [ ] **Step 1: Добавить i18n-ключ**

В `src/lib/i18n/uk.ts`, секция `reportForm` (после `title`), добавить:

```ts
    categoriesLabel: "Вид робіт",
```

В секцию `reportDetail` добавить:

```ts
    categoriesLabel: "Вид робіт",
    noCategoriesLabel: "Не вказано",
```

- [ ] **Step 2: Создать компонент**

```tsx
"use client";

import { t } from "@/lib/i18n";
import type { WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface WorkCategoryChipsProps {
  categories: readonly WorkCategory[];
  value: readonly string[];
  onChange?: (ids: string[]) => void;
  /** Тільки перегляд — на детальній сторінці поза режимом правки. */
  readOnly?: boolean;
  className?: string;
}

/**
 * Ряд чипів «Вид робіт» — мульти-select тапом. Категорія без назви (архівована,
 * якщо колись з'явиться екран архівації) сюди не потрапляє — список приходить
 * уже відфільтрованим `getWorkCategories`.
 */
export function WorkCategoryChips({
  categories,
  value,
  onChange,
  readOnly,
  className,
}: WorkCategoryChipsProps) {
  if (readOnly && value.length === 0) {
    return <p className={cn("text-[14px] font-medium text-text-muted", className)}>{t.reportDetail.noCategoriesLabel}</p>;
  }

  const visible = readOnly ? categories.filter((category) => value.includes(category.id)) : categories;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {visible.map((category) => {
        const selected = value.includes(category.id);

        return (
          <button
            key={category.id}
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (!onChange) return;
              onChange(selected ? value.filter((id) => id !== category.id) : [...value, category.id]);
            }}
            aria-pressed={selected}
            className={cn(
              "flex h-9 items-center rounded-full border px-3 text-[13px] font-bold",
              !readOnly && "transition-transform duration-150 active:scale-95",
              selected
                ? "border-brand bg-brand text-brand-ink"
                : "border-border bg-surface-2 text-text",
              readOnly && "pointer-events-none",
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Коммит**

```bash
git add src/components/reports/WorkCategoryChips.tsx src/lib/i18n/uk.ts
git commit -m "$(cat <<'EOF'
feat(reports): компонент WorkCategoryChips — вибір видів робіт

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 6: `ReportForm.tsx` — убрать час, добавить категорії

**Files:**
- Modify: `src/components/reports/ReportForm.tsx`
- Modify: `src/app/(app)/reports/new/page.tsx`
- Modify: `src/lib/i18n/uk.ts` (`reportForm.saveError`)

**Interfaces:**
- Consumes: `createReport`, `ReportInput` (Task 3), `WorkCategoryChips` (Task 5), `ReportPhotoUploader` (Task 4), `SiteReportWithPhotos`, `WorkCategory`, `getReportsFeed`, `getWorkCategories` (Task 3).
- Produces: `<ReportForm companyId sites lastReport categories />` — новый контракт пропсов (вместо `lastEntry: WorkEntryWithPhotos | null` → `lastReport: SiteReportWithPhotos | null`, плюс `categories: readonly WorkCategory[]`).

- [ ] **Step 1: Добавить i18n-ключ**

В `src/lib/i18n/uk.ts`, секция `reportForm`, добавить:

```ts
    saveError: "Не вдалося зберегти звіт. Спробуйте ще раз",
```

- [ ] **Step 2: Переписать `ReportForm.tsx`**

Убрать: `DEFAULT_START`, `QUICK_DURATIONS_H`, `BREAK_OFFSET_MIN`, `BREAK_LENGTH_MIN`, состояния `startAt`/`endAt`/`breakEnabled`, `breakStart`/`breakEnd`/`durationMin`/`isValid`, блок «Час роботи» (два `TimeInput` + быстрые кнопки + Switch перерыва), функцию `TimeInput`, импорты `Clock`, `Switch`, `minutesBetweenWrapped`/`isDurationValid`/`timeToMinutes`/`minutesToTime` из `@/modules/time/calc`, `createManualEntry`, `WorkEntryWithPhotos`, `EntryPhoto` из `@/modules/media/photos`, `PhotoUploader`.

Добавить: `WorkCategoryChips`, `ReportPhotoUploader`, `createReport`, `SiteReportWithPhotos`/`ReportPhoto` из `@/modules/reports/types`, `WorkCategory`.

```tsx
"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays, ChevronRight, History, Info } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { Thumb } from "@/components/shared/Thumb";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { createReport } from "@/modules/reports/actions";
import type { ReportPhoto, SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

interface ReportFormProps {
  companyId: string;
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  /** Самый свежий звіт автора — источник «останнього об'єкта» и повтора. */
  lastReport: SiteReportWithPhotos | null;
}

/**
 * Форма `/reports/new`. Два шага в одном экране: сперва об'єкт/дата/категорії/опис
 * сохраняются одной записью, потом (уже с готовым `reportId`) можно сразу
 * добавить фото — до этого их физически некуда прикреплять.
 */
export function ReportForm({ companyId, sites, categories, lastReport }: ReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState<string | null>(lastReport?.site_id ?? null);
  const [date, setDate] = useState<Date>(() => new Date());
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const selectedSite = siteId ? sites.find((site) => site.id === siteId) : undefined;

  const applyRepeatLast = () => {
    if (!lastReport) return;

    setSiteId(lastReport.site_id);
    setCategoryIds(lastReport.category_ids);
    // Описание намеренно не копируем — REPORTS.md: «описание чистое».
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createReport({
        workDate: dateKeyOf(date),
        siteId,
        description,
        categoryIds,
      });

      if (result.error || !result.reportId) {
        toast(result.error ?? t.reportForm.saveError);
        return;
      }

      toast(t.reportForm.saved);
      setCreatedReportId(result.reportId);
      router.refresh();
    });
  };

  if (createdReportId) {
    return (
      <div className="pb-6">
        <BackHeader title={t.reportForm.title} href={`/reports/${createdReportId}`} />

        <div className="space-y-4 px-4">
          <div>
            <h2 className="text-[17px] font-bold">{t.reportForm.photosStepTitle}</h2>
            <p className="mt-1 text-[13px] font-medium text-text-muted">
              {t.reportForm.photosStepHint}
            </p>
          </div>

          <ReportPhotoUploader
            companyId={companyId}
            reportId={createdReportId}
            photos={photos}
            urls={photoUrls}
            onPhotosChange={setPhotos}
            onUrlsChange={(patch) => setPhotoUrls((current) => ({ ...current, ...patch }))}
            editable
          />

          <button
            type="button"
            onClick={() => router.push(`/reports/${createdReportId}`)}
            className={cn(
              "flex h-[56px] w-full items-center justify-center rounded-[14px]",
              "bg-brand text-[15px] font-bold text-brand-ink",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            {t.reportForm.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <BackHeader title={t.reportForm.title} onBack={() => router.back()} />

      <div className="space-y-6 px-4">
        {lastReport && (
          <button
            type="button"
            onClick={applyRepeatLast}
            className={cn(
              "flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-4 text-left",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <History className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
            <span className="text-[14px] font-bold text-text">
              {t.reportForm.repeatYesterday}
            </span>
          </button>
        )}

        <Field label={t.manualTime.objectLabel}>
          <button
            type="button"
            onClick={() => setIsObjectPickerOpen(true)}
            className={cn(
              "flex min-h-[68px] w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-3 text-left",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            {selectedSite ? (
              <>
                <Thumb name={selectedSite.name} gradient={gradientForId(selectedSite.id)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {selectedSite.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-text-muted">
                    {selectedSite.address ?? t.common.dash}
                  </span>
                </span>
              </>
            ) : (
              <span className="min-w-0 flex-1 px-1 text-[15px] font-medium text-text-muted">
                {t.manualTime.objectPlaceholder}
              </span>
            )}

            <ChevronRight className="size-5 shrink-0 text-text-dim" strokeWidth={2.4} aria-hidden />
          </button>
        </Field>

        <Field label={t.manualTime.date}>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-[52px] w-full items-center gap-2 rounded-[14px] px-3",
                  "border border-border bg-surface text-[15px] font-bold text-text",
                  "transition-transform duration-150 active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <CalendarDays className="size-5 shrink-0 text-text-muted" strokeWidth={2} aria-hidden />
                <span className="tabular truncate">{formatDateShort(date)}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-auto border border-border bg-surface p-2">
              <Calendar
                mode="single"
                selected={date}
                defaultMonth={date}
                onSelect={(next) => {
                  if (next) {
                    setDate(next);
                    setIsCalendarOpen(false);
                  }
                }}
                locale={ukLocale}
              />
            </PopoverContent>
          </Popover>
        </Field>

        {categories.length > 0 && (
          <Field label={t.reportForm.categoriesLabel}>
            <WorkCategoryChips categories={categories} value={categoryIds} onChange={setCategoryIds} />
          </Field>
        )}

        <Field label={t.manualTime.description}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder={t.manualTime.descriptionPlaceholder}
            className={cn(
              "w-full resize-none rounded-[16px] border border-border bg-surface p-4",
              "text-[15px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
              "outline-none focus-visible:border-brand",
            )}
          />
        </Field>

        <p className="flex items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-[13px] leading-[1.4] font-medium text-text-muted">
          <Info className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
          {t.reportForm.hint}
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={cn(
            "flex h-[56px] w-full items-center justify-center rounded-[14px]",
            "bg-brand text-[15px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {t.reportForm.submit}
        </button>
      </div>

      <ObjectPickerDrawer
        open={isObjectPickerOpen}
        onOpenChange={setIsObjectPickerOpen}
        sites={sites}
        value={siteId}
        onSelect={setSiteId}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}
```

Заменить в `uk.ts`, секция `reportForm`, старый ключ `breakToggle`/`quickDuration` (больше не используются нигде — проверить `grep -rn "reportForm.breakToggle\|reportForm.quickDuration" src` перед удалением) на:

```ts
    hint: "Опишіть, що зробили сьогодні — фото можна додати одразу після збереження",
```

- [ ] **Step 3: Обновить `src/app/(app)/reports/new/page.tsx`**

```tsx
import { ReportForm } from "@/components/reports/ReportForm";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getActiveSites } from "@/modules/sites/queries";

export default async function NewReportPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [sites, reports, categories] = await Promise.all([
    getActiveSites(supabase),
    getReportsFeed(supabase, profile.id),
    getWorkCategories(supabase, profile.company_id),
  ]);

  return (
    <ReportForm
      companyId={profile.company_id}
      sites={sites}
      categories={categories}
      lastReport={reports[0] ?? null}
    />
  );
}
```

- [ ] **Step 4: Проверить типы и линт**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. Если lint ругается на неиспользуемые ключи `breakToggle`/`quickDuration` — линт на i18n-объект это не ловит, это просто мёртвые ключи; при желании удалить их из `uk.ts` вручную после `grep` (см. Step 2).

- [ ] **Step 5: Коммит**

```bash
git add src/components/reports/ReportForm.tsx src/app/\(app\)/reports/new/page.tsx src/lib/i18n/uk.ts
git commit -m "$(cat <<'EOF'
feat(reports): ReportForm без часу, з чипами видів робіт

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 7: `ReportCard`/`ReportDetail` — убрать час, добавить категорії

**Files:**
- Modify: `src/components/shared/ReportCard.tsx`
- Modify: `src/components/reports/ReportDetail.tsx`
- Create: `src/components/reports/DeleteReportButton.tsx`
- Modify: `src/app/(app)/reports/[id]/page.tsx`
- Modify: `src/lib/i18n/uk.ts` (секция `reportDetail`)

**Interfaces:**
- Consumes: `SiteReportWithPhotos`/`SiteReportDetail`, `reportState` (Task 3), `WorkCategoryChips`, `ReportPhotoUploader`, `deleteReport`/`updateReportDescription`/`updateReportCategories` (Task 3–5).
- Produces: `<ReportCard report siteName thumbUrl className? />` (без `now`), `<ReportDetail report siteName companyId authorName editable photoUrls categories />` (без `normMinutes`), `<DeleteReportButton reportId onDeleted iconOnly? className? />`.

- [ ] **Step 1: Добавить i18n-ключи**

В `src/lib/i18n/uk.ts`, секция `reportDetail`, добавить (после `saveRejected`):

```ts
    deleteEntry: "Видалити звіт",
    deleteConfirmTitle: "Видалити звіт?",
    deleteConfirmBody: "Дію не можна скасувати — звіт буде видалено назавжди.",
    deleteConfirmAction: "Видалити",
    entryDeleted: "Звіт видалено",
    deleteError: "Не вдалося видалити звіт. Спробуйте ще раз",
```

- [ ] **Step 2: Переписать `ReportCard.tsx`**

Убрать: `now: Date` проп, `elapsedSecondsNow`, `minutesToTime`, состояние «ongoing» (в `reportState` его больше нет), время в правом верхнем углу — заменить на категорії-теги (максимум 2 + «+N»).

```tsx
import Link from "next/link";
import { Camera } from "lucide-react";

import { MetaRow } from "@/components/shared/MetaRow";
import { Thumb } from "@/components/shared/Thumb";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { gradientForId } from "@/lib/siteGradient";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  report: SiteReportWithPhotos;
  /** Имя объекта или `null`, если запись без объекта. */
  siteName: string | null;
  /** Категорії компанії — для показу міток по `category_ids`. */
  categories: readonly WorkCategory[];
  /** Подписанная ссылка на первое фото — `null`, если фото ещё нет. */
  thumbUrl: string | null;
  className?: string;
}

const MAX_VISIBLE_CATEGORIES = 2;

/**
 * Карточка звіту: дата, об'єкт, до двох міток категорій, дальше — по стану:
 * «Без опису» — плашка й кнопка «Дописати», «Готовий» — текст опису й фото.
 */
export function ReportCard({ report, siteName, categories, thumbUrl, className }: ReportCardProps) {
  const state = reportState(report, report.report_photos.length);
  const dateLabel = formatDayMonth(fromDateKey(report.work_date));
  const name = siteName ?? t.hours.noObject;

  const labelById = new Map(categories.map((category) => [category.id, category.label] as const));
  const categoryLabels = report.category_ids.map((id) => labelById.get(id)).filter((label): label is string => Boolean(label));
  const visibleLabels = categoryLabels.slice(0, MAX_VISIBLE_CATEGORIES);
  const extraCount = categoryLabels.length - visibleLabels.length;

  return (
    <Link
      href={`/reports/${report.id}`}
      className={cn(
        "flex w-full items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-left",
        "transition-transform duration-150 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        state === "no_description" && "opacity-80",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-bold">{dateLabel}</p>
        </div>

        <p className="mt-0.5 truncate text-[13px] font-medium text-text-muted">{name}</p>

        {visibleLabels.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {visibleLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-muted"
              >
                {label}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-muted">
                {`+${extraCount}`}
              </span>
            )}
          </div>
        )}

        {state === "no_description" && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded-[8px] bg-warning/12 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-warning uppercase">
              {t.reports.noDescriptionBadge}
            </span>
            <span className="text-[13px] font-bold text-brand">
              {t.reports.addDescription}
            </span>
          </div>
        )}

        {state === "ready" && report.description !== "" && (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.4] font-medium text-text">
            {report.description}
          </p>
        )}

        {report.report_photos.length > 1 && (
          <MetaRow
            className="mt-2"
            items={[
              {
                icon: Camera,
                label: fmt(t.reports.photosCount, { n: report.report_photos.length }),
              },
            ]}
          />
        )}
      </div>

      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage, не next/image-домен
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          className="h-[84px] w-[104px] shrink-0 rounded-[12px] object-cover"
        />
      ) : (
        <Thumb name={name} gradient={gradientForId(report.site_id ?? report.id)} size="wide" />
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Создать `DeleteReportButton.tsx`**

Копия `DeleteEntryButton.tsx` (`src/components/entries/DeleteEntryButton.tsx`), с заменами `entryId` → `reportId`, `deleteEntry` → `deleteReport`, тексты `t.hours.*` → `t.reportDetail.*` (ключи из Step 1).

```tsx
"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { deleteReport } from "@/modules/reports/actions";
import { cn } from "@/lib/utils";

interface DeleteReportButtonProps {
  reportId: string;
  onDeleted: () => void;
  iconOnly?: boolean;
  className?: string;
}

/** Кнопка видалення звіту з підтвердженням — `/reports/[id]`. */
export function DeleteReportButton({ reportId, onDeleted, iconOnly, className }: DeleteReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteReport(reportId);

      if (result.error) {
        toast(result.error);
        return;
      }

      setOpen(false);
      toast(t.reportDetail.entryDeleted);
      onDeleted();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.reportDetail.deleteEntry}
        className={cn(
          iconOnly
            ? "flex size-9 shrink-0 items-center justify-center rounded-full text-danger active:bg-surface-2"
            : cn(
                "flex h-12 w-full items-center justify-center gap-2 rounded-[14px]",
                "border border-danger/40 text-[15px] font-bold text-danger",
                "transition-transform duration-150 active:scale-[0.98]",
              ),
          className,
        )}
      >
        <Trash2 className="size-[18px]" strokeWidth={2} aria-hidden />
        {!iconOnly && t.reportDetail.deleteEntry}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reportDetail.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{t.reportDetail.deleteConfirmBody}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-border text-[15px] font-bold text-text transition-transform duration-150 active:scale-[0.98]"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex h-12 items-center justify-center rounded-[14px] bg-danger text-[15px] font-bold text-white transition-transform duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {t.reportDetail.deleteConfirmAction}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Переписать `ReportDetail.tsx`**

Убрать: `normMinutes` проп, `splitWorkedOvertime`, `isOngoing`, `workedMinutes`/`overtimeMinutes`, блок с `TimeCell`×3 (Початок/Перерва/Кінець) и блок `TimeCell`×2 (Відпрацьовано/Додатково), ссылку-карандаш `editTime` на `/time/manual/[id]` (у звіту больше нет часовой записи, которую можно там редактировать), импорт `Pencil`-ссылки для времени (карандаш у описания остаётся), `WorkEntryWithPhotos`, `EntryPhoto` из `@/modules/media/photos`, `updateEntryDescription`, `PhotoUploader`, `DeleteEntryButton`.

Добавить: `SiteReportDetail`, `ReportPhoto`, `WorkCategory` из `@/modules/reports/types`, `updateReportDescription`, `updateReportCategories` из `@/modules/reports/actions`, `WorkCategoryChips`, `ReportPhotoUploader`, `DeleteReportButton`.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { DeleteReportButton } from "@/components/reports/DeleteReportButton";
import { ReportPhotoUploader } from "@/components/reports/ReportPhotoUploader";
import { WorkCategoryChips } from "@/components/reports/WorkCategoryChips";
import { fmt, formatDateFull, formatDateShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { updateReportCategories, updateReportDescription } from "@/modules/reports/actions";
import type { ReportPhoto, SiteReportDetail, WorkCategory } from "@/modules/reports/types";
import { cn } from "@/lib/utils";

interface ReportDetailProps {
  report: SiteReportDetail;
  siteName: string | null;
  companyId: string;
  authorName: string;
  categories: readonly WorkCategory[];
  editable: boolean;
  photoUrls: Readonly<Record<string, string>>;
}

/** Детальная страница `/reports/[id]` — REPORTS.md, раздел 5 (без блоку часу). */
export function ReportDetail({
  report,
  siteName,
  companyId,
  authorName,
  categories,
  editable,
  photoUrls,
}: ReportDetailProps) {
  const router = useRouter();
  const [isDescPending, startDescTransition] = useTransition();
  const [isCatPending, startCatTransition] = useTransition();

  const [description, setDescription] = useState(report.description);
  const [isEditingDescription, setIsEditingDescription] = useState(description === "");
  const [draft, setDraft] = useState(description);

  const [categoryIds, setCategoryIds] = useState<string[]>(report.category_ids);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<string[]>(categoryIds);

  const [photos, setPhotos] = useState<ReportPhoto[]>(report.report_photos);
  const [urls, setUrls] = useState<Record<string, string>>({ ...photoUrls });

  const handleSaveDescription = () => {
    startDescTransition(async () => {
      const result = await updateReportDescription(report.id, draft.trim());

      if (result.error) {
        toast(result.error);
        return;
      }

      setDescription(draft.trim());
      setIsEditingDescription(false);
      toast(t.reportDetail.saved);
    });
  };

  const handleSaveCategories = () => {
    startCatTransition(async () => {
      const result = await updateReportCategories(report.id, categoryDraft);

      if (result.error) {
        toast(result.error);
        return;
      }

      setCategoryIds(categoryDraft);
      setIsEditingCategories(false);
      toast(t.reportDetail.saved);
    });
  };

  const content = (
    <>
      <section className="rounded-[16px] border border-border bg-surface p-4">
        <p className="text-[20px] font-bold">{siteName ?? t.hours.noObject}</p>
        <p className="mt-1 text-[14px] font-medium text-text-muted">
          {formatDateFull(fromDateKey(report.work_date))}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <h2 className="text-[15px] font-bold">{t.reportDetail.categoriesLabel}</h2>

          {editable && !isEditingCategories && (
            <button
              type="button"
              onClick={() => {
                setCategoryDraft(categoryIds);
                setIsEditingCategories(true);
              }}
              aria-label={t.reportDetail.edit}
              className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
            >
              <Pencil className="size-4" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>

        {isEditingCategories ? (
          <div className="mt-3 space-y-3">
            <WorkCategoryChips categories={categories} value={categoryDraft} onChange={setCategoryDraft} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveCategories}
                disabled={isCatPending}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-brand text-[14px] font-bold text-brand-ink disabled:opacity-60"
              >
                {t.reportDetail.save}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCategories(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] border border-border text-[14px] font-bold text-text"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <WorkCategoryChips className="mt-3" categories={categories} value={categoryIds} readOnly />
        )}
      </section>

      <section className="rounded-[16px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold">
            {description === "" ? t.reportDetail.addDescriptionTitle : t.manualTime.description}
          </h2>

          {editable && !isEditingDescription && description !== "" && (
            <button
              type="button"
              onClick={() => {
                setDraft(description);
                setIsEditingDescription(true);
              }}
              aria-label={t.reportDetail.edit}
              className="flex size-9 items-center justify-center rounded-full text-text-muted active:bg-surface-2"
            >
              <Pencil className="size-4" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>

        {isEditingDescription ? (
          <div className="mt-3 space-y-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              placeholder={t.reportDetail.addDescriptionPlaceholder}
              autoFocus
              className={cn(
                "w-full resize-none rounded-[14px] border border-border bg-surface-2 p-4",
                "text-[15px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
                "outline-none focus-visible:border-brand",
              )}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={isDescPending}
                className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-brand text-[14px] font-bold text-brand-ink disabled:opacity-60"
              >
                {t.reportDetail.save}
              </button>
              {description !== "" && (
                <button
                  type="button"
                  onClick={() => setIsEditingDescription(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-[12px] border border-border text-[14px] font-bold text-text"
                >
                  {t.common.cancel}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[15px] leading-[1.45] font-medium whitespace-pre-wrap text-text">
            {description}
          </p>
        )}
      </section>

      {(photos.length > 0 || editable) && (
        <section className="rounded-[16px] border border-border bg-surface p-4">
          <h2 className="text-[17px] font-bold">{t.reportDetail.photosTitle}</h2>
          <ReportPhotoUploader
            className="mt-3"
            companyId={companyId}
            reportId={report.id}
            photos={photos}
            urls={urls}
            onPhotosChange={setPhotos}
            onUrlsChange={(patch) => setUrls((current) => ({ ...current, ...patch }))}
            editable={editable}
          />
        </section>
      )}

      <p className="px-1 text-[13px] font-medium text-text-dim">
        {fmt(t.reportDetail.createdBy, { name: authorName })} · {formatDateShort(new Date(report.created_at))}
      </p>

      {editable && (
        <DeleteReportButton
          reportId={report.id}
          onDeleted={() => {
            router.push("/reports");
            router.refresh();
          }}
        />
      )}
    </>
  );

  return (
    <div className="pb-6">
      <BackHeader title={t.reportDetail.backTitle} href="/reports" />

      <div className="space-y-4 px-4 lg:hidden">{content}</div>

      {/* Desktop: галерея фото зліва/ширше, деталі справа — паралельна гілка. */}
      <div className="hidden px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          {(photos.length > 0 || editable) && (
            <section className="rounded-[16px] border border-border bg-surface p-4">
              <h2 className="text-[17px] font-bold">{t.reportDetail.photosTitle}</h2>
              <ReportPhotoUploader
                className="mt-3"
                companyId={companyId}
                reportId={report.id}
                photos={photos}
                urls={urls}
                onPhotosChange={setPhotos}
                onUrlsChange={(patch) => setUrls((current) => ({ ...current, ...patch }))}
                editable={editable}
              />
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4">{content}</div>
      </div>
    </div>
  );
}
```

*Примечание:* фото-секция теперь рендерится дважды на десктопе (слева фото, справа — весь остальной `content`, который тоже содержит фото-блок в мобильной раскладке через `content`). Чтобы не дублировать фото-загрузчик на десктопе, вынести фото-секцию из `content` в отдельную переменную `photosSection` и не включать её в `content`, а рендерить `photosSection` отдельно в обеих раскладках (мобильная — после блока категорій/опису, десктопная — слева). Реализовать так:

```tsx
  const photosSection = (photos.length > 0 || editable) && (
    <section className="rounded-[16px] border border-border bg-surface p-4">
      <h2 className="text-[17px] font-bold">{t.reportDetail.photosTitle}</h2>
      <ReportPhotoUploader
        className="mt-3"
        companyId={companyId}
        reportId={report.id}
        photos={photos}
        urls={urls}
        onPhotosChange={setPhotos}
        onUrlsChange={(patch) => setUrls((current) => ({ ...current, ...patch }))}
        editable={editable}
      />
    </section>
  );

  const content = (
    <>
      {/* блок категорій */}
      {/* блок опису */}
      <div className="lg:hidden">{photosSection}</div>
      {/* createdBy + DeleteReportButton */}
    </>
  );

  return (
    <div className="pb-6">
      <BackHeader title={t.reportDetail.backTitle} href="/reports" />
      <div className="space-y-4 px-4 lg:hidden">{content}</div>
      <div className="hidden px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex flex-col gap-4">{photosSection}</div>
        <div className="flex flex-col gap-4">{content}</div>
      </div>
    </div>
  );
```

(Использовать этот вариант вместо буквального дублирования из основного блока кода выше — он и есть финальная версия файла.)

- [ ] **Step 5: Обновить `src/app/(app)/reports/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";

import { ReportDetail } from "@/components/reports/ReportDetail";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getReportWithPhotos, getWorkCategories } from "@/modules/reports/queries";
import { getSiteById } from "@/modules/sites/queries";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const report = await getReportWithPhotos(supabase, id);

  // RLS прячет чужие записи как отсутствующие, а не как «нет доступа».
  if (!report) {
    notFound();
  }

  const [site, photoUrls, categories] = await Promise.all([
    report.site_id ? getSiteById(supabase, report.site_id) : Promise.resolve(null),
    getSignedPhotoUrls(
      supabase,
      report.report_photos.map((photo) => photo.storage_path),
    ),
    getWorkCategories(supabase, profile.company_id),
  ]);

  return (
    <ReportDetail
      report={report}
      siteName={site?.name ?? null}
      companyId={profile.company_id}
      authorName={report.author_full_name}
      categories={categories}
      // `getReportWithPhotos` уже прогнала запись через `reports_select`:
      // якщо вона тут — це або своя, або ми шеф, а обидва варианты
      // `reports_update`/`reports_delete` дозволяють без обмежень.
      editable
      photoUrls={Object.fromEntries(photoUrls)}
    />
  );
}
```

- [ ] **Step 6: Проверить типы и линт**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. Оставшиеся ошибки типов в `ReportsFeed.tsx`/`ReportsScreen.tsx`/`objects/[id]/page.tsx` (они всё ещё передают старые пропсы `ReportCard`) — это ожидаемо, чинится в Task 8/9.

- [ ] **Step 7: Коммит**

```bash
git add src/components/shared/ReportCard.tsx src/components/reports/ReportDetail.tsx src/components/reports/DeleteReportButton.tsx src/app/\(app\)/reports/\[id\]/page.tsx src/lib/i18n/uk.ts
git commit -m "$(cat <<'EOF'
feat(reports): ReportCard/ReportDetail без часу, з категоріями і видаленням

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 8: `ReportsFeed`/`ReportsScreen`/`TeamTab` — сводка без часов

**Files:**
- Modify: `src/components/reports/ReportsFeed.tsx`
- Modify: `src/components/reports/ReportsScreen.tsx`
- Modify: `src/components/reports/TeamTab.tsx`
- Modify: `src/app/(app)/reports/page.tsx`
- Modify: `src/lib/i18n/uk.ts` (секция `reports`)

**Interfaces:**
- Consumes: `SiteReportWithPhotos`, `reportState`, `aggregateCategoryStats`, `getReportsFeed`, `getWorkCategories`, `WorkCategory` (Task 3, 7).
- Produces: `<ReportsFeed reports sites categories thumbUrls />`, `<ReportsScreen profile reports sites categories thumbUrls />`.

- [ ] **Step 1: Добавить i18n-ключи**

В `src/lib/i18n/uk.ts`, секция `reports`, заменить `periodSummary: "Показано у списку"` на пару:

```ts
    reportsSummaryCount: "{n} звітів",
    reportsSummaryDominant: "переважно: {label}",
```

(Проверить `grep -rn "reports.periodSummary" src` — единственное использование в `ReportsFeed.tsx`, заменяется в Step 2.)

- [ ] **Step 2: Переписать `ReportsFeed.tsx`**

Убрать: `now`/`setInterval` (тикали ради «Триває», которого больше нет), `sumTotalMinutes`, `formatHoursShort`, интерфейс `entries`/`WorkEntryWithPhotos` → `reports`/`SiteReportWithPhotos`, добавить `categories: readonly WorkCategory[]` проп и передавать его в `ReportCard`, заменить сводку на количество + доминирующую категорию через `aggregateCategoryStats`.

```tsx
"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { SearchField } from "@/components/shared/SearchField";
import { SegmentedTabs, type SegmentedOption } from "@/components/shared/SegmentedTabs";
import { fmt, formatDayMonth, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { aggregateCategoryStats } from "@/modules/reports/categoryStats";
import { reportState } from "@/modules/reports/reportState";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { dateKeyOf } from "@/modules/time/calc";

type ReportFilter = "all" | "no_description" | "with_photo";

const FILTER_OPTIONS: readonly SegmentedOption<ReportFilter>[] = [
  { value: "all", label: t.reports.tabs.all },
  { value: "no_description", label: t.reports.tabs.noDescription },
  { value: "with_photo", label: t.reports.tabs.withPhoto },
];

interface DateGroup {
  date: string;
  title: string;
  reports: SiteReportWithPhotos[];
}

function groupTitle(date: string, todayKey: string, yesterdayKey: string): string {
  if (date === todayKey) return t.reports.today;
  if (date === yesterdayKey) return t.reports.yesterday;
  return formatDayMonth(fromDateKey(date));
}

interface ReportsFeedProps {
  reports: readonly SiteReportWithPhotos[];
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  thumbUrls: Readonly<Record<string, string>>;
}

/**
 * Лента звітів: фільтр по вмісту, пошук, групування по датах, зведення
 * по видимій вибірці — кількість звітів і доминуюча категорія (замінили
 * колишню суму годин, якої у звіту більше немає).
 */
export function ReportsFeed({ reports, sites, categories, thumbUrls }: ReportsFeedProps) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [query, setQuery] = useState("");

  const siteNameById = useMemo(
    () => new Map(sites.map((site) => [site.id, site.name] as const)),
    [sites],
  );

  const now = new Date();
  const todayKey = dateKeyOf(now);
  const yesterdayKey = dateKeyOf(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("uk");

    return reports.filter((report) => {
      const state = reportState(report, report.report_photos.length);

      if (filter === "no_description" && state !== "no_description") return false;
      if (filter === "with_photo" && report.report_photos.length === 0) return false;

      if (!needle) return true;

      const siteName = report.site_id ? (siteNameById.get(report.site_id) ?? "") : "";
      const haystack = `${siteName} ${report.description}`.toLocaleLowerCase("uk");

      return haystack.includes(needle);
    });
  }, [reports, filter, query, siteNameById]);

  const groups = useMemo<DateGroup[]>(() => {
    const byDate = new Map<string, SiteReportWithPhotos[]>();

    for (const report of visible) {
      const bucket = byDate.get(report.work_date);
      if (bucket) bucket.push(report);
      else byDate.set(report.work_date, [report]);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        title: groupTitle(date, todayKey, yesterdayKey),
        reports: items,
      }));
  }, [visible, todayKey, yesterdayKey]);

  const dominantCategory = aggregateCategoryStats(visible, categories)[0] ?? null;

  const emptyTitle =
    filter === "no_description"
      ? t.reports.emptyNoDescriptionTitle
      : reports.length === 0
        ? t.reports.emptyTitle
        : t.reports.emptyFilterTitle;

  const emptyHint =
    filter === "no_description"
      ? undefined
      : reports.length === 0
        ? t.reports.emptyHint
        : t.reports.emptyFilterHint;

  return (
    <div className="px-4">
      <div className="lg:flex lg:items-center lg:gap-4">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t.reports.searchPlaceholder}
          className="lg:flex-1"
        />

        <SegmentedTabs
          className="mt-3 lg:mt-0 lg:shrink-0"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          label={t.reports.title}
        />
      </div>

      {visible.length > 0 && (
        <div className="mt-4 flex items-baseline justify-between rounded-[16px] border border-border bg-surface px-4 py-3">
          <p className="text-[13px] font-medium text-text-muted">
            {fmt(t.reports.reportsSummaryCount, { n: visible.length })}
          </p>
          {dominantCategory && (
            <p className="text-[13px] font-bold text-text-muted">
              {fmt(t.reports.reportsSummaryDominant, { label: dominantCategory.label })}
            </p>
          )}
        </div>
      )}

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.date} className="mt-6 first:mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate text-[20px] font-bold">
                {group.title}
              </h2>
              <span className="shrink-0 text-[13px] font-medium text-text-muted">
                {fmt(t.reports.reportsCount, { n: group.reports.length })}
              </span>
            </div>

            <div className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {group.reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  siteName={report.site_id ? (siteNameById.get(report.site_id) ?? null) : null}
                  categories={categories}
                  thumbUrl={
                    report.report_photos[0]
                      ? (thumbUrls[report.report_photos[0].storage_path] ?? null)
                      : null
                  }
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState className="mt-6" title={emptyTitle} description={emptyHint} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Обновить `ReportsScreen.tsx`**

Заменить проп `entries: readonly WorkEntryWithPhotos[]` → `reports: readonly SiteReportWithPhotos[]`, добавить `categories: readonly WorkCategory[]`, прокинуть их в `<ReportsFeed>` и `<TeamTab>` (см. Step 4).

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { TeamTab } from "@/components/reports/TeamTab";
import { SegmentedTabs, type SegmentedOption } from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import type { Profile } from "@/modules/auth/session";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { cn } from "@/lib/utils";

type ScreenTab = "mine" | "team";

const SCREEN_TAB_OPTIONS: readonly SegmentedOption<ScreenTab>[] = [
  { value: "mine", label: t.reports.screenTabs.mine },
  { value: "team", label: t.reports.screenTabs.team },
];

interface ReportsScreenProps {
  profile: Profile;
  reports: readonly SiteReportWithPhotos[];
  sites: readonly Site[];
  categories: readonly WorkCategory[];
  thumbUrls: Readonly<Record<string, string>>;
}

/** Экран «Звіти». У boss дві вкладки нагорі — «Мої» і «Команда». */
export function ReportsScreen({ profile, reports, sites, categories, thumbUrls }: ReportsScreenProps) {
  const [tab, setTab] = useState<ScreenTab>("mine");
  const isBoss = profile.role === "boss";

  return (
    <div className="pb-6">
      <ScreenHeader
        title={t.reports.title}
        action={
          <Link
            href="/reports/new"
            aria-label={t.reports.createReport}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink",
              "transition-transform duration-150 active:scale-95",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            <Plus className="size-6" strokeWidth={2.6} aria-hidden />
          </Link>
        }
      />

      {isBoss && (
        <div className="px-4">
          <SegmentedTabs
            className="mb-3"
            options={SCREEN_TAB_OPTIONS}
            value={tab}
            onChange={setTab}
            label={t.reports.title}
          />
        </div>
      )}

      {isBoss && tab === "team" ? (
        <TeamTab companyId={profile.company_id} sites={sites} categories={categories} />
      ) : (
        <ReportsFeed reports={reports} sites={sites} categories={categories} thumbUrls={thumbUrls} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Обновить `TeamTab.tsx`**

Заменить `getCompanyEntriesInRange`/`getEntriesFeed`/`WorkEntryWithNames`/`WorkEntryWithPhotos` на `getCompanyReportsInRange`? — **нет**: сводка часов по сотруднику (`monthMinutes`/`weekMinutes`) — это «Години», её источник остаётся `work_entries` (Global Constraints: «Години»/таймер не трогаем). Меняется только открытая лента одного сотрудника: `getEntriesFeed` → `getReportsFeed`, `<ReportsFeed entries={...}>` → `<ReportsFeed reports={...} categories={...}>`.

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { ChevronLeft, UserPlus } from "lucide-react";

import { AddWorkerForm } from "@/components/reports/AddWorkerForm";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { ReportsFeed } from "@/components/reports/ReportsFeed";
import { EmptyState } from "@/components/shared/EmptyState";
import { SegmentedTabs, type SegmentedOption } from "@/components/shared/SegmentedTabs";
import { PeriodNavigator } from "@/components/hours/PeriodNavigator";
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getReportsFeed } from "@/modules/reports/queries";
import type { SiteReportWithPhotos, WorkCategory } from "@/modules/reports/types";
import type { Site } from "@/modules/sites/queries";
import { getCompanyWorkers, type Worker } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";
import { cn } from "@/lib/utils";

const WORKER_FILTER_ALL = "all";

function sumMinutesByAuthor(entries: readonly WorkEntryWithNames[]): ReadonlyMap<string, number> {
  const map = new Map<string, number>();

  for (const entry of entries) {
    map.set(entry.author_id, (map.get(entry.author_id) ?? 0) + (entry.total_minutes ?? 0));
  }

  return map;
}

interface TeamTabProps {
  companyId: string;
  sites: readonly Site[];
  categories: readonly WorkCategory[];
}

/** Вкладка «Команда» — тільки boss. Годинна сводка й далі з work_entries, лента одного співробітника — вже з site_reports. */
export function TeamTab({ companyId, sites, categories }: TeamTabProps) {
  const supabase = useMemo(() => createClient(), []);

  const [workers, setWorkers] = useState<readonly Worker[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [monthMinutes, setMonthMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [weekMinutes, setWeekMinutes] = useState<ReadonlyMap<string, number>>(new Map());
  const [workerFilter, setWorkerFilter] = useState(WORKER_FILTER_ALL);

  const [openWorkerId, setOpenWorkerId] = useState<string | null>(null);
  const [openReports, setOpenReports] = useState<readonly SiteReportWithPhotos[]>([]);
  const [openThumbUrls, setOpenThumbUrls] = useState<Readonly<Record<string, string>>>({});
  const [isOpenLoading, setIsOpenLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const refreshWorkers = useCallback(() => {
    getCompanyWorkers(supabase, companyId)
      .then((data) => setWorkers(data))
      .catch(() => {});
  }, [supabase, companyId]);

  useEffect(() => {
    refreshWorkers();
  }, [refreshWorkers]);

  useEffect(() => {
    let cancelled = false;
    const monthFrom = dateKeyOf(startOfMonth(month));
    const monthTo = dateKeyOf(endOfMonth(month));
    const weekFrom = dateKeyOf(startOfWeek(new Date(), { locale: ukLocale }));
    const weekTo = dateKeyOf(endOfWeek(new Date(), { locale: ukLocale }));

    Promise.all([
      getCompanyEntriesInRange(supabase, companyId, monthFrom, monthTo),
      getCompanyEntriesInRange(supabase, companyId, weekFrom, weekTo),
    ])
      .then(([monthEntries, weekEntries]) => {
        if (cancelled) return;
        setMonthMinutes(sumMinutesByAuthor(monthEntries));
        setWeekMinutes(sumMinutesByAuthor(weekEntries));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, month]);

  const workerOptions: readonly SegmentedOption<string>[] = useMemo(
    () => [
      { value: WORKER_FILTER_ALL, label: t.reports.team.allWorkers },
      ...workers.map((worker) => ({ value: worker.id, label: worker.full_name })),
    ],
    [workers],
  );

  const rows = useMemo(
    () =>
      (workerFilter === WORKER_FILTER_ALL
        ? workers
        : workers.filter((worker) => worker.id === workerFilter)
      ).map((worker) => ({
        worker,
        monthMinutes: monthMinutes.get(worker.id) ?? 0,
        weekMinutes: weekMinutes.get(worker.id) ?? 0,
      })),
    [workers, workerFilter, monthMinutes, weekMinutes],
  );

  const openWorker = (workerId: string) => {
    setOpenWorkerId(workerId);
    setIsOpenLoading(true);

    getReportsFeed(supabase, workerId)
      .then(async (reports) => {
        const paths = reports
          .map((report) => report.report_photos[0]?.storage_path)
          .filter((path): path is string => Boolean(path));
        const urls = await getSignedPhotoUrls(supabase, paths);

        setOpenReports(reports);
        setOpenThumbUrls(Object.fromEntries(urls));
      })
      .finally(() => setIsOpenLoading(false));
  };

  const monthFrom = dateKeyOf(startOfMonth(month));
  const monthTo = dateKeyOf(endOfMonth(month));

  if (openWorkerId) {
    const worker = workers.find((item) => item.id === openWorkerId);

    return (
      <div>
        <div className="flex items-start justify-between gap-3 px-4 pb-1">
          <div>
            <button
              type="button"
              onClick={() => setOpenWorkerId(null)}
              className="flex items-center gap-1 py-3 text-[15px] font-bold text-text-muted active:text-text"
            >
              <ChevronLeft className="size-5" strokeWidth={2.4} aria-hidden />
              {t.reports.team.back}
            </button>

            <p className="text-[22px] font-extrabold tracking-tight">
              {worker?.full_name}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <ExportMenu from={monthFrom} to={monthTo} workerId={openWorkerId} />
            <ExportMenu kind="reports" from={monthFrom} to={monthTo} workerId={openWorkerId} />
          </div>
        </div>

        {isOpenLoading ? null : (
          <ReportsFeed reports={openReports} sites={sites} categories={categories} thumbUrls={openThumbUrls} />
        )}
      </div>
    );
  }

  const monthTitle = `${t.months.nominative[month.getMonth()]} ${month.getFullYear()}`;

  return (
    <div className="px-4">
      <div className="flex items-center gap-2">
        <PeriodNavigator
          className="flex-1"
          title={monthTitle}
          onPrev={() => setMonth((current) => addMonthsSafe(current, -1))}
          onNext={() => setMonth((current) => addMonthsSafe(current, 1))}
        />

        <button
          type="button"
          onClick={() => setIsAddOpen((open) => !open)}
          aria-label={t.reports.team.addWorker}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink",
            "transition-transform duration-150 active:scale-95",
          )}
        >
          <UserPlus className="size-5" strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {isAddOpen && (
        <AddWorkerForm className="mt-3" onClose={() => setIsAddOpen(false)} onCreated={refreshWorkers} />
      )}

      <SegmentedTabs
        className="mt-3"
        options={workerOptions}
        value={workerFilter}
        onChange={setWorkerFilter}
        label={t.reports.team.allWorkers}
      />

      {rows.length === 0 ? (
        <EmptyState className="mt-6" title={t.reports.team.empty} />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(({ worker, monthMinutes: workerMonthMinutes, weekMinutes: workerWeekMinutes }) => (
            <li key={worker.id}>
              <button
                type="button"
                onClick={() => openWorker(worker.id)}
                className={cn(
                  "w-full rounded-[16px] border border-border bg-surface p-4 text-left",
                  "transition-transform duration-150 active:scale-[0.99]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[16px] font-bold">
                    {worker.full_name}
                  </p>
                  <p className="tabular shrink-0 text-[16px] font-bold">
                    {formatHoursShort(workerMonthMinutes)}
                  </p>
                </div>

                <p className="mt-1 text-[13px] font-medium text-text-muted">
                  {fmt(t.reports.team.thisWeek, { hours: formatHoursShort(workerWeekMinutes) })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <ExportMenu className="h-12 flex-1 justify-center" from={monthFrom} to={monthTo} />
        <ExportMenu kind="reports" className="h-12 flex-1 justify-center" from={monthFrom} to={monthTo} />
      </div>
    </div>
  );
}

function addMonthsSafe(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
```

(`ExportMenu` с пропом `kind="reports"` реализуется в Task 10 — до его выполнения этот файл не типизируется, это ожидаемо; выполнять Task 8 и Task 10 в этом порядке, коммитить только после Task 10 если хочется зелёного `tsc` на каждом шаге, либо оставить `kind` опциональным уже в этом коммите и обработать в Task 10 — см. примечание там.)

- [ ] **Step 5: Обновить `src/app/(app)/reports/page.tsx`**

```tsx
import { ReportsScreen } from "@/components/reports/ReportsScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { getReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getAllSites } from "@/modules/sites/queries";

export default async function ReportsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [reports, sites, categories] = await Promise.all([
    getReportsFeed(supabase, profile.id),
    getAllSites(supabase),
    getWorkCategories(supabase, profile.company_id),
  ]);

  const firstPhotoPaths = reports
    .map((report) => report.report_photos[0]?.storage_path)
    .filter((path): path is string => Boolean(path));

  const thumbUrls = await getSignedPhotoUrls(supabase, firstPhotoPaths);

  return (
    <ReportsScreen
      profile={profile}
      reports={reports}
      sites={sites}
      categories={categories}
      thumbUrls={Object.fromEntries(thumbUrls)}
    />
  );
}
```

- [ ] **Step 6: Коммит**

```bash
git add src/components/reports/ReportsFeed.tsx src/components/reports/ReportsScreen.tsx src/components/reports/TeamTab.tsx src/app/\(app\)/reports/page.tsx src/lib/i18n/uk.ts
git commit -m "$(cat <<'EOF'
feat(reports): ReportsFeed/ReportsScreen/TeamTab на site_reports

Зведення над списком — кількість звітів і домінуюча категорія замість
суми годин. Годинна сводка по співробітнику в «Команді» лишається на
work_entries.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

*(Проверка типов для всего экрана целиком — в Task 10 Step 4, после того как `ExportMenu` получит `kind`.)*

---

## Task 9: Страница об'єкта — звіти + статистика по категоріям

**Files:**
- Modify: `src/app/(app)/objects/[id]/page.tsx`
- Modify: `src/lib/i18n/uk.ts` (секция `objects.detail`)

**Interfaces:**
- Consumes: `getReportsFeed`, `getWorkCategories`, `aggregateCategoryStats`, `ReportCard` (Task 3, 7, 8).

- [ ] **Step 1: Добавить i18n-ключ**

В `src/lib/i18n/uk.ts`, секция `objects.detail`, изменить `myReports: "Мої звіти тут"` на `myReports: "Мої звіти"` (заголовок теперь без «тут», т.к. рядом появляется статистика) и добавить:

```ts
      categoryStatsEmpty: "Категорії з'являться, щойно ви вкажете вид робіт у звіті",
```

- [ ] **Step 2: Обновить `objects/[id]/page.tsx`**

Заменить `getEntriesFeed`/`sumTotalMinutes`/`entry.entry_photos` на `getReportsFeed`/`getWorkCategories`/`aggregateCategoryStats`/`report.report_photos`, добавить блок чипов-статистики над списком звітів (в обеих раскладках — мобильной и десктопной, рядом с заголовком `t.objects.detail.myReports`).

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Pencil } from "lucide-react";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { ObjectArchiveButton } from "@/components/objects/ObjectArchiveButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReportCard } from "@/components/shared/ReportCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getGoogleMapsDirectionsUrl } from "@/lib/utils";
import { requireProfile } from "@/modules/auth/session";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";
import { aggregateCategoryStats } from "@/modules/reports/categoryStats";
import { getReportsFeed, getWorkCategories } from "@/modules/reports/queries";
import { getSiteById } from "@/modules/sites/queries";

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const [site, allReports, categories] = await Promise.all([
    getSiteById(supabase, id),
    getReportsFeed(supabase, profile.id),
    getWorkCategories(supabase, profile.company_id),
  ]);

  if (!site) {
    notFound();
  }

  const reports = allReports.filter((report) => report.site_id === id);
  const categoryStats = aggregateCategoryStats(reports, categories);

  const firstPhotoPaths = reports
    .map((report) => report.report_photos[0]?.storage_path)
    .filter((path): path is string => Boolean(path));
  const [thumbUrls, coverPhotoUrls] = await Promise.all([
    getSignedPhotoUrls(supabase, firstPhotoPaths),
    site.photo_path
      ? getSignedPhotoUrls(supabase, [site.photo_path], "site-photos")
      : Promise.resolve(new Map<string, string>()),
  ]);
  const coverPhotoUrl = site.photo_path ? coverPhotoUrls.get(site.photo_path) : null;

  const isBoss = profile.role === "boss";

  const reportsSection = (
    <>
      <div className="mt-6 flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-bold">{t.objects.detail.myReports}</h2>
        <span className="shrink-0 text-[13px] font-medium text-text-muted">
          {fmtReportsCount(reports.length)}
        </span>
      </div>

      {categoryStats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryStats.map((stat) => (
            <span
              key={stat.id}
              className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-text-muted"
            >
              {`${stat.label} · ${stat.count}`}
            </span>
          ))}
        </div>
      )}

      {reports.length > 0 ? (
        <div className="mt-3 space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              siteName={site.name}
              categories={categories}
              thumbUrl={
                report.report_photos[0]
                  ? (thumbUrls.get(report.report_photos[0].storage_path) ?? null)
                  : null
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          title={t.objects.detail.emptyTitle}
          description={t.objects.detail.emptyHint}
        />
      )}
    </>
  );

  return (
    <div className="pb-6">
      <BackHeader
        title={site.name}
        href="/objects"
        action={
          isBoss && (
            <Link
              href={`/objects/${site.id}/edit`}
              aria-label={t.objects.detail.edit}
              className="flex size-11 items-center justify-center rounded-full text-text transition-colors duration-150 active:bg-surface-2"
            >
              <Pencil className="size-5" strokeWidth={2} aria-hidden />
            </Link>
          )
        }
      />

      <div className="px-4 lg:hidden">
        <section className="rounded-[16px] border border-border bg-surface p-4">
          {coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
            <img src={coverPhotoUrl} alt="" className="mb-4 h-[160px] w-full rounded-[12px] object-cover" />
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[20px] font-bold">{site.name}</p>
              {site.address ? (
                <a
                  href={getGoogleMapsDirectionsUrl(site.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-text-muted underline-offset-2 hover:underline"
                >
                  <MapPin className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
                  {site.address}
                </a>
              ) : (
                <p className="mt-1 text-[14px] font-medium text-text-muted">{t.common.dash}</p>
              )}
            </div>
            {site.archived_at ? (
              <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
                {t.objects.archivedBadge}
              </span>
            ) : (
              <StatusBadge status={site.status} />
            )}
          </div>

          <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            {site.kind && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[14px] font-medium text-text-muted">{t.objects.detail.kind}</dt>
                <dd className="text-[14px] font-bold">{site.kind}</dd>
              </div>
            )}
          </dl>
        </section>

        {isBoss && (
          <ObjectArchiveButton className="mt-3" siteId={site.id} isArchived={site.archived_at !== null} />
        )}

        {reportsSection}
      </div>

      {/* Desktop: фото/карта зліва, деталі + звіти справа. */}
      <div className="hidden px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <section className="rounded-[16px] border border-border bg-surface p-4">
            {coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Storage
              <img src={coverPhotoUrl} alt="" className="h-[280px] w-full rounded-[12px] object-cover" />
            ) : (
              <div className="flex h-[280px] w-full items-center justify-center rounded-[12px] bg-surface-2 text-[14px] font-medium text-text-dim">
                {t.common.dash}
              </div>
            )}
          </section>

          {site.address && (
            <a
              href={getGoogleMapsDirectionsUrl(site.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-muted underline-offset-2 hover:underline"
            >
              <MapPin className="size-[14px] shrink-0" strokeWidth={2} aria-hidden />
              {site.address}
            </a>
          )}
        </div>

        <div className="flex flex-col">
          <section className="rounded-[16px] border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[20px] font-bold">{site.name}</p>
                {!site.address && (
                  <p className="mt-1 text-[14px] font-medium text-text-muted">{t.common.dash}</p>
                )}
              </div>
              {site.archived_at ? (
                <span className="inline-flex shrink-0 items-center rounded-[8px] bg-surface-2 px-2 py-1 text-[11px] font-bold tracking-[0.06em] text-text-dim uppercase whitespace-nowrap">
                  {t.objects.archivedBadge}
                </span>
              ) : (
                <StatusBadge status={site.status} />
              )}
            </div>

            <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              {site.kind && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[14px] font-medium text-text-muted">{t.objects.detail.kind}</dt>
                  <dd className="text-[14px] font-bold">{site.kind}</dd>
                </div>
              )}
            </dl>
          </section>

          {isBoss && (
            <ObjectArchiveButton className="mt-3" siteId={site.id} isArchived={site.archived_at !== null} />
          )}

          {reportsSection}
        </div>
      </div>
    </div>
  );
}

function fmtReportsCount(n: number): string {
  return t.objects.reportsCount.replace("{n}", String(n));
}
```

*Примечание:* убрал блок «Відпрацьовано всього» (`t.objects.detail.totalWorked`, считался из `sumTotalMinutes(entries)`) — часы объекта не входят в скоуп этой задачи (спека их не упоминает, а источник данных для них — `work_entries`, не `site_reports`; чтобы не тащить сюда ещё один запрос к другой таблице ради одной строки, которая не в фокусе задачи, убираю как не относящееся к звітам). Если шеф захочет вернуть эту цифру — отдельная маленькая задача поверх этого плана, не блокирует остальное.

Использовать `fmt` из `@/lib/format` вместо самодельного `fmtReportsCount`, для консистентности с остальным кодом:

```tsx
import { fmt } from "@/lib/format";
// ...
<span className="shrink-0 text-[13px] font-medium text-text-muted">
  {fmt(t.objects.reportsCount, { n: reports.length })}
</span>
```

(убрать функцию `fmtReportsCount` — используем `fmt` напрямую, это и есть финальная версия.)

- [ ] **Step 3: Проверить типы и линт**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Коммит**

```bash
git add src/app/\(app\)/objects/\[id\]/page.tsx src/lib/i18n/uk.ts
git commit -m "$(cat <<'EOF'
feat(objects): звіти об'єкта зі статистикою по категоріях робіт

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 10: CSV-експорт «Звіти»

**Files:**
- Modify: `src/modules/export/types.ts`
- Create: `src/modules/export/reportsCsv.ts`
- Create: `src/modules/export/reportsCsv.test.ts`
- Modify: `src/components/reports/ExportMenu.tsx`
- Modify: `src/app/api/export/route.ts`
- Modify: `src/lib/i18n/uk.ts` (секция `admin.export`)

**Interfaces:**
- Consumes: `getCompanyReportsInRange`, `SiteReportWithNames` (Task 3).
- Produces: `<ExportMenu kind="hours" | "reports" from to workerId? className? />` (по умолчанию `kind="hours"` — обратная совместимость с Task 8 вызовами без явного `kind`), `buildReportsCsv(rows: readonly ReportExportRow[]): string`.

- [ ] **Step 1: Добавить `ReportExportRow` в `types.ts`**

Добавить в конец `src/modules/export/types.ts`:

```ts
/** Один рядок «звіту» для CSV-експорту — на відміну від `ExportRow`, без часу. */
export interface ReportExportRow {
  date: string;
  worker: string;
  site: string;
  /** Мітки категорій через «; ». */
  categories: string;
  description: string;
  photoCount: number;
}
```

- [ ] **Step 2: Добавить i18n-ключ**

В `src/lib/i18n/uk.ts`, секция `admin.export`, добавить:

```ts
      labelReports: "Експорт звітів",
```

- [ ] **Step 3: `reportsCsv.ts`**

```ts
import type { ReportExportRow } from "./types";

function csvField(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

const HEADER = ["Дата", "Робітник", "Об'єкт", "Категорії", "Опис", "Фото"];

/** CSV «Звіти» за діапазон дат — UTF-8 з BOM, як і у CSV «Години». */
export function buildReportsCsv(rows: readonly ReportExportRow[]): string {
  const lines = [HEADER.map(csvField).join(",")];

  for (const row of rows) {
    const cells = [row.date, row.worker, row.site, row.categories, row.description, String(row.photoCount)];
    lines.push(cells.map(csvField).join(","));
  }

  return "﻿" + lines.join("\r\n");
}
```

- [ ] **Step 4: `reportsCsv.test.ts`**

```ts
import { describe, expect, it } from "vitest";

import { buildReportsCsv } from "./reportsCsv";

describe("buildReportsCsv", () => {
  it("будує CSV з BOM і шапкою", () => {
    const csv = buildReportsCsv([
      { date: "01.09", worker: "Едуард", site: "Об'єкт А", categories: "Покрівля; Демонтаж", description: "Опис", photoCount: 2 },
    ]);

    expect(csv.startsWith("﻿Дата,")).toBe(true);
    expect(csv).toContain("01.09,Едуард,Об'єкт А,\"Покрівля; Демонтаж\",Опис,2");
  });

  it("екранує поля з комою чи лапками", () => {
    const csv = buildReportsCsv([
      { date: "01.09", worker: "Едуард", site: "-", categories: "-", description: 'Опис з "лапками", комою', photoCount: 0 },
    ]);

    expect(csv).toContain('"Опис з ""лапками"", комою"');
  });
});
```

- [ ] **Step 5: Прогнать тест**

Run: `npm test -- reportsCsv`
Expected: PASS, 2 теста.

- [ ] **Step 6: Обновить `ExportMenu.tsx`**

Добавить `kind?: "hours" | "reports"` (default `"hours"`), пробросить в query-параметр, при `kind === "reports"` показывать только формат CSV (спека упоминает только CSV для звітів) и другой текст кнопки.

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ExportMenuProps {
  /** `YYYY-MM-DD` — диапазон уже посчитан вызывающим экраном (месяц/период). */
  from: string;
  to: string;
  /** «Години» (за замовчуванням) чи «Звіти» — інший набір колонок і форматів. */
  kind?: "hours" | "reports";
  /** Экспорт по одному робітнику — для детальної сторінки в «Команді». */
  workerId?: string;
  className?: string;
}

const HOURS_FORMATS = [
  { format: "csv", label: t.admin.export.csv, icon: Download },
  { format: "xlsx", label: t.admin.export.xlsx, icon: FileSpreadsheet },
  { format: "pdf", label: t.admin.export.pdf, icon: FileText },
] as const;

/** Звіти поки експортуються тільки в CSV — xlsx/pdf під звіти не робили. */
const REPORTS_FORMATS = [{ format: "csv", label: t.admin.export.csv, icon: Download }] as const;

/**
 * Кнопка «Експорт» з випадаючим списком форматів. `kind="hours"` (за замовч.) —
 * той самий CSV/Excel/PDF-табель, що й раніше; `kind="reports"` — новий CSV
 * звітів (дата/робітник/об'єкт/категорії/опис/фото, без часу).
 */
export function ExportMenu({ from, to, kind = "hours", workerId, className }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const formats = kind === "reports" ? REPORTS_FORMATS : HOURS_FORMATS;
  const label = kind === "reports" ? t.admin.export.labelReports : t.admin.export.label;

  const hrefFor = (format: string) => {
    const params = new URLSearchParams({ from, to, format, kind });
    if (workerId) params.set("workerId", workerId);
    return `/api/export?${params.toString()}`;
  };

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
            href={hrefFor(format)}
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

- [ ] **Step 7: Обновить `api/export/route.ts`**

Добавить чтение `kind`, ветку для `reports` (только CSV, 400 на другой формат), вызов `getCompanyReportsInRange` + `buildReportsCsv`.

```ts
import { NextResponse } from "next/server";

import { formatDateShort, formatTimeShort, formatWorkDateShort, fromDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getCompanyEntryHoursInRange } from "@/modules/entries/queries";
import { buildCsv } from "@/modules/export/csv";
import { buildPdf } from "@/modules/export/pdf";
import { buildReportsCsv } from "@/modules/export/reportsCsv";
import type { ExportRow, ReportExportRow } from "@/modules/export/types";
import { buildXlsx } from "@/modules/export/xlsx";
import { getCompanyReportsInRange } from "@/modules/reports/queries";
import { getAllSites } from "@/modules/sites/queries";

export const runtime = "nodejs";

const CONTENT_TYPES = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

type ExportFormat = keyof typeof CONTENT_TYPES;

function isExportFormat(value: string): value is ExportFormat {
  return value in CONTENT_TYPES;
}

export async function GET(request: Request) {
  const profile = await requireProfile();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const workerId = searchParams.get("workerId");
  const formatParam = searchParams.get("format") ?? "csv";
  const kind = searchParams.get("kind") === "reports" ? "reports" : "hours";

  if (!from || !to) {
    return NextResponse.json(
      { error: "Параметри from і to обов'язкові (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  if (!isExportFormat(formatParam)) {
    return NextResponse.json({ error: "Невідомий формат експорту" }, { status: 400 });
  }

  if (kind === "reports" && formatParam !== "csv") {
    return NextResponse.json({ error: "Для звітів підтримується тільки CSV" }, { status: 400 });
  }

  const supabase = await createClient();

  if (kind === "reports") {
    const [reports, sites] = await Promise.all([
      getCompanyReportsInRange(supabase, profile.company_id, from, to),
      getAllSites(supabase),
    ]);

    const siteNameById = new Map(sites.map((site) => [site.id, site.name] as const));

    const rows: ReportExportRow[] = reports
      .filter((report) => !workerId || report.author_id === workerId)
      .map((report) => ({
        date: formatWorkDateShort(report.work_date),
        worker: report.author_full_name,
        site: report.site_id ? (siteNameById.get(report.site_id) ?? "") : t.hours.noObject,
        categories: report.category_labels.join("; "),
        description: report.description,
        photoCount: report.photo_count,
      }));

    const fileName = `reports_${from}_${to}.csv`;

    return new NextResponse(buildReportsCsv(rows), {
      headers: {
        "Content-Type": CONTENT_TYPES.csv,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  const [entryHours, sites, company] = await Promise.all([
    getCompanyEntryHoursInRange(supabase, profile.company_id, from, to),
    getAllSites(supabase),
    supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
  ]);

  const siteNameById = new Map(sites.map((site) => [site.id, site.name] as const));

  const rows: ExportRow[] = entryHours
    .filter((row) => row.work_date && row.started_at)
    .filter((row) => !workerId || row.author_id === workerId)
    .map((row) => ({
      date: formatWorkDateShort(row.work_date!),
      worker: row.full_name ?? "",
      site: row.site_id ? (siteNameById.get(row.site_id) ?? "") : t.hours.noObject,
      start: formatTimeShort(row.started_at!),
      end: row.ended_at ? formatTimeShort(row.ended_at) : t.hours.entryOngoing,
      breakMinutes: row.break_minutes ?? 0,
      totalMinutes: row.total_minutes,
      workedMinutes: row.worked_minutes ?? 0,
      overtimeMinutes: row.overtime_minutes ?? 0,
      description: row.description ?? "",
      photoCount: row.photo_count ?? 0,
    }));

  const meta = {
    companyName: company.data?.name ?? "",
    periodTitle: `${formatDateShort(fromDateKey(from))} – ${formatDateShort(fromDateKey(to))}`,
  };

  const fileName = `hours_${from}_${to}.${formatParam}`;
  const body = await buildExportBody(formatParam, rows, meta);

  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[formatParam],
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

async function buildExportBody(
  format: ExportFormat,
  rows: readonly ExportRow[],
  meta: { companyName: string; periodTitle: string },
): Promise<BodyInit> {
  if (format === "xlsx") return new Uint8Array(await buildXlsx(rows, meta));
  if (format === "pdf") return new Uint8Array(await buildPdf(rows, meta));
  return buildCsv(rows);
}
```

- [ ] **Step 8: Проверить типы, линт, тесты — весь проект**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS. Это первая точка, где весь `src/` (включая `TeamTab.tsx` из Task 8, который уже использовал `kind="reports"`) типизируется целиком.

- [ ] **Step 9: Коммит**

```bash
git add src/modules/export/types.ts src/modules/export/reportsCsv.ts src/modules/export/reportsCsv.test.ts src/components/reports/ExportMenu.tsx src/app/api/export/route.ts src/lib/i18n/uk.ts
git commit -m "$(cat <<'EOF'
feat(export): CSV-експорт «Звіти» — дата/робітник/об'єкт/категорії/опис/фото

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

---

## Task 11: Финальная проверка

**Files:** нет изменений — только команды.

- [ ] **Step 1: Полный прогон**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: всё PASS. `build` дополнительно ловит серверные/клиентские несоответствия (`"use client"`/`"use server"`), которые `tsc` может пропустить.

- [ ] **Step 2: Ручная проверка ключевых сценариев (dev-сервер)**

Run: `npm run dev`, вручную:
1. `/reports/new` — форма без единого поля времени, есть чипы категорій, «Зберегти звіт» создаёт запись без ошибок.
2. `/reports` — лента показывает новую запись, сводка «N звітів» + доминирующая категория, фильтры «Усі/Без опису/З фото» работают.
3. `/reports/[id]` — категорії редактируются, опис редактируется, фото грузятся, видалення звіту работает и возвращает на `/reports`.
4. `/objects/[id]` — секция звітів с чипами-статистикой по категоріям.
5. «Команда» (под boss-аккаунтом) → открыть сотрудника → обе кнопки «Експорт» и «Експорт звітів» скачивают корректные CSV с BOM (кириллица не «кракозябры»).
6. `/hours` и таймер — не изменились, работают как раньше (регрессия).

Expected: все пункты проходят без ошибок в консоли браузера и без 500 на сервере.

- [ ] **Step 3: Финальный коммит (если ручная проверка что-то поправила)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(reports): правки за результатами ручної перевірки

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Bcpe5Uk8vz9PaBzxPUe9ve
EOF
)"
```

(Пропустить, если правок не потребовалось.)

---

## Self-Review

**Spec coverage:**
- Модель данных (`site_reports`/`report_photos`/`work_categories`/`report_categories`, RLS, бэкфілл) — Task 1–2. ✅
- `/reports/new` без часу, з чипами — Task 6. ✅
- `/reports/[id]` без полоси часу, з чипами — Task 7. ✅
- Сводка ленты без годин, стан «Триває» прибрано — Task 8. ✅
- Вкладка/секція звітів на об'єкті зі статистикою — Task 9. ✅
- CSV-експорт звітів — Task 10. ✅
- «Години»/таймер/ADR-0002 не зачеплені — жодна задача не чіпає `work_entries`/`modules/entries`/`modules/time`, крім `TeamTab.tsx`, де годинна сводка навмисно лишена на `getCompanyEntriesInRange`. ✅

**Отклонения от исходной спеки (зафиксированы явно):**
1. Отдельного бакета `report-photos` нет — используется `entry-photos` (Global Constraints, Task 1). Причина: бэкфілл без копирования байт.
2. «Вікно правки 7 днів» из спеки не реализовано — вместо него текущий (после миграции 0007) паттерн «без обмеження по даті» (Global Constraints, Task 1).
3. Отдельной вкладки «Звіти» на об'єкті нет — существующая секция «Мої звіти» на `/objects/[id]` расширена статистикой по категоріям вместо новой вкладки (Task 9) — на странице объекта и так нет табов, добавлять первый таб ради одной секции было бы лишней структурой.

**Placeholder scan:** без «TBD»/«later»/незаповненого кода — весь код в шагах написан полностью, включая i18n-ключи и SQL.

**Type consistency:** `SiteReportWithPhotos`/`SiteReportDetail`/`ReportInput`/`ReportExportRow` объявлены в Task 3/10 и используются с одинаковыми именами полей во всех последующих задачах (`category_ids`, `report_photos`, `workDate`/`siteId`/`description`/`categoryIds`). `WorkCategoryChips`, `ReportPhotoUploader`, `DeleteReportButton` — сигнатуры пропсов заданы один раз (Task 4/5/7) и используются идентично в Task 6/7/9.
