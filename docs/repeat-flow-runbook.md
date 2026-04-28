# Repeat Flow Runbook

## Purpose

Проверить стабильность happy-path CRM-потока при повторных прогонах без ручного вмешательства:

- lead -> application -> reservation -> departure -> completed
- terminal guard для completed
- audit/event continuity

## Preconditions

1. Backend запущен на `http://localhost:3001`.
2. База и seed применены (`admin@katet.local / admin123` доступны).
3. В окружении нет конфликтующих тестов, которые массово меняют те же сущности.

## Commands

Single flow run:

```bash
cd app/backend
npm run smoke:flow
```

Repeat profile (3 итерации по умолчанию):

```bash
cd app/backend
npm run smoke:flow:repeat
```

Custom iteration count:

```powershell
cd app/backend
powershell -ExecutionPolicy Bypass -File ./scripts/smoke-flow-repeat.ps1 -Iterations 5
```

## Pass Criteria

1. Все итерации завершаются строкой `=== FLOW OK ===`.
2. Финальный вывод содержит `=== FLOW REPEAT OK (N iterations) ===`.
3. Нет `BLOCK FAILED` или необработанных исключений PowerShell.

## Failure Triage

1. Ошибка на login:
- проверить backend health `/api/v1/health`;
- проверить seed-учётки и JWT конфиг.

2. Ошибка stage transition:
- сверить domain invariants (`lead -> application -> reservation -> departure -> completed`);
- проверить изменения в `LeadsService`/policy hooks.

3. Ошибка activity/audit:
- проверить модуль `activity` и доступность связанного actor.

4. Нестабильный флап на повторе:
- повторить с `-Iterations 1`, затем `-Iterations 5`;
- сравнить первые отличающиеся итерации по backend logs.
