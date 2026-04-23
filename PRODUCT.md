# PRODUCT

## 1. Product definition

Katet CRM is a niche CRM for equipment rental operations in Moscow/MO. The system is built for fast intake, reservation reliability, and manager-friendly execution.

Primary users:

- Manager (daily operational role in MVP).
- Admin (configuration, visibility, control).

## 2. What process it automates

Core business flow:

Lead -> Application -> Reservation -> Departure -> Completed/Unqualified

What must be automated end-to-end:

- Multi-channel lead intake.
- Qualification and conversion to application.
- Multi-item planning inside application.
- Reservation placement and conflict warning.
- Transition to departure and manual completion.
- Reuse of client context for repeat orders.

## 3. MVP scope

Modules included in MVP:

- Leads
- Applications
- Reservations
- Departures
- Clients
- Equipment Types
- Equipment Units
- Subcontractors
- Reports
- Audit Log
- Imports

Required integrations in MVP:

- Site
- Mango
- Telegram
- MAX

## 4. Out of scope (MVP)

- Dispatcher-only role and separate dispatcher interface.
- Finance module, partial payments, accounting/1C depth.
- Telematics UI.
- Driver mobile app.
- Client/subcontractor portals.
- EDO workflows inside first release.
- Heavy enterprise admin experience for manager daily work.

## 5. Core business rules

1. One Lead -> one active Application.
2. One ApplicationItem -> one active Reservation.
3. Reservation conflict = warning, not hard block.
4. Completed/unqualified must release active reservations.
5. Manager is the main actor in MVP (no separate dispatcher role).
6. Duplicate detection (phone/company) is visible warning, not forced merge.

## 6. Key user scenarios

1. Receive lead from channel and qualify quickly.
2. Convert lead to application with several items.
3. For each item choose own/subcontractor/undecided source.
4. Place reservation with optional unit later.
5. Resolve or acknowledge reservation conflict warning.
6. Move ready reservation to departure.
7. Complete order or mark unqualified with reason.
8. Start repeat order from client card or past order context.
9. Import leads/clients from file with preview and duplicate checks.

## 7. Product quality bar

- Managers should not need chats/spreadsheets for core flow.
- Every stage transition must be traceable in audit log.
- Navigation, title, search, CTA, filters, and loaded content must always match.
