-- Створювати об'єкти може будь-який співробітник компанії, а не лише шеф.
-- Автор об'єкта (`created_by`) може його редагувати і міняти обкладинку;
-- архівація/видалення, як і раніше, лише для шефа.

alter table sites
  add column created_by uuid references profiles(id) on delete set null default auth.uid();

drop policy sites_insert on sites;
create policy sites_insert on sites for insert to authenticated
  with check (
    company_id = private.current_company_id()
    and (created_by is null or created_by = auth.uid())
  );

drop policy sites_update on sites;
create policy sites_update on sites for update to authenticated
  using (company_id = private.current_company_id() and (private.is_boss() or created_by = auth.uid()))
  with check (company_id = private.current_company_id());

drop policy site_photos_write on storage.objects;
create policy site_photos_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = private.current_company_id()::text
    and (
      private.is_boss()
      or exists (
        select 1 from sites s
        where s.id::text = (storage.foldername(name))[2] and s.created_by = auth.uid()
      )
    )
  );

drop policy site_photos_remove on storage.objects;
create policy site_photos_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = private.current_company_id()::text
    and (
      private.is_boss()
      or exists (
        select 1 from sites s
        where s.id::text = (storage.foldername(name))[2] and s.created_by = auth.uid()
      )
    )
  );
