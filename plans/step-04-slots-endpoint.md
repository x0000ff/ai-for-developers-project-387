# Step 4 — Slots endpoint: contract, service, tests

Есть HTTP-эндпоинт, возвращающий свободные будущие слоты для пары (тип встречи, дата).

## TypeSpec (первым делом)

- Модель `Slot { startsAt: utcDateTime; endsAt: utcDateTime }`.
- Операция `GET /event-types/{id}/slots?date=YYYY-MM-DD` → `Slot[]`.
- Регенерация TS-типов.

## БД

Новой доменной таблицы для слотов нет, но сервису понадобится читать будущие бронирования — поэтому в этом шаге добавляется минимальная таблица `bookings`:

- `id TEXT PK`
- `event_type_id TEXT NULL` (FK добавится в Step 5 вместе с `ON DELETE SET NULL`)
- `event_type_name TEXT NOT NULL`
- `starts_at INTEGER NOT NULL` (UTC ms / ISO)
- `ends_at INTEGER NOT NULL`
- `guest_name TEXT NOT NULL`
- `guest_email TEXT NOT NULL`
- `created_at`

CRUD/создание бронирований — в следующем шаге; здесь только схема, миграция и селектор «пересекающиеся интервалы в дате X».

## Backend

- `slotsService.listAvailable(eventTypeId, date, now)`:
  - Строит сетку `[dayStart, dayEnd)` в рабочем окне (константы в конфиге).
  - Длина и шаг слота — `durationMinutes` выбранного типа.
  - Вычитает пересечения с `bookings`.
  - Фильтрует `startsAt > now`.
- Роут `GET /api/event-types/:id/slots` с валидацией `date`.
- 404, если `eventTypeId` не существует.

## Тесты

- Unit:
  - Пустая БД → полная сетка.
  - Бронь посередине дня → соответствующие слоты отсутствуют.
  - Бронь, пересекающая несколько слотов → исключены все пересечённые.
  - `now` в середине дня → прошедшие слоты не возвращаются.
  - Разные длительности типа → разный шаг.
- Integration:
  - HTTP 200 + JSON-контракт.
  - 404 на несуществующий `eventTypeId`.
  - 400 на кривой `date`.

## Frontend

Не трогаем.

## Состояние после шага

`/api/event-types/:id/slots?date=...` отдаёт корректные слоты; таблица `bookings` создана и пуста; всё под тестами.
