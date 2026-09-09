-- K group — начальная схема.
-- Источник: docs/DATA-MODEL.md. Изменения делаются новой миграцией, а не правкой этой.

-- ── Типы ──────────────────────────────────────────────────────────────────────

create type user_role    as enum ('worker', 'boss');
create type site_status  as enum ('not_started', 'in_progress', 'completed', 'paused');
create type entry_source as enum ('timer', 'manual');

-- ── Таблицы ───────────────────────────────────────────────────────────────────

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

-- Ядро. Время обязательно, описание и фото — нет.
create table work_entries (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null unique,          -- ключ идемпотентности, генерит телефон
  company_id  uuid not null references companies(id),
  author_id   uuid not null references profiles(id),
  site_id     uuid references sites(id),
  work_date   date not null,
  started_at  time not null,
  ended_at    time,                          -- null = смена идёт прямо сейчас
  break_start time,
  break_end   time,
  source      entry_source not null default 'manual',
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Арифметика в базе, а не на телефоне. `% 86400` — переход через полночь.
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

  constraint break_pair check ((break_start is null) = (break_end is null)),

  -- защита от опечатки: смена от 1 минуты до 18 часов
  constraint duration_sane check (
    ended_at is null
    or ((extract(epoch from (ended_at - started_at))::int + 86400) % 86400) / 60
       between 1 and 1080
  )
);

-- У одного человека может идти только одна смена.
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

-- Индексы под реальные запросы, а не «на всякий случай».
create index work_entries_author_date_idx  on work_entries (author_id, work_date desc);
create index work_entries_company_date_idx on work_entries (company_id, work_date desc);
create index work_entries_site_date_idx    on work_entries (site_id, work_date desc);
create index entry_photos_entry_idx        on entry_photos (entry_id, sort_order);

-- ── updated_at ────────────────────────────────────────────────────────────────

create function touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger work_entries_touch
  before update on work_entries
  for each row execute function touch_updated_at();

-- ── Хелперы для RLS ───────────────────────────────────────────────────────────
-- security definer: иначе политика на profiles рекурсивно вызовет саму себя.

create function current_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create function is_boss() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'boss' from profiles where id = auth.uid()), false)
$$;

revoke execute on function current_company_id() from public;
revoke execute on function is_boss()            from public;
grant  execute on function current_company_id() to authenticated;
grant  execute on function is_boss()            to authenticated;

-- ── Вьюха с разбивкой часов ───────────────────────────────────────────────────
-- security_invoker: вьюха обязана уважать RLS вызывающего, иначе она дыра.

create view entry_hours with (security_invoker = true) as
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

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table companies    enable row level security;
alter table profiles     enable row level security;
alter table sites        enable row level security;
alter table work_entries enable row level security;
alter table entry_photos enable row level security;

-- companies: своя компания, только чтение
create policy companies_select on companies for select to authenticated
  using (id = current_company_id());

-- profiles: видно всю свою компанию; правит себя, шеф — любого своего
create policy profiles_select on profiles for select to authenticated
  using (company_id = current_company_id());

create policy profiles_update on profiles for update to authenticated
  using (company_id = current_company_id() and (id = auth.uid() or is_boss()))
  with check (company_id = current_company_id());

-- sites: читают все свои, правит шеф
create policy sites_select on sites for select to authenticated
  using (company_id = current_company_id());

create policy sites_insert on sites for insert to authenticated
  with check (company_id = current_company_id() and is_boss());

create policy sites_update on sites for update to authenticated
  using (company_id = current_company_id() and is_boss())
  with check (company_id = current_company_id());

-- work_entries: свои — рабочему, все свои по компании — шефу.
-- Delete-политики нет ни у кого: табель — финансовый документ.
create policy entries_select on work_entries for select to authenticated
  using (company_id = current_company_id() and (author_id = auth.uid() or is_boss()));

create policy entries_insert on work_entries for insert to authenticated
  with check (company_id = current_company_id() and author_id = auth.uid());

create policy entries_update on work_entries for update to authenticated
  using (
    company_id = current_company_id()
    and (is_boss() or (author_id = auth.uid() and work_date >= current_date - 7))
  )
  with check (company_id = current_company_id());

-- entry_photos: по правам родительской записи
create policy photos_select on entry_photos for select to authenticated
  using (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = current_company_id()
      and (e.author_id = auth.uid() or is_boss())
  ));

create policy photos_insert on entry_photos for insert to authenticated
  with check (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = current_company_id()
      and e.author_id = auth.uid()
  ));

create policy photos_delete on entry_photos for delete to authenticated
  using (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = current_company_id()
      and (e.author_id = auth.uid() or is_boss())
  ));

-- ── Storage ───────────────────────────────────────────────────────────────────
-- Приватный бакет. Путь: {company_id}/{entry_id}/{uuid}.webp
-- Публичный бакет недопустим: ссылка на фото утекает вместе с адресом заказчика.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entry-photos', 'entry-photos', false, 5242880,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy entry_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'entry-photos'
    and exists (
      select 1 from work_entries e
      where e.id::text = (storage.foldername(name))[2]
        and e.company_id = current_company_id()
        and (e.author_id = auth.uid() or is_boss())
    )
  );

create policy entry_photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'entry-photos'
    and (storage.foldername(name))[1] = current_company_id()::text
  );

create policy entry_photos_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'entry-photos'
    and (storage.foldername(name))[1] = current_company_id()::text
    and owner_id = auth.uid()::text
  );
