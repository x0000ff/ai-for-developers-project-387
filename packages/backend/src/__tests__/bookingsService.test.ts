import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './helpers/db.js';
import { makeEventTypesRepo } from '../repositories/eventTypesRepo.js';
import {
  makeBookingsService,
  ConflictError,
  NotFoundError,
  PastDateError,
} from '../services/bookingsService.js';
import type { Db } from '../db/index.js';

const NOW = new Date('2025-06-01T10:00:00.000Z');
const FUTURE = '2025-06-01T12:00:00.000Z'; // 2 hours after NOW
const PAST = '2025-06-01T08:00:00.000Z'; // 2 hours before NOW

describe('bookingsService', () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;
  let eventTypesRepo: ReturnType<typeof makeEventTypesRepo>;
  let service: ReturnType<typeof makeBookingsService>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
    eventTypesRepo = makeEventTypesRepo(db);
    service = makeBookingsService(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('creates a booking successfully', () => {
    const et = eventTypesRepo.create({ name: 'Quick call', durationMinutes: 30 });
    const booking = service.create(
      { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Alice', guestEmail: 'alice@example.com' },
      NOW,
    );

    expect(booking.id).toBeTruthy();
    expect(booking.eventTypeId).toBe(et.id);
    expect(booking.eventTypeName).toBe('Quick call');
    expect(booking.startsAt).toBe(FUTURE);
    expect(booking.endsAt).toBe('2025-06-01T12:30:00.000Z');
    expect(booking.guestName).toBe('Alice');
    expect(booking.guestEmail).toBe('alice@example.com');
  });

  it('throws PastDateError when startsAt is in the past', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    expect(() =>
      service.create(
        { eventTypeId: et.id, startsAt: PAST, guestName: 'Bob', guestEmail: 'bob@example.com' },
        NOW,
      ),
    ).toThrow(PastDateError);
  });

  it('throws PastDateError when startsAt equals now', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    expect(() =>
      service.create(
        {
          eventTypeId: et.id,
          startsAt: NOW.toISOString(),
          guestName: 'Bob',
          guestEmail: 'bob@example.com',
        },
        NOW,
      ),
    ).toThrow(PastDateError);
  });

  it('throws NotFoundError for unknown eventTypeId', () => {
    expect(() =>
      service.create(
        {
          eventTypeId: 'nonexistent',
          startsAt: FUTURE,
          guestName: 'Carol',
          guestEmail: 'carol@example.com',
        },
        NOW,
      ),
    ).toThrow(NotFoundError);
  });

  it('throws ConflictError on exact overlap', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    service.create(
      { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Dave', guestEmail: 'dave@example.com' },
      NOW,
    );

    expect(() =>
      service.create(
        { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Eve', guestEmail: 'eve@example.com' },
        NOW,
      ),
    ).toThrow(ConflictError);
  });

  it('throws ConflictError when intervals overlap across different event types', () => {
    const et1 = eventTypesRepo.create({ name: '30-min call', durationMinutes: 30 });
    const et2 = eventTypesRepo.create({ name: '60-min call', durationMinutes: 60 });

    // et1 booking: 12:00 – 12:30
    service.create(
      { eventTypeId: et1.id, startsAt: FUTURE, guestName: 'Dave', guestEmail: 'dave@example.com' },
      NOW,
    );

    // et2 starts at 12:15 → overlaps with 12:00–12:30
    expect(() =>
      service.create(
        {
          eventTypeId: et2.id,
          startsAt: '2025-06-01T12:15:00.000Z',
          guestName: 'Eve',
          guestEmail: 'eve@example.com',
        },
        NOW,
      ),
    ).toThrow(ConflictError);
  });

  it('endsAt is immutable: changing durationMinutes does not affect existing booking', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    const booking = service.create(
      { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Frank', guestEmail: 'frank@example.com' },
      NOW,
    );

    // Change duration
    eventTypesRepo.update(et.id, { name: 'Call', durationMinutes: 60 });

    // Existing booking endsAt must not change
    const upcoming = service.listUpcoming(NOW);
    expect(upcoming[0].endsAt).toBe(booking.endsAt);
  });

  it('ON DELETE SET NULL: deleting event type sets eventTypeId to null, name preserved, slot still occupied', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    service.create(
      { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Grace', guestEmail: 'grace@example.com' },
      NOW,
    );

    // Delete event type → eventTypeId becomes null via FK ON DELETE SET NULL
    eventTypesRepo.delete(et.id);

    const upcoming = service.listUpcoming(NOW);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].eventTypeId).toBeNull();
    expect(upcoming[0].eventTypeName).toBe('Call');

    // Slot must still be occupied for new bookings
    const et2 = eventTypesRepo.create({ name: 'New call', durationMinutes: 15 });
    expect(() =>
      service.create(
        {
          eventTypeId: et2.id,
          startsAt: FUTURE,
          guestName: 'Hank',
          guestEmail: 'hank@example.com',
        },
        NOW,
      ),
    ).toThrow(ConflictError);
  });

  it('deleteById removes an existing booking', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    const booking = service.create(
      { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Alice', guestEmail: 'alice@example.com' },
      NOW,
    );

    service.deleteById(booking.id);

    const upcoming = service.listUpcoming(NOW);
    expect(upcoming).toHaveLength(0);
  });

  it('deleteById throws NotFoundError for unknown id', () => {
    expect(() => service.deleteById('nonexistent')).toThrow(NotFoundError);
  });

  it('listUpcoming returns only future bookings sorted by startsAt ASC', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 15 });
    const t1 = '2025-06-01T13:00:00.000Z';
    const t2 = '2025-06-01T12:00:00.000Z';

    service.create(
      { eventTypeId: et.id, startsAt: t1, guestName: 'A', guestEmail: 'a@example.com' },
      NOW,
    );
    service.create(
      { eventTypeId: et.id, startsAt: t2, guestName: 'B', guestEmail: 'b@example.com' },
      NOW,
    );

    const list = service.listUpcoming(NOW);
    expect(list).toHaveLength(2);
    expect(list[0].startsAt).toBe(t2);
    expect(list[1].startsAt).toBe(t1);
  });

  it('listPast returns only past bookings sorted by startsAt DESC', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 15 });
    const beforeNow = '2025-06-01T09:00:00.000Z';
    const earlierThanThat = '2025-06-01T08:00:00.000Z';

    service.create(
      { eventTypeId: et.id, startsAt: beforeNow, guestName: 'A', guestEmail: 'a@example.com' },
      new Date('2025-06-01T07:00:00.000Z'),
    );
    service.create(
      {
        eventTypeId: et.id,
        startsAt: earlierThanThat,
        guestName: 'B',
        guestEmail: 'b@example.com',
      },
      new Date('2025-06-01T07:00:00.000Z'),
    );

    const list = service.listPast(NOW);
    expect(list).toHaveLength(2);
    expect(list[0].startsAt).toBe(beforeNow);
    expect(list[1].startsAt).toBe(earlierThanThat);
  });

  it('listPast returns empty when no past bookings exist', () => {
    const et = eventTypesRepo.create({ name: 'Call', durationMinutes: 30 });
    service.create(
      { eventTypeId: et.id, startsAt: FUTURE, guestName: 'Alice', guestEmail: 'alice@example.com' },
      NOW,
    );

    const list = service.listPast(NOW);
    expect(list).toHaveLength(0);
  });
});
