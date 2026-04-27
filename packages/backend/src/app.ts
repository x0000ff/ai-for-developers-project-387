import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { bookingsRoutes } from './routes/bookings.js';
import { eventTypesRoutes } from './routes/eventTypes.js';
import { slotsRoutes } from './routes/slots.js';

export function buildApp(opts: FastifyServerOptions & { db: Db }): FastifyInstance {
  const { db, ...fastifyOpts } = opts;
  const app = Fastify({ logger: false, ...fastifyOpts });

  app.get('/health', async (_req, reply) => {
    try {
      db.run(sql`SELECT 1 FROM event_types LIMIT 1`);
      return { status: 'ok' };
    } catch {
      return reply.status(503).send({ status: 'error', reason: 'db_not_ready' });
    }
  });

  app.register(eventTypesRoutes, { prefix: '/api', db });
  app.register(slotsRoutes, { prefix: '/api', db });
  app.register(bookingsRoutes, { prefix: '/api', db });

  return app;
}
