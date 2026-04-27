# Plan: Ограничить выбор слотов ближайшими 14 днями

## Context

Пользователь может выбирать даты бронирования неограниченно далеко в будущем. Нужно ограничить выбор ближайшими 14 днями, чтобы отображались только реально актуальные слоты.

## Изменения

### 1. Фронтенд — добавить `maxDate` в Calendar

**Файл:** `packages/frontend/src/pages/BookCallPage.tsx`, строка ~335

Вычислить дату через 14 дней от сегодня и передать как `maxDate` в `<Calendar>`:

```tsx
// Вычислить в начале компонента (рядом с today)
const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 14);

// В JSX
<Calendar
  minDate={new Date(today)}
  maxDate={maxDate}   // ← добавить
  ...
/>
```

### 2. Бэкенд — валидация даты в маршруте

**Файл:** `packages/backend/src/routes/slots.ts`, строки 8–23

Добавить проверку: если запрошенная дата позже чем today + 14 дней — вернуть 400 или пустой массив.

```ts
// После валидации формата даты
const maxAllowedDate = new Date();
maxAllowedDate.setDate(maxAllowedDate.getDate() + 14);
const requestedDate = new Date(date);
if (requestedDate > maxAllowedDate) {
  return reply.status(400).send({ error: 'Date is too far in the future' });
}
```

### 3. TypeSpec — обновить сигнатуру slots (опционально, улучшение согласованности)

**Файл:** `packages/api/src/main.tsp`, строка ~105

Бэкенд уже возвращает 400, но в спецификации это не отражено. Добавить `BadRequestResponse`:

```typespec
@get @route("{id}/slots") slots(@path id: string, @query date: string): Slot[] | NotFoundResponse | BadRequestResponse;
```

После изменения нужно пересобрать пакет `api`:

```bash
cd packages/api && npm run build
```

## Критические файлы

- `packages/frontend/src/pages/BookCallPage.tsx` — Calendar компонент
- `packages/backend/src/routes/slots.ts` — маршрут получения слотов
- `packages/api/src/main.tsp` — API спецификация (TypeSpec)

## Проверка

1. Открыть страницу бронирования
2. Убедиться, что в календаре даты дальше 14 дней недоступны для выбора
3. Попробовать запросить слоты напрямую через API для даты через 15+ дней — должна вернуться ошибка 400
