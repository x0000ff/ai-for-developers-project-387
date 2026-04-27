import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from './helpers/db.js';
import { makeEventTypesRepo } from '../repositories/eventTypesRepo.js';
import type { Db } from '../db/index.js';

describe('eventTypesRepo', () => {
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

  it('creates and lists an event type', () => {
    const created = repo.create({ name: 'Quick call', durationMinutes: 15 });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Quick call');
    expect(created.description).toBe('');
    expect(created.durationMinutes).toBe(15);

    const list = repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it('gets by id', () => {
    const created = repo.create({ name: 'Demo', durationMinutes: 30 });
    const found = repo.getById(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Demo');
  });

  it('returns undefined for unknown id', () => {
    expect(repo.getById('nonexistent')).toBeUndefined();
  });

  it('updates an event type', () => {
    const created = repo.create({ name: 'Old name', durationMinutes: 30 });
    const updated = repo.update(created.id, {
      name: 'New name',
      description: 'Desc',
      durationMinutes: 60,
    });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe('New name');
    expect(updated!.description).toBe('Desc');
    expect(updated!.durationMinutes).toBe(60);
  });

  it('returns undefined when updating nonexistent id', () => {
    const result = repo.update('nonexistent', {
      name: 'X',
      durationMinutes: 30,
    });
    expect(result).toBeUndefined();
  });

  it('deletes an event type', () => {
    const created = repo.create({ name: 'To delete', durationMinutes: 30 });
    const deleted = repo.delete(created.id);
    expect(deleted).toBeDefined();
    expect(repo.getById(created.id)).toBeUndefined();
  });

  it('returns undefined when deleting nonexistent id', () => {
    expect(repo.delete('nonexistent')).toBeUndefined();
  });
});
