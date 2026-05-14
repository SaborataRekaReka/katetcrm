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
- `navigation` — deep-link resolver for entity open context (`GET /navigation/deep-link`).
- `imports` — preview/run/report (admin).
- `stats` — агрегаты для Home dashboard + report slices (`GET /stats/reports?periodDays=7|30`) + analytics view slices (`GET /stats/analytics?viewId=...&sampleTake=...`).
- `integrations` — ingest/retry/replay + idempotency event log.

Открытые задачи:

- `imports`: production-hardening CSV-пайплайна (лимиты, профили ошибок, runbook retry/replay).
- Новые tests для import/integration сценариев должны быть написаны только после фиксации требований в `../../QA_REQUIREMENTS.md`.

## Testing

Pre-reset smoke-скрипты и smoke-команды удалены 05.05.2026. Их результаты больше не являются источником истины.

Текущая compile-проверка backend:

```bash
npm run typecheck
npm run build
```

Текущие rebuilt backend test gates:

```bash
npm run test:api-contract
npm run test:integration
npm run test:coverage
```

Новые backend tests должны ссылаться на requirement ids из `../../QA_REQUIREMENTS.md`.
Актуальный run log: `../../docs/TEST_EXECUTION_REPORT.md`.

## One-off backfill

Если в старых данных у клиента пустой `contacts`, можно заполнить primary-контакт из связанного лида/профиля клиента:

```bash
npm run backfill:client-contacts
```

Скрипт идемпотентен для уже заполненных клиентов: обрабатывает только записи без `client_contacts`.

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
- `INTEGRATION_MANGO_API_KEY` — опционально ожидаемый Mango `vpbx_api_key` / «Уникальный код вашей АТС» для callback из API коннектора.
- `INTEGRATION_MANGO_SECRET`
- `INTEGRATION_TELEGRAM_SECRET`
- `INTEGRATION_MAX_SECRET`

Для Mango Office API коннектора также поддерживается штатный form callback на
`POST /api/v1/integrations/events/mango`:

- `vpbx_api_key`
- `sign`
- `json`

Подпись проверяется как `sha256(vpbx_api_key + json + INTEGRATION_MANGO_SECRET)`.
Если задан `INTEGRATION_MANGO_API_KEY`, полученный `vpbx_api_key` должен совпасть.

Дополнительно:

- `INTEGRATION_REQUIRE_SIGNATURES=true` — принудительно включает проверку webhook-подписей во всех окружениях (включая local/CI).

## Инварианты, которые enforced на уровне БД

См. `prisma/schema.prisma` и соответствующие уникальные/частичные индексы:

- один активный `Application` на `Lead` — через partial unique index по
  `(leadId)` где `isActive = true`.
- одна активная `Reservation` на `ApplicationItem` — аналогично.
- `Client` дедуп по нормализованным `phoneNormalized` / `companyNormalized`
  (не unique hard-block, а поиск в сервисе при создании/импорте).
