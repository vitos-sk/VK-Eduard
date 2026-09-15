/**
 * Единственный источник текстов интерфейса. Украинский.
 * Ни одной строки текста не должно попадать в JSX напрямую.
 *
 * Плейсхолдеры в фигурных скобках подставляются через `fmt()` из `@/lib/format`:
 * `fmt(t.home.greeting, { name: "Віталік" })`.
 *
 * Структура файла заложена под будущие локали (de, en) — добавится
 * соседний файл с тем же типом.
 */
export const uk = {
  /** Общее: кнопки и подписи, которые встречаются на разных экранах. */
  common: {
    appName: "K group",
    /** Слово рядом со знаком в логотипе: знак «K» + «group.». */
    appWordmark: "group",
    cancel: "Скасувати",
    save: "Зберегти",
    back: "Назад",
    close: "Закрити",
    all: "Всі",
    filters: "Фільтри",
    apply: "Застосувати",
    reset: "Скинути",
    viewAll: "Дивитися всі",
    notFound: "Нічого не знайдено",
    notFoundHint: "Спробуйте змінити фільтри або пошуковий запит",
    optional: "необов'язково",
    notifications: "Сповіщення",
    profile: "Профіль",
    dash: "—",
  },

  /**
   * Тексты ярлыка на домашнем экране: манифест и меню быстрых действий
   * (долгое нажатие на иконку в Android). Пользователь видит их вне интерфейса,
   * поэтому названия короткие — длинные лаунчер обрежет.
   */
  pwa: {
    description: "Облік робочих годин і звітів",
    shortcuts: {
      hours: { name: "Години", description: "Скільки відпрацьовано" },
      newReport: { name: "Новий звіт", description: "Створити звіт по роботі" },
      manualTime: { name: "Додати час", description: "Внести години вручну" },
    },
  },

  /** Нижний таб-бар. */
  nav: {
    home: "Головна",
    objects: "Об'єкти",
    add: "Додати",
    hours: "Години",
    reports: "Звіти",
    dashboard: "Дашборд",
  },

  /** Вход. Регистрации нет: людей заводит шеф. */
  auth: {
    title: "Вхід",
    subtitle: "Введіть дані, які дав вам шеф",
    email: "Email",
    emailPlaceholder: "ivan@firma.com",
    password: "Пароль",
    passwordPlaceholder: "Ваш пароль",
    submit: "Увійти",
    submitting: "Входимо…",
    signOut: "Вийти",
    /** Текст один на любую ошибку входа: подсказывать, что email существует, — помощь чужому. */
    failed: "Невірний email або пароль",
    /** Профиль не заведён — вход прошёл, но профиля в базе нет. */
    noProfile: "Обліковий запис не прив'язаний до фірми. Зверніться до шефа.",
    networkError: "Немає зв'язку із сервером. Спробуйте ще раз.",
  },

  /** Настройки: профиль, переключатели и служебные экраны (`/more`). */
  profile: {
    title: "Налаштування",
    roleWorker: "Робітник",
    roleBoss: "Шеф",
    company: "Фірма",
    norm: "Норма на день",
    normValue: "{hours} год",
    change: "Змінити",
    nameLabel: "Ім'я",
    namePlaceholder: "Ваше ім'я",
    nameRequired: "Вкажіть ім'я",
    saveError: "Не вдалося зберегти. Спробуйте ще раз",
    editTitle: "Змінити ім'я",
    save: "Зберегти",
    rows: {
      team: "Команда",
      notifications: "Сповіщення",
      language: "Мова",
      languageValue: "Українська",
      theme: "Тема",
      themeValue: "Темна",
      data: "Керування даними",
      help: "Допомога",
      about: "Про додаток",
    },
    teamPage: {
      title: "Команда",
      empty: "У компанії ще немає активних працівників",
    },
    notificationsPage: {
      title: "Сповіщення",
      body: "У застосунку поки немає push-сповіщень. Усі оновлення — нові звіти, зміни статусу об'єкта — одразу видно на відповідних екранах.",
    },
    languagePage: {
      title: "Мова",
      body: "Зараз інтерфейс доступний тільки українською. Інші мови додамо пізніше.",
    },
    themePage: {
      title: "Тема",
      body: "Застосунок працює в темній темі. Світла тема поки не зроблена.",
    },
    dataPage: {
      title: "Керування даними",
      body: "Завантажте власні відпрацьовані години за весь час у зручному форматі.",
      exportLabel: "Експорт годин",
    },
    helpPage: {
      title: "Допомога",
      body: "Якщо щось не працює або є питання — зверніться до свого шефа чи адміністратора компанії.",
    },
    aboutPage: {
      title: "Про додаток",
      body: "K group — облік робочих годин і звітів для будівельних бригад.",
    },
  },

  /** Стартовый экран для тех, кто ещё не вошёл. */
  welcome: {
    /** Заголовок разбит на строки — на макете он в три строки. */
    titleLine1: "Робота.",
    titleLine2: "Просто.",
    titleLine3: "Чітко.",
    features: {
      hours: "Запис робочих годин",
      description: "Опис виконаної роботи",
      photos: "Додавання фото",
      overtime: "Додаткові години",
      database: "База даних для шефа",
    },
    start: "Почати роботу",
    install: "Встановити застосунок",
    installIos: "Щоб встановити: натисніть «Поділитися», далі «На екран «Додому»»",
  },

  /** Экран «Головна». */
  home: {
    greeting: "Доброго ранку, {name} 👋",
    workTime: "Робочий час",
    startedAt: "Початок роботи",
    startWork: "Почати роботу",
    finishWork: "Завершити роботу",
    myObjects: "Мої об'єкти",
    viewAll: "Дивитися всі",
  },

  /** Экран «Об'єкти». */
  objects: {
    title: "Об'єкти",
    searchPlaceholder: "Пошук об'єкта",
    addObject: "Додати об'єкт",
    tabs: {
      all: "Всі",
      inProgress: "В роботі",
      notStarted: "Не розпочато",
      completed: "Завершені",
    },
    photosCount: "{n} фото",
    reportsCount: "{n} звіти",
    emptyTitle: "Об'єктів немає",
    emptyHint: "Тут з'являться майданчики, до яких вас призначать",
    archivedBadge: "Архів",
    /** Детальна сторінка `/objects/[id]`. */
    detail: {
      kind: "Вид робіт",
      address: "Адреса",
      myReports: "Мої звіти",
      reportsTitle: "Звіти",
      categoryStatsEmpty: "Категорії з'являться, щойно ви вкажете вид робіт у звіті",
      emptyTitle: "Ви ще не працювали на цьому об'єкті",
      emptyHint: "Звіти з'являться тут, щойно ви відмітите час на цьому об'єкті",
      emptyTitleAll: "Ще немає звітів по цьому об'єкту",
      edit: "Редагувати",
      archive: "Архівувати об'єкт",
      restore: "Розархівувати об'єкт",
      openInMaps: "Прокласти маршрут",
      delete: "Видалити об'єкт",
      deleteConfirmTitle: "Видалити об'єкт?",
      deleteConfirmBody:
        "Об'єкт зникне назавжди. Звіти, де його вказано, залишаться, але втратять прив'язку до нього.",
      deleteConfirmAction: "Видалити",
      deleteError: "Не вдалося видалити об'єкт. Спробуйте ще раз",
    },
    /** Форма `/objects/new` і `/objects/[id]/edit` — тільки boss. */
    form: {
      createTitle: "Новий об'єкт",
      editTitle: "Редагувати об'єкт",
      nameLabel: "Назва",
      namePlaceholder: "Наприклад: Reimond",
      kindLabel: "Вид робіт",
      kindPlaceholder: "Наприклад: Покрівля",
      addressLabel: "Адреса",
      addressPlaceholder: "Місто, вулиця",
      statusLabel: "Статус",
      photoLabel: "Фото об'єкта",
      addPhoto: "Додати фото",
      changePhoto: "Змінити фото",
      uploadingPhoto: "Завантаження...",
      uploadPhotoError: "Не вдалося завантажити фото",
      removePhotoError: "Не вдалося видалити фото",
      save: "Зберегти",
      nameRequired: "Вкажіть назву об'єкта",
      saveError: "Не вдалося зберегти об'єкт. Спробуйте ще раз",
    },
  },

  /** Экран «Години». */
  hours: {
    title: "Години",
    tabs: {
      day: "День",
      week: "Тиждень",
      month: "Місяць",
    },
    workedToday: "Відпрацьовано сьогодні",
    workedPeriod: "Відпрацьовано за період",
    start: "Початок",
    finish: "Завершення",
    break: "Перерва",
    entriesTitle: "Записи дня",
    entryOngoing: "триває",
    entryManualBadge: "вручну",
    details: "Деталі робочого часу",
    workTime: "Робочий час",
    objects: "Об'єкти",
    noObject: "Без об'єкта",
    now: "Зараз",
    pause: "Пауза",
    resume: "Продовжити",
    startWork: "Почати роботу",
    finishWork: "Завершити роботу",
    addManually: "Додати час вручну",
    plan: "Норма",
    daysWorked: "Робочих днів",
    average: "У середньому за день",
    pickDate: "Обрати дату",
    prevPeriod: "Попередній період",
    nextPeriod: "Наступний період",
    emptyTitle: "За цей період даних немає",
    emptyHint: "Оберіть інший період або додайте час вручну",
    noEntriesToday: "Записів за цей день ще немає",
    /** Таблиця «Зміни за місяць» внизу екрана — своя рабочому, вся компанія шефу. */
    monthTableTitle: "Зміни за місяць",
    monthTableWorkerColumn: "Ім'я",
    monthTableDateColumn: "Дата",
    monthTableTimeColumn: "Час",
    monthTableObjectColumn: "Об'єкт",
    monthTableEmpty: "За цей місяць змін ще немає",
    monthTableScrollHint: "Гортати таблицю по горизонталі",
    /** Ошибки действий таймера — один текст на разные причины отказа базы. */
    alreadyRunning: "Зміна вже триває",
    noOpenShift: "Немає активної зміни",
    breakAlreadyTaken: "Перерва вже була — за зміну вона одна",
    breakNotStarted: "Перерва ще не почалась",
    breakAlreadyEnded: "Перерва вже закінчилась",
    genericError: "Не вдалося зберегти. Спробуйте ще раз",
    /** Іконки редагування/видалення в «Зміни за місяць» і на детальній сторінці запису. */
    editEntry: "Редагувати запис",
    deleteEntry: "Видалити запис",
    deleteConfirmTitle: "Видалити запис?",
    deleteConfirmBody: "Дію не можна скасувати — запис про робочий час буде видалено назавжди.",
    deleteConfirmAction: "Видалити",
    entryDeleted: "Запис видалено",
    deleteError: "Не вдалося видалити запис. Спробуйте ще раз",
    /** Калькулятор зарплати — вкладка «Місяць». Ставка не зберігається, тільки на сесію. */
    salaryCalcTitle: "Калькулятор зарплати",
    salaryCalcWorkerLabel: "Співробітник",
    salaryCalcSelf: "Я",
    salaryCalcRateLabel: "Ставка, €/год",
    salaryCalcRatePlaceholder: "Наприклад: 150",
    salaryCalcAmount: "Заробіток за місяць",
    salaryCalcCopy: "Скопіювати",
    salaryCalcCopied: "Скопійовано",
  },

  /** Экран «Звіти». */
  reports: {
    title: "Звіти",
    searchPlaceholder: "Пошук звіту...",
    createReport: "Створити звіт",
    /** REPORTS.md, раздел 2: не статуси и не групувальні вкладки, а фільтр по вмісту. */
    tabs: {
      all: "Усі",
      noDescription: "Без опису",
      withPhoto: "З фото",
    },
    /** Верхні вкладки екрана — «Команда» видно тільки boss (REPORTS.md, розділ 4). */
    screenTabs: {
      mine: "Мої",
      team: "Команда",
    },
    team: {
      allWorkers: "Усі працівники",
      thisWeek: "Цей тиждень: {hours}",
      empty: "У компанії ще немає активних працівників",
      back: "Команда",
      addWorker: "Додати співробітника",
      form: {
        title: "Новий співробітник",
        nameLabel: "Ім'я",
        namePlaceholder: "Наприклад: Андрій",
        emailLabel: "Email",
        emailPlaceholder: "andriy@firma.com",
        passwordLabel: "Пароль",
        passwordPlaceholder: "Мінімум 6 символів",
        roleLabel: "Роль",
        roleWorker: "Робітник",
        roleBoss: "Шеф",
        save: "Створити",
        cancel: "Скасувати",
        nameRequired: "Вкажіть ім'я",
        emailInvalid: "Перевірте email",
        emailTaken: "Користувач з таким email вже є",
        passwordTooShort: "Пароль має бути не менше 6 символів",
        saveError: "Не вдалося створити співробітника. Спробуйте ще раз",
        createdTitle: "Співробітника створено",
        createdHint: "Передайте співробітнику email і пароль, які ви щойно вказали",
        close: "Закрити",
      },
      deactivate: "Деактивувати співробітника",
      deactivateConfirmTitle: "Деактивувати співробітника?",
      deactivateConfirmBody:
        "Співробітник втратить доступ до застосунку і зникне зі списку команди. Його звіти та години залишаться в історії.",
      deactivateConfirmAction: "Деактивувати",
      deactivateError: "Не вдалося деактивувати співробітника. Спробуйте ще раз",
    },
    today: "Сьогодні",
    yesterday: "Вчора",
    reportsCount: "{n} звітів",
    photosCount: "{n} фото",
    /**
     * Сводка над списком по видимій вибірці (REPORTS.md, раздел 3) —
     * кількість звітів і домінуюча категорія замість колишньої суми годин.
     */
    reportsSummaryCount: "{n} звітів",
    reportsSummaryDominant: "переважно: {label}",
    noDescriptionBadge: "Без опису",
    addDescription: "Дописати",
    emptyTitle: "Ще немає звітів",
    emptyHint: "Створіть перший звіт по виконаній роботі",
    emptyFilterTitle: "Нічого не знайдено",
    emptyFilterHint: "Спробуйте змінити фільтри або пошуковий запит",
    /** Фільтр «Без опису» нічого не знайшов — це нагорода, а не порожнеча. */
    emptyNoDescriptionTitle: "Усі звіти заповнені 👍",
  },

  /** Детальна сторінка `/reports/[id]`. */
  reportDetail: {
    backTitle: "Звіт",
    edit: "Редагувати",
    addDescriptionTitle: "Додати опис",
    addDescriptionPlaceholder: "Наприклад: Монтаж покрівельної мембрани",
    save: "Зберегти",
    saved: "Опис збережено",
    saveError: "Не вдалося зберегти опис. Спробуйте ще раз",
    createdBy: "Створив(ла) {name}",
    worked: "Відпрацьовано",
    overtime: "Додатково",
    photosTitle: "Фото",
    addPhoto: "Додати фото",
    removePhoto: "Видалити фото",
    uploading: "Завантаження...",
    uploadError: "Не вдалося завантажити фото",
    deletePhotoError: "Не вдалося видалити фото",
    maxPhotos: "Максимум {max} фото",
    /** RLS відхилила зміну — запис не ваш, або з ним щось відбулось паралельно. */
    saveRejected: "Не вдалося зберегти зміни. Спробуйте ще раз або зверніться до шефа",
    deleteEntry: "Видалити звіт",
    deleteConfirmTitle: "Видалити звіт?",
    deleteConfirmBody: "Дію не можна скасувати — звіт буде видалено назавжди.",
    deleteConfirmAction: "Видалити",
    entryDeleted: "Звіт видалено",
    deleteError: "Не вдалося видалити звіт. Спробуйте ще раз",
    categoriesLabel: "Вид робіт",
    noCategoriesLabel: "Не вказано",
  },

  /** Форма `/reports/new` — створення звіту з нуля. */
  reportForm: {
    title: "Новий звіт",
    categoriesLabel: "Вид робіт",
    repeatYesterday: "Повторити останній звіт",
    hint: "Опишіть, що зробили сьогодні — фото можна додати одразу після збереження",
    submit: "Зберегти звіт",
    saved: "Звіт збережено",
    saveError: "Не вдалося зберегти звіт. Спробуйте ще раз",
    photosStepTitle: "Тепер додайте фото",
    photosStepHint: "Необов'язково, але зі знімками звіт зрозуміліший",
    done: "Готово",
  },

  /** Лист быстрых действий — кнопка «+». */
  quick: {
    title: "Що ви хочете зробити?",
    manualTime: {
      title: "Додати час вручну",
      description: "Додайте години, якщо забули натиснути «Почати роботу»",
    },
    startWork: {
      title: "Почати роботу",
      description: "Запустити таймер робочого часу",
    },
    startBreak: {
      title: "Почати перерву",
      description: "Зафіксувати перерву в роботі",
    },
    createReport: {
      title: "Створити звіт",
      description: "Швидко створити звіт по роботі",
    },
    dashboard: {
      title: "Дашборд",
      description: "Загальна статистика по компанії",
    },
    breakStarted: "Перерву розпочато",
    workStarted: "Роботу розпочато",
  },

  /** Экран «Додати час вручну». */
  manualTime: {
    title: "Додати час вручну",
    editTitle: "Редагувати запис",
    hint: 'Додайте години, якщо забули натиснути "Почати роботу"',
    objectLabel: "Об'єкт (необов'язково)",
    objectPlaceholder: "Оберіть об'єкт",
    selectObject: "Оберіть об'єкт",
    date: "Дата",
    duration: "Тривалість",
    start: "Початок",
    finish: "Завершення",
    description: "Опис (необов'язково)",
    descriptionPlaceholder: "Наприклад: Ремонт покрівлі",
    submit: "Зберегти запис",
    saveChanges: "Зберегти зміни",
    saved: "Запис збережено",
    updated: "Запис оновлено",
    /**
     * Один текст на обидва випадки: тривалість поза межами 1 хв — 18 год.
     * Раніше «завершення раніше початку» вважалося помилкою завжди — тепер
     * ні: 22:00 → 06:00 це нічна зміна, а не помилка вводу (docs/DATA-MODEL.md).
     */
    errorDuration: "Перевірте час — тривалість має бути від 1 хвилини до 18 годин",
    durationValue: "{hours} год {minutes} хв",
    saveError: "Не вдалося зберегти запис. Спробуйте ще раз",
    /** Стрілки степера часу «Початок»/«Завершення». */
    decreaseTime: "Раніше",
    increaseTime: "Пізніше",
    /** Не обрано об'єкт — тоді опис обов'язковий, інакше незрозуміло, де відпрацьовано. */
    errorSiteOrDescription: "Вкажіть об'єкт або опишіть, де ви працювали",
  },

  /**
   * Розширений експорт (`ExportMenu`, у вкладці «Команда» і в «Налаштуваннях»)
   * і підписи, які він же друкує в PDF-табелі (`modules/export/pdf.ts`).
   * Раніше жили в окремій десктопній `/admin`, тепер частина звичайного
   * адаптивного застосунку — назва секції лишилась історичною.
   */
  admin: {
    dashboard: {
      monthHours: "Годин за місяць",
    },
    export: {
      label: "Експорт",
      labelReports: "Експорт звітів",
      csv: "CSV",
      xlsx: "Excel (.xlsx)",
      pdf: "PDF-табель",
      /** Назва аркуша Excel-файлу (`modules/export/xlsx.ts`). */
      sheetTitle: "Звіти",
    },
  },

  /**
   * Окрема сторінка дашборда для шефа (`/dashboard`, `DesktopSidebar`).
   * На відміну від `admin.dashboard` (міні-блок на «Головній», лише
   * поточний місяць) тут є вибір періоду, графік і рейтинги.
   */
  dashboard: {
    title: "Дашборд",
    periodMonth: "Місяць",
    periodQuarter: "Квартал",
    periodYear: "Рік",
    totalHours: "Годин за період",
    avgPerWorkday: "Ø на робочий день",
    activeWorkers: "Активних співробітників",
    objectsWorked: "Об'єктів у роботі",
    todayTitle: "Сьогодні",
    /** {active} — скільки відмітились, {total} — всього активних співробітників. */
    todayActive: "{active} з {total} активні",
    todayOpen: "Відкрито",
    /** {hours} — форматована рядком через formatHoursShort. */
    todayHoursLogged: "{hours} відмічено сьогодні",
    chartTitle: "Динаміка годин",
    chartEmpty: "Немає годин за цей період",
    topSitesTitle: "Топ-об'єкти",
    topSitesEmpty: "Немає годин за цей період",
    topWorkersTitle: "Години по співробітниках",
    topWorkersEmpty: "Немає годин за цей період",
  },

  /** Справочник статусов, раздел 3.4 плана. */
  status: {
    in_progress: "В РОБОТІ",
    not_started: "НЕ РОЗПОЧАТО",
    completed: "ЗАВЕРШЕНИЙ",
    paused: "НА ПАУЗІ",
  },

  /** Единицы времени для коротких форматов. */
  units: {
    hoursShort: "год",
    minutesShort: "хв",
    currency: "€",
  },

  /** Дни недели. `long` — для дат, `short` — для подписей диаграммы. */
  weekdays: {
    long: [
      "Неділя",
      "Понеділок",
      "Вівторок",
      "Середа",
      "Четвер",
      "П'ятниця",
      "Субота",
    ],
    short: ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },

  /**
   * Месяцы. `genitive` — для дат («30 липня»),
   * `nominative` — для заголовков периода («Липень 2025»).
   */
  months: {
    genitive: [
      "січня",
      "лютого",
      "березня",
      "квітня",
      "травня",
      "червня",
      "липня",
      "серпня",
      "вересня",
      "жовтня",
      "листопада",
      "грудня",
    ],
    nominative: [
      "Січень",
      "Лютий",
      "Березень",
      "Квітень",
      "Травень",
      "Червень",
      "Липень",
      "Серпень",
      "Вересень",
      "Жовтень",
      "Листопад",
      "Грудень",
    ],
  },
} as const;
