Переработай экран `Reservation` в гораздо более точный ClickUp-style detail view.

КРИТИЧЕСКОЕ ПРАВИЛО №1:
Reservation screen НЕ ДОЛЖЕН становиться новым отдельным типом экрана.
Он должен использовать ТОТ ЖЕ САМЫЙ detail shell, ту же layout-логику и тот же визуальный каркас, что уже используются в предыдущих экранах:
- Lead detail
- Application detail

То есть:
- тот же общий clickup-like detail workspace;
- та же композиция;
- та же логика левой рабочей области;
- та же логика правой contextual sidebar;
- тот же ритм, плотность, типографика, отступы и поведение layout.

Должна меняться НЕ архитектура экрана, а только:
- содержимое;
- смысл секций;
- статусы;
- процессный контекст;
- действия, специфичные для стадии Reservation.

Главная идея:
Во всей CRM должен использоваться один и тот же базовый detail-screen pattern.
Lead, Application и Reservation должны ощущаться как один и тот же экранный шаблон, но с разной начинкой под сущность и стадию процесса.

КРИТИЧЕСКОЕ ПРАВИЛО №2:
Нельзя создавать новые UI-компоненты с нуля.
Можно только:
1. переиспользовать текущие React-компоненты UI kit;
2. переиспользовать уже собранный shell Lead/Application screens;
3. модифицировать и переиспользовать существующие компоненты;
4. делать controlled extension существующих patterns без создания новой дизайн-сущности.

Нельзя:
- создавать новый layout для Reservation;
- делать новый тип detail page;
- делать новый sidebar pattern;
- делать новый header pattern;
- делать новый summary strip;
- делать новый вид карточной сетки;
- отходить от визуальной логики, уже использованной в Lead и Application.

Проблема текущей версии:
Сейчас Reservation слишком сильно отступил от предыдущих экранов.
Он выглядит как отдельная admin/detail page из набора карточек, а не как продолжение того же самого clickup-like detail shell, который уже применён в Lead и Application.

Это неправильно.

Что нужно исправить:
1. Вернуть Reservation в тот же экранный шаблон, что и Lead/Application.
2. Не изобретать новый layout.
3. Не делать его более карточным, чем предыдущие экраны.
4. Не делать его более dashboard-like, чем предыдущие экраны.
5. Не делать отдельный визуальный язык для Reservation.

Нужен такой же общий каркас, как в Lead/Application:

- сверху breadcrumb line
- title + subtitle
- top actions
- компактная metadata line
- большая левая рабочая область
- правая contextual sidebar
- внутри левой области последовательные секции
- внутри правой панели статусный/процессный контекст
- всё в одном и том же clickup-like visual language

Что нужно сохранить от Lead/Application:
- тот же общий размер и пропорции overlay/detail view
- ту же ширину правой sidebar
- ту же композицию хедера
- тот же подход к property rows
- тот же стиль секций
- тот же уровень “плоскости”, а не коробочности
- ту же плотность spacing
- тот же подход к action buttons
- тот же подход к правой панели как к единой sidebar, а не набору отдельных виджетов

Что должно отличаться только по содержанию:
Lead:
- source
- duplicates
- readiness to convert
- client/contact context

Application:
- positions
- readiness to reserve
- linked lead/client
- multi-item logic

Reservation:
- source own/subcontractor/undecided
- unit
- subcontractor
- conflict warning
- readiness to departure
- internal reservation stage

То есть:
экран один и тот же,
меняется только stage-specific content.

Что убрать из текущего Reservation:
- отдельную dashboard-like summary strip сверху;
- набор равноправных boxed cards;
- overly-admin visual treatment;
- отдельную сеточную композицию, которой нет в Lead/Application;
- новую визуальную логику sidebar.

Что сделать вместо этого:
- использовать тот же exact shell, что и в Lead/Application;
- просто заменить внутренние блоки на reservation-specific;
- внутри левой части показать:
  - overview reservation
  - linked application item
  - sourcing
  - unit / subcontractor selection
  - notes / comment
  - activity / changes
- внутри правой sidebar показать:
  - статус брони
  - internal stage
  - readiness to departure
  - conflict warning
  - linked application / client / lead
  - quick actions

Очень важно:
Reservation screen не должен быть “лучше”, “другим” или “умнее” визуально, чем Lead/Application.
Он должен быть частью одной системы экранов.

Правильная формула:
- один общий detail shell для CRM
- одна общая clickup-like визуальная логика
- три разные сущности:
  - Lead
  - Application
  - Reservation
- разная начинка, но одинаковая экранная система

Правило consistency:
Если поставить рядом Lead, Application и Reservation, должно быть очевидно, что это:
- один продукт,
- один screen family,
- один layout family,
- один interaction model,
- один visual language.

Нельзя допускать, чтобы Reservation выглядел как отдельный чужой экран.

Acceptance criteria:
Работа считается успешной только если:
- Reservation визуально и композиционно совпадает с семейством Lead/Application screens;
- используется тот же detail shell;
- Reservation не выглядит как отдельная admin-page;
- Reservation не отступает от clickup-like подхода, уже зафиксированного на предыдущих экранах;
- экран ощущается как тот же шаблон, но с reservation-specific содержанием;
- ни один новый UI-компонент не создан с нуля;
- используется только переиспользование, recomposition и restyle существующих React-компонентов и уже сделанных экранных паттернов.

Сделай Reservation как продолжение той же самой экранной системы, а не как новый тип страницы.