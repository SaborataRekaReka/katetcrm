# FRONTEND ↔ API WIRING AUDIT

Срез состояния фронта на 23.04.2026 по каждому workspace-домену. Источник: статический анализ кода (Pass A). Ручной кликинг в браузере (Pass B) не делался — некоторые handlers могут иметь дополнительные скрытые эффекты.

> **Обновление (23.04.2026, sessions 10–13):** Leads / Applications / Reservations / Activity прошли полный wiring-проход. Разделы 2, 3, 5 ниже актуализированы. Readiness-матрица в конце также обновлена.

## Легенда статуса

- **match** — UI-интеракция имеет готовый endpoint, контракт типов совпадает.
- **adapter** — endpoint есть, но нужна функция преобразования UI ↔ API (как `toKanbanLead`).
- **schema-gap** — UI использует поля, которых нет в Prisma-схеме. Нужно решение: расширить схему / оставить derived / убрать из UI.
- **no-endpoint** — бизнес-сценарий есть в UI, но endpoint не написан (Stage 4+).
- **stub** — кнопка/форма без реальной бизнес-логики даже в моках (`() => {}`, `// TODO`, alert без эффекта).
- **out-of-scope** — не входит в MVP.

---

## 1. Home / Dashboard

**Файлы:** `home/HomeWorkspacePage.tsx`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Stat cards (leads/apps/res count) | `go(nav)` | **no-endpoint** | нужен `GET /stats` aggregate |
| Insight rows (urgent/conflicts/today) | pre-filter → nav | **adapter** | `GET /leads?isUrgent=true`, `GET /reservations?hasConflict=true` (фильтра нет) |
| Task rows | open task modal | **out-of-scope** (Tasks нет в MVP) |

**Итог:** целиком read-only dashboard, подключается после того, как появится агрегирующий endpoint.

---

## 2. Leads / Kanban ✅ основной поток подключён

**Файлы:** `kanban/LeadsKanbanPage.tsx`, `LeadsKanbanBoard.tsx`, `LeadsKanbanColumn.tsx`, `LeadKanbanCard.tsx`, `views/LeadsListView.tsx`, `views/LeadsTableView.tsx`, `detail/LeadDetailModal.tsx`, `hooks/useLeadMutations.ts`, `hooks/useLeadsQuery.ts`, `hooks/useActivityQuery.ts`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список лидов | `useLeadsQuery({scope:'all'}) + toKanbanLead` | **match** ✅ | `GET /leads` |
| Card click → detail modal | `handleCardClick()` + `useLeadQuery(id)` | **match** ✅ | `GET /leads/:id` |
| Drag-n-drop между стадиями (native HTML5) | `LeadsKanbanBoard` → `useChangeLeadStage` | **match** ✅ | `POST /leads/:id/stage` (mirror `ALLOWED_TRANSITIONS` на фронте) |
| Фильтры scope/manager/source/stage | `applyLeadsFilters(clientSide)` | **adapter** | `GET /leads` поддерживает server-side filters, но вызов делается без них |
| Toggle board/list/table | layoutStore | match (UI) | — |
| Кнопка "Создать лид" | — | **no-wiring** | `POST /leads` есть |
| Lead detail → "Перевести в заявку" | `useChangeLeadStage` (+ DnD) | **match** ✅ | `POST /leads/:id/stage {stage:'application'}` (auto-create Application+Client в транзакции) |
| Lead detail → "Неквалифицирован" | `UnqualifyLeadDialog` → `useChangeLeadStage` | **match** ✅ | `POST /leads/:id/stage {stage:'unqualified', reason}` |
| Lead detail → inline-edit основных полей | `InlineText/InlineDate/InlineSelect` → `useUpdateLead` | **match** ✅ | `PATCH /leads/:id` (contactName/contactCompany/contactPhone/equipmentTypeHint/address/requestedDate/timeWindow/source/comment) |
| Lead detail → контактные атомы | `PhoneLink`/`EmailLink`/`CopyableValue` | **match** ✅ | tel:/mailto: + navigator.clipboard |
| Lead detail → журнал изменений | `useEntityActivity('lead', id)` | **match** ✅ | `GET /activity?entityType=lead&entityId=…` |

**Schema-gaps:**
- `Lead.departureStatus` (today/soon/overdue/awaiting) — derived, не в БД
- `Lead.hasConflict` — derived от active Reservation
- `Lead.completionDate` — не в Lead схеме (только `Application.completedAt` / `Completion.completedAt`)
- `Lead.reservationStage` / `ownOrSubcontractor` / `equipmentUnit` — это свойства Reservation, а не Lead (денормализация для канбана)
- `Lead.multipleItems` (int) — derived от `application.items.length`
- `Lead.positionsReady/positionsTotal` — derived
- `Lead.applicationReadiness` — derived enum

→ Все эти поля вычисляются в adapter-е. Решение: **оставить derived, считать в `toKanbanLead` через include полей Reservation/Application**.

---

## 3. Applications ✅ header подключён, items ещё mock

**Файлы:** `application/ApplicationsWorkspacePage.tsx`, `ApplicationDetailView.tsx`, `detail/LeadDetailModal.tsx` (shared modal), `views/ApplicationsListView.tsx`, `hooks/useApplicationMutations.ts`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список заявок | `useApplicationsQuery` + `mockApplicationsList` fallback | **adapter** | `GET /applications` |
| Row click | detail modal | **match** ✅ | `GET /applications/:id` |
| Фильтры manager/status/sourcing | клиент-сайд | **adapter** | `GET /applications?managerId&scope&query` |
| Detail → inline-edit шапки | `InlineText/InlineDate` → `useUpdateApplication` | **match** ✅ | `PATCH /applications/:id` (address/comment/requestedDate) |
| Detail → header «Отменить заявку» | `EntityModalHeader.secondaryActions` → `CancelApplicationDialog` → `useCancelApplication` | **match** ✅ | `POST /applications/:id/cancel` |
| Detail → журнал изменений | `useEntityActivity('application', id)` | **match** ✅ | `GET /activity?entityType=application&entityId=…` |
| Detail → добавить позицию | stub | **no-wiring** | `POST /applications/:id/items` (hook `useAddApplicationItem` готов) |
| Detail → редактировать позицию | stub | **no-wiring** | `PATCH /application-items/:id` (hook готов) |
| Detail → удалить позицию | stub | **no-wiring** | `DELETE /application-items/:id` (hook готов) |
| "Создать бронь" из позиции | stub | **no-wiring** | `POST /reservations` |
| Mark urgent/conflict | stub | **no-wiring** (urgent: PATCH /applications), conflict = derived |
| Contact-атомы (телефон/email) | `PhoneLink`/`EmailLink` через `ContactAtoms` | **match** ✅ | tel:/mailto: |

> clientPhone/clientName остаются в DTO но бэкенд-whitelist их игнорирует — это поля `Client`. PATCH должен идти через отдельный `useUpdateClient` — см. follow-ups.

**Schema-gaps:**
- `ApplicationPosition.reservationState` ('pending' / 'confirmed' / 'conflict') → derived от `item.reservations[].internalStage`
- `ApplicationPosition.status` ('no_reservation' / 'unit_selected' / 'reserved' / 'conflict') → derived
- `ApplicationPosition.subcontractor`, `unit` (строки) → должны быть id + label через include
- `Application.clientName/clientCompany/clientPhone` → денормализация из Client (include)
- `Application.responsibleManager` (строка ФИО) → должно быть id+fullName через include
- `Application.stage` включает `'cancelled'` которого нет в PipelineStage enum → **несоответствие**

**Решение:** adapter `toApplicationUi(api)` с join-полями. Enum `cancelled` на фронте заменить на `unqualified` ИЛИ добавить `cancelled` в PipelineStage (нужно решение продукта).

---

## 4. Clients

**Файлы:** `client/ClientsWorkspacePage.tsx`, `ClientWorkspace.tsx`, `RepeatOrderDialog.tsx`, `data/mockClient.ts`, `mockClientsList.ts`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список клиентов | `mockClientsList` | **adapter** | `GET /clients` |
| Row click → ClientWorkspace | detail modal | **adapter** | `GET /clients/:id` |
| Preset tabs (new/repeat/vip/debt) | tag-based фильтр | **schema-gap** | tags не в Client |
| Manager filter | setState | **no-backend-field** | у Client нет manager (есть у Lead/Application) |
| RepeatOrderDialog submit | `onConfirm` | **no-wiring** | нужен endpoint «создать лид из клиента» или reuse `POST /leads` с `clientId` |
| "Создать клиента" | — | **no-wiring** | `POST /clients` |
| Редактирование реквизитов | — | **no-wiring** + **schema-gap** | `Client.requisites` (inn/kpp/ogrn/bank…) — **нет в Prisma** |
| Контакты (несколько ролей) | — | **schema-gap** | `Client.contacts[]` — нет в Prisma, только одиночный phone/email |
| История лидов/заказов | mock | **adapter** | derived через `include: {leads, applications}` |
| possibleDuplicates | mock | **match** | `GET /clients/duplicates?phone&company` |
| tags (ClientTag[]) | mock | **schema-gap** | нет |

**Schema-gaps суммарно — самый большой дефицит**:
1. `Client.contacts[]` (id, name, role, phone, email, isPrimary) — **отсутствует модель**
2. `Client.requisites` (inn/kpp/ogrn/legalAddress/bank*) — **отсутствует**
3. `Client.tags[]` (label, tone) — **отсутствует**
4. `Client.workingNotes` vs `Client.notes` — у нас только `notes`
5. `Client.totalOrders`, `totalRevenue`, `daysSinceLastOrder` — derived (агрегаты)
6. `Client.manager` — нет прямой связи; можно выводить как manager последней активной Application
7. `Client.type` ('company' / 'person') — derived от наличия `company`
8. `Client.activeRecords` (counts + top records) — derived

**Решение продукта нужно**: добавляем отдельные модели `ClientContact`, `ClientRequisites`, `ClientTag` или урезаем UI? Это самое большое product-решение в плане.

---

## 5. Reservations ✅ большая часть подключена

**Файлы:** `reservation/ReservationWorkspace.tsx`, `hooks/useReservationMutations.ts`, `hooks/useReservationsQuery.ts`, `data/mockReservation.ts` (fallback), `mockReservations.ts`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список | mock (list endpoint всё ещё не подключён к UI) | **adapter** | `GET /reservations` |
| Row click | detail modal | **match** ✅ | `GET /reservations/:id` |
| Internal stage toggle | ToggleGroup → `useUpdateReservation` | **match** ✅ | `PATCH /reservations/:id {internalStage}` |
| Source select (own/sub/undecided) | `handleSourceChange` → `useUpdateReservation` | **match** ✅ | `PATCH /reservations/:id {sourcingType}` |
| Equipment unit select | dropdown | **no-wiring** + **depends on** | `GET /equipment-units`, `PATCH /reservations/:id {equipmentUnitId}` |
| Subcontractor select | dropdown | **no-wiring** + **depends on** | `GET /subcontractors`, `PATCH /reservations/:id {subcontractorId}` |
| Subcontractor confirmation status | `InlineSelect<SubcontractorConfirmationStatus>` | **match** ✅ | `PATCH /reservations/:id {subcontractorConfirmation}` |
| Обещанный unit (promisedModelOrUnit) | `InlineText` | **match** ✅ | `PATCH /reservations/:id {promisedModelOrUnit}` |
| Плановая дата (plannedStart/End) | `InlineDate` с сохранением времени | **match** ✅ | `PATCH /reservations/:id {plannedStart, plannedEnd}` |
| Окно времени `HH:MM–HH:MM` | `InlineText` с regex-парсингом | **match** ✅ | `PATCH /reservations/:id {plannedStart, plannedEnd}` |
| Комментарий | `InlineText` multiline | **match** ✅ | `PATCH /reservations/:id {comment}` |
| "Готово к выезду" CTA | alert only | **no-wiring** | `PATCH /reservations/:id {internalStage:'ready_for_departure'}` — легко добить |
| "Снять бронь" | `useReleaseReservation` + AlertDialog с причиной | **match** ✅ | `POST /reservations/:id/release` |
| Conflict warning badge | computed on mock | **match** | Backend уже выставляет `hasConflictWarning` |
| Создать бронь | — | **no-wiring** | `POST /reservations` |
| Журнал изменений | `useEntityActivity('reservation', id)` | **match** ✅ | `GET /activity?entityType=reservation&entityId=…` |

**Schema-gaps:**
- `Reservation.internalStage` enum на фронте: `needs_selection` → на бэке `needs_source_selection` (**разное написание**)
- `Reservation.reservationType` ('equipment_type' / 'specific_unit') — derived (если `equipmentUnitId` задан — specific)
- `Reservation.status` ('active' / 'released') — derived от `isActive`
- `Reservation.candidateUnits[]` / `subcontractorOptions[]` — не реляционные поля, это **подсказки от UI**, тянуть из `GET /equipment-units?equipmentTypeId=X&status=active`
- `Reservation.readyForDeparture` — derived от `internalStage === 'ready_for_departure'`
- `Reservation.reservedBy` (строка) — должно быть id+fullName (сейчас вообще нет `createdById` в модели Reservation — **bug в схеме**, activity log есть, но прямая ссылка нет)

---

## 6. Departures

**Файлы:** `departure/DeparturesWorkspacePage.tsx`, `DepartureWorkspace.tsx`, `data/mockDeparture.ts`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список | mock | **no-endpoint** | `GET /departures` — **не реализован в бэке** |
| Row click | detail | **no-endpoint** | `GET /departures/:id` — нет |
| Status toggle | ToggleGroup → setState | **no-endpoint** | `PATCH /departures/:id {status}` — нет |
| "Начать выезд" | setState + alert | **no-endpoint** | нет |
| "Прибыл" | setState + alert | **no-endpoint** | нет |
| "Завершить выезд" + notes | confirm → setState | **no-endpoint** | нет (Completion есть, но Departure/Complete flow разрознен) |
| Создать выезд | — | **no-endpoint** | нет |

**Schema-gaps / enum mismatch:**
- UI enum: `planned | on_the_way | arrived | completed | cancelled`
- DB enum: `scheduled | in_progress | done | overdue`
- **Полное несоответствие.** Нужно решение: синхронизировать либо в UI, либо в схеме. Рекомендация — расширить DB enum до `scheduled | in_transit | arrived | completed | cancelled | overdue` (overdue = derived alert, а не терминальный status — подумать).
- `Departure.alert` (none/overdue_start/overdue_arrival/stale) — derived на сервере
- `Departure.linked.*` — JOIN через reservation → applicationItem → application → client + lead
- `Departure.plan.deliveryNotes` — есть `Application.deliveryMode`, но не `deliveryNotes` — **schema-gap**

---

## 7. Completion

**Файлы:** `completion/CompletionWorkspace*.tsx`, `data/mockCompletion.ts`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список | mock | **no-endpoint** | `GET /completions` — нет (Completion создаётся через каскад) |
| Outcome toggle | setState | **no-endpoint** | `POST /departures/:id/complete` — нет |
| Reason textarea | setState | — | — |
| "Завершить" | alert only | **no-endpoint** | нет |

**Schema-gaps:**
- `Completion.status` UI enum `ready_to_complete | blocked | completed | unqualified` vs DB только `outcome: completed | unqualified` + отсутствие статуса «готов к завершению» — derived
- `Completion.alert` (stale / missing_arrival / reservation_mismatch) — derived
- `Completion.fact.completedBy` — **нет в схеме** (activity log покрывает, но прямой ссылки нет)
- `Completion.context.*` (plannedDate, departedAt, arrivedAt) — derived из Departure

---

## 8. Catalogs / Directories

**Файлы:** `catalogs/CatalogsWorkspacePage.tsx`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| Список типов техники | mock | **match** ✅ | `GET /equipment-types` |
| Список единиц техники | mock | **match** ✅ | `GET /equipment-units` |
| Список категорий | mock | **match** ✅ | `GET /equipment-categories` |
| Список подрядчиков | mock | **match** ✅ | `GET /subcontractors` |
| Preset tabs (всё / активные / архив) | status filter | **match** | поддерживается `?status=` |
| Click row → edit modal | **не реализован** | **no-wiring (UI)** | endpoint есть |
| "Новая техника" / "Новый подрядчик" CTA | **без handler-а** | **no-wiring (UI)** | POST endpoints есть |
| Subcontractor rating (0–5) | read-only | **schema-gap** | поля `rating` нет в Subcontractor |

**Вывод:** Directories — самый простой домен для подключения, весь бэк готов, нужно только UI для create/edit modal.

---

## 9. Control (Analytics & Audit)

**Файлы:** `control/ControlWorkspacePage.tsx`

| Элемент | Handler | Статус | Endpoint |
|---|---|---|---|
| KPI cards | mock | **no-endpoint** | aggregate endpoint нужен |
| Funnel | computed from mockLeads | **no-endpoint** | aggregate |
| Manager breakdown | sort mock | **no-endpoint** | aggregate |
| Audit filters | setState | **adapter** | `GET /activity?entityType&entityId` подключён для detail-модалок (Lead/Application/Reservation) через `useEntityActivity`. Глобальные фильтры `actor` / `action` / `dateRange` — нет |
| Audit row click | stub | **out-of-scope** | |
| Reports section | пусто | **out-of-scope** (Stage 5+) |

---

## 10. Admin

**Файлы:** `admin/AdminWorkspacePage.tsx`

| Элемент | Статус |
|---|---|
| Imports section | **no-endpoint** (Stage 4, Excel import) |
| Users tab | **no-endpoint** (CRUD users нет) |
| Permissions tab | **out-of-scope** MVP |
| Settings tab | **out-of-scope** MVP |

---

## 11. Detail Shell

**Файлы:** `detail/DetailShell.tsx`, `EntityModalFramework.tsx`, различные `*DetailView.tsx`, `LeadDetailModal.tsx`

Это не домен, а shared-шелл. Принципиальных проблем нет; каждый domain-specific detail view имеет свои gaps (перечислены выше).

---

## Сводная матрица готовности (по доменам)

| Домен | Backend | UI read | UI mutations | Schema match | Готовность |
|---|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | — | **DONE** |
| Leads | ✅ | ✅ | ✅ (stage DnD, inline-edit, unqualify) | ⚠️ derived fields | **75%** |
| Applications | ✅ | ✅ header | ✅ header inline-edit + cancel; items ❌ | ⚠️ enum `cancelled` | **55%** |
| Reservations | ✅ | ✅ | ✅ (stage/source/confirm/dates/comment/release); unit/sub ❌ | ⚠️ enum mismatch `internalStage` | **65%** |
| Clients | ✅ (базовый) | ❌ mock | ❌ | ❌ contacts/requisites/tags не в схеме | 10% |
| Directories | ✅ | ❌ mock | ❌ (UI нет modals) | ✅ (кроме rating) | 20% |
| Departures | ❌ endpoints нет | ❌ | ❌ | ❌ enum полностью другой | 5% |
| Completion | ❌ endpoints нет | ❌ | ❌ | ⚠️ alert/status derived | 5% |
| Activity/Audit | ✅ | ✅ в detail-модалках | — | — | **40%** |
| Home dashboard | ❌ aggregate endpoints | ❌ | — | — | 5% |
| Admin | ❌ endpoints нет | ❌ | — | — | 0% |

---

## Приоритизация Stage 4+

### Stage 4a: закрываем schema-gaps (решения продукта)

1. **Client**: добавить модели `ClientContact`, `ClientRequisites`, `ClientTag`? ИЛИ убрать из UI? **Требует решения.**
2. **Departure**: синхронизировать enum (UI vs DB). Рекомендация: расширить DB до `scheduled | in_transit | arrived | completed | cancelled`.
3. **Reservation**: исправить enum написание `needs_selection` ↔ `needs_source_selection` (привести к одному).
4. **Application.stage**: решить судьбу `cancelled`.
5. **Reservation**: добавить `createdById` (сейчас только в activity).
6. **Subcontractor.rating**: добавить поле? Или убрать из UI?

### Stage 4b: новые endpoints

1. `GET/POST/PATCH /departures`, transitions + auto-Completion.
2. `POST /departures/:id/complete` (outcome+reason).
3. `GET /stats` (aggregates для Home и Control).
4. Расширенные фильтры `GET /activity`.
5. Excel-импорт (Clients/Catalogs) — Stage 5.

### Stage 4c: UI wiring по доменам (после решения gap-ов)

Рекомендуемый порядок (самые простые → самые сложные):

1. **Directories** (100% match, нужен только modal-UI).
2. ~~**Leads**~~ ✅ подключены (list + DnD + inline-edit + stage transitions + activity).
3. **Applications items** (добавить/редактировать/удалить позиции; header уже подключён).
4. **Reservations** unit/subcontractor dropdowns (нужны typeahead по каталогам).
5. **Clients** (после product-решения по gaps).
6. **Departures** (после backend).
7. **Completion** (после backend).
8. **Home / Control** (после aggregate endpoints).

### \u{1f195} \u0421\u0432\u0435\u0436\u0438\u0435 \u0443\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u044f (sessions 10\u201313, 23.04.2026)

**\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430:**
- `ContactAtoms` (`PhoneLink` / `EmailLink` / `CopyableValue`) — tel:/mailto: + hover-copy через navigator.clipboard. Применён в `LeadsTableView`, `LeadsListView`, `ClientsListView`, `ClientWorkspace`, `DepartureWorkspace`, `CompletionWorkspace` и 3 kanban-картах.
- `useEntityActivity(entityType, entityId)` — TanStack Query hook с refetchInterval 30s. Карта action-кодов в `lib/activityMapper.ts`.
- Все `useXMutations` onSuccess делают `qc.setQueryData(detailKey, fresh)` + `invalidateActivity` + invalidate list → live-reflection без refetch задержки.

**Kanban DnD:**
- Native HTML5 drag-n-drop (без сторонних либ). `LeadsKanbanBoard` хранит frontend-mirror `ALLOWED_TRANSITIONS` (lead→application/unqualified; application→reservation/unqualified; reservation→departure/unqualified; departure→completed/unqualified).
- Колонки: `ring-emerald` подсветка валидной цели, `opacity-60` для невалидных, toast при 400-ошибке.
- Все 5 карточек (Lead/Application/Reservation/Departure/Completed) поддерживают drag-пробрасывание.

**Inline-edit (через `InlineEdit/*`):**
- Lead: contactName, contactCompany, contactPhone, equipmentTypeHint, address, requestedDate, timeWindow, source, comment.
- Application: address, comment, requestedDate.
- Reservation: sourcingType, internalStage (toggle), subcontractorConfirmation (select), promisedModelOrUnit, plannedStart/End (date + HH:MM–HH:MM регекс), comment.

**Header унификация:**
- `EntityModalHeader.secondaryActions` теперь принимает массив `{label, onClick}`. Application использует это для «Отменить заявку» (запускает `CancelApplicationDialog`).

**Не входит в этот раунд (follow-ups):**
- `InlineToggle` для `isUrgent` / `nightWork`.
- `InlineSelect` для `responsibleManagerId` — нужен `GET /managers`.
- Typeahead для `equipmentUnitId` / `subcontractorId`.
- PATCH контактов клиента из Application модалки (сейчас backend whitelist игнорирует `clientPhone`/`clientName`).

---

## Что делать с «кнопками-обманками»

Всё, что помечено **stub** / **no-wiring** / **no-endpoint** и не попадает в Stage 4 MVP — нужно:

- Либо скрыть через роль/фичефлаг.
- Либо поставить `disabled` + тултип «В MVP не реализовано» (сохраняет визуальную полноту прототипа).
- Не имитировать успешное срабатывание.

---

## Ограничения аудита

- Не проверялись обработчики drag-n-drop в деталях (React-dnd / dnd-kit внутренности).
- Pass B (runtime в браузере) не выполнялся — мог пропустить обработчики, которые выглядят как stub, но работают через глобальный store.
- Тексты ошибок / validation-сообщения не сравнивались.
- Не проверялись роли (RBAC) UI-side: `admin` vs `manager` visibility.

Для финальной картины нужен Pass B: прогон в браузере с открытой вкладкой Network по каждому экрану.
