-- Первый запуск на ЧИСТОЙ базе: создаёт фирму, профиль шефа и стандартные категории работ.
-- Выполняется один раз в Supabase → SQL Editor ПОСЛЕ всех миграций 0001–0019.
--
-- Перед запуском:
--   1. Authentication → Users → Add user: email и пароль шефа (отметьте «Auto Confirm User»).
--   2. Ниже подставьте название фирмы и email шефа (тот же, что в п. 1) и его имя.
--
-- Дальше сотрудников шеф заводит сам: «Налаштування → Команда → Додати співробітника».
-- Скрипт идемпотентен: повторный запуск ничего не дублирует.

do $$
declare
  v_company_name text := 'VK group';             -- ← название фирмы
  v_boss_email   text := 'boss@example.com';     -- ← email шефа из Authentication → Users
  v_boss_name    text := 'Шеф';                  -- ← имя шефа, как его видят в приложении
  v_company uuid;
  v_boss    uuid;
begin
  select id into v_boss from auth.users where email = v_boss_email;

  if v_boss is null then
    raise exception 'Пользователь % не найден в Authentication → Users. Сначала создайте его.', v_boss_email;
  end if;

  select id into v_company from companies where name = v_company_name;

  if v_company is null then
    insert into companies (name) values (v_company_name) returning id into v_company;
  end if;

  insert into profiles (id, company_id, full_name, role)
  values (v_boss, v_company, v_boss_name, 'boss')
  on conflict (id) do update set company_id = excluded.company_id, role = 'boss';

  -- Стандартные категории работ (те же, что в миграции 0015; названия по-украински служат ключом перевода).
  insert into work_categories (company_id, label, sort_order, is_other)
  select v_company, c.label, c.ord, c.is_other
  from (values
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
    ('Інше', 13, true)
  ) as c(label, ord, is_other)
  where not exists (
    select 1 from work_categories w where w.company_id = v_company and w.label = c.label
  );
end $$;
