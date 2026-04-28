# Katet CRM Backend

NestJS + Prisma + PostgreSQL. Modular monolith per `ARCHITECTURE.md`.

## Stack

- Node.js 20+
- NestJS 10
- Prisma 5 (PostgreSQL)
- Passport + JWT
- Docker Compose для локальной БД

## Локальный запуск

1. Скопируй env:

   ```bash
   cp .env.example .env
   ```

2. Установи зависимости:

   ```bash
   npm install
   ```

3. Подготовь БД, Prisma и seed (рекомендуемый путь):

   ```bash
   npm run prepare:dev
   ```

   Что делает `prepare:dev`:

- поднимает `docker-compose` БД (если нужна);
- если порт `5433` уже занят, пытается использовать существующий PostgreSQL из `DATABASE_URL`;
- применяет миграции, генерирует Prisma client, выполняет seed.

4. Запусти dev-сервер:

   ```bash
   npm run start:dev
   ```

   Проверь: `GET http://localhost:3001/api/v1/health` → `{ "status": "ok" }`.

## Fallback runbook: порт 5433 занят

1. Проверь, кто слушает порт:

   ```powershell
   Get-NetTCPConnection -LocalPort 5433 -State Listen
   ```

2. Если это ваш локальный PostgreSQL и вы хотите использовать его:

- оставьте порт как есть;
- приведите `DATABASE_URL` в `app/backend/.env` к реальным `user/password/dbname` этого инстанса;
- снова запустите `npm run prepare:dev`.

3. Если нужен именно контейнер из `docker-compose.yml`:

- остановите конфликтующий процесс/инстанс на `5433`;
- затем запустите `npm run prepare:dev`.

4. Если получили `P1000` (auth failed):

- проверьте пароль/пользователя в `DATABASE_URL`;
- при необходимости пересоздайте контейнер и volume осознанно (`docker compose down -v`), затем повторите `prepare:dev`.

5. Если `prisma generate` падает с `EPERM ... query_engine-windows.dll.node`:

- остановите запущенные Node/Nest процессы, которые могут держать Prisma DLL;
- повторно запустите `npm run prepare:dev`.

## Структура

```
src/
   main.ts               # bootstrap
   app.module.ts         # корневой модуль
   config/               # ConfigModule + валидация env
   common/               # guards/decorators/projections
   prisma/               # PrismaService
   modules/
      auth/               # login/refresh/me + JWT
      leads/
      clients/
      applications/
      reservations/
      departures/
      completions/
      directories/
      imports/
      integrations/
      activity/
      stats/
      users/
      health/
prisma/
  schema.prisma         # доменная модель
  seed.ts               # сид: admin + мин. справочники
```

## Модули (текущее состояние)

Реализовано и подключено:

- `health` — healthcheck.
- `auth` — login/refresh/me + JWT strategy и guard-слой.
- `prisma` — общий сервис доступа к БД.
- `leads`, `clients`, `activity`, `users`.
   - `users`: `GET /users`, `POST /users`, `PATCH /users/:id` (admin), `GET /users/managers`, `GET /users/permissions-matrix`, `PATCH /users/permissions-matrix/:capabilityId`.
- `settings`.
   - `settings`: `GET /settings/workspace`, `PATCH /settings/workspace/sections/:sectionId` (admin, read/write model for Admin settings dashboard).
- `applications`, `reservations`, `directories`.
- `departures`, `completions`.
- `tasks`.
- `imports` — preview/run/report (admin).
- `stats` — агрегаты для Home dashboard + report slices (`GET /stats/reports?periodDays=7|30`) + analytics view slices (`GET /stats/analytics?viewId=...&sampleTake=...`).
- `integrations` — ingest/retry/replay + idempotency event log.

Открытые задачи:

- `imports`: production-hardening CSV-пайплайна (лимиты, профили ошибок, runbook retry/replay).
- Дополнительные e2e/contract tests для import/integration сценариев.

## Smoke-проверки (release gate)

Быстрые сценарные проверки backend:

- `npm run smoke:base`
- `npm run smoke:stage3`
- `npm run smoke:stage5`
- `npm run smoke:stage6`
- `npm run smoke:stage6:strict` (strict profile: signatures required + all channel secrets configured)
- `npm run smoke:stage7`
- `npm run smoke:tasks`
- `npm run smoke:rbac`
- `npm run smoke:rbac:scope` (RBAC scope + validation checks для `/stats`, `/stats/reports`, `/stats/analytics`)
- `npm run smoke:admin`
- `npm run smoke:admin:control` (runtime read/RBAC checks для Control/Admin API: `/stats`, `/stats/reports`, `/stats/analytics`, `/activity`, `/users`, `/settings`, `/integrations/events`)
- `npm run smoke:flow:repeat` (повтор happy-path `lead -> ... -> completed` для runtime stability)

Сводный запуск полного gate:

```bash
npm run smoke:release
```

## Integrations ingest auth

`POST /api/v1/integrations/events/ingest` требует HMAC-подпись:

- `x-integration-timestamp`: unix seconds или millis.
- `x-integration-signature`: `sha256=<hex>`.

Подписываемая строка:

```
<timestamp>.<channel>.<stable-json-payload>
```

Секреты задаются per-channel через env-переменные:

- `INTEGRATION_SITE_SECRET`
- `INTEGRATION_MANGO_SECRET`
- `INTEGRATION_TELEGRAM_SECRET`
- `INTEGRATION_MAX_SECRET`

Дополнительно:

- `INTEGRATION_REQUIRE_SIGNATURES=true` — принудительно включает проверку webhook-подписей во всех окружениях (включая local/CI).

## Инварианты, которые enforced на уровне БД

См. `prisma/schema.prisma` и соответствующие уникальные/частичные индексы:

- один активный `Application` на `Lead` — через partial unique index по
  `(leadId)` где `isActive = true`.
- одна активная `Reservation` на `ApplicationItem` — аналогично.
- `Client` дедуп по нормализованным `phoneNormalized` / `companyNormalized`
  (не unique hard-block, а поиск в сервисе при создании/импорте).
