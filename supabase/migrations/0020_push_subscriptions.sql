-- Push-напоминание «внесите отчёт» (каждый день в 18:00 по Брюсселю, кроме шефов).
-- Одна строка = одно устройство (браузер/установленное приложение). `endpoint` у устройства уникален.
-- Пишет сюда только сервер сервисным ключом (подписка переезжает между аккаунтами на общем телефоне,
-- а RLS такой «перехват» чужой строки не разрешил бы), читать и удалять свои строки может сам человек.

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  -- Язык интерфейса на момент подписки: уведомление уходит с сервера и должно быть на нём же.
  locale       text not null default 'uk',
  user_agent   text,
  created_at   timestamptz not null default now(),
  -- Дата (по Брюсселю), когда на это устройство уже отправили напоминание: повторный запуск планировщика не задублирует.
  last_sent_on date
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_select on push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_delete on push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
