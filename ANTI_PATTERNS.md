# ANTI_PATTERNS

## 1. Purpose

This file lists high-risk implementation anti-patterns for contributors and AI agents.

## 2. Product semantics anti-patterns

1. Bringing ClickUp semantics into CRM domain model.
2. Replacing CRM detail with generic task modal.
3. Treating ApplicationItems as separate deals.

Why harmful:

- Breaks operational meaning and workflow consistency.

## 3. Navigation anti-patterns

1. One giant sidebar with global nav + local pages + saved views + statuses mixed.
2. Primary rail used for local page states.
3. Saved views made global across unrelated domains.

Why harmful:

- Destroys context and causes route/title/CTA mismatches.

## 4. Route-content anti-patterns

1. Clients route with leads content.
2. Clients title with "New lead" CTA.
3. Applications route with leads toolbar filters.

Why harmful:

- Creates silent user errors and invalid actions.

## 5. Interaction anti-patterns

1. Fake CTA with no real implementation path.
2. Status chips acting as hidden action buttons.
3. Inconsistent open behavior between board/list/table.

## 6. Layout and UX anti-patterns

1. Page-level horizontal scroll.
2. Heavy enterprise-style UI for manager daily work.
3. Oversized controls reducing data density.

## 7. Domain logic anti-patterns

1. Hard-blocking reservation conflict in MVP.
2. Bypassing entity invariants via direct state mutation.
3. Hiding critical domain logic in purely visual helpers.

## 8. Scope anti-patterns

1. Adding finance/portal/telematics modules into MVP branch without explicit scope update.
2. Introducing dispatcher-only flows in MVP.

## 9. Prevention checklist

Before merge:

1. Verify route/domain/UI/state order in design reasoning.
2. Verify entity invariants remain intact.
3. Verify no anti-pattern from sections 2-8 appears in diff.
