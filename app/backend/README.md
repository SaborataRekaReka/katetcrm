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
  common/               # фильтры, интерсепторы, типы
  prisma/               # PrismaService
  modules/
    health/             # GET /health
    auth/               # JWT skeleton (пока без UI)
prisma/
  schema.prisma         # доменная модель
  seed.ts               # сид: admin + мин. справочники
```

## Модули (текущее состояние)

Реализовано и подключено:

- `health` — healthcheck.
- `auth` — JWT strategy и guard-слой.
- `prisma` — общий сервис доступа к БД.
- `leads`, `clients`, `activity`, `users`.
- `applications`, `reservations`, `directories`.
- `departures`, `completions`.
- `integrations` — ingest/retry/replay + idempotency event log.

В работе / следующий этап:

- `imports` (CSV/XLSX) и сценарии миграции.
- `analytics` и aggregate-reporting endpoints.
- Расширенные audit-фильтры на уровне API.

## Integrations ingest auth

`POST /integrations/events/ingest` требует HMAC-подпись:

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

## Инварианты, которые enforced на уровне БД

См. `prisma/schema.prisma` и соответствующие уникальные/частичные индексы:

- один активный `Application` на `Lead` — через partial unique index по
  `(leadId)` где `isActive = true`.
- одна активная `Reservation` на `ApplicationItem` — аналогично.
- `Client` дедуп по нормализованным `phoneNormalized` / `companyNormalized`
  (не unique hard-block, а поиск в сервисе при создании/импорте).
