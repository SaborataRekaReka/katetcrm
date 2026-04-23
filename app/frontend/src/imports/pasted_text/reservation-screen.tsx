Сделай экран `Reservation screen / Reservation section` для CRM Katet.tech.

Это один из самых важных экранов всей системы.
Бронь — не второстепенный блок, а центр операционного процесса.
Экран должен помогать менеджеру быстро:
- понять, что именно бронируется;
- выбрать источник техники;
- выбрать свою технику или подрядчика;
- уточнить unit;
- увидеть конфликт;
- понять, готова ли бронь к выезду;
- снять бронь или перевести её дальше.

КРИТИЧЕСКОЕ ПРАВИЛО:
Строго запрещено создавать новые UI-компоненты с нуля.

Можно только:
1. переиспользовать существующие React-компоненты UI kit;
2. собирать экран из существующих page / card / detail / list / drawer / dialog / action / alert patterns;
3. слегка модернизировать существующие компоненты;
4. делать controlled extension существующих компонентов без создания новой дизайн-сущности.

Нельзя:
- создавать новый reservation widget;
- создавать новый sourcing selector;
- создавать новый conflict panel;
- создавать новый stepper;
- создавать новый summary widget;
- создавать новый custom sidebar;
- создавать новый availability widget;
- создавать новый control panel.

Если нужного паттерна нет:
- найти максимально близкий существующий;
- адаптировать его;
- переиспользовать.
Новый компонент с нуля делать нельзя.

Продуктовая логика:
- Reservation — отдельная сущность;
- одна позиция заявки может иметь только одну активную бронь;
- бронь сначала создаётся на тип техники;
- позже может уточняться до конкретной единицы;
- бронь может быть на своей технике или на подрядчике;
- конфликт брони показывается как warning, без hard-block;
- бронь должна сниматься вручную и системно;
- критические изменения по брони логируются;
- менеджер должен понимать, какой следующий шаг нужен для перевода в выезд.

Внутренние стадии брони:
- needs_selection
- searching_own_equipment
- searching_subcontractor
- type_reserved
- unit_defined
- ready_for_departure
- released

Общий UX-принцип:
Это не форма.
Это operational reservation workspace.
Экран должен быть очень понятным с первого взгляда:
- слева основная рабочая область брони;
- справа процессный и статусный контекст;
- сверху главный CTA;
- ниже источник техники, выбор ресурса, конфликт и готовность к выезду;
- без перегруза;
- без task-manager артефактов;
- без визуального шума.

Использовать только существующие паттерны UI kit:
- page container
- page header
- breadcrumbs
- section cards
- property list / key-value / detail rows
- compact tables / lists / accordions
- chips / badges / status pills
- alerts / warnings / banners
- action groups / split buttons / overflow menus
- drawers / dialogs
- linked records blocks
- timeline / activity feed
- skeleton
- empty states
- inline validation / helper text

Нужна такая структура:

1. Page shell
Если это отдельная страница:
- Breadcrumbs: CRM / Sales / Reservation
- Title: номер брони или short summary вида `Бронь по позиции`
- Subtitle: заявка + клиент + тип техники

Если это section внутри Application Card:
- section title `Бронь`
- та же логика, но без отдельного page shell

2. Header actions
Использовать существующие action patterns UI kit.

Нужны действия:
- Редактировать
- Выбрать unit
- Выбрать подрядчика
- Снять бронь
- Перевести в выезд
- Меню “Ещё”

Если действие недоступно — disabled + helper text.
Не делать новый action bar.

3. Top summary row
Под header сделать compact operational summary row.

Показать:
- статус брони
- internal stage
- equipment type
- source: own / subcontractor / undecided
- выбран ли subcontractor
- выбран ли unit
- conflict warning
- готовность к выезду
- last activity

Это не аналитика, а operational summary.

4. Main layout
Собрать экран в 2 колонки.

Левая колонка:
- overview брони
- selection / sourcing area
- выбор своей техники
- выбор подрядчика
- linked application item
- activity / changes

Правая колонка:
- статус брони
- readiness to departure
- conflict block
- summary по unit / subcontractor
- linked application / client / lead
- быстрые действия

Использовать существующие layout patterns UI kit.
Не делать новый layout.

5. Reservation overview card
Показать в existing detail pattern:
- reservation id
- статус
- internal stage
- reservationType: equipment_type / specific_unit
- equipment type
- equipment unit, если выбран
- subcontractor, если выбран
- reserved by
- reserved at
- released at, если есть
- release reason, если есть
- comment
- last activity

Если полей нет — скрывать аккуратно.
Не показывать null / undefined / мусор.

6. Linked application item block
Показать контекст позиции, ради которой создана бронь:
- позиция заявки
- тип техники
- количество
- planned date
- planned time
- адрес
- comment
- sourcingType
- linked application
- linked client

Использовать existing linked record / compact entity block.
Не делать новый item widget.

7. Sourcing section
Это центральный блок экрана.

Нужно ясно показать и дать быстро управлять:
- Своя техника
- Подрядчик
- Не определено

Показывать:
- текущий источник
- какой следующий шаг
- что уже выбрано
- что ещё не выбрано

Использовать только существующие:
- segmented control / select / radio-like patterns, если они уже есть;
- chips;
- helper text;
- action rows;
- drawers / dialogs.

Нельзя делать новый sourcing selector.

8. Own equipment selection block
Показать выбор своей техники через существующие list / table / picker patterns.

Нужно:
- current unit, если выбран
- статус unit
- quick action “Назначить unit”
- quick action “Сменить unit”
- quick action “Снять unit”
- список candidate units, если данные уже есть

Если unit не выбран:
- показать ясное состояние `unit не выбран`

Нельзя делать новый availability widget.
Использовать existing list row / data table / selection drawer patterns.

9. Subcontractor selection block
Показать выбор подрядчика через existing list / table / compact row patterns.

Нужно:
- текущий подрядчик
- quick open subcontractor card
- quick action “Выбрать подрядчика”
- quick action “Сменить подрядчика”
- quick action “Убрать подрядчика”

Если доступны данные, можно показать:
- category fit
- price notes
- usage history

Но не делать новый comparison widget.

10. Internal stage block
Нужно ясно показать внутреннюю стадию брони:
- needs_selection
- searching_own_equipment
- searching_subcontractor
- type_reserved
- unit_defined
- ready_for_departure
- released

Но нельзя делать новый custom stepper.
Использовать существующие patterns:
- status list
- chips row
- progress-like existing component
- simple stage list with current highlight

Менеджер должен сразу понимать:
- где сейчас бронь;
- что следующий шаг;
- что блокирует продвижение дальше.

11. Conflict warning block
Это must-have.

Если есть конфликт:
- показать warning alert / banner / inline warning;
- коротко показать суть риска;
- не блокировать весь workflow;
- дать CTA:
  - открыть конфликтующую бронь
  - выбрать альтернативу
  - продолжить с warning, если это допустимо

Нельзя делать новый conflict component.
Только существующий alert / warning pattern UI kit.

12. Readiness to departure block
Нужно явно показать, готова ли бронь к переводу в выезд.

Использовать existing validation / checklist / helper patterns.

Показывать:
- выбран ли источник техники
- выбран ли подрядчик, если source=subcontractor
- выбран ли unit, если обязателен
- нет ли блокирующей незавершённости
- достигнута ли internal stage `ready_for_departure`
- можно ли нажать `Перевести в выезд`

Если нельзя:
- primary CTA disabled
- рядом helper text
- при необходимости warning alert

Нельзя делать новый readiness widget.

13. Related records block
Показать связанные сущности:
- заявка
- позиция заявки
- клиент
- исходный лид
- конфликтующая бронь, если есть

Использовать existing compact linked-record blocks.
Не делать новый relation widget.

14. Activity / change log section
Показать журнал действий по брони:
- создание
- смена internal stage
- выбор подрядчика
- выбор unit
- conflict detected
- release
- перевод в выезд
- кто и когда сделал изменение

Использовать existing timeline / activity feed / event list.
Не показывать raw JSON.

15. Release flow
Снятие брони — критичное действие.

Сделать через existing confirm dialog / modal pattern:
- CTA `Снять бронь`
- optional reason
- confirm
- после release экран должен явно показывать released state

Не делать новый custom modal.

16. Transition CTA
Primary CTA должен зависеть от состояния:
- Назначить unit
- Выбрать подрядчика
- Подтвердить бронь
- Перевести в выезд
- Снять бронь

Это должен быть один главный следующий шаг.
Рядом могут быть вторичные действия.
Не перегружать экран кучей равновесных кнопок.

17. Section mode inside Application Card
Если Reservation реализуется не отдельной страницей, а section внутри заявки:
- использовать тот же визуальный язык;
- сохранить overview, sourcing, conflict, readiness и activity;
- не делать специальный отдельный поддизайн;
- section должен ощущаться как естественное продолжение Application Card.

18. Visual language
Нужен:
- плотный B2B layout;
- прагматичный интерфейс;
- сильная визуальная иерархия;
- быстрое сканирование статуса;
- минимум декоративности;
- без “креативных” решений;
- экран должен ощущаться нативной частью текущего UI kit.

19. Loading / error / empty states
Использовать только существующие состояния UI kit:
- skeleton
- partial loading
- empty states
- inline error alerts
- retry state
- disabled state
- warning state

Никаких самописных placeholders и баннеров.

20. Responsive behavior
Desktop:
- полноценная двухколоночная карточка
Tablet:
- адаптация в одну или две колонки в рамках existing responsive patterns
Mobile:
- секции стеком, actions в overflow, conflict и readiness остаются заметными

Не делать отдельный mobile-specific дизайн.

21. Accessibility
Использовать существующие accessibility patterns:
- labels
- keyboard navigation
- focus states
- aria для actions / dialogs / menus
- статусы нельзя кодировать только цветом

22. Жёсткий приоритет переиспользования
Порядок принятия решений:
1. взять existing page/section pattern;
2. взять existing detail/list/action/alert patterns;
3. собрать экран из существующих building blocks;
4. слегка модернизировать существующие компоненты;
5. не создавать новый UI-компонент с нуля.

23. Прямые запреты
Строго запрещено:
- создавать новый ReservationHeader
- создавать новый SourcingWidget
- создавать новый ConflictPanel
- создавать новый ReservationReadinessWidget
- создавать новый InternalStageStepper
- создавать новый AvailabilityPanel
- создавать новый custom sidebar
- создавать свои chips / badges / alerts / drawers / dialogs / tables / timelines

24. Acceptance criteria
Экран считается удачным, если:
- сразу видно, что именно бронируется;
- сразу видно источник техники: own / subcontractor / undecided;
- сразу видно, выбран ли unit;
- сразу видно, выбран ли подрядчик;
- conflict warning заметен, но не ломает workflow;
- readiness to departure понятен без лишних кликов;
- экран выглядит как нативная часть текущего UI kit;
- ни один новый UI-компонент не создан с нуля;
- экран реально помогает менеджеру принимать решение и двигать бронь дальше.

Сделай reservation screen максимально зрелым, строгим, операционным и полностью основанным на текущем UI kit без создания новых компонентов.