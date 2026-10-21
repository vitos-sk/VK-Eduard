-- Чат объекта, очистка чата у себя и удаление чата 1 на 1.
-- Спека: docs/superpowers/specs/2026-10-21-site-chat-design.md
--
-- Чат объекта — строка `chats` с `site_id` вместо пары людей. В нём участвуют все активные сотрудники фирмы объекта.
-- Кто может читать и писать, решает одна функция `private.can_access_chat`; по ней переписаны политики.
-- «Очистить у себя» — отметка `chat_clears.cleared_at` на человека: политика чтения сообщений прячет всё старше неё,
-- поэтому список чатов, непрочитанные и чужие чеклисты в карточках подчиняются очистке сами.

-- ── Форма чата ───────────────────────────────────────────────────────────────

alter table chats add column site_id uuid unique references sites(id) on delete cascade;

alter table chats alter column user_a drop not null;
alter table chats alter column user_b drop not null;

-- Либо пара людей (как раньше), либо объект без пары. `chats_pair_ordered` остаётся: для NULL он не срабатывает.
alter table chats add constraint chats_shape check (
  (site_id is null and user_a is not null and user_b is not null)
  or (site_id is not null and user_a is null and user_b is null)
);

-- ── Очистка у себя ───────────────────────────────────────────────────────────

create table chat_clears (
  chat_id    uuid not null references chats(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- ── Доступ к чату ────────────────────────────────────────────────────────────

-- Участник пары либо (чат объекта и сотрудник той же фирмы). Активность проверяем здесь сами:
-- `current_company_id()` её не смотрит, а деактивированный не должен читать чат объекта.
create function private.can_access_chat(p_chat uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.chats c
    join public.profiles p on p.id = auth.uid() and p.is_active
    where c.id = p_chat
      and (
        auth.uid() in (c.user_a, c.user_b)
        or (c.site_id is not null and c.company_id = p.company_id)
      )
  )
$$;

revoke all on function private.can_access_chat(uuid) from public, anon;
grant execute on function private.can_access_chat(uuid) to authenticated;

-- ── Права (RLS) ──────────────────────────────────────────────────────────────

alter table chat_clears enable row level security;

drop policy chats_select on chats;
create policy chats_select on chats for select to authenticated
  using (private.can_access_chat(id));

-- Удалить можно только чат 1 на 1 и только участнику пары; сообщения, прочтения и очистки уходят каскадом.
-- Чат объекта живёт, пока есть объект.
create policy chats_delete on chats for delete to authenticated
  using (site_id is null and auth.uid() in (user_a, user_b));

-- Сообщения старше очистки человек не видит.
drop policy chat_messages_select on chat_messages;
create policy chat_messages_select on chat_messages for select to authenticated
  using (
    private.can_access_chat(chat_id)
    and created_at > coalesce(
      (select r.cleared_at from chat_clears r where r.chat_id = chat_messages.chat_id and r.user_id = auth.uid()),
      '-infinity'::timestamptz
    )
  );

drop policy chat_messages_insert on chat_messages;
create policy chat_messages_insert on chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and kind = 'text'
    and private.can_access_chat(chat_id)
  );

drop policy chat_reads_insert on chat_reads;
create policy chat_reads_insert on chat_reads for insert to authenticated
  with check (user_id = auth.uid() and private.can_access_chat(chat_id));

create policy chat_clears_select on chat_clears for select to authenticated
  using (user_id = auth.uid());

create policy chat_clears_insert on chat_clears for insert to authenticated
  with check (user_id = auth.uid() and private.can_access_chat(chat_id));

create policy chat_clears_update on chat_clears for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Чеклист видит владелец и тот, кто видит карточку с ним в чате (права и очистка карточек — политика сообщений).
-- Раньше здесь был явный разбор пары; теперь он живёт в `can_access_chat` и работает и для чата объекта.
drop policy checklists_select on checklists;
create policy checklists_select on checklists for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from chat_messages m where m.checklist_id = checklists.id)
  );

-- ── Функции для приложения (RPC) ─────────────────────────────────────────────

-- Открывает чат объекта (создаёт при первом обращении) и возвращает его id. Объект должен быть из фирмы человека.
create function public.open_site_chat(p_site uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_company uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select company_id into v_company from public.profiles where id = v_me and is_active;
  if v_company is null then
    raise exception 'no profile' using errcode = '28000';
  end if;

  if not exists (select 1 from public.sites where id = p_site and company_id = v_company) then
    raise exception 'site not found' using errcode = 'P0002';
  end if;

  -- Двое нажали одновременно: второй дожидается первого и находит уже созданный чат.
  insert into public.chats (company_id, site_id) values (v_company, p_site)
  on conflict (site_id) do nothing;

  select id into v_id from public.chats where site_id = p_site;

  return v_id;
end;
$$;

-- Кладёт в чат объекта карточку со своим чеклистом: один общий чеклист, не копии (отмечают все, кто видит карточку).
create function public.post_checklist_to_site_chat(p_checklist uuid, p_chat uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (select 1 from public.checklists where id = p_checklist and owner_id = v_me) then
    raise exception 'checklist not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.chats where id = p_chat and site_id is not null)
     or not private.can_access_chat(p_chat) then
    raise exception 'chat not found' using errcode = 'P0002';
  end if;

  insert into public.chat_messages (client_id, chat_id, sender_id, kind, checklist_id)
  values (gen_random_uuid(), p_chat, v_me, 'checklist', p_checklist)
  returning id into v_id;

  return v_id;
end;
$$;

-- Очищает чат у того, кто нажал: всё до этой секунды он больше не видит. У остальных переписка остаётся.
create function public.clear_chat(p_chat uuid) returns void
language sql security invoker set search_path = '' as $$
  insert into public.chat_clears (chat_id, user_id, cleared_at) values (p_chat, auth.uid(), now())
  on conflict (chat_id, user_id) do update set cleared_at = excluded.cleared_at
$$;

-- Список чатов: у чата объекта вместо собеседника объект (`out_other` пуст). Чат объекта без видимых человеку
-- сообщений не показываем, иначе в списке лежали бы все объекты, в которые кто-то хоть раз заглянул.
drop function public.my_chats();

create function public.my_chats()
returns table (
  out_chat uuid, out_other uuid, out_site uuid, out_site_name text, out_last_at timestamptz, out_last_kind text,
  out_last_body text, out_last_title text, out_last_sender uuid, out_unread int
)
language sql stable security invoker set search_path = '' as $$
  select
    c.id,
    case when c.user_a = auth.uid() then c.user_b else c.user_a end,
    c.site_id,
    s.name,
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
  left join public.sites s on s.id = c.site_id
  left join lateral (
    select m.kind, m.body, m.sender_id, m.checklist_id
    from public.chat_messages m
    where m.chat_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  left join public.checklists ch on ch.id = lm.checklist_id
  where c.site_id is null or lm.kind is not null
  order by c.last_message_at desc
$$;

revoke all on function public.open_site_chat(uuid)                       from public, anon;
revoke all on function public.post_checklist_to_site_chat(uuid, uuid)    from public, anon;
revoke all on function public.clear_chat(uuid)                           from public, anon;
revoke all on function public.my_chats()                                 from public, anon;

grant execute on function public.open_site_chat(uuid)                    to authenticated;
grant execute on function public.post_checklist_to_site_chat(uuid, uuid) to authenticated;
grant execute on function public.clear_chat(uuid)                        to authenticated;
grant execute on function public.my_chats()                              to authenticated;
