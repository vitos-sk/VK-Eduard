-- companies: раніше була тільки select-політика (компанія одна, правити
-- не було звідки). Розділ «Налаштування» адмінки додає керування денною
-- нормою компанії (`daily_norm_minutes`) — потрібна update-політика,
-- симетрична `work_categories_update`: тільки свій boss.

create policy companies_update on companies for update to authenticated
  using (id = private.current_company_id() and private.is_boss())
  with check (id = private.current_company_id());
