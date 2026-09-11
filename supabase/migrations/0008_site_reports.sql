-- «Звіт» стає окремою сутністю: без часу, `site_reports` замість `work_entries`.
-- Спека: docs/superpowers/specs/2026-09-11-zvit-otdelnaya-sushchnost-design.md
-- Права — за зразком work_entries/entry_photos ПІСЛЯ міграції 0007: автор
-- редагує/видаляє свої записи без обмеження по даті, шеф — будь-які.

create table site_reports (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null unique,
  company_id  uuid not null references companies(id),
  author_id   uuid not null references profiles(id),
  site_id     uuid references sites(id) on delete set null,
  work_date   date not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger site_reports_touch
  before update on site_reports
  for each row execute function touch_updated_at();

create table report_photos (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references site_reports(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  size_bytes   int,
  sort_order   int not null default 0
);

create table work_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id),
  label       text not null,
  sort_order  int not null default 0,
  archived_at timestamptz
);

create table report_categories (
  report_id   uuid not null references site_reports(id) on delete cascade,
  category_id uuid not null references work_categories(id) on delete cascade,
  primary key (report_id, category_id)
);

create index site_reports_author_date_idx   on site_reports (author_id, work_date desc);
create index site_reports_company_date_idx  on site_reports (company_id, work_date desc);
create index site_reports_site_date_idx     on site_reports (site_id, work_date desc);
create index report_photos_report_idx       on report_photos (report_id, sort_order);
create index work_categories_company_idx    on work_categories (company_id, sort_order);
create index report_categories_category_idx on report_categories (category_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table site_reports      enable row level security;
alter table report_photos     enable row level security;
alter table work_categories   enable row level security;
alter table report_categories enable row level security;

create policy reports_select on site_reports for select to authenticated
  using (company_id = private.current_company_id() and (author_id = auth.uid() or private.is_boss()));

create policy reports_insert on site_reports for insert to authenticated
  with check (company_id = private.current_company_id() and author_id = auth.uid());

create policy reports_update on site_reports for update to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or author_id = auth.uid()))
  with check (company_id = private.current_company_id());

create policy reports_delete on site_reports for delete to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or author_id = auth.uid()));

create policy report_photos_select on report_photos for select to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

create policy report_photos_insert on report_photos for insert to authenticated
  with check (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and r.author_id = auth.uid()
  ));

create policy report_photos_delete on report_photos for delete to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

create policy work_categories_select on work_categories for select to authenticated
  using (company_id = private.current_company_id() and archived_at is null);

create policy work_categories_insert on work_categories for insert to authenticated
  with check (company_id = private.current_company_id() and private.is_boss());

create policy work_categories_update on work_categories for update to authenticated
  using (company_id = private.current_company_id() and private.is_boss())
  with check (company_id = private.current_company_id());

create policy report_categories_select on report_categories for select to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

create policy report_categories_insert on report_categories for insert to authenticated
  with check (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and r.author_id = auth.uid()
  ));

create policy report_categories_delete on report_categories for delete to authenticated
  using (exists (
    select 1 from site_reports r
    where r.id = report_id
      and r.company_id = private.current_company_id()
      and (r.author_id = auth.uid() or private.is_boss())
  ));

-- ── Storage: фото звітів лежать у тому ж бакеті entry-photos ────────────────
-- Не заводимо окремий бакет: `entry_photos_write` (0001) вже перевіряє тільки
-- company_id у шляху, тож новий запис під report_id туди й так пройде.
-- Read/remove у 0001 перевіряють саме work_entries — тут додаємо паралельні
-- політики під site_reports; Postgres об'єднує permissive-політики через OR.

create policy report_photos_storage_read on storage.objects for select to authenticated
  using (
    bucket_id = 'entry-photos'
    and exists (
      select 1 from site_reports r
      where r.id::text = (storage.foldername(name))[2]
        and r.company_id = private.current_company_id()
        and (r.author_id = auth.uid() or private.is_boss())
    )
  );

create policy report_photos_storage_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'entry-photos'
    and exists (
      select 1 from site_reports r
      where r.id::text = (storage.foldername(name))[2]
        and r.company_id = private.current_company_id()
        and (r.author_id = auth.uid() or private.is_boss())
    )
    and owner_id = auth.uid()::text
  );

-- ── Стартовий набір категорій на кожну існуючу компанію ──────────────────────
-- Екрана управління в v1 нема (спека, розділ «work_categories») — компанія
-- зараз одна (docs/DATA-MODEL.md), тому тригера на нові компанії не заводимо.

insert into work_categories (company_id, label, sort_order)
select c.id, seed.label, seed.ord
from companies c
cross join (values
  ('Покрівля', 0), ('Фасад', 1), ('Демонтаж', 2), ('Монтаж мембрани', 3),
  ('Заливка бетону', 4), ('Електрика', 5), ('Сантехніка', 6),
  ('Оздоблення', 7), ('Прибирання', 8), ('Інше', 9)
) as seed(label, ord);
