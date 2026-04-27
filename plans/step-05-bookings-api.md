# Step 5 — Bookings creation: contract, API, tests

Есть HTTP-эндпоинт для создания бронирования с соблюдением правил занятости и «только в будущем».

## TypeSpec (первым делом)

- Модель `Booking { id; eventTypeId: string | null; eventTypeName: string; startsAt; endsAt; guestName; guestEmail }`.
- `CreateBookingRequest { eventTypeId: string; startsAt: utcDateTime; guestName: string; guestEmail: string }`.
- Операции:
  - `POST /bookings` → 201 `Booking`
  - `GET /bookings` → список предстоящих встреч владельца, сортировка по `startsAt ASC`
- Ответы:
  - 409 при коллизии интервалов.
  - 400 при прошедшем времени / невалидных данных.
  - 404 при неизвестном `eventTypeId`.
- Регенерация TS-типов.

## БД

- Дополнить миграцию из Step 4:
  - Уникальный индекс по `starts_at`.
  - FK `event_type_id → event_types(id) ON DELETE SET NULL`.
- Если Step 4 уже зафиксировал миграцию — добавить новую миграцию поверх.

## Backend

- `bookingsService.create` (в транзакции):
  1. Подтянуть `EventType` (404 если нет).
  2. Вычислить `endsAt = startsAt + durationMinutes`.
  3. Проверить `startsAt > now` (иначе 400).
  4. Проверить отсутствие пересечений: `NOT (endsAt <= existing.startsAt OR startsAt >= existing.endsAt)`.
  5. Записать бронь со снимком `eventTypeName`.
  6. Ловить нарушение уникального индекса → 409.
- `bookingsService.listUpcoming`: `startsAt > now`, сортировка ASC.
- Роуты `POST /api/bookings`, `GET /api/bookings`.

## Тесты

- Unit на сервис:
  - Успешное создание.
  - Конфликт при пересечении (разные типы, разные длительности).
  - Прошедшее время → 400.
  - Неизвестный `eventTypeId` → 404.
  - Иммутабельность: после создания брони изменение `durationMinutes` типа не меняет `endsAt` брони.
  - Удаление типа → `eventTypeId = null`, `eventTypeName` остаётся, слот брони по-прежнему занят для новых запросов.
- Integration: полный цикл `POST → GET`.

## Frontend

Не трогаем.

## Состояние после шага

API полностью поддерживает цикл бронирования, тесты покрывают правила занятости, иммутабельность и `ON DELETE SET NULL`.
