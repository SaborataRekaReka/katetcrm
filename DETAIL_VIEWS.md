# DETAIL_VIEWS

## 1. Purpose

This file defines CRM-specific detail view behavior.
It prevents fallback to generic task-modal patterns.

## 2. Global detail principles

1. Open detail from board/list/table row or card click.
2. Keep entity context and linked records visible.
3. Use consistent section order and action hierarchy.
4. Keep details operational, not decorative.

Action hierarchy:

- Primary CTA: next step in workflow.
- Secondary action: alternative valid transition.
- Link actions: navigate to related entity.
- Status chips: state only, no hidden actions.

## 3. Lead detail spec

Must include:

1. Core client/contact block.
2. Source and duplicate signals.
3. Missing fields/readiness hints.
4. Manager and last activity.
5. Next-step CTA: convert to application (or unqualified path).

Allowed actions:

- Convert to application.
- Mark unqualified with reason.
- Open linked client when duplicate/similar exists.

## 4. Application detail spec

Must include:

1. Application header and stage.
2. Multi-item list with per-item readiness.
3. Source selection state (`own/subcontractor/undecided`) per item.
4. Reservation readiness summary.
5. Client link and lead link (if exists).

Allowed actions:

- Add/edit/remove items.
- Prepare/create reservation for ready items.
- Open reservation or client context.

## 5. Reservation detail spec

Must include:

1. Linked application item context.
2. Internal stage progression.
3. Source and unit/subcontractor assignment.
4. Conflict warning panel (non-blocking).
5. Readiness for departure.

Allowed actions:

- Change source path.
- Assign/replace unit.
- Assign/replace subcontractor.
- Move to next internal stage.
- Release reservation when flow requires.

## 6. Client detail spec

Must include:

1. Client profile and contacts.
2. Requisites.
3. Lead and application history.
4. Active records summary.
5. Repeat-order entry points.

Allowed actions:

- Open historical lead/application/reservation/departure.
- Start repeat order from client context.
- Edit contact/requisites according to permissions.

## 7. Departure detail spec

Must include:

1. Linked reservation/application/client context.
2. Planned schedule and current execution status.
3. Exceptions/issues block.
4. Completion entry action.

Allowed actions:

- Update execution status.
- Mark completed.
- Mark unqualified/cancel path per policy.

## 8. Linked entities policy

Every detail workspace should expose direct links to related records where available:

1. Lead <-> Application
2. ApplicationItem <-> Reservation
3. Reservation <-> Departure
4. Any entity <-> Client

Rule:

- Links are navigation actions, not hidden state mutations.

## 9. Sections layout order

Recommended order in detail canvas:

1. Overview block.
2. Main process block.
3. Supporting state/readiness.
4. Notes/comments.
5. Linked records.
6. Activity timeline.

## 10. Open behavior by view

1. Board card click -> open corresponding entity detail workspace.
2. List row click -> same entity detail workspace.
3. Table row click -> same entity detail workspace.

Consistency rule:

- Open behavior must be uniform across board/list/table for the same entity type.

## 11. Interactivity patterns (current baseline, updated 06.05.2026)

All detail modals (`LeadDetailModal`, `ReservationWorkspace`, `ApplicationDetailView`) share:

1. **Inline-edit primitives** from `components/detail/InlineEdit/` (`InlineText`, `InlineDate`, `InlineSelect`). Gated on `USE_API && !!id` (plus `status === 'active'` для брони). В mock-режиме или без id — fallback на read-only `InlineValue`.
2. **Contact atoms** (`PhoneLink`, `EmailLink`, `CopyableValue`) в `components/detail/ContactAtoms.tsx`. Используются везде, где показывается контакт (таблицы, списки, sidebar). `stopPropagation` внутри, не триггерит открытие карточки.
3. **Live-reflection**: каждая mutation в `hooks/useXMutations.ts` делает `qc.setQueryData(detailKey, fresh)` + invalidate list + invalidate activity-журнал. UI обновляется без задержки refetch.
4. **Activity journal** через `useEntityActivity(entityType, entityId)` — реальные записи с `/activity`. Fallback на mock-массив, если API не ответило или feature-flag выключен.
5. **Header secondary actions**: `EntityModalHeader.secondaryActions?: { label, onClick }[]`. Пример — «Отменить заявку» запускает `CancelApplicationDialog`.

## 12. Kanban stage transitions (implemented)

- Native HTML5 drag-n-drop через `onDragStart`/`onDragOver`/`onDrop`.
- Frontend зеркалит backend `ALLOWED_TRANSITIONS` в `LeadsKanbanBoard.tsx`: не-валидные колонки получают `opacity-60`, валидные — `ring-emerald`.
- Ошибки бэка (400 `Недопустимый переход`) отображаются inline-toast в верхней части доски, 4 сек.
- lead→application транзакционно создаёт `Application` + `Client` на сервере (`leads.service.ts`). Это ожидаемое поведение, НЕ добавлять optimistic rollback в UI.
- departure→completed/unqualified автоматически снимает активные брони на сервере. Не дублировать release в UI.
- reservation→departure в текущем QA/API контракте является явным действием пользователя и требует выбранный unit перед созданием `Departure`.
