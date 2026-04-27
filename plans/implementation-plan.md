# Implementation Plan: Book a Call

Source: [PRD](./prd-book-a-call.md)

## Current State

| Layer                          | What exists                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| TypeSpec (`packages/api`)      | `EventType` model + full CRUD interface (`GET/POST/PUT/DELETE /api/event-types`)           |
| Backend (`packages/backend`)   | `event_types` table in Drizzle schema, `eventTypesRepo`, `eventTypesRoutes` — all wired up |
| Frontend (`packages/frontend`) | Stub pages: `LandingPage`, `BookCallPage`, `AdminPage`; `Navbar` component                 |

**Not yet implemented:** `bookings` table, slots logic, booking endpoints, all frontend business logic.

---

## Phase 1 — API Contract (TypeSpec)

**Goal:** Define the full OpenAPI contract so TypeScript types can be generated for both frontend and backend.

### Tasks

1. **Add `Booking` model** to `packages/api/src/main.tsp`:

   ```
   Booking { id, eventTypeId (nullable string), eventTypeName, startsAt, endsAt, guestName, guestEmail }
   ```

2. **Add `Slot` model**:

   ```
   Slot { startsAt, endsAt }
   ```

3. **Add `CreateBookingRequest` model**:

   ```
   CreateBookingRequest { eventTypeId, startsAt, guestName, guestEmail }
   ```

4. **Add missing endpoints** to the TypeSpec namespace:
   - `GET /api/event-types/{id}/slots?date=YYYY-MM-DD` → `Slot[]`
   - `POST /api/bookings` → `201 Booking | 400 | 409`
   - `GET /api/bookings` → `Booking[]`

5. **Change `PUT /event-types/{id}` to `PATCH`** (PRD specifies partial update semantics — name, description, durationMinutes all optional).

6. **Rebuild TypeSpec** (`pnpm --filter @app/api build`) and verify `tsp-output/.../openapi.yaml` and `generated/schema.d.ts` are updated.

### Done when

- `generated/schema.d.ts` exports types for `Booking`, `Slot`, `CreateBookingRequest`
- OpenAPI YAML includes all 8 endpoints

---

## Phase 2 — Backend: DB Schema & Migrations

**Goal:** Add `bookings` table and generate a new Drizzle migration.

### Tasks

1. **Extend `packages/backend/src/db/schema.ts`**:
   - Add `bookings` table:
     - `id` text PK
     - `eventTypeId` text nullable, FK → `event_types.id` with `ON DELETE SET NULL`
     - `eventTypeName` text NOT NULL (snapshot at booking creation time)
     - `startsAt` text NOT NULL (ISO UTC string), **unique index** (enforces the one-booking-per-slot rule at DB level)
     - `endsAt` text NOT NULL (ISO UTC string)
     - `guestName` text NOT NULL
     - `guestEmail` text NOT NULL
     - `createdAt` text NOT NULL default `datetime('now')`

2. **Generate migration**: `pnpm --filter @app/backend db:generate`

3. **Apply migration**: `pnpm --filter @app/backend db:migrate`

4. **Verify** that the unique index on `startsAt` is present in the generated SQL.

### Done when

- `drizzle/` contains a new migration file with the `bookings` table and unique index
- `pnpm --filter @app/backend db:migrate` runs without errors

---

## Phase 3 — Backend: Business Logic & Endpoints

**Goal:** Implement slots service, bookings repo, and register all new routes.

### Tasks

1. **Create `packages/backend/src/repositories/bookingsRepo.ts`**:
   - `list()` — return all future bookings (`startsAt > now`), sorted by `startsAt` ASC, with `eventTypeName` (may be from deleted type)
   - `create(data)` — insert; let SQLite unique constraint on `startsAt` bubble up as a detectable error
   - `findOverlapping(startsAt, endsAt)` — find any booking where intervals `[startsAt, endsAt)` intersect

2. **Create `packages/backend/src/services/slotsService.ts`**:
   - Input: `eventType` (with `durationMinutes`) + `date: string` (YYYY-MM-DD)
   - Working window: 09:00–18:00 UTC (hardcoded default; configurable later per PRD notes)
   - Build a grid of slots with length = step = `durationMinutes`
   - Filter out slots where `startsAt <= now` (past or present)
   - Fetch all bookings overlapping the requested date's working window
   - Filter out slots whose `[startsAt, endsAt)` intersects any existing booking (any type, any duration)
   - Return `{ startsAt: string; endsAt: string }[]`

3. **Create `packages/backend/src/routes/bookings.ts`**:
   - `GET /api/event-types/:id/slots?date=YYYY-MM-DD`
     - Validate: `id` exists (404 if not), `date` is a valid YYYY-MM-DD string (400 if not)
     - Delegate to `slotsService`
   - `POST /api/bookings`
     - Body schema: `{ eventTypeId: string, startsAt: string, guestName: string (min 1), guestEmail: string (email format) }`
     - Validate `startsAt > now`; return 400 otherwise
     - Look up event type by `eventTypeId` (404 if not found)
     - Re-check overlapping bookings in a transaction; return 409 if any found
     - Insert booking with denormalized `eventTypeName = eventType.name`, compute `endsAt = startsAt + durationMinutes`
     - Catch SQLite unique constraint violation on `startsAt` → return 409
     - Return 201 with the created booking
   - `GET /api/bookings`
     - Return future bookings sorted by `startsAt`

4. **Register new routes in `packages/backend/src/app.ts`** under the `/api` prefix.

5. **Add tests** for the critical paths:
   - `slotsService` unit test: slot grid generation, past-slot filtering, overlap exclusion
   - `bookingsRoutes` integration test: successful booking, 409 on double-booking, 400 on past time

### Done when

- `GET /api/event-types/:id/slots?date=2026-04-09` returns a JSON array of slots
- `POST /api/bookings` returns 201 on success, 409 on conflict, 400 on past time
- `GET /api/bookings` returns upcoming bookings
- `pnpm test` is green

---

## Phase 4 — Frontend: Admin Page

**Goal:** Implement the owner's admin UI with event type management and bookings list.

### Tasks

1. **Generate/update the typed API client** from `packages/api/generated/schema.d.ts` using `openapi-fetch` (already in deps) or a thin wrapper around `fetch`. Create `packages/frontend/src/api/client.ts`.

2. **Implement `AdminPage.tsx`** — two sections:

   **Section A — Event Types**
   - Fetch and display list of event types (name, description, duration)
   - **Create form** inline or in a modal: name (required), description (optional), durationMinutes (required, integer ≥ 1)
   - **Edit form**: pre-fill existing values, send PATCH
   - **Delete button**: confirm action, send DELETE; show warning that existing bookings are preserved
   - Optimistic or refetch-on-mutate state updates

   **Section B — Upcoming Bookings**
   - Fetch `GET /api/bookings` on mount
   - Display table/list: start time (local tz), duration (derived from endsAt − startsAt), event type name (or "Тип удалён"), guest name, guest email
   - Sort by start time (already sorted by backend)

### Done when

- Owner can create, edit, and delete event types through the UI
- Owner sees the list of upcoming bookings with correct data

---

## Phase 5 — Frontend: Guest Booking Flow

**Goal:** Implement the public-facing pages for browsing event types and booking a slot.

### Tasks

1. **Implement `LandingPage.tsx`**:
   - Fetch `GET /api/event-types` on mount
   - Display cards: name, description, duration in minutes
   - Each card links to `BookCallPage` with the event type pre-selected (via URL param `?typeId=...`)

2. **Implement `BookCallPage.tsx`** — full booking flow:

   **Step 1 — Type selector**
   - Dropdown/select populated from `GET /api/event-types`
   - Pre-selects type from URL param if present
   - Changing selection triggers slot refetch

   **Step 2 — Date + slot picker**
   - Mantine `Calendar` component for date selection
   - On date select, fetch `GET /api/event-types/:id/slots?date=YYYY-MM-DD`
   - Render slot buttons (e.g. "10:00 – 10:30")
   - Disabled/hidden when no type selected
   - On type change, clear selected date/slot and refetch

   **Step 3 — Guest info form**
   - Shown after slot is selected
   - Fields: guest name (required), email (required, validated)
   - Submit → `POST /api/bookings`

   **Confirmation screen**
   - Show: event type name, date/time in local tz, duration, guest name
   - "Book another" link back to landing

   **Error screen for 409**
   - Message: "Этот слот уже занят. Пожалуйста, выберите другое время."
   - Button to go back to slot selection (refetches slots)

3. **Shared loading and error states**: loading spinner during fetches, generic error boundary for unexpected failures.

### Done when

- Guest can browse event types on the landing page
- Guest can pick a type, date, and slot on the booking page
- Successful booking shows confirmation screen
- Double-booking (409) shows the correct error with a path back to slot selection

---

## Phase 6 — Integration & Cleanup

**Goal:** Ensure everything works end-to-end, passes CI, and is free of type/lint errors.

### Tasks

1. **TypeScript check**: `pnpm typecheck` — fix any errors across all packages
2. **Lint**: `pnpm lint` — fix warnings/errors
3. **Format**: `pnpm format` — apply Prettier
4. **Full test run**: `pnpm test` — all tests green
5. **Production build smoke test**: `pnpm build && pnpm --filter @app/backend start` — verify Fastify serves the frontend, all API routes respond correctly
6. **Docker smoke test**: `docker build -t book-a-call . && docker run -p 3000:3000 book-a-call` — verify container starts and app loads

### Done when

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass with exit code 0
- Docker container serves the full app on port 3000

---

## Dependency Order

```
Phase 1 (TypeSpec)
    └── Phase 2 (DB schema)
            └── Phase 3 (Backend logic)
                    ├── Phase 4 (Admin UI)  ← can start once Phase 1 types are ready
                    └── Phase 5 (Guest UI)  ← can start once Phase 1 types are ready
                            └── Phase 6 (Integration)
```

Phases 4 and 5 can be developed in parallel after Phase 3 is done (or even alongside Phase 3 with mocked data).
