import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './helpers/db.js';
import { buildApp } from '../app.js';
import type { Db } from '../db/index.js';

describe('Event types routes', () => {
  let sqlite: InstanceType<typeof Database>;
  let db: Db;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
    app = buildApp({ db });
  });

  afterEach(() => {
    sqlite.close();
  });

  it('GET /api/event-types returns empty list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/event-types' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('POST /api/event-types creates an event type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/event-types',
      payload: { name: 'Quick call', durationMinutes: 15 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.name).toBe('Quick call');
    expect(body.durationMinutes).toBe(15);
    expect(body.description).toBe('');
  });

  it('POST /api/event-types validates durationMinutes >= 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/event-types',
      payload: { name: 'Bad', durationMinutes: 0 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/event-types requires name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/event-types',
      payload: { durationMinutes: 30 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('full CRUD flow: create → list → get → update → delete', async () => {
    // create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/event-types',
      payload: { name: 'Demo', description: 'A demo call', durationMinutes: 30 },
    });
    expect(createRes.statusCode).toBe(201);
    const { id } = createRes.json<{ id: string }>();

    // list
    const listRes = await app.inject({ method: 'GET', url: '/api/event-types' });
    expect(listRes.json()).toHaveLength(1);

    // get
    const getRes = await app.inject({ method: 'GET', url: `/api/event-types/${id}` });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().name).toBe('Demo');

    // update
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/event-types/${id}`,
      payload: { name: 'Updated demo', durationMinutes: 60 },
    });
    expect(putRes.statusCode).toBe(200);
    expect(putRes.json().name).toBe('Updated demo');
    expect(putRes.json().durationMinutes).toBe(60);

    // delete
    const delRes = await app.inject({ method: 'DELETE', url: `/api/event-types/${id}` });
    expect(delRes.statusCode).toBe(204);

    // get after delete → 404
    const afterDel = await app.inject({ method: 'GET', url: `/api/event-types/${id}` });
    expect(afterDel.statusCode).toBe(404);
  });

  it('GET /api/event-types/:id returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/event-types/unknown' });
    expect(res.statusCode).toBe(404);
  });

  it('PUT /api/event-types/:id returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/event-types/unknown',
      payload: { name: 'X', durationMinutes: 30 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/event-types/:id returns 404 for unknown id', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/event-types/unknown' });
    expect(res.statusCode).toBe(404);
  });
});
