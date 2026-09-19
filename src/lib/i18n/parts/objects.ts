/**
 * Рядки для boss-функцій екранів «Об'єкти» (перенесено з адмінки).
 * Інтегратор зводить у `uk.ts` як `objects.boss.*`.
 */
export const objectsStrings = {
  archiveTabs: {
    active: "Активні",
    archived: "Архів",
    all: "Всі",
  },
  archiveTabsLabel: "Архів об'єктів",
  hoursLabel: "Години",
  workersCount: "{n} людей",
  noHours: "Немає годин",
  menu: {
    open: "Дії з об'єктом",
    edit: "Редагувати",
    archive: "Архівувати",
    restore: "Розархівувати",
    delete: "Видалити",
    deleteConfirmTitle: "Видалити об'єкт?",
    deleteConfirmBody:
      "Об'єкт «{name}» зникне назавжди. Записи часу, де його вказано, залишаться, але втратять прив'язку до нього.",
    deleteConfirmAction: "Видалити",
  },
  emptySearchTitle: "Нічого не знайдено",
  emptySearchHint: "Спробуйте змінити пошуковий запит або фільтри",
  emptyTitle: "Об'єктів ще немає",
  emptyHint: "Додайте перший об'єкт, щоб бачити по ньому години й команду",
  detail: {
    periodTitle: "Години та люди",
    hours: "Години",
    workers: "Людей",
  },
} as const;
