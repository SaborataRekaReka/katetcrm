# General guidelines

- Do not redesign product structure unless explicitly asked. Prefer refinement over reinvention.
- Preserve existing route map, shell architecture, and domain boundaries unless the task is specifically about changing them.
- Keep files small. Extract layout pieces, row components, and helpers into separate files.
- Prefer flex/grid layouts. Do not use absolute positioning for shell/layout unless strictly necessary.
- Do not use page-level horizontal scrolling. If horizontal scrolling is required, it must be scoped to the local view container only.
- Before major UI edits, first compare current implementation vs reference and list the differences briefly.

# Product guidelines

- This product is a niche CRM for спецтехника rental, not a generic work-management app.
- Preserve the MVP scope:
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
- Do not introduce out-of-scope modules such as:
  - client portal
  - subcontractor portal
  - telematics UI
  - finance module
  - EDM/ЭДО workflows
  - driver mobile app
  - dispatcher-only UI
  - Object / Site / ContactPerson as separate UI modules
- UX remains lead-centric, but domain entities must stay separated:
  - Lead
  - Application
  - ApplicationItem
  - Reservation
  - Client
  - Departure

# Navigation guidelines

- Use two-level navigation:
  - Primary rail = global domains only
  - Secondary sidebar = contextual navigation for the selected domain only
- Do not mix global navigation, local pages, saved views, and workflow states in one flat sidebar.
- Saved views must be local to the active domain, not global.
- Keep primary rail compact and icon-only.
- Secondary sidebar should change based on active domain and role.
- Admin-only sections must be hidden for Manager users in the UI.

# Route and state consistency

- Route, page title, search placeholder, CTA, filters, active nav state, and loaded data must always match.
- Never allow mismatches like:
  - clients route with leads content
  - clients title with “New lead” CTA
  - applications route with leads filters
- View mode must be route-aware:
  - board / list / table should sync with URL/query state
- Filters and saved views must persist correctly across reloads and route transitions.

# CRM workflow guidelines

- Leads funnel stages are fixed:
  - Lead
  - Application
  - Reservation
  - Departure
  - Completed
  - Unqualified
- Never omit the "Unqualified" stage in kanban or grouped representations.
- One Lead can have only one active Application.
- Duplicate detection by phone/company must be visible as warning, not hard block.
- Reservation conflict must be shown as warning, not hard block.
- Applications can contain multiple items and must not be visually treated as separate deals.

# View system guidelines

- Leads and Applications must support:
  - Board view
  - List view
  - Table view
- List view is a grouped operational list, not a card board and not a data grid.
- Table view is a dense control surface, closer to ClickUp Table than to an enterprise admin spreadsheet.
- Row click should open the corresponding entity card/page.
- Keep row density compact and scannable.
- Use MUI Data Grid for dense table scenarios when appropriate.

# Shell and visual guidelines

- Use MUI as the primary UI system.
- Keep the shell light, compact, and product-like.
- Primary rail should remain a separate visual layer.
- Secondary sidebar and main content should feel like parts of one shared workspace surface.
- Secondary sidebar background should be light neutral gray, not pure white.
- Do not make sidebar and content look like two unrelated cards.
- Use subtle borders/dividers and minimal shadows.
- Scrollbars must be thin, low-contrast, and non-dominant.
- Avoid oversized typography, heavy borders, and bulky containers.

# Contextual UI guidelines

- CTA must depend on the current module:
  - Leads -> New lead
  - Clients -> New client
  - Applications -> New application only if the business flow supports direct creation
- Search placeholders must be contextual to the current route.
- Tabs/views must be contextual to the current module, not reused blindly across pages.

# Quality guidelines

- Preserve RBAC assumptions in the UI, but do not rely on frontend-only protection.
- Handle loading, empty, filtered-empty, error, and permission states explicitly.
- Keep the interface simple enough that managers do not need to fall back to chats and spreadsheets for basic work.