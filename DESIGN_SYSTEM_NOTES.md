# DESIGN_SYSTEM_NOTES

## 1. Purpose

This is a practical UI canon for Katet CRM MVP.
It defines stable visual behavior, not an abstract design system.

## 2. Visual direction

Reference direction:

- Keep ClickUp-like shell density and compactness.
- Do not copy ClickUp product semantics.
- Preserve CRM entity language and workflows.

## 3. Rail / Sidebar / Content relationship

1. Primary rail is a separate visual layer.
2. Secondary sidebar and content are one workspace surface.
3. Sidebar is light neutral gray, not pure white card detached from content.
4. Dividers are subtle and low-contrast.

Current token anchors (from repo styles):

- rail bg: `#5e43aa`
- app bg: `#eef0f4`
- sidebar bg: `#f1f3f7`
- main bg: `#ffffff`

## 4. Sidebar visual model

Rules:

1. Group headers are compact and uppercase.
2. Items remain single-line where possible.
3. Active page and active saved-view states are visually distinct.
4. Saved views are grouped below domain pages, never mixed inline.

## 5. Tokens

### 5.1 Spacing and density

- Compact toolbar height and chip size.
- Prefer 4/6/8/12 spacing rhythm.
- Keep rows dense but readable.

### 5.2 Radius and borders

- Small radius by default (around 8-10px visual feel).
- Thin subtle borders.
- Avoid heavy shadows.

### 5.3 Typography

- Body and controls are compact.
- Headers are short and informative, not oversized.
- Avoid large decorative typography in operational surfaces.

## 6. Card styles

1. Card header: entity + short status signal.
2. Card middle: source/readiness and critical metadata.
3. Card footer: owner + last activity.
4. Keep scanability first; do not overload cards with secondary details.

## 7. Grouped list rules

1. Group by operationally meaningful key (stage/readiness/time).
2. Group headers remain sticky only when needed.
3. Rows should open entity detail, not perform hidden side effects.

## 8. Dense table rules

1. Table is a control surface, not accounting spreadsheet.
2. Keep high-signal columns visible first.
3. Status badges stay compact and color-consistent with board/list.
4. Horizontal scroll may exist only inside table container.

## 9. Badge and status rules

1. Tone mapping is stable across views:
   - warning: risk/conflict/urgent
   - caution: missing or incomplete
   - progress: in-process
   - success: ready/completed
   - muted: archived/low-priority
2. Badge text is short and action-neutral.
3. Status badge is state, not button.

## 10. CTA rules

1. One primary CTA per screen context.
2. CTA must represent executable scenario.
3. No fake CTA placeholders for non-implemented flows.
4. CTA labels are module-contextual and verb-first.

## 11. Detail workspace rules

1. Keep CRM-specific detail shell and sections.
2. Respect action hierarchy: primary -> secondary -> link -> status.
3. Keep thin non-dominant scrollbars.
4. Preserve independent scroll areas for main and sidebar.

## 12. Forbidden patterns

1. Generic task modal instead of CRM detail.
2. Oversized admin-style UI for managers.
3. Page-level horizontal scrolling.
4. Flat overloaded sidebar with mixed hierarchy.
5. ClickUp spaces/channels semantics inside CRM domain language.
