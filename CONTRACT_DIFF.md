# CONTRACT DIFF: UI types ↔ Prisma/API

Пошаговое сравнение полей интерфейсов фронтенда (`app/frontend/src/app/types/*.ts`) и моделей БД / DTO бэкенда (`app/backend/prisma/schema.prisma`, `modules/*/dto/*.ts`). Составлено 23.04.2026 на основе Pass C.

> **Обновление (27.04.2026):** документ частично устарел и ниже сохранён как исторический baseline 23.04. Ключевые закрытые расхождения: `PipelineStage.cancelled`, enum `DeliveryMode`, модели `ClientContact` / `ClientRequisites` / `Tag` / `ClientTag`, `Reservation.createdById`, синхронизированный `DepartureStatus`, поля `Departure.arrivedAt/cancelledAt/cancellationReason/deliveryNotes`, поля `Completion.completedById/completionNote/unqualifiedReason`, а также полноценные `/departures` и `/completions` контракты.

## Легенда

- **✅ match** — поле совпадает по имени и типу.
- **🔁 rename** — эквивалентное поле есть, но имя/форма другое. Нужен adapter.
- **🧮 derived** — поле вычисляется на сервере через include + аггрегат. В БД как отдельного столбца нет.
- **➕ schema-add** — поля в БД нет, нужно расширить схему.
- **➖ ui-drop** — поле есть в БД, но UI его не показывает (потеря данных).
- **⚠ enum-diff** — enum-значения различаются.

---

## 1. Lead

UI: `Lead` в `types/kanban.ts`
API: `Lead` в `prisma schema` + `leadsApi.ts` (`LeadApi`)

| UI field | API field | Статус | Комментарий |
|---|---|---|---|
| `id` | `id` | ✅ | |
| `stage` (`StageType`) | `stage` (`PipelineStage`) | ✅ | значения совпадают |
| `client` (string — имя) | `contactName` | 🔁 rename | adapter делает |
| `company` | `contactCompany` | 🔁 rename | |
| `phone` | `contactPhone` | 🔁 rename | |
| `source` (string label) | `source` + `sourceLabel` | 🔁 rename | label через `SOURCE_LABELS` map |
| `sourceChannel` | `source` | 🔁 rename | enum: site/mango/telegram/max/manual/other — совпадают |
| `equipmentType` | `equipmentTypeHint` | 🔁 rename | |
| `date` | `requestedDate` | 🔁 rename | |
| `timeWindow` | `timeWindow` | ✅ | |
| `address` | `address` | ✅ | |
| `manager` (string ФИО) | `managerId` + `manager.fullName` | 🔁 rename | нужен include |
| `lastActivity` (humanized "N мин назад") | `updatedAt` | 🔁 rename | adapter форматирует |
| `isNew` | — | 🧮 derived | by `updatedAt - createdAt < 60s`? не определено |
| `isDuplicate` | `isDuplicate` | ✅ | |
| `isUrgent` | `isUrgent` | ✅ | |
| `isStale` | `isStale` | ✅ | |
| `hasNoContact` | `hasNoContact` | ✅ | |
| `incompleteData` | `incompleteData` | ✅ | |
| `unqualifiedReason` | `unqualifiedReason` | ✅ | |
| `missingFields` | — | 🧮 derived | вычисляется в adapter |
| `multipleItems` | — | 🧮 derived | `application.items.length` |
| `reservationStage` | — | 🧮 derived | из active Reservation |
| `ownOrSubcontractor` | — | 🧮 derived | из active Reservation.sourcingType |
| `subcontractor` | — | 🧮 derived | из active Reservation.subcontractor.name |
| `equipmentUnit` | — | 🧮 derived | из active Reservation.equipmentUnit.name |
| `hasConflict` | — | 🧮 derived | из Reservation.hasConflictWarning |
| `readyForDeparture` | — | 🧮 derived | internalStage === 'ready_for_departure' |
| `departureStatus` (today/soon/overdue/awaiting) | — | 🧮 derived | by Reservation.plannedStart vs now |
| `completionDate` | — | 🧮 derived / ➕ schema-add | не понятно — в Application.completedAt? в Completion.completedAt? |
| `completionReason` | `unqualifiedReason` либо `Completion.reason` | 🔁 rename | двусмысленно |
| `applicationReadiness` | — | 🧮 derived | сложная агрегация |
| `positionsReady` / `positionsTotal` | — | 🧮 derived | count items where readyForReservation |

**Итого по Lead:** adapter есть для базовых полей, derived — надо дополнить. Новых полей в схему добавлять не нужно.

---

## 2. Application / ApplicationItem

UI: `Application`, `ApplicationPosition` в `types/application.ts`
API: `Application`, `ApplicationItem` в schema + `applicationsApi.ts`

### Application

| UI field | API field | Статус | Комментарий |
|---|---|---|---|
| `id` | `id` | ✅ | |
| `number` | `number` | ✅ | |
| `stage` | `stage` | ✅ match | `cancelled` присутствует в `PipelineStage` |
| `leadId` | `leadId` | ✅ | |
| `clientId` | `clientId` | ✅ | |
| `clientName` | `client.name` | 🔁 rename | include |
| `clientCompany` | `client.company` | 🔁 rename | |
| `clientPhone` | `client.phone` | 🔁 rename | |
| `responsibleManager` (ФИО) | `responsibleManagerId` + `responsibleManager.fullName` | 🔁 rename | |
| `requestedDate` | `requestedDate` | ✅ | |
| `requestedTimeFrom` | `requestedTimeFrom` | ✅ | |
| `requestedTimeTo` | `requestedTimeTo` | ✅ | |
| `address` | `address` | ✅ | |
| `comment` | `comment` | ✅ | |
| `isUrgent` | `isUrgent` | ✅ | |
| `deliveryMode` (`pickup`/`delivery`) | `deliveryMode` (`DeliveryMode`) | ✅ match | enum формализован в Prisma |
| `nightWork` | `nightWork` | ✅ | |
| `positions[]` | `items[]` | 🔁 rename | |
| `createdAt` | `createdAt` | ✅ | |
| `updatedAt` | `updatedAt` | ✅ | |
| `lastActivity` | `updatedAt` (humanized) | 🔁 | |

### ApplicationPosition / ApplicationItem

| UI field | API field | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `equipmentType` (string) | `equipmentTypeLabel` + `equipmentTypeId` | 🔁 rename |
| `quantity` | `quantity` | ✅ |
| `shiftCount` | `shiftCount` | ✅ |
| `overtimeHours` | `overtimeHours` | ✅ |
| `downtimeHours` | `downtimeHours` | ✅ |
| `plannedDate` | `plannedDate` | ✅ |
| `plannedTimeFrom`/`To` | `plannedTimeFrom`/`To` | ✅ |
| `address` | `address` | ✅ |
| `comment` | `comment` | ✅ |
| `sourcingType` | `sourcingType` | ✅ |
| `subcontractor` (имя) | derived from `reservations[].subcontractor.name` | 🧮 derived |
| `unit` (имя) | derived from `reservations[].equipmentUnit.name` | 🧮 derived |
| `pricePerShift` | `pricePerShift` (Decimal) | ⚠ | UI number / API string-decimal → adapter должен cast |
| `deliveryPrice` | `deliveryPrice` | ⚠ | то же |
| `surcharge` | `surcharge` | ⚠ | то же |
| `reservationState` ('pending'/'confirmed'/'conflict') | — | 🧮 derived | из reservation.internalStage |
| `readyForReservation` | `readyForReservation` | ✅ |
| `status` ('no_reservation'/'unit_selected'/'reserved'/'conflict') | — | 🧮 derived |

**Product-решение нужно:**
1. Decimal-стратегия для ценовых полей (`pricePerShift`, `deliveryPrice`, `surcharge`) — единый формат в adapter-е и форме редактирования.

---

## 3. Client

UI: `Client` в `types/client.ts` — **самый богатый тип в UI, самый большой gap.**
API: `Client` в schema.

| UI field | API field | Статус | Комментарий |
|---|---|---|---|
| `id` | `id` | ✅ | |
| `type` (`company`/`person`) | — | 🧮 derived | по наличию `company` |
| `displayName` | `company || name` | 🧮 derived | |
| `shortName` | `name` | 🔁 rename | |
| `primaryPhone` | `phone` | 🔁 rename | |
| `primaryEmail` | `email` | 🔁 rename | |
| `manager` | — | 🧮 derived | manager последней активной Application |
| `createdAt` / `updatedAt` | `createdAt` / `updatedAt` | ✅ | |
| `lastActivity` | `updatedAt` | 🔁 | |
| `totalOrders` | — | 🧮 derived | count applications where stage in [...] |
| `totalRevenue` | — | 🧮 derived | sum(items.pricePerShift * shiftCount + ...) |
| `daysSinceLastOrder` | — | 🧮 derived | |
| `tags[]` | `tags[]` через `ClientTag -> Tag` | 🔁 rename | нужна adapter-нормализация в UI-модель |
| `contacts[]` | `contacts[]` | ✅ / 🔁 | базовые поля есть, роли/label приводятся adapter-ом |
| `requisites` (inn/kpp/ogrn/bank*) | `requisites` | ✅ / 🔁 | схема есть, UI-объект шире и маппится adapter-ом |
| `favoriteCategories[]` | `favoriteEquipment[]` (string[]) | 🔁 rename | UI структурно отличается (с count) |
| `workingNotes` | `workingNotes` | ✅ | |
| `comment` | `notes` | 🔁 | |
| `leadsHistory[]` | — | 🧮 derived | include leads |
| `ordersHistory[]` | — | 🧮 derived | include applications + nested |
| `activeRecords` (counts + top records) | — | 🧮 derived | aggregate |
| `possibleDuplicates[]` | — | 🔁 (endpoint есть) | `GET /clients/duplicates` |
| `activity[]` | — | 🔁 (endpoint есть) | `GET /activity?entityType=client&entityId=:id` |

### Решения нужны продуктово

1. **FavoriteCategories**: оставить как простой `string[]` + считать `count` по applications, или сделать явный `ClientFavoriteCategory { clientId, categoryId, count, lastUsedAt }`?
2. **History/aggregates**: зафиксировать объём и формулу полей `totalOrders`, `totalRevenue`, `daysSinceLastOrder`.
3. **Repeat-order UX**: финально определить контракт сценария "создать лид из клиента".

Критические schema-gaps по Client закрыты на уровне Prisma; остаётся добить полный UI wiring и adapter-слой для историй/агрегатов.

---

## 4. Reservation

UI: `Reservation` в `types/kanban.ts`
API: `Reservation` в schema + `reservationsApi.ts`

| UI field | API field | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `status` (`active`/`released`) | `isActive` (bool) + `releasedAt` | 🧮 derived |
| `internalStage` | `internalStage` | ✅ match |
| `reservationType` (`equipment_type`/`specific_unit`) | — | 🧮 derived | by `equipmentUnitId` is set |
| `equipmentType` (string) | `equipmentType.name` | 🔁 rename | include |
| `equipmentUnit` | `equipmentUnit.name` | 🔁 rename | |
| `source` (`own`/`subcontractor`/`undecided`) | `sourcingType` | 🔁 rename |
| `subcontractor` | `subcontractor.name` | 🔁 rename | |
| `reservedBy` (string ФИО) | `createdById` + `createdBy.fullName` | 🔁 rename | поле есть в схеме, нужен include в API-проекции |
| `reservedAt` | `createdAt` | 🔁 | |
| `releasedAt` | `releasedAt` | ✅ |
| `releaseReason` | `releaseReason` | ✅ |
| `comment` | `comment` | ✅ |
| `lastActivity` | `updatedAt` | 🔁 |
| `hasConflict` | `hasConflictWarning` | 🔁 |
| `conflict` (детали) | — | 🧮 derived | detectConflict результат не возвращается вместе с сущностью |
| `readyForDeparture` | — | 🧮 derived | internalStage === 'ready_for_departure' |
| `linked` (Application/Client/Lead join info) | — | 🧮 derived | include |
| `candidateUnits[]` | — | 🔁 | отдельный запрос `GET /equipment-units?equipmentTypeId&status=active` |
| `subcontractorOptions[]` | — | 🔁 | отдельный запрос `GET /subcontractors?status=active` |
| `activity[]` | — | 🔁 | `GET /activity?entityType=reservation&entityId=:id` |

### Enum diff: `internalStage`

| UI | API |
|---|---|
| `needs_source_selection` | `needs_source_selection` |
| `searching_own_equipment` | `searching_own_equipment` |
| `searching_subcontractor` | `searching_subcontractor` |
| `subcontractor_selected` | `subcontractor_selected` |
| `type_reserved` | `type_reserved` |
| `unit_defined` | `unit_defined` |
| `ready_for_departure` | `ready_for_departure` |
| `released` | `released` |

**Результат:** enum-расхождение закрыто.

---

## 5. Departure

UI: `Departure` в `types/departure.ts` + `departureStatus` в Lead
API: `Departure` в schema.

### Enum sync

`DepartureStatus` синхронизирован между UI/API: `scheduled | in_transit | arrived | completed | cancelled`.

### Поля

| UI | API | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `status` | `status` | ✅ |
| `scheduledAt` | `scheduledAt` | ✅ |
| `startedAt` | `startedAt` | ✅ |
| `arrivedAt` | `arrivedAt` | ✅ |
| `completedAt` | `completedAt` | ✅ |
| `cancelledAt` | `cancelledAt` | ✅ |
| `cancellationReason` | `cancellationReason` | ✅ |
| `notes`/`comment` | `notes` | 🔁 rename |
| `deliveryNotes` | `deliveryNotes` | ✅ |
| `linked.*` | `linked.*` (projection) | ✅ / 🧮 |
| `alert` (none/overdue_start/overdue_arrival/stale) | `derived.alert` | 🧮 derived |

Оставшиеся отличия по Departure — в основном UI-friendly denormalized поля (`manager`, humanized `lastActivity`) и не требуют schema-change.

---

## 6. Completion

UI: `Completion` в `types/completion.ts`
API: `Completion` в schema (очень минимальная).

| UI | API | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `status` (`ready_to_complete`/`blocked`/`completed`/`unqualified`) | `outcome` (`completed`/`unqualified`) + `derived.status` | 🧮 derived |
| `alert` (none/stale/missing_arrival/reservation_mismatch) | — | 🧮 derived |
| `manager` (ФИО) | — | 🧮 derived |
| `createdAt`/`updatedAt`/`lastActivity` | — | 🔁 (есть `completedAt`) |
| `comment` | `completionNote` | 🔁 rename |
| `linked.*` | `linked.*` (projection) | ✅ / 🧮 |
| `context.plannedDate/Times/address/contacts` | `context.*` (projection) | ✅ / 🧮 |
| `context.departedAt/arrivedAt` | — | 🧮 derived | через departure |
| `context.operationalNote` | — | ➕ schema-add | нет |
| `fact.completedAt` | `completedAt` | ✅ |
| `fact.completedBy` | `completedById` + `completedByName` | ✅ / 🔁 |
| `fact.completionNote` | `completionNote` | ✅ |
| `fact.unqualifiedReason` | `unqualifiedReason` | ✅ |

### Решения продуктово

1. `operationalNote` — где хранится и нужен ли как отдельное поле?

---

## 7. EquipmentType / EquipmentUnit / Subcontractor / EquipmentCategory

UI: используется внутри `CatalogsWorkspacePage` + mock-справочники.

### EquipmentType — match ✅ (без gap-ов).

### EquipmentUnit — 1 gap

UI показывает `status: 'available' | 'busy' | 'maintenance'` для candidateUnits при бронировании.
API: `status: 'active' | 'inactive' | 'archived'` + отдельно доступность (computed через active reservations).

**Решение:** UI-поле `status` для `ReservationCandidateUnit` — это derived по реальным active reservations, не путать с `EquipmentUnit.status`.

### Subcontractor — 1 gap

UI `ClientWorkspace` и Reservation show `rating: 0..5`.
API: поля `rating` нет.

**Решение:** добавить `rating Decimal?` или `rating Int?` в Subcontractor? Или убрать из UI?

### EquipmentCategory — match ✅

---

## 8. Activity / Audit

UI: `ControlWorkspacePage` + все `*.activity[]` внутри detail-типов.
API: `ActivityLogEntry` с полем `payload: Json`.

| UI | API | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `at` | `createdAt` | 🔁 |
| `actor` (ФИО) | `actor.fullName` | 🔁 (include) |
| `kind` (много UI-specific значений) | `action` (ActivityAction) | ⚠ enum-diff |
| `message` | `summary` | 🔁 |

### Enum mapping

API `ActivityAction`: `created | updated | stage_changed | reservation_set | reservation_released | completed | unqualified | imported | note_added`

UI kinds (смешанные по типам detail-сущностей): `plan_changed, departed, arrived, completion_started, source_changed, unit_assigned, subcontractor_assigned, conflict_detected, transferred, contact_changed, requisites_changed, lead_created, application_created, order_repeated, order_completed`.

**Решения продуктово:**

1. Расширить API `ActivityAction` до объединённого enum, чтобы UI kind совпадали с DB action? ИЛИ
2. Хранить `action` как общий + детализировать через `payload` + делать UI-mapping в adapter-е?

Рекомендация — **вариант 2** (общий action + payload). UI получает обобщённую «ленту» и раскладывает на кинды через adapter. Это проще для миграций.

---

## Краткий список решений продуктово, которые остаются актуальными

1. `Client.favoriteEquipment` — оставить как `string[]` или делать структуру с count/lastUsed.
2. Политика отображения `Application.stage`: как UX трактует `cancelled` vs `unqualified` в списках/фильтрах.
3. `Subcontractor.rating` — подтверждаем поле как часть MVP или убираем из UI.
4. `ActivityAction` — фиксируем адаптерную стратегию маппинга action -> UI-kind.
5. Aggregate endpoints (`GET /stats`, расширенный `GET /activity` с фильтрами) — планируем отдельной итерацией.
6. Для completion workspace: оставить primary source через departures-adapter или переключить на `/completions` list как основной источник.

---

## Что уже готово к подключению сейчас

По этому diff-у — в подключении без решений продуктово:

1. **Auth** — подключено, DONE.
2. **Leads list + kanban** — ✅ подключено: list/detail, DnD stage transitions, inline-edit, `POST /leads`, activity.
3. **Applications detail** — ✅ header и базовые mutation-сценарии подключены; остаются UI-триггеры item CRUD.
4. **Reservations detail** — ✅ подключены stage/source/update/release + create reservation from application-ready positions.
5. **Departures** — ✅ backend + frontend API wiring подключены (list/detail + start/arrive/cancel/complete/update).
6. **Completion** — ✅ backend + frontend API wiring подключены (create/get/update + completion flow from departure).
7. **Directories list** — endpoint-совместимость высокая, остаётся UI wiring create/edit модалок.

Крупные остатки уже не в schema-ядре, а в UI wiring и aggregate/reporting сценариях.
