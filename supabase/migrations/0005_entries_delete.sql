-- 0001 сознательно не дал DELETE никому: "табель — фінансовий документ,
-- помилкова запис правиться, а не стирається". Рішення переглянуте:
-- рабочому потрібно видаляти власні помилкові записи, шефу — будь-які.
-- Вікно те саме, що й у entries_update — 7 днів рабочому, без обмежень шефу.

create policy entries_delete on work_entries for delete to authenticated
  using (
    company_id = private.current_company_id()
    and (private.is_boss() or (author_id = auth.uid() and work_date >= current_date - 7))
  );
