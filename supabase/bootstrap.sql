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
end $$;
