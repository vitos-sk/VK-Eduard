# Офлайн-первое PWA — план реализации

> **Для исполнителя:** выполнять задачи по порядку (`superpowers:executing-plans`). Шаги с чекбоксами `- [ ]`.

**Цель:** после установки и одного захода онлайн все основные экраны, шрифты, скрипты и миниатюры (объекты, аватары) открываются без интернета; кнопки, которым нужна сеть, это показывают заранее.

**Архитектура:** тот же сервис-воркер без библиотек. Чистая логика (разбор файлов из HTML/CSS, вытеснение, ключи) — в `public/sw-lib.js` и тестируется vitest'ом. Версия воркера = номер сборки через `/sw-version.js` (меняется каждый деплой → телефон видит обновление). Прогрев: воркер открывает страницы по списку от клиента и сохраняет HTML + скрипты + шрифты + миниатюры. Миниатюры перехватываются при показе (cache-first по пути файла без токена).

**Стек:** Next 16.3 (App Router, `proxy.ts`), React 19, vitest 5, обычный JS в воркере.

**Spec:** `docs/superpowers/specs/2026-10-21-offline-first-pwa-design.md`

## Global Constraints

- Только русский язык в комментариях и документации, стиль комментариев как в соседнем коде (по-русски, объясняют «почему»).
- Никаких хардкод-цветов в React/Tailwind (`CLAUDE.md`). Единственное исключение — `public/offline.html` (статика вне React), цвета — зеркало `tokens.css`, как уже сделано.
- Новые кнопки/поля — только компонентами из `src/components/ui/`; новый вариант — в дизайн-систему и `docs/DESIGN-SYSTEM.md`.
- Тексты на трёх языках: `uk.ts` — эталон формы, `en.ts` и `nl.ts` с теми же ключами.
- **Фото отчётов (бакет `entry-photos`) воркер не кэширует.** Кэшируются только бакеты `site-photos` и `avatars`.
- Воркер подключается только в боевой сборке (`NODE_ENV === "production"`), как сейчас.
- Next 16 имеет ломающие изменения: перед route handler прочитать `node_modules/next/dist/docs/01-app/` (раздел про Route Handlers).
- Коммиты **не делаем**: в рабочем дереве чужие незакоммиченные правки в файлах, которые мы тоже трогаем (`i18n/*`, `docs/ARCHITECTURE.md`, `ChatThread.tsx`, `ReportDetail.tsx`). Коммитить только по просьбе автора. Вместо коммита — шаг «проверка» (`npx vitest run`, `npx tsc --noEmit`, `npm run lint`).
- Лимиты: страницы-детали — 30 последних; миниатюры — 600 файлов; ожидание сети при наличии копии — 2500 мс; прогрев раз в 6 часов.

## Review Focus

Чего спека прямо не требует, но человек на это наткнётся (каждому пункту — тест или проверка в задаче-владельце):

1. **Выход из аккаунта** должен стереть и страницы, и миниатюры; прогрев, который шёл в этот момент, не должен снова наполнить кэш (Task 3, поколение `generation`).
2. **Сессия истекла:** прогрев получает редирект на `/welcome` — это нельзя сохранять под адресом `/hours` (Task 1 `isCacheablePage`, Task 3).
3. **Переполнение хранилища** (`QuotaExceededError`) не должно ломать открытие страницы или показ картинки (Task 3, Task 4: запись в кэш в `try/catch`).
4. **Протухшая подписанная ссылка** на миниатюру и пустой кэш: картинка не загрузится, интерфейс показывает заглушку, а не битый значок (Task 6 `SafeImg`, в том числе когда ошибка случилась до гидрации).
5. **Новый деплой:** старые файлы и страницы удаляются только после полного прогрева; пока его нет, работают старые (Task 3).

---

### Task 1: Чистая логика воркера (`public/sw-lib.js`)

**Files:**
- Create: `public/sw-lib.js`
- Test: `src/lib/offline/sw-lib.test.ts`

**Interfaces:**
- Produces: объект `self.VKSW` (в тестах — через `vm`) со свойствами:
  - `THUMB_BUCKETS: readonly ["site-photos", "avatars"]`
  - `extractStaticAssets(text: string, baseUrl: string): string[]` — уникальные пути `/_next/static/…` из HTML (`src`, `href`, строки RSC) и CSS (`url(...)`, в том числе относительные, разрешаются от `baseUrl`), в порядке появления
  - `extractThumbUrls(html: string, buckets: readonly string[]): string[]` — полные `https://…/storage/v1/object/sign/<bucket>/…?token=…` только указанных бакетов, `&amp;` → `&`, без повторов
  - `isThumbUrl(url: URL, buckets: readonly string[]): boolean`
  - `thumbKey(url: URL): string` — `origin + pathname` (без токена)
  - `injectSavedAt(html: string, savedAt: number): string` — вставляет `<meta name="vk-saved-at" content="<savedAt>">` перед первым `</head>`; нет `</head>` — возвращает как есть
  - `isCacheablePage(res: { ok: boolean; type: string; redirected: boolean }): boolean` — `ok && type === "basic" && !redirected`
  - `pickPageEvictions(entries: { key: string; savedAt: number; core: boolean }[], limit: number): string[]` — ключи не-`core` записей, которые нужно удалить, чтобы не-`core` осталось не больше `limit`; удаляются самые старые
  - `overflowKeys(keys: readonly string[], max: number): string[]` — самые старые (начало массива) сверх `max`

- [ ] **Step 1: Написать падающие тесты** в `src/lib/offline/sw-lib.test.ts`. Загрузка: `readFileSync("public/sw-lib.js")` → `vm.runInNewContext(source, { self: ctx })`, где `ctx = {}`; брать `ctx.VKSW`. Утверждения:
  - `extractStaticAssets('<script src="/_next/static/chunks/a.js"></script><link href="/_next/static/css/b.css">', "https://x.test/")` → `["/_next/static/chunks/a.js", "/_next/static/css/b.css"]`; повтор одного пути даёт один элемент
  - `extractStaticAssets("@font-face{src:url(../media/f.woff2)}", "https://x.test/_next/static/css/b.css")` → `["/_next/static/media/f.woff2"]`; `url(/other/x.png)` не попадает
  - `extractThumbUrls` на HTML с `<img src="https://p.supabase.co/storage/v1/object/sign/site-photos/a/b.webp?token=T1">`, такой же ссылкой на `avatars` и ссылкой на `entry-photos` с `THUMB_BUCKETS` → две ссылки (без `entry-photos`); `?token=T1&amp;x=1` → `&`
  - `isThumbUrl(new URL("https://p.supabase.co/storage/v1/object/sign/entry-photos/a.webp?token=1"), THUMB_BUCKETS)` → `false`; для `site-photos` → `true`; обычный `https://p.supabase.co/rest/v1/x` → `false`
  - `thumbKey(new URL("https://p.supabase.co/storage/v1/object/sign/avatars/a.webp?token=1"))` → `"https://p.supabase.co/storage/v1/object/sign/avatars/a.webp"`
  - `injectSavedAt("<html><head><title>x</title></head>", 5)` содержит `<meta name="vk-saved-at" content="5"></head>`; HTML без `</head>` не меняется
  - `isCacheablePage`: `{ok:true,type:"basic",redirected:false}` → true; `redirected:true`, `ok:false`, `type:"opaque"` → false
  - `pickPageEvictions([{key:"/",savedAt:1,core:true},{key:"/a",savedAt:2,core:false},{key:"/b",savedAt:3,core:false},{key:"/c",savedAt:4,core:false}], 2)` → `["/a"]`; `core` никогда не возвращается; при `limit` ≥ числу не-core → `[]`
  - `overflowKeys(["a","b","c","d"], 3)` → `["a"]`; `max` ≥ длины → `[]`
- [ ] **Step 2: Запустить** `npx vitest run src/lib/offline/sw-lib.test.ts`. Ожидается: FAIL (нет файла).
- [ ] **Step 3: Реализовать `public/sw-lib.js`.** Обёртка: `(function (root) { …; root.VKSW = { … }; })(self)`, без `import`/`module`. Регулярки: пути — `/\/_next\/static\/[^"'\\\s)(<>]+/g` по HTML; для CSS — перебор `url\(\s*['"]?([^)'"]+)` и `new URL(raw, baseUrl)`; ссылки миниатюр — `https:\/\/[^"'\\\s<>)]+\/storage\/v1\/object\/sign\/(?:BUCKETS)\/[^"'\\\s<>)]+`, где `BUCKETS` собирается из аргумента с экранированием.
- [ ] **Step 4: Запустить тест.** Ожидается: PASS.

---

### Task 2: Версия сборки, `/sw-version.js`, заголовки, прокси

**Files:**
- Create: `src/app/sw-version.js/route.ts`
- Test: `src/app/sw-version.js/route.test.ts`
- Modify: `next.config.ts`, `src/proxy.ts:136` (matcher)

**Interfaces:**
- Produces: `GET /sw-version.js` → тело `self.VK_VERSION = "<build id>";\n`, `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `export const dynamic = "force-dynamic"`. Номер — `process.env.NEXT_PUBLIC_BUILD_ID`, если нет — `"dev"`.
- Consumes (Task 3): `self.VK_VERSION: string` после `importScripts("/sw-version.js")`.

- [ ] **Step 1: Тест `route.test.ts`:** `vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc123")`, `const res = await GET()`; `await res.text()` равно `self.VK_VERSION = "abc123";\n`; заголовок `cache-control` содержит `no-store`; тип содержит `application/javascript`. Второй тест: без переменной — `"dev"`.
- [ ] **Step 2: Запустить** `npx vitest run src/app/sw-version.js/route.test.ts` → FAIL.
- [ ] **Step 3: Прочитать документацию Route Handlers в `node_modules/next/dist/docs/01-app/`**, затем реализовать `GET` в `route.ts` (имя папки с точкой — как у `robots.txt`).
- [ ] **Step 4: `next.config.ts`:** в `env` добавить `NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now())`; в `headers()` добавить такой же блок, как для `/sw.js`, для `/sw-lib.js` (`no-cache, no-store, must-revalidate`, JS-тип). Подправить комментарий над `headers()`.
- [ ] **Step 5: `src/proxy.ts` matcher:** добавить `sw-lib.js|sw-version.js` рядом с `sw.js|offline.html` и дополнить комментарий (иначе обновление воркера у вышедшего пользователя получит редирект на `/welcome`).
- [ ] **Step 6: Запустить тест** → PASS; `npx tsc --noEmit` без ошибок.

---

### Task 3: Сервис-воркер: версии, прогрев страниц, штампы, «недавние», очистка

**Files:**
- Modify: `public/sw.js` (переписать блок кэширования; блок Push и `notificationclick` не менять)

**Interfaces:**
- Consumes: `self.VKSW` (Task 1), `self.VK_VERSION` (Task 2): в начале файла `importScripts("/sw-lib.js", "/sw-version.js")`.
- Produces (протокол с клиентом, Task 5):
  - клиент → воркер: `{ type: "warm", paths: string[] }`, `{ type: "snapshot", path: string }`, `{ type: "clear" }`
  - воркер → клиенты: `{ type: "sw-updated" }` при активации, если до этого были кэши предыдущей версии
  - в сохранённой копии страницы: заголовки `x-vk-saved-at` (мс, строка), `x-vk-core` (`"1"` для страниц прогрева) и `<meta name="vk-saved-at">` в `<head>`

Поведение (реализует исполнитель, логику решения фиксируем здесь):
- Имена кэшей: `vk-static-${VK_VERSION}`, `vk-pages-${VK_VERSION}`; миниатюры — `vk-thumbs` без версии (Task 4).
- `install`: положить `/offline.html` в страницы текущей версии, `skipWaiting()`. `activate`: `clients.claim()`; если есть кэши `vk-static-*`/`vk-pages-*` другой версии — разослать `sw-updated`. **Старые кэши на активации не удалять.**
- Поиск в кэше — по всем версиям (`caches.match`, для страниц и статики), запись — в кэши текущей версии. Так до завершения прогрева работают старые копии.
- `fetch`, навигация: сеть сначала; если копия есть — ждать сеть не дольше 2500 мс (`SLOW_NETWORK_MS`), поздний ответ всё равно сохранить (`event.waitUntil`); сохранять только `VKSW.isCacheablePage`; ключ — `origin + pathname`; сохранение — `text()` → `injectSavedAt` → `new Response` с заголовками `x-vk-saved-at`, `x-vk-core` (сохранить значение старой копии); ответ браузеру — оригинальный, нетронутый. Нет сети: копия → `/offline.html` → `Response.error()`. Любая запись в кэш — в `try/catch`.
- `fetch`, статика (`/_next/static/`, `/icons/`, `/apple-touch-icon.png`, `/favicon.ico`; `/splash/` оставить): сначала кэш, при промахе сеть и сохранение. 
- `warm(paths)` (одновременно один: пока идёт, повторный вызов возвращает тот же промис): по очереди, пауза 300 мс между страницами; для каждой — `fetch(path, {credentials:"same-origin"})`, `isCacheablePage` иначе пропуск; сохранить как `core`; из HTML `extractStaticAssets` → скачать недостающие; для каждого `.css` — скачать текст, `extractStaticAssets(text, cssUrl)` → скачать (шрифты); `extractThumbUrls(html, THUMB_BUCKETS)` → сохранить недостающие миниатюры (Task 4). Перед каждым шагом сверять `generation` (счётчик, `clear` увеличивает) — изменился → тихо выйти. В конце, **только если все страницы сохранены без ошибок** и `generation` тот же: удалить кэши `vk-static-*`/`vk-pages-*` других версий.
- `snapshot(path)`: пропустить, если копия моложе 6 часов (`x-vk-saved-at`); иначе сохранить как не-`core` тем же кодом, что и прогрев страницы; затем `pickPageEvictions(...)` по записям страниц текущей версии (кроме `/offline.html`) с лимитом 30 и удалить.
- `clear`: `generation += 1`; удалить все кэши `vk-*` (включая `vk-thumbs`), заново положить `/offline.html` в страницы текущей версии.

- [ ] **Step 1: Переписать `public/sw.js`** по описанию выше. Сохранить блок `/* ── Push-напоминания */` без изменений. В шапке-комментарии обновить описание (что кэшируется, как версия связана со сборкой).
- [ ] **Step 2: Синтаксис и lint:** `node --check public/sw.js` и `npx eslint public/sw.js public/sw-lib.js` — без ошибок (если eslint ругается на глобалы воркера — добавить `/* eslint-env serviceworker */`-эквивалент в виде комментария `/* global self, caches, clients, importScripts */`).
- [ ] **Step 3: Проверка на стенде — Task 8** (воркер вживую проверяется только там).

---

### Task 4: Миниатюры в воркере

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Consumes: `VKSW.isThumbUrl`, `VKSW.thumbKey`, `VKSW.overflowKeys`, `VKSW.THUMB_BUCKETS`.
- Produces: `thumbFirst(request: Request): Promise<Response>`; `storeThumb(url: string): Promise<void>` (используется прогревом из Task 3).

- [ ] **Step 1: В `fetch` до проверки «тот же origin»** добавить ветку: `request.destination === "image" && isThumbUrl(url, THUMB_BUCKETS)` → `event.respondWith(thumbFirst(request))`. Другие чужие запросы воркер по-прежнему не трогает.
- [ ] **Step 2: `thumbFirst`:** открыть `vk-thumbs`; `cache.match(thumbKey(url), { ignoreVary: true })` (Supabase может ставить `Vary`, ключ без токена и без `Origin`) → попадание отдаём. Промах: `fetch(url, { mode: "cors", credentials: "omit" })` (не `no-cors`: «непрозрачные» ответы Chrome считает в квоте как ~7 МБ каждый); если `response.ok` — положить под `thumbKey` клон (в `try/catch`), затем `overflowKeys` по `cache.keys()` и удалить лишние (самые старые, лимит 600). Ошибка сети без копии → `Response.error()`.
- [ ] **Step 3: `storeThumb(url)`:** то же сохранение без ответа браузеру; не качать, если уже есть.
- [ ] **Step 4: `node --check public/sw.js`**, lint. Живая проверка — Task 8.

---

### Task 5: Клиент: регистрация, список прогрева, «недавние», постоянное хранилище

**Files:**
- Create: `src/lib/offline/warm-paths.ts`
- Test: `src/lib/offline/warm-paths.test.ts`
- Modify: `src/components/layout/ServiceWorkerRegister.tsx`, `src/components/layout/AppShell.tsx` (передать `role`)

**Interfaces:**
- Produces (`warm-paths.ts`):
  - `WARM_EVERY_MS = 6 * 60 * 60 * 1000`
  - `warmPathsFor(role: "boss" | string): string[]` — общий список: `/`, `/objects`, `/hours`, `/hours/salary`, `/reports`, `/chats`, `/checklists`, `/more`, `/more/profile`, `/more/language`, `/more/notifications`, `/more/about`, `/time/manual`, `/reports/new`; для `"boss"` дополнительно `/dashboard`, `/more/team`, `/more/company`
  - `isSnapshotPath(pathname: string): boolean` — истина для `/objects/<x>`, `/reports/<x>`, `/chats/<x>`, `/checklists/<x>` (один сегмент после раздела), ложь для `new` в любом из них, для `/objects/<x>/edit`, `/time/manual/<id>`, `/c/<token>`, и для самих списков
- Consumes: протокол из Task 3.

- [ ] **Step 1: Тесты `warm-paths.test.ts`:** `warmPathsFor("worker")` содержит `/objects` и не содержит `/dashboard`; `warmPathsFor("boss")` содержит `/dashboard`, `/more/team`; нет повторов. `isSnapshotPath`: `/objects/123` → true; `/objects/new`, `/objects/123/edit`, `/objects`, `/reports/new`, `/c/abc`, `/time/manual/5` → false; `/chats/9`, `/checklists/7`, `/reports/42` → true.
- [ ] **Step 2: Запустить** `npx vitest run src/lib/offline/warm-paths.test.ts` → FAIL.
- [ ] **Step 3: Реализовать `warm-paths.ts`.**
- [ ] **Step 4: Переписать `ServiceWorkerRegister({ role })`:** `register("/sw.js", { scope: "/", updateViaCache: "none" })`; после `ready` — `navigator.storage?.persist?.()` (в `try/catch`); прогрев через `postMessage({type:"warm", paths: warmPathsFor(role)})` — как сейчас по таймеру 4 с и ключу `vk-warm-at`, но не при `navigator.connection?.saveData`; слушать `message` от воркера: `sw-updated` → прогрев немедленно, минуя 6-часовой ключ; `usePathname()` + эффект: если `isSnapshotPath` и онлайн — через 2 с `postMessage({type:"snapshot", path})`, таймер сбрасывается при смене пути. Прогрев календаря (`preloadCalendar`) оставить.
- [ ] **Step 5: `AppShell`:** `<ServiceWorkerRegister role={profile.role} />`.
- [ ] **Step 6: Запустить тесты, `npx tsc --noEmit`, `npm run lint`** → без ошибок.

---

### Task 6: Заглушки фото (`SafeImg`) в миниатюрах

**Files:**
- Create: `src/components/shared/SafeImg.tsx`
- Modify: `src/components/shared/Thumb.tsx`, `src/components/ui/card-photo.tsx`, `src/components/ui/avatar.tsx`

**Interfaces:**
- Produces: `SafeImg(props: { src: string; fallback: ReactNode; className?: string; loading?: "lazy" | "eager"; alt?: string })` — клиентский компонент (`"use client"`), рисует `<img>`; если картинка не загрузилась — рисует `fallback`.
- Consumes: ничего из других задач.

- [ ] **Step 1: Реализовать `SafeImg`.** Состояние `failed` сбрасывается при смене `src` (ключ по `src`). `onError` → `failed = true`. **Гонка с гидрацией:** при офлайн-запуске ошибка загрузки случается до того, как React повесит обработчик, поэтому в эффекте на монтирование проверять `ref.current?.complete && ref.current.naturalWidth === 0` → `failed = true`. Комментарий в коде поясняет, зачем эта проверка.
- [ ] **Step 2: `Thumb`:** в ветке `photoUrl` — `SafeImg` с тем же `className`, `fallback` — тот же блок с `<Scene>`, что в ветке без фото (вынести общий кусок, чтобы не дублировать). `Thumb` остаётся без `"use client"` (его используют серверные страницы; `SafeImg` — граница клиента).
- [ ] **Step 3: `CardPhoto`:** `SafeImg` с `fallback` — тот же `<span>` с иконкой `ImageOff`.
- [ ] **Step 4: `Avatar`:** `SafeImg` с `fallback` = `icon ?? initials`.
- [ ] **Step 5: `npx tsc --noEmit`, `npm run lint`.** Визуальная проверка — Task 8.

---

### Task 7: Честный интерфейс без сети: время копии, `NetworkButton`, умная заглушка

**Files:**
- Create: `src/lib/offline/savedAt.ts`, `src/components/ui/network-button.tsx`
- Test: `src/lib/offline/savedAt.test.ts`
- Modify: `src/lib/offline/hooks.ts`, `src/components/layout/SyncBanner.tsx`, `src/lib/i18n/{uk,en,nl}.ts` (блок `offline`), `public/offline.html`, места использования `NetworkButton` (ниже), `docs/DESIGN-SYSTEM.md`

**Interfaces:**
- Produces:
  - `formatSavedAt(savedAt: number, now: number, locale: string): string` — тот же локальный день → только время («14:32»); иначе день, месяц и время («21 жовт., 14:32»); через `Intl.DateTimeFormat`
  - `useSavedAt(): number | null` (в `hooks.ts`) — читает `meta[name="vk-saved-at"]` один раз при монтировании; `null`, если мета нет (страница пришла из сети)
  - `NetworkButton(props: ButtonProps & { hint?: boolean })` (клиентский): `Button` с `disabled` при отсутствии сети (`useOnline`); при `hint !== false` и офлайн рядом показывает `<p role="status">` с `t.offline.needsNetwork`
  - ключи словаря `offline`: `shownSaved: "Показано збережене: {when}"`, `needsNetwork: "Потрібен інтернет"`, `pageSections: "Доступно без інтернету"`
- Consumes: `useOnline`, `fmt`, `useT`.

- [ ] **Step 1: Тест `savedAt.test.ts`** (TZ `Europe/Kyiv` задана в `vitest.config.ts`): время в тот же день содержит `14:32` и не содержит названия месяца; вчерашний день содержит и число, и `14:32`; результат не пустой для `uk`, `en`, `nl`.
- [ ] **Step 2: Запустить** → FAIL; **реализовать `savedAt.ts`**; → PASS.
- [ ] **Step 3: Словари:** добавить три ключа в `offline` во всех трёх языках. Переводы: en — «Showing saved copy: {when}», «Internet required», «Available offline»; nl — «Opgeslagen kopie getoond: {when}», «Internet nodig», «Offline beschikbaar».
- [ ] **Step 4: `useSavedAt` и `SyncBanner`:** при `!online` и `savedAt !== null` — вторая строка `OfflineBanner` с `fmt(t.offline.shownSaved, { when: formatSavedAt(savedAt, Date.now(), locale) })`. Локаль — как её получают соседние компоненты (`useLocale`/словарь из `lib/i18n/client`).
- [ ] **Step 5: `NetworkButton`** + запись в `docs/DESIGN-SYSTEM.md` (когда использовать: действие, которому нужна сеть).
- [ ] **Step 6: Применить `NetworkButton`** вместо `Button` (по одной главной кнопке): отправка отчёта `ReportForm.tsx` (кнопка с `onClick={handleSubmit}`), отправка в чате `ChatThread.tsx` (кнопка `t.chats.send`; `hint={false}` — она иконка в строке ввода), сохранение объекта `ObjectForm.tsx` (кнопка `handleSave`), сохранение имени `EditNameForm.tsx`, кнопки загрузки фото в `ReportPhotoUploader.tsx` и `SitePhotoUploader.tsx` (`hint={false}`). Остальное не трогать. Кнопку «Додати час» (`ManualTimeScreen`) **не** менять: она работает офлайн через очередь.
- [ ] **Step 7: `public/offline.html`:** добавить логотип (inline SVG — пути из `components/brand/Logo.tsx`, цвета: знак `#1f5a17`, пирамидка `#f5c43c`), заголовок и текст как сейчас, под ними блок «Доступно без інтернету»: скрипт читает `caches.keys()` → имена `vk-pages-*` → ключи → пути, пересекает с таблицей разделов (`/`, `/objects`, `/hours`, `/reports`, `/chats`, `/checklists`, `/more` с названиями на uk/en/nl, как в словаре `nav`) и рисует ссылки; если API недоступен или пусто — блок скрыт. Кнопка «Спробувати ще раз» остаётся. Цвета — зеркало токенов, комментарий в шапке сохранить.
- [ ] **Step 8: Запустить** `npx vitest run`, `npx tsc --noEmit`, `npm run lint` → без ошибок (кроме уже существовавших — сравнить с `git stash`-свободным чтением вывода, не стэшить).

---

### Task 8: Проверка на стенде (воркер вживую)

**Files:**
- Создать вне проекта: `/private/tmp/claude-501/-Users-vs-Developer-VK-Eduard/9d1f2092-ce19-4f0d-81f6-1ca68c311c7f/scratchpad/sw-harness/` (маленький Node-сервер)

Приложение с входом проверить автоматически нельзя (нет доступа к базе), поэтому воркер проверяется на стенде, который имитирует нужное: страницы с ссылками на `/_next/static/…`, CSS со шрифтом, картинки по путям `/storage/v1/object/sign/{site-photos,avatars,entry-photos}/…`, `/sw-version.js` с меняемой версией, редирект на `/welcome`.

- [ ] **Step 1: Поднять стенд** (Node `http`, порт 4100), отдающий реальные `public/sw.js`, `public/sw-lib.js`, `public/offline.html` и подставные страницы `/`, `/hours`, `/objects`.
- [ ] **Step 2: Через Chrome (CDP/расширение) в чистом профиле:** открыть `/`, зарегистрировать воркер, отправить `warm`. Проверить `caches.keys()`: есть `vk-static-<v>`, `vk-pages-<v>`, `vk-thumbs`; в миниатюрах — `site-photos` и `avatars`, **нет** `entry-photos`.
- [ ] **Step 3: Остановить стенд** (имитация «нет сети») → открыть каждую прогретую страницу заново: открывается из копии; `meta[name=vk-saved-at]` есть; страница вне списка → `offline.html` со ссылками на сохранённые разделы; картинка `site-photos` грузится, `entry-photos` — нет.
- [ ] **Step 4: Новая версия:** поднять стенд с другим `VK_VERSION` → воркер обновился, пришло `sw-updated`, после прогрева кэшей прежней версии нет. Затем при остановленном сервере — прежние страницы по-прежнему открываются.
- [ ] **Step 5: `clear`:** `postMessage({type:"clear"})` → остаётся только `/offline.html`, `vk-thumbs` пуст; запущенный перед этим долгий прогрев не наполняет кэш заново.
- [ ] **Step 6: Редирект:** стенд отвечает на `/hours` редиректом на `/welcome` → после прогрева `/hours` в кэше нет.
- [ ] **Step 7: Записать результаты** (что подтверждено, что нет — честно) для отчёта автору. Если Chrome-инструменты недоступны — сказать об этом прямо и описать, что проверено только тестами и сборкой.

---

### Task 9: Документы, сборка, итог

**Files:**
- Modify: `docs/PWA.md` (разделы 4, 6, 7), `docs/SCREENS.md:79`, `docs/ARCHITECTURE.md` (раздел 8, одна-две строки; в файле уже есть чужие правки — править точечно), `docs/DESIGN-SYSTEM.md` (если не сделано в Task 7)
- Create: `docs/decisions/0013-oflayn-polnyj-prognev-i-miniatyury.md`

- [ ] **Step 1: `docs/PWA.md`:** описать прогрев по полному списку, «недавние» страницы (30), миниатюры (бакеты, потолок 600, фото отчётов не кэшируются), версию воркера = номер сборки и порядок чистки, плашку с временем копии, `NetworkButton`; добавить пункты в чек-лист приёмки раздела 7 (все экраны в авиарежиме, миниатюры видны, фото отчётов — нет, обновление версии).
- [ ] **Step 2: ADR 0013** в формате соседних (контекст, решение, последствия): прогрев по списку вместо кэша RSC; версия через `/sw-version.js`; миниатюры cache-first по пути без токена; фото отчётов не кэшируем.
- [ ] **Step 3: Обновить `docs/superpowers/specs/…-design.md`** статусом «реализовано» с датой и оговоркой, что живая проверка на устройствах — за автором.
- [ ] **Step 4: Итоговая проверка:** `npx vitest run` (все тесты), `npx tsc --noEmit`, `npm run lint`, `npm run build` (сборка без env Supabase может ругаться на переменные — если так, сказать об этом, не выдавать за успех).
- [ ] **Step 5: Краткий отчёт автору** (простыми словами, что сделано / проверено / что нужно от него: проверка на реальном телефоне по чек-листу, коммит).
