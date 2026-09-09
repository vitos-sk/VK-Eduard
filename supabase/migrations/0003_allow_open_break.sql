-- Перерыв «в процессе» (break_start задан, break_end ещё нет) — законное
-- состояние открытой смены, а не ошибка ввода. Старая версия constraint
-- требовала оба края сразу, из-за чего «Почати перерву» (одно поле) не мог
-- сохраниться в принципе — это вскрылось только при реальной проверке потока
-- «старт → перерва → кінець перерви → стоп» через REST на этапе 3,
-- не на этапе 2, где перерыв ещё не писался в базу.
--
-- Запрещаем только обратное: break_end без break_start (закрыть то, чего
-- не открывали).
alter table work_entries drop constraint break_pair;
alter table work_entries add constraint break_pair
  check (break_start is not null or break_end is null);
