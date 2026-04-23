# AGENTS

## 1. Purpose

This file defines practical execution rules for AI agents and contributors who modify this repository.

Goal:

- Ship safe changes fast.
- Preserve CRM semantics.
- Avoid recurring mistakes in navigation, domain modeling, and detail UX.

## 2. How to read this project before coding

Read in this order:

1. `PRODUCT.md`
2. `DOMAIN_MODEL.md`
3. `ARCHITECTURE.md`
4. `ROUTES_AND_VIEWS.md`
5. `NAVIGATION_MODEL.md`
6. `FRONTEND_GUIDELINES.md`

Then inspect current implementation entry points:

- `app/frontend/src/app/App.tsx`
- `app/frontend/src/app/components/shell/layoutStore.tsx`
- `app/frontend/src/app/components/shell/routeSync.ts`
- `app/frontend/src/app/components/shell/navConfig.ts`
- `app/frontend/src/app/components/shell/AppShell.tsx`
- Relevant domain workspace page and related toolbar/view components.

## 3. Non-negotiable invariants (do not break)

1. Keep funnel semantics intact: lead -> application -> reservation -> departure -> completed/unqualified.
2. Keep domain entities separated (Lead, Application, ApplicationItem, Reservation, Client, Departure).
3. Keep route/title/search placeholder/CTA/data in sync.
4. Do not add out-of-scope modules.
5. Preserve navigation hierarchy:
   - primary rail = global domains
   - secondary sidebar = contextual domain pages/views
6. Board/list/table are domain views, not ClickUp feature clones.
7. Detail layer must stay CRM-specific; do not replace with generic task modal.
8. Reservation conflict remains warning, not hard block.

## 4. Thinking order for every change

Always reason in this sequence:

1. `route`
2. `domain`
3. `UI`
4. `state`

Meaning:

- First locate where user enters/exits the scenario.
- Then verify domain rules/invariants.
- Then shape UX and interactions.
- Finally wire state and data flow.

## 5. Before editing checklist

1. Compare current behavior vs requested behavior.
2. Localize exact affected domain/context.
3. Name impacted files before edits.
4. Confirm if change is in scope of MVP.
5. Confirm no contradiction with PRODUCT/DOMAIN/ROUTES/NAVIGATION docs.

Minimum pre-edit note (internal):

- Requested change.
- Current behavior.
- Domain impact.
- File list to touch.

## 6. Editing rules

1. Prefer minimal, local edits.
2. Keep shell contracts (`min-w-0`, local overflow, no page-level horizontal scroll).
3. Keep role-based visibility rules in nav/UI.
4. Do not create fake CTA that has no implemented scenario.
5. Do not move business logic to visual-only helper if it hides domain meaning.
6. Keep saved view behavior contextual to domain.

## 7. Common anti-mistakes

Never do these:

- Mix global nav + local pages + saved views + workflow states in one flat sidebar.
- Use clients title with leads CTA, or any route/content mismatch.
- Split ApplicationItems into separate deals in UI semantics.
- Introduce page-level horizontal scroll.
- Turn CRM detail workspace into generic task card/modal.
- Add portal/telematics/finance modules in MVP branch without explicit request.

## 8. Validation before finalizing

Run at minimum:

1. Type and build checks used by repository workflow.
2. View switching sanity for impacted domains.
3. Role visibility sanity for touched nav elements.
4. Open behavior sanity from board/list/table rows/cards.

Current frontend command:

- In `app/frontend`: `npm run build`

## 9. Required final change report

Agent final report must include:

1. `What changed`
2. `Why`
3. `Files touched`
4. `Domain rules preserved`
5. `Risks / follow-ups`
6. `Validation performed`

Use concrete statements. Avoid generic wording.
