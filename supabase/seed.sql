-- Демо-данные для разработки: одна фирма, шеф, четверо рабочих, три объекта.
-- Идемпотентен: повторный прогон ничего не дублирует.
--
-- Пароль у всех: kwork2026 — только для локальной разработки.
-- Пользователи создаются прямой вставкой в auth.users: Admin API из SQL недоступен.
-- В проде людей заводит шеф, а не этот файл.

do $$
declare
  v_company uuid;
  v_boss    uuid;
  ids       uuid[];
  emails    text[] := array['eduard@kwork.test','vitalik@kwork.test','andriy@kwork.test','oleh@kwork.test','marko@kwork.test'];
  names     text[] := array['Едуард','Віталік','Андрій','Олег','Марко'];
  roles     text[] := array['boss','worker','worker','worker','worker'];
  hues      int[]  := array[110, 90, 200, 35, 300];
  i         int;
  uid       uuid;
begin
  -- Фирма
  select id into v_company from companies where name = 'K work';
  if v_company is null then
    insert into companies (name) values ('K work') returning id into v_company;
  end if;

  -- Пользователи и профили
  for i in 1 .. array_length(emails, 1) loop
    select id into uid from auth.users where email = emails[i];

    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
      ) values (
        uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        emails[i], crypt('kwork2026', gen_salt('bf')),
        now(), now(), now(),
        jsonb_build_object('provider','email','providers',array['email']),
        jsonb_build_object('full_name', names[i])
      );

      -- GoTrue читает эти колонки как text, а не как nullable: с null он падает
      -- на входе с «Database error querying schema». Дашборд заполняет их сам,
      -- при вставке руками это приходится делать за него.
      update auth.users set
        confirmation_token = '', recovery_token = '',
        email_change_token_new = '', email_change_token_current = '',
        email_change = '', phone_change = '', phone_change_token = '',
        reauthentication_token = ''
      where id = uid;

      insert into auth.identities (
        id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
      ) values (
        gen_random_uuid(), uid, uid::text, 'email',
        jsonb_build_object('sub', uid::text, 'email', emails[i], 'email_verified', true),
        now(), now(), now()
      );
    end if;

    insert into profiles (id, company_id, full_name, role, avatar_hue)
    values (uid, v_company, names[i], roles[i]::user_role, hues[i])
    on conflict (id) do update
      set full_name = excluded.full_name,
          role      = excluded.role,
          avatar_hue = excluded.avatar_hue;

    if roles[i] = 'boss' then
      v_boss := uid;
    end if;
  end loop;

  -- Объекты
  insert into sites (company_id, name, kind, address, status)
  select v_company, s.name, s.kind, s.address, s.status::site_status
  from (values
    ('Reimond',      'Покрівля', 'Freiburg, Schlossgasse 24', 'in_progress'),
    ('Villa Project','Фасад',    'Brussels, Belgium',         'in_progress'),
    ('Hanser House',  null,      'Basel, Switzerland',        'not_started')
  ) as s(name, kind, address, status)
  where not exists (
    select 1 from sites x where x.company_id = v_company and x.name = s.name
  );
end $$;
