export const AdditionalTranslations: Readonly<Record<string, string>> = {
  'Enter a valid username and password.': 'Введите корректные имя пользователя и пароль.',
  'The username or password is incorrect.': 'Неверное имя пользователя или пароль.',
  'Your session has expired. Please sign in again.': 'Ваша сессия истекла. Войдите ещё раз.',
  'Too many attempts. Please wait before trying again.':
    'Слишком много попыток. Подождите и попробуйте снова.',
  'This request could not be verified. Please reload the page and try again.':
    'Не удалось проверить запрос. Обновите страницу и попробуйте снова.',
  'The administration service is unavailable. Please try again.':
    'Сервис администрирования недоступен. Попробуйте снова.',
  'The request timed out. Please try again.': 'Время ожидания запроса истекло. Попробуйте снова.',
  'The administration service returned an invalid response.':
    'Сервис администрирования вернул некорректный ответ.',
  'e.g. demo-google-search': 'например, demo-google-search',
  'Analytics could not be loaded. Check your connection and try again.':
    'Не удалось загрузить аналитику. Проверьте соединение и попробуйте снова.',
  'Version choices could not be loaded. You can still view all versions.':
    'Не удалось загрузить список версий для выбора. Вы по-прежнему можете просмотреть все версии.',
  'Version {version}': 'Версия {version}',
  'Choose version: {version}': 'Выбрать версию: {version}',
  'Change the version or campaign filter. If this funnel is new, import a configuration first.':
    'Измените фильтр версии или кампании. Если воронка новая, сначала импортируйте конфигурацию.',
  'CTA conversion measures recommendation opens out of all started sessions. Result completion measures result views out of started sessions. CTA click-through measures recommendation opens out of result viewers.':
    'Конверсия CTA — доля начатых сессий, в которых открыли рекомендации. Доля завершений — просмотры результата относительно начатых сессий. Кликабельность CTA — открытия рекомендаций относительно просмотров результата.',
  'Compare A and B within the same version and experiment. Variant B tests whether question order and result wording lead to more recommendation opens. Comparisons across versions show differences, not evidence of an experiment’s effect.':
    'Сравнивайте A и B в рамках одной версии и эксперимента. Вариант B проверяет, влияют ли порядок вопросов и формулировка результата на открытия рекомендаций. Сравнение разных версий показывает различия, но не доказывает эффект эксперимента.',
  'All counts and rates use the selected filters. Campaigns come from the UTM value recorded at session start. Repeat views count once per session. Exclude forced assignments when comparing A and B.':
    'Все количества и доли учитывают выбранные фильтры. Кампания определяется по UTM-значению при начале сессии. Повторные просмотры учитываются один раз за сессию. При сравнении A и B исключайте принудительные назначения.',
  'Sessions with a recorded step view, as a share of all started sessions in this variant. Conditional branches can skip steps.':
    'Сессии с зарегистрированным просмотром шага относительно всех начатых сессий варианта. Условные ветки могут пропускать шаги.',
  'Sessions with server-confirmed progress past the step. Completion does not apply to result steps.':
    'Сессии с подтверждённым сервером переходом после шага. Для шагов результата завершение не рассчитывается.',
  'Sessions that reached the step without completing it and may still continue.':
    'Сессии, которые дошли до шага, но не завершили его и ещё могут продолжиться.',
  'Sessions that reached the step and expired without completion. Counts are per step, not unique lost sessions.':
    'Сессии, которые дошли до шага и истекли без его завершения. Счётчики относятся к отдельным шагам, а не к уникальным потерянным сессиям.',
  transitions: 'переходов',
  '· transitions': '· переходов',
  'Open sessions can still continue. Expired dropout is the share of expired viewers who did not complete the step. Results are the final step, so only views are counted.':
    'Открытые сессии ещё могут продолжиться. Отток после истечения — доля просмотревших шаг с истёкшей сессией, которые его не завершили. Результат — последний шаг, поэтому для него учитываются только просмотры.',
  'Observed conversion: source viewers reaching this destination. Branch share: transitions on this edge / source forward transitions. Transition-to-view: destination viewers / edge transitions. Branch shares may exceed 100% in total after revisits.':
    'Наблюдаемая конверсия — доля посетителей исходного шага, дошедших до целевого. Доля ветки — переходы по этой связи / переходы вперёд из исходного шага. Просмотры на переход — посетители целевого шага / переходы по связи. Из-за повторных посещений сумма долей веток может превышать 100%.',
  'This view could not be loaded.': 'Не удалось загрузить этот раздел.',
  'Reload the page to download the latest application files. Saved server data is preserved.':
    'Обновите страницу, чтобы загрузить актуальные файлы приложения. Данные на сервере сохранятся.',
  'Reload page': 'Обновить страницу',
  'The application root element is missing.': 'Корневой элемент приложения отсутствует.',
  More: 'Ещё',
  Sidebar: 'Боковая панель',
  'Displays the mobile sidebar.': 'Открывает боковую панель на мобильном устройстве.',
  'Toggle Sidebar': 'Показать или скрыть боковую панель',
  'Unable to load workspace data.': 'Не удалось загрузить данные рабочего пространства.',
  'The administration service is unavailable. Try again.':
    'Сервис администрирования недоступен. Попробуйте снова.',
  'The request timed out. Check the current state before trying again.':
    'Время ожидания запроса истекло. Перед повторной попыткой проверьте текущее состояние.',
  'Your session expired. Sign in again.': 'Ваша сессия истекла. Войдите ещё раз.',
  'This action is not permitted.': 'Это действие запрещено.',
  'We couldn’t find this funnel or configuration. Check the link or choose another funnel from the sidebar.':
    'Воронка или конфигурация не найдена. Проверьте ссылку или выберите другую воронку в боковой панели.',
  'The configuration changed or this operation conflicts with an earlier request. Reload the current state.':
    'Конфигурация изменилась или операция конфликтует с предыдущим запросом. Обновите текущее состояние.',
  'The configuration or request failed validation.': 'Конфигурация или запрос не прошли проверку.',
  'Too many requests. Wait a moment and try again.':
    'Слишком много запросов. Немного подождите и попробуйте снова.',
  'The configuration exceeds the server size limit.':
    'Размер конфигурации превышает ограничение сервера.',
  'Service connection': 'Соединение с сервисом',
  'Check connection': 'Проверить соединение',
  'Checking backend connection': 'Проверяем соединение с сервером',
  'Backend connection verified': 'Соединение с сервером проверено',
  'Backend unavailable': 'Сервер недоступен',
  'Waiting for a readiness response.': 'Ожидаем ответ о готовности сервера.',
  'The readiness check did not succeed. Start the backend and try again.':
    'Проверка готовности не прошла. Запустите сервер и попробуйте снова.',
  'Verified at ': 'Проверено: ',
  '. This check confirms backend readiness only.':
    '. Эта проверка подтверждает только готовность сервера.',
  'The service readiness check timed out.': 'Время ожидания проверки готовности сервера истекло.',
  'The backend is not ready.': 'Сервер не готов к работе.',
  'The service returned an invalid readiness response.':
    'Сервер вернул некорректный ответ о готовности.',
  'Opening workspace': 'Открываем рабочее пространство',
  'Variant {variant}: share of starts': 'Вариант {variant}: доля начатых сессий',
  'Variant {variant}: result completion': 'Вариант {variant}: доля просмотров результата',
  'Variant {variant}: CTA conversion': 'Вариант {variant}: конверсия CTA',
  'Variant {variant} CTA conversion': 'Конверсия CTA варианта {variant}',
  '{step} completion': 'Завершение шага {step}',
  'Version {version} analytics': 'Аналитика версии {version}',
  'Variant {variant} share of started sessions': 'Доля начатых сессий варианта {variant}',
  'Version {version} variants': 'Варианты версии {version}',
  'Variant {variant} detail views': 'Подробные представления варианта {variant}',
  '{step}: share of started sessions reached': '{step}: доля начатых сессий, дошедших до шага',
  'CTA conversion is the share of started sessions with a recorded CTA click. Result completion is the share that viewed a result. CTA click-through is the share of result viewers who also clicked a CTA.':
    'Конверсия CTA — доля начатых сессий с зарегистрированным нажатием CTA. Достижение результата — доля сессий с просмотром результата. CTR — доля просмотревших результат, которые также нажали CTA.',
  'Compare variants within the same version and experiment. The configuration defines what differs between them. Differences across versions do not establish an experiment\u2019s effect.':
    'Сравнивайте варианты одной версии и эксперимента. Их различия определяет конфигурация. Разница между версиями сама по себе не доказывает эффект эксперимента.',
  'Result views and recorded CTA clicks per started session.':
    'Просмотры результатов и зарегистрированные нажатия CTA на начатую сессию.',
  'Variant {variant}: {metric}': 'Вариант {variant}: {metric}',
  breadcrumb: 'Навигационная цепочка',
  'Loading records': 'Загрузка записей',
  'Loading comparison chart': 'Загрузка сравнительного графика',
  'Campaign: {campaign}': 'Кампания: {campaign}',
  '(empty)': '(пусто)',
  'Variant {variant}': 'Вариант {variant}',
  'Connection unavailable': 'Нет соединения',
  'Your workspace is out of reach': 'Не удалось открыть рабочее пространство',
  'Kelpie could not check your administrator session. The service may be temporarily unavailable, or the connection may have been interrupted.':
    'Kelpie не удалось проверить вашу сессию администратора. Возможно, сервис временно недоступен или соединение прервалось.',
  'Let\u2019s reconnect': 'Попробуем восстановить связь',
  'Check your internet connection, then try again. You do not need to reset your password for this connection error.':
    'Проверьте подключение к интернету и повторите попытку. Сбрасывать пароль из-за этой ошибки соединения не нужно.',
  'Retry connection': 'Повторить подключение',
  'Still unable to connect? Contact your administrator and share the details below.':
    'Не помогло? Свяжитесь с администратором и передайте сведения об ошибке ниже.',
  'Connection details': 'Сведения об ошибке',
};
