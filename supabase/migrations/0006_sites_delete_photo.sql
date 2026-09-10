-- Удаление объекта (не только архивация), обложка объекта и её приватный бакет.

-- work_entries.site_id не должен блокировать удаление объекта: запись
-- остаётся, просто становится «поза об'єктом», как и записи без сайта сейчас.
alter table work_entries
  drop constraint work_entries_site_id_fkey,
  add constraint work_entries_site_id_fkey
    foreign key (site_id) references sites(id) on delete set null;

create policy sites_delete on sites for delete to authenticated
  using (company_id = current_company_id() and is_boss());

alter table sites add column photo_path text;

-- ── Storage: обложки объектов ────────────────────────────────────────────────
-- Приватный бакет, по образцу entry-photos. Путь: {company_id}/{site_id}/{uuid}.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', false, 5242880,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy site_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'site-photos'
    and exists (
      select 1 from sites s
      where s.id::text = (storage.foldername(name))[2]
        and s.company_id = current_company_id()
    )
  );

create policy site_photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = current_company_id()::text
    and is_boss()
  );

create policy site_photos_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = current_company_id()::text
    and is_boss()
  );
