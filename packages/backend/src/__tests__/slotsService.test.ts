import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './helpers/db.js';
import type { Db } from '../db/index.js';
import { makeEventTypesRepo } from '../repositories/eventTypesRepo.js';
import { listAvailable } from '../services/slotsService.js';
import { bookings } from '../db/schema.js';

// Helpers
const DATE = '2030-06-15'; // a future date so "now" tests work predictably
const UTC = (h: number, m = 0) => new Date(`${DATE}T${pad(h)}:${pad(m)}:00.000Z`);
const MS = (h: number, m = 0) => UTC(h, m).getTime();

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function insertBooking(
  db: Db,
  startsAt: number,
  endsAt: number,
  eventTypeId: string | null = null,
) {
  db.insert(bookings)
    .values({
      id: crypto.randomUUID(),
      eventTypeId,
      eventTypeName: 'Test',
      startsAt,
      endsAt,
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
    })
    .run();
}

describe('slotsService.listAvailable', () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;
  let repo: ReturnType<typeof makeEventTypesRepo>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
    repo = makeEventTypesRepo(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('returns null for unknown event type', () => {
    const result = listAvailable(db, 'nonexistent', DATE, UTC(8));
    expect(result).toBeNull();
  });

  it('empty DB → full grid (30 min slots 09:00–17:00 = 16 slots)', () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    const slots = listAvailable(db, et.id, DATE, UTC(8))!;
    // 09:00–17:00 with 30-min step = 16 slots
    expect(slots).toHaveLength(16);
    expect(slots[0].startsAt).toBe(UTC(9).toISOString());
    expect(slots[0].endsAt).toBe(UTC(9, 30).toISOString());
    expect(slots[15].startsAt).toBe(UTC(16, 30).toISOString());
    expect(slots[15].endsAt).toBe(UTC(17).toISOString());
  });

  it('booking in middle of day removes overlapping slot', () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    // Books 10:00–10:30, exactly one slot
    insertBooking(db, MS(10), MS(10, 30));
    const slots = listAvailable(db, et.id, DATE, UTC(8))!;
    expect(slots).toHaveLength(15);
    expect(slots.every((s) => s.startsAt !== UTC(10).toISOString())).toBe(true);
  });

  it('booking spanning multiple slots excludes all intersected', () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    // Books 10:00–11:30 → removes 10:00, 10:30, 11:00 (3 slots)
    insertBooking(db, MS(10), MS(11, 30));
    const slots = listAvailable(db, et.id, DATE, UTC(8))!;
    expect(slots).toHaveLength(13);
    const starts = slots.map((s) => s.startsAt);
    expect(starts).not.toContain(UTC(10).toISOString());
    expect(starts).not.toContain(UTC(10, 30).toISOString());
    expect(starts).not.toContain(UTC(11).toISOString());
  });

  it('now in middle of day → past slots not returned', () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    // now = 11:00 → startsAt > now is strict, so 09:00..11:00 slots excluded (5 slots)
    const slots = listAvailable(db, et.id, DATE, UTC(11))!;
    expect(slots).toHaveLength(11);
    expect(slots[0].startsAt).toBe(UTC(11, 30).toISOString());
  });

  it('different duration produces different step', () => {
    const et = repo.create({ name: 'Long', durationMinutes: 60 });
    // 09:00–17:00 with 60-min step = 8 slots
    const slots = listAvailable(db, et.id, DATE, UTC(8))!;
    expect(slots).toHaveLength(8);
    expect(slots[0].endsAt).toBe(UTC(10).toISOString());
  });
});
