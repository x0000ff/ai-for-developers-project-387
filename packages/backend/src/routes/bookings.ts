import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';
import {
  ConflictError,
  makeBookingsService,
  NotFoundError,
  PastDateError,
} from '../services/bookingsService.js';

const createBodySchema = {
  type: 'object',
  required: ['eventTypeId', 'startsAt', 'guestName', 'guestEmail'],
  properties: {
    eventTypeId: { type: 'string', minLength: 1 },
    startsAt: { type: 'string', minLength: 1 },
    guestName: { type: 'string', minLength: 1 },
    guestEmail: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export async function bookingsRoutes(app: FastifyInstance, { db }: { db: Db }) {
  const service = makeBookingsService(db);

  app.post<{
    Body: { eventTypeId: string; startsAt: string; guestName: string; guestEmail: string };
  }>('/bookings', { schema: { body: createBodySchema } }, async (req, reply) => {
    try {
      const booking = service.create(req.body);
      return reply.status(201).send(booking);
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
      if (err instanceof PastDateError) return reply.status(400).send({ message: err.message });
      if (err instanceof ConflictError) return reply.status(409).send({ message: err.message });
      throw err;
    }
  });

  app.get('/bookings', async () => {
    return service.listUpcoming();
  });

  app.get('/bookings/past', async () => {
    return service.listPast();
  });

  app.delete<{ Params: { id: string } }>('/bookings/:id', async (req, reply) => {
    try {
      service.deleteById(req.params.id);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError) return reply.status(404).send({ message: err.message });
      throw err;
    }
  });
}
