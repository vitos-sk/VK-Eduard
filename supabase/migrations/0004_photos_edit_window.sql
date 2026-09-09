-- entry_photos наследовал права от родительской записи, но без окна правки:
-- фото можно было добавить или удалить у записи любой давности, хотя саму
-- запись (описание, время) рабочий редактирует только 7 дней. Несогласованность
-- всплыла только на этапе 4, когда появился реальный код, добавляющий фото —
-- на этапе 2 этого пути ещё не было, кому и запускать политику было некому.
--
-- Хелперы вызываем со схемой явно: после миграции 0002 их нет в search_path
-- по умолчанию для новых определений (старые политики работали по oid,
-- этому запросу это не помогает — он создаётся заново).

drop policy photos_insert on entry_photos;
drop policy photos_delete on entry_photos;

create policy photos_insert on entry_photos for insert to authenticated
  with check (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = private.current_company_id()
      and e.author_id = auth.uid()
      and (private.is_boss() or e.work_date >= current_date - 7)
  ));

create policy photos_delete on entry_photos for delete to authenticated
  using (exists (
    select 1 from work_entries e
    where e.id = entry_id
      and e.company_id = private.current_company_id()
      and (e.author_id = auth.uid() or private.is_boss())
      and (private.is_boss() or e.work_date >= current_date - 7)
  ));
