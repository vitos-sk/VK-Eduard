# Desktop Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить полноценную ПК-версию (lg: breakpoint, 1024px) поверх существующего мобильного приложения K group, не меняя ни одного мобильного класса и ни одного пикселя на <1024px.

**Architecture:** Мобильная раскладка (PhoneFrame + BottomNav, всё без префикса и с `phone:`) остаётся нетронутой. Поверх неё через `lg:`-классы и параллельные JSX-ветки (`hidden lg:flex` / `lg:hidden`) добавляется desktop shell по образцу `src/components/admin/AdminShell.tsx`: сайдбар 256px + контент с `max-w`. Общий стейт (например `isQuickOpen`) не дублируется — один компонент рендерит два визуальных дерева.

**Tech Stack:** Next.js App Router, Tailwind v4 (токены в `src/app/globals.css`), shadcn, TypeScript.

**Spec:** Задача пользователя в этой беседе (полный текст шагов 0–8 см. историю разговора); референс паттерна — `src/components/admin/AdminShell.tsx`.

## Global Constraints

- НЕ удалять и не менять ни один существующий класс без префикса или с префиксом `phone:` — только ДОБАВЛЯТЬ `lg:`-классы поверх.
- Ветвление структуры JSX (не только классов) — через `hidden lg:block` / `lg:hidden`, дублируя минимально; не удалять существующее дерево для мобильной ветки.
- Брейкпоинт desktop = `lg:` (1024px), как в `AdminShell`. Не трогать `--breakpoint-phone` (480px) в `globals.css`.
- Не трогать `PhoneFrame.tsx` саму по себе (её поведение <lg: должно остаться прежним) — максимум оборачивать условным рендером в layout.
- Не переписывать бизнес-логику/запросы к Supabase — только JSX-раскладка и Tailwind-классы.
- Никаких хардкод-цветов (`#...`) — только токены из `globals.css` (см. `docs/DESIGN-SYSTEM.md` §1).
- Не трогать `/admin` (AdminShell) вообще.
- После каждой задачи: коммит, затем визуальная проверка на 375px (идентично «до») и на 1440px (новая раскладка) через dev-сервер/браузер.
- `npm run build` должен проходить без ошибок к концу работы (проверяется в финальной задаче, но полезно гонять чаще).

---

### Task 0: Общий каркас — сайдбар в `(app)/layout.tsx`

**Files:**
- Modify: `src/components/layout/BottomNav.tsx` — экспортировать `leftItems`/`rightItems` (или объединённый `NAV_ITEMS`), чтобы не дублировать вручную href/label/icon.
- Modify: `src/app/(app)/layout.tsx` — добавить desktop-ветку с сайдбаром.
- Create (при необходимости): `src/components/layout/DesktopSidebar.tsx` — сайдбар по образцу `AdminShell.tsx` aside-блока.
- Test: визуальная проверка dev-сервера на 375px и 1440px для `/`, `/objects`, `/hours`, `/reports`.

**Interfaces:**
- Consumes: `t.nav.home/objects/hours/reports` из `@/lib/i18n`; `Logo` из `@/components/brand/Logo`; `signOut` из `@/modules/auth/actions`; профиль пользователя (посмотреть, как `more/page.tsx` получает профиль — вероятно через server component выше или хук/контекст; проверить перед использованием).
- Produces: `DesktopSidebar` (если создан отдельным файлом) — `export function DesktopSidebar({ onFabClick }: { onFabClick: () => void })`, используется только в `AppLayout`.

- [ ] **Step 1: Прочитать текущие файлы перед правкой**

Прочитать: `src/app/(app)/layout.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/layout/FabButton.tsx`, `src/app/(app)/more/page.tsx`, `src/modules/auth/actions.ts` (или где лежит `signOut`), `src/lib/i18n.ts` (секции `nav`, `profile`, `auth`), чтобы взять реальные тексты/типы профиля, которые уже использует `AdminShell.tsx` и `more/page.tsx`.

- [ ] **Step 2: Экспортировать список пунктов навигации из `BottomNav.tsx`**

В `src/components/layout/BottomNav.tsx` заменить приватные `leftItems`/`rightItems` на:

```tsx
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: t.nav.home, icon: House },
  { href: "/objects", label: t.nav.objects, icon: Building2 },
  { href: "/hours", label: t.nav.hours, icon: Clock },
  { href: "/reports", label: t.nav.reports, icon: FileText },
];

const leftItems = NAV_ITEMS.slice(0, 2);
const rightItems = NAV_ITEMS.slice(2);
```

(Порядок должен точно совпадать с текущим визуальным порядком таб-бара: Головна, Об'єкти, Години, Звіти.) Экспортировать также тип `NavItem`, если он ещё не экспортирован.

- [ ] **Step 3: Создать `DesktopSidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "@/components/layout/BottomNav";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DesktopSidebarProps {
  onFabClick: () => void;
}

export function DesktopSidebar({ onFabClick }: DesktopSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <Logo className="px-2" />

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[10px] px-2 text-[14px] font-bold",
                "transition-colors duration-150",
                isActive
                  ? "bg-brand text-brand-ink"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onFabClick}
          className={cn(
            "mt-2 flex h-11 items-center gap-3 rounded-[10px] px-2 text-[14px] font-bold",
            "text-brand transition-colors duration-150 hover:bg-surface-2",
          )}
        >
          <Plus className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
          {t.quick.title /* сверить реальный ключ в lib/i18n.ts перед использованием */}
        </button>
      </nav>

      {/* Блок профиля/выхода: скопировать структуру из more/page.tsx (аватар/имя/роль)
          и форму signOut из AdminShell.tsx, подставив реальный профиль текущего юзера. */}
    </aside>
  );
}
```

Перед вставкой блока профиля — прочитать `more/page.tsx`, чтобы взять оттуда реальный источник профиля (server component проп/хук) и текст для роли/выхода, вместо выдумывания.

- [ ] **Step 4: Подключить сайдбар в `layout.tsx`, не трогая мобильную ветку**

```tsx
"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { QuickActionSheet } from "@/components/quick/QuickActionSheet";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  return (
    <>
      {/* Мобильная ветка — БЕЗ ИЗМЕНЕНИЙ */}
      <div className="lg:hidden">
        <PhoneFrame>
          <div className="h-full overflow-y-auto overscroll-contain pb-[92px]">
            {children}
          </div>
          <BottomNav
            onFabClick={() => setIsQuickOpen((open) => !open)}
            fabExpanded={isQuickOpen}
          />
        </PhoneFrame>
      </div>

      {/* Desktop-ветка */}
      <div className="hidden min-h-dvh bg-bg text-text lg:flex">
        <DesktopSidebar onFabClick={() => setIsQuickOpen((open) => !open)} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
        </main>
      </div>

      <QuickActionSheet open={isQuickOpen} onOpenChange={setIsQuickOpen} />
      <Toaster position="top-center" />
    </>
  );
}
```

Важно: `children` рендерится дважды (один раз в мобильной ветке, один раз в десктопной) — это ожидаемо и допустимо в React, но нужно проверить, что дочерние страницы не держат side-effect-стейт, ломающийся от двойного монтирования (маловероятно для server components/страниц с `use client` без глобальных side effects; если найдётся проблема — обернуть в `dynamic`/`useId`-безопасный паттерн, но сначала проверить на практике).

- [ ] **Step 5: Проверить сборку**

Run: `npm run build`
Expected: без ошибок TypeScript/ESLint.

- [ ] **Step 6: Визуальная проверка**

Запустить `npm run dev`, открыть в браузере на ширине 375px — страницы `/`, `/objects`, `/hours`, `/reports` должны выглядеть пиксель-в-пиксель как до правок (телефон-рамка, таб-бар снизу). На 1440px — слева сайдбар 256px с логотипом, 4 пунктами навигации, кнопкой "+", контент по центру max-w-[1200px], без рамки телефона и чёрного леттербокса.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/components/layout/BottomNav.tsx src/components/layout/DesktopSidebar.tsx
git commit -m "feat: добавить desktop-сайдбар в (app)/layout, не трогая мобильную раскладку"
```

---

### Task 1: Головна (`src/app/(app)/page.tsx`)

**Files:**
- Modify: `src/app/(app)/page.tsx`
- Read first: компоненты `HomeHeader`, `WorkTimeCard`, `ObjectCard` (найти через grep) — чтобы понять их текущие пропсы и не менять внутреннюю логику.

- [ ] **Step 1: Прочитать `page.tsx` и подкомпоненты (`HomeHeader`, `WorkTimeCard`, список объектов, `ObjectCard`)**
- [ ] **Step 2: Обернуть текущую вертикальную колонку в `lg:hidden` (или оставить как есть и добавить только `lg:`-классы, если структура позволяет одной разметкой) и добавить desktop-ветку `hidden lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6`: слева `WorkTimeCard` + список последних записей, справа блок "Мої об'єкти" с `grid grid-cols-2 gap-4` для карточек.**

Не удалять существующее дерево — либо добавить параллельный `hidden lg:...` блок, либо (если проще) сделать общий JSX с классами-переключателями на обёртках `<div className="lg:hidden">...</div>` + `<div className="hidden lg:grid ...">...</div>`, переиспользуя те же дочерние компоненты (`WorkTimeCard`, `ObjectCard`) без изменения их самих.

- [ ] **Step 3: `npm run build`, затем визуальная проверка 375px / 1440px**
- [ ] **Step 4: Commit** — `git commit -m "feat: desktop-раскладка главной страницы"`

---

### Task 2: Об'єкти (список, деталь, формы)

**Files:**
- Modify: `src/components/objects/ObjectsScreen.tsx`
- Modify: `src/app/(app)/objects/page.tsx`
- Modify: `src/app/(app)/objects/[id]/page.tsx`
- Modify: `src/app/(app)/objects/new/page.tsx`
- Modify: `src/app/(app)/objects/[id]/edit/page.tsx`
- Modify: `src/components/objects/ObjectForm.tsx` (если раскладка полей формы живёт здесь)

- [ ] **Step 1: Прочитать все перечисленные файлы, чтобы увидеть текущую структуру (список карточек, деталь объекта, форма).**
- [ ] **Step 2: `ObjectsScreen.tsx` — список: добавить `lg:grid lg:grid-cols-2 lg:gap-4` (или `grid-cols-3`, подобрать по `max-w-[1200px]` контента) поверх текущего вертикального стека, не убирая мобильные классы.**
- [ ] **Step 3: Страница `[id]` — обернуть в `lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-8`: фото/карта в левую колонку, детали + список звітів — в правую. Мобильный вертикальный стек оставить как `lg:hidden`-независимый (или через переключение классов на общих обёртках).**
- [ ] **Step 4: Формы `new`/`edit` — центрировать (`lg:mx-auto lg:max-w-[640px]` или похоже), для коротких полей (адрес/тип работ) добавить `lg:grid lg:grid-cols-2 lg:gap-4` на обёртке пары полей.**
- [ ] **Step 5: `npm run build`, визуальная проверка 375px / 1440px для списка, детали объекта, создания и редактирования.**
- [ ] **Step 6: Commit** — `git commit -m "feat: desktop-раскладка раздела Об'єкти"`

---

### Task 3: Години

**Files:**
- Modify: `src/components/hours/HoursScreen.tsx`
- Modify (раскладка контейнеров, не логика): `src/components/hours/DaySummaryCard.tsx`, `src/components/hours/DayDetailsCard.tsx`, `src/components/hours/DayEntriesCard.tsx`, `src/components/hours/MonthEntriesTable.tsx`, `src/components/hours/PeriodNavigator.tsx`, `src/components/hours/PeriodView.tsx`, `src/components/hours/DayActions.tsx`

- [ ] **Step 1: Прочитать `HoursScreen.tsx` целиком и понять, какие из 7 подкомпонентов рендерятся в каком порядке (таймер, переключатель периодов, сводка, график, детали дня).**
- [ ] **Step 2: В `HoursScreen.tsx` обернуть верхний блок (таймер + сводка, вероятно `DaySummaryCard` + таймер-компонент) в `lg:grid lg:grid-cols-3 lg:gap-4` (2–3 карточки в ряд), сохранив вертикальный стек ниже `lg:`.**
- [ ] **Step 3: График/`PeriodView` — добавить `lg:w-full` без ограничения по колонкам (остаётся на всю ширину контента).**
- [ ] **Step 4: `DayDetailsCard`/`MonthEntriesTable` — расширить: добавить `lg:` классы, дающие таблице больше воздуха (например, увеличенный padding ячеек через `lg:` без изменения самой таблицы).**
- [ ] **Step 5: `npm run build`, визуальная проверка 375px / 1440px на `/hours` для разных периодов (день/неделя/месяц, если есть переключатель).**
- [ ] **Step 6: Commit** — `git commit -m "feat: desktop-раскладка раздела Години"`

---

### Task 4: Звіти

**Files:**
- Modify: `src/app/(app)/reports/page.tsx` (и/или `ReportsScreen`, найти через grep)
- Modify: `src/app/(app)/reports/[id]/page.tsx` (`ReportDetail`)
- Modify: `src/app/(app)/reports/new/page.tsx` (`ReportForm`)

- [ ] **Step 1: Найти и прочитать `ReportsScreen`, `ReportDetail`, `ReportForm` (grep по `src/app/(app)/reports` и `src/components`).**
- [ ] **Step 2: `ReportsScreen` — список карточек: `lg:grid lg:grid-cols-2 lg:gap-4` (или 3 колонки при достаточной ширине карточки), фильтры/поиск/вкладки Мої/Команда — растянуть в горизонтальную панель `lg:flex lg:items-center lg:gap-4` сверху.**
- [ ] **Step 3: `ReportDetail` — `lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8`: галерея фото слева/шире, текст описания справа.**
- [ ] **Step 4: `ReportForm` — центрировать `lg:mx-auto lg:max-w-[640px]`, НЕ растягивать текстовые поля на всю ширину контента.**
- [ ] **Step 5: `npm run build`, визуальная проверка 375px / 1440px для списка, деталей, создания отчёта.**
- [ ] **Step 6: Commit** — `git commit -m "feat: desktop-раскладка раздела Звіти"`

---

### Task 5: Ще (`src/app/(app)/more/page.tsx`)

**Files:**
- Modify: `src/app/(app)/more/page.tsx`

- [ ] **Step 1: Прочитать `more/page.tsx`.**
- [ ] **Step 2: Добавить `lg:mx-auto lg:max-w-[480px] lg:py-10` (или аналогичные классы) к центральной карточке, без grid-раскладки и без скрытия страницы на `lg:` (страница остаётся доступной по прямой ссылке, просто выглядит как расширенная центрированная карточка).**
- [ ] **Step 3: `npm run build`, визуальная проверка 375px / 1440px.**
- [ ] **Step 4: Commit** — `git commit -m "feat: desktop-раскладка страницы Ще"`

---

### Task 6: Ручной ввод времени

**Files:**
- Modify: `src/components/time/ManualTimeScreen.tsx`
- Modify: `src/app/(app)/time/manual/page.tsx` и/или `src/app/(app)/time/manual/[id]/page.tsx` (проверить точные пути через grep)
- Возможно: `EntryTypeSelector`, `PhotoPicker`, `ObjectPickerDrawer` (найти файлы через grep)

- [ ] **Step 1: Прочитать `ManualTimeScreen.tsx` и связанные подкомпоненты форм.**
- [ ] **Step 2: Центрировать форму так же, как `ReportForm` (`lg:mx-auto lg:max-w-[640px]`), разложить `EntryTypeSelector`/аналогичные поля в `lg:grid lg:grid-cols-2 lg:gap-4` где это уместно по смыслу полей.**
- [ ] **Step 3: `npm run build`, визуальная проверка 375px / 1440px.**
- [ ] **Step 4: Commit** — `git commit -m "feat: desktop-раскладка ручного ввода времени"`

---

### Task 7: Аутентификация и welcome

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(marketing)/welcome/page.tsx`
- Read first: `docs/DESIGN-SYSTEM.md` §4.1 (текстовое содержимое welcome, список пунктов)

- [ ] **Step 1: Прочитать `login/page.tsx`, `welcome/page.tsx` и §4.1 `docs/DESIGN-SYSTEM.md`.**
- [ ] **Step 2: `login/page.tsx` — на `lg:` центрировать форму карточкой шириной ~400–480px на фоне `bg-bg-outer`, без скруглений/рамки телефона (либо условно не рендерить `PhoneFrame` на `lg:` для этой страницы, либо перекрыть визуально классами, не трогая исходный мобильный JSX).**
- [ ] **Step 3: `welcome/page.tsx` — на `lg:` добавить двухколоночную раскладку (слева заголовок/список пунктов из §4.1, справа/снизу превью или крупная типографика), сохранив весь текстовый контент и порядок пунктов из текущей версии.**
- [ ] **Step 4: `npm run build`, визуальная проверка 375px / 1440px для `/login` и `/welcome`.**
- [ ] **Step 5: Commit** — `git commit -m "feat: desktop-раскладка логина и welcome"`

---

### Task 8: Финальная проверка

**Files:** нет изменений кода, только верификация.

- [ ] **Step 1: `npm run build`** — без ошибок.
- [ ] **Step 2: Пройти все страницы `(app)`, `(auth)`, `(marketing)` на 375px — визуально идентичны состоянию до правок. Дополнительно: `git diff main -- src | grep '^-'` не должен показывать удаления существующих (не lg:) классов.**
- [ ] **Step 3: Пройти все страницы на 1024px, 1280px, 1440px, 1920px — нет «телефона по центру чёрного фона», нет горизонтального скролла, нет обрезанных карточек.**
- [ ] **Step 4: Открыть `/admin` — убедиться, что не менялось и работает как раньше.**
- [ ] **Step 5:** `grep -rE '#[0-9a-fA-F]{3,8}' src/components src/app` — новые правки не должны вносить хардкод-цвета (сравнить со списком файлов до начала работы, если grep находит что-то новое — заменить на токен).
- [ ] **Step 6: Финальный commit (если остались правки после проверки).**
