import { describe, it, expect } from 'vitest';
import { buildApp } from '../app.js';
import { createTestDb } from './helpers/db.js';

describe('GET /health', () => {
  it('returns 200 when migrations are applied', async () => {
    const { db, sqlite } = createTestDb();
    const app = buildApp({ db });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    sqlite.close();
  });

  it('returns 503 when event_types table is missing', async () => {
    const { db, sqlite } = createTestDb();
    sqlite.exec('DROP TABLE event_types');
    const app = buildApp({ db });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ status: 'error', reason: 'db_not_ready' });
    sqlite.close();
  });
});
