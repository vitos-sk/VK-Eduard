-- Удаление объекта не должно блокироваться записью «Дорога».
-- Как у work_entries (0006) и site_reports (0008): запись остаётся, site_id становится null.
alter table travel_entries
  drop constraint travel_entries_site_id_fkey,
  add constraint travel_entries_site_id_fkey
    foreign key (site_id) references sites(id) on delete set null;
