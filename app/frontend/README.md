
# Frontend (Katet CRM)

## Установка

```bash
npm install
```

## Запуск

```bash
npm run dev
```

Также доступен алиас:

```bash
npm run dev:frontend
```

## API-режим (без mock)

По умолчанию проект может запускаться в mock-режиме. Для работы с backend API
создайте `app/frontend/.env` на основе `.env.example` и установите:

```dotenv
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

Backend должен быть запущен на `http://localhost:3001`.

## Текущий охват API-режима

На 28.04.2026 в API-режиме подключены основные потоки:

- Leads (list/detail/create/stage transitions)
- Applications (list/detail/header + item mutations)
- Reservations (list/detail/update/release)
- Clients (list/detail/update + linked history)
- Departures (list/detail/start/arrive/cancel/complete)
- Completion (detail/create/update; no-completion контур через `GET /completions/pending`)
- Home dashboard (`/stats` + recent activity) и My Tasks (API write-flow: create/update/status/duplicate/archive/subtasks)
- Admin: Imports (preview/run/report), Integrations (list/detail/retry/replay), Users (list/create/activate/role/name/password), Permissions+Settings (read/write)
- Control: API-driven dashboard/reports/audit/analytics branches (`reports` через `GET /stats/reports`, audit filters server-side), manager-load без mock fallback
- Browser E2E (Playwright): admin/control runtime route checks + admin users write flow (`Новый пользователь`)

Оставшиеся крупные зоны: production-hardening import/integration контуров и расширение browser E2E на дополнительные негативные RBAC и CRUD-сценарии.

## Browser E2E (Playwright)

Требования:

- backend запущен на `http://localhost:3001`;
- frontend запускается с `VITE_USE_API=true`;
- установлены браузеры Playwright (`npx playwright install`).

Запуск:

```bash
npm run e2e
```

Дополнительно:

- `E2E_BASE_URL` — внешний URL frontend (если не `http://127.0.0.1:5173`);
- `E2E_SKIP_WEB_SERVER=true` — не поднимать локальный `vite dev` из Playwright;
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` — учётка для admin-flow.

Практическая заметка:

- если на login-экране e2e возникает `Failed to fetch`, поднимите frontend на `localhost` и запустите e2e с внешним base URL:

```powershell
npm run dev -- --host localhost --port 5174
$env:E2E_BASE_URL = "http://localhost:5174"
$env:E2E_SKIP_WEB_SERVER = "true"
npm run e2e
```
