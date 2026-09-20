@AGENTS.md

## Дизайн-система

Источник правды — `src/design-system/tokens.css` (описание и таблица токенов: `docs/DESIGN-SYSTEM.md`, витрина: `docs/design-preview.html`). Компоненты — `src/components/ui/`.

- Никогда не хардкодить цвета (`#hex`, `rgb()`, `hsl()`, `text-white`, `bg-black/…`, `bg-red-500`), только токены из `tokens.css` (`bg-primary`, `text-text-muted`, `text-danger-fg`…).
- Никогда не делать новые кнопки, поля, селекты, чекбоксы, карточки, бейджи и модалки самописными `<button>` / `<input>` / `<div className="rounded-… border …">`. Использовать `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Toggle`, `Chip`, `Card`, `Badge`, `Modal` из `src/components/ui/`.
- Если нужен новый вариант компонента — добавить его в дизайн-систему (вариант в `cva` компонента, при необходимости токен в `tokens.css`) и описать в `docs/DESIGN-SYSTEM.md`, а не делать локально через `className`.
- Значения, которые нужны вне CSS (PDF, manifest), берутся из `src/design-system/tokens.ts`; после правки `tokens.css` обновить зеркало (тест `tokens.test.ts` это проверяет).
