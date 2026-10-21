-- Кто отметил пункт чеклиста. Нужно, когда пункты отмечают несколько человек (чат 1 на 1, общий чеклист объекта).
-- Пустое значение — пункт не отмечен или отмечен до этой миграции (имя неизвестно).
-- Колонку заполняет приложение (`setItemDone`) вместе с `done_at`; снятие отметки очищает обе.

alter table checklist_items
  add column done_by uuid references profiles(id) on delete set null;

-- Имя без времени отметки не бывает.
alter table checklist_items
  add constraint checklist_items_done_by_needs_done_at check (done_by is null or done_at is not null);
