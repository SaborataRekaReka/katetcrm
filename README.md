# Katet CRM

Monorepo с двумя приложениями:

- `app/backend` — NestJS + Prisma API
- `app/frontend` — Vite + React UI

## Документация

- Точка входа по документации: `docs/README.md`.
- Канонические продуктовые и архитектурные документы лежат в корне репозитория.
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

## Минимальная проверка релизной готовности

```bash
npm --prefix app/backend run smoke:release
```

Команда запускает агрегированный backend gate: stage smoke-потоки, tasks smoke (`smoke:tasks`), RBAC (`smoke:rbac` + `smoke:rbac:scope`), admin smoke и фронтовую проверку UI-консистентности.
