# DOMAIN_MODEL

## 1. Core entities

### 1.1 Lead

Purpose:

- First operational representation of incoming demand.

Key fields:

- `id`
- `stage`: `lead | application | reservation | departure | completed | unqualified`
- `client`, `company`, `phone`
- `source`, `sourceChannel`
- `equipmentType`
- `date`, `timeWindow`, `address`
- `manager`, `lastActivity`
- flags: `isNew`, `isDuplicate`, `isUrgent`, `isStale`, `hasNoContact`, `hasConflict`, `readyForDeparture`
- readiness helpers: `applicationReadiness`, `positionsReady`, `positionsTotal`, `missingFields`

### 1.2 Application

Purpose:

- Structured request after lead qualification.

Key fields:

- `id`, `number`, `stage`
- `leadId`, `clientId`
- `clientName`, `clientCompany`, `clientPhone`
- `responsibleManager`
- `requestedDate`, `requestedTimeFrom`, `requestedTimeTo`, `address`
- `comment`, `isUrgent`, `deliveryMode`, `nightWork`
- `positions[]`
- timestamps: `createdAt`, `updatedAt`, `lastActivity`

### 1.3 ApplicationItem (ApplicationPosition)

Purpose:

- Unit of planning and reservation inside application.

Key fields:

- `id`
- `equipmentType`, `quantity`, `shiftCount`
- optional economics: `pricePerShift`, `deliveryPrice`, `surcharge`
- scheduling: `plannedDate`, `plannedTimeFrom`, `plannedTimeTo`, `address`
- source: `sourcingType = own | subcontractor | undecided`
- assignment: `subcontractor`, `unit`
- reservation markers: `readyForReservation`, `reservationState`, `status`

### 1.4 Reservation

Purpose:

- Resource allocation for application item.

Key fields:

- `id`
- `status = active | released`
- `internalStage`
- `reservationType = equipment_type | specific_unit`
- `equipmentType`, optional `equipmentUnit`
- `source = own | subcontractor | undecided`
- `subcontractor`
- `reservedBy`, `reservedAt`, `releasedAt`, `releaseReason`
- `hasConflict`, `conflict`
- `readyForDeparture`
- `linked` (application/client/lead/position references)
- `candidateUnits[]`, `subcontractorOptions[]`, `activity[]`

### 1.5 Client

Purpose:

- Reusable customer identity and history context.

Key fields:

- `id`, `type = company | person`, `displayName`, `shortName`
- contacts and requisites
- `manager`, `lastActivity`, `totalOrders`, `totalRevenue`
- `favoriteCategories[]`
- `leadsHistory[]`, `ordersHistory[]`
- `activeRecords`
- `possibleDuplicates[]`
- `activity[]`

### 1.6 EquipmentType

Purpose:

- Canonical type directory for planning and reservation.

Minimal fields:

- `id`, `name`, optional attributes/capabilities
- `isActive`

### 1.7 EquipmentUnit

Purpose:

- Concrete unit that can satisfy reservation.

Minimal fields:

- `id`, `typeId`, `name`
- optional identifiers (`plate`, serial)
- availability status (`available | busy | maintenance`)
- owner (`own` or subcontractor reference)

### 1.8 Subcontractor

Purpose:

- External source of equipment when own fleet is insufficient.

Minimal fields:

- `id`, `name`, contacts
- active/inactive state
- linked units or offered categories

### 1.9 Departure

Purpose:

- Execution stage for reserved requests.

Minimal fields:

- `id`
- link to reservation/application/client
- plan/fact timestamps
- execution status (`planned | on_the_way | arrived | completed | cancelled`)

### 1.10 ActivityLog

Purpose:

- Immutable timeline of important actions.

Minimal fields:

- `id`, `at`, `actor`
- `entityType`, `entityId`
- `actionType`
- before/after snapshot (for critical changes)

### 1.11 IntegrationEvent

Purpose:

- Inbound/outbound integration observability and replay.

Minimal fields:

- `id`, `sourceSystem`, `externalId`
- payload metadata/hash
- status (`received | processed | failed | replayed`)
- retry counters and error details

## 2. Relationships

1. Lead 1 -> 0..1 active Application.
2. Application 1 -> N ApplicationItems.
3. ApplicationItem 1 -> 0..1 active Reservation.
4. Reservation -> EquipmentType (required), EquipmentUnit (optional initially).
5. Client 1 -> N Leads and N Applications.
6. Subcontractor 1 -> N EquipmentUnits.
7. Any critical entity mutation -> ActivityLog entry.
8. Integration-ingested mutation -> IntegrationEvent trace.

## 3. Invariants and constraints

1. No more than one active application per lead.
2. No more than one active reservation per application item.
3. Reservation conflict cannot hard-block save in MVP (warning only).
4. Completion/unqualified must release active reservations.
5. Lead/application/reservation stage transitions must be auditable.
6. Source channel must be preserved for ingestion-originated leads.
7. Manager visibility in UI does not replace backend permission checks.

## 4. Status models

### 4.1 Funnel status (kanban)

- `lead`
- `application`
- `reservation`
- `departure`
- `completed`
- `unqualified`

### 4.2 Application status

- `application`
- `reservation`
- `departure`
- `completed`
- `cancelled`

### 4.3 Reservation internal stages

- `needs_selection`
- `searching_own_equipment`
- `searching_subcontractor`
- `type_reserved`
- `unit_defined`
- `ready_for_departure`
- `released`

## 5. Reservation stage transitions

Allowed transitions (MVP):

1. `needs_selection` -> `searching_own_equipment` or `searching_subcontractor`
2. `searching_own_equipment` -> `type_reserved` or back to `needs_selection`
3. `searching_subcontractor` -> `type_reserved` or back to `needs_selection`
4. `type_reserved` -> `unit_defined` or back to search stage
5. `unit_defined` -> `ready_for_departure` or back to `type_reserved`
6. `ready_for_departure` -> `released` (when completed/unqualified/cancel flow triggers release)

Exception policy:

- Conflict detection does not block transition attempt; it marks warning state and requires operator decision.

## 6. Derived states

### 6.1 Application readiness

- `ready`: all positions are ready for reservation.
- `partial`: only some positions are ready.
- `waiting_sourcing`: source for one or more positions not finalized.
- `no_data`: critical item-level data is missing.
- `has_active_reservation`: at least one item already reserved.

### 6.2 Reservation readiness

- `readyForDeparture = true` when source and unit assignment satisfy departure prerequisites.

### 6.3 Duplicate signal

- `isDuplicate = true` when phone/company collision is detected.
- Signal is warning, not forced merge/hard block.

## 7. Audit requirements at model level

Critical actions that must write audit entries:

1. Create/edit lead/application/reservation/departure/client.
2. Stage transition across funnel and internal reservation stages.
3. Reservation set/release.
4. Source/unit/subcontractor assignment changes.
5. Completion/unqualified outcomes.
