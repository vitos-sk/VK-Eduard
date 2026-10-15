-- Планировщик push-напоминания «внесите отчёт»: каждый день в 18:00 по Брюсселю.
-- Выполняется ОДИН РАЗ в Supabase → SQL Editor, после миграции 0020 и после того, как в Vercel
-- заданы CRON_SECRET и VAPID-переменные (docs/DEPLOY.md, раздел «Напоминание о звіті»).
--
-- Перед запуском замените два значения ниже:
--   <APP_URL>      — адрес приложения, например https://vk-group-chi.vercel.app
--   <CRON_SECRET>  — то же значение, что в переменной CRON_SECRET в Vercel
--
-- Почему два запуска: 18:00 в Брюсселе — это 16:00 UTC летом и 17:00 UTC зимой, а pg_cron работает по UTC.
-- Приложение само проверяет, что в Брюсселе сейчас 18-й час, и пропускает «лишний» запуск —
-- поэтому переключать расписание весной и осенью не нужно.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Повторный запуск скрипта не должен плодить дубли расписания.
select cron.unschedule(jobid) from cron.job where jobname = 'report-reminder';

select cron.schedule(
  'report-reminder',
  '0 16,17 * * *',
  $$
  select net.http_post(
    url     := '<APP_URL>/api/cron/report-reminder',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
    timeout_milliseconds := 20000
  );
  $$
);

-- Проверка: расписание есть …
--   select jobname, schedule, active from cron.job where jobname = 'report-reminder';
-- … и ответы приложения на запуски (status_code 200, в content — {"sent":N,...} или "skipped"):
--   select created, status_code, content from net._http_response order by created desc limit 10;
