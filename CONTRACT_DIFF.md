# CONTRACT DIFF: UI types ↔ Prisma/API

Пошаговое сравнение полей интерфейсов фронтенда (`app/frontend/src/app/types/*.ts`) и моделей БД / DTO бэкенда (`app/backend/prisma/schema.prisma`, `modules/*/dto/*.ts`). Составлено 23.04.2026 на основе Pass C.

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
| `stage` | `stage` | ⚠ enum-diff | UI: `application/reservation/departure/completed/cancelled`; API (PipelineStage): `application/reservation/departure/completed/unqualified`. **`cancelled` ≠ `unqualified`** |
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
| `deliveryMode` (`pickup`/`delivery`) | `deliveryMode` (string) | ⚠ enum-diff | в БД просто string без enum — нужно формализовать |
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
1. `Application.stage = 'cancelled'` — добавить в enum PipelineStage или убрать из UI?
2. `Application.deliveryMode` — формализовать enum (`pickup`/`delivery`) в Prisma?

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
| `tags[]` | — | ➕ schema-add | **нет модели тегов** |
| `contacts[]` | — | ➕ schema-add | **нет модели ClientContact** |
| `requisites` (inn/kpp/ogrn/bank*) | — | ➕ schema-add | **нет реквизитов** |
| `favoriteCategories[]` | `favoriteEquipment[]` (string[]) | 🔁 rename | UI структурно отличается (с count) |
| `workingNotes` | — | ➕ schema-add | нет (есть только `notes`) |
| `comment` | `notes` | 🔁 | |
| `leadsHistory[]` | — | 🧮 derived | include leads |
| `ordersHistory[]` | — | 🧮 derived | include applications + nested |
| `activeRecords` (counts + top records) | — | 🧮 derived | aggregate |
| `possibleDuplicates[]` | — | 🔁 (endpoint есть) | `GET /clients/duplicates` |
| `activity[]` | — | 🔁 (endpoint есть) | `GET /activity?entityType=client&entityId=:id` |

### Решения нужны продуктово

1. **Contacts**: добавить `ClientContact { id, clientId, name, role, phone, email, isPrimary }`?
2. **Requisites**: добавить `ClientRequisites` (одна к одному с Client)?
3. **Tags**: добавить `ClientTag`?
4. **FavoriteCategories**: оставить как простой `string[]` + считать `count` по applications, или сделать явный `ClientFavoriteCategory { clientId, categoryId, count, lastUsedAt }`?

Без этих решений ClientWorkspace подключить к API невозможно — он рассыплется.

---

## 4. Reservation

UI: `Reservation` в `types/kanban.ts`
API: `Reservation` в schema + `reservationsApi.ts`

| UI field | API field | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `status` (`active`/`released`) | `isActive` (bool) + `releasedAt` | 🧮 derived |
| `internalStage` | `internalStage` | ⚠ enum-diff |
| `reservationType` (`equipment_type`/`specific_unit`) | — | 🧮 derived | by `equipmentUnitId` is set |
| `equipmentType` (string) | `equipmentType.name` | 🔁 rename | include |
| `equipmentUnit` | `equipmentUnit.name` | 🔁 rename | |
| `source` (`own`/`subcontractor`/`undecided`) | `sourcingType` | 🔁 rename |
| `subcontractor` | `subcontractor.name` | 🔁 rename | |
| `reservedBy` (string ФИО) | — | ➕ schema-add / 🧮 derived | нет `createdById` поля; только в activity log |
| `reservedAt` | `createdAt` | 🔁 | |
| `releasedAt` | `releasedAt` | ✅ |
| `releaseReason` | `releasedReason` | 🔁 | (typo в bd: `releasedReason` vs UI `releaseReason`) |
| `comment` | `subcontractorNote` или — | 🔁 | двусмысленно |
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
| `needs_selection` | `needs_source_selection` |
| `searching_own_equipment` | `searching_own_equipment` |
| `searching_subcontractor` | `searching_subcontractor` |
| `type_reserved` | `type_reserved` |
| `unit_defined` | `unit_defined` |
| `ready_for_departure` | `ready_for_departure` |
| `released` | `released` |
| — | `subcontractor_selected` (есть в API, нет в UI) |

**Решение:** переименовать UI `needs_selection` → `needs_source_selection` + добавить `subcontractor_selected`.

### Ещё нужно в схему

- `Reservation.createdById` (string, ref User) — **bug, нужно добавить**.

---

## 5. Departure

UI: `Departure` в `types/departure.ts` + `departureStatus` в Lead
API: `Departure` в schema.

### Enum полностью разный

| UI `DepartureStatus` | API `DepartureStatus` |
|---|---|
| `planned` | `scheduled` |
| `on_the_way` | `in_progress` |
| `arrived` | — (нет отдельного!) |
| `completed` | `done` |
| `cancelled` | — (нет!) |
| — | `overdue` (в БД статус, в UI — alert) |

**Решения продуктово:**

Рекомендую расширить БД до:
```prisma
enum DepartureStatus {
  scheduled
  in_transit   // == on_the_way
  arrived
  completed
  cancelled
}
```
А `overdue` перенести в `Departure.alert` (derived).

Альтернативно: упростить UI до `scheduled/in_progress/done/cancelled`, `arrived` вывести через `startedAt + finishedAt`.

### Остальные поля

| UI | API | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `alert` (none/overdue_start/overdue_arrival/stale) | — | 🧮 derived |
| `manager` (ФИО) | — | 🧮 derived | manager активной Application |
| `createdAt`/`updatedAt`/`lastActivity` | — | 🔁 | |
| `comment` | `notes` | 🔁 |
| `linked.*` | — | 🧮 derived | join через reservation |
| `plan.plannedDate` | `scheduledAt` | 🔁 |
| `plan.plannedTimeFrom/To` | — | ➖/➕ | **в БД нет** (в ApplicationItem есть plannedTimeFrom/To) — derived через reservation.applicationItem? |
| `plan.address` | — | 🧮 derived | через applicationItem.address |
| `plan.contactName/Phone` | — | 🧮 derived | через client |
| `plan.deliveryNotes` | — | ➕ schema-add | нет такого поля |
| `fact.departedAt` | `startedAt` | 🔁 |
| `fact.arrivedAt` | — | ➕ schema-add | нет (только `startedAt` + `finishedAt`) |
| `fact.completedAt` | `finishedAt` | 🔁 |
| `fact.cancelledAt` | — | ➕ schema-add | нет |
| `fact.cancellationReason` | — | ➕ schema-add | нет |

### Решения продуктово

1. Enum DepartureStatus — см. выше.
2. Добавить `arrivedAt`, `cancelledAt`, `cancellationReason` в `Departure`?
3. `deliveryNotes` — добавить как отдельное поле или в `comment/notes`?

---

## 6. Completion

UI: `Completion` в `types/completion.ts`
API: `Completion` в schema (очень минимальная).

| UI | API | Статус |
|---|---|---|
| `id` | `id` | ✅ |
| `status` (`ready_to_complete`/`blocked`/`completed`/`unqualified`) | `outcome` (`completed`/`unqualified`) | 🧮 derived + ⚠ | `ready_to_complete` и `blocked` — derived состояние «можно ли кликнуть Завершить» |
| `alert` (none/stale/missing_arrival/reservation_mismatch) | — | 🧮 derived |
| `manager` (ФИО) | — | 🧮 derived |
| `createdAt`/`updatedAt`/`lastActivity` | — | 🔁 (есть `completedAt`) |
| `comment` | `reason` | 🔁 |
| `linked.*` | — | 🧮 derived |
| `context.plannedDate/Times/address/contacts` | — | 🧮 derived |
| `context.departedAt/arrivedAt` | — | 🧮 derived | через departure |
| `context.operationalNote` | — | ➕ schema-add | нет |
| `fact.completedAt` | `completedAt` | ✅ |
| `fact.completedBy` | — | ➕ schema-add | нет `completedById` ссылки |
| `fact.completionNote` | `reason` | 🔁 |
| `fact.unqualifiedReason` | `reason` | 🔁 | (двойная роль) |

### Решения продуктово

1. Добавить `completedById` (ref User)?
2. Разделить `reason` на два поля: `completionNote` + `unqualifiedReason`?
3. `operationalNote` — где сохраняется?

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

## Краткий список решений продуктово, которые нужны до Stage 4

1. `Application.stage = 'cancelled'` — оставить ли? → **определить.**
2. `Application.deliveryMode` enum в Prisma — **формализовать.**
3. `Reservation.internalStage` — привести написание к одному варианту + добавить `subcontractor_selected` в UI.
4. `Reservation.createdById` — **добавить в схему.**
5. `Reservation.releasedReason` vs `releaseReason` — выбрать одно.
6. `Client.contacts[]` — **добавить модель?** (если нет — убрать из UI)
7. `Client.requisites` — **добавить модель?**
8. `Client.tags[]` — **добавить модель?** (или генерить теги по бизнес-правилам из UI)
9. `Client.favoriteEquipment` — оставить как string[] или сделать структуру с count?
10. `Departure` enum — **привести к одному enum.**
11. `Departure.arrivedAt / cancelledAt / cancellationReason / deliveryNotes` — добавить?
12. `Completion.completedById` — добавить?
13. `Subcontractor.rating` — добавить или убрать из UI?
14. `ActivityAction` — оставить общий или расширить?
15. Aggregate endpoints (`GET /stats`, расширенный `GET /activity` с фильтрами) — запланировать.

---

## Что уже готово к подключению сейчас

По этому diff-у — в подключении без решений продуктово:

1. **Auth** — подключено, DONE.
2. **Leads list + kanban** — ✅ подключено полностью: server-side query, DnD между стадиями (native HTML5, mirror `ALLOWED_TRANSITIONS`), detail-modal `GET /leads/:id`, `POST /leads/:id/stage` (unqualify + convert-to-application), inline-edit всех persisted полей, `useEntityActivity` журнал. Остаются: server-side filters + CTA «Создать лид».
3. **Applications detail** — ✅ header подключён: inline-edit (address/comment/requestedDate), `POST /applications/:id/cancel` из header.secondaryActions, activity журнал. Остаются: CRUD позиций (hooks уже готовы).
4. **Reservations detail** — ✅ подключены: stage toggle, source select, subcontractorConfirmation, promisedModelOrUnit, plannedStart/End (дата + окно времени HH:MM–HH:MM), comment, release. Остаются: unit/subcontractor typeahead.
5. **Directories list** — **100% match**. Можно подключить list прямо сейчас без каких-либо решений.

Всё остальное — **ждёт продуктовых решений** из списка выше (Clients schema, Departure enum, Completion endpoints).
