-- Дефолтний екран після входу для boss: звичайний застосунок чи адмінка
-- (`/more/admin`). Колонка спільна для всіх ролей — окрему таблицю під
-- одне boolean-подібне поле заводити не потрібно; для worker воно просто
-- не читається (перевірка ролі — у `signIn`/`updateDefaultView`).

alter table profiles
  add column default_view text not null default 'app'
    check (default_view in ('app', 'admin'));
