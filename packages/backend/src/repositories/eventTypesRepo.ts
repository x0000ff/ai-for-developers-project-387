import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Db } from '../db/index.js';
import { eventTypes } from '../db/schema.js';

export type EventType = typeof eventTypes.$inferSelect;
export type NewEventType = typeof eventTypes.$inferInsert;

export function makeEventTypesRepo(db: Db) {
  return {
    list(): EventType[] {
      return db.select().from(eventTypes).orderBy(asc(eventTypes.durationMinutes)).all();
    },

    getById(id: string): EventType | undefined {
      return db.select().from(eventTypes).where(eq(eventTypes.id, id)).get();
    },

    create(data: { name: string; description?: string; durationMinutes: number }): EventType {
      const id = randomUUID();
      return db
        .insert(eventTypes)
        .values({
          id,
          name: data.name,
          description: data.description ?? '',
          durationMinutes: data.durationMinutes,
        })
        .returning()
        .get();
    },

    update(
      id: string,
      data: {
        name: string;
        description?: string;
        durationMinutes: number;
      },
    ): EventType | undefined {
      return db
        .update(eventTypes)
        .set({
          name: data.name,
          description: data.description ?? '',
          durationMinutes: data.durationMinutes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(eventTypes.id, id))
        .returning()
        .get();
    },

    delete(id: string): EventType | undefined {
      return db.delete(eventTypes).where(eq(eventTypes.id, id)).returning().get();
    },
  };
}
