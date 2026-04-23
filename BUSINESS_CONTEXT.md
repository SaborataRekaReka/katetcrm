# BUSINESS_CONTEXT

## 1. Purpose

This file captures practical business context for product and engineering decisions.

## 2. Who the customer is

Katet is an equipment rental and operations-focused business in Moscow/MO.
The CRM must support fast response and reliable execution, not generic pipeline vanity metrics.

## 3. Request channels

Primary channels:

1. Site
2. Phone/Mango context
3. Telegram
4. MAX
5. Manager manual input

Implication:

- CRM must unify multi-channel intake into one operational queue.

## 4. SLA expectations

Business expectation:

1. Fast first response.
2. Fast confirmation of feasible reservation/departure path.

Implication:

- Time-to-first-contact and time-to-reservation are core KPIs.

## 5. Geography and logistics

Operational context:

1. Moscow and Moscow region.
2. MKAD-sensitive logistics assumptions.
3. Delivery windows and traffic constraints matter.

Implication:

- Reservation and departure planning must be timing-aware.

## 6. Sales unit and pricing logic

Common operating unit:

- Shift-based work and rental framing.

Implication:

- Application and reservation models must preserve shift/time context.

## 7. Fleet model

Supply model:

1. Own fleet.
2. Subcontractor supply.

Implication:

- Source selection is first-class workflow state, not metadata footnote.

## 8. Why reservation and operations are critical

Core business risk is not only lead loss, but operational failure:

1. Wrong or delayed reservation.
2. Resource conflict.
3. Broken handoff to departure.

Implication:

- CRM must treat reservation/departure as core, not secondary modules.

## 9. Niche risks

Primary niche risks:

1. Overbooking / reservation conflicts.
2. Data fragmentation across chats/spreadsheets.
3. Slow handoff between sales and operations.
4. Weak audit trail for disputed transitions.
5. Scope creep into non-MVP modules.

## 10. Product posture from business context

1. Keep manager workflow fast and compact.
2. Preserve operational state clarity over visual complexity.
3. Favor reliable execution and traceability over feature breadth in MVP.
