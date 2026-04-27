import { and, eq, gt, lt } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { bookings, eventTypes } from '../db/schema.js';

// Working day window (UTC hours)
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 17;

export interface Slot {
  startsAt: string; // ISO 8601
  endsAt: string;
}

/**
 * Returns available slots for an event type on a given date.
 * Returns null if the event type does not exist.
 */
export function listAvailable(
  db: Db,
  eventTypeId: string,
  date: string, // YYYY-MM-DD
  now: Date,
): Slot[] | null {
  const row = db.select().from(eventTypes).where(eq(eventTypes.id, eventTypeId)).get();
  if (!row) return null;

  const durationMs = row.durationMinutes * 60_000;
  const dayStartMs = Date.parse(`${date}T${pad(DAY_START_HOUR)}:00:00.000Z`);
  const dayEndMs = Date.parse(`${date}T${pad(DAY_END_HOUR)}:00:00.000Z`);

  // Build grid
  const grid: Array<{ startsAt: number; endsAt: number }> = [];
  for (let t = dayStartMs; t + durationMs <= dayEndMs; t += durationMs) {
    grid.push({ startsAt: t, endsAt: t + durationMs });
  }

  // Fetch overlapping bookings
  const overlapping = db
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(and(lt(bookings.startsAt, dayEndMs), gt(bookings.endsAt, dayStartMs)))
    .all();

  const nowMs = now.getTime();

  return grid
    .filter(
      (slot) =>
        slot.startsAt > nowMs &&
        !overlapping.some((b) => b.startsAt < slot.endsAt && b.endsAt > slot.startsAt),
    )
    .map((slot) => ({
      startsAt: new Date(slot.startsAt).toISOString(),
      endsAt: new Date(slot.endsAt).toISOString(),
    }));
}

function pad(h: number): string {
  return String(h).padStart(2, '0');
}
