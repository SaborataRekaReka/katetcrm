# Мёртвые кнопки и ссылки — бэклог на следующие сессии

> Архивный файл: перемещён из `docs/` в `docs/archive/` для исторического хранения.
> Внутренние относительные ссылки сохранены как в оригинальном снимке и могут быть невалидны в новом пути.

> Важно (актуализация 28.04.2026): это **исторический снимок Session 10**.
> Часть пунктов уже закрыта в последующих сессиях (Applications/Reservations,
> Departures/Completion, Clients API wiring, Admin imports/integrations).
> Актуальный статус смотрите в `FRONTEND_API_WIRING.md` и `IMPLEMENTATION_ROADMAP.md`.

Снапшот аудита на конец Session 10. Все перечисленные элементы **сейчас
рендерятся без обработчика** (либо `onClick` отсутствует, либо `() => {}` /
`// noop`). Пользователь видит их, кликает — ничего не происходит. Цель этого
документа: единый список, чтобы в следующих сессиях вырезать или подключить
каждую пачку разом, не разбирая заново.

Формат:
- **Файл** (ссылка на конкретную строку где возможно)
- **Кнопка/ссылка** (видимый текст)
- **Причина**: нет handler / noop / нет backend-сценария
- **Действие**: wire / delete / hide

Действия делятся на три корзины:
- **wire** — backend/логика уже есть, нужно просто подключить onClick.
- **delete** — сценария нет, кнопка появилась из figma-шаблона, MVP её не
  предусматривает → убрать из рендера.
- **hide** — сценарий есть в `PRODUCT.md`, но не в текущей MVP-итерации;
  спрятать за feature-flag до соответствующей сессии.

---

## 1. Applications — Позиции заявки (PositionCard)

Файл: [LeadDetailModal.tsx](../app/frontend/src/app/components/detail/LeadDetailModal.tsx#L213)

| Кнопка | Причина | Действие |
|---|---|---|
| «Дублировать» | noop; BE-сценария копирования позиции нет | **delete** — удалить из PositionCard до появления POST /application-items/:id/duplicate |
| «Редактировать» | noop; инлайн-редактирование позиции ещё не подключено | **wire** — в Session 11 через `useUpdateApplicationItem` (hook уже есть) |
| «Открыть бронь» (reserved) | noop; нужен переход на ReservationWorkspace по `position.reservationId` | **wire** — Session 11, нужен `reservationId` в projection позиции |
| «Создать бронь» (unit_selected) | noop; `useCreateReservation` готов, нет UI-формы/пикера дат | **wire** — Session 11, dialog с plannedStart/End + submit |

## 2. Leads — quickActions + linkedActions

Файл: [LeadDetailModal.tsx](../app/frontend/src/app/components/detail/LeadDetailModal.tsx#L345)

| Кнопка | Причина | Действие |
|---|---|---|
| «Открыть дубли» (quickActions) | нет handler; дубли существуют, но UI-списка нет | **hide** — оставить при `lead.isDuplicate`, но wire в следующей сессии (requires GET /leads/duplicates-for/:id) |
| «История контактов» | нет handler; активность приходит с BE в `/leads/:id/activity`, но панель не подключена | **wire** — Session 12, показать drawer с EntityActivityList от реального API |
| «Отметить как дубль» | не было реализовано | **hide** — Session 12 |
| «Открыть бронь» (ActionButton в application-ветке) | нет handler | **wire** — Session 11, то же что в PositionCard |

## 3. Reservations — ReservationWorkspace

Файл: [ReservationWorkspace.tsx](../app/frontend/src/app/components/reservation/ReservationWorkspace.tsx)

> **Session 12 (текущая):** detail-модалка теперь подписана на `useReservationQuery(apiReservationId)` — все persisted-поля (stage/source/unit/sub/даты/comment/…) приходят из API; `useUpdateReservation` / `useReleaseReservation` в `onSuccess` делают `setQueryData(detail, fresh)` → правки видны сразу. Поле «Комментарий» редактируется инлайн через `InlineText` (multiline). Кнопки ниже — остаются dead до отдельных сессий (нет соответствующих бэкенд-проекций для `candidateUnits` / `subcontractorOptions` / `conflict`-детали).

| Строка | Кнопка | Причина | Действие |
|---|---|---|---|
| ~169 | Breadcrumb стадии | только декоративный dropdown | **delete** — стадия и так показана в заголовке и в prop-сетке |
| ~226 | Pill «стадия» (синий chevron) | нет handler; стадия — derived (deriveReservationState), редактированию не подлежит | **delete** — убрать chevron, оставить статическое pill |
| ~254 | «Открыть конфликт» | MVP не содержит конфликт-модалки | **delete** |
| ~255 | «Выбрать альтернативу» | MVP не содержит подбора альтернативы | **delete** |
| ~278–281 | «Назначить» в таблице юнитов | `candidateUnits` пока mock (нет `GET /equipment-units/available?applicationItemId=...`); `useUpdateReservation({ equipmentUnitId })` есть | **wire** — после появления endpoint со списком кандидатов |
| source ToggleGroup | onChange обновляет только local state, не PATCH | **wire** — `useUpdateReservation({ sourcingType })` (тривиально, можно в ближайшей сессии) |

## 4. Departures / Completion

| Файл | Кнопка | Причина | Действие |
|---|---|---|---|
| [DepartureWorkspace.tsx#L184](../app/frontend/src/app/components/departure/DepartureWorkspace.tsx#L184) | Breadcrumb стадии | декоративный | **delete** |
| [CompletionWorkspace.tsx#L175](../app/frontend/src/app/components/completion/CompletionWorkspace.tsx#L175) | Breadcrumb стадии | декоративный | **delete** |
| [CompletionWorkspace.tsx#L202](../app/frontend/src/app/components/completion/CompletionWorkspace.tsx#L202) | «Открыть выезд» | нет handler; нет связки completion→departure в UI | **wire** — Session 12, при наличии `onOpenDeparture` prop |

Историческая ремарка Session 10: тогда Dep/Completion были mock.
На текущем срезе backend+frontend wiring для этих доменов подключён,
но часть UI-кнопок всё ещё может требовать локальной доработки.

## 5. Clients — ClientWorkspace

Файл: [ClientWorkspace.tsx](../app/frontend/src/app/components/client/ClientWorkspace.tsx)

> Историческая ремарка Session 10: на тот момент `ClientWorkspace` был в основном mock-driven.
> На текущем срезе подключены `GET /clients/:id` и `PATCH /clients/:id`, есть
> `useClientQuery`/`useUpdateClient`; часть UX-задач из списка ниже остаётся актуальной
> как UI-polish/backlog, но не как «backend отсутствует».

| Строка | Кнопка | Причина | Действие |
|---|---|---|---|
| ~155 | «Позвонить» (header) | нет handler | **wire** — `href="tel:+{primaryPhone}"`, превратить в `<a>` |
| ~158 | «Написать» (header) | нет handler | **wire** — `href="mailto:{primaryEmail}"` |
| ~161 | «Редактировать» (header) | нет handler; EditClientDialog не создан | **wire** — Session 12, требуется `useUpdateClient` + диалог |
| ~298 | «Добавить контакт» | нет handler; BE-маршрута POST /clients/:id/contacts нет | **hide** — Session 12+ |
| ~327 | «Позвонить»/«Написать»/«Copy» на строке контакта | нет handler | **wire** — tel:/mailto:/`navigator.clipboard.writeText` |

## 6. DetailShell — верхняя панель

Файл: [DetailShell.tsx](../app/frontend/src/app/components/detail/DetailShell.tsx#L213)

| Иконка | Причина | Действие |
|---|---|---|
| Share | нет сценария | **delete** |
| Eye (watch) | нет сценария подписки | **delete** |
| MoreHorizontal | нет сценария меню | **delete** |
| Maximize | модалка уже полноэкранная, кнопка бессмысленна | **delete** |

Все четыре — остатки figma-шаблона. Можно удалить одним блоком в Session 11.

---

## Итог по корзинам

- **delete** (10): Breadcrumb стадий (Reservation/Departure/Completion, 3 шт), pill «стадия» в Reservation, «Открыть конфликт», «Выбрать альтернативу», 4 иконки в DetailShell, «Дублировать» в PositionCard.
- **wire** (10): «Редактировать» / «Открыть бронь» / «Создать бронь» в PositionCard, «Открыть бронь» ActionButton, «Назначить» в таблице юнитов, source ToggleGroup, «Позвонить»/«Написать»/«Редактировать» клиента, «Открыть выезд» в Completion.
- **hide** (4): «Открыть дубли», «Отметить как дубль», «История контактов», «Добавить контакт».

## Предлагаемая раскладка по сессиям

- **Session 11 (Applications + Reservations оставшиеся CTA)**: все wire по PositionCard + ReservationWorkspace + delete-пак.
- **Session 12 (Clients + Detail shell polish)**: client actions, EditClientDialog, DetailShell cleanup, «История контактов» drawer.
- **Session 13 (Leads duplicates)**: «Открыть дубли», «Отметить как дубль», duplicates API.
