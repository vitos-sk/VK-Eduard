-- Фото сотрудника (аватар): каждый ставит себе сам, шеф может любому в своей компании.

alter table profiles add column avatar_path text;

-- ── Storage: аватары ─────────────────────────────────────────────────────────
-- Приватный бакет, по образцу site-photos. Путь: {company_id}/{user_id}/{uuid}.webp
-- Читает вся компания (аватар виден в списках команды), пишет и удаляет
-- владелец папки или шеф компании.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(storage.objects.name))[1] = private.current_company_id()::text
  );

create policy avatars_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(storage.objects.name))[1] = private.current_company_id()::text
    and ((storage.foldername(storage.objects.name))[2] = auth.uid()::text or private.is_boss())
  );

create policy avatars_remove on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(storage.objects.name))[1] = private.current_company_id()::text
    and ((storage.foldername(storage.objects.name))[2] = auth.uid()::text or private.is_boss())
  );
