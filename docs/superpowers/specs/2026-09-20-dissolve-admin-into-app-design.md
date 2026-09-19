# Растворение адмінки в обычном приложении — дизайн

Дата: 2026-09-20

## Проблема и цель

Сейчас у `boss` два параллельных набора экранов: обычные вкладки
(«Головна / Об'єкти / Години / Звіти», `/dashboard`, `/more/team`) и отдельный
остров `/more/admin/*` (7 разделов с собственной под-навигацией `AdminNav`).
На ПК остров торчит пунктом «Адмінка» в сайдбаре, на телефоне спрятан за
`аватар → Ще → Адмінка`. Часть функций уже продублирована в обычных экранах
(`Години` показывают записи компании при `isBoss`, `Звіти → Команда`,
`/objects` с кнопкой «+» для boss), часть живёт только в адмінці.

**Цель:** аккаунт `boss` — это тот же интерфейс, что и у работника, но с
расширенными данными и контролами. Отдельной адмінки нет ни на телефоне, ни на
ПК; слово «Адмінка» исчезает из UI. **Ни одна функция не теряется** — всё, что
умела адмінка, переезжает в обычные экраны, после чего `/more/admin/*`
удаляется.

Роль «admin» = существующая роль `boss`; новых ролей не вводим.

## Принципы

1. **Паритет функций прежде удаления.** Для каждого admin-экрана составляется
   матрица «что умеет → где это в обычном приложении → чего не хватает».
   Недостающее портируется, только потом файл удаляется.
2. **Паттерн уже есть в коде:** один экран с флагом `isBoss` / `profile.role`
   (`ObjectsScreen`, `HoursScreen`, `ReportsScreen`) — расширяем его, а не
   заводим параллельные роуты.
3. **Навигацию не раздуваем.** 4 вкладки таб-бара/сайдбара остаются как есть.
   Dashboard остаётся отдельным экраном: сайдбар (ПК) и лист «+»
   (`QuickActionSheet`, телефон) — как сейчас. Если понадобится новая точка
   входа — только в `QuickActionSheet`.
4. **Визуал** — на общий стиль приложения (токены `border-border`,
   `bg-surface-2`, `SegmentedTabs`, `PeriodNavigator`, `EmptyState`); экраны,
   переезжающие из адмінки, перерисовываются под него свободно. Обязательны
   обе раскладки: телефон (`< lg`) и ПК (`lg:`).

## Карта переезда

| Было (`/more/admin/...`) | Куда | Что портируем сверх уже имеющегося |
|---|---|---|
| `AdminSitesScreen`, `SiteAdminList`, `SiteRowActions` | `/objects` + `/objects/[id]` | архив/розархів, удаление с подтверждением, часы и число людей по объекту за период (`modules/sites/hours.ts`), поиск, статусы — по результату матрицы паритета |
| `AdminEntriesScreen`, `EntriesAdminList`, `EntryEditDialog` | вкладка «Години» (boss) | фильтры по сотруднику и объекту, навигация по месяцу, правка/удаление (частично уже в `MonthEntriesTable`) |
| `AdminReportsScreen`, `AdminReportCard`, `AdminDeleteReportButton` | «Звіти → Команда» (`TeamTab`) | лента отчётов всей компании за период, удаление чужого отчёта |
| `AdminSalaryScreen` | `SalaryCalculator` в «Години» | сверить паритет; недостающее дописать |
| `AdminTeamScreen`, `DailyNormEditor` | `/more/team` (`TeamManagementScreen`) | поиск, часы за месяц, редактор дневной нормы сотрудника |
| `AdminScreen`, `AdminWorkerList`, `AdminKpiStrip`, `ShareWhatsAppButton` | `TeamTab` (`Звіти → Команда`) + `/dashboard` | **мультивыбор чекбоксами** нескольких сотрудников + «Експорт» + «WhatsApp» по выбранным (`workerIds` в `/api/export` уже есть); KPI — сверить с `/dashboard` |
| `CompanyDailyNormForm`, `WorkCategoriesManager` | новая страница `/more/company` («Компанія»), строка в `/more` только для boss | перенос как есть, без слова «адмінка» |
| `DefaultViewToggle`, `default_view`, редирект в `signIn` | **удаляется полностью** | — |

`ShareWhatsAppButton` и `AdminKpiStrip`, если переиспользуются, переезжают из
`components/more/` в `components/reports/` / `components/shared/`.

## Удаление default_view

- Новая миграция `0013_drop_profile_default_view.sql`: `alter table profiles
  drop column default_view` (выполняется пользователем/через Supabase —
  агенты миграции не применяют, только создают файл).
- `src/modules/auth/actions.ts`: убрать `updateDefaultView` и ветку редиректа
  в `signIn` (всегда `redirect("/")`).
- `src/modules/auth/profile.ts` и `src/lib/supabase/types.gen.ts`: убрать поле.
- Удалить `DefaultViewToggle` и ключи `admin.panel.defaultView*`.

## Чистка навигации и ссылок

- `src/app/(app)/more/page.tsx`: убрать строку «Адмінка»; для boss добавить
  строку «Компанія» → `/more/company`.
- `src/components/layout/DesktopSidebar.tsx`: убрать ссылку «Адмінка» (Dashboard
  остаётся).
- `revalidatePath("/more/admin/...")` в `modules/{reports,team,company}/actions.ts`
  заменить на новые пути (`/reports`, `/more/team`, `/more/company`, `/objects`,
  `/hours`).
- Комментарии, упоминающие `/more/admin`, обновить (`api/export/route.ts`,
  `ExportMenu.tsx`, `modules/sites/hours.ts`, `modules/reports/queries.ts`,
  `modules/company/actions.ts`, `modules/team/actions.ts`).
- Удалить `src/app/(app)/more/admin/**`, `src/components/more/admin/**`,
  `AdminScreen`, `AdminWorkerList`; вычистить `admin.*` из `uk.ts` (ключи,
  которые нужны портированным экранам, переименовать в неймспейсы
  `objects.*`, `hours.*`, `reports.*`, `profile.company.*`).
- Не оставлять редиректов-заглушек с `/more/admin` (не нужны — роут не был
  публичным контрактом), но 404 допустим.

## Порядок реализации и параллелизм

Независимые потоки (можно вести параллельными агентами, у каждого свой набор
файлов):

- **A. Объекты** — sites (`/objects`, `ObjectCard`, `ObjectForm`, `objects/[id]`).
- **B. Години** — entries + salary (`HoursScreen`, `MonthEntriesTable`, фильтры).
- **C. Звіти/Команда** — reports + overview: `TeamTab`, мультивыбор, WhatsApp, KPI.
- **D. Команда и Компанія** — `/more/team` (+норма), новый `/more/company`, строка в `/more`.
- **E. default_view** — миграция, auth, profile, types.

Общие файлы (`uk.ts`, `DesktopSidebar.tsx`, `more/page.tsx`, `revalidatePath`,
удаление `/more/admin/**`) **правит только интегратор после потоков A–E**, чтобы
не было конфликтов: агенты добавляют новые i18n-ключи в отдельные неймспейсы и
сообщают список, интегратор сводит.

Финал (интегратор): удалить остров, вычистить i18n и ссылки, `tsc`/`lint`/`build`,
ручная проверка boss и worker на ширине телефона и ПК.

## Тестирование

- `boss`: каждая перенесённая функция достижима из обычных экранов на телефоне
  и на ПК; матрица паритета закрыта полностью.
- `worker`: интерфейс не изменился, ни одна boss-функция не видна; прямые URL
  boss-страниц (`/more/team`, `/more/company`, `/objects/new`) редиректят.
- `/more/admin*` → 404; в кодовой базе нет ссылок `more/admin` и `t.admin.`
  для удалённых экранов.
- Экспорт с несколькими сотрудниками и WhatsApp-шеринг из `TeamTab`.
- Логин boss всегда ведёт на `/`.
- `npx tsc --noEmit`, lint, `next build` — зелёные.
