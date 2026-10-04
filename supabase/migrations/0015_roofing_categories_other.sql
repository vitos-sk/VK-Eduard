-- Категорії робіт під покрівлю + «Інше» з вільним текстом.
-- `work_categories.is_other` — позначає категорію «Інше»; текст, який
-- працівник вписав, лежить у `site_reports.other_text` (один на звіт).
-- Старі категорії не видаляємо, а архівуємо: звіти, що на них посилаються,
-- лишаються цілими (report_categories не каскадиться).

alter table work_categories add column is_other boolean not null default false;
alter table site_reports    add column other_text text not null default '';

create temp table roofing_categories (label text primary key, ord int not null, is_other boolean not null);

insert into roofing_categories (label, ord, is_other) values
  ('Плоскі дахи', 0, false),
  ('Скатні дахи', 1, false),
  ('EPDM', 2, false),
  ('Resitrix', 3, false),
  ('Рубероїд', 4, false),
  ('Дахівка / черепиця', 5, false),
  ('Фасадні роботи', 6, false),
  ('Жерстяні роботи', 7, false),
  ('Водостоки', 8, false),
  ('Демонтаж', 9, false),
  ('Ремонт даху', 10, false),
  ('Склад', 11, false),
  ('Додаткові роботи', 12, false),
  ('Інше', 13, true);

-- Категорії, яких нема в новому списку, — в архів.
update work_categories wc
set archived_at = coalesce(wc.archived_at, now())
where not exists (select 1 from roofing_categories rc where rc.label = wc.label);

-- Існуючі з нового списку: повертаємо з архіву, виставляємо порядок і прапорець.
update work_categories wc
set archived_at = null, sort_order = rc.ord, is_other = rc.is_other
from roofing_categories rc
where rc.label = wc.label;

-- Яких не було — додаємо кожній компанії.
insert into work_categories (company_id, label, sort_order, is_other)
select c.id, rc.label, rc.ord, rc.is_other
from companies c
cross join roofing_categories rc
where not exists (
  select 1 from work_categories wc where wc.company_id = c.id and wc.label = rc.label
);
