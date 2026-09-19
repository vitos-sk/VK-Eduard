/**
 * Рядки потоку «Звіти → Команда» (мультивибір, KPI, стрічка звітів компанії,
 * WhatsApp-шеринг). Замінюють `t.admin.panel.*` / `t.admin.reports.*`.
 */
export const reportsStrings = {
  team: {
    kpiHours: "Годин за місяць",
    kpiActive: "Активних співробітників",
    kpiAvg: "Ø на співробітника",
    searchPlaceholder: "Пошук співробітника",
    selectAll: "Усі",
    deselectAll: "Зняти всі",
    selected: "Обрано: {n}",
    selectedAll: "Обрано: усі",
    openWorker: "Звіти співробітника",
    workersTitle: "Співробітники",
    reportsTitle: "Звіти компанії",
  },
  whatsapp: {
    label: "WhatsApp",
    fallbackText: "Файл завантажено — прикріпіть його вручну в чаті",
    error: "Не вдалося підготувати файл",
  },
  feed: {
    kpiReports: "Звітів за період",
    kpiPhotos: "Фото за період",
    filterSiteLabel: "Об'єкт",
    filterSiteAll: "Усі об'єкти",
    noSite: "Без об'єкта",
    photosCount: "{n} фото",
    emptyTitle: "За цей період звітів немає",
    emptyFilteredTitle: "Звітів за цими фільтрами не знайдено",
    emptyFilteredHint: "Спробуйте скинути фільтри або обрати інший місяць",
    deleteReport: "Видалити звіт",
    deleteConfirmTitle: "Видалити звіт?",
    deleteConfirmBody: "Звіт разом з усіма фото зникне назавжди — відновити його не вийде.",
    deleteConfirmAction: "Видалити",
    deleteSuccess: "Звіт видалено",
    loadError: "Не вдалося оновити список звітів",
  },
} as const;
