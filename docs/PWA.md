# PWA: Android и iOS

Цель — приложение, которое ставится на домашний экран, открывается без адресной строки
и работает на объекте без сети. Магазины приложений не используем.

Основано на гайде Next 16 `01-app/02-guides/progressive-web-apps.md` (сверено с версией
в `node_modules`, не по памяти).

---

## 1. Манифест

Next генерирует его сам из `src/app/manifest.ts` — отдельный `public/manifest.json`
не нужен.

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'K work',
    short_name: 'K work',
    description: 'Облік робочих годин і звітів',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#142611',   // = --bg, чтобы splash не мигал белым
    theme_color: '#142611',
    lang: 'uk',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

`background_color` обязан совпадать с `--bg`. Иначе при запуске на секунду вспыхивает
белый экран — самая заметная примета «это сайт, а не приложение».

---

## 2. Иконки

| Файл | Размер | Для чего |
|---|---|---|
| `icon-192.png`, `icon-512.png` | 192, 512 | Android, общий случай |
| `maskable-512.png` | 512 | Android обрезает иконку под форму лаунчера |
| `apple-touch-icon.png` | 180 | iOS; **без прозрачности** — Safari зальёт её чёрным |
| `favicon.ico` | 32 | вкладка браузера |

Логотип «K» — жёлтый знак на фоне `--bg`. У maskable-версии значок занимает центральные
80%, остальное — фон: safe zone у круглых лаунчеров съедает края.

---

## 3. Android

Работает почти само:

- манифест + HTTPS (Vercel даёт по умолчанию) + service worker → Chrome сам предлагает установку;
- перехватываем `beforeinstallprompt`, чтобы показать свою кнопку «Встановити» на
  welcome-экране в нужный момент, а не когда решит браузер;
- `theme_color` красит системную строку статуса в цвет фона.

---

## 4. iOS — здесь всё сложнее

Safari поддерживает PWA частично, и об это спотыкаются все. Что важно знать заранее:

| Ограничение | Что делаем |
|---|---|
| `beforeinstallprompt` не существует | показываем текстовую инструкцию: «Поділитися → На екран «Додому»». Определяем iOS + не-standalone через `matchMedia('(display-mode: standalone)')` |
| Splash-экран не берётся из манифеста | добавляем `apple-touch-startup-image` на ключевые размеры, либо мирится с однотонным фоном |
| Строка статуса | `apple-mobile-web-app-status-bar-style: black-translucent` + `viewportFit: 'cover'` + `env(safe-area-inset-*)` — иначе шапка уезжает под «чёлку» |
| Push только с iOS 16.4+ и только для установленного приложения | пуши — последний этап, приложение обязано быть полезным без них |
| **IndexedDB чистится после ~7 дней без визитов** | главный риск для офлайн-очереди |
| Нет Background Sync API | синхронизируем при открытии приложения и по событию `online`, а не в фоне |

Про последние два пункта подробно — в [ADR-0003](decisions/0003-oflayn-cherez-ochered.md).
Коротко: несинхронизированный отчёт **не должен** лежать в телефоне неделю. Пока он не
ушёл, показываем на карточке явную метку «не відправлено» и предлагаем повтор при
каждом открытии.

Метаданные в корневом `layout.tsx`:

```ts
export const metadata: Metadata = {
  title: 'K work',
  appleWebApp: { capable: true, title: 'K work', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#142611',
  viewportFit: 'cover',
  userScalable: false,   // случайный зум двумя пальцами в перчатках — частая помеха
}
```

---

## 5. Service worker

Берём **Serwist** — Next 16 сам рекомендует его в гайде по PWA и даёт пример под
Turbopack. Писать свой SW руками можно, но версионирование кэша при каждом деплое
Next — та ещё работа.

Стратегии кэширования:

| Что | Стратегия | Почему |
|---|---|---|
| Оболочка приложения (JS, CSS, шрифт) | precache | должна открываться офлайн мгновенно |
| Навигация по экранам | NetworkFirst с офлайн-фолбэком | свежее, если есть сеть |
| Иконки, статика | CacheFirst | не меняются |
| Запросы к Supabase | **не кэшируем в SW** | данными управляет `sync` через IndexedDB — два кэша на одни данные гарантированно разойдутся |

Заголовки для `/sw.js` в `next.config.ts` (из гайда): `Content-Type: application/javascript`,
`Cache-Control: no-cache, no-store, must-revalidate`. Без второго пользователи месяцами
сидят на старой версии приложения.

Плюс общие заголовки безопасности: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 6. Индикатор сети

Next 16 даёт готовое:

```ts
// next.config.ts
experimental: { useOffline: true }
```

```tsx
'use client'
import { useOffline } from 'next/offline'
```

Флаг включает не только хук, но и автоповтор заблокированных навигаций и Server
Actions. Хуком рисуем баннер «Немає зв'язку — звіти збережуться і відправляться пізніше»
поверх таб-бара.

API экспериментальный: если сломается при обновлении Next — замена на `navigator.onLine`
плюс слушатели `online`/`offline` занимает десять строк. Риск ограничен.

---

## 7. Чек-лист приёмки

- [ ] Ставится на Android из Chrome, иконка не обрезана в лаунчере
- [ ] Ставится на iOS через «Поділитися», иконка не чёрная
- [ ] Запускается без адресной строки, при старте не мигает белым
- [ ] Шапка и таб-бар не заезжают под «чёлку» и системную полосу
- [ ] В авиарежиме открывается и показывает последние отчёты
- [ ] В авиарежиме отчёт сохраняется, помечен «не відправлено» и уходит при появлении сети
- [ ] Lighthouse PWA — без критических замечаний
- [ ] Новый деплой подхватывается на телефоне после перезапуска, а не через сутки
