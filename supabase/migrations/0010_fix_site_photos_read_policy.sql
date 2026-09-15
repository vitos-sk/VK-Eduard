-- Фикс site_photos_read (0006): всередині `exists (select ... from sites s where ...)`
-- неквалифіковане ім'я `name` резолвилось у `s.name` (назва об'єкта), а не в
-- `storage.objects.name` (шлях файлу) — класичне затінення стовпця підзапитом.
-- Через це `storage.foldername(s.name)` розбирав рядок на кшталт "Hanser House"
-- замість реального шляху, результат завжди NULL, і читання фото об'єкта
-- (createSignedUrl) завжди відмовляло з "Object not found".

drop policy site_photos_read on storage.objects;

create policy site_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'site-photos'
    and exists (
      select 1 from sites s
      where s.id::text = (storage.foldername(storage.objects.name))[2]
        and s.company_id = private.current_company_id()
    )
  );
