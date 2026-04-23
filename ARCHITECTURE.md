# ARCHITECTURE

## 1. Purpose and MVP boundaries

Katet CRM is a specialized CRM for equipment rental operations. It is not a generic task manager and not a universal enterprise platform.

Primary process (MVP):

Lead -> Application -> Reservation -> Departure -> Completed/Unqualified

MVP focus:

- Incoming lead capture from site, Mango, Telegram, MAX, manual input.
- Sales-to-operations handoff without losing context.
- Reservation management with conflict warning (not hard block).
- Departure and completion tracking.
- Core directories (equipment types, equipment units, subcontractors).
- Audit log and baseline analytics.
- Import pipeline for initial migration and ongoing uploads.

## 2. High-level architecture

### 2.1 Frontend

Current repository reality:

- Vite + React + TypeScript.
- State-driven shell via layout store (`layoutStore`) with partial URL sync (`routeSync`).
- Tailwind + shadcn/ui as main UI layer.
- Detail views open via modal routing pattern (full-screen dialogs with stage-specific workspaces).

Future-ready target (production backend integration):

- Next.js + TypeScript (or equivalent SSR-capable architecture) for stable routing, auth middleware, and server interaction patterns.
- MUI + design tokens as primary component system where dense tables/admin surfaces are required.
- React Query + Zustand (or equivalent) for remote state and UI state separation.

### 2.2 Backend

Текущая реализация (Stage 1 скелет, см. `app/backend/`):

- NestJS 10 + TypeScript, модульный монолит.
- Prisma 5 + PostgreSQL 16 (Docker Compose для локальной БД).
- Passport + JWT-стратегия (login/refresh endpoints будут в Stage 2).
- ConfigModule с валидацией env через `class-validator`.
- Healthcheck `/api/v1/health` (проверяет БД).
- Prisma schema покрывает все ключевые сущности MVP: `User`, `Client`, `Lead`,
  `Application`, `ApplicationItem`, `Reservation`, `EquipmentCategory`,
  `EquipmentType`, `EquipmentUnit`, `Subcontractor`, `Departure`, `Completion`,
  `ActivityLogEntry`, `IntegrationEvent`.
- Инварианты уровня БД: partial unique index на одну активную `Application` на
  `Lead` и одну активную `Reservation` на `ApplicationItem`; уникальность
  `IntegrationEvent` по `(channel, externalId)` для идемпотентности.

Целевые свойства (Stage 2+):

- Versioned API `/api/v1/...`.
- Server-side RBAC (admin/manager) через RolesGuard.
- Integration ingestion endpoints и replay-safe handlers.
- Audit logging как first-class concern.

### 2.3 Database

- PostgreSQL as primary operational store.
- Transactional integrity for stage transitions and reservation lifecycle.
- Event and audit tables for traceability.

### 2.4 Integrations

- Inbound: site, Mango, Telegram, MAX.
- Outbound/informational: integration event log + retry/replay tooling.
- Ingestion must be idempotent (external message duplication is expected).

## 3. Modular monolith as baseline

Why modular monolith for MVP:

- Fast delivery with low operational overhead.
- Strong domain boundaries without distributed system complexity.
- Clear migration path to services if load or org structure requires splitting later.

Hard rule:

- Keep boundaries explicit now, even in one codebase.
- Cross-context access goes through public module interfaces, not random direct table coupling.

## 4. Bounded contexts

Core bounded contexts:

1. `leads`
2. `applications`
3. `reservations`
4. `departures`
5. `clients`
6. `directories`
7. `analytics`
8. `imports`

Cross-cutting contexts:

- `auth/rbac`
- `audit-log`
- `integrations`

Boundary principles:

- `leads` owns intake and initial qualification.
- `applications` owns multi-item commercial/operational intent.
- `reservations` owns resource allocation and conflict signaling.
- `departures` owns execution readiness and operational completion handoff.
- `clients` owns reusable customer identity and history.
- `directories` owns controlled vocabularies and selectable resources.
- `analytics` reads from operational data but does not own operational mutations.
- `imports` writes through domain use-cases, not direct table bypass.

## 5. Key data flows

### 5.1 Lead intake

1. Source event arrives (site/Mango/Telegram/MAX/manual).
2. Dedup checks by phone/company.
3. Lead created or linked with duplicate warning.
4. ActivityLog and IntegrationEvent entries are written.

### 5.2 Lead -> Application

1. Manager qualifies lead.
2. Application created (one active application per lead).
3. Application items are added/edited.
4. Readiness derived from item-level completeness.

### 5.3 Application -> Reservation

1. Reservation created in context of ApplicationItem.
2. Source selection: own/subcontractor/undecided.
3. Unit selection is optional at first and can be deferred.
4. Conflict detection emits warning only.

### 5.4 Reservation -> Departure -> Completion

1. Ready reservations move to departure workflow.
2. Completion or unqualification releases active reservations automatically.
3. Audit captures before/after for critical transitions.

### 5.5 Import and replay

1. CSV/XLSX preview + mapping.
2. Duplicate check and import log.
3. Failed integration events can be replayed idempotently.

## 6. Entity relationship map

- One Lead -> one active Application.
- One Application -> many ApplicationItems.
- One ApplicationItem -> one active Reservation.
- Reservation references EquipmentType and optionally EquipmentUnit.
- One Client -> many Leads and Applications.
- One Subcontractor -> many EquipmentUnits.
- Any critical mutation -> ActivityLog + optional IntegrationEvent.

## 7. MVP vs future-ready boundary

In MVP (must have):

- End-to-end operational CRM flow.
- Conflict as warning.
- Manager/Admin role model.
- Baseline analytics and auditability.
- Import and integration ingestion.

Not in MVP (future-ready):

- Dedicated dispatcher role.
- Full finance module, partial payment ledger, accounting integration depth.
- Telematics UI and driver mobile app.
- Client/subcontractor portals.
- Expanded object/site/contact-person standalone modules.

## 8. Architecture principles

1. Server-side RBAC is mandatory. UI visibility is not security.
2. Auditability by default for critical operations.
3. Integration-first: every inbound channel is a first-class input path.
4. Reservation conflict is warning, not hard block.
5. No out-of-scope modules in MVP branch.
6. Route/title/search/CTA/data must always stay aligned.
7. Domain semantics over UI imitation: no task-manager abstractions for CRM entities.

## 9. Implementation constraints for contributors

- Preserve stage lifecycle semantics and entity invariants.
- Do not introduce direct mutation paths that bypass domain rules.
- Keep shell roles strict: primary rail is global, secondary sidebar is contextual.
- Keep horizontal scroll local to board/table containers only.
- Do not replace CRM-specific detail workspaces with generic task modals.
