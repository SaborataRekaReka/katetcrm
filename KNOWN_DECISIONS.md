# KNOWN_DECISIONS

## 1. Purpose

This file captures confirmed architecture/product decisions and rationale.

## 2. Accepted decisions

1. Modular monolith is baseline architecture for MVP.
2. Product is lead-centric in UX, with separated domain entities.
3. Core entities remain explicit: Lead, Application, ApplicationItem, Reservation, Client, Departure.
4. Reservation conflict is warning, not hard block.
5. No dedicated dispatcher role in MVP.
6. Out-of-scope modules stay out of first release.

## 3. Stack decision notes

Target direction decision:

1. Next.js + TypeScript + MUI + React Query + Zustand as production-ready target.

Current implementation reality decision:

1. Repository currently runs on Vite + React + Tailwind/shadcn and layout store.
2. This is accepted as current baseline until explicit migration stage.

## 4. Domain and workflow decisions

1. One lead -> one active application.
2. One application item -> one active reservation.
3. Completed/unqualified releases active reservations.
4. Source selection for reservation supports own/subcontractor/undecided.

## 5. Navigation and UX decisions

1. Two-level navigation model is mandatory (primary rail + contextual sidebar).
2. Board/list/table are representations of domain data, not project-management semantics.
3. Detail layer must remain CRM-specific workspace pattern.

## 6. Security and control decisions

1. Server-side RBAC is mandatory.
2. UI-level hiding is convenience only.
3. Critical transitions must be auditable.

## 7. Rejected decisions

1. Reject generic task-modal replacement for CRM entities.
2. Reject single flat sidebar mixing global/local/saved/workflow items.
3. Reject hard block on reservation conflicts in MVP.
4. Reject adding finance/telematics/portal modules in first release without explicit scope change.

## 8. Decision update policy

When changing any decision:

1. Record previous and new decision.
2. Record reason and impact.
3. Update related canon files in same change set.
