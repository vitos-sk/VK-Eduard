# Растворение адмінки в приложении — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Перенести весь функционал `/more/admin/*` в обычные экраны приложения (телефон + ПК) и удалить адмінку.

**Architecture:** Расширяем существующие экраны флагом `isBoss` (паттерн `ObjectsScreen`/`HoursScreen`/`ReportsScreen`). 5 независимых потоков A–E с непересекающимися файлами; общие файлы правит интегратор (Task F).

**Tech Stack:** Next.js (НЕ тот, что в обучающих данных — перед кодом читать `node_modules/next/dist/docs/`), React, Supabase, Tailwind токены (`border-border`, `bg-surface-2`, `text-text-muted`, `bg-brand`), lucide-react, recharts, UI на украинском через `t` из `@/lib/i18n`.

**Spec:** `docs/superpowers/specs/2026-09-20-dissolve-admin-into-app-design.md`

## Global Constraints

- Ни одна функция адмінки не теряется: сначала матрица паритета (что умеет admin-экран → где в обычном приложении → чего нет), потом порт недостающего.
- Каждый экран работает на телефоне (`< lg`, контент в `PhoneFrame`, отступы `px-4`) и на ПК (`lg:` — сетка/таблица, контент до 1200px).
- Только `boss` видит boss-функции; серверные страницы проверяют `profile.role !== "boss"` → `redirect`.
- Слово «Адмінка» в UI не встречается. Остаётся только UI на украинском.
- Общие файлы **не править в потоках A–E**: `src/lib/i18n/uk.ts`, `src/components/layout/DesktopSidebar.tsx`, `src/app/(app)/more/page.tsx`, `src/app/api/export/route.ts`, всё под `src/app/(app)/more/admin/**` и `src/components/more/admin/**` (только читать как источник).
- Новые i18n-строки агент кладёт в **свой новый файл** `src/lib/i18n/parts/<поток>.ts` (экспорт `const <поток>Strings = {...}`) и в отчёте перечисляет, как их подключить; интегратор сводит в `uk.ts`. До сведения использовать `import { <поток>Strings as s } from "@/lib/i18n/parts/<поток>"`.
- Миграции агенты только создают файлом, не применяют.
- Агенты НЕ коммитят; коммитит интегратор. Проверка в конце потока: `npx tsc --noEmit` без новых ошибок.

---

### Task A: Объекты (sites)

**Files:** Modify `src/components/objects/ObjectsScreen.tsx`, `src/components/shared/ObjectCard.tsx`, `src/app/(app)/objects/[id]/page.tsx` и связанные компоненты в `src/components/objects/`. Create по необходимости `src/components/objects/*`, `src/lib/i18n/parts/objects.ts`. Источник (read-only): `src/components/more/admin/sites/*`, `src/modules/sites/*`.

**Produces:** boss на `/objects` и `/objects/[id]` может: архивировать/разархивировать, удалять с подтверждением, видеть часы и число людей по объекту за период, искать, фильтровать по статусу/архиву — всё, что умел `AdminSitesScreen`.

- [ ] **Step 1:** Прочитать `AdminSitesScreen`, `SiteAdminList`, `SiteRowActions`, `ObjectsScreen`, `ObjectCard`, `objects/[id]/page.tsx`. Составить матрицу паритета (в отчёт).
- [ ] **Step 2:** Портировать недостающее на телефон (меню «⋯» на карточке/в шапке объекта) и ПК (те же действия + метрики в карточке/таблице).
- [ ] **Step 3:** `npx tsc --noEmit`; вручную открыть `/objects` boss и worker на телефонной и десктопной ширине (dev-сервер, `Claude in Chrome` при наличии).
- [ ] **Step 4:** Отчёт: матрица паритета, изменённые файлы, i18n-строки.

### Task B: Години (entries + salary)

**Files:** Modify `src/components/hours/HoursScreen.tsx`, `MonthEntriesTable.tsx`, `SalaryCalculator.tsx`; Create по необходимости `src/components/hours/*`, `src/lib/i18n/parts/hours.ts`. Источник: `src/components/more/admin/entries/*`, `.../salary/AdminSalaryScreen.tsx`.

**Produces:** boss в «Години» имеет: фильтры по сотруднику и объекту, навигацию по месяцу, правку/удаление любой записи, полный калькулятор зарплаты — паритет `AdminEntriesScreen` + `AdminSalaryScreen`. Переключатель «Я / Команда» (личное vs команда) внутри вкладки для boss.

- [ ] **Step 1:** Прочитать admin entries/salary экраны и `HoursScreen`; матрица паритета.
- [ ] **Step 2:** Добавить недостающее (фильтры, переключатель «Я / Команда», редактирование через существующий `/time/manual/[id]` или диалог из `EntryEditDialog`, если нужен).
- [ ] **Step 3:** Обе раскладки (телефон/ПК); `tsc`.
- [ ] **Step 4:** Отчёт.

### Task C: Звіти → Команда (reports + overview + export)

**Files:** Modify `src/components/reports/TeamTab.tsx`, `ReportsScreen.tsx`, `ExportMenu.tsx`; Move `src/components/more/ShareWhatsAppButton.tsx` → `src/components/reports/ShareWhatsAppButton.tsx` (обновить импорты); Create `src/lib/i18n/parts/reports.ts`. Источник: `src/components/more/AdminScreen.tsx`, `AdminWorkerList.tsx`, `admin/AdminKpiStrip.tsx`, `admin/reports/*`.

**Produces:** в `TeamTab` у boss: чекбоксы мультивыбора сотрудников (+«Усі/Зняти всі», поиск по имени), плавающая панель «Обрано: N» + `ExportMenu` + `ShareWhatsAppButton` с `workerIds`; KPI-ряд (Годин / Активних / Ø); лента отчётов компании за период с удалением чужого отчёта (паритет `AdminReportsScreen`).

- [ ] **Step 1:** Прочитать перечисленные источники и `TeamTab`; матрица паритета; сверить, что `/api/export` принимает `workerIds` (только читать).
- [ ] **Step 2:** Реализовать мультивыбор + панель действий + KPI + лента отчётов компании; телефон и ПК.
- [ ] **Step 3:** `tsc`; проверить экспорт/шеринг по выбранным (URL содержит `workerIds=...`).
- [ ] **Step 4:** Отчёт (включая, чего в `/dashboard` не хватает по KPI, если что-то не покрыто).

### Task D: Команда и Компанія

**Files:** Modify `src/components/more/TeamManagementScreen.tsx`, `src/app/(app)/more/team/page.tsx`; Create `src/app/(app)/more/company/page.tsx`, `src/components/more/company/CompanyDailyNormForm.tsx`, `src/components/more/company/WorkCategoriesManager.tsx` (перенос из `src/components/more/admin/settings/` с сохранением логики), `src/components/more/team/DailyNormEditor.tsx`, `src/lib/i18n/parts/company.ts`. Источник: `src/components/more/admin/team/*`, `.../settings/*`, `src/modules/{team,company,reports}/actions.ts`.

**Produces:** `/more/team` — поиск, часы за месяц, добавление/деактивация, редактор дневной нормы (паритет `AdminTeamScreen`). `/more/company` (boss-only, `BackHeader href="/more"`) — норма компании + категории работ. В `revalidatePath` этих трёх `actions.ts` новые пути правит **интегратор**, но агент сообщает, какие.

- [ ] **Step 1:** Прочитать источники; матрица паритета.
- [ ] **Step 2:** Перенести компоненты в новые пути (копия, старые не удалять — их удалит интегратор), подключить в страницы, обе раскладки.
- [ ] **Step 3:** `tsc`; отчёт с путями revalidate.

### Task E: Удаление default_view

**Files:** Create `supabase/migrations/0013_drop_profile_default_view.sql`; Modify `src/modules/auth/actions.ts` (убрать `updateDefaultView`, в `signIn` всегда `redirect("/")`), `src/modules/auth/profile.ts`, `src/lib/supabase/types.gen.ts` (убрать `default_view`).

- [ ] **Step 1:** Миграция: `alter table public.profiles drop column if exists default_view;` (сверить имя таблицы/схемы по `0011_profile_default_view.sql`).
- [ ] **Step 2:** Убрать код; `DefaultViewToggle.tsx` и `AdminScreen.tsx` **не трогать** (удалит интегратор — после этого `tsc` зелёный; до этого ошибки в них ожидаемы).
- [ ] **Step 3:** Отчёт.

### Task F: Интеграция и удаление (после A–E)

**Files:** Modify `uk.ts`, `DesktopSidebar.tsx`, `more/page.tsx`, `revalidatePath` в `modules/{reports,team,company}/actions.ts`, комментарии с `/more/admin` (`api/export/route.ts`, `ExportMenu.tsx`, `modules/sites/hours.ts`, `modules/reports/queries.ts`, `modules/company/actions.ts`, `modules/team/actions.ts`). Delete `src/app/(app)/more/admin/**`, `src/components/more/admin/**`, `AdminScreen.tsx`, `AdminWorkerList.tsx`, `DefaultViewToggle.tsx`, старый `more/ShareWhatsAppButton.tsx` (если остался).

- [ ] **Step 1:** Свести `parts/*.ts` в `uk.ts`, удалить `admin.*` ключи удалённых экранов и `profile.rows.admin`; добавить `profile.rows.company`.
- [ ] **Step 2:** `more/page.tsx`: убрать «Адмінка», добавить boss-строку «Компанія» → `/more/company`. `DesktopSidebar`: убрать ссылку «Адмінка».
- [ ] **Step 3:** Заменить `revalidatePath("/more/admin/...")` на `/objects`, `/hours`, `/reports`, `/more/team`, `/more/company`.
- [ ] **Step 4:** Удалить остров и осиротевшие файлы; `grep -rn "more/admin\|t\.admin\." src` → пусто.
- [ ] **Step 5:** `npx tsc --noEmit`, `npm run lint`, `npm run build` — зелёные.
- [ ] **Step 6:** Ручная проверка boss/worker на телефоне и ПК (см. «Тестирование» в спеке). Коммит по запросу пользователя.
