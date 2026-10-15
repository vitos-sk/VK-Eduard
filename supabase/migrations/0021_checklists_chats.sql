-- Чеклисты, чаты 1 на 1 и настройки уведомлений.
-- Спека: docs/superpowers/specs/2026-10-15-checklists-chat-design.md
--
-- Чеклист принадлежит одному человеку (`owner_id`). Когда его отправляют коллеге (в чат или по ссылке из WhatsApp),
-- у коллеги появляется СВОЯ копия (`origin_id` — откуда, `sent_by` — кто прислал): галочки у каждого свои.
-- Отправитель видит прогресс копии через карточку в чате (политика читает чеклист по сообщению чата).
-- Копии создают только функции ниже (security definer), напрямую в таблицу вставить чужую копию нельзя.

-- ── Чеклисты ─────────────────────────────────────────────────────────────────

create table checklists (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id),
  owner_id    uuid not null references profiles(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  site_id     uuid references sites(id) on delete set null,
  origin_id   uuid references checklists(id) on delete set null,
  sent_by     uuid references profiles(id) on delete set null,
  -- Секрет в ссылке для WhatsApp: …/c/<share_token>. Открыть может только вошедший сотрудник той же фирмы.
  share_token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger checklists_touch
  before update on checklists
  for each row execute function touch_updated_at();

create index checklists_owner_idx  on checklists (owner_id, created_at desc);
create index checklists_origin_idx on checklists (origin_id);

create table checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  text         text not null check (char_length(btrim(text)) between 1 and 200),
  sort_order   int  not null default 0,
  done_at      timestamptz
);

create index checklist_items_list_idx on checklist_items (checklist_id, sort_order);

-- ── Чаты 1 на 1 ──────────────────────────────────────────────────────────────

-- Пара всегда упорядочена (`user_a < user_b`), поэтому между двумя людьми не больше одного чата.
create table chats (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id),
  user_a          uuid not null references profiles(id) on delete cascade,
  user_b          uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint chats_pair_ordered check (user_a < user_b),
  constraint chats_pair_unique  unique (user_a, user_b)
);

create index chats_user_b_idx on chats (user_b);

create table chat_messages (
  id           uuid primary key default gen_random_uuid(),
  -- Ключ идемпотентности: повторная отправка того же сообщения (двойное нажатие, потерялся ответ) не плодит дубли.
  client_id    uuid not null unique,
  chat_id      uuid not null references chats(id) on delete cascade,
  sender_id    uuid not null references profiles(id) on delete cascade,
  kind         text not null check (kind in ('text', 'checklist')),
  body         text,
  -- Для карточки чеклиста: копия получателя. Удалил копию — карточка остаётся с пометкой «чеклист видалено».
  checklist_id uuid references checklists(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint chat_messages_shape check (
    (kind = 'text' and char_length(btrim(coalesce(body, ''))) between 1 and 2000 and checklist_id is null)
    or kind = 'checklist'
  )
);

create index chat_messages_chat_idx      on chat_messages (chat_id, created_at desc);
create index chat_messages_checklist_idx on chat_messages (checklist_id);

-- Когда человек последний раз открывал чат: всё, что пришло позже, — непрочитанное.
create table chat_reads (
  chat_id uuid not null references chats(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- ── Настройки уведомлений ────────────────────────────────────────────────────
-- Нет строки — все включено. Само разрешение браузера и подписка устройства — `push_subscriptions` (0020).

create table notification_prefs (
  user_id         uuid primary key references profiles(id) on delete cascade,
  report_reminder boolean not null default true,
  chat_messages   boolean not null default true,
  chat_checklists boolean not null default true,
  checklist_done  boolean not null default true
);

-- ── Служебные функции (закрытая схема private) ───────────────────────────────

-- Находит или создаёт чат между двумя сотрудниками одной фирмы. Вызывается только из функций ниже.
create function private.ensure_chat(p_me uuid, p_other uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid;
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if p_other is null or p_other = p_me then
    raise exception 'invalid recipient' using errcode = '22023';
  end if;

  select company_id into v_company from public.profiles where id = p_me and is_active;
  if v_company is null then
    raise exception 'no profile' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profiles where id = p_other and company_id = v_company and is_active) then
    raise exception 'recipient not found' using errcode = '22023';
  end if;

  v_a := least(p_me, p_other);
  v_b := greatest(p_me, p_other);

  insert into public.chats (company_id, user_a, user_b) values (v_company, v_a, v_b)
  on conflict (user_a, user_b) do nothing;

  select id into v_id from public.chats where user_a = v_a and user_b = v_b;

  return v_id;
end;
$$;

-- Делает копию чеклиста для `p_owner`; пункты копируются без галочек.
create function private.copy_checklist(p_source uuid, p_owner uuid, p_sent_by uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_src public.checklists%rowtype;
  v_copy uuid;
begin
  select * into v_src from public.checklists where id = p_source;

  insert into public.checklists (company_id, owner_id, title, site_id, origin_id, sent_by)
  values (v_src.company_id, p_owner, v_src.title, v_src.site_id, v_src.id, p_sent_by)
  returning id into v_copy;

  insert into public.checklist_items (checklist_id, text, sort_order)
  select v_copy, i.text, i.sort_order from public.checklist_items i where i.checklist_id = v_src.id;

  return v_copy;
end;
$$;

-- Новое сообщение двигает чат наверх списка. Триггер security definer: обычному пользователю менять `chats` нельзя.
create function private.touch_chat() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$;

create trigger chat_messages_touch
  after insert on chat_messages
  for each row execute function private.touch_chat();

revoke all on function private.ensure_chat(uuid, uuid)          from public, anon, authenticated;
revoke all on function private.copy_checklist(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.touch_chat()                     from public, anon, authenticated;

-- ── Права (RLS) ──────────────────────────────────────────────────────────────

alter table checklists         enable row level security;
alter table checklist_items    enable row level security;
alter table chats              enable row level security;
alter table chat_messages      enable row level security;
alter table chat_reads         enable row level security;
alter table notification_prefs enable row level security;

-- Чеклист видит владелец и участник чата, в котором лежит карточка этого чеклиста (так отправитель видит прогресс).
-- Шеф чужих чеклистов не видит, как и чужие чаты.
create policy checklists_select on checklists for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from chat_messages m
      join chats c on c.id = m.chat_id
      where m.checklist_id = checklists.id and auth.uid() in (c.user_a, c.user_b)
    )
  );

-- Напрямую создаётся только свой «чистый» чеклист; копии — через send_checklist / accept_checklist.
create policy checklists_insert on checklists for insert to authenticated
  with check (
    company_id = private.current_company_id()
    and owner_id = auth.uid()
    and origin_id is null
    and sent_by is null
  );

create policy checklists_update on checklists for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy checklists_delete on checklists for delete to authenticated
  using (owner_id = auth.uid());

-- Менять можно только название и объект: `sent_by` (кому придёт «чеклист выполнен») и `origin_id` — нельзя.
revoke update on checklists from authenticated;
grant  update (title, site_id) on checklists to authenticated;

-- Пункты видны так же, как сам чеклист (подзапрос уже отфильтрован политикой), меняет только владелец.
create policy checklist_items_select on checklist_items for select to authenticated
  using (exists (select 1 from checklists c where c.id = checklist_id));

create policy checklist_items_insert on checklist_items for insert to authenticated
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.owner_id = auth.uid()));

create policy checklist_items_update on checklist_items for update to authenticated
  using (exists (select 1 from checklists c where c.id = checklist_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.owner_id = auth.uid()));

create policy checklist_items_delete on checklist_items for delete to authenticated
  using (exists (select 1 from checklists c where c.id = checklist_id and c.owner_id = auth.uid()));

-- Чаты и сообщения видят только двое участников. Чат создаёт только функция.
create policy chats_select on chats for select to authenticated
  using (auth.uid() in (user_a, user_b));

create policy chat_messages_select on chat_messages for select to authenticated
  using (exists (select 1 from chats c where c.id = chat_id and auth.uid() in (c.user_a, c.user_b)));

-- Обычное сообщение пишет сам участник; карточку чеклиста может создать только функция.
create policy chat_messages_insert on chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and kind = 'text'
    and exists (select 1 from chats c where c.id = chat_id and auth.uid() in (c.user_a, c.user_b))
  );

create policy chat_reads_select on chat_reads for select to authenticated
  using (user_id = auth.uid());

create policy chat_reads_insert on chat_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from chats c where c.id = chat_id and auth.uid() in (c.user_a, c.user_b))
  );

create policy chat_reads_update on chat_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_prefs_select on notification_prefs for select to authenticated
  using (user_id = auth.uid());

create policy notification_prefs_insert on notification_prefs for insert to authenticated
  with check (user_id = auth.uid());

create policy notification_prefs_update on notification_prefs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Функции для приложения (RPC) ─────────────────────────────────────────────

-- Открывает чат 1 на 1 с коллегой (создаёт, если ещё нет) и возвращает его id.
create function public.open_chat(p_other uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  return private.ensure_chat(auth.uid(), p_other);
end;
$$;

-- Отправляет свой чеклист коллегам: каждому своя копия, чат (если ещё нет) и карточка в нём.
create function public.send_checklist(p_checklist uuid, p_recipients uuid[])
returns table (out_recipient uuid, out_chat uuid, out_copy uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_rec uuid;
  v_chat uuid;
  v_copy uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (select 1 from public.checklists where id = p_checklist and owner_id = v_me) then
    raise exception 'checklist not found' using errcode = 'P0002';
  end if;

  if p_recipients is null or cardinality(p_recipients) = 0 or cardinality(p_recipients) > 20 then
    raise exception 'invalid recipients' using errcode = '22023';
  end if;

  for v_rec in select distinct r from unnest(p_recipients) as r loop
    v_chat := private.ensure_chat(v_me, v_rec);
    v_copy := private.copy_checklist(p_checklist, v_rec, v_me);

    insert into public.chat_messages (client_id, chat_id, sender_id, kind, checklist_id)
    values (gen_random_uuid(), v_chat, v_me, 'checklist', v_copy);

    out_recipient := v_rec;
    out_chat := v_chat;
    out_copy := v_copy;
    return next;
  end loop;
end;
$$;

-- Что показать на странице по ссылке из WhatsApp. Только вошедшему сотруднику той же фирмы.
create function public.checklist_by_token(p_token text)
returns table (
  out_id uuid, out_owner uuid, out_title text, out_author text, out_site text, out_items text[], out_my_copy uuid
)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    c.owner_id,
    c.title,
    p.full_name,
    s.name,
    coalesce(array(select i.text from public.checklist_items i where i.checklist_id = c.id order by i.sort_order), '{}'::text[]),
    (select m.id from public.checklists m where m.owner_id = auth.uid() and m.origin_id = c.id limit 1)
  from public.checklists c
  join public.profiles p on p.id = c.owner_id
  left join public.sites s on s.id = c.site_id
  where c.share_token = p_token
    and c.company_id = private.current_company_id()
$$;

-- «Додати собі» по ссылке: своя копия + чат с автором + карточка в чате. Повторное нажатие даёт ту же копию.
create function public.accept_checklist(p_token text)
returns table (out_copy uuid, out_chat uuid, out_created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_src public.checklists%rowtype;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select c.* into v_src
  from public.checklists c
  where c.share_token = p_token and c.company_id = private.current_company_id();

  if not found then
    raise exception 'checklist not found' using errcode = 'P0002';
  end if;

  -- Свой же чеклист: копировать нечего.
  if v_src.owner_id = v_me then
    out_copy := v_src.id;
    out_chat := null;
    out_created := false;
    return next;
    return;
  end if;

  select m.id into out_copy from public.checklists m where m.owner_id = v_me and m.origin_id = v_src.id limit 1;

  if found then
    out_chat := private.ensure_chat(v_me, v_src.owner_id);
    out_created := false;
    return next;
    return;
  end if;

  out_chat := private.ensure_chat(v_me, v_src.owner_id);
  out_copy := private.copy_checklist(v_src.id, v_me, v_src.owner_id);
  out_created := true;

  -- Карточка лежит в чате от автора («он прислал»), но для самого человека она сразу прочитана.
  insert into public.chat_messages (client_id, chat_id, sender_id, kind, checklist_id)
  values (gen_random_uuid(), out_chat, v_src.owner_id, 'checklist', out_copy);

  insert into public.chat_reads (chat_id, user_id, read_at) values (out_chat, v_me, now())
  on conflict (chat_id, user_id) do update set read_at = excluded.read_at;

  return next;
end;
$$;

-- Список чатов человека: собеседник, последнее сообщение, число непрочитанных. Права — обычные (RLS).
create function public.my_chats()
returns table (
  out_chat uuid, out_other uuid, out_last_at timestamptz, out_last_kind text, out_last_body text,
  out_last_title text, out_last_sender uuid, out_unread int
)
language sql stable security invoker set search_path = '' as $$
  select
    c.id,
    case when c.user_a = auth.uid() then c.user_b else c.user_a end,
    c.last_message_at,
    lm.kind,
    lm.body,
    ch.title,
    lm.sender_id,
    (
      select count(*)::int
      from public.chat_messages m
      where m.chat_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select r.read_at from public.chat_reads r where r.chat_id = c.id and r.user_id = auth.uid()),
          '-infinity'::timestamptz
        )
    )
  from public.chats c
  left join lateral (
    select m.kind, m.body, m.sender_id, m.checklist_id
    from public.chat_messages m
    where m.chat_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  left join public.checklists ch on ch.id = lm.checklist_id
  where auth.uid() in (c.user_a, c.user_b)
  order by c.last_message_at desc
$$;

-- Человек открыл чат: всё до этой секунды прочитано.
create function public.mark_chat_read(p_chat uuid) returns void
language sql security invoker set search_path = '' as $$
  insert into public.chat_reads (chat_id, user_id, read_at) values (p_chat, auth.uid(), now())
  on conflict (chat_id, user_id) do update set read_at = excluded.read_at
$$;

revoke all on function public.open_chat(uuid)               from public, anon;
revoke all on function public.send_checklist(uuid, uuid[])  from public, anon;
revoke all on function public.checklist_by_token(text)      from public, anon;
revoke all on function public.accept_checklist(text)        from public, anon;
revoke all on function public.my_chats()                    from public, anon;
revoke all on function public.mark_chat_read(uuid)          from public, anon;

grant execute on function public.open_chat(uuid)               to authenticated;
grant execute on function public.send_checklist(uuid, uuid[])  to authenticated;
grant execute on function public.checklist_by_token(text)      to authenticated;
grant execute on function public.accept_checklist(text)        to authenticated;
grant execute on function public.my_chats()                    to authenticated;
grant execute on function public.mark_chat_read(uuid)          to authenticated;
