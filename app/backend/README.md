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

2. Подними Postgres:

   ```bash
   docker compose up -d db
   ```

3. Установи зависимости и сгенерируй Prisma client:

   ```bash
   npm install
   npm run prisma:generate
   ```

4. Накати миграции и сидируй:

   ```bash
   npm run prisma:migrate
   npm run seed
   ```

5. Запусти dev-сервер:

   ```bash
   npm run start:dev
   ```

   Проверь: `GET http://localhost:3001/api/v1/health` → `{ "status": "ok" }`.

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

## Модули (дорожная карта)

Реализовано в Stage 1:

- `health` — healthcheck.
- `auth` — каркас JWT-стратегии (без login endpoint — появится в Stage 2).
- `prisma` — общий сервис доступа к БД.

Ожидается в Stage 2 (ТЗ §3.1–3.7):

- `leads`, `clients`, `activity-log`, `users` (login/refresh), server-side RBAC.

Ожидается в Stage 3:

- `applications`, `application-items`, `reservations`, `directories` (equipment-types,
  equipment-units, subcontractors), `departures`, `completion`.

Post-Stage 3:

- `integrations` (site/mango/telegram/max webhooks),
  `imports` (CSV/XLSX), `analytics`.

## Инварианты, которые enforced на уровне БД

См. `prisma/schema.prisma` и соответствующие уникальные/частичные индексы:

- один активный `Application` на `Lead` — через partial unique index по
  `(leadId)` где `isActive = true`.
- одна активная `Reservation` на `ApplicationItem` — аналогично.
- `Client` дедуп по нормализованным `phoneNormalized` / `companyNormalized`
  (не unique hard-block, а поиск в сервисе при создании/импорте).
