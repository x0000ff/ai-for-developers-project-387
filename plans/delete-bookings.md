# Plan: Delete Bookings on /admin Page

## Overview

Add the ability to delete meetings (bookings) from the /admin page. Currently the "Upcoming Meetings" tab shows a read-only table. We need to add a delete button per row, a confirmation modal, and implement the full stack: API spec → backend → frontend.

## Affected Files

| File                                                     | Change                                          |
| -------------------------------------------------------- | ----------------------------------------------- |
| `packages/api/src/main.tsp`                              | Add `@delete` operation to `Bookings` interface |
| `packages/backend/src/services/bookingsService.ts`       | Add `deleteById` method                         |
| `packages/backend/src/routes/bookings.ts`                | Add `DELETE /api/bookings/:id` route            |
| `packages/frontend/src/api/bookings.ts`                  | Add `deleteBooking(id)` method                  |
| `packages/frontend/src/pages/AdminPage.tsx`              | Add delete button + confirmation modal          |
| `packages/backend/src/__tests__/bookingsService.test.ts` | Add delete tests                                |
| `packages/backend/src/__tests__/bookingsRoutes.test.ts`  | Add delete route tests                          |
| `packages/frontend/src/pages/AdminPage.test.tsx`         | Add delete UI tests                             |

## Steps

### Step 1 — API Spec (TypeSpec)

File: `packages/api/src/main.tsp`

Add a `delete` operation inside the `Bookings` interface, analogous to the existing `delete` in `EventTypes`:

```typespec
interface Bookings {
  @post create(...): Booking | BookingError;
  @get list(): Booking[];

  @route("{id}")
  @delete delete(@path id: string): { @statusCode _: 204 } | { @statusCode _: 404; message: string };
}
```

After editing, regenerate the OpenAPI spec:

```bash
cd packages/api && pnpm build
```

---

### Step 2 — Backend: BookingsService

File: `packages/backend/src/services/bookingsService.ts`

Add a `deleteById` method that:

1. Checks the booking exists (throws `NotFoundError` if not)
2. Deletes the row by ID

```typescript
deleteById(id: string): void {
  const existing = db.select().from(bookings).where(eq(bookings.id, id)).get();
  if (!existing) throw new NotFoundError(`Booking ${id} not found`);
  db.delete(bookings).where(eq(bookings.id, id)).run();
}
```

---

### Step 3 — Backend: Route

File: `packages/backend/src/routes/bookings.ts`

Add `DELETE /api/bookings/:id`:

```typescript
app.delete<{ Params: { id: string } }>('/bookings/:id', async (req, reply) => {
  try {
    service.deleteById(req.params.id);
    return reply.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
    throw err;
  }
});
```

---

### Step 4 — Frontend: API Client

File: `packages/frontend/src/api/bookings.ts`

Add `deleteBooking`:

```typescript
deleteBooking: async (id: string): Promise<void> => {
  const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete booking ${id}`);
},
```

---

### Step 5 — Frontend: AdminPage UI

File: `packages/frontend/src/pages/AdminPage.tsx`

#### 5a. State

```typescript
const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
const [deleteBookingModalOpen, setDeleteBookingModalOpen] = useState(false);
```

#### 5b. Delete handler

```typescript
const handleDeleteBooking = async () => {
  if (!deletingBookingId) return;
  await bookingsApi.deleteBooking(deletingBookingId);
  setDeleteBookingModalOpen(false);
  setDeletingBookingId(null);
  await loadBookings(); // refresh list
};
```

#### 5c. Table — add "Actions" column

In the bookings table, add an `ActionIcon` with `Trash` icon per row:

```tsx
<Table.Td>
  <ActionIcon
    color="red"
    variant="subtle"
    onClick={() => {
      setDeletingBookingId(booking.id);
      setDeleteBookingModalOpen(true);
    }}
  >
    <Trash size={16} />
  </ActionIcon>
</Table.Td>
```

#### 5d. Confirmation Modal

```tsx
<Modal
  opened={deleteBookingModalOpen}
  onClose={() => setDeleteBookingModalOpen(false)}
  title="Удалить встречу"
>
  <Text>Вы уверены, что хотите удалить эту встречу? Это действие необратимо.</Text>
  <Group justify="flex-end" mt="md">
    <Button variant="default" onClick={() => setDeleteBookingModalOpen(false)}>
      Отмена
    </Button>
    <Button color="red" onClick={handleDeleteBooking}>
      Удалить
    </Button>
  </Group>
</Modal>
```

---

### Step 6 — Tests

#### Backend service tests (`bookingsService.test.ts`)

- `deleteById` removes an existing booking
- `deleteById` throws `NotFoundError` for unknown ID

#### Backend route tests (`bookingsRoutes.test.ts`)

- `DELETE /api/bookings/:id` returns 204 on success
- `DELETE /api/bookings/:id` returns 404 for unknown ID

#### Frontend tests (`AdminPage.test.tsx`)

- Trash icon renders in bookings table
- Clicking trash opens confirmation modal
- Confirming delete calls `bookingsApi.deleteBooking` and refreshes list
- Cancelling modal does not call `deleteBooking`

---

## Implementation Order

1. `main.tsp` + regenerate OpenAPI
2. `bookingsService.ts` — `deleteById`
3. `bookings.ts` (route) — `DELETE /:id`
4. `bookings.ts` (api client) — `deleteBooking`
5. `AdminPage.tsx` — state + handler + UI
6. Tests

## Notes

- Pattern mirrors the existing event types delete flow in `AdminPage.tsx` — reuse the same confirmation modal style.
- No cascade behavior needed: deleting a booking does not affect event types.
- Keep error handling consistent: show a Mantine notification on failure (same as event type delete).
