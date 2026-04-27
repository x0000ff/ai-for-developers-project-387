import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const eventTypes = sqliteTable('event_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    eventTypeId: text('event_type_id').references(() => eventTypes.id, { onDelete: 'set null' }),
    eventTypeName: text('event_type_name').notNull(),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at').notNull(),
    guestName: text('guest_name').notNull(),
    guestEmail: text('guest_email').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    startsAtUniq: uniqueIndex('bookings_starts_at_uniq').on(table.startsAt),
  }),
);
