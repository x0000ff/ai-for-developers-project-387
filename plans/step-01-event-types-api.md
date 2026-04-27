## ✅ Done

# Step 1 — Event Types: contract, storage, CRUD API

Владелец может через API полностью управлять типами встреч.

## Общая конвенция для шагов с БД

1. Описать контракт в `packages/api/src/main.tsp`.
2. `pnpm --filter @app/api build` — сгенерировать TS-типы.
3. Добавить/обновить Drizzle-схему и миграцию.
4. Реализовать сервис и Fastify-роут.
5. Написать тесты (unit на сервис + integration на роут через in-memory SQLite).

## TypeSpec (первым делом)

- Модель `EventType { id: string; name: string; description: string; durationMinutes: int32 }`.
- Модели запросов `CreateEventTypeRequest`, `UpdateEventTypeRequest` (полная замена, все поля обязательны кроме `description`).
- Операции:
  - `GET /event-types`
  - `GET /event-types/{id}`
  - `POST /event-types`
  - `PUT /event-types/{id}`
  - `DELETE /event-types/{id}`
- Сгенерировать TS-типы (`pnpm --filter @app/api build`).

## БД (Drizzle)

- Таблица `event_types`:
  - `id TEXT PRIMARY KEY`
  - `name TEXT NOT NULL`
  - `description TEXT NOT NULL DEFAULT ''`
  - `duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0)`
  - `created_at`, `updated_at`
- Миграция, команда `pnpm --filter @app/backend db:migrate` выполняется в тестовом bootstrap.

## Backend

- Репозиторий `eventTypesRepo` (list / getById / create / update / delete).
- Fastify-плагин `eventTypesRoutes` под префиксом `/api`, валидация через TypeSpec-сгенерированные схемы или ручные JSON-schema.
- 404 для несуществующего id, 400 для невалидной длительности.

## Тесты (в этом же шаге)

- Unit-тесты репозитория на временной SQLite.
- Integration-тесты роутов: `create → list → get → update → delete`, плюс негативные кейсы (404, 400).

## Frontend

Не трогаем.

## Состояние после шага

CRUD типов встреч работает через HTTP, покрыт тестами, фронтенд как был.
