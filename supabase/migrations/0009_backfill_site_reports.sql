-- Бэкфілл існуючих work_entries (з описом або фото) в site_reports.
-- id/client_id зберігаються тими самими, що у вихідного запису work_entries —
-- це і є ключ ідемпотентності: повторний запуск нічого не задублює
-- (`on conflict (id) do nothing`). Часові поля НЕ переносяться — їх нема
-- в site_reports. Категорії на бэкфілнутих записах лишаються порожніми,
-- дозаповнюються вручну при бажанні.

insert into site_reports (id, client_id, company_id, author_id, site_id, work_date, description, created_at, updated_at)
select e.id, e.client_id, e.company_id, e.author_id, e.site_id, e.work_date, e.description, e.created_at, e.updated_at
from work_entries e
where e.description <> '' or exists (select 1 from entry_photos p where p.entry_id = e.id)
on conflict (id) do nothing;

-- report_id = id вихідного entry_photos.entry_id — той самий storage_path
-- лишається валідним, бо бакет entry-photos і шлях {company_id}/{id}/... не
-- змінюються (див. коментар у 0008 про storage-політики).
insert into report_photos (id, report_id, storage_path, width, height, size_bytes, sort_order)
select p.id, p.entry_id, p.storage_path, p.width, p.height, p.size_bytes, p.sort_order
from entry_photos p
join work_entries e on e.id = p.entry_id
where e.description <> '' or exists (select 1 from entry_photos p2 where p2.entry_id = e.id)
on conflict (id) do nothing;
