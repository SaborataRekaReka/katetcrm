Сделай экран `Application Card` для CRM Katet.tech.

Это отдельная самостоятельная карточка заявки.
Lead и Application нельзя визуально и логически сливать в один перегруженный объект.
Application Card должна быть рабочим операционным экраном, на котором менеджер быстро понимает:
- что это за заявка;
- от какого лида она пришла;
- кто клиент;
- какие позиции входят в заявку;
- какие позиции готовы к брони;
- где нужно выбрать свою технику или подрядчика;
- где есть warning / незавершённость;
- можно ли двигать заявку дальше по процессу.

КРИТИЧЕСКОЕ ПРАВИЛО:
СТРОГО ЗАПРЕЩЕНО СОЗДАВАТЬ НОВЫЕ UI-КОМПОНЕНТЫ.

Нельзя:
- создавать новые карточки;
- создавать новые layout-компоненты;
- создавать новый item widget;
- создавать новый reservation widget;
- создавать новый special panel;
- создавать новые tabs, drawers, menus, alerts, status pills, badges, tables, timelines, quick actions bars;
- придумывать bespoke UI специально под Application Card.

Разрешено только:
1. переиспользовать существующие компоненты UI kit;
2. собирать экран из уже существующих паттернов UI kit;
3. слегка модернизировать существующие kit-компоненты;
4. делать controlled extension существующих компонентов без создания новой дизайн-сущности.

Если чего-то “не хватает”, сначала:
- найти ближайший готовый паттерн UI kit;
- адаптировать его;
- переиспользовать повторно.
Создавать новый компонент с нуля нельзя.

Главная продуктовая логика:
- Application — это отдельная сущность после Lead;
- одна заявка может содержать несколько позиций;
- позиции могут отличаться по технике, адресу, сменам, количеству, подрядчику и источнику техники;
- внутри заявки менеджер должен готовить позиции к броне;
- по каждой позиции нужно понимать sourcing:
  - own
  - subcontractor
  - undecided
- по каждой позиции должна быть видна готовность к брони;
- по брони должен отображаться warning-конфликт, а не hard-block;
- UI не должен заставлять создавать отдельную сделку под каждую позицию.

Общий UX-принцип:
Это не “большая форма заявки”.
Это action-oriented application workspace.
Экран должен ощущаться как рабочая карточка менеджера:
- сверху — identity заявки и быстрые действия;
- ниже — overview заявки;
- в центре — позиции заявки;
- рядом — контекст клиента, lead source и readiness к брони;
- ниже — история, активность и связанные сущности.

Использовать только существующие паттерны UI kit:
- page container
- page header
- breadcrumbs
- cards / section cards
- property list / key-value / description list
- tabs
- list / compact rows / tables / accordions
- chips / badges / status pills
- alerts / banners
- action groups / split buttons / overflow menus
- dialogs / drawers
- timeline / activity feed / event list
- skeleton
- empty states
- inline validation states

Нельзя создавать:
- новый “application summary widget”
- новый “multi-item constructor component”
- новый “reservation readiness component”
- новый “position card” как отдельную дизайн-сущность
- новый “sourcing selector widget”
- новый “conflict banner widget”
- новый “sticky process panel”

Нужна такая структура экрана:

1. Page shell
Используй существующий page layout из UI kit.

Верх:
- Breadcrumbs: Заявки / Карточка заявки
- Title: номер заявки или title заявки
- Subtitle: стадия + клиент + дата создания
- справа быстрые действия

2. Header actions
Используй только существующие action patterns UI kit.

Нужны действия:
- Редактировать
- Добавить позицию
- Перевести в бронь
- Перевести в выезд, если допустимо
- Открыть клиента
- Открыть исходный лид
- Меню “Ещё”

Если в kit уже есть:
- toolbar actions
- action group
- split button
- overflow menu
использовать именно их.

Не делать новый кастомный header action bar.

3. Top summary row
Под header сделать компактный summary row на существующих info/stat components.

Показать:
- текущая стадия заявки
- клиент
- ответственный менеджер
- количество позиций
- сколько позиций готовы к брони
- есть ли активные брони
- есть ли конфликт / warning
- последняя активность

Это operational summary row, а не аналитика.

4. Main layout
Собери страницу в 2 колонки.

Левая колонка:
- application overview
- positions section
- activity / timeline
- связанные сущности

Правая колонка:
- quick process context
- readiness to reserve
- linked client / linked lead
- reservation summary
- sticky quick actions, если в UI kit уже есть такой паттерн

Использовать только существующие card/section/layout patterns kit.

5. Application overview card
В существующем detail / summary / property pattern показать:
- title / номер заявки
- статус
- linked lead
- linked client
- responsible manager
- requested date
- requested time from / to
- address
- comment
- isUrgent
- deliveryMode
- nightWork
- created at
- updated at / last activity

Если часть полей отсутствует:
- скрывать аккуратно;
- не показывать null / undefined / мусор;
- использовать стандартное поведение kit для missing values.

6. Linked lead / linked client block
Отдельным существующим linked-record / compact entity pattern показать:
- исходный лид
- клиента
- быстрые переходы в Lead Card и Client Card

Никаких новых custom link blocks.

7. Positions section
Это центральная часть экрана.

Каждая позиция заявки должна быть визуально отделена, но только через существующие patterns UI kit:
- card sections
- accordion items
- list cards
- expandable rows
- table rows with detail panel
- stacked section blocks

Нельзя создавать новый “ApplicationItem component” как новую дизайн-сущность.

Для каждой позиции нужно показывать:
- тип техники
- quantity
- shiftCount
- overtimeHours
- downtimeHours
- planned date
- planned time from / to
- address
- comment
- sourcingType
- subcontractor, если выбран
- дополнительные параметры
- pricePerShift / deliveryPrice / surcharge, если эти данные уже есть
- reservation state, если уже есть бронь

8. Position actions
Для каждой позиции нужны быстрые действия через существующие action row / menu / inline actions patterns:
- Редактировать
- Копировать позицию
- Удалить
- Подготовить к брони
- Выбрать источник техники
- Открыть связанную бронь, если есть

Не создавать новый action system.

9. Multi-item behavior
Позиции в заявке — один из ключевых сценариев.
Нужно, чтобы экран явно поддерживал:
- несколько позиций в одной заявке;
- независимые параметры по каждой позиции;
- быстрый просмотр статуса каждой позиции;
- быстрое копирование позиции;
- отсутствие ощущения, что под каждую позицию нужна отдельная сущность в интерфейсе.

Использовать только существующие repeatable section / list row / accordion / table-detail patterns.

10. Sourcing and reservation readiness
По каждой позиции нужно ясно показывать:
- own
- subcontractor
- undecided

И дополнительно:
- выбран ли подрядчик
- выбран ли unit
- есть ли активная бронь
- есть ли warning-конфликт
- готова ли позиция к переводу в Reservation stage

Это нужно собрать на уже существующих:
- chips
- badges
- helper text
- alerts
- key-value rows
- status rows

Нельзя делать новый reservation readiness widget.

11. Reservation summary card
На правой колонке сделать компактный summary block по брони на существующих card patterns.

Показать:
- сколько позиций без брони
- сколько в статусе поиска своей техники
- сколько в поиске подрядчика
- сколько уже type_reserved
- сколько unit_defined
- есть ли conflict warnings
- есть ли ready_for_departure

Важно:
это не новый кастомный виджет.
Это composition из существующих stat/info/alert blocks.

12. Validation / completeness block
Нужно явно показывать, насколько заявка готова к следующему шагу.

Не как новая дизайн-сущность, а через существующие validation/checklist/helper patterns.

Нужно показать:
- есть ли хотя бы одна позиция;
- заполнены ли базовые поля заявки;
- у всех ли позиций есть обязательные параметры;
- есть ли позиции без sourcing;
- есть ли позиции без техники / подрядчика;
- можно ли двигать заявку дальше.

Если действие недоступно:
- primary action disabled;
- рядом helper text;
- если нужно — стандартный warning alert.

13. Comments / request block
Показать общий комментарий по заявке в существующем note/description block pattern.
Не делать отдельную custom text panel.

14. Activity / timeline section
Показать историю по заявке:
- создание
- редактирование
- добавление позиции
- удаление позиции
- копирование позиции
- смена стадии
- действия по броням
- перевод в выезд
- завершение, если применимо

Использовать существующий timeline / activity feed / event list pattern.
Не показывать raw JSON.

15. Related reservations block
Если по заявке уже есть брони, показать их через существующие compact rows / related entity list / linked cards patterns.

По каждой броне показать:
- позицию
- тип техники
- subcontractor / own
- unit, если есть
- internal stage
- conflict warning
- quick open

16. Conversion / stage CTA
Primary CTA зависит от состояния заявки.

На этапе application основной action обычно:
- Перевести в бронь

Дополнительные:
- Добавить позицию
- Сохранить изменения
- Открыть клиента
- Открыть lead
- Перейти к выезду, если допустимо

Любой критичный action — только через уже существующие dialog / confirm patterns kit.
Не создавать новый conversion panel.

17. Editing behavior
Редактирование должно опираться только на существующие patterns:
- inline edit, если он уже есть;
- edit drawer;
- edit dialog;
- стандартная edit mode секция.

Нельзя придумывать новый editor специально под Application Card.

18. Loading / error / empty states
Использовать только существующие состояния UI kit:
- page skeleton
- cards skeleton
- section skeleton
- empty states
- inline error alerts
- retry state
- disabled state
- warning state

Никаких самописных placeholders и баннеров.

19. Visual language
Нужен:
- плотный B2B layout;
- прагматичный интерфейс;
- сильная визуальная иерархия;
- компактная, но читаемая структура;
- без декоративности;
- без “креативных” решений;
- экран должен ощущаться как нативная часть существующего UI kit.

20. Responsive behavior
Desktop:
- двухколоночная карточка
Tablet:
- адаптация в одну или две колонки в рамках уже существующих responsive patterns kit
Mobile:
- стек секций, actions уходят в overflow menu, positions section остаётся читаемым

Не делать новый mobile-specific UI.

21. Accessibility
Использовать существующие accessibility patterns kit:
- labels
- keyboard navigation
- focus states
- aria для actions / menus / dialogs
- статусы не должны кодироваться только цветом

22. Жёсткий приоритет переиспользования
Порядок принятия решений:
1. найти существующий page pattern;
2. найти существующие card/section/item patterns;
3. собрать экран из существующих building blocks;
4. слегка модернизировать существующие kit-компоненты;
5. не создавать новый компонент с нуля ни при каких обстоятельствах.

23. Прямые запреты
Строго запрещено:
- создавать новый ApplicationHeader, если уже есть page header pattern;
- создавать новый PositionCard, если позицию можно собрать из card/accordion/list-row patterns;
- создавать новый ReservationReadinessPanel;
- создавать новый SourcingSelectorWidget;
- создавать новый ConflictWarningWidget;
- создавать новый ProcessSidebar;
- создавать новый SummaryStrip, если уже есть info/stat components;
- создавать свои badges/chips/status pills;
- создавать свои dialogs/drawers/menus;
- создавать свои таблицы и timelines.

24. Что должно получиться
Нужен сильный экран Application Card, где менеджер за 5–10 секунд понимает:
- что это за заявка;
- сколько в ней позиций;
- какие позиции готовы к брони;
- где нужна своя техника или подрядчик;
- есть ли warning;
- можно ли двигать заявку дальше по процессу.

25. Acceptance criteria
Экран считается удачным, если:
- карточка выглядит как нативная часть UI kit;
- ни один новый UI-компонент не создан с нуля;
- экран собран только из reuse/composition/adaptation существующих kit-паттернов;
- multi-item логика читается сразу;
- статусы позиций понятны без открытия каждой в отдельности;
- sourcing и readiness к брони видны быстро;
- конфликтные места и незавершённость заметны;
- переход к следующему шагу процесса очевиден;
- нет ощущения самописного CRM-экрана;
- нет визуальной самодеятельности;
- экран реально ускоряет работу менеджера по заявке.

Сделай экран максимально зрелым, строгим, операционным и полностью основанным на существующем UI kit без создания новых компонентов.