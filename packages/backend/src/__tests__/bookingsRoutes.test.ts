import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './helpers/db.js';
import { buildApp } from '../app.js';
import { makeEventTypesRepo } from '../repositories/eventTypesRepo.js';
import type { Db } from '../db/index.js';

const PAST_ISO = '2024-01-01T10:00:00.000Z';
const FUTURE_ISO = '2030-06-02T12:00:00.000Z';

describe('Bookings routes', () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;
  let app: ReturnType<typeof buildApp>;
  let eventTypeId: string;

  beforeEach(async () => {
    ({ db, sqlite } = createTestDb());
    app = buildApp({ db });
    // Create a default event type for booking tests
    const repo = makeEventTypesRepo(db);
    const et = repo.create({ name: 'Demo call', durationMinutes: 30 });
    eventTypeId = et.id;
  });

  afterEach(() => {
    sqlite.close();
  });

  it('POST /api/bookings creates a booking and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: FUTURE_ISO,
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.eventTypeId).toBe(eventTypeId);
    expect(body.eventTypeName).toBe('Demo call');
    expect(body.startsAt).toBe(FUTURE_ISO);
    expect(body.endsAt).toBe('2030-06-02T12:30:00.000Z');
    expect(body.guestName).toBe('Alice');
    expect(body.guestEmail).toBe('alice@example.com');
  });

  it('GET /api/bookings returns upcoming bookings sorted ASC', async () => {
    // Create two bookings
    await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: '2030-06-02T14:00:00.000Z',
        guestName: 'Bob',
        guestEmail: 'bob@example.com',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: FUTURE_ISO,
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/bookings' });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list).toHaveLength(2);
    expect(list[0].startsAt).toBe(FUTURE_ISO);
    expect(list[1].startsAt).toBe('2030-06-02T14:00:00.000Z');
  });

  it('POST /api/bookings returns 404 for unknown eventTypeId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId: 'nonexistent',
        startsAt: FUTURE_ISO,
        guestName: 'Carol',
        guestEmail: 'carol@example.com',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/bookings returns 400 for past startsAt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: PAST_ISO,
        guestName: 'Dave',
        guestEmail: 'dave@example.com',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/bookings returns 409 on time conflict', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: FUTURE_ISO,
        guestName: 'Eve',
        guestEmail: 'eve@example.com',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: FUTURE_ISO,
        guestName: 'Frank',
        guestEmail: 'frank@example.com',
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/bookings returns 400 when required fields missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: { eventTypeId },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/bookings/:id returns 204 on success', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: FUTURE_ISO,
        guestName: 'Alice',
        guestEmail: 'alice@example.com',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json<{ id: string }>();

    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/bookings/${id}` });
    expect(deleteRes.statusCode).toBe(204);

    const listRes = await app.inject({ method: 'GET', url: '/api/bookings' });
    expect(listRes.json()).toHaveLength(0);
  });

  it('DELETE /api/bookings/:id returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/bookings/nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  it('full cycle: POST → GET', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      payload: {
        eventTypeId,
        startsAt: FUTURE_ISO,
        guestName: 'Grace',
        guestEmail: 'grace@example.com',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<{ id: string }>();

    const listRes = await app.inject({ method: 'GET', url: '/api/bookings' });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json<{ id: string }[]>();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it('GET /api/bookings/past returns empty list when no past bookings', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/bookings/past' });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list).toHaveLength(0);
  });
});
