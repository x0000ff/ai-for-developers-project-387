import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './helpers/db.js';
import { buildApp } from '../app.js';
import type { Db } from '../db/index.js';
import { makeEventTypesRepo } from '../repositories/eventTypesRepo.js';

describe('Slots routes', () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;
  let app: ReturnType<typeof buildApp>;
  let repo: ReturnType<typeof makeEventTypesRepo>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
    app = buildApp({ db });
    repo = makeEventTypesRepo(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('GET /api/event-types/:id/slots returns 200 with slot array', async () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    // Use a date 5 days in the future (within the 14-day limit)
    const date = new Date();
    date.setDate(date.getDate() + 5);
    const dateStr = date.toISOString().split('T')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/event-types/${et.id}/slots?date=${dateStr}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<Array<{ startsAt: string; endsAt: string }>>();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('startsAt');
    expect(body[0]).toHaveProperty('endsAt');
  });

  it('returns 404 for unknown event type', async () => {
    // Use a date 5 days in the future (within the 14-day limit)
    const date = new Date();
    date.setDate(date.getDate() + 5);
    const dateStr = date.toISOString().split('T')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/event-types/nonexistent/slots?date=${dateStr}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when date is missing', async () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    const res = await app.inject({
      method: 'GET',
      url: `/api/event-types/${et.id}/slots`,
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when date has invalid format', async () => {
    const et = repo.create({ name: 'Demo', durationMinutes: 30 });
    const res = await app.inject({
      method: 'GET',
      url: `/api/event-types/${et.id}/slots?date=15-06-2030`,
    });
    expect(res.statusCode).toBe(400);
  });
});
