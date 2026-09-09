# Модель данных

Схема Supabase. **Применена** на этапе 2: `supabase/migrations/0001_init.sql`
и `0002_private_rls_helpers.sql`. Дальнейшие изменения — новой миграцией,
а не правкой этого файла и не руками в дашборде.

Два отличия применённого SQL от черновика ниже:
хелперы `current_company_id()` и `is_boss()` живут в схеме `private`, а не в `public`
(в `public` они торчали наружу как `/rest/v1/rpc/is_boss`), и вьюха `entry_hours`
создана с `security_invoker = true` — иначе она читала бы данные правами создателя
и обходила RLS.

---

## Главное решение

**Одна сущность вместо двух: `work_entries` — запись о работе.**

Время в ней обязательно, описание и фото — нет. Из этого следует всё остальное:

- «**Години**» — витрина тех же записей, сгруппированных по периодам.
- «**Звіти**» — витрина тех же записей, где важны описание и фото.
- Запись без описания существует и это нормально: рабочий отметил часы и ушёл,
  а вечером дописал, что делал. Такая запись помечается «**Без опису**» и её можно
  дополнить одним нажатием.

Почему так, а не две таблицы: как только часы и отчёты живут отдельно, они расходятся.
Рабочий отметил 8 часов, написал отчёт на 6 — и шеф не знает, какой цифре верить.
Здесь такой ситуации нет физически. Подробнее — [ADR-0002](decisions/0002-odna-zapis-vremya-obyazatelno.md).

Несколько записей за день допустимы: был на двух объектах — две записи. Это честнее,
чем одна запись с вложенными интервалами.

---

## Принципы

1. **`work_entries` — единственный источник правды.** Часы нигде не дублируются:
   главная, «Години», «Звіти», сводка шефа и экспорт считают из них.
2. **Арифметика — в базе.** Длительность считает Postgres (generated column), а не
   телефон. Иначе устройство с кривой таймзоной запишет рабочему лишний час.
3. **Права — в базе, а не в коде.** RLS. Если политика запрещает, никакой баг в React
   не покажет чужие данные.
4. **`client_id` на каждой записи.** Uuid генерится телефоном до отправки. Повторная
   отправка не создаёт дубль. Без этого офлайн невозможен.

---

## Таблицы

### `companies`

Фирма. Сейчас одна строка, но `company_id` пронизывает все таблицы и RLS — это дёшево
сегодня и спасает, если фирм станет две.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | uuid pk | |
| `name` | text | |
| `daily_norm_minutes` | int, default 480 | норма по умолчанию для новых сотрудников |
| `created_at` | timestamptz | |

### `profiles`

Сотрудник. `id` совпадает с `auth.users.id` — стандартный приём Supabase, он же даёт
каскад при удалении пользователя.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | uuid pk → `auth.users.id` | |
| `company_id` | uuid → companies | |
| `full_name` | text | «Едуард» |
| `role` | enum `worker` \| `boss` | ровно две роли |
| `daily_norm_minutes` | int, default 480 | сверх неё часы идут в «Додатково» |
| `avatar_hue` | int 0–360 | цветной кружок с буквой на экране команды; фото аватара не храним |
| `is_active` | bool, default true | уволенного не удаляем — его записи нужны в истории |
| `created_at` | timestamptz | |

`is_active` вместо удаления — принципиально: увольнение не должно уносить табель
за прошлый год.

### `sites`

Объект / стройплощадка. Таб «Об'єкти» остаётся, так что сущность полноценная.

| Поле | Тип | Заметка |
|---|---|---|
| `id` | uuid pk | |
| `company_id` | uuid → companies | |
| `name` | text | «Об'єкт С», «Villa Project» |
| `kind` | text, null | «Покрівля», «Фасад» — вид работ |
| `address` | text, null | «Freiburg, Schlossgasse 24» |
| `status` | enum `not_started` \| `in_progress` \| `completed` \| `paused` | справочник уже есть в коде |
| `archived_at` | timestamptz, null | закрытый объект уходит из выпадашки, остаётся в истории |
| `created_at` | timestamptz | |

### `work_entries` — ядро

| Поле | Тип | Обяз. | Заметка |
|---|---|---|---|
| `id` | uuid pk | ✓ | |
| `client_id` | uuid **unique** | ✓ | сгенерирован телефоном; ключ идемпотентности |
| `company_id` | uuid → companies | ✓ | |
| `author_id` | uuid → profiles | ✓ | кто работал |
| `site_id` | uuid → sites | — | null = работа вне объекта |
| `work_date` | date | ✓ | день работы, не дата создания |
| `started_at` | time | ✓ | 07:30 |
| `ended_at` | time | — | **null = смена идёт прямо сейчас** (таймер запущен) |
| `break_start` | time | — | 12:30 |
| `break_end` | time | — | 13:30 |
| `source` | enum `timer` \| `manual` | ✓ | создано таймером или введено руками |
| `description` | text, default `''` | — | «Монтаж покрівельної мембрани…» |
| `break_minutes` | int **generated** | | из break_start/break_end, иначе 0 |
| `total_minutes` | int **generated** | | (ended − started) − break; null пока смена идёт |
| `created_at` / `updated_at` | timestamptz | ✓ | |

**`ended_at` может быть null** — это и есть «работа идёт». Таймер на экране «Години»
не хранит своё состояние отдельно: он просто показывает открытую запись. Поэтому
таймер переживает перезагрузку страницы и смену устройства, чего сейчас в прототипе нет.
Открытая запись у одного человека может быть только одна — это гарантирует частичный
уникальный индекс.

**Сознательно нет поля `status`** (черновик / на проверке / подтверждён). Решено:
шеф ничего не подтверждает, запись попадает в базу сразу. Признак «Без опису» —
это не статус, а просто `description = ''`.

**Почему `time`, а не `timestamptz`:** рабочий вводит «начал в 7:30» в своём локальном
времени и имеет в виду именно 7:30, а не момент на оси UTC. Хранение в `timestamptz`
даёт классический баг «после перевода часов смена стала 7 часов вместо 8». Дата и
время хранятся раздельно и намеренно без таймзоны.

**Переход через полночь** учтён формулой с `% 86400`: ночная смена 22:00 → 06:00
считается как 8 часов, а не минус 16.

**«Відпрацьовано» и «Додатково»** в базе не хранятся — они зависят от нормы сотрудника,
которая может измениться. Считаются во вьюхе: `worked = min(total, norm)`,
`overtime = max(0, total − norm)`.

### `entry_photos`

| Поле | Тип | Заметка |
|---|---|---|
| `id` | uuid pk | |
| `entry_id` | uuid → work_entries **on delete cascade** | |
| `storage_path` | text | путь в приватном бакете `entry-photos` |
| `width` / `height` / `size_bytes` | int | чтобы верстать сетку без «прыжка» |
| `sort_order` | int | порядок как в форме |

Лимит — 6 фото на запись. Файлы сжимаются на телефоне до ~1600px WebP **до** попадания
в очередь синхронизации.

---

## Черновик SQL

```sql
create type user_role    as enum ('worker', 'boss');
create type site_status  as enum ('not_started', 'in_progress', 'completed', 'paused');
create type entry_source as enum ('timer', 'manual');

create table companies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  daily_norm_minutes int  not null default 480,
  created_at         timestamptz not null default now()
);

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  company_id         uuid not null references companies(id),
  full_name          text not null,
  role               user_role not null default 'worker',
  daily_norm_minutes int  not null default 480,
  avatar_hue         int  not null default 90,
  is_active          bool not null default true,
  created_at         timestamptz not null default now()
);

create table sites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id),
  name        text not null,
  kind        text,
  address     text,
  status      site_status not null default 'not_started',
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create table work_entries (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null unique,
  company_id  uuid not null references companies(id),
  author_id   uuid not null references profiles(id),
  site_id     uuid references sites(id),
  work_date   date not null,
  started_at  time not null,
  ended_at    time,                      -- null = смена идёт
  break_start time,
  break_end   time,
  source      entry_source not null default 'manual',
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  break_minutes int generated always as (
    case
      when break_start is null or break_end is null then 0
      else ((extract(epoch from (break_end - break_start))::int + 86400) % 86400) / 60
    end
  ) stored,

  total_minutes int generated always as (
    case when ended_at is null then null else
      ((extract(epoch from (ended_at - started_at))::int + 86400) % 86400) / 60
      - case
          when break_start is null or break_end is null then 0
          else ((extract(epoch from (break_end - break_start))::int + 86400) % 86400) / 60
        end
    end
  ) stored,

  -- перерыв обязан быть парным
  constraint break_pair check ((break_start is null) = (break_end is null)),

  -- защита от опечатки: смена от 1 минуты до 18 часов
  constraint duration_sane check (
    ended_at is null
    or ((extract(epoch from (ended_at - started_at))::int + 86400) % 86400) / 60
       between 1 and 1080
  )
);

-- у одного человека может идти только одна смена
create unique index one_open_entry_per_user
  on work_entries (author_id) where ended_at is null;

create table entry_photos (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references work_entries(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  size_bytes   int,
  sort_order   int not null default 0
);

-- Индексы под реальные запросы, а не «на всякий случай»
create index on work_entries (author_id, work_date desc);   -- «Години», «Мої звіти»
create index on work_entries (company_id, work_date desc);  -- вкладка «Команда», экспорт
create index on work_entries (site_id, work_date desc);     -- часы по объекту
create index on entry_photos (entry_id, sort_order);
```

### Вьюха с разбивкой часов

```sql
create view entry_hours as
select
  e.*,
  p.full_name,
  p.daily_norm_minutes,
  least(e.total_minutes, p.daily_norm_minutes)        as worked_minutes,
  greatest(e.total_minutes - p.daily_norm_minutes, 0) as overtime_minutes,
  (e.description <> '')                               as has_description,
  (select count(*) from entry_photos ph where ph.entry_id = e.id) as photo_count
from work_entries e
join profiles p on p.id = e.author_id;
```

`has_description` и `photo_count` — ровно то, что рисует карточка на экране «Звіти»,
одним запросом вместо N+1.

---

## Права доступа (RLS)

Включаем на всех таблицах. Хелперы, чтобы не переписывать подзапрос в каждой политике:

```sql
create function current_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create function is_boss() returns boolean
language sql stable security definer set search_path = public as $$
  select role = 'boss' from profiles where id = auth.uid()
$$;
```

| Таблица | worker | boss |
|---|---|---|
| `profiles` | читает всех в своей компании, правит только себя | читает и правит всех в компании |
| `sites` | читает | читает и правит |
| `work_entries` | читает и создаёт **только свои**, правит свои за последние 7 дней | читает и правит все в компании |
| `entry_photos` | по правам родительской записи | то же |

Окно правки в 7 дней — чтобы табель за закрытый месяц нельзя было переписать задним
числом. Значение обсуждаемо, но какое-то ограничение нужно.

```sql
alter table work_entries enable row level security;

create policy entries_select on work_entries for select
  using (company_id = current_company_id() and (author_id = auth.uid() or is_boss()));

create policy entries_insert on work_entries for insert
  with check (company_id = current_company_id() and author_id = auth.uid());

create policy entries_update on work_entries for update
  using (
    company_id = current_company_id()
    and (is_boss() or (author_id = auth.uid() and work_date >= current_date - 7))
  );
```

Удаление не разрешено никому, включая шефа: табель — финансовый документ. Ошибочная
запись правится, а не стирается.

### Storage

Бакет `entry-photos` — **приватный**. Путь: `{company_id}/{entry_id}/{uuid}.webp`.
Показ через подписанные ссылки на час. Публичный бакет здесь недопустим: ссылка на
фото объекта утекает вместе с адресом заказчика.

---

## Открытые вопросы

Отвечать сейчас не обязательно, но однажды придётся.

1. **Ставка и деньги.** Нужен ли расчёт зарплаты из часов? Появится `hourly_rate`
   и вопрос, кто имеет право её видеть.
2. **Геолокация.** В прототипе был переключатель «Додати поточну геолокацію». Оставлен
   за бортом: это вопрос доверия в коллективе, не только техники.
3. **Несколько перерывов за смену.** Сейчас один. Если понадобится — таблица
   `entry_breaks`, миграция несложная.
4. **Виды работ справочником.** Пока описание — свободный текст. Если шеф захочет
   считать часы по видам работ, появится `work_types` и связь многие-ко-многим.
