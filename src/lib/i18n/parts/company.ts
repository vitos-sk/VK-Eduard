/**
 * Рядки потоку «Команда і Компанія» (перенесено з `t.admin.team` / `t.admin.settings`).
 * Інтегратор зводить у `uk.ts` (`profile.company.*`, `profile.teamPage.*`).
 */
export const companyStrings = {
  title: "Компанія",
  team: {
    searchPlaceholder: "Пошук співробітника",
    addWorker: "Додати співробітника",
    hoursThisMonth: "год за місяць",
    dailyNorm: "Норма",
    dailyNormUnit: "год/день",
    dailyNormSave: "Зберегти",
    dailyNormSaved: "Норму збережено",
    dailyNormError: "Не вдалося зберегти норму. Спробуйте ще раз",
    dailyNormInvalid: "Норма має бути від 1 до 24 год",
    empty: "У компанії ще немає активних працівників",
    emptyHint: "Додайте першого співробітника кнопкою вище",
    emptySearchTitle: "Нічого не знайдено",
    emptySearchHint: "Спробуйте інше ім'я",
  },
  settings: {
    dailyNormTitle: "Денна норма годин",
    dailyNormDescription:
      "Стартове значення для нових співробітників. Кожному можна задати власну норму в розділі «Команда».",
    dailyNormLabel: "Норма",
    dailyNormUnit: "год/день",
    dailyNormSave: "Зберегти",
    dailyNormSaved: "Норму компанії збережено",
    dailyNormInvalid: "Норма має бути від 1 до 24 год",
    dailyNormSaveError: "Не вдалося зберегти норму. Спробуйте ще раз",

    categoriesTitle: "Категорії робіт",
    categoriesDescription: "Використовуються у звітах по об'єктах для позначення виду роботи.",
    categoriesAddPlaceholder: "Назва нової категорії",
    categoriesAdd: "Додати",
    categoriesNameRequired: "Введіть назву категорії",
    categoriesSaveError: "Не вдалося зберегти зміни. Спробуйте ще раз",
    categoriesEmpty: "Категорій ще немає",
    categoriesArchivedBadge: "Архів",
    categoriesArchive: "Архівувати",
    categoriesRestore: "Розархівувати",
    categoriesArchiveConfirmTitle: "Архівувати категорію?",
    categoriesArchiveConfirmBody:
      "Категорія «{name}» зникне зі списку вибору в нових звітах. Старі звіти з нею залишаться без змін, відновити категорію можна будь-коли.",
    categoriesArchiveConfirmAction: "Архівувати",
  },
} as const;
