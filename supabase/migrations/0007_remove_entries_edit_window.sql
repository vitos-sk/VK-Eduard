-- Вікно правки в 7 днів (0001/0004/0005) прибрано за прямим запитом власника
-- продукту: рабочий повинен завжди мати змогу редагувати й видаляти власні
-- записи, незалежно від дати. Обмеження лишається тим самим, що й раніше —
-- тільки свої записи (чужі рабочому як і раніше недоступні), шеф — без змін.
--
-- `if exists` на дропах: не знаємо напевно, які з попередніх міграцій уже
-- застосовані до цього проєкту, тож скрипт має відпрацювати ідемпотентно
-- незалежно від стартового стану.

drop policy if exists entries_update on work_entries;
drop policy if exists entries_delete on work_entries;
drop policy if exists photos_insert on entry_photos;
drop policy if exists photos_delete on entry_photos;

create policy entries_update on work_entries for update to authenticated
  using (
    company_id = private.current_company_id()
    and (private.is_boss() or author_id = auth.uid())
  )
  with check (company_id = private.current_company_id());

create policy entries_delete on work_entries for delete to authenticated
  using (
    company_id = private.current_company_id()
    and (private.is_boss() or author_id = auth.uid())
  );

create policy photos_insert on entry_photos for insert to authenticated
  with check (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = private.current_company_id()
      and e.author_id = auth.uid()
  ));

create policy photos_delete on entry_photos for delete to authenticated
  using (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = private.current_company_id()
      and (e.author_id = auth.uid() or private.is_boss())
  ));
