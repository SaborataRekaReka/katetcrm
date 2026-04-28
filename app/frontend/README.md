
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

На 27.04.2026 в API-режиме подключены основные потоки:

- Leads (list/detail/create/stage transitions)
- Applications (list/detail/header mutations)
- Reservations (list/detail/update/release)
- Departures (list/detail/start/arrive/cancel/complete)
- Completion (detail/create/update; completion-flow через departure)

Оставшиеся крупные зоны: aggregate-дашборды (`/stats`), расширенные audit-фильтры и отдельные UI-модалки CRUD для directories/import/admin.
