# Katet CRM

Monorepo с двумя приложениями:

- `app/backend` — NestJS + Prisma API
- `app/frontend` — Vite + React UI

## Документация

- Точка входа по документации: `docs/README.md`.
- Канонические продуктовые и архитектурные документы лежат в корне репозитория.
- Для AI-работы главный порядок чтения: `AGENTS.md` -> `docs/README.md` -> stable docs из карты документации.
- Исторические материалы и черновые исследования вынесены в `docs/archive/` и не используются как активный источник требований.

## Быстрый старт

1. Установить зависимости:

```bash
npm --prefix app/backend install
npm --prefix app/frontend install
```

2. Подготовить env-файлы:

```bash
copy app\\backend\\.env.example app\\backend\\.env
copy app\\frontend\\.env.example app\\frontend\\.env
```

3. Включить API-режим фронтенда (в `app/frontend/.env`):

```dotenv
VITE_USE_API=true
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

4. Подготовить backend (БД + миграции + seed):

```bash
npm --prefix app/backend run prepare:dev
```

5. Поднять backend:

```bash
npm --prefix app/backend run dev:backend
```

6. Поднять frontend:

```bash
npm --prefix app/frontend run dev:frontend
```

Frontend доступен на `http://localhost:5174`, backend API — на `http://localhost:3001/api/v1`. Порт `5173` зарезервирован под соседний проект TASKA.

Если локальный порт `5433` уже занят, см. fallback runbook в `app/backend/README.md`.

## Альтернативные команды внутри папок

В `app/backend`:

- `npm run dev`
- `npm run dev:backend`
- `npm run start:dev`

В `app/frontend`:

- `npm run dev`
- `npm run dev:frontend`

## Проверка сборки

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
```

## Текущие тестовые ворота

Тестовая модель после reset от 05.05.2026 заново собрана от `QA_REQUIREMENTS.md`.
Новые и изменяемые тесты должны ссылаться на `QA-REQ-*`.

Основные команды:

```bash
npm --prefix app/backend run test:api-contract
npm --prefix app/backend run test:integration
npm --prefix app/backend run test:coverage
npm --prefix app/frontend run test:coverage
npm --prefix app/frontend run e2e:gate
npm --prefix app/frontend run e2e:gate:full
```

Актуальный журнал прогонов: `docs/TEST_EXECUTION_REPORT.md`.

## AI agent workspace

Agent instructions:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/agents/`
- `docs/AGENT_WORKFLOW.md`
- `docs/AGENT_TASK_TEMPLATE.md`
- `OWNERSHIP.md`

Minimum agent validation:

```bash
npm --prefix app/backend run typecheck
npm --prefix app/backend run build
npm --prefix app/frontend run build
```

Для изменений в API, доменной логике, маршрутах, RBAC, деталях или критичных кнопках добавляй соответствующие contract/integration/coverage/e2e команды из `TESTING_STRATEGY.md`.

Build/typecheck подтверждают только компилируемость, не бизнес-корректность.
