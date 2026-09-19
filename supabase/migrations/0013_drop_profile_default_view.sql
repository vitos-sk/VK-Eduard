-- Прибираємо default_view: адмінка розчинилась у застосунку, вибір
-- «дефолтного екрана» більше не потрібен. Inline check-обмеження з 0011
-- видаляється разом із колонкою.

alter table profiles
  drop column if exists default_view;
