
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

На 06.05.2026 в API-режиме подключены основные потоки:

- Leads (list/detail/create/stage transitions)
- Applications (list/detail/header + item mutations)
- Reservations (list/detail/update/release)
- Clients (list/detail/update + linked history)
- Departures (list/detail/start/arrive/cancel/complete)
- Completion (detail/create/update; no-completion контур через `GET /completions/pending`)
- Home dashboard (`/stats` + recent activity) и My Tasks (API write-flow: create/update/status/duplicate/archive/subtasks)
- Admin: Imports (preview/run/report), Integrations (list/detail/retry/replay), Users (list/create/activate/role/name/password), Permissions+Settings (read/write)
- Control: API-driven dashboard/reports/audit/analytics branches (`reports` через `GET /stats/reports`, audit filters server-side), manager-load без mock fallback
- Browser tests пересобраны после testing reset от `../../QA_REQUIREMENTS.md`.

Оставшиеся крупные зоны: production-hardening import/integration контуров и расширение browser/runtime coverage только после фиксации новых требований.

## Testing

Pre-reset Playwright specs/results и e2e-команды удалены 05.05.2026. Их результаты больше не являются источником истины.

Текущая compile-проверка frontend:

```bash
npm run build
```

Текущие rebuilt frontend gates:

```bash
npm run test:coverage
npm run e2e:smoke
npm run e2e:gate
npm run e2e:gate:full
```

Новые frontend/browser tests должны ссылаться на requirement ids из `../../QA_REQUIREMENTS.md`.
Актуальный run log: `../../docs/TEST_EXECUTION_REPORT.md`.
