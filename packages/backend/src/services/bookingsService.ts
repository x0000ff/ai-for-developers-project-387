import { and, desc, eq, gt, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../db/index.js';
import { bookings, eventTypes } from '../db/schema.js';

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
  }
}

export class PastDateError extends Error {
  constructor() {
    super('startsAt must be in the future');
  }
}

export class ConflictError extends Error {
  constructor() {
    super('Time slot is already booked');
  }
}

export interface Booking {
  id: string;
  eventTypeId: string | null;
  eventTypeName: string;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  guestName: string;
  guestEmail: string;
}

export function makeBookingsService(db: Db) {
  return {
    create(
      data: {
        eventTypeId: string;
        startsAt: string; // ISO 8601
        guestName: string;
        guestEmail: string;
      },
      now: Date = new Date(),
    ): Booking {
      const eventType = db
        .select()
        .from(eventTypes)
        .where(eq(eventTypes.id, data.eventTypeId))
        .get();
      if (!eventType) throw new NotFoundError();

      const startsAtMs = Date.parse(data.startsAt);
      if (isNaN(startsAtMs) || startsAtMs <= now.getTime()) throw new PastDateError();

      const endsAtMs = startsAtMs + eventType.durationMinutes * 60_000;

      // Check for overlapping bookings
      const overlapping = db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(lt(bookings.startsAt, endsAtMs), gt(bookings.endsAt, startsAtMs)))
        .all();

      if (overlapping.length > 0) throw new ConflictError();

      let row: typeof bookings.$inferSelect;
      try {
        row = db
          .insert(bookings)
          .values({
            id: randomUUID(),
            eventTypeId: data.eventTypeId,
            eventTypeName: eventType.name,
            startsAt: startsAtMs,
            endsAt: endsAtMs,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
          })
          .returning()
          .get();
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
          throw new ConflictError();
        }
        throw err;
      }

      return toDto(row);
    },

    deleteById(id: string): void {
      const existing = db.select().from(bookings).where(eq(bookings.id, id)).get();
      if (!existing) throw new NotFoundError(`Booking ${id} not found`);
      db.delete(bookings).where(eq(bookings.id, id)).run();
    },

    listUpcoming(now: Date = new Date()): Booking[] {
      const nowMs = now.getTime();
      return db
        .select()
        .from(bookings)
        .where(gt(bookings.startsAt, nowMs))
        .orderBy(bookings.startsAt)
        .all()
        .map(toDto);
    },

    listPast(now: Date = new Date()): Booking[] {
      const nowMs = now.getTime();
      return db
        .select()
        .from(bookings)
        .where(lt(bookings.startsAt, nowMs))
        .orderBy(desc(bookings.startsAt))
        .all()
        .map(toDto);
    },
  };
}

function toDto(row: typeof bookings.$inferSelect): Booking {
  return {
    id: row.id,
    eventTypeId: row.eventTypeId,
    eventTypeName: row.eventTypeName,
    startsAt: new Date(row.startsAt).toISOString(),
    endsAt: new Date(row.endsAt).toISOString(),
    guestName: row.guestName,
    guestEmail: row.guestEmail,
  };
}
