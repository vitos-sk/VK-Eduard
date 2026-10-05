-- Время в дороге на объект (и километры, по желанию) — ОТДЕЛЬНО от рабочего времени.
-- В `work_entries` не попадает, поэтому не входит в часы, табель, расчёт зарплаты и экспорт часов.
-- Вносится в форме отчёта; на экране «Години» показывается своим блоком «Дорога».
-- Приложение без этой таблицы работает: отчёт сохраняется, а о том, что дорога не записана, сообщает.

create table if not exists travel_entries (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null unique,          -- ключ идемпотентности, как у work_entries
  company_id  uuid not null references companies(id),
  author_id   uuid not null references profiles(id),
  site_id     uuid references sites(id),
  work_date   date not null,
  started_at  time not null,
  ended_at    time not null,
  km          numeric(6,1) check (km is null or (km >= 0 and km <= 9999)),
  created_at  timestamptz not null default now(),

  -- Минуты в пути; `% 86400` — переход через полночь, как в work_entries.
  minutes int generated always as (
    ((extract(epoch from (ended_at - started_at))::int + 86400) % 86400) / 60
  ) stored
);

create index if not exists travel_entries_company_date_idx on travel_entries (company_id, work_date desc);
create index if not exists travel_entries_author_date_idx  on travel_entries (author_id, work_date desc);

alter table travel_entries enable row level security;

-- Те же права, что у work_entries: свои — рабочему, все по компании — шефу.
create policy travel_select on travel_entries for select to authenticated
  using (company_id = private.current_company_id() and (author_id = auth.uid() or private.is_boss()));

create policy travel_insert on travel_entries for insert to authenticated
  with check (company_id = private.current_company_id() and author_id = auth.uid());

create policy travel_update on travel_entries for update to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or author_id = auth.uid()))
  with check (company_id = private.current_company_id());

create policy travel_delete on travel_entries for delete to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or author_id = auth.uid()));
