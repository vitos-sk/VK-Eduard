/**
 * Нові рядки вкладки «Години» (перенесені з адмінки). Інтегратор зводить у
 * `uk.ts` під `hours.*`; до того імпортуємо напряму.
 */
export const hoursStrings = {
  scopeLabel: "Чиї години",
  scopeSelf: "Я",
  scopeTeam: "Команда",
  filterWorkerLabel: "Співробітник",
  filterWorkerAll: "Усі співробітники",
  filterSiteLabel: "Об'єкт",
  filterSiteAll: "Усі об'єкти",
  resetFilters: "Скинути фільтри",
  monthTableHoursColumn: "Годин",
  monthTableSourceColumn: "Джерело",
  monthTableDescriptionColumn: "Опис",
  sourceTimer: "Таймер",
  sourceManual: "Вручну",
  noDescription: "Без опису",
  emptyFilteredTitle: "Записів за цими фільтрами не знайдено",
  emptyFilteredHint: "Спробуйте скинути фільтри або обрати інший місяць",
  loadMore: "Показати ще",
  shownCount: "Показано {shown} із {total}",
  exportHint: "Табель за обраний місяць",
} as const;
