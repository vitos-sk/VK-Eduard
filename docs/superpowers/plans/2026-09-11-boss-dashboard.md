# Дашборд шефа (`/dashboard`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Окрема сторінка `/dashboard` для `boss` з періодами Місяць/Квартал/Рік, 4 stat-картками, блоком «Сьогодні», графіком динаміки годин, топ-об'єктами і годинами по співробітниках.

**Architecture:** Server page `src/app/(app)/dashboard/page.tsx` вантажить перший кадр (записи компанії за поточний місяць + записи за сьогодні + кількість активних співробітників) і передає в клієнтський оркестратор `DashboardScreen`, який при зміні періоду сам ходить у Supabase з браузера — точно та сама схема, що вже працює в `HoursScreen`/`getCompanyEntriesInRange`. Уся арифметика (діапазон періоду, кошики графіка, рейтинги, «сьогодні») винесена в чисті функції нового модуля `src/modules/dashboard/`, покриті vitest-тестами за зразком `modules/time/calc.test.ts` — це єдиний вид тестів у проєкті, UI-компоненти тестами не покриваються.

**Tech Stack:** Next.js (app router, server components), React 19, Supabase (RLS сама обмежує видимість компанією/роллю), `date-fns` (вже в залежностях), нова залежність `recharts` для графіка, Vitest для чистої логіки.

**Spec:** `docs/superpowers/specs/2026-09-11-boss-dashboard-design.md`

## Global Constraints

- Увесь текст інтерфейсу — тільки через `t` з `src/lib/i18n/uk.ts` (`uk` — єдина локаль), ніякого тексту прямо в JSX.
- Сторінка доступна тільки `profile.role === "boss"` — інші отримують `redirect("/")`.
- Без порівняння з попереднім періодом (без «+12%») і без стрічки активності — поза скоупом v1 (див. спеку).
- Період: тільки `month` / `quarter` / `year` — без тижня.
- Стиль — існуючі токени проєкту (`bg-surface`, `bg-surface-2`, `border-border`, `bg-brand`/`text-brand-ink`, `rounded-[16px]`), не темна палітра скріну-референсу.
- Мобільний таб-бар (`NAV_ITEMS`, 2+FAB+2) не змінюється.

---

### Task 1: Чисті функції періоду (`src/modules/dashboard/period.ts`)

**Files:**
- Create: `src/modules/dashboard/period.ts`
- Test: `src/modules/dashboard/period.test.ts`

**Interfaces:**
- Produces: `type DashboardPeriod = "month" | "quarter" | "year"`; `function getPeriodRange(period: DashboardPeriod, reference: Date): { from: Date; to: Date }`; `interface HoursChartPoint { label: string; minutes: number }`; `interface HoursEntryLike { work_date: string; total_minutes: number | null }`; `function buildHoursChartData(period: DashboardPeriod, reference: Date, entries: readonly HoursEntryLike[]): HoursChartPoint[]`.

- [ ] **Step 1: Написати падаючий тест на `getPeriodRange`**

```typescript
// src/modules/dashboard/period.test.ts
import { describe, expect, it } from "vitest";

import { buildHoursChartData, getPeriodRange } from "./period";

describe("getPeriodRange", () => {
  it("місяць — від 1 до останнього числа", () => {
    const { from, to } = getPeriodRange("month", new Date("2026-09-11T00:00:00"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("квартал — 3 місяці, що містять reference", () => {
    const { from, to } = getPeriodRange("quarter", new Date("2026-09-11T00:00:00"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("рік — з 1 січня по 31 грудня", () => {
    const { from, to } = getPeriodRange("year", new Date("2026-09-11T00:00:00"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});
```

- [ ] **Step 2: Запустити тест, переконатись що падає**

Run: `npx vitest run src/modules/dashboard/period.test.ts`
Expected: FAIL — `Cannot find module './period'` (файла ще нема).

- [ ] **Step 3: Реалізувати `getPeriodRange`**

```typescript
// src/modules/dashboard/period.ts
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";

import { t } from "@/lib/i18n";
import { dateKeyOf } from "@/modules/time/calc";

export type DashboardPeriod = "month" | "quarter" | "year";

/** Межі обраного періоду навколо `reference` — «зараз» на клієнті. */
export function getPeriodRange(
  period: DashboardPeriod,
  reference: Date,
): { from: Date; to: Date } {
  switch (period) {
    case "quarter":
      return { from: startOfQuarter(reference), to: endOfQuarter(reference) };
    case "year":
      return { from: startOfYear(reference), to: endOfYear(reference) };
    default:
      return { from: startOfMonth(reference), to: endOfMonth(reference) };
  }
}
```

- [ ] **Step 4: Запустити тест, переконатись що `getPeriodRange` проходить**

Run: `npx vitest run src/modules/dashboard/period.test.ts`
Expected: 3 тести `getPeriodRange` PASS, тести `buildHoursChartData` ще не написані.

- [ ] **Step 5: Написати падаючий тест на `buildHoursChartData`**

```typescript
// добавить в src/modules/dashboard/period.test.ts

describe("buildHoursChartData", () => {
  it("місяць — по днях, підписи це номер дня", () => {
    const points = buildHoursChartData("month", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-09-01", total_minutes: 60 },
      { work_date: "2026-09-01", total_minutes: 30 },
      { work_date: "2026-09-30", total_minutes: 120 },
    ]);

    expect(points).toHaveLength(30);
    expect(points[0]).toEqual({ label: "01", minutes: 90 });
    expect(points[29]).toEqual({ label: "30", minutes: 120 });
    expect(points[1]).toEqual({ label: "02", minutes: 0 });
  });

  it("рік — по місяцях, підписи це скорочена назва місяця", () => {
    const points = buildHoursChartData("year", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-01-15", total_minutes: 480 },
      { work_date: "2026-01-20", total_minutes: 60 },
      { work_date: "2026-09-05", total_minutes: 240 },
    ]);

    expect(points).toHaveLength(12);
    expect(points[0]).toEqual({ label: "Січ", minutes: 540 });
    expect(points[8]).toEqual({ label: "Вер", minutes: 240 });
    expect(points[1]).toEqual({ label: "Лют", minutes: 0 });
  });

  it("квартал — по тижнях (понеділок — початок тижня)", () => {
    const points = buildHoursChartData("quarter", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-07-01", total_minutes: 480 },
    ]);

    expect(points.length).toBeGreaterThan(0);
    expect(points.reduce((sum, point) => sum + point.minutes, 0)).toBe(480);
  });

  it("відкрита зміна (total_minutes: null) не ламає суму", () => {
    const points = buildHoursChartData("month", new Date("2026-09-11T00:00:00"), [
      { work_date: "2026-09-01", total_minutes: null },
    ]);

    expect(points[0]).toEqual({ label: "01", minutes: 0 });
  });
});
```

- [ ] **Step 6: Запустити тест, переконатись що падає**

Run: `npx vitest run src/modules/dashboard/period.test.ts`
Expected: FAIL — `buildHoursChartData is not exported` / `is not a function`.

- [ ] **Step 7: Реалізувати `buildHoursChartData`**

```typescript
// добавить в src/modules/dashboard/period.ts, после getPeriodRange

import { eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, endOfMonth as endOfMonthOf, endOfWeek } from "date-fns";

export interface HoursChartPoint {
  label: string;
  minutes: number;
}

/** Запись достаточно этих двух полей — компонент графика не знает про остальные. */
export interface HoursEntryLike {
  work_date: string;
  total_minutes: number | null;
}

function sumInRange(
  minutesByDate: ReadonlyMap<string, number>,
  from: Date,
  to: Date,
): number {
  let sum = 0;
  const fromKey = dateKeyOf(from);
  const toKey = dateKeyOf(to);

  for (const [date, minutes] of minutesByDate) {
    if (date >= fromKey && date <= toKey) {
      sum += minutes;
    }
  }

  return sum;
}

/**
 * Кошики графіка «Динаміка годин» — гранулярність залежить від періоду:
 * місяць — по днях, квартал — по тижнях (інакше 90 стовпчиків), рік — по
 * місяцях. Пусті кошики (без записів) залишаються з `minutes: 0`, а не
 * пропадають — інакше графік «стрибає» по осі X.
 */
export function buildHoursChartData(
  period: DashboardPeriod,
  reference: Date,
  entries: readonly HoursEntryLike[],
): HoursChartPoint[] {
  const { from, to } = getPeriodRange(period, reference);

  const minutesByDate = new Map<string, number>();
  for (const entry of entries) {
    minutesByDate.set(
      entry.work_date,
      (minutesByDate.get(entry.work_date) ?? 0) + (entry.total_minutes ?? 0),
    );
  }

  if (period === "year") {
    return eachMonthOfInterval({ start: from, end: to }).map((monthStart) => ({
      label: t.months.nominative[monthStart.getMonth()].slice(0, 3),
      minutes: sumInRange(minutesByDate, monthStart, endOfMonthOf(monthStart)),
    }));
  }

  if (period === "quarter") {
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map(
      (weekStart) => ({
        label: `${String(weekStart.getDate()).padStart(2, "0")}.${String(
          weekStart.getMonth() + 1,
        ).padStart(2, "0")}`,
        minutes: sumInRange(minutesByDate, weekStart, endOfWeek(weekStart, { weekStartsOn: 1 })),
      }),
    );
  }

  return eachDayOfInterval({ start: from, end: to }).map((day) => ({
    label: String(day.getDate()).padStart(2, "0"),
    minutes: minutesByDate.get(dateKeyOf(day)) ?? 0,
  }));
}
```

Прибрати дублюючий імпорт `endOfMonth` — нагорі файлу вже є `endOfMonth` з Task 1 Step 3; використати саме той імпорт (`endOfMonth`) замість аліасу `endOfMonthOf`, а `eachDayOfInterval`, `eachMonthOfInterval`, `eachWeekOfInterval`, `endOfWeek` додати в той самий `import { ... } from "date-fns"` на початку файлу. Фінальний файл — один блок імпортів з `date-fns`, без повторів.

- [ ] **Step 8: Запустити тест, переконатись що всі проходять**

Run: `npx vitest run src/modules/dashboard/period.test.ts`
Expected: усі тести (`getPeriodRange` + `buildHoursChartData`) PASS.

- [ ] **Step 9: Commit**

```bash
git add src/modules/dashboard/period.ts src/modules/dashboard/period.test.ts
git commit -m "feat: чиста логіка періоду й кошиків графіка для дашборда"
```

---

### Task 2: Чисті функції агрегації (`src/modules/dashboard/aggregate.ts`)

**Files:**
- Create: `src/modules/dashboard/aggregate.ts`
- Test: `src/modules/dashboard/aggregate.test.ts`

**Interfaces:**
- Consumes: `WorkEntryWithNames` з `@/modules/entries/types` (поля: `author_id`, `author_full_name`, `site_id`, `site_name`, `work_date`, `ended_at`, `total_minutes`); `sumTotalMinutes` з `@/modules/time/calc`.
- Produces: `interface DashboardOverview { totalMinutes: number; avgPerWorkdayMinutes: number; objectsWorkedCount: number }`; `function buildOverview(entries): DashboardOverview`; `interface RankedItem { id: string; name: string; minutes: number }`; `function buildTopSites(entries): RankedItem[]`; `function buildTopWorkers(entries): RankedItem[]`; `interface TodayOverview { activeCount: number; openShiftNames: string[]; totalMinutes: number }`; `function buildTodayOverview(todayEntries): TodayOverview`.

- [ ] **Step 1: Написати падаючий тест на `buildOverview`**

```typescript
// src/modules/dashboard/aggregate.test.ts
import { describe, expect, it } from "vitest";

import {
  buildOverview,
  buildTodayOverview,
  buildTopSites,
  buildTopWorkers,
} from "./aggregate";
import type { WorkEntryWithNames } from "@/modules/entries/types";

/** Мінімальна валідна запись — тесты подставляют только то, что важно для сценария. */
function makeEntry(overrides: Partial<WorkEntryWithNames>): WorkEntryWithNames {
  return {
    id: "entry-1",
    client_id: "client-1",
    company_id: "company-1",
    author_id: "author-1",
    author_full_name: "Іван Іванов",
    site_id: "site-1",
    site_name: "Об'єкт А",
    work_date: "2026-09-01",
    started_at: "08:00",
    ended_at: "16:00",
    break_start: null,
    break_end: null,
    source: "manual",
    description: "",
    break_minutes: 0,
    total_minutes: 480,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildOverview", () => {
  it("рахує суму годин, середнє на робочий день і кількість об'єктів", () => {
    const overview = buildOverview([
      makeEntry({ work_date: "2026-09-01", site_id: "site-1", total_minutes: 480 }),
      makeEntry({ work_date: "2026-09-01", site_id: "site-2", total_minutes: 120 }),
      makeEntry({ work_date: "2026-09-02", site_id: "site-1", total_minutes: 300 }),
    ]);

    expect(overview.totalMinutes).toBe(900);
    expect(overview.avgPerWorkdayMinutes).toBe(450); // 900 / 2 робочих дня
    expect(overview.objectsWorkedCount).toBe(2);
  });

  it("порожній список не ділить на нуль", () => {
    const overview = buildOverview([]);

    expect(overview).toEqual({
      totalMinutes: 0,
      avgPerWorkdayMinutes: 0,
      objectsWorkedCount: 0,
    });
  });

  it("записи без об'єкта (site_id null) не рахуються в objectsWorkedCount", () => {
    const overview = buildOverview([makeEntry({ site_id: null })]);

    expect(overview.objectsWorkedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Запустити тест, переконатись що падає**

Run: `npx vitest run src/modules/dashboard/aggregate.test.ts`
Expected: FAIL — `Cannot find module './aggregate'`.

- [ ] **Step 3: Реалізувати `buildOverview`**

```typescript
// src/modules/dashboard/aggregate.ts
import { sumTotalMinutes } from "@/modules/time/calc";
import type { WorkEntryWithNames } from "@/modules/entries/types";

export interface DashboardOverview {
  totalMinutes: number;
  avgPerWorkdayMinutes: number;
  objectsWorkedCount: number;
}

/**
 * Зведення по періоду для 4 stat-карток. `avgPerWorkdayMinutes` рахує
 * середнє тільки по днях, коли реально хтось працював — не по всіх днях
 * періоду, інакше в перших числах місяця цифра була б заниженою.
 */
export function buildOverview(entries: readonly WorkEntryWithNames[]): DashboardOverview {
  const totalMinutes = sumTotalMinutes(entries);
  const workDates = new Set(entries.map((entry) => entry.work_date));
  const siteIds = new Set(
    entries.map((entry) => entry.site_id).filter((id): id is string => id !== null),
  );

  return {
    totalMinutes,
    avgPerWorkdayMinutes: workDates.size === 0 ? 0 : Math.round(totalMinutes / workDates.size),
    objectsWorkedCount: siteIds.size,
  };
}
```

- [ ] **Step 4: Запустити тест, переконатись що `buildOverview` проходить**

Run: `npx vitest run src/modules/dashboard/aggregate.test.ts`
Expected: 3 тести `buildOverview` PASS.

- [ ] **Step 5: Написати падаючий тест на `buildTopSites` / `buildTopWorkers`**

```typescript
// добавить в src/modules/dashboard/aggregate.test.ts

describe("buildTopSites / buildTopWorkers", () => {
  it("сортує об'єкти за спаданням суми хвилин", () => {
    const ranked = buildTopSites([
      makeEntry({ site_id: "site-1", site_name: "Об'єкт А", total_minutes: 100 }),
      makeEntry({ site_id: "site-2", site_name: "Об'єкт Б", total_minutes: 300 }),
      makeEntry({ site_id: "site-1", site_name: "Об'єкт А", total_minutes: 50 }),
    ]);

    expect(ranked).toEqual([
      { id: "site-2", name: "Об'єкт Б", minutes: 300 },
      { id: "site-1", name: "Об'єкт А", minutes: 150 },
    ]);
  });

  it("пропускає записи без об'єкта", () => {
    const ranked = buildTopSites([makeEntry({ site_id: null })]);

    expect(ranked).toEqual([]);
  });

  it("сортує співробітників за спаданням суми хвилин", () => {
    const ranked = buildTopWorkers([
      makeEntry({ author_id: "a1", author_full_name: "Іван", total_minutes: 60 }),
      makeEntry({ author_id: "a2", author_full_name: "Петро", total_minutes: 200 }),
    ]);

    expect(ranked).toEqual([
      { id: "a2", name: "Петро", minutes: 200 },
      { id: "a1", name: "Іван", minutes: 60 },
    ]);
  });
});
```

- [ ] **Step 6: Запустити тест, переконатись що падає**

Run: `npx vitest run src/modules/dashboard/aggregate.test.ts`
Expected: FAIL — `buildTopSites is not exported`.

- [ ] **Step 7: Реалізувати `buildTopSites` / `buildTopWorkers`**

```typescript
// добавить в src/modules/dashboard/aggregate.ts

export interface RankedItem {
  id: string;
  name: string;
  minutes: number;
}

function buildRanked(
  entries: readonly WorkEntryWithNames[],
  keyOf: (entry: WorkEntryWithNames) => string | null,
  nameOf: (entry: WorkEntryWithNames) => string,
): RankedItem[] {
  const byId = new Map<string, { name: string; minutes: number }>();

  for (const entry of entries) {
    const id = keyOf(entry);
    if (id === null) continue;

    const current = byId.get(id) ?? { name: nameOf(entry), minutes: 0 };
    current.minutes += entry.total_minutes ?? 0;
    byId.set(id, current);
  }

  return [...byId.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Рейтинг об'єктів за годинами періоду — блок «Топ-об'єкти». */
export function buildTopSites(entries: readonly WorkEntryWithNames[]): RankedItem[] {
  return buildRanked(
    entries,
    (entry) => entry.site_id,
    (entry) => entry.site_name ?? "",
  );
}

/** Рейтинг співробітників за годинами періоду — блок «Години по співробітниках». */
export function buildTopWorkers(entries: readonly WorkEntryWithNames[]): RankedItem[] {
  return buildRanked(
    entries,
    (entry) => entry.author_id,
    (entry) => entry.author_full_name,
  );
}
```

- [ ] **Step 8: Запустити тест, переконатись що проходить**

Run: `npx vitest run src/modules/dashboard/aggregate.test.ts`
Expected: усі тести `buildTopSites`/`buildTopWorkers` PASS.

- [ ] **Step 9: Написати падаючий тест на `buildTodayOverview`**

```typescript
// добавить в src/modules/dashboard/aggregate.test.ts

describe("buildTodayOverview", () => {
  it("рахує активних сьогодні і відкриті зміни", () => {
    const overview = buildTodayOverview([
      makeEntry({ author_id: "a1", author_full_name: "Іван", ended_at: "16:00", total_minutes: 480 }),
      makeEntry({ author_id: "a2", author_full_name: "Петро", ended_at: null, total_minutes: null }),
    ]);

    expect(overview.activeCount).toBe(2);
    expect(overview.openShiftNames).toEqual(["Петро"]);
    expect(overview.totalMinutes).toBe(480);
  });

  it("без записів сьогодні — всі нулі", () => {
    expect(buildTodayOverview([])).toEqual({
      activeCount: 0,
      openShiftNames: [],
      totalMinutes: 0,
    });
  });
});
```

- [ ] **Step 10: Запустити тест, переконатись що падає**

Run: `npx vitest run src/modules/dashboard/aggregate.test.ts`
Expected: FAIL — `buildTodayOverview is not exported`.

- [ ] **Step 11: Реалізувати `buildTodayOverview`**

```typescript
// добавить в src/modules/dashboard/aggregate.ts

export interface TodayOverview {
  activeCount: number;
  openShiftNames: string[];
  totalMinutes: number;
}

/**
 * Блок «Сьогодні». `activeCount` — скільки різних людей сьогодні хоч щось
 * відмітили (закриту чи відкриту зміну), `openShiftNames` — тільки ті, у
 * кого зміна ще триває (`ended_at === null`) — це і є бейджі «Відкрито».
 */
export function buildTodayOverview(
  todayEntries: readonly WorkEntryWithNames[],
): TodayOverview {
  const activeAuthorIds = new Set(todayEntries.map((entry) => entry.author_id));
  const openShiftNames = [
    ...new Set(
      todayEntries
        .filter((entry) => entry.ended_at === null)
        .map((entry) => entry.author_full_name),
    ),
  ];

  return {
    activeCount: activeAuthorIds.size,
    openShiftNames,
    totalMinutes: sumTotalMinutes(todayEntries),
  };
}
```

- [ ] **Step 12: Запустити всі тести модуля, переконатись що проходять**

Run: `npx vitest run src/modules/dashboard`
Expected: усі тести `period.test.ts` і `aggregate.test.ts` PASS.

- [ ] **Step 13: Commit**

```bash
git add src/modules/dashboard/aggregate.ts src/modules/dashboard/aggregate.test.ts
git commit -m "feat: чиста агрегація stat-карток, топ-рейтингів і «сьогодні» для дашборда"
```

---

### Task 3: i18n-ключі та залежність `recharts`

**Files:**
- Modify: `src/lib/i18n/uk.ts:49-55` (секція `nav`), і після секції `admin` (`src/lib/i18n/uk.ts:400-418`)
- Modify: `package.json`

**Interfaces:**
- Produces: `t.nav.dashboard: string`; `t.dashboard.{title, periodMonth, periodQuarter, periodYear, totalHours, avgPerWorkday, activeWorkers, objectsWorked, todayTitle, todayActive, todayOpen, todayHoursLogged, chartTitle, chartEmpty, topSitesTitle, topSitesEmpty, topWorkersTitle, topWorkersEmpty}` — усі `string`, `todayActive` і `todayOpen` — шаблони під `fmt()`.

- [ ] **Step 1: Додати `t.nav.dashboard`**

```typescript
// src/lib/i18n/uk.ts, секция nav (строка ~49)
  nav: {
    home: "Головна",
    objects: "Об'єкти",
    add: "Додати",
    hours: "Години",
    reports: "Звіти",
    dashboard: "Дашборд",
  },
```

- [ ] **Step 2: Додати секцію `dashboard`**

```typescript
// src/lib/i18n/uk.ts, сразу после блока admin (после строки 418, перед комментарием «Справочник статусов»)

  /**
   * Окрема сторінка дашборда для шефа (`/dashboard`, `DesktopSidebar`).
   * На відміну від `admin.dashboard` (міні-блок на «Головній», лише
   * поточний місяць) тут є вибір періоду, графік і рейтинги.
   */
  dashboard: {
    title: "Дашборд",
    periodMonth: "Місяць",
    periodQuarter: "Квартал",
    periodYear: "Рік",
    totalHours: "Годин за період",
    avgPerWorkday: "Ø на робочий день",
    activeWorkers: "Активних співробітників",
    objectsWorked: "Об'єктів у роботі",
    todayTitle: "Сьогодні",
    /** {active} — скільки відмітились, {total} — всього активних співробітників. */
    todayActive: "{active} з {total} активні",
    todayOpen: "Відкрито",
    /** {hours} — форматована рядком через formatHoursShort. */
    todayHoursLogged: "{hours} відмічено сьогодні",
    chartTitle: "Динаміка годин",
    chartEmpty: "Немає годин за цей період",
    topSitesTitle: "Топ-об'єкти",
    topSitesEmpty: "Немає годин за цей період",
    topWorkersTitle: "Години по співробітниках",
    topWorkersEmpty: "Немає годин за цей період",
  },
```

- [ ] **Step 3: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без нових помилок (секція `dashboard` ще ніде не використовується, помилок бути не може; якщо є помилки в інших файлах — вони вже існували до цієї задачі, не чіпати).

- [ ] **Step 4: Додати `recharts` у залежності**

Run: `npm install recharts@^3.10.1`

Expected: `package.json`/`package-lock.json` отримали новий запис `recharts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/uk.ts package.json package-lock.json
git commit -m "feat: тексти для дашборда шефа + залежність recharts"
```

---

### Task 4: `StatTile` — виносимо в спільний компонент

**Files:**
- Create: `src/components/dashboard/StatTile.tsx`
- Modify: `src/components/home/CompanyDashboard.tsx`

**Interfaces:**
- Produces: `StatTile({ icon: LucideIcon, label: string, value: string }): JSX.Element`, іменований експорт.
- Consumes (у CompanyDashboard): цей самий `StatTile`.

- [ ] **Step 1: Створити `src/components/dashboard/StatTile.tsx`**

```typescript
// src/components/dashboard/StatTile.tsx
import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * Одна stat-картка (число + підпис + іконка). Спільна для міні-дашборда на
 * «Головній» (`CompanyDashboard`) і повної сторінки `/dashboard`.
 */
export function StatTile({ icon: Icon, label, value }: StatTileProps) {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5">
      <Icon className="size-5 text-brand" strokeWidth={2} aria-hidden />
      <p className="tabular mt-3 text-[28px] font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[13px] font-semibold text-text-muted">{label}</p>
    </div>
  );
}
```

- [ ] **Step 2: Оновити `CompanyDashboard.tsx` — використовувати спільний `StatTile`**

Видалити з `src/components/home/CompanyDashboard.tsx` локальну функцію `StatTile` (рядки 100-116) і локальний імпорт іконок, які там більше не потрібні напряму (іконки `Clock`, `Users`, `MapPin` лишаються — вони передаються пропом `icon` у виклику), додати імпорт спільного компонента:

```typescript
// src/components/home/CompanyDashboard.tsx, в начале файла
import { StatTile } from "@/components/dashboard/StatTile";
```

Прибрати старе визначення `function StatTile(...)` в кінці файлу (рядки 100-116 з поточної версії) — виклики `<StatTile ... />` в JSX лишаються без змін, вони тепер резолвляться в імпортований компонент.

- [ ] **Step 3: Перевірити типи й білд компонента**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 4: Візуально перевірити, що «Головна» не зламалась**

Run: `npm run dev`, відкрити `/` під `boss`-акаунтом, переконатись що 3 stat-картки на «Головній» виглядають так само, як до змін.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/StatTile.tsx src/components/home/CompanyDashboard.tsx
git commit -m "refactor: винести StatTile у спільний компонент src/components/dashboard"
```

---

### Task 5: `TopList` і `TodayCard`

**Files:**
- Create: `src/components/dashboard/TopList.tsx`
- Create: `src/components/dashboard/TodayCard.tsx`

**Interfaces:**
- Consumes: `RankedItem` і `TodayOverview` з `@/modules/dashboard/aggregate`; `formatHoursShort`, `fmt` з `@/lib/format`; `t` з `@/lib/i18n`.
- Produces: `TopList({ title: string, items: readonly RankedItem[], emptyLabel: string }): JSX.Element`; `TodayCard({ overview: TodayOverview, activeWorkersCount: number }): JSX.Element`.

- [ ] **Step 1: Створити `TopList`**

```typescript
// src/components/dashboard/TopList.tsx
import { formatHoursShort } from "@/lib/format";
import type { RankedItem } from "@/modules/dashboard/aggregate";

interface TopListProps {
  title: string;
  items: readonly RankedItem[];
  emptyLabel: string;
}

/**
 * Ранжований список з прогрес-баром відносно лідера — та сама вёрстка, що
 * раніше жила тільки в `CompanyDashboard.topWorkers`, тепер спільна для
 * «Топ-об'єкти» і «Години по співробітниках» на повній сторінці дашборда.
 */
export function TopList({ title, items, emptyLabel }: TopListProps) {
  const maxMinutes = items[0]?.minutes ?? 0;

  return (
    <section className="rounded-[16px] border border-border bg-surface p-5">
      <h3 className="text-[17px] font-bold">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-2 text-[14px] font-medium text-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-[14px] font-bold">{item.name}</p>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${maxMinutes === 0 ? 0 : (item.minutes / maxMinutes) * 100}%` }}
                />
              </div>
              <p className="tabular w-16 shrink-0 text-right text-[14px] font-bold">
                {formatHoursShort(item.minutes)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Створити `TodayCard`**

```typescript
// src/components/dashboard/TodayCard.tsx
import { fmt, formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TodayOverview } from "@/modules/dashboard/aggregate";

interface TodayCardProps {
  overview: TodayOverview;
  activeWorkersCount: number;
}

/** Блок «Сьогодні»: скільки з усіх активних відмітились + бейджі відкритих змін. */
export function TodayCard({ overview, activeWorkersCount }: TodayCardProps) {
  return (
    <section className="rounded-[16px] border border-border bg-surface p-5">
      <h3 className="text-[13px] font-bold tracking-wide text-text-muted uppercase">
        {t.dashboard.todayTitle}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-[28px] font-extrabold tracking-tight">
          {fmt(t.dashboard.todayActive, {
            active: overview.activeCount,
            total: activeWorkersCount,
          })}
        </p>

        {overview.openShiftNames.map((name) => (
          <span
            key={name}
            className="rounded-full bg-surface-2 px-3 py-1 text-[13px] font-semibold text-text-muted"
          >
            {t.dashboard.todayOpen} · {name}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[14px] font-medium text-text-muted">
        {fmt(t.dashboard.todayHoursLogged, { hours: formatHoursShort(overview.totalMinutes) })}
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок (компоненти ще ніде не імпортуються, крім самих себе — помилок «unused» бути не повинно, оскільки експорти іменовані і використовуються в наступній задачі).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/TopList.tsx src/components/dashboard/TodayCard.tsx
git commit -m "feat: компоненти TopList і TodayCard для дашборда"
```

---

### Task 6: `HoursChart` (recharts)

**Files:**
- Create: `src/components/dashboard/HoursChart.tsx`

**Interfaces:**
- Consumes: `HoursChartPoint[]` з `@/modules/dashboard/period`.
- Produces: `HoursChart({ data: readonly HoursChartPoint[], emptyLabel: string }): JSX.Element` — клієнтський компонент.

- [ ] **Step 1: Створити `HoursChart`**

```typescript
// src/components/dashboard/HoursChart.tsx
"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { formatHoursShort } from "@/lib/format";
import type { HoursChartPoint } from "@/modules/dashboard/period";

interface HoursChartProps {
  data: readonly HoursChartPoint[];
  emptyLabel: string;
}

/**
 * Bar chart динаміки годин. `recharts` — єдина графічна залежність у
 * проєкті (додана саме під цей компонент), кастомізується під токени
 * застосунку через `fill`/`stroke` напряму — CSS-змінні тут не працюють,
 * бо `recharts` рендерить у SVG поза Tailwind-каскадом.
 */
export function HoursChart({ data, emptyLabel }: HoursChartProps) {
  const hasData = data.some((point) => point.minutes > 0);

  if (!hasData) {
    return (
      <p className="flex h-[220px] items-center justify-center text-[14px] font-medium text-text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data as HoursChartPoint[]} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            interval="preserveStartEnd"
          />
          <Tooltip
            formatter={(value: number) => formatHoursShort(value)}
            labelFormatter={(label: string) => label}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
          />
          <Bar dataKey="minutes" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Перевірити, що змінна `--color-brand` існує**

Run: `grep -n "color-brand" src/app/globals.css`
Expected: рядок з визначенням `--color-brand` знайдено. Якщо назва змінної інша (наприклад `--brand`) — використати саме те ім'я, яке покаже `grep`, замінивши `var(--color-brand)` у Step 1.

- [ ] **Step 3: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/HoursChart.tsx
git commit -m "feat: графік динаміки годин на recharts"
```

---

### Task 7: `DashboardScreen` — оркестратор

**Files:**
- Create: `src/components/dashboard/DashboardScreen.tsx`

**Interfaces:**
- Consumes: `Profile` з `@/modules/auth/session`; `WorkEntryWithNames` з `@/modules/entries/types`; `getCompanyEntriesInRange` з `@/modules/entries/queries`; `createClient` з `@/lib/supabase/client`; `getPeriodRange`, `buildHoursChartData`, `DashboardPeriod` з `@/modules/dashboard/period`; `buildOverview`, `buildTopSites`, `buildTopWorkers`, `buildTodayOverview` з `@/modules/dashboard/aggregate`; `StatTile`, `TodayCard`, `TopList`, `HoursChart` з сусідніх файлів; `SegmentedTabs` з `@/components/shared/SegmentedTabs`; `ScreenHeader` з `@/components/layout/ScreenHeader`; `dateKeyOf` з `@/modules/time/calc`.
- Produces: `DashboardScreen({ profile: Profile, initialPeriodEntries: readonly WorkEntryWithNames[], todayEntries: readonly WorkEntryWithNames[], activeWorkersCount: number }): JSX.Element` — головний UI-компонент сторінки, рендериться в `page.tsx` (Task 8).

- [ ] **Step 1: Створити `DashboardScreen`**

```typescript
// src/components/dashboard/DashboardScreen.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Clock, Users } from "lucide-react";

import { HoursChart } from "@/components/dashboard/HoursChart";
import { StatTile } from "@/components/dashboard/StatTile";
import { TodayCard } from "@/components/dashboard/TodayCard";
import { TopList } from "@/components/dashboard/TopList";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { formatHoursShort } from "@/lib/format";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/modules/auth/session";
import {
  buildOverview,
  buildTodayOverview,
  buildTopSites,
  buildTopWorkers,
} from "@/modules/dashboard/aggregate";
import { buildHoursChartData, getPeriodRange, type DashboardPeriod } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import type { WorkEntryWithNames } from "@/modules/entries/types";
import { dateKeyOf } from "@/modules/time/calc";

interface DashboardScreenProps {
  profile: Profile;
  initialPeriodEntries: readonly WorkEntryWithNames[];
  todayEntries: readonly WorkEntryWithNames[];
  activeWorkersCount: number;
}

const PERIOD_OPTIONS: readonly { value: DashboardPeriod; label: string }[] = [
  { value: "month", label: t.dashboard.periodMonth },
  { value: "quarter", label: t.dashboard.periodQuarter },
  { value: "year", label: t.dashboard.periodYear },
];

/**
 * Оркестратор сторінки `/dashboard`. Перший кадр (період «Місяць») приходить
 * із сервера, зміна періоду тягне дані з браузера — та сама схема, що і в
 * `HoursScreen`/`getCompanyEntriesInRange` (RLS сама обмежує компанією).
 * «Сьогодні» від періоду не залежить і не рефетчиться.
 */
export function DashboardScreen({
  profile,
  initialPeriodEntries,
  todayEntries,
  activeWorkersCount,
}: DashboardScreenProps) {
  const supabase = useMemo(() => createClient(), []);
  const referenceDate = useMemo(() => new Date(), []);

  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [periodEntries, setPeriodEntries] = useState<readonly WorkEntryWithNames[]>(
    initialPeriodEntries,
  );

  useEffect(() => {
    let cancelled = false;
    const { from, to } = getPeriodRange(period, referenceDate);

    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to))
      .then((entries) => {
        if (!cancelled) setPeriodEntries(entries);
      })
      .catch(() => {
        // Мережа моргнула — лишаємо попередні дані на екрані.
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, profile.company_id, period, referenceDate]);

  const overview = useMemo(() => buildOverview(periodEntries), [periodEntries]);
  const topSites = useMemo(() => buildTopSites(periodEntries), [periodEntries]);
  const topWorkers = useMemo(() => buildTopWorkers(periodEntries), [periodEntries]);
  const chartData = useMemo(
    () => buildHoursChartData(period, referenceDate, periodEntries),
    [period, referenceDate, periodEntries],
  );
  const today = useMemo(() => buildTodayOverview(todayEntries), [todayEntries]);

  return (
    <div className="px-4 pb-6 lg:px-0">
      <ScreenHeader
        title={t.dashboard.title}
        action={
          <SegmentedTabs
            label={t.dashboard.title}
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            className="-mx-0 w-auto px-0"
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Clock} label={t.dashboard.totalHours} value={formatHoursShort(overview.totalMinutes)} />
        <StatTile icon={Clock} label={t.dashboard.avgPerWorkday} value={formatHoursShort(overview.avgPerWorkdayMinutes)} />
        <StatTile icon={Users} label={t.dashboard.activeWorkers} value={String(activeWorkersCount)} />
        <StatTile icon={Building2} label={t.dashboard.objectsWorked} value={String(overview.objectsWorkedCount)} />
      </div>

      <TodayCard className="mt-4" overview={today} activeWorkersCount={activeWorkersCount} />

      <section className="mt-4 rounded-[16px] border border-border bg-surface p-5">
        <h3 className="text-[17px] font-bold">{t.dashboard.chartTitle}</h3>
        <div className="mt-4">
          <HoursChart data={chartData} emptyLabel={t.dashboard.chartEmpty} />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopList title={t.dashboard.topSitesTitle} items={topSites} emptyLabel={t.dashboard.topSitesEmpty} />
        <TopList title={t.dashboard.topWorkersTitle} items={topWorkers} emptyLabel={t.dashboard.topWorkersEmpty} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Додати проп `className` у `TodayCard`**

`TodayCard` з Task 5 не приймає `className`, а тут використовується `<TodayCard className="mt-4" ...>`. Відкрити `src/components/dashboard/TodayCard.tsx` і додати проп:

```typescript
// src/components/dashboard/TodayCard.tsx — обновить сигнатуру и корневой элемент
interface TodayCardProps {
  overview: TodayOverview;
  activeWorkersCount: number;
  className?: string;
}

export function TodayCard({ overview, activeWorkersCount, className }: TodayCardProps) {
  return (
    <section className={cn("rounded-[16px] border border-border bg-surface p-5", className)}>
```

Додати імпорт `cn`:

```typescript
import { cn } from "@/lib/utils";
```

(розмістити разом з іншими імпортами на початку файлу, перед `fmt, formatHoursShort`).

- [ ] **Step 3: Перевірити, що `SegmentedTabs` приймає `className` і не ламається на трьох елементах без скролу**

Run: `grep -n "className" src/components/shared/SegmentedTabs.tsx`
Expected: проп `className` вже підтримується (додається до кореневого `div`) — додаткових змін не треба.

- [ ] **Step 4: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardScreen.tsx src/components/dashboard/TodayCard.tsx
git commit -m "feat: DashboardScreen — оркестратор сторінки /dashboard"
```

---

### Task 8: Сторінка `/dashboard` і доступ

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `requireProfile` з `@/modules/auth/session`; `createClient` з `@/lib/supabase/server`; `getCompanyEntriesInRange` з `@/modules/entries/queries`; `getCompanyWorkers` з `@/modules/team/queries`; `getPeriodRange` з `@/modules/dashboard/period`; `dateKeyOf` з `@/modules/time/calc`; `DashboardScreen` з Task 7; `redirect` з `next/navigation`.

- [ ] **Step 1: Створити `page.tsx`**

```typescript
// src/app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";

import { DashboardScreen } from "@/components/dashboard/DashboardScreen";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/modules/auth/session";
import { getPeriodRange } from "@/modules/dashboard/period";
import { getCompanyEntriesInRange } from "@/modules/entries/queries";
import { getCompanyWorkers } from "@/modules/team/queries";
import { dateKeyOf } from "@/modules/time/calc";

/**
 * Повна сторінка дашборда — тільки для `boss`. Перший кадр (період
 * «Місяць») і «Сьогодні» вантажаться на сервері, зміну періоду далі
 * бере на себе `DashboardScreen` (браузерний клієнт Supabase).
 */
export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role !== "boss") {
    redirect("/");
  }

  const supabase = await createClient();
  const now = new Date();
  const todayKey = dateKeyOf(now);
  const { from, to } = getPeriodRange("month", now);

  const [periodEntries, todayEntries, workers] = await Promise.all([
    getCompanyEntriesInRange(supabase, profile.company_id, dateKeyOf(from), dateKeyOf(to)),
    getCompanyEntriesInRange(supabase, profile.company_id, todayKey, todayKey),
    getCompanyWorkers(supabase, profile.company_id),
  ]);

  return (
    <DashboardScreen
      profile={profile}
      initialPeriodEntries={periodEntries}
      todayEntries={todayEntries}
      activeWorkersCount={workers.length}
    />
  );
}
```

- [ ] **Step 2: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 3: Запустити застосунок і відкрити сторінку під `boss`**

Run: `npm run dev`, відкрити `http://localhost:3000/dashboard` під акаунтом з `role = boss`.
Expected: сторінка рендериться, 4 stat-картки, «Сьогодні», графік (або порожній стан), два `TopList`. Перемикання Місяць/Квартал/Рік підвантажує дані без перезавантаження сторінки.

- [ ] **Step 4: Перевірити редірект для `worker`**

Run: у браузері відкрити `/dashboard` під акаунтом з `role = worker`.
Expected: миттєвий редірект на `/`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: сторінка /dashboard з доступом тільки для boss"
```

---

### Task 9: Навігація — десктоп-сайдбар і мобільний «Ще»

**Files:**
- Modify: `src/components/layout/DesktopSidebar.tsx`
- Modify: `src/app/(app)/more/page.tsx`

**Interfaces:**
- Consumes: `profile.role` (уже є пропом в обох файлах).

- [ ] **Step 1: Додати пункт «Дашборд» у `DesktopSidebar`**

```typescript
// src/components/layout/DesktopSidebar.tsx — добавить импорт иконки
import { LayoutDashboard, LogOut, Plus } from "lucide-react";
```

Додати посилання одразу після блоку `{NAV_ITEMS.map(...)}` і перед кнопкою `Plus` (у `src/components/layout/DesktopSidebar.tsx`, всередині `<nav>`):

```typescript
        {profile.role === "boss" && (
          <Link
            href="/dashboard"
            aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-[10px] px-2 text-[14px] font-bold",
              "transition-colors duration-150",
              pathname.startsWith("/dashboard")
                ? "bg-brand text-brand-ink"
                : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <LayoutDashboard className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
            {t.nav.dashboard}
          </Link>
        )}
```

- [ ] **Step 2: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 3: Додати посилання на мобільному екрані «Ще»**

```typescript
// src/app/(app)/more/page.tsx — добавить импорт
import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
```

Вставити блок перед формою `signOut` (після закриваючого `</div>` картки профілю, перед `<form action={signOut} ...>`):

```typescript
      {profile.role === "boss" && (
        <Link
          href="/dashboard"
          className="mx-4 mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-[17px] font-bold text-brand transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LayoutDashboard className="size-5" strokeWidth={2} aria-hidden />
          {t.nav.dashboard}
        </Link>
      )}
```

Прибрати `mt-6` з класу форми `signOut` нижче (щоб не було подвійного відступу, коли посилання показане) — замінити `<form action={signOut} className="mx-4 mt-6">` на `<form action={signOut} className="mx-4 mt-3">`, а посилання лишити з `mt-6` (відступ від картки профілю однаковий незалежно від ролі: у `worker` форма виходу отримує `mt-6` тільки коли посилання нема — простіше зробити обгортку):

```typescript
      <div className="mx-4 mt-6 flex flex-col gap-3">
        {profile.role === "boss" && (
          <Link
            href="/dashboard"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-[17px] font-bold text-brand transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <LayoutDashboard className="size-5" strokeWidth={2} aria-hidden />
            {t.nav.dashboard}
          </Link>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] border border-border text-[17px] font-bold text-danger transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <LogOut className="size-5" strokeWidth={2} aria-hidden />
            {t.auth.signOut}
          </button>
        </form>
      </div>
```

Це замінює існуючий `<form action={signOut} className="mx-4 mt-6">...</form>` цілком (обгортка `div` бере на себе зовнішні відступи, форма — без власних).

- [ ] **Step 4: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 5: Візуально перевірити обидва екрани**

Run: `npm run dev`.
- Десктоп (`lg:` і ширше), `boss`: у сайдбарі є пункт «Дашборд», клік веде на `/dashboard`, підсвічується активним.
- Десктоп, `worker`: пункту «Дашборд» нема.
- Мобільна ширина, `/more`, `boss`: кнопка-посилання «Дашборд» над кнопкою виходу.
- Мобільна ширина, `/more`, `worker`: кнопки «Дашборд» нема, лишається тільки вихід.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/DesktopSidebar.tsx "src/app/(app)/more/page.tsx"
git commit -m "feat: посилання на /dashboard у сайдбарі й мобільному «Ще» (тільки boss)"
```

---

### Task 10: Фінальна перевірка

**Files:** немає нових — прогін повного набору перевірок проєкту.

- [ ] **Step 1: Повний прогін тестів**

Run: `npm run test`
Expected: усі тести PASS, включно з новими `src/modules/dashboard/*.test.ts` і незміненим `src/modules/time/calc.test.ts`.

- [ ] **Step 2: Повна перевірка типів**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 3: Лінт**

Run: `npm run lint`
Expected: без помилок (перевірити, чи є такий скрипт: `grep -n "\"lint\"" package.json` — якщо є, запустити).

- [ ] **Step 4: Ручна перевірка повного сценарію в браузері**

Run: `npm run dev`, під `boss`-акаунтом:
1. Зайти на `/dashboard` через сайдбар.
2. Перемкнути Місяць → Квартал → Рік, переконатись що цифри й графік перераховуються, без падінь у консолі.
3. Переконатись, що «Сьогодні» показує коректну кількість активних і бейджі відкритих змін (якщо зараз є відкрита зміна в тестових даних).
4. Переконатись, що «Топ-об'єкти» і «Години по співробітниках» сортовані за спаданням і суми співпадають із сумою в «Годин за період» (для періоду «Місяць» — та сама цифра, що і на «Головній» в `CompanyDashboard`, якщо метод підрахунку не розійшовся).

- [ ] **Step 5: Commit (якщо лінт/тести щось поправили)**

```bash
git add -A
git commit -m "chore: фінальні правки після повної перевірки дашборда"
```

(Пропустити цей крок, якщо Steps 1-4 нічого не змінили у файлах.)
