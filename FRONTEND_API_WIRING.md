# FRONTEND ↔ API WIRING (CURRENT)

Актуальный срез на 28.04.2026.

Документ фиксирует только текущее состояние wiring между frontend и backend.
Исторические заметки прошлых сессий сюда не включаются.

## 1. Scope

Покрытие:

1. Экранные домены и их API-подключение в режиме `VITE_USE_API=true`.
2. Где UI уже работает от backend-данных.
3. Где остаются fallback/mock ветки или недозавершенные сценарии.

Вне scope:

1. Подробный UX-аудит и визуальный polish.
2. Полный e2e runtime-pass по всем доменам (beyond текущего baseline admin/control).
3. Историческая динамика по сессиям.

## 2. Легенда

- `done`: ключевые read/write сценарии домена подключены к API.
- `partial`: основная ветка API есть, но часть сценариев остается fallback или упрощенной.
- `fallback`: экран заметно зависит от mock-данных даже в текущем коде.
- `backlog`: доменный UI существует, но backend wiring не доведен до рабочего контура.

## 3. Snapshot по доменам

| Домен | Статус | Текущее состояние |
|---|---|---|
| Leads | `done` | list/detail/create/stage transitions/activity работают через API hooks |
| Applications | `partial` | list/detail/header + item add/edit/delete и create reservation wired; часть фильтрации/derived-полей остается adapter-driven |
| Reservations | `partial` | detail/read/update/release wired; источники unit/subcontractor подтягиваются из directories, но сценарии availability/typeahead можно усилить |
| Clients | `partial` | list/detail/create/update wired; client detail контекст в API-режиме собран API-first с явными pending/error; repeat-order зафиксирован через canonical create lead flow (`source=manual`, `sourceLabel=repeat_order`) |
| Departures | `done` | list/detail/update/start/arrive/cancel/complete wired |
| Completion | `done` | detail/create/update wired; no-completion список выделен в отдельный backend контракт `GET /completions/pending` |
| Directories (Catalogs) | `partial` | list + create/edit dialogs wired для категорий/типов/единиц/подрядчиков; остаются точечные ограничения по полям и сценариям |
| Home | `done` | stats/recent activity/urgent blocks и My Tasks работают в API-режиме без mock fallback; My Tasks поддерживает create/update/status/duplicate/archive/subtasks |
| Control | `done` | dashboard/reports/audit/analytics работают API-first: `stats` + `stats/reports` + `activity/search` + `stats/analytics(viewId)`; агрегаты и sample-rows для analytics view теперь формируются на backend |
| Admin Imports | `done` | preview/run/report wired, есть mapping и import log в API-режиме |
| Admin Integrations | `done` | отдельная workspace-страница integrations подключена к API |
| Admin Users/Permissions/Settings | `partial` | Users экран подключён к backend (`GET/POST/PATCH /users`, включая смену роли/имени/пароля), Permissions использует `GET/PATCH /users/permissions-matrix*`, Settings использует `GET/PATCH /settings/workspace*` |

## 4. Подробности по модулям

### 4.1 Sales

#### Leads

Подключено:

1. `GET /leads`, `GET /leads/:id`.
2. `POST /leads`.
3. `POST /leads/:id/stage` (включая DnD переходы).
4. `PATCH /leads/:id` (inline-edit).
5. Activity timeline через `useEntityActivity`.

Остаточные задачи:

1. Перенести часть client-side фильтров в server-side query параметры для консистентности больших списков.

#### Applications

Подключено:

1. `GET /applications`, `GET /applications/:id`.
2. `PATCH /applications/:id`, `POST /applications/:id/cancel`.
3. `POST /applications/:id/items`, `PATCH /application-items/:id`, `DELETE /application-items/:id`.
4. Создание брони из позиции через reservation flow.

Остаточные задачи:

1. Дальше выровнять adapter слой (join/derived поля) между list/detail.
2. Доработать server-side фильтрацию для отдельных preset/view режимов.

### 4.2 Ops

#### Reservations

Подключено:

1. `GET /reservations`, `GET /reservations/:id`.
2. `PATCH /reservations/:id` для stage/source/comment/dates/confirm/unit/subcontractor.
3. `POST /reservations/:id/release`.
4. Client CTA/link точки в detail workspace переведены на явную clickable-semantics (без silent no-op при отсутствии handler).

Остаточные задачи:

1. Усилить unit/subcontractor подбор (availability/typeahead/ограничения по контексту позиции).
2. Подчистить оставшиеся derived-ветки, чтобы меньше зависеть от mock-структуры.

#### Departures

Подключено:

1. `GET /departures`, `GET /departures/:id`.
2. `PATCH /departures/:id`.
3. `POST /departures/:id/start|arrive|cancel|complete`.
4. Client CTA/link точки в detail workspace (web + API variant) больше не используют optional no-op callbacks.

Статус: рабочий end-to-end контур в API-режиме.

#### Completion

Подключено:

1. `GET /completions/:id`.
2. `GET /completions/pending` для контекста view-no-completion.
3. `POST /completions`, `PATCH /completions/:id`.
4. Завершение также поддерживается через departure complete flow.
5. Client CTA/link точки в detail workspace (web + API variant) переведены на условно-кликабельный режим с disabled fallback.

Остаточные задачи:

1. Добавить browser runtime/e2e покрытие для completion-специфичных негативных сценариев.

### 4.3 Clients

Подключено:

1. `GET /clients`, `GET /clients/:id`.
2. `POST /clients`, `PATCH /clients/:id`.
3. Repeat order через создание лида (`POST /leads`) из карточки клиента.

Остаточные задачи:

1. Провести runtime-pass client detail/repeat сценариев с network-trace для подтверждения UX-политики ошибок.
2. Если потребуется отдельный доменный endpoint repeat-order, согласовать migration от canonical create lead flow.

### 4.4 Directories (Catalogs)

Подключено:

1. `GET /equipment-categories`, `GET /equipment-types`, `GET /equipment-units`, `GET /subcontractors`.
2. Create/edit dialogs на frontend через directory mutations hooks.

Остаточные задачи:

1. Явные archive/delete сценарии и их UX-политика.
2. Доведение некоторых полей до полной доменной модели (без временных UI-допущений).

### 4.5 Home и Control

#### Home

Подключено:

1. `GET /stats` для overview KPI.
2. `GET /activity/search` для recent activity.
3. `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/status`, `POST /tasks/:id/duplicate`, `POST /tasks/:id/archive`, `POST /tasks/:id/subtasks`.
4. Task detail в Home поддерживает редактирование title/description/priority/dueDate/tags через tasks write-path.
5. Очистка dueDate поддерживается end-to-end (`'' -> null` на frontend и `null` в API patch).

Остаточные задачи:

1. Провести точечный browser runtime-pass на editability/CTA-семантику в Home (включая сценарии ошибки в task update).

#### Control

Подключено:

1. Dashboard KPI через stats.
2. Reports каталог через `GET /stats/reports?periodDays=7|30`.
3. Audit блок через activity search.
4. Audit в API-режиме использует server-side фильтры `module/action/entityType/from/query` и не полагается на mock fallback.
5. Analytics view работает через `GET /stats/analytics?viewId=...&sampleTake=...`; backend возвращает summary-агрегаты, manager distribution и sample rows.
6. Frontend `ControlWorkspacePage` больше не пересчитывает analytics агрегаты из списка лидов в API-режиме.

Остаточные задачи:

1. Провести browser runtime-pass для Control сценариев (dashboard/reports/audit/analytics) с Network-trace.

### 4.6 Admin

#### Imports

Подключено:

1. `POST /imports/preview`.
2. `POST /imports/run`.
3. `GET /imports/:importId/report`.
4. UI mapping + preview + dedup policy + run summary + error report download.

Остаточные задачи:

1. Усилить production-hardening CSV импорта (лимиты, профили ошибок, runbook retry/replay).

#### Integrations

Подключено:

1. Интеграционный workspace использует API list/detail/retry/replay сценарии.

#### Users / Permissions / Settings

Статус: `partial`.

Подключено:

1. `GET /users`, `GET /users/managers`.
2. `POST /users`, `PATCH /users/:id`.
3. Admin Users UI использует backend list/create/toggle-active/role-update/name-update/password-reset flow в API-режиме.
4. Admin Permissions UI использует `GET /users/permissions-matrix` и `PATCH /users/permissions-matrix/:capabilityId`.
5. Admin Settings UI использует `GET /settings/workspace` и `PATCH /settings/workspace/sections/:sectionId`.

Остаточные задачи:

1. Расширить e2e-покрытие admin write-сценариев за пределы baseline (additional negative CRUD/RBAC).

## 5. Cross-cutting замечания

1. Во многих доменах есть корректный feature-flag gate: API ветка при `VITE_USE_API=true`, fallback при выключенном API.
2. React Query invalidation после мутаций реализована системно и в целом дает предсказуемую синхронизацию detail/list.
3. Основной риск текущего состояния: недостаточное browser runtime/e2e покрытие для import UX-сценариев и расширенных негативных кейсов admin/control.

## 6. Приоритет закрытия gaps

1. Усилить production-hardening import/integration контуров (HMAC fixtures в CI, large CSV limits, runbook).
2. Добавить browser e2e/runtime-покрытие admin write-сценариев.
3. Добавить browser runtime-pass по primary CTA/editability в touched доменах.

## 7. Validation note

Testing reset 05.05.2026 removed previous smoke/e2e validation commands and their results.

This document describes wiring status only. New validation must be rebuilt from `QA_REQUIREMENTS.md`, starting with the domain happy path and then extending into API/browser coverage.
