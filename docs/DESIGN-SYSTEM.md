# Дизайн-система «K group» — вариант B «Дневной свет»

Светлая тема, единственная. Тёплая бумага, лесной зелёный (Primary), жёлтый маркер (Accent).
Живая витрина с тремя вариантами, из которых выбран B: [`design-preview.html`](./design-preview.html).

## Единый источник правды

- `src/design-system/tokens.css` — все цвета, радиусы, тени, высоты контролов. Хекс-коды живут только здесь.
- `src/design-system/tokens.ts` — зеркало нескольких значений для мест без CSS-переменных (PDF, manifest, `theme-color`). Сверяется с CSS тестом `tokens.test.ts`.
- Иконки PWA (`scripts/generate-app-icons.mjs`) читают цвета прямо из `tokens.css`.

## Токены (Tailwind-классы)

| Группа | Токены |
|---|---|
| Поверхности | `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-field`, `border-border`, `border-border-strong` |
| Текст | `text-text`, `text-text-muted`, `text-text-dim` |
| Главные | `primary` / `secondary` / `accent` + `-hover`, `on-primary`, `on-secondary`, `on-accent` |
| Статусы | `success`, `warning`, `danger` (заливки) и `success-fg`, `warning-fg`, `danger-fg` (текст на светлом) |
| Слои | `bg-overlay` (подложка модалок и листов), `bg-scrim` / `text-on-scrim` (поверх фото) |
| Радиусы | `rounded-sm` 8, `rounded-md` 10, `rounded-ctl` 12, `rounded-card` 16, `rounded-modal` 20 |
| Тени | `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-accent` |
| Высоты | `h-ctl-sm` 36, `h-ctl-md` 44, `h-ctl-lg` 48, `h-ctl-xl` 56, `h-field` 52 |

## Компоненты — `src/components/ui/`

`Button` (primary, secondary, accent, outline, ghost, danger, danger-outline, scrim, field; `loading`, `block`), `Input`, `Textarea`, `Field`, `Select`, `Checkbox` / `CheckMark`, `Radio` / `RadioGroup`, `Toggle`, `Chip`, `Card` (`tone`, `padding`, `interactive`, `selected`), `Badge`, `Modal`, `Drawer`, `Popover`, `Calendar`, `Spinner`, `Skeleton`. Составной `SearchField` лежит в `components/shared/`.

## Осознанные исключения

- `app/(app)/more/page.tsx` — цвет аватара считается из `profile.avatar_hue` (данные пользователя, а не палитра).
- `Card asChild interactive` оборачивает нативный `<button>` / `<Link>` — так карточка целиком кликабельна.
