-- Хелперы RLS не должны быть вызываемы через REST: схема public открыта наружу,
-- и security definer функция там — лишняя ручка API (`/rest/v1/rpc/is_boss`).
-- Уносим их в закрытую схему. Политики ссылаются на функции по oid,
-- поэтому переезд их не ломает и переписывать политики не нужно.

create schema if not exists private;

alter function public.current_company_id() set schema private;
alter function public.is_boss()            set schema private;

alter function private.current_company_id() set search_path = public;
alter function private.is_boss()            set search_path = public;

revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated;

revoke all on function private.current_company_id() from public, anon;
revoke all on function private.is_boss()            from public, anon;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.is_boss()            to authenticated;
